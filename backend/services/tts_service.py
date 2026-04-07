# TTS Service for audio generation (OpenAI TTS, Google Cloud TTS)
import os
import base64
import logging
from typing import Optional

logger = logging.getLogger(__name__)

# API Configurations
OPENAI_API_KEY = os.environ.get("OPENAI_API_KEY")
_GOOGLE_CRED_PATH = os.environ.get("GOOGLE_APPLICATION_CREDENTIALS")

# Resolve absolute path for Google credentials if it's a relative path
if _GOOGLE_CRED_PATH and not os.path.isabs(_GOOGLE_CRED_PATH):
    # Assume relative to backend/ directory if not absolute
    _BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    _rel = _GOOGLE_CRED_PATH.replace("\\", "/").lstrip("./")
    # .env often uses `backend/assets/...` (repo-root style); _BASE_DIR is already backend/
    if _rel.startswith("backend/"):
        _rel = _rel[8:]
    GOOGLE_CREDENTIALS = os.path.abspath(os.path.join(_BASE_DIR, _rel))
    os.environ["GOOGLE_APPLICATION_CREDENTIALS"] = GOOGLE_CREDENTIALS
else:
    GOOGLE_CREDENTIALS = _GOOGLE_CRED_PATH

# Standard broadcast pace for news segments
BROADCAST_TTS_SPEED = 1.0


async def read_openai_speech_bytes(response) -> bytes:
    """Read body from AsyncOpenAI `audio.speech.create()` (HttpxBinaryResponseContent). Sync `.read()` is unreliable on async httpx responses."""
    if hasattr(response, "aread"):
        try:
            data = await response.aread()
            if data:
                return data
        except Exception as e:
            logger.debug("OpenAI speech aread: %s", e)
    try:
        out = response.content
        if out:
            return out
    except Exception:
        pass
    return response.read()


async def generate_google_tts(text: str, voice_id: str = "en-NG-Standard-B", speed: float = BROADCAST_TTS_SPEED) -> Optional[str]:
    """Generate TTS audio using Google Cloud Text-to-Speech (High quality en-NG voices)."""
    if not text or not GOOGLE_CREDENTIALS:
        return None

    try:
        from google.cloud import texttospeech_v1

        client = texttospeech_v1.TextToSpeechAsyncClient()
        
        # Determine language code from voice_id (e.g. en-NG-Standard-B -> en-NG)
        lang_code = "-".join(voice_id.split("-")[:2]) if "-" in voice_id else "en-US"
        
        synthesis_input = texttospeech_v1.SynthesisInput(text=text[:5000])
        voice_params = texttospeech_v1.VoiceSelectionParams(
            language_code=lang_code,
            name=voice_id
        )
        audio_config = texttospeech_v1.AudioConfig(
            audio_encoding=texttospeech_v1.AudioEncoding.MP3,
            speaking_rate=speed
        )

        response = await client.synthesize_speech(
            input=synthesis_input,
            voice=voice_params,
            audio_config=audio_config
        )

        audio_b64 = base64.b64encode(response.audio_content).decode()
        return f"data:audio/mpeg;base64,{audio_b64}"
    except Exception as e:
        logger.error("Google TTS generation error: %s", e)
        return None


async def generate_tts_audio(text: str, voice_id: str = "nova", speed: float = BROADCAST_TTS_SPEED) -> Optional[str]:
    """Generate TTS audio. Tries Google Cloud TTS first if voice_id suggests it, else OpenAI."""
    if not text:
        return None

    # Routing based on voice_id prefix
    if voice_id.startswith("en-NG") or not OPENAI_API_KEY:
        # Favor Google for Nigerian voices or if OpenAI is unavailable
        google_voice = voice_id if voice_id.startswith("en-NG") else "en-NG-Standard-C"
        result = await generate_google_tts(text, google_voice, speed)
        if result:
            return result

    # Fallback to OpenAI if key available and voice isn't strictly GCP
    if OPENAI_API_KEY:
        try:
            from openai import AsyncOpenAI
            
            # OpenAI voice map check - if it's a GCP ID, use a default OpenAI voice
            openai_voice = voice_id if voice_id in ["alloy", "echo", "fable", "onyx", "nova", "shimmer"] else "nova"
            
            tts_text = text[:4000] if len(text) > 4000 else text
            client = AsyncOpenAI(api_key=OPENAI_API_KEY, max_retries=1)
            response = await client.audio.speech.create(
                model="tts-1",
                voice=openai_voice,
                input=tts_text,
                response_format="mp3",
                speed=speed,
            )
            audio_bytes = await read_openai_speech_bytes(response)
            audio_b64 = base64.b64encode(audio_bytes).decode()
            return f"data:audio/mpeg;base64,{audio_b64}"
        except Exception as e:
            logger.error("OpenAI TTS fallback error: %s", e)
            
    return None


def get_available_voices():
    """Get list of available TTS voices (Hybrid OpenAI + Google Cloud)"""
    return [
        # Google Cloud (Nigeria) — Standard voices (current en-NG catalog)
        {"id": "en-NG-Standard-A", "name": "Nneka (NG)", "accent": "Nigerian", "language": "en-NG", "gender": "Female"},
        {"id": "en-NG-Standard-B", "name": "Chidi (NG)", "accent": "Nigerian", "language": "en-NG", "gender": "Male"},
        {"id": "en-NG-Standard-C", "name": "Adaora (NG)", "accent": "Nigerian", "language": "en-NG", "gender": "Female"},
        {"id": "en-NG-Standard-D", "name": "Emeka (NG)", "accent": "Nigerian", "language": "en-NG", "gender": "Male"},
        
        # OpenAI
        {"id": "nova", "name": "Nova", "accent": "Neutral", "language": "en-US", "gender": "Female"},
        {"id": "onyx", "name": "Onyx", "accent": "Deep", "language": "en-US", "gender": "Male"},
        {"id": "echo", "name": "Echo", "accent": "Warm", "language": "en-US", "gender": "Male"},
    ]
