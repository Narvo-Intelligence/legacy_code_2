"""
YarnGPT TTS Service — Primary TTS provider for Narvo.
Uses YarnGPT API (https://yarngpt.ai) for Nigerian-accented voices.
Falls back to OpenAI TTS if YarnGPT fails.
"""
import os
import base64
import logging
import httpx
from typing import Optional

logger = logging.getLogger(__name__)

YARNGPT_API_URL = "https://yarngpt.ai/api/v1/tts"
YARNGPT_API_KEY = os.environ.get("YARNGPT_API_KEY", "")
OPENAI_API_KEY = os.environ.get("OPENAI_API_KEY", "")

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


async def generate_yarngpt_audio(text: str, voice: str = "idera", response_format: str = "mp3") -> Optional[bytes]:
    """Call YarnGPT API to generate TTS audio. Returns raw audio bytes or None."""
    if not YARNGPT_API_KEY:
        return None

    # Truncate to YarnGPT limit (2000 chars)
    truncated = text[:2000]

    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
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
                error_text = resp.text[:200]
                logger.warning("[YarnGPT] Error %s: %s", resp.status_code, error_text)
                return None
    except Exception as e:
        logger.error("[YarnGPT] Request failed: %s", e)
        return None


async def generate_openai_fallback(text: str, voice_id: str = "nova") -> Optional[bytes]:
    """Fallback: Generate TTS using OpenAI (standalone)."""
    if not OPENAI_API_KEY:
        return None
    try:
        from openai import AsyncOpenAI
        client = AsyncOpenAI(api_key=OPENAI_API_KEY)
        # Use standard broadcast pace (1.0); user adjusts via playback speed in app
        response = await client.audio.speech.create(
            model="tts-1",
            voice=voice_id,
            input=text[:4096],
            response_format="mp3",
            speed=1.0,
        )
        return response.read()
    except Exception as e:
        logger.error("[OpenAI TTS Fallback] Error: %s", e)
        return None


async def generate_tts(text: str, voice_id: str = "idera", language: str = "en") -> Optional[str]:
    """
    Generate TTS audio. Tries YarnGPT first, falls back to OpenAI.
    Returns base64 data URL or None.
    """
    # Resolve YarnGPT voice from language if voice_id isn't a YarnGPT voice
    yarngpt_voice = voice_id
    if voice_id not in YARNGPT_VOICES:
        # Map language to YarnGPT voice
        for vid, meta in YARNGPT_VOICES.items():
            if meta["language"] == language:
                yarngpt_voice = vid
                break
        else:
            yarngpt_voice = "emma"  # default

    # Try YarnGPT first
    audio_bytes = await generate_yarngpt_audio(text, voice=yarngpt_voice)
    provider = "yarngpt"

    # Fallback to OpenAI
    if audio_bytes is None:
        openai_voice = OPENAI_FALLBACK.get(language, "nova")
        audio_bytes = await generate_openai_fallback(text, voice_id=openai_voice)
        provider = "openai"

    if audio_bytes is None:
        return None

    audio_b64 = base64.b64encode(audio_bytes).decode()
    logger.info("[TTS] Generated via %s, voice=%s, %s bytes", provider, yarngpt_voice, len(audio_bytes))
    return f"data:audio/mpeg;base64,{audio_b64}"


def get_voice_profiles():
    """Get voice profiles for the frontend — using YarnGPT voices."""
    return [
        {"id": vid, **{k: v for k, v in meta.items()}}
        for vid, meta in YARNGPT_VOICES.items()
    ]
