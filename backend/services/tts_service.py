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

# Google Cloud en-NG offers Standard voices only (Wavenet/Chirp names may 400).
_GOOGLE_VOICE_ALIASES = {
    "en-ng-wavenet-a": "en-NG-Standard-A",
    "en-ng-wavenet-b": "en-NG-Standard-B",
    "en-ng-wavenet-c": "en-NG-Standard-C",
    "en-ng-wavenet-d": "en-NG-Standard-D",
    "en-ng-neural2-a": "en-NG-Standard-A",
    "en-ng-neural2-b": "en-NG-Standard-B",
}


def normalize_google_voice_id(voice_id: str) -> str:
    """Map legacy/invalid GCP voice names to supported en-NG Standard voices."""
    if not voice_id or not isinstance(voice_id, str):
        return "en-NG-Standard-B"
    key = voice_id.strip().lower()
    if key in _GOOGLE_VOICE_ALIASES:
        return _GOOGLE_VOICE_ALIASES[key]
    if "wavenet" in key or "neural2" in key:
        # Last resort: any mistyped en-NG premium name -> Standard-B
        if key.startswith("en-ng") or key.startswith("en_ng"):
            return "en-NG-Standard-B"
    return voice_id.strip()


def _clamp_speaking_rate(speed: float) -> float:
    """Google Cloud TTS and OpenAI speech accept ~0.25–4.0."""
    try:
        x = float(speed)
    except (TypeError, ValueError):
        return BROADCAST_TTS_SPEED
    return max(0.25, min(4.0, x))


def _clamp_pitch_semitones(pitch: float) -> float:
    """Google Cloud TTS pitch is semitones, roughly -20..20."""
    try:
        x = float(pitch)
    except (TypeError, ValueError):
        return 0.0
    return max(-20.0, min(20.0, x))


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


async def generate_google_tts(
    text: str,
    voice_id: str = "en-NG-Standard-B",
    speed: float = BROADCAST_TTS_SPEED,
    pitch_semitones: float = 0.0,
) -> Optional[str]:
    """Generate TTS audio using Google Cloud Text-to-Speech (High quality en-NG voices)."""
    if not text or not GOOGLE_CREDENTIALS:
        return None

    rate = _clamp_speaking_rate(speed)
    pitch = _clamp_pitch_semitones(pitch_semitones)
    voice_id = normalize_google_voice_id(voice_id)

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
            speaking_rate=rate,
            pitch=pitch,
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


async def generate_tts_audio(
    text: str,
    voice_id: str = "nova",
    speed: float = BROADCAST_TTS_SPEED,
    pitch_semitones: float = 0.0,
) -> Optional[str]:
    """Generate TTS audio. Tries Google Cloud TTS first if voice_id suggests it, else OpenAI."""
    if not text:
        return None

    rate = _clamp_speaking_rate(speed)

    # Routing based on voice_id prefix
    if voice_id.startswith("en-NG") or not OPENAI_API_KEY:
        # Favor Google for Nigerian voices or if OpenAI is unavailable
        google_voice = (
            normalize_google_voice_id(voice_id)
            if voice_id.startswith("en-NG")
            else "en-NG-Standard-C"
        )
        result = await generate_google_tts(text, google_voice, rate, pitch_semitones)
        if result:
            return result

    # Fallback to OpenAI if key available and voice isn't strictly GCP
    if OPENAI_API_KEY:
        try:
            from openai import AsyncOpenAI
            
            # OpenAI voice map check - if it's a GCP ID, use a default OpenAI voice
            openai_voice = voice_id if voice_id in ["alloy", "echo", "fable", "onyx", "nova", "shimmer"] else "nova"
            
            tts_text = text[:4000] if len(text) > 4000 else text
            client = AsyncOpenAI(api_key=OPENAI_API_KEY, max_retries=0)
            response = await client.audio.speech.create(
                model="tts-1",
                voice=openai_voice,
                input=tts_text,
                response_format="mp3",
                speed=rate,
            )
            audio_bytes = await read_openai_speech_bytes(response)
            audio_b64 = base64.b64encode(audio_bytes).decode()
            return f"data:audio/mpeg;base64,{audio_b64}"
        except Exception as e:
            logger.error("OpenAI TTS fallback error: %s", e)
            
    return None


def get_available_voices():
    """Get list of available TTS voices (Hybrid OpenAI + Google Cloud) for briefings and fallbacks."""
    return [
        # Google Cloud (Nigeria) — Standard voices (current en-NG catalog)
        {
            "id": "en-NG-Standard-A",
            "name": "Nneka (NG)",
            "accent": "Nigerian",
            "language": "en-NG",
            "gender": "Female",
            "description": "Google Cloud en-NG standard female — briefings and fallback.",
        },
        {
            "id": "en-NG-Standard-B",
            "name": "Chidi (NG)",
            "accent": "Nigerian",
            "language": "en-NG",
            "gender": "Male",
            "description": "Google Cloud en-NG standard male — briefings and fallback.",
        },
        {
            "id": "en-NG-Standard-C",
            "name": "Adaora (NG)",
            "accent": "Nigerian",
            "language": "en-NG",
            "gender": "Female",
            "description": "Google Cloud en-NG standard female — briefings and fallback.",
        },
        {
            "id": "en-NG-Standard-D",
            "name": "Emeka (NG)",
            "accent": "Nigerian",
            "language": "en-NG",
            "gender": "Male",
            "description": "Google Cloud en-NG standard male — briefings and fallback.",
        },
        # OpenAI TTS-1
        {"id": "alloy", "name": "Alloy", "accent": "Neutral", "language": "en-US", "gender": "Neutral", "description": "OpenAI TTS — balanced tone."},
        {"id": "echo", "name": "Echo", "accent": "Warm", "language": "en-US", "gender": "Male", "description": "OpenAI TTS — warm male."},
        {"id": "fable", "name": "Fable", "accent": "Expressive", "language": "en-US", "gender": "Neutral", "description": "OpenAI TTS — expressive."},
        {"id": "onyx", "name": "Onyx", "accent": "Deep", "language": "en-US", "gender": "Male", "description": "OpenAI TTS — deep male."},
        {"id": "nova", "name": "Nova", "accent": "Bright", "language": "en-US", "gender": "Female", "description": "OpenAI TTS — bright female."},
        {"id": "shimmer", "name": "Shimmer", "accent": "Soft", "language": "en-US", "gender": "Female", "description": "OpenAI TTS — soft female."},
    ]
