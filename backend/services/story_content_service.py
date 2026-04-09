# Story content: persist narrative, pre-translations (yo, ha, ig, pcm), and pre-generated audio for instant playback.
import asyncio
import logging
import os
from typing import Any, Dict, List, Optional, Tuple

from lib.supabase_db import get_supabase_db
from services.ssml_decorator import audio_voice_matches_request, build_audio_voice_marker

logger = logging.getLogger(__name__)

# Languages we pre-translate and pre-generate audio for.
# English is included so audio_by_lang["en"] is available for instant playback
# without a runtime TTS call, regardless of the user's language setting.
PRELOAD_LANGUAGES = ["en", "yo", "ha", "ig", "pcm"]

# Prefill audio must use the same default Narvo broadcast narrators the frontend requests.
PREFILL_AUDIO_VOICE_BY_LANG = {
    "en": "emma",
    "pcm": "wura",
    "yo": "idera",
    "ha": "zainab",
    "ig": "osagie",
}

# Max chars sent to TTS per language (YarnGPT limit 2000; we use same for consistency).
TTS_TEXT_MAX = 2000

# Max stories processed concurrently in batch pipeline (controls API/LLM rate pressure).
BATCH_STORY_CONCURRENCY = 4

# First N new stories in each batch get TTS for all PRELOAD_LANGUAGES (not only breaking/urgent).
# Set 0 to disable (English + breaking-only local audio, previous behavior).
try:
    PREFILL_ALL_LANG_AUDIO_MAX_STORIES = int(os.environ.get("PREFILL_ALL_LANG_AUDIO_MAX_STORIES", "20").strip() or "20")
except ValueError:
    PREFILL_ALL_LANG_AUDIO_MAX_STORIES = 20

_scheduled_prefill_task: Optional[asyncio.Task] = None
_scheduled_prefill_items: Dict[str, Dict[str, Any]] = {}


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


def get_story_content_map(
    story_ids: List[str],
    select_fields: str = "story_id,title,short_summary,translations,trust_score,truth_tags,truth_explanation",
) -> Dict[str, Dict[str, Any]]:
    """Bulk-load story_content rows keyed by story_id for feed/list localization."""
    ids = [str(story_id).strip() for story_id in story_ids if str(story_id).strip()]
    if not ids:
        return {}
    try:
        db = get_supabase_db()
        r = (
            db.table("story_content")
            .select(select_fields)
            .in_("story_id", ids)
            .execute()
        )
        out: Dict[str, Dict[str, Any]] = {}
        for row in r.data or []:
            story_id = str(row.get("story_id") or "").strip()
            if story_id:
                out[story_id] = row
        return out
    except Exception as e:
        logger.warning("[StoryContent] get_story_content_map failed: %s", e)
        return {}


def _load_story_prefill_maps(story_id: str) -> Tuple[Dict[str, Dict[str, Any]], Dict[str, str], Dict[str, str]]:
    existing = get_story_content(story_id) or {}
    translations = existing.get("translations")
    audio_by_lang = existing.get("audio_by_lang")
    audio_voice_by_lang = existing.get("audio_voice_by_lang")
    return (
        dict(translations) if isinstance(translations, dict) else {},
        dict(audio_by_lang) if isinstance(audio_by_lang, dict) else {},
        dict(audio_voice_by_lang) if isinstance(audio_voice_by_lang, dict) else {},
    )


def _translation_payload_complete(payload: Any) -> bool:
    if not isinstance(payload, dict):
        return False
    if not str(payload.get("title") or "").strip():
        return False
    if not str(payload.get("short_summary") or "").strip():
        return False
    if not str(payload.get("narrative") or "").strip():
        return False
    if "key_takeaways" in payload and not isinstance(payload.get("key_takeaways"), list):
        return False
    return True


def _preferred_audio_voice_for_lang(lang: str) -> str:
    key = (lang or "").strip().lower()
    return PREFILL_AUDIO_VOICE_BY_LANG.get(key, "")


def _stored_audio_is_inline(row: Optional[Dict[str, Any]], lang: str) -> bool:
    if not isinstance(row, dict):
        return False
    audio_by_lang = row.get("audio_by_lang")
    if not isinstance(audio_by_lang, dict):
        return False
    audio_url = str(audio_by_lang.get(lang) or "").strip()
    return audio_url.startswith("data:")


def _tracked_audio_voice_mismatch(row: Optional[Dict[str, Any]], lang: str) -> bool:
    if not isinstance(row, dict):
        return False
    audio_by_lang = row.get("audio_by_lang")
    if not isinstance(audio_by_lang, dict):
        return False
    audio_url = str(audio_by_lang.get(lang) or "").strip()
    if not audio_url:
        return False
    audio_voice_by_lang = row.get("audio_voice_by_lang")
    if not isinstance(audio_voice_by_lang, dict):
        return True
    stored_voice = str(audio_voice_by_lang.get(lang) or "").strip().lower()
    expected_voice = _preferred_audio_voice_for_lang(lang)
    if not expected_voice:
        return False
    if not stored_voice:
        return True
    return not audio_voice_matches_request(
        stored_voice,
        expected_voice,
        require_current_version=True,
    )


def _story_content_needs_prefill(row: Optional[Dict[str, Any]]) -> bool:
    if not row:
        return True
    if not str(row.get("title") or "").strip():
        return True
    if not str(row.get("short_summary") or "").strip():
        return True
    if not str(row.get("narrative") or "").strip():
        return True
    translations = row.get("translations")
    if not isinstance(translations, dict):
        return True
    for lang in PRELOAD_LANGUAGES:
        if not _translation_payload_complete(translations.get(lang)):
            return True
    audio_by_lang = row.get("audio_by_lang")
    if not isinstance(audio_by_lang, dict) or not str(audio_by_lang.get("en") or "").strip():
        return True
    if _stored_audio_is_inline(row, "en"):
        return True
    if _tracked_audio_voice_mismatch(row, "en"):
        return True
    for lang in PRELOAD_LANGUAGES:
        if lang == "en":
            continue
        if _stored_audio_is_inline(row, lang):
            return True
        if _tracked_audio_voice_mismatch(row, lang):
            return True
    return False


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
        existing_translations, existing_audio_by_lang, existing_audio_voice_by_lang = _load_story_prefill_maps(story_id)
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
            "translations": existing_translations,
            "audio_by_lang": existing_audio_by_lang,
            "audio_voice_by_lang": existing_audio_voice_by_lang,
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
    audio_voice_by_lang: Dict[str, str],
) -> bool:
    """Update story_content with pre-translated text and audio URLs per language."""
    try:
        from datetime import datetime, timezone

        db = get_supabase_db()
        now = datetime.now(timezone.utc).isoformat()
        merged_translations, merged_audio_by_lang, merged_audio_voice_by_lang = _load_story_prefill_maps(story_id)

        for lang, trans_dict in (translations or {}).items():
            if not isinstance(lang, str) or not isinstance(trans_dict, dict):
                continue
            current = merged_translations.get(lang)
            merged_translations[lang] = {
                **(current if isinstance(current, dict) else {}),
                **trans_dict,
            }

        for lang, audio_url in (audio_by_lang or {}).items():
            if isinstance(lang, str) and isinstance(audio_url, str) and audio_url.strip():
                merged_audio_by_lang[lang] = audio_url

        for lang, voice_id in (audio_voice_by_lang or {}).items():
            if isinstance(lang, str) and isinstance(voice_id, str) and voice_id.strip():
                merged_audio_voice_by_lang[lang] = build_audio_voice_marker(voice_id)

        payload: Dict[str, Any] = {
            "translations": merged_translations,
            "audio_by_lang": merged_audio_by_lang,
            "audio_voice_by_lang": merged_audio_voice_by_lang,
            "updated_at": now,
        }
        db.table("story_content").update(payload).eq("story_id", story_id).execute()
        return True
    except Exception as e:
        logger.warning("[StoryContent] update translations/audio failed for %s: %s", story_id, e)
        return False


async def translate_story_fields(
    story_id: str,
    lang: str,
    title: str,
    narrative: str,
    short_summary: str,
    key_takeaways: Optional[List[str]] = None,
) -> Dict[str, Any]:
    """Translate story display fields for one language and return DB-ready JSON payload."""
    from services.translation_service import SUPPORTED_LANGUAGES, translate_text

    if lang not in SUPPORTED_LANGUAGES:
        return {}

    narrative_text = (narrative or "").strip()
    if not narrative_text:
        return {}

    if lang == "en":
        return {
            "title": (title or "").strip(),
            "short_summary": (short_summary or "").strip(),
            "narrative": narrative_text,
            "key_takeaways": [kt.strip() for kt in (key_takeaways or []) if isinstance(kt, str) and kt.strip()],
        }

    translated_title = (title or "").strip()
    if translated_title:
        title_res = await translate_text(
            text=translated_title,
            target_language=lang,
            source_language="en",
            style="broadcast",
        )
        if title_res.get("success") and title_res.get("translated"):
            translated_title = str(title_res["translated"]).strip()

    narrative_res = await translate_text(
        text=narrative_text,
        target_language=lang,
        source_language="en",
        style="broadcast",
    )
    if not narrative_res.get("success") or not narrative_res.get("translated"):
        logger.warning("[StoryContent] narrative translate %s failed for %s", lang, story_id)
        return {}
    translated_narrative = str(narrative_res["translated"]).strip()

    short_text = (short_summary or "").strip()
    translated_short = translated_narrative[:300]
    if short_text:
        short_res = await translate_text(
            text=short_text,
            target_language=lang,
            source_language="en",
            style="broadcast",
        )
        if short_res.get("success") and short_res.get("translated"):
            translated_short = str(short_res["translated"]).strip()

    translated_takeaways: List[str] = []
    valid_takeaways = [
        kt.strip() for kt in (key_takeaways or []) if isinstance(kt, str) and kt.strip()
    ]
    if valid_takeaways:
        joined = "\n".join(f"- {kt}" for kt in valid_takeaways)
        kt_res = await translate_text(
            text=joined,
            target_language=lang,
            source_language="en",
            style="broadcast",
        )
        if kt_res.get("success") and kt_res.get("translated"):
            for line in str(kt_res["translated"]).splitlines():
                clean = line.lstrip("-•* ").strip()
                if clean:
                    translated_takeaways.append(clean)

    return {
        "title": translated_title,
        "short_summary": translated_short,
        "narrative": translated_narrative,
        "key_takeaways": translated_takeaways,
    }


async def _preload_one_language(
    story_id: str,
    lang: str,
    title: str,
    narrative: str,
    short_summary: str,
    key_takeaways: List[str],
    generate_audio: bool = False,
) -> Tuple[str, Dict[str, Any], str, str]:
    """
    Translate narrative, short_summary, and key_takeaways into one language,
    then optionally generate TTS audio from the translated narrative.
    Returns (lang, translation_dict, audio_url, voice_id_used).
    All three text fields are translated independently for accuracy.
    """
    from services.translation_service import SUPPORTED_LANGUAGES
    from services.yarngpt_service import generate_tts

    if lang not in SUPPORTED_LANGUAGES:
        return (lang, {}, "", "")
    trans_dict = await translate_story_fields(
        story_id,
        lang,
        title,
        narrative,
        short_summary,
        key_takeaways,
    )
    if not trans_dict:
        return (lang, {}, "", "")
    translated_narrative = str(trans_dict.get("narrative") or "").strip()

    # --- Generate TTS audio from full translated narrative ONLY IF ENABLED ---
    audio_url = ""
    voice_used = ""
    if generate_audio:
        voice_id = _preferred_audio_voice_for_lang(lang) or SUPPORTED_LANGUAGES[lang].get("voice_id", "nova")
        voice_used = str(voice_id).strip() or "nova"
        audio_url = await generate_tts(
            text=translated_narrative,  # full text — chunked internally by generate_tts
            voice_id=voice_id,
            language=lang,
        )
        if not audio_url:
            logger.warning("[StoryContent] TTS %s failed for %s", lang, story_id)
            voice_used = ""
        else:
            voice_used = build_audio_voice_marker(voice_used)

    return (lang, trans_dict, audio_url or "", voice_used)


async def prefill_translations_and_audio(
    story_id: str,
    title: str,
    narrative: str,
    short_summary: str,
    key_takeaways: Optional[List[str]] = None,
    category: Optional[str] = None,
    force_all_local_audio: bool = False,
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
    # 2. Pre-generate local languages if Breaking/Urgent OR force_all_local_audio (capped batch slot).
    is_urgent = (category or "").lower() in ["breaking", "urgent"]

    # Run all four languages concurrently — eliminates sequential bottleneck.
    tasks = []
    for lang in PRELOAD_LANGUAGES:
        should_gen_audio = True if lang == "en" else (is_urgent or force_all_local_audio)
        tasks.append(
            _preload_one_language(
                story_id,
                lang,
                title,
                narrative,
                short_summary,
                kts,
                generate_audio=should_gen_audio,
            )
        )
        
    results = await asyncio.gather(*tasks, return_exceptions=True)

    translations: Dict[str, Dict[str, Any]] = {}
    audio_by_lang: Dict[str, str] = {}
    audio_voice_by_lang: Dict[str, str] = {}

    for res in results:
        if isinstance(res, Exception):
            logger.warning("[StoryContent] prefill task error for %s: %s", story_id, res)
            continue
        lang, trans_dict, audio_url, voice_used = res
        if trans_dict:
            translations[lang] = trans_dict
        if audio_url:
            audio_by_lang[lang] = audio_url
            if voice_used:
                audio_voice_by_lang[lang] = voice_used

    if translations or audio_by_lang:
        update_story_translations_and_audio(story_id, translations, audio_by_lang, audio_voice_by_lang)
        logger.info(
            "[StoryContent] Preloaded %s: %d translations, %d audio",
            story_id, len(translations), len(audio_by_lang),
        )


def schedule_prefill_translations_and_audio(
    story_id: str,
    title: str,
    narrative: str,
    short_summary: str,
    key_takeaways: Optional[List[str]] = None,
    category: Optional[str] = None,
    force_all_local_audio: bool = False,
) -> None:
    """Schedule prefill in background so the request can return immediately."""
    asyncio.create_task(
        prefill_translations_and_audio(
            story_id, title, narrative, short_summary, key_takeaways, category, force_all_local_audio
        )
    )


async def _generate_and_prefill_story(
    item: Dict[str, Any],
    force_all_local_audio: bool = False,
) -> Optional[str]:
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
            title=item.get("title") or "",
            narrative=raw_narrative,
            short_summary=raw_short,
            key_takeaways=raw_takeaways,
            category=story_category,
            force_all_local_audio=force_all_local_audio,
        )

        logger.info("[StoryContent] Batch: fully preloaded story %s", story_id)
        return story_id

    except Exception as e:
        logger.warning("[StoryContent] Batch: failed for %s: %s", story_id, e)
        return None


async def _prefill_existing_story(
    item: Dict[str, Any],
    existing_row: Dict[str, Any],
    force_all_local_audio: bool = False,
) -> Optional[str]:
    """Backfill missing translations/audio on an existing story_content row without regenerating the English narrative."""
    story_id = str(existing_row.get("story_id") or item.get("id") or "").strip()
    if not story_id:
        return None

    title = str(existing_row.get("title") or item.get("title") or "").strip()
    short_summary = str(existing_row.get("short_summary") or "").strip()
    narrative = str(existing_row.get("narrative") or "").strip()
    key_takeaways = existing_row.get("key_takeaways")

    if not title or not short_summary or not narrative:
        return await _generate_and_prefill_story(item, force_all_local_audio=force_all_local_audio)

    try:
        force_local_audio = force_all_local_audio or any(
            (_tracked_audio_voice_mismatch(existing_row, lang) or _stored_audio_is_inline(existing_row, lang))
            for lang in PRELOAD_LANGUAGES
            if lang != "en"
        )
        await prefill_translations_and_audio(
            story_id=story_id,
            title=title,
            narrative=narrative,
            short_summary=short_summary,
            key_takeaways=key_takeaways if isinstance(key_takeaways, list) else [],
            category=item.get("category"),
            force_all_local_audio=force_local_audio,
        )
        logger.info("[StoryContent] Batch: backfilled existing story %s", story_id)
        return story_id
    except Exception as e:
        logger.warning("[StoryContent] Batch: existing-row backfill failed for %s: %s", story_id, e)
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
    from services.news_service import get_cached_merged_news_pool

    all_news = await get_cached_merged_news_pool()
    return await batch_prefill_story_items(all_news, max_stories=max_stories)


async def batch_prefill_story_items(
    items: List[Dict[str, Any]],
    max_stories: Optional[int] = None,
) -> Dict[str, Any]:
    """Prefill story_content rows for a concrete batch of fetched news items."""
    if not items:
        return {"processed": 0, "succeeded": 0, "skipped": 0, "failed": 0}

    deduped_items: List[Dict[str, Any]] = []
    seen_ids = set()
    for item in items:
        if not isinstance(item, dict):
            continue
        story_id = str(item.get("id") or "").strip()
        if not story_id or story_id in seen_ids:
            continue
        deduped_items.append(item)
        seen_ids.add(story_id)

    def _urgency_rank(it: Dict[str, Any]) -> int:
        c = (it.get("category") or "").lower()
        return 0 if c in ("breaking", "urgent") else 1

    deduped_items = sorted(deduped_items, key=_urgency_rank)
    if max_stories is not None:
        deduped_items = deduped_items[: max(0, max_stories)]

    all_ids = [str(item.get("id") or "").strip() for item in deduped_items if item.get("id")]
    existing_rows = get_story_content_map(
        all_ids,
        select_fields="story_id,title,short_summary,narrative,key_takeaways,translations,audio_by_lang,audio_voice_by_lang",
    )

    items_to_process: List[Tuple[Dict[str, Any], Optional[Dict[str, Any]]]] = []
    for item in deduped_items:
        story_id = str(item.get("id") or "").strip()
        existing_row = existing_rows.get(story_id)
        if _story_content_needs_prefill(existing_row):
            items_to_process.append((item, existing_row))

    skipped = len(all_ids) - len(items_to_process)

    logger.info(
        "[StoryContent] Batch prefill: %d total, %d already stored, %d to process",
        len(all_ids), skipped, len(items_to_process),
    )

    if not items_to_process:
        return {"processed": 0, "succeeded": 0, "skipped": skipped, "failed": 0}

    cap = max(0, PREFILL_ALL_LANG_AUDIO_MAX_STORIES)
    semaphore = asyncio.Semaphore(BATCH_STORY_CONCURRENCY)

    async def _bounded(idx: int, entry: Tuple[Dict[str, Any], Optional[Dict[str, Any]]]) -> Optional[str]:
        item, existing_row = entry
        async with semaphore:
            force_audio = cap > 0 and idx < cap
            if existing_row:
                return await _prefill_existing_story(
                    item,
                    existing_row,
                    force_all_local_audio=force_audio,
                )
            return await _generate_and_prefill_story(item, force_all_local_audio=force_audio)

    results = await asyncio.gather(
        *[_bounded(i, entry) for i, entry in enumerate(items_to_process)],
        return_exceptions=True,
    )

    succeeded = sum(1 for r in results if isinstance(r, str))
    failed = len(items_to_process) - succeeded

    logger.info(
        "[StoryContent] Batch prefill done: %d succeeded, %d failed, %d skipped",
        succeeded, failed, skipped,
    )
    return {
        "processed": len(items_to_process),
        "succeeded": succeeded,
        "skipped": skipped,
        "failed": failed,
    }


def schedule_batch_prefill_story_items(
    items: List[Dict[str, Any]],
    max_stories: Optional[int] = None,
) -> None:
    """Queue a background batch prefill for fetched feed items."""
    global _scheduled_prefill_task

    if not items:
        return

    count = 0
    limit = max(0, max_stories) if max_stories is not None else None
    for item in items:
        if limit is not None and count >= limit:
            break
        if not isinstance(item, dict):
            continue
        story_id = str(item.get("id") or "").strip()
        if not story_id:
            continue
        _scheduled_prefill_items[story_id] = item
        count += 1

    if count == 0:
        return

    if _scheduled_prefill_task and not _scheduled_prefill_task.done():
        return

    async def _runner() -> None:
        global _scheduled_prefill_task
        try:
            while _scheduled_prefill_items:
                batch = list(_scheduled_prefill_items.values())
                _scheduled_prefill_items.clear()
                result = await batch_prefill_story_items(batch)
                logger.info("[StoryContent] Scheduled batch prefill complete: %s", result)
        except Exception as e:
            logger.warning("[StoryContent] Scheduled batch prefill failed: %s", e)
        finally:
            _scheduled_prefill_task = None

    _scheduled_prefill_task = asyncio.create_task(_runner())


async def refresh_news_cache_and_prefill(max_stories: int = 500) -> Dict[str, Any]:
    """Refresh merged news caches and ensure new ingested stories are pretranslated before reuse."""
    from services.news_service import get_cached_merged_news_pool

    merged = await get_cached_merged_news_pool(
        force_refresh=True,
        prefill_max_stories=max_stories,
    )
    return {
        "stories_seen": len(merged or []),
        "prefill_target": max(0, max_stories),
    }
