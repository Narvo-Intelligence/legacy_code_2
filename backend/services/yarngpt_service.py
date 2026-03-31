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
import base64
import logging
from typing import Optional, List

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

# Fallback: Google Cloud TTS voice IDs (en-NG primarily)
GOOGLE_FALLBACK = {
    "en": "en-NG-Wavenet-B",
    "pcm": "en-NG-Wavenet-C",
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


# ── YarnGPT single-chunk call ─────────────────────────────────────────────────

async def generate_yarngpt_audio(text: str, voice: str = "idera", response_format: str = "mp3") -> Optional[bytes]:
    """Call YarnGPT API for a single chunk."""
    if not YARNGPT_API_KEY:
        return None
    truncated = text[:YARNGPT_CHUNK_MAX]
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
                "voice": voice.capitalize(),
                "response_format": response_format,
            },
            timeout=45.0,
        )
        if resp.status_code == 200 and resp.headers.get("content-type", "").startswith("audio"):
            return resp.content
        return None
    except Exception as e:
        logger.error("[YarnGPT] Request failed: %s", e)
        return None


# ── Fallback provider call ──────────────────────────────────────────────────

async def generate_fallback_audio(text: str, language: str = "en") -> Optional[bytes]:
    """
    Generate fallback audio using Google Cloud TTS (preferred) or OpenAI.
    Returns raw bytes.
    """
    from services.tts_service import generate_google_tts
    
    # 1. Try Google Cloud TTS
    if GOOGLE_CREDENTIALS:
        g_voice = GOOGLE_FALLBACK.get(language, "en-NG-Wavenet-B")
        # We need bytes, but generate_google_tts returns data URL
        data_url = await generate_google_tts(text, voice_id=g_voice)
        if data_url and ";base64," in data_url:
            return base64.b64decode(data_url.split(";base64,")[1])

    # 2. Try OpenAI TTS (Emergency backup)
    if OPENAI_API_KEY:
        try:
            from openai import AsyncOpenAI
            o_voice = OPENAI_FALLBACK.get(language, "nova")
            client = AsyncOpenAI(api_key=OPENAI_API_KEY)
            response = await client.audio.speech.create(
                model="tts-1", voice=o_voice, input=text[:FALLBACK_CHUNK_MAX],
                response_format="mp3", speed=1.0
            )
            return response.read()
        except Exception as e:
            logger.error("[Fallback TTS] OpenAI failed: %s", e)
    
    return None


# ── Multi-chunk orchestration ─────────────────────────────────────────────────

async def _generate_yarngpt_long(text: str, voice: str) -> Optional[bytes]:
    """Orchestrate long text generation via YarnGPT with fallback."""
    chunks = _split_into_chunks(text, YARNGPT_CHUNK_MAX)
    voice_meta = YARNGPT_VOICES.get(voice.lower(), {})
    lang = voice_meta.get("language", "en")

    audio_parts: List[bytes] = []
    for i, chunk in enumerate(chunks):
        part = await generate_yarngpt_audio(chunk, voice=voice)
        if part is None:
            logger.warning("[YarnGPT] Chunk %d/%d failed — trying fallback", i + 1, len(chunks))
            part = await generate_fallback_audio(chunk, language=lang)
        if part:
            audio_parts.append(part)

    return _concat_mp3_bytes(audio_parts) if audio_parts else None


# ── Public API ────────────────────────────────────────────────────────────────

async def generate_tts(text: str, voice_id: str = "idera", language: str = "en") -> Optional[str]:
    """
    Main entry point for TTS generation. Tries YarnGPT, then Google/OpenAI fallback.
    Returns base64 data URL.
    """
    if not text or not text.strip():
        return None

    # Resolve YarnGPT voice
    yarngpt_voice = voice_id if voice_id in YARNGPT_VOICES else \
                   next((vid for vid, m in YARNGPT_VOICES.items() if m["language"] == language), "emma")

    audio_bytes: Optional[bytes] = None
    provider = "yarngpt"

    if YARNGPT_API_KEY:
        if len(text) <= YARNGPT_CHUNK_MAX:
            audio_bytes = await generate_yarngpt_audio(text, voice=yarngpt_voice)
            if audio_bytes is None:
                provider = "fallback"
                audio_bytes = await generate_fallback_audio(text, language=language)
        else:
            audio_bytes = await _generate_yarngpt_long(text, voice=yarngpt_voice)
    else:
        provider = "fallback"
        if len(text) <= FALLBACK_CHUNK_MAX:
            audio_bytes = await generate_fallback_audio(text, language=language)
        else:
            # Multi-chunk fallback
            chunks = _split_into_chunks(text, FALLBACK_CHUNK_MAX)
            parts = []
            for c in chunks:
                p = await generate_fallback_audio(c, language=language)
                if p: parts.append(p)
            audio_bytes = _concat_mp3_bytes(parts) if parts else None

    if not audio_bytes:
        return None

    audio_b64 = base64.b64encode(audio_bytes).decode()
    logger.info("[TTS] Generated via %s, voice=%s, %d bytes", provider, yarngpt_voice, len(audio_bytes))
    return f"data:audio/mpeg;base64,{audio_b64}"


def get_voice_profiles():
    """Get voice profiles for the frontend."""
    return [
        {"id": vid, **meta}
        for vid, meta in YARNGPT_VOICES.items()
    ]
