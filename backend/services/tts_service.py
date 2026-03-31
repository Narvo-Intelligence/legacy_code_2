# TTS Service for audio generation (OpenAI TTS, standalone)
import os
import base64
import logging
from typing import Optional

logger = logging.getLogger(__name__)
OPENAI_API_KEY = os.environ.get("OPENAI_API_KEY")

# Standard broadcast pace for news segments (user can override via playback speed in UI)
BROADCAST_TTS_SPEED = 1.0


async def generate_tts_audio(text: str, voice_id: str = "nova", speed: float = BROADCAST_TTS_SPEED) -> Optional[str]:
    """Generate TTS audio using OpenAI TTS."""
    if not text or not OPENAI_API_KEY:
        return None

    try:
        from openai import AsyncOpenAI

        tts_text = text[:4000] if len(text) > 4000 else text
        client = AsyncOpenAI(api_key=OPENAI_API_KEY)
        response = await client.audio.speech.create(
            model="tts-1",
            voice=voice_id,
            input=tts_text,
            response_format="mp3",
            speed=speed,
        )
        audio_bytes = response.read()
        audio_b64 = base64.b64encode(audio_bytes).decode()
        return f"data:audio/mpeg;base64,{audio_b64}"
    except Exception as e:
        logger.error("TTS generation error: %s", e)
        return None


def get_available_voices():
    """Get list of available TTS voices"""
    return [
        {"id": "nova", "name": "Nova", "accent": "Neutral", "language": "en-US", "gender": "Female"},
        {"id": "alloy", "name": "Alloy", "accent": "Neutral", "language": "en-US", "gender": "Neutral"},
        {"id": "echo", "name": "Echo", "accent": "Warm", "language": "en-US", "gender": "Male"},
        {"id": "fable", "name": "Fable", "accent": "British", "language": "en-GB", "gender": "Male"},
        {"id": "onyx", "name": "Onyx", "accent": "Deep", "language": "en-US", "gender": "Male"},
        {"id": "shimmer", "name": "Shimmer", "accent": "Soft", "language": "en-US", "gender": "Female"},
    ]
