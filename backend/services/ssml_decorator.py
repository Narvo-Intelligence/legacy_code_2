"""Narvo SSML decorator for TTS providers.

Builds provider-safe plain text for YarnGPT/OpenAI and Google-compatible SSML
for richer fallback speech output.
"""
from __future__ import annotations

import html
import re
from dataclasses import dataclass
from typing import List, Optional, Tuple

from lib.text_utils import sanitize_ai_text

AUDIO_RENDER_VERSION = "ssml-v1"
_VOICE_MARKER_SEPARATOR = "|"

_MONTHS = {
    "january": 1,
    "february": 2,
    "march": 3,
    "april": 4,
    "may": 5,
    "june": 6,
    "july": 7,
    "august": 8,
    "september": 9,
    "october": 10,
    "november": 11,
    "december": 12,
}

_CURRENCY_RE = re.compile(r"(?<!\w)(?:₦\s?\d[\d,]*(?:\.\d+)?|NGN\s?\d[\d,]*(?:\.\d+)?)", re.IGNORECASE)
_MDY_DATE_RE = re.compile(
    r"\b("
    + "|".join(_MONTHS.keys())
    + r")\s+(\d{1,2})(?:st|nd|rd|th)?\,?\s+(\d{4})\b",
    re.IGNORECASE,
)
_DMY_DATE_RE = re.compile(
    r"\b(\d{1,2})(?:st|nd|rd|th)?\s+("
    + "|".join(_MONTHS.keys())
    + r")\s+(\d{4})\b",
    re.IGNORECASE,
)
_TIME_12H_RE = re.compile(r"\b(\d{1,2}:\d{2}\s?(?:a\.?m\.?|p\.?m\.?))\b", re.IGNORECASE)
_TIME_24H_RE = re.compile(r"\b(?:[01]?\d|2[0-3]):[0-5]\d\b")

_OPENING_SENTENCE_RE = re.compile(
    r"^\s*(?:good morning|good evening|good afternoon|here(?:'|’)s what matters|narvo has the gist)\b",
    re.IGNORECASE,
)
_ADVISORY_SENTENCE_RE = re.compile(
    r"\b(?:make sure|take note|watch out|be careful|remember|keep an eye on|before midday)\b",
    re.IGNORECASE,
)
_STRONG_EMPHASIS_RE = re.compile(
    r"\b(?:breaking|urgent|warning|crisis|attack|explosion|flooding|earthquake|outage|curfew)\b",
    re.IGNORECASE,
)
_MODERATE_EMPHASIS_RE = re.compile(
    r"\b(?:the big gist today|what matters|confirmed|major shift|key point|real truth|cross-checked)\b",
    re.IGNORECASE,
)
_TRANSITION_RE = re.compile(
    r"^\s*(?:meanwhile|however|in other news|elsewhere|now|still|but)\b",
    re.IGNORECASE,
)
_PHONEME_MAP = {
    "lagos": "ˈleɪɡɒs",
    "abuja": "əˈbuːdʒə",
    "naira": "ˈnaɪrə",
}


@dataclass(frozen=True)
class DecoratedTTSInput:
    plain_text: str
    ssml: str
    openai_instructions: str
    version: str = AUDIO_RENDER_VERSION


@dataclass(frozen=True)
class _Replacement:
    start: int
    end: int
    priority: int
    rendered: str


def normalize_tts_plain_text(text: str) -> str:
    """Normalize text before audio synthesis across providers."""
    cleaned = sanitize_ai_text(text or "")
    if not cleaned:
        return ""
    cleaned = cleaned.replace("\r\n", "\n").replace("\r", "\n")
    lines = [re.sub(r"[ \t]+", " ", line).strip() for line in cleaned.split("\n")]
    cleaned = "\n".join(lines)
    cleaned = re.sub(r"\n{3,}", "\n\n", cleaned)
    return cleaned.strip()


def build_audio_voice_marker(voice_id: str) -> str:
    """Store voice + render version so stale pre-SSML audio can be refreshed lazily."""
    normalized = normalize_voice_id(voice_id)
    return (
        f"{normalized}{_VOICE_MARKER_SEPARATOR}{AUDIO_RENDER_VERSION}"
        if normalized
        else AUDIO_RENDER_VERSION
    )


def split_audio_voice_marker(value: str) -> Tuple[str, Optional[str]]:
    raw = normalize_voice_id(value)
    if not raw:
        return "", None
    if _VOICE_MARKER_SEPARATOR not in raw:
        return raw, None
    voice, version = raw.rsplit(_VOICE_MARKER_SEPARATOR, 1)
    return voice.strip(), version.strip() or None


def audio_voice_matches_request(
    stored_value: str,
    requested_voice: str,
    *,
    require_current_version: bool = False,
) -> bool:
    stored_voice, stored_version = split_audio_voice_marker(stored_value)
    want_voice = normalize_voice_id(requested_voice)
    if not stored_voice or not want_voice or stored_voice != want_voice:
        return False
    if require_current_version:
        return stored_version == AUDIO_RENDER_VERSION
    return True


def normalize_voice_id(value: str) -> str:
    return (value or "").strip().lower()


def decorate_text_for_tts(
    text: str,
    *,
    language: str = "en",
    voice_id: str = "",
) -> DecoratedTTSInput:
    """Produce plain text plus Google-compatible SSML for the same narrative."""
    plain_text = normalize_tts_plain_text(text)
    if not plain_text:
        return DecoratedTTSInput(plain_text="", ssml="<speak></speak>", openai_instructions="")

    normalized_language = (language or "en").strip().lower()
    ssml_blocks: List[str] = []
    sentence_index = 0

    for paragraph in _paragraphs_from_text(plain_text):
        sentences = _split_sentences(paragraph)
        rendered_sentences: List[str] = []
        for idx, sentence in enumerate(sentences):
            inline_markup = _apply_inline_markup(sentence, normalized_language)
            wrapped = _wrap_sentence_markup(
                inline_markup,
                source_sentence=sentence,
                is_opening=sentence_index == 0,
                voice_id=voice_id,
            )
            rendered_sentences.append(f"<s>{wrapped}</s>")
            sentence_index += 1
            if idx < len(sentences) - 1:
                rendered_sentences.append(
                    f'<break time="{_pause_after_sentence(sentence, sentences[idx + 1])}ms"/>'
                )
        ssml_blocks.append(f"<p>{''.join(rendered_sentences)}</p>")

    return DecoratedTTSInput(
        plain_text=plain_text,
        ssml=f"<speak>{''.join(ssml_blocks)}</speak>",
        openai_instructions=_build_openai_tts_instructions(
            plain_text,
            language=normalized_language,
            voice_id=voice_id,
        ),
    )


def _paragraphs_from_text(text: str) -> List[str]:
    paragraphs = [block.strip() for block in re.split(r"\n{2,}", text) if block.strip()]
    return paragraphs or [text.strip()]


def _split_sentences(paragraph: str) -> List[str]:
    sentences = [
        chunk.strip()
        for chunk in re.findall(r".+?(?:[.!?]+(?:[\"”’')\]]*)?(?:\s+|$)|$)", paragraph, flags=re.S)
        if chunk and chunk.strip()
    ]
    return sentences or [paragraph.strip()]


def _apply_inline_markup(text: str, language: str) -> str:
    replacements: List[_Replacement] = []
    replacements.extend(_currency_replacements(text, language))
    replacements.extend(_date_replacements(text))
    replacements.extend(_time_replacements(text))
    replacements.extend(_phoneme_replacements(text, language))

    chosen: List[_Replacement] = []
    last_end = -1
    for item in sorted(replacements, key=lambda r: (r.start, -r.priority, -(r.end - r.start))):
        if item.start < last_end:
            continue
        chosen.append(item)
        last_end = item.end

    if not chosen:
        return html.escape(text, quote=True)

    out: List[str] = []
    cursor = 0
    for item in chosen:
        out.append(html.escape(text[cursor:item.start], quote=True))
        out.append(item.rendered)
        cursor = item.end
    out.append(html.escape(text[cursor:], quote=True))
    return "".join(out)


def _currency_replacements(text: str, language: str) -> List[_Replacement]:
    ssml_language = "en-NG" if language in {"en", "pcm", "yo", "ha", "ig"} else "en-US"
    out: List[_Replacement] = []
    for match in _CURRENCY_RE.finditer(text):
        value = html.escape(match.group(0).strip(), quote=True)
        out.append(
            _Replacement(
                start=match.start(),
                end=match.end(),
                priority=90,
                rendered=f'<say-as interpret-as="currency" language="{ssml_language}">{value}</say-as>',
            )
        )
    return out


def _date_replacements(text: str) -> List[_Replacement]:
    out: List[_Replacement] = []
    for match in _MDY_DATE_RE.finditer(text):
        normalized = _normalize_month_date(match.group(3), match.group(1), match.group(2))
        if normalized:
            out.append(
                _Replacement(
                    start=match.start(),
                    end=match.end(),
                    priority=80,
                    rendered=(
                        '<say-as interpret-as="date" format="yyyymmdd" detail="2">'
                        f"{normalized}</say-as>"
                    ),
                )
            )
    for match in _DMY_DATE_RE.finditer(text):
        normalized = _normalize_month_date(match.group(3), match.group(2), match.group(1))
        if normalized:
            out.append(
                _Replacement(
                    start=match.start(),
                    end=match.end(),
                    priority=80,
                    rendered=(
                        '<say-as interpret-as="date" format="yyyymmdd" detail="2">'
                        f"{normalized}</say-as>"
                    ),
                )
            )
    return out


def _normalize_month_date(year_text: str, month_text: str, day_text: str) -> Optional[str]:
    month_num = _MONTHS.get((month_text or "").strip().lower())
    if month_num is None:
        return None
    try:
        year = int(year_text)
        day = int(day_text)
    except (TypeError, ValueError):
        return None
    if year < 1000 or year > 9999 or day < 1 or day > 31:
        return None
    return f"{year:04d}-{month_num:02d}-{day:02d}"


def _time_replacements(text: str) -> List[_Replacement]:
    out: List[_Replacement] = []
    for match in _TIME_12H_RE.finditer(text):
        value = html.escape(match.group(1).replace(" ", ""), quote=True)
        out.append(
            _Replacement(
                start=match.start(),
                end=match.end(),
                priority=70,
                rendered=f'<say-as interpret-as="time" format="hms12">{value}</say-as>',
            )
        )
    for match in _TIME_24H_RE.finditer(text):
        value = html.escape(match.group(0), quote=True)
        out.append(
            _Replacement(
                start=match.start(),
                end=match.end(),
                priority=60,
                rendered=f'<say-as interpret-as="time" format="hm24" detail="1">{value}</say-as>',
            )
        )
    return out


def _phoneme_replacements(text: str, language: str) -> List[_Replacement]:
    if language not in {"en", "pcm"}:
        return []
    out: List[_Replacement] = []
    for word, ipa in _PHONEME_MAP.items():
        pattern = re.compile(rf"\b{re.escape(word)}\b", re.IGNORECASE)
        for match in pattern.finditer(text):
            surface = html.escape(match.group(0), quote=True)
            out.append(
                _Replacement(
                    start=match.start(),
                    end=match.end(),
                    priority=50,
                    rendered=f'<phoneme alphabet="ipa" ph="{ipa}">{surface}</phoneme>',
                )
            )
    return out


def _wrap_sentence_markup(
    inline_markup: str,
    *,
    source_sentence: str,
    is_opening: bool,
    voice_id: str,
) -> str:
    lower = source_sentence.strip().lower()
    if is_opening and _OPENING_SENTENCE_RE.search(lower):
        return f'<prosody rate="94%" pitch="+1st">{inline_markup}</prosody>'
    if _ADVISORY_SENTENCE_RE.search(lower):
        return f'<prosody rate="92%" pitch="-1st">{inline_markup}</prosody>'
    if _STRONG_EMPHASIS_RE.search(lower):
        return f'<emphasis level="strong">{inline_markup}</emphasis>'
    if _MODERATE_EMPHASIS_RE.search(lower):
        return f'<emphasis level="moderate">{inline_markup}</emphasis>'
    if normalize_voice_id(voice_id) == "wura" and is_opening:
        return f'<prosody rate="95%" pitch="+1st">{inline_markup}</prosody>'
    return inline_markup


def _pause_after_sentence(sentence: str, next_sentence: str) -> int:
    current = sentence.strip()
    upcoming = (next_sentence or "").strip()
    if re.search(r"[!?][\"”’')\]]*\s*$", current):
        return 460
    if re.search(r"[:;][\"”’')\]]*\s*$", current):
        return 420
    if _TRANSITION_RE.search(upcoming):
        return 520
    return 320


def _build_openai_tts_instructions(text: str, *, language: str, voice_id: str) -> str:
    instructions = [
        "Read this in Narvo's Warm Gist style: warm, grounded, calm, and human.",
        "Sound like a trusted news narrator, not an advert, announcer, or hype voice.",
        "Keep a steady conversational pace with short natural pauses between sentences and slightly longer pauses after transitions.",
        "Give gentle emphasis to verified key facts, public warnings, and practical takeaways.",
        "Pronounce Nigerian names and places carefully and respectfully.",
    ]

    if _CURRENCY_RE.search(text):
        instructions.append("Read every ₦ or NGN amount naturally as naira.")
    if _MDY_DATE_RE.search(text) or _DMY_DATE_RE.search(text):
        instructions.append("Read dates clearly and naturally.")
    if _TIME_12H_RE.search(text) or _TIME_24H_RE.search(text):
        instructions.append("Read times clearly and naturally.")
    if _STRONG_EMPHASIS_RE.search(text):
        instructions.append("Use slightly firmer emphasis for urgent developments without sounding dramatic.")
    if _ADVISORY_SENTENCE_RE.search(text):
        instructions.append("Slow down a little on advisory or cautionary lines.")
    if language in {"yo", "ha", "ig", "pcm"}:
        instructions.append(
            "The text may be in a local language or Nigerian Pidgin. Preserve the wording and rhythm, and do not translate or flatten local phrasing."
        )
    if normalize_voice_id(voice_id) == "wura":
        instructions.append("Keep the tone bright and friendly, but avoid caricature.")

    return " ".join(instructions)
