# Story content: persist narrative, pre-translations (yo, ha, ig, pcm), and pre-generated audio for instant playback.
import asyncio
import logging
from typing import Any, Dict, List, Optional, Tuple

from lib.supabase_db import get_supabase_db

logger = logging.getLogger(__name__)

# Languages we pre-translate and pre-generate audio for.
# English is included so audio_by_lang["en"] is available for instant playback
# without a runtime TTS call, regardless of the user's language setting.
PRELOAD_LANGUAGES = ["en", "yo", "ha", "ig", "pcm"]

# Max chars sent to TTS per language (YarnGPT limit 2000; we use same for consistency).
TTS_TEXT_MAX = 2000

# Max stories processed concurrently in batch pipeline (controls API/LLM rate pressure).
BATCH_STORY_CONCURRENCY = 4


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


def get_existing_story_ids(story_ids: List[str]) -> set:
    """Return the subset of story_ids that already have a story_content row."""
    if not story_ids:
        return set()
    try:
        db = get_supabase_db()
        r = (
            db.table("story_content")
            .select("story_id")
            .in_("story_id", story_ids)
            .execute()
        )
        return {row["story_id"] for row in (r.data or [])}
    except Exception as e:
        logger.warning("[StoryContent] get_existing_ids failed: %s", e)
        return set()


def save_story_content(
    story_id: str,
    title: str,
    short_summary: str,
    narrative: str,
    key_takeaways: List[str],
    sources_used: Optional[List[str]] = None,
    trust_score: Optional[int] = None,
    truth_tags: Optional[List[str]] = None,
    truth_explanation: Optional[str] = None,
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
            "sources_used": sources_used if isinstance(sources_used, list) else [],
            "trust_score": trust_score,
            "truth_tags": truth_tags if isinstance(truth_tags, list) else [],
            "truth_explanation": truth_explanation,
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
    translations: Dict[str, Dict[str, Any]],
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
    narrative: str,
    short_summary: str,
    key_takeaways: List[str],
    generate_audio: bool = False,
) -> Tuple[str, Dict[str, Any], str]:
    """
    Translate narrative, short_summary, and key_takeaways into one language,
    then optionally generate TTS audio from the translated narrative.
    Returns (lang, translation_dict, audio_url).
    All three text fields are translated independently for accuracy.
    """
    from services.translation_service import translate_text, SUPPORTED_LANGUAGES
    from services.yarngpt_service import generate_tts

    if lang not in SUPPORTED_LANGUAGES:
        return (lang, {}, "")

    # --- Translate narrative (used for TTS and article body display) ---
    # Send the FULL narrative to Gemini — no truncation. The TTS service now handles
    # long text via sentence-boundary chunking, so we no longer need to pre-truncate.
    narrative_text = (narrative or "").strip()
    if not narrative_text:
        return (lang, {}, "")

    narrative_res = await translate_text(
        text=narrative_text,
        target_language=lang,
        source_language="en",
        style="broadcast",
    )
    if not narrative_res.get("success") or not narrative_res.get("translated"):
        logger.warning("[StoryContent] narrative translate %s failed for %s", lang, story_id)
        return (lang, {}, "")
    translated_narrative = narrative_res["translated"].strip()

    # --- Translate short_summary (used for article lead / card display) ---
    short_text = (short_summary or "").strip()
    translated_short = translated_narrative[:300]  # safe fallback
    if short_text:
        short_res = await translate_text(
            text=short_text,
            target_language=lang,
            source_language="en",
            style="broadcast",
        )
        if short_res.get("success") and short_res.get("translated"):
            translated_short = short_res["translated"].strip()

    # --- Translate key_takeaways (bullet points; join → translate → re-split) ---
    translated_takeaways: List[str] = []
    valid_takeaways = [kt for kt in (key_takeaways or []) if kt and kt.strip()]
    if valid_takeaways:
        joined = "\n".join(f"- {kt.strip()}" for kt in valid_takeaways)
        kt_res = await translate_text(
            text=joined,
            target_language=lang,
            source_language="en",
            style="broadcast",
        )
        if kt_res.get("success") and kt_res.get("translated"):
            raw_lines = kt_res["translated"].splitlines()
            for line in raw_lines:
                clean = line.lstrip("-•* ").strip()
                if clean:
                    translated_takeaways.append(clean)
    if not translated_takeaways:
        translated_takeaways = []

    # --- Generate TTS audio from full translated narrative ONLY IF ENABLED ---
    audio_url = ""
    if generate_audio:
        voice_id = SUPPORTED_LANGUAGES[lang].get("voice_id", "nova")
        audio_url = await generate_tts(
            text=translated_narrative,  # full text — chunked internally by generate_tts
            voice_id=voice_id,
            language=lang,
        )
        if not audio_url:
            logger.warning("[StoryContent] TTS %s failed for %s", lang, story_id)

    trans_dict: Dict[str, Any] = {
        "short_summary": translated_short,
        "narrative": translated_narrative,
        "key_takeaways": translated_takeaways,
    }
    return (lang, trans_dict, audio_url or "")


async def prefill_translations_and_audio(
    story_id: str,
    narrative: str,
    short_summary: str,
    key_takeaways: Optional[List[str]] = None,
    category: Optional[str] = None,
) -> None:
    """
    Pre-translate narrative, short_summary, and key_takeaways into Yoruba, Hausa, Igbo,
    and Pidgin concurrently. Optionally pre-generate TTS audio if generate_audio is True.
    Updates story_content.translations and story_content.audio_by_lang.
    Runs in background; failures per language are logged but never raise.
    """
    if not narrative or not story_id:
        return

    kts = key_takeaways or []

    # Evaluate priority audio pre-generation rules
    # 1. ALWAYS pre-generate English
    # 2. Pre-generate Local languages ONLY if category is Breaking or Urgent.
    is_urgent = (category or "").lower() in ["breaking", "urgent"]

    # Run all four languages concurrently — eliminates sequential bottleneck.
    tasks = []
    for lang in PRELOAD_LANGUAGES:
        should_gen_audio = True if lang == "en" else is_urgent
        tasks.append(
            _preload_one_language(story_id, lang, narrative, short_summary, kts, generate_audio=should_gen_audio)
        )
        
    results = await asyncio.gather(*tasks, return_exceptions=True)

    translations: Dict[str, Dict[str, Any]] = {}
    audio_by_lang: Dict[str, str] = {}

    for res in results:
        if isinstance(res, Exception):
            logger.warning("[StoryContent] prefill task error for %s: %s", story_id, res)
            continue
        lang, trans_dict, audio_url = res
        if trans_dict:
            translations[lang] = trans_dict
        if audio_url:
            audio_by_lang[lang] = audio_url

    if translations or audio_by_lang:
        update_story_translations_and_audio(story_id, translations, audio_by_lang)
        logger.info(
            "[StoryContent] Preloaded %s: %d translations, %d audio",
            story_id, len(translations), len(audio_by_lang),
        )


def schedule_prefill_translations_and_audio(
    story_id: str,
    narrative: str,
    short_summary: str,
    key_takeaways: Optional[List[str]] = None,
    category: Optional[str] = None,
) -> None:
    """Schedule prefill in background so the request can return immediately."""
    asyncio.create_task(
        prefill_translations_and_audio(story_id, narrative, short_summary, key_takeaways, category)
    )


async def _generate_and_prefill_story(item: Dict[str, Any]) -> Optional[str]:
    """
    For a single news item (from feed), generate English narrative via scrape → AI,
    persist it, then immediately prefill all four language translations + audio.
    Returns story_id on success, None on failure.
    Designed to run concurrently inside batch_prefill_new_stories.
    """
    story_id = item.get("id") or ""
    if not story_id:
        return None

    try:
        from services.article_scraper_service import get_text_for_narrative
        from services.narrative_service import generate_narrative, synthesize_composite_story
        from services.factcheck_service import generate_truth_tags
        from lib.text_utils import sanitize_ai_text

        # Generate English narrative (scrape-first, then AI)
        cluster_articles = item.get("cluster_articles") or []
        if len(cluster_articles) > 1:
            narrative_data = await synthesize_composite_story(cluster_articles)
        else:
            text_for_narrative = await get_text_for_narrative(
                item.get("title", ""),
                item.get("summary", ""),
                item.get("source_url"),
                prefer_scrape=True,
            )
            narrative_data = await generate_narrative(text_for_narrative, source_name=item.get("source", "Unknown"))

        raw_short = sanitize_ai_text(narrative_data.get("short_summary", ""))
        raw_narrative = sanitize_ai_text(narrative_data.get("narrative", item.get("summary", "")))
        raw_takeaways = [
            sanitize_ai_text(kt)
            for kt in narrative_data.get("key_takeaways", [])
            if sanitize_ai_text(kt)
        ]

        sources_used = narrative_data.get("sources_used", [])
        
        # Generate trust scores and Truth tags
        truth_data = await generate_truth_tags(raw_narrative, sources_used)

        # Persist English story_content row
        save_story_content(
            story_id,
            title=item.get("title") or "",
            short_summary=raw_short,
            narrative=raw_narrative,
            key_takeaways=raw_takeaways,
            sources_used=sources_used,
            trust_score=truth_data.get("trust_score"),
            truth_tags=truth_data.get("tags"),
            truth_explanation=truth_data.get("explanation"),
        )

        # Extract category from news item
        story_category = item.get("category", "")

        # Pre-translate for yo, ha, ig, pcm concurrently. 
        # Audio is lazily loaded EXCEPT for English, which is always eager, 
        # AND local languages ONLY if the category is Breaking/Urgent.
        await prefill_translations_and_audio(
            story_id,
            narrative=raw_narrative,
            short_summary=raw_short,
            key_takeaways=raw_takeaways,
            category=story_category,
        )

        logger.info("[StoryContent] Batch: fully preloaded story %s", story_id)
        return story_id

    except Exception as e:
        logger.warning("[StoryContent] Batch: failed for %s: %s", story_id, e)
        return None


async def batch_prefill_new_stories(max_stories: int = 50) -> Dict[str, Any]:
    """
    Fetch all news items from the live feed, identify those without an existing
    story_content row, generate narratives and pre-translate + pre-generate audio
    for each — concurrently, bounded by BATCH_STORY_CONCURRENCY.

    Intended to be called by QStash/cron (e.g. POST /api/news/refresh) after each
    RSS/aggregator cache refresh so audio is ready before any user opens a story.

    Returns a summary dict: { processed, succeeded, skipped, failed }.
    """
    from services.news_service import get_cached_all_news

    all_news = await get_cached_all_news()
    if not all_news:
        return {"processed": 0, "succeeded": 0, "skipped": 0, "failed": 0}

    all_news = all_news[:max_stories]
    all_ids = [item["id"] for item in all_news if item.get("id")]
    existing_ids = get_existing_story_ids(all_ids)

    new_items = [item for item in all_news if item.get("id") and item["id"] not in existing_ids]
    skipped = len(all_ids) - len(new_items)

    logger.info(
        "[StoryContent] Batch prefill: %d total, %d already stored, %d to process",
        len(all_ids), skipped, len(new_items),
    )

    if not new_items:
        return {"processed": 0, "succeeded": 0, "skipped": skipped, "failed": 0}

    semaphore = asyncio.Semaphore(BATCH_STORY_CONCURRENCY)

    async def _bounded(item: Dict[str, Any]) -> Optional[str]:
        async with semaphore:
            return await _generate_and_prefill_story(item)

    results = await asyncio.gather(*[_bounded(item) for item in new_items], return_exceptions=True)

    succeeded = sum(1 for r in results if isinstance(r, str))
    failed = len(new_items) - succeeded

    logger.info(
        "[StoryContent] Batch prefill done: %d succeeded, %d failed, %d skipped",
        succeeded, failed, skipped,
    )
    return {
        "processed": len(new_items),
        "succeeded": succeeded,
        "skipped": skipped,
        "failed": failed,
    }
