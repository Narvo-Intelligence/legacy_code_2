"""
YarnGPT TTS Service — Primary TTS provider for Narvo.
Uses YarnGPT API (https://yarngpt.ai) for Nigerian-accented voices.
Falls back to Google Cloud TTS (en-NG) and finally OpenAI if YarnGPT fails.

Long narratives (>2000 chars) are automatically split at sentence boundaries
and the resulting audio chunks are concatenated into a single MP3.
"""
import io
import os
import re
import json
import base64
import logging
from typing import Optional, List
from lib.audio_storage import build_audio_cache_key, store_audio_bytes
from services.ssml_decorator import AUDIO_RENDER_VERSION, decorate_text_for_tts
from services.tts_service import audio_bytes_to_data_url

logger = logging.getLogger(__name__)

YARNGPT_API_URL = "https://yarngpt.ai/api/v1/tts"
YARNGPT_API_KEY = os.environ.get("YARNGPT_API_KEY", "")
OPENAI_API_KEY = os.environ.get("OPENAI_API_KEY", "")
GOOGLE_CREDENTIALS = os.environ.get("GOOGLE_APPLICATION_CREDENTIALS")

# YarnGPT hard limit per request (chars). We split below this.
YARNGPT_CHUNK_MAX = 1900   # small safety margin below the 2000-char API limit
# Fallback (Google/OpenAI) limit per request
FALLBACK_CHUNK_MAX = 4500

# YarnGPT voices mapped to languages (English first for display order)
YARNGPT_VOICES = {
    "emma":    {"name": "Emma",    "accent": "English", "language": "en",  "gender": "male",   "description": "Authoritative, deep English voice"},
    "idera":   {"name": "Idera",   "accent": "Yoruba",  "language": "yo",  "gender": "female", "description": "Melodic, gentle Yoruba voice"},
    "zainab":  {"name": "Zainab",  "accent": "Hausa",   "language": "ha",  "gender": "female", "description": "Soothing, gentle Hausa voice"},
    "osagie":  {"name": "Osagie",  "accent": "Igbo",    "language": "ig",  "gender": "male",   "description": "Smooth, calm Igbo voice"},
    "wura":    {"name": "Wura",    "accent": "Pidgin",  "language": "pcm", "gender": "female", "description": "Young, sweet Pidgin voice"},
}


def resolve_tts_language_for_voice(voice_id: str, fallback_language: str = "en") -> str:
    """
    Language for translation + fallback TTS. Yarn narrators always use profile `language`
    (must match SUPPORTED_LANGUAGES in translation_service). Other voice ids (e.g. OpenAI)
    use fallback_language from the request.
    """
    vid = (voice_id or "").strip().lower()
    meta = YARNGPT_VOICES.get(vid)
    if meta:
        return str(meta.get("language") or "en")
    fb = (fallback_language or "en").strip() or "en"
    return fb


# Fallback: Google Cloud TTS voice IDs (en-NG Standard — Wavenet names are not offered for en-NG)
GOOGLE_FALLBACK = {
    "en": "en-NG-Standard-B",
    "pcm": "en-NG-Standard-D",
    "yo": "en-NG-Standard-A",
    "ha": "en-NG-Standard-B",
    "ig": "en-NG-Standard-C",
}

# Tertiary Fallback: OpenAI
OPENAI_FALLBACK = {
    "yo": "nova",
    "en": "onyx",
    "ha": "shimmer",
    "ig": "alloy",
    "pcm": "echo",
}


# ── Text chunking ─────────────────────────────────────────────────────────────

def _split_into_chunks(text: str, max_chars: int) -> List[str]:
    """
    Split text into chunks of at most max_chars, always breaking at sentence
    boundaries (. ! ?) to avoid cutting mid-sentence.
    """
    text = text.strip()
    if len(text) <= max_chars:
        return [text]

    chunks: List[str] = []
    remaining = text

    while len(remaining) > max_chars:
        window = remaining[:max_chars]
        match = None
        for m in re.finditer(r'[.!?]["\']?\s+', window):
            match = m
        if match:
            cut = match.end()
        else:
            cut = window.rfind(" ")
            if cut == -1:
                cut = max_chars
        chunks.append(remaining[:cut].strip())
        remaining = remaining[cut:].strip()

    if remaining:
        chunks.append(remaining)
    return [c for c in chunks if c]


def _concat_mp3_bytes(chunks: List[bytes]) -> bytes:
    """Naively concatenate MP3 byte chunks."""
    return b"".join(chunks)


def _looks_like_mp3(data: bytes) -> bool:
    if not data or len(data) < 2:
        return False
    if data[:3] == b"ID3":
        return True
    # MPEG-1/2 Layer III frame sync
    return data[0] == 0xFF and (data[1] & 0xE0) == 0xE0


def _bytes_from_yarngpt_response(resp) -> Optional[bytes]:
    """
    YarnGPT may return raw MP3 with Content-Type application/octet-stream, or JSON with base64 audio.
    Only treat 200 responses as success; otherwise caller logs and falls back.
    """
    if resp.status_code != 200:
        return None
    raw = resp.content or b""
    ct = (resp.headers.get("content-type") or "").split(";")[0].strip().lower()

    if _looks_like_mp3(raw):
        return raw
    if ct.startswith("audio/") and raw:
        return raw
    if ct in ("application/octet-stream", "binary/octet-stream") and raw and _looks_like_mp3(raw):
        return raw

    if "json" in ct or (raw[:1] == b"{"):
        try:
            obj = json.loads(raw.decode("utf-8", errors="replace"))
        except (json.JSONDecodeError, UnicodeError):
            return None
        if not isinstance(obj, dict):
            return None
        for key in ("audio", "audio_base64", "data", "mp3", "file"):
            val = obj.get(key)
            if not isinstance(val, str) or not val.strip():
                continue
            s = val.strip()
            if s.startswith("data:") and "base64," in s:
                try:
                    return base64.b64decode(s.split("base64,", 1)[1].strip())
                except Exception:
                    continue
            try:
                return base64.b64decode(s)
            except Exception:
                continue
        return None

    return None


# ── YarnGPT single-chunk call ─────────────────────────────────────────────────

async def generate_yarngpt_audio(text: str, voice: str = "idera", response_format: str = "mp3") -> Optional[bytes]:
    """Call YarnGPT API for a single chunk."""
    if not YARNGPT_API_KEY:
        return None
    truncated = text[:YARNGPT_CHUNK_MAX]
    voice_key = (voice or "idera").strip().lower()
    voice_display = (YARNGPT_VOICES.get(voice_key) or {}).get("name") or voice.capitalize()
    try:
        from lib.http_client import get_http_client
        client = await get_http_client()
        resp = await client.post(
            YARNGPT_API_URL,
            headers={
                "Authorization": f"Bearer {YARNGPT_API_KEY}",
                "Content-Type": "application/json",
            },
            json={
                "text": truncated,
                "voice": voice_display,
                "response_format": response_format,
            },
            timeout=45.0,
        )
        audio = _bytes_from_yarngpt_response(resp)
        if audio:
            return audio
        preview = (resp.text or "")[:400] if hasattr(resp, "text") else str(resp.content[:200])
        logger.warning(
            "[YarnGPT] No usable audio: status=%s content-type=%s preview=%r",
            resp.status_code,
            resp.headers.get("content-type"),
            preview,
        )
        return None
    except Exception as e:
        logger.error("[YarnGPT] Request failed: %s", e)
        return None


# ── Fallback provider call ──────────────────────────────────────────────────

async def generate_fallback_audio(
    text: str,
    language: str = "en",
    speed: float = 1.0,
    pitch_semitones: float = 0.0,
) -> Optional[bytes]:
    """
    Generate fallback audio using Google Cloud TTS (preferred) or OpenAI.
    Returns raw bytes.
    """
    from services.tts_service import generate_google_tts_bytes, read_openai_speech_bytes
    decorated = decorate_text_for_tts(text, language=language)
    plain_text = decorated.plain_text
    if not plain_text:
        return None

    # 1. Try Google Cloud TTS
    if GOOGLE_CREDENTIALS:
        g_voice = GOOGLE_FALLBACK.get(language, "en-NG-Standard-B")
        audio_bytes = await generate_google_tts_bytes(
            plain_text,
            voice_id=g_voice,
            speed=speed,
            pitch_semitones=pitch_semitones,
            ssml=decorated.ssml,
        )
        if audio_bytes:
            return audio_bytes

    # 2. Try OpenAI TTS (Emergency backup) — no retries (quota/rate errors waste seconds)
    if OPENAI_API_KEY:
        try:
            from openai import AsyncOpenAI, APIStatusError
            from services.tts_service import _clamp_speaking_rate

            o_voice = OPENAI_FALLBACK.get(language, "nova")
            client = AsyncOpenAI(api_key=OPENAI_API_KEY, max_retries=0)
            response = await client.audio.speech.create(
                model="tts-1",
                voice=o_voice,
                input=plain_text[:FALLBACK_CHUNK_MAX],
                response_format="mp3",
                speed=_clamp_speaking_rate(speed),
            )
            return await read_openai_speech_bytes(response)
        except APIStatusError as e:
            low = str(e).lower()
            if "insufficient_quota" in low or "exceeded your current quota" in low:
                logger.warning("[Fallback TTS] OpenAI skipped (quota/billing): %s", e)
            else:
                logger.error("[Fallback TTS] OpenAI failed: %s", e)
        except Exception as e:
            logger.error("[Fallback TTS] OpenAI failed: %s", e)
    
    return None


# ── Multi-chunk orchestration ─────────────────────────────────────────────────

async def _generate_yarngpt_long(
    text: str,
    voice: str,
    speed: float = 1.0,
    pitch_semitones: float = 0.0,
) -> Optional[bytes]:
    """Orchestrate long text generation via YarnGPT with fallback."""
    chunks = _split_into_chunks(text, YARNGPT_CHUNK_MAX)
    voice_meta = YARNGPT_VOICES.get(voice.lower(), {})
    lang = voice_meta.get("language", "en")

    audio_parts: List[bytes] = []
    for i, chunk in enumerate(chunks):
        part = await generate_yarngpt_audio(chunk, voice=voice)
        if part is None:
            logger.warning("[YarnGPT] Chunk %d/%d failed — trying fallback", i + 1, len(chunks))
            part = await generate_fallback_audio(
                chunk, language=lang, speed=speed, pitch_semitones=pitch_semitones
            )
        if part:
            audio_parts.append(part)

    return _concat_mp3_bytes(audio_parts) if audio_parts else None


# ── Public API ────────────────────────────────────────────────────────────────

async def generate_tts_bytes(
    text: str,
    voice_id: str = "idera",
    language: str = "en",
    speed: float = 1.0,
    pitch_semitones: float = 0.0,
) -> Optional[bytes]:
    """
    Main entry point for TTS generation. Tries YarnGPT, then Google/OpenAI fallback.
    Speed and pitch apply to Google/OpenAI fallbacks (YarnGPT API has no client-side pitch).
    Returns raw MP3 bytes.
    """
    if not text or not text.strip():
        return None

    language = resolve_tts_language_for_voice(voice_id, language)
    rendered = decorate_text_for_tts(text, language=language, voice_id=voice_id)
    plain_text = rendered.plain_text
    if not plain_text:
        return None
    vid_key = (voice_id or "idera").strip().lower()

    # Non-Yarn voice ids (Google en-NG, OpenAI) — use hybrid TTS path directly
    if vid_key not in YARNGPT_VOICES:
        from services.tts_service import generate_tts_audio_bytes

        return await generate_tts_audio_bytes(
            plain_text,
            voice_id=voice_id,
            speed=speed,
            pitch_semitones=pitch_semitones,
            language=language,
        )

    # Resolve YarnGPT voice
    yarngpt_voice = vid_key

    audio_bytes: Optional[bytes] = None
    provider = "yarngpt"

    if YARNGPT_API_KEY:
        if len(plain_text) <= YARNGPT_CHUNK_MAX:
            audio_bytes = await generate_yarngpt_audio(plain_text, voice=yarngpt_voice)
            if audio_bytes is None:
                provider = "fallback"
                audio_bytes = await generate_fallback_audio(
                    plain_text, language=language, speed=speed, pitch_semitones=pitch_semitones
                )
        else:
            audio_bytes = await _generate_yarngpt_long(
                plain_text, voice=yarngpt_voice, speed=speed, pitch_semitones=pitch_semitones
            )
    else:
        provider = "fallback"
        if len(plain_text) <= FALLBACK_CHUNK_MAX:
            audio_bytes = await generate_fallback_audio(
                plain_text, language=language, speed=speed, pitch_semitones=pitch_semitones
            )
        else:
            # Multi-chunk fallback
            chunks = _split_into_chunks(plain_text, FALLBACK_CHUNK_MAX)
            parts = []
            for c in chunks:
                p = await generate_fallback_audio(
                    c, language=language, speed=speed, pitch_semitones=pitch_semitones
                )
                if p:
                    parts.append(p)
            audio_bytes = _concat_mp3_bytes(parts) if parts else None

    if not audio_bytes:
        logger.error(
            "[TTS] All providers failed (yarn_key=%s google_creds=%s openai_key=%s)",
            bool(YARNGPT_API_KEY),
            bool(GOOGLE_CREDENTIALS),
            bool(OPENAI_API_KEY),
        )
        return None

    logger.info("[TTS] Generated via %s, voice=%s, %d bytes", provider, yarngpt_voice, len(audio_bytes))
    return audio_bytes


async def generate_tts(
    text: str,
    voice_id: str = "idera",
    language: str = "en",
    speed: float = 1.0,
    pitch_semitones: float = 0.0,
    storage_namespace: str = "tts",
) -> Optional[str]:
    """
    Generate TTS and return a transport URL.
    Prefers Supabase Storage object URLs; falls back to inlined data URLs only when storage is unavailable.
    """
    effective_language = resolve_tts_language_for_voice(voice_id, language)
    audio_bytes = await generate_tts_bytes(
        text=text,
        voice_id=voice_id,
        language=effective_language,
        speed=speed,
        pitch_semitones=pitch_semitones,
    )
    if not audio_bytes:
        return None
    rendered = decorate_text_for_tts(text, language=effective_language, voice_id=voice_id)
    cache_key = build_audio_cache_key(
        rendered.plain_text,
        voice_id,
        effective_language,
        namespace=f"{storage_namespace}:{AUDIO_RENDER_VERSION}",
    )
    stored = await store_audio_bytes(audio_bytes, cache_key, category=storage_namespace)
    return stored or audio_bytes_to_data_url(audio_bytes)


def get_voice_profiles():
    """YarnGPT narrator profiles only (legacy helper)."""
    return [
        {"id": vid, **meta}
        for vid, meta in YARNGPT_VOICES.items()
    ]


def get_all_voice_profiles():
    """
    Full catalog for settings and briefing: Yarn narrators first, then Google/OpenAI (no duplicate ids).
    """
    yarn = get_voice_profiles()
    seen = {p["id"] for p in yarn}
    from services.tts_service import get_available_voices

    out: List[dict] = list(yarn)
    for v in get_available_voices():
        vid = v.get("id")
        if not vid or vid in seen:
            continue
        desc = v.get("description") or ""
        row = {**v, "description": desc}
        out.append(row)
        seen.add(vid)
    return out
