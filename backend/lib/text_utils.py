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


# URL, HTML, Markdown patterns for briefing/news sanitization (no links or markup in broadcast script)
_URL_PATTERN = re.compile(
    r"https?://[^\s<>\[\]()]+|www\.[^\s<>\[\]()]+|[^\s<>\[\]()]+\.(?:com|org|net|io|co)[^\s<>\[\]()]*",
    re.IGNORECASE,
)
_MARKDOWN_LINK = re.compile(r"\[([^\]]*)\]\([^)]+\)")
_HTML_TAG = re.compile(r"<[^>]+>")
_GENERIC_FILLERS = re.compile(
    r"\b(?:studio|audio|sound|recording|broadcast\s*control|we\s*go\s*live|back\s*to\s*you)\b",
    re.IGNORECASE,
)


def strip_urls_and_markup(text: str) -> str:
    """Remove URLs, HTML tags, and Markdown links from text. For broadcast scripts and summaries."""
    if not text:
        return text
    out = html.unescape(text)
    out = _MARKDOWN_LINK.sub(r"\1", out)
    out = _HTML_TAG.sub(" ", out)
    out = _URL_PATTERN.sub("", out)
    out = re.sub(r"\s+", " ", out)
    return out.strip()


def clean_text_for_briefing(text: str) -> str:
    """Clean text for use in briefing: strip URLs, HTML, Markdown, and generic filler phrases."""
    if not text:
        return text
    out = strip_urls_and_markup(text)
    out = _GENERIC_FILLERS.sub("", out)
    out = re.sub(r"\n{3,}", "\n\n", out)
    return out.strip()
