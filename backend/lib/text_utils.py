"""Shared text utilities (e.g. AI output sanitization, display-ready text)."""
import html
import re

_STAGE_DIRECTION_PATTERNS = [
    re.compile(r"\[.*?\]"),
    re.compile(
        r"\(.*?(music|sound|pause|sigh|jingle|transition|SFX|fade|clears?).*?\)",
        re.IGNORECASE,
    ),
    re.compile(
        r"\*.*?(music|sound|pause|sigh|jingle|transition|SFX|fade|clears?).*?\*",
        re.IGNORECASE,
    ),
    re.compile(r"(?i)^\s*(?:sound of|sounds? of|sfx:?).*$", re.MULTILINE),
    re.compile(
        r"(?i)^\s*(?:\(|\*).*?(?:music|jingle|theme|fade|transition).*?(?:\)|\*)\s*$",
        re.MULTILINE,
    ),
]


def sanitize_ai_text(text: str) -> str:
    """Remove stage directions, sound descriptions, and production cues from AI-generated text. Decodes HTML entities for clean display."""
    if not text:
        return text
    result = html.unescape(text)
    for pattern in _STAGE_DIRECTION_PATTERNS:
        result = pattern.sub("", result)
    result = re.sub(r"\n{3,}", "\n\n", result)
    return result.strip()


def clean_text_for_display(text: str) -> str:
    """Decode HTML entities and normalize whitespace for clean, display-ready transcript/summary text."""
    if not text:
        return text
    out = html.unescape(text)
    out = re.sub(r"\s+", " ", out)
    return out.strip()
