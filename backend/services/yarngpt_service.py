"""
YarnGPT TTS Service — Primary TTS provider for Narvo.
Uses YarnGPT API (https://yarngpt.ai) for Nigerian-accented voices.
Falls back to OpenAI TTS if YarnGPT fails.

Long narratives (>2000 chars) are automatically split at sentence boundaries
and the resulting audio chunks are concatenated into a single MP3.
"""
import io
import os
import re
import base64
import logging
import asyncio
import httpx
from typing import Optional, List

logger = logging.getLogger(__name__)

YARNGPT_API_URL = "https://yarngpt.ai/api/v1/tts"
YARNGPT_API_KEY = os.environ.get("YARNGPT_API_KEY", "")
OPENAI_API_KEY = os.environ.get("OPENAI_API_KEY", "")

# YarnGPT hard limit per request (chars). We split below this.
YARNGPT_CHUNK_MAX = 1900   # small safety margin below the 2000-char API limit
# OpenAI TTS limit per request
OPENAI_CHUNK_MAX = 4000

# YarnGPT voices mapped to languages (English first for display order)
YARNGPT_VOICES = {
    "emma":    {"name": "Emma",    "accent": "English", "language": "en",  "gender": "male",   "description": "Authoritative, deep English voice"},
    "idera":   {"name": "Idera",   "accent": "Yoruba",  "language": "yo",  "gender": "female", "description": "Melodic, gentle Yoruba voice"},
    "zainab":  {"name": "Zainab",  "accent": "Hausa",   "language": "ha",  "gender": "female", "description": "Soothing, gentle Hausa voice"},
    "osagie":  {"name": "Osagie",  "accent": "Igbo",    "language": "ig",  "gender": "male",   "description": "Smooth, calm Igbo voice"},
    "wura":    {"name": "Wura",    "accent": "Pidgin",  "language": "pcm", "gender": "female", "description": "Young, sweet Pidgin voice"},
}

# Fallback: OpenAI voice IDs mapped to same languages
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
    boundaries (. ! ?) to avoid cutting mid-sentence.  Falls back to word
    boundaries when no sentence end is found within max_chars.
    """
    text = text.strip()
    if len(text) <= max_chars:
        return [text]

    chunks: List[str] = []
    remaining = text

    while len(remaining) > max_chars:
        # Look for last sentence-ending punctuation within the limit
        window = remaining[:max_chars]
        # Find the rightmost sentence boundary in the window
        match = None
        for m in re.finditer(r'[.!?]["\']?\s+', window):
            match = m
        if match:
            cut = match.end()
        else:
            # Fall back to last space within the window
            cut = window.rfind(" ")
            if cut == -1:
                cut = max_chars  # hard cut if no space found

        chunks.append(remaining[:cut].strip())
        remaining = remaining[cut:].strip()

    if remaining:
        chunks.append(remaining)

    return [c for c in chunks if c]


def _concat_mp3_bytes(chunks: List[bytes]) -> bytes:
    """
    Naively concatenate MP3 byte chunks.  Works for simple playback; a proper
    implementation would re-encode via pydub/ffmpeg, but that adds a heavy
    dependency.  The concatenated stream plays correctly in all major browsers.
    """
    return b"".join(chunks)


# ── YarnGPT single-chunk call ─────────────────────────────────────────────────

async def generate_yarngpt_audio(text: str, voice: str = "idera", response_format: str = "mp3") -> Optional[bytes]:
    """Call YarnGPT API for a single chunk (≤ YARNGPT_CHUNK_MAX chars). Returns raw MP3 bytes or None."""
    if not YARNGPT_API_KEY:
        return None

    truncated = text[:YARNGPT_CHUNK_MAX]

    try:
        async with httpx.AsyncClient(timeout=45.0) as client:
            resp = await client.post(
                YARNGPT_API_URL,
                headers={
                    "Authorization": f"Bearer {YARNGPT_API_KEY}",
                    "Content-Type": "application/json",
                },
                json={
                    "text": truncated,
                    "voice": voice.capitalize(),
                    "response_format": response_format,
                },
            )
            if resp.status_code == 200 and resp.headers.get("content-type", "").startswith("audio"):
                return resp.content
            else:
                logger.warning("[YarnGPT] Error %s: %s", resp.status_code, resp.text[:200])
                return None
    except Exception as e:
        logger.error("[YarnGPT] Request failed: %s", e)
        return None


async def generate_openai_fallback(text: str, voice_id: str = "nova") -> Optional[bytes]:
    """Fallback: Generate TTS using OpenAI (single chunk ≤ OPENAI_CHUNK_MAX chars)."""
    if not OPENAI_API_KEY:
        return None
    try:
        from openai import AsyncOpenAI
        client = AsyncOpenAI(api_key=OPENAI_API_KEY)
        response = await client.audio.speech.create(
            model="tts-1",
            voice=voice_id,
            input=text[:OPENAI_CHUNK_MAX],
            response_format="mp3",
            speed=1.0,
        )
        return response.read()
    except Exception as e:
        logger.error("[OpenAI TTS Fallback] Error: %s", e)
        return None


# ── Multi-chunk orchestration ─────────────────────────────────────────────────

async def _generate_yarngpt_long(text: str, voice: str) -> Optional[bytes]:
    """
    Split long text into sentence-bounded chunks, generate audio for each via
    YarnGPT sequentially (to respect rate limits), then concatenate the MP3 bytes.
    Returns concatenated MP3 bytes or None if any chunk fails.
    """
    chunks = _split_into_chunks(text, YARNGPT_CHUNK_MAX)
    logger.info("[YarnGPT] Long text: %d chars → %d chunks", len(text), len(chunks))

    audio_parts: List[bytes] = []
    for i, chunk in enumerate(chunks):
        part = await generate_yarngpt_audio(chunk, voice=voice)
        if part is None:
            logger.warning("[YarnGPT] Chunk %d/%d failed", i + 1, len(chunks))
            return None
        audio_parts.append(part)

    return _concat_mp3_bytes(audio_parts)


async def _generate_openai_long(text: str, voice_id: str) -> Optional[bytes]:
    """
    Split long text into chunks, generate via OpenAI sequentially, concatenate.
    """
    chunks = _split_into_chunks(text, OPENAI_CHUNK_MAX)
    logger.info("[OpenAI TTS] Long text: %d chars → %d chunks", len(text), len(chunks))

    audio_parts: List[bytes] = []
    for i, chunk in enumerate(chunks):
        part = await generate_openai_fallback(chunk, voice_id=voice_id)
        if part is None:
            logger.warning("[OpenAI TTS] Chunk %d/%d failed", i + 1, len(chunks))
            return None
        audio_parts.append(part)

    return _concat_mp3_bytes(audio_parts)


# ── Public API ────────────────────────────────────────────────────────────────

async def generate_tts(text: str, voice_id: str = "idera", language: str = "en") -> Optional[str]:
    """
    Generate TTS audio for text of any length.
    Long texts (>YARNGPT_CHUNK_MAX) are split at sentence boundaries, generated
    chunk-by-chunk, and the MP3 parts are concatenated.
    Tries YarnGPT first, falls back to OpenAI.
    Returns base64 data URL or None.
    """
    if not text or not text.strip():
        return None

    # Resolve YarnGPT voice from language if voice_id isn't a YarnGPT voice
    yarngpt_voice = voice_id
    if voice_id not in YARNGPT_VOICES:
        for vid, meta in YARNGPT_VOICES.items():
            if meta["language"] == language:
                yarngpt_voice = vid
                break
        else:
            yarngpt_voice = "emma"

    audio_bytes: Optional[bytes] = None
    provider = "yarngpt"

    # YarnGPT path (with chunking for long text)
    if YARNGPT_API_KEY:
        if len(text) <= YARNGPT_CHUNK_MAX:
            audio_bytes = await generate_yarngpt_audio(text, voice=yarngpt_voice)
        else:
            audio_bytes = await _generate_yarngpt_long(text, voice=yarngpt_voice)

    # OpenAI fallback (with chunking for long text)
    if audio_bytes is None:
        openai_voice = OPENAI_FALLBACK.get(language, "nova")
        provider = "openai"
        if len(text) <= OPENAI_CHUNK_MAX:
            audio_bytes = await generate_openai_fallback(text, voice_id=openai_voice)
        else:
            audio_bytes = await _generate_openai_long(text, voice_id=openai_voice)

    if audio_bytes is None:
        return None

    audio_b64 = base64.b64encode(audio_bytes).decode()
    logger.info("[TTS] Generated via %s, voice=%s, %d bytes", provider, yarngpt_voice, len(audio_bytes))
    return f"data:audio/mpeg;base64,{audio_b64}"


def get_voice_profiles():
    """Get voice profiles for the frontend — using YarnGPT voices."""
    return [
        {"id": vid, **{k: v for k, v in meta.items()}}
        for vid, meta in YARNGPT_VOICES.items()
    ]
