# Story content: persist narrative, pre-translations (yo, ha, ig, pcm), and pre-generated audio for instant playback.
import asyncio
import logging
from typing import Any, Dict, List, Optional

from lib.supabase_db import get_supabase_db

logger = logging.getLogger(__name__)

# Languages we pre-translate and pre-generate audio for (Narvo's key markets).
PRELOAD_LANGUAGES = ["yo", "ha", "ig", "pcm"]

# Max chars sent to TTS per language (YarnGPT limit 2000; we use same for consistency).
TTS_TEXT_MAX = 2000


def get_story_content(story_id: str) -> Optional[Dict[str, Any]]:
    """Load story_content row by story_id. Returns None if not found."""
    try:
        db = get_supabase_db()
        r = (
            db.table("story_content")
            .select("*")
            .eq("story_id", story_id)
            .limit(1)
            .execute()
        )
        row = (r.data or [None])[0]
        return row
    except Exception as e:
        logger.warning("[StoryContent] get failed for %s: %s", story_id, e)
        return None


def save_story_content(
    story_id: str,
    title: str,
    short_summary: str,
    narrative: str,
    key_takeaways: List[str],
) -> bool:
    """Persist English narrative (and optional title/short_summary). Returns True on success."""
    try:
        from datetime import datetime, timezone

        db = get_supabase_db()
        now = datetime.now(timezone.utc).isoformat()
        payload = {
            "story_id": story_id,
            "title": title or "",
            "short_summary": short_summary or "",
            "narrative": narrative or "",
            "key_takeaways": key_takeaways if isinstance(key_takeaways, list) else [],
            "translations": {},
            "audio_by_lang": {},
            "updated_at": now,
        }
        db.table("story_content").upsert(payload, on_conflict="story_id").execute()
        return True
    except Exception as e:
        logger.warning("[StoryContent] save failed for %s: %s", story_id, e)
        return False


def update_story_translations_and_audio(
    story_id: str,
    translations: Dict[str, Dict[str, str]],
    audio_by_lang: Dict[str, str],
) -> bool:
    """Update story_content with pre-translated text and audio URLs per language."""
    try:
        from datetime import datetime, timezone

        db = get_supabase_db()
        now = datetime.now(timezone.utc).isoformat()
        db.table("story_content").update({
            "translations": translations,
            "audio_by_lang": audio_by_lang,
            "updated_at": now,
        }).eq("story_id", story_id).execute()
        return True
    except Exception as e:
        logger.warning("[StoryContent] update translations/audio failed for %s: %s", story_id, e)
        return False


async def _preload_one_language(
    story_id: str,
    lang: str,
    narrative_snippet: str,
) -> tuple:
    """Translate narrative snippet and generate TTS for one language. Returns (lang, translation_dict, audio_url)."""
    from services.translation_service import translate_text, SUPPORTED_LANGUAGES
    from services.yarngpt_service import generate_tts

    if lang not in SUPPORTED_LANGUAGES:
        return (lang, {}, "")

    # Translate narrative (first TTS_TEXT_MAX chars for TTS; full for display would be heavier)
    text_to_translate = narrative_snippet[:TTS_TEXT_MAX]
    res = await translate_text(
        text=text_to_translate,
        target_language=lang,
        source_language="en",
        style="broadcast",
    )
    if not res.get("success"):
        logger.warning("[StoryContent] translate %s failed for %s", lang, story_id)
        return (lang, {}, "")

    translated = (res.get("translated") or "").strip()
    if not translated:
        return (lang, {}, "")

    # Generate TTS for this language (use language's default voice)
    voice_id = SUPPORTED_LANGUAGES[lang].get("voice_id", "nova")
    audio_url = await generate_tts(
        text=translated[:TTS_TEXT_MAX],
        voice_id=voice_id,
        language=lang,
    )
    if not audio_url:
        logger.warning("[StoryContent] TTS %s failed for %s", lang, story_id)

    trans_dict = {
        "short_summary": translated[:400] if len(translated) > 400 else translated,
        "narrative": translated,
        "key_takeaways": [],
    }
    return (lang, trans_dict, audio_url or "")


async def prefill_translations_and_audio(story_id: str, narrative: str, short_summary: str) -> None:
    """
    For a story, pre-translate narrative into Yoruba, Hausa, Igbo, Pidgin and pre-generate
    TTS audio for each. Updates story_content.translations and story_content.audio_by_lang.
    Runs in background; failures are logged but do not raise.
    """
    if not narrative or not story_id:
        return

    narrative_snippet = narrative[:TTS_TEXT_MAX]
    translations: Dict[str, Dict[str, str]] = {}
    audio_by_lang: Dict[str, str] = {}

    for lang in PRELOAD_LANGUAGES:
        try:
            _, trans_dict, audio_url = await _preload_one_language(
                story_id, lang, narrative_snippet
            )
            if trans_dict:
                translations[lang] = trans_dict
            if audio_url:
                audio_by_lang[lang] = audio_url
        except Exception as e:
            logger.warning("[StoryContent] preload %s for %s: %s", lang, story_id, e)

    if translations or audio_by_lang:
        update_story_translations_and_audio(story_id, translations, audio_by_lang)
        logger.info("[StoryContent] Preloaded %s: %d translations, %d audio", story_id, len(translations), len(audio_by_lang))


def schedule_prefill_translations_and_audio(story_id: str, narrative: str, short_summary: str) -> None:
    """Schedule prefill in background so the request can return immediately."""
    asyncio.create_task(prefill_translations_and_audio(story_id, narrative, short_summary))
