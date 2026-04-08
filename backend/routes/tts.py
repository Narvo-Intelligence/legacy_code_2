# TTS routes — /api/tts/generate, /api/tts/voices, /api/paraphrase, /api/narrative/duel
import hashlib
import logging
from datetime import datetime, timezone
from typing import List, Optional

from fastapi import APIRouter, HTTPException
from fastapi.responses import JSONResponse
from pydantic import BaseModel

from lib.supabase_db import get_supabase_db
from lib.text_utils import sanitize_ai_text

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api", tags=["tts"])

# ── Models ───────────────────────────────────────────────

class TTSRequest(BaseModel):
    text: str = ""
    voice_id: str = "emma"
    stability: float = 0.5
    similarity_boost: float = 0.75
    language: str = "en"
    skip_translation: bool = False
    landing_preview: bool = False
    prepend_verification: bool = False
    story_id: Optional[str] = None


class TTSResponse(BaseModel):
    audio_url: str
    text: str
    translated_text: Optional[str] = None
    voice_id: str
    language: str = "en"


class ParaphraseRequest(BaseModel):
    text: str
    source_name: Optional[str] = None
    style: str = "broadcast"


class ParaphraseResponse(BaseModel):
    original: str
    narrative: str
    key_takeaways: List[str]


class NarrativeDuelRequest(BaseModel):
    narrative_a: str = ""
    narrative_b: str = ""


class VoiceProfile(BaseModel):
    id: str
    name: str
    accent: str
    language: str
    gender: str
    description: str


# ── Constants ────────────────────────────────────────────

LANDING_PREVIEW_MESSAGE = (
    "Africa's news, spoken clearly. The day's biggest stories, turned into a briefing only on Narvo."
)


# ── In-memory cache ─────────────────────────────────────
import time as _time

class _MemCache:
    def __init__(self):
        self._store = {}
    def get(self, key, ttl=300):
        entry = self._store.get(key)
        if entry and (_time.time() - entry[1]) < ttl:
            return entry[0]
        return None
    def set(self, key, value):
        self._store[key] = (value, _time.time())

_cache = _MemCache()


# ── Endpoints ────────────────────────────────────────────

async def _update_story_audio_bg(story_id: str, lang: str, audio_url: str, voice_id: str):
    """Background task to save the generated audio URL and voice_id back to story_content."""
    try:
        db = get_supabase_db()
        r = (
            db.table("story_content")
            .select("audio_by_lang, audio_voice_by_lang")
            .eq("story_id", story_id)
            .limit(1)
            .execute()
        )
        row = (r.data or [None])[0]
        if row:
            audio_by_lang = row.get("audio_by_lang") or {}
            audio_voice_by_lang = row.get("audio_voice_by_lang") or {}
            audio_by_lang[lang] = audio_url
            v = (voice_id or "").strip() or "emma"
            audio_voice_by_lang[lang] = v
            db.table("story_content").update({
                "audio_by_lang": audio_by_lang,
                "audio_voice_by_lang": audio_voice_by_lang,
            }).eq("story_id", story_id).execute()
    except Exception as e:
        logger.warning("[TTS] Failed to update audio_by_lang for %s: %s", story_id, e)


@router.post("/tts/generate", response_model=TTSResponse, summary="Generate TTS audio")
async def generate_tts(request: TTSRequest):
    """Generate TTS audio — YarnGPT primary, OpenAI fallback, with caching."""
    from services.yarngpt_service import generate_tts as yarn_generate_tts, resolve_tts_language_for_voice

    if request.landing_preview:
        text_to_use = LANDING_PREVIEW_MESSAGE
        effective_lang = resolve_tts_language_for_voice(request.voice_id, "en")
        skip_tx = effective_lang == "en"
    else:
        text_to_use = request.text or ""
        if request.prepend_verification and text_to_use.strip():
            verification_blip = "What Narvo could verify. "
            if not text_to_use.strip().startswith(verification_blip.strip()):
                text_to_use = verification_blip + text_to_use
        effective_lang = resolve_tts_language_for_voice(request.voice_id, request.language or "en")
        skip_tx = request.skip_translation

    # Instant playback: check if audio is already generated
    db = get_supabase_db()
    translated_text_from_db = None
    
    if request.story_id and request.story_id.strip():
        from services.story_content_service import get_story_content
        content = get_story_content(request.story_id.strip())
        if content:
            audio_by_lang = content.get("audio_by_lang") or {}
            pre_url = audio_by_lang.get(effective_lang)
            translations = content.get("translations") or {}
            trans = translations.get(effective_lang) or {}
            
            # Save the pre-translated text to use for lazy generation
            if effective_lang == "en":
                translated_text_from_db = content.get("narrative")
            else:
                translated_text_from_db = trans.get("narrative")

            if pre_url:
                voice_map = content.get("audio_voice_by_lang") or {}
                stored_v = str(voice_map.get(effective_lang) or "").strip().lower()
                want_v = str(request.voice_id or "").strip().lower() or "emma"
                # Legacy rows: no per-lang voice — keep instant playback.
                # Tracked rows: only reuse when voice matches Settings / request.
                if not stored_v or stored_v == want_v:
                    db_text = translated_text_from_db
                    logger.info(
                        "[TTS] cache_hit=tier_story_content story_id=%s lang=%s",
                        request.story_id.strip(),
                        effective_lang,
                    )
                    return TTSResponse(
                        audio_url=pre_url,
                        text=text_to_use or db_text or "",
                        translated_text=db_text if effective_lang != "en" else None,
                        voice_id=request.voice_id,
                        language=effective_lang,
                    )

    prepend_flag = getattr(request, "prepend_verification", False)
    want_voice = str(request.voice_id or "").strip().lower() or "emma"

    def _legacy_cache_key() -> str:
        return hashlib.md5(
            f"{text_to_use[:200]}:{request.voice_id}:{effective_lang}:{skip_tx}:{prepend_flag}".encode()
        ).hexdigest()

    def _v2_cache_key(sid: str, text_spoken: str) -> str:
        speak_hash = hashlib.sha256((text_spoken or "").strip().encode()).hexdigest()
        raw = f"{sid}|{effective_lang}|{want_voice}|{skip_tx}|{prepend_flag}|{speak_hash}"
        return hashlib.sha256(raw.encode()).hexdigest()

    try:
        from services.translation_service import translate_text, SUPPORTED_LANGUAGES

        # Resolve exact text sent to TTS (needed for v2 cache key and generation)
        if translated_text_from_db:
            text_to_speak = translated_text_from_db
            translated_text = translated_text_from_db if effective_lang != "en" else None
        else:
            text_to_speak = text_to_use
            translated_text = None
            if not skip_tx and effective_lang and effective_lang != "en" and effective_lang in SUPPORTED_LANGUAGES:
                translation_result = await translate_text(
                    text=text_to_use, target_language=effective_lang, source_language="en", style="broadcast"
                )
                if translation_result.get("success"):
                    text_to_speak = translation_result.get("translated", text_to_use)
                    translated_text = text_to_speak

        sid = (request.story_id or "").strip()
        cache_key_legacy = _legacy_cache_key()

        if sid:
            cache_key_v2 = _v2_cache_key(sid, text_to_speak)
            rv2 = (
                db.table("tts_cache")
                .select("cache_key, audio_url, translated_text, voice_id")
                .eq("cache_key", cache_key_v2)
                .limit(1)
                .execute()
            )
            hit_v2 = (rv2.data or [None])[0]
            if hit_v2 and hit_v2.get("audio_url"):
                logger.info("[TTS] cache_hit=tier_tts_cache_v2 story_id=%s lang=%s", sid, effective_lang)
                return TTSResponse(
                    audio_url=hit_v2["audio_url"],
                    text=text_to_use,
                    translated_text=hit_v2.get("translated_text"),
                    voice_id=hit_v2.get("voice_id", request.voice_id),
                    language=effective_lang,
                )

        r = (
            db.table("tts_cache")
            .select("cache_key, audio_url, translated_text, voice_id")
            .eq("cache_key", cache_key_legacy)
            .limit(1)
            .execute()
        )
        cached = (r.data or [None])[0]
        if cached and cached.get("audio_url"):
            logger.info("[TTS] cache_hit=tier_tts_cache_legacy lang=%s", effective_lang)
            return TTSResponse(
                audio_url=cached["audio_url"],
                text=text_to_use,
                translated_text=cached.get("translated_text"),
                voice_id=cached.get("voice_id", request.voice_id),
                language=effective_lang,
            )

        logger.info("[TTS] cache_hit=miss lang=%s story_id=%s", effective_lang, sid or "-")

        audio_url = await yarn_generate_tts(
            text=text_to_speak, voice_id=request.voice_id, language=effective_lang
        )
        if not audio_url:
            raise Exception("Both YarnGPT and OpenAI TTS failed")

        if sid:
            import asyncio

            asyncio.create_task(_update_story_audio_bg(sid, effective_lang, audio_url, request.voice_id))

        now_iso = datetime.now(timezone.utc).isoformat()
        cache_key_v2 = _v2_cache_key(sid, text_to_speak) if sid else None

        base_row = {
            "audio_url": audio_url,
            "translated_text": translated_text,
            "voice_id": request.voice_id,
            "created_at": now_iso,
        }
        if sid and cache_key_v2:
            db.table("tts_cache").upsert(
                {
                    **base_row,
                    "cache_key": cache_key_v2,
                    "story_id": sid,
                    "lang": effective_lang,
                },
                on_conflict="cache_key",
            ).execute()
        db.table("tts_cache").upsert(
            {**base_row, "cache_key": cache_key_legacy, "story_id": None, "lang": None},
            on_conflict="cache_key",
        ).execute()

        return TTSResponse(
            audio_url=audio_url,
            text=text_to_use,
            translated_text=translated_text,
            voice_id=request.voice_id,
            language=effective_lang,
        )
    except Exception as e:
        logger.warning("TTS error: %s", e)
        raise HTTPException(status_code=500, detail=f"TTS generation failed: {str(e)}")


@router.get("/tts/voices", response_model=List[VoiceProfile], summary="List voice profiles (canonical)")
async def get_tts_voices():
    """Public voice list for settings, landing previews, and TTS selection (cached 10 min)."""
    from lib.redis_client import get_json, set_json
    cache_key = "narvo:memcache:voices:v3"
    cached = await get_json(cache_key)
    if not cached:
        cached = _cache.get("voices_v3", ttl=600)
    if cached:
        return JSONResponse(content=cached, headers={"Cache-Control": "public, max-age=600"})
    from services.yarngpt_service import get_all_voice_profiles

    result = get_all_voice_profiles()
    result_list = [dict(v) for v in result]
    await set_json(cache_key, result_list, ttl_seconds=600)
    _cache.set("voices_v3", result_list)
    return result


@router.post("/paraphrase", response_model=ParaphraseResponse, summary="Paraphrase text to broadcast narrative")
async def paraphrase_content(request: ParaphraseRequest):
    """Generate broadcast narrative from text using Gemini."""
    from services.narrative_service import generate_narrative
    narrative_data = await generate_narrative(request.text, source_name=request.source_name)
    raw_narrative = narrative_data.get("narrative", request.text)
    raw_takeaways = narrative_data.get("key_takeaways", [])
    return ParaphraseResponse(
        original=request.text,
        narrative=sanitize_ai_text(raw_narrative),
        key_takeaways=[sanitize_ai_text(kt) for kt in raw_takeaways if sanitize_ai_text(kt)],
    )


@router.post("/narrative/duel", summary="Narrative Duel: compare two narratives")
async def narrative_duel_endpoint(request: NarrativeDuelRequest):
    """Compare two narratives via Gemini; returns discrepancies and summary."""
    from services.narrative_service import narrative_duel
    return await narrative_duel(request.narrative_a, request.narrative_b)
