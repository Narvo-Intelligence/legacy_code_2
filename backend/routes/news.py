# News API — single RSS source via services.news_service
import logging
from collections import Counter
from typing import Any, Dict, List, Optional
from fastapi import APIRouter, Query, HTTPException, Response
from fastapi.responses import JSONResponse

from services.news_service import (
    get_cached_all_news,
    get_breaking_news_list,
    deduplicate_by_title,
)
from services.narrative_service import generate_narrative, synthesize_composite_story
from services.article_scraper_service import get_text_for_narrative
from services.story_content_service import (
    get_story_content,
    get_story_content_map,
    save_story_content,
    schedule_batch_prefill_story_items,
    schedule_prefill_translations_and_audio,
    translate_story_fields,
    update_story_translations_and_audio,
)
from services.factcheck_service import generate_truth_tags
from services.ssml_decorator import audio_voice_matches_request
from lib.text_utils import sanitize_ai_text

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api", tags=["news"])


def _filter_audio_for_voice_id(
    audio_by_lang: dict,
    audio_voice_by_lang: dict,
    requested_voice: str,
) -> dict:
    """Omit cached URLs recorded for a different TTS voice (Settings-aligned playback)."""
    if not audio_by_lang:
        return {}
    want = (requested_voice or "").strip().lower()
    if not want:
        return dict(audio_by_lang)
    out = {}
    av = audio_voice_by_lang or {}
    for lang, url in audio_by_lang.items():
        if not isinstance(url, str) or not url.strip():
            continue
        sv = av.get(lang)
        if not (isinstance(sv, str) and sv.strip()):
            continue
        if not audio_voice_matches_request(sv, want, require_current_version=True):
            continue
        out[lang] = url
    return out


async def _get_full_news_pool() -> list:
    """RSS + Mediastack/NewsData re-clustered into cohesive multi-source stories.
    Used by detail and related so aggregator items can merge with RSS for synthesis."""
    try:
        from services.news_service import get_cached_merged_news_pool

        return await get_cached_merged_news_pool()
    except Exception:
        rss = await get_cached_all_news()
        return list(rss)


def _apply_localized_story_fields(
    item: Dict[str, Any],
    content: Dict[str, Any],
    language: str,
) -> Dict[str, Any]:
    """Overlay translated story_content fields onto a feed/list item."""
    out = dict(item)
    requested_language = (language or "").strip().lower()

    base_title = str(content.get("title") or "").strip()
    base_short = str(content.get("short_summary") or "").strip()
    if requested_language == "en":
        if base_title:
            out["title"] = base_title
        if base_short:
            out["short_summary"] = base_short
            out["summary"] = base_short

    translations = content.get("translations")
    translated = (
        translations.get(requested_language)
        if requested_language and isinstance(translations, dict)
        else None
    )
    if isinstance(translated, dict):
        title = str(translated.get("title") or "").strip()
        short_summary = str(translated.get("short_summary") or "").strip()
        if title:
            out["title"] = title
        if short_summary:
            out["short_summary"] = short_summary
            out["summary"] = short_summary

    trust_score = content.get("trust_score")
    if isinstance(trust_score, int):
        out["trust_score"] = trust_score
    truth_tags = content.get("truth_tags")
    if isinstance(truth_tags, list):
        out["truth_tags"] = truth_tags
    truth_explanation = content.get("truth_explanation")
    if isinstance(truth_explanation, str) and truth_explanation.strip():
        out["truth_explanation"] = truth_explanation

    return out


def _localize_news_list_items(
    items: List[Dict[str, Any]],
    language: str,
) -> List[Dict[str, Any]]:
    requested_language = (language or "").strip().lower()
    if not items or not requested_language:
        return items

    ids = [str(item.get("id") or "").strip() for item in items if item.get("id")]
    content_map = get_story_content_map(ids)
    if not content_map:
        return items

    localized: List[Dict[str, Any]] = []
    for item in items:
        story_id = str(item.get("id") or "").strip()
        content = content_map.get(story_id)
        localized.append(
            _apply_localized_story_fields(item, content, requested_language)
            if content
            else item
        )
    return localized


@router.get("/news")
async def get_news(
    response: Response,
    region: Optional[str] = Query(None, description="Filter by region"),
    category: Optional[str] = Query(None, description="Filter by category"),
    language: Optional[str] = Query(None, description="Preferred language for localized list fields"),
    limit: int = Query(20, le=50, description="Number of items to return"),
    skip: int = Query(0, ge=0, le=5000, description="Offset for pagination (same sort as first page)"),
    include_aggregators: bool = Query(False, description="Include aggregator news"),
    aggregator_sources: Optional[str] = Query(
        None, description="Comma-separated aggregator sources: mediastack,newsdata"
    ),
    refresh: bool = Query(
        False,
        description="Bypass RSS/aggregator caches and rebuild the feed from sources",
    ),
):
    """Fetch aggregated news from RSS (single source) and optional aggregator APIs."""
    if refresh:
        response.headers["Cache-Control"] = "private, no-store"
    else:
        response.headers["Cache-Control"] = "public, s-maxage=120, stale-while-revalidate=60"
    if include_aggregators:
        try:
            from services.news_service import get_cached_merged_news_pool

            sources_list = (
                [s.strip().lower() for s in aggregator_sources.split(",") if s.strip()]
                if aggregator_sources
                else None
            )
            all_news = await get_cached_merged_news_pool(
                aggregator_sources=sources_list,
                force_refresh=refresh,
            )
        except Exception as e:
            logger.error("[News] Aggregator merge error: %s", e)
            all_news = await get_cached_all_news(force_refresh=refresh)
    else:
        all_news = await get_cached_all_news(force_refresh=refresh)

    if region:
        all_news = [n for n in all_news if n.get("region", "").lower() == region.lower()]
    if category:
        all_news = [n for n in all_news if n.get("category", "").lower() == category.lower()]

    all_news.sort(key=lambda x: str(x.get("published") or ""), reverse=True)
    all_news = deduplicate_by_title(all_news)
    # Strip cluster_articles from list response (used only for detail synthesis)
    start = min(skip, len(all_news))
    end = min(start + limit, len(all_news))
    page_items = all_news[start:end]
    schedule_batch_prefill_story_items(page_items, max_stories=len(page_items))
    localized_page_items = _localize_news_list_items(
        list(page_items),
        (language or "").strip().lower(),
    )
    out = []
    for n in localized_page_items:
        item = {k: v for k, v in n.items() if k != "cluster_articles"}
        out.append(item)
    return out


@router.get("/news/dashboard-bundle")
async def get_dashboard_bundle(
    response: Response,
    limit: int = Query(24, le=50, description="News items (same shape as GET /api/news)"),
    skip: int = Query(0, ge=0, le=5000, description="Offset into sorted feed"),
    language: Optional[str] = Query(None, description="Preferred language for localized list fields"),
    include_aggregators: bool = Query(True, description="Include Mediastack/NewsData when configured"),
    aggregator_sources: Optional[str] = Query(
        None, description="Comma-separated aggregator sources: mediastack,newsdata"
    ),
    feed_sources_limit: int = Query(10, ge=1, le=30, description="Top N sources by count in recent window"),
    refresh: bool = Query(
        False,
        description="Bypass RSS/aggregator caches and rebuild the feed from sources",
    ),
):
    """Single round-trip for dashboard: news list + breaking + feed source activity (shared merge/sort)."""
    if refresh:
        response.headers["Cache-Control"] = "private, no-store"
    else:
        response.headers["Cache-Control"] = "public, s-maxage=120, stale-while-revalidate=60"
    if include_aggregators:
        try:
            from services.news_service import get_cached_merged_news_pool

            sources_list = (
                [s.strip().lower() for s in aggregator_sources.split(",") if s.strip()]
                if aggregator_sources
                else None
            )
            all_news = await get_cached_merged_news_pool(
                aggregator_sources=sources_list,
                force_refresh=refresh,
            )
        except Exception as e:
            logger.error("[News] Aggregator merge error: %s", e)
            all_news = await get_cached_all_news(force_refresh=refresh)
    else:
        all_news = await get_cached_all_news(force_refresh=refresh)

    all_news.sort(key=lambda x: str(x.get("published") or ""), reverse=True)
    all_news = deduplicate_by_title(all_news)

    start = min(skip, len(all_news))
    end = min(start + limit, len(all_news))
    page_items = all_news[start:end]
    requested_language = (language or "").strip().lower()
    news_out = []
    for n in _localize_news_list_items(list(page_items), requested_language):
        news_out.append({k: v for k, v in n.items() if k != "cluster_articles"})

    try:
        breaking = await get_breaking_news_list(max_items=3, force_refresh=refresh)
    except Exception:
        breaking = []

    schedule_batch_prefill_story_items(page_items + list(breaking or []))
    breaking = _localize_news_list_items(list(breaking or []), requested_language)

    window = all_news[:400]
    counts: Counter = Counter()
    for n in window:
        name = (n.get("source") or "").strip() or "Unknown"
        counts[name] += 1
    feed_sources = [
        {"name": name, "story_count": cnt} for name, cnt in counts.most_common(feed_sources_limit)
    ]

    return {"news": news_out, "breaking": breaking, "feed_sources": feed_sources}


@router.get("/news/breaking")
async def get_breaking(
    language: Optional[str] = Query(None, description="Preferred language for localized breaking headlines"),
):
    """Get breaking/urgent news stories."""
    try:
        stories = await get_breaking_news_list(max_items=3)
        schedule_batch_prefill_story_items(stories, max_stories=len(stories))
        requested_language = (language or "").strip().lower()
        localized = _localize_news_list_items(list(stories), requested_language)
        return localized
    except Exception:
        return []


@router.get("/news/feed-sources")
async def get_feed_sources(
    response: Response,
    limit: int = Query(8, ge=1, le=30, description="Top sources by story count in the recent window"),
):
    """Source names and recent story counts from the merged RSS + aggregator pool (matches full feed)."""
    response.headers["Cache-Control"] = "public, s-maxage=120, stale-while-revalidate=60"
    pool = await _get_full_news_pool()
    pool.sort(key=lambda x: str(x.get("published") or ""), reverse=True)
    window = pool[:400]
    counts: Counter = Counter()
    for n in window:
        name = (n.get("source") or "").strip() or "Unknown"
        counts[name] += 1
    return [{"name": name, "story_count": cnt} for name, cnt in counts.most_common(limit)]


def _get_saved_story_for_user(news_id: str, user_id: str):
    """Load story from user's offline_articles or bookmarks when not in live feed."""
    from lib.supabase_db import get_supabase_db
    db = get_supabase_db()
    # Prefer offline_articles (has narrative); fallback to bookmarks
    off = (
        db.table("offline_articles")
        .select("story_id, title, summary, narrative, source, category, image_url, saved_at")
        .eq("user_id", user_id)
        .eq("story_id", news_id)
        .limit(1)
        .execute()
    )
    row = (off.data or [None])[0]
    if row:
        return {
            "id": row.get("story_id"),
            "title": row.get("title"),
            "summary": row.get("summary") or "",
            "narrative": row.get("narrative") or "",
            "source": row.get("source") or "",
            "category": row.get("category") or "General",
            "source_url": "",  # offline_articles has no source_url column
            "image_url": row.get("image_url"),
            "published": row.get("saved_at"),
            "from_saved": True,
        }
    bk = (
        db.table("bookmarks")
        .select(
            "story_id, title, summary, narrative, source, category, source_url, image_url, saved_at"
        )
        .eq("user_id", user_id)
        .eq("story_id", news_id)
        .limit(1)
        .execute()
    )
    row = (bk.data or [None])[0]
    if row:
        saved_at = row.get("saved_at")
        if hasattr(saved_at, "isoformat"):
            saved_at = saved_at.isoformat()
        return {
            "id": row.get("story_id"),
            "title": row.get("title"),
            "summary": row.get("summary") or "",
            "narrative": row.get("narrative") or "",
            "source": row.get("source") or "",
            "category": row.get("category") or "General",
            "source_url": row.get("source_url") or "",
            "image_url": row.get("image_url"),
            "published": saved_at,
            "from_saved": True,
        }
    return None


@router.get("/news/{news_id}")
async def get_news_detail(
    news_id: str,
    user_id: Optional[str] = Query(None, description="User ID: when provided, fallback to saved/offline if not in feed"),
    language: Optional[str] = Query(None, description="Preferred language (yo, ha, ig, pcm): return pre-translated narrative and audio URL when available"),
    voice_id: Optional[str] = Query(
        None,
        description="YarnGPT/API voice id from Settings: cached audio from another voice is omitted so clients can regenerate",
    ),
):
    """Get detailed news item with narrative. If not in live feed and user_id given, returns saved/offline snapshot.
    When language is set, pre-translated narrative and pre-generated audio for that language are returned when available."""
    all_news = await _get_full_news_pool()
    news_item = next((n for n in all_news if n.get("id") == news_id), None)

    if not news_item and user_id and user_id.strip():
        news_item = _get_saved_story_for_user(news_id, user_id.strip())

    if not news_item:
        raise HTTPException(status_code=404, detail="News item not found")

    requested_language = (language or "").strip().lower()

    # Prefer persisted story_content (includes pre-translations and audio_by_lang)
    content = get_story_content(news_id)
    if content:
        news_item["title"] = content.get("title") or news_item.get("title") or ""
        news_item["short_summary"] = content.get("short_summary") or news_item.get("short_summary") or ""
        news_item["narrative"] = content.get("narrative") or news_item.get("narrative") or ""
        news_item["key_takeaways"] = content.get("key_takeaways") or []
        news_item["sources_used"] = content.get("sources_used") or []
        news_item["trust_score"] = content.get("trust_score")
        news_item["truth_tags"] = content.get("truth_tags") or []
        news_item["truth_explanation"] = content.get("truth_explanation")
        translations = content.get("translations") or {}
        audio_by_lang = content.get("audio_by_lang") or {}
        audio_voice_by_lang = content.get("audio_voice_by_lang") or {}
        translated_payload = translations.get(requested_language) if requested_language else None
        if requested_language and isinstance(translated_payload, dict):
            trans = translated_payload
            news_item["title"] = trans.get("title") or news_item["title"]
            news_item["short_summary"] = trans.get("short_summary") or news_item["short_summary"]
            news_item["narrative"] = trans.get("narrative") or news_item["narrative"]
            news_item["key_takeaways"] = trans.get("key_takeaways") or news_item["key_takeaways"]
        needs_inline_translation = bool(
            requested_language
            and requested_language != "en"
            and not (
                isinstance(translated_payload, dict)
                and str(translated_payload.get("title") or "").strip()
                and str(translated_payload.get("short_summary") or "").strip()
                and str(translated_payload.get("narrative") or "").strip()
            )
        )
        if needs_inline_translation:
            try:
                translated_payload = await translate_story_fields(
                    news_id,
                    requested_language,
                    content.get("title") or news_item.get("title") or "",
                    news_item["narrative"],
                    news_item["short_summary"],
                    news_item.get("key_takeaways") or [],
                )
                if translated_payload:
                    news_item["title"] = translated_payload.get("title") or news_item.get("title") or ""
                    news_item["short_summary"] = translated_payload.get("short_summary") or news_item["short_summary"]
                    news_item["narrative"] = translated_payload.get("narrative") or news_item["narrative"]
                    news_item["key_takeaways"] = translated_payload.get("key_takeaways") or news_item["key_takeaways"]
                    update_story_translations_and_audio(
                        news_id,
                        {requested_language: translated_payload},
                        {},
                        {},
                    )
                    translations[requested_language] = translated_payload
            except Exception as tx_err:
                logger.warning(
                    "[News] Persisted-row translation failed for %s/%s: %s",
                    news_id,
                    requested_language,
                    tx_err,
                )
        if audio_by_lang:
            if voice_id and str(voice_id).strip():
                news_item["audio_by_lang"] = _filter_audio_for_voice_id(
                    audio_by_lang, audio_voice_by_lang, voice_id.strip()
                )
            else:
                news_item["audio_by_lang"] = audio_by_lang
        # Recovery: if the row exists but translations/audio are empty (prefill failed or
        # hasn't run yet), reschedule silently so subsequent requests get instant playback.
        if not translations or not audio_by_lang or (
            requested_language and requested_language != "en" and requested_language not in translations
        ):
            schedule_prefill_translations_and_audio(
                news_id,
                title=content.get("title") or news_item.get("title") or "",
                narrative=content.get("narrative") or news_item["narrative"],
                short_summary=content.get("short_summary") or news_item["short_summary"],
                key_takeaways=content.get("key_takeaways") or [],
            )
        news_item.pop("cluster_articles", None)
        return news_item

    if not news_item.get("from_saved") and not news_item.get("narrative"):
        cluster_articles = news_item.get("cluster_articles") or []
        if len(cluster_articles) > 1:
            narrative_data = await synthesize_composite_story(cluster_articles)
        else:
            # Scraping-first: prefer full article text over RSS snippet for detailed narrative
            text_for_narrative = await get_text_for_narrative(
                news_item.get("title", ""),
                news_item.get("summary", ""),
                news_item.get("source_url"),
                prefer_scrape=True,
            )
            narrative_data = await generate_narrative(text_for_narrative, source_name=news_item.get("source", "Unknown"))
        raw_short = narrative_data.get("short_summary", "")
        raw_narrative = narrative_data.get("narrative", news_item.get("summary", ""))
        raw_takeaways = narrative_data.get("key_takeaways", [])
        if raw_short:
            news_item["short_summary"] = sanitize_ai_text(raw_short)
        news_item["narrative"] = sanitize_ai_text(raw_narrative)
        news_item["key_takeaways"] = [
            sanitize_ai_text(kt) for kt in raw_takeaways if sanitize_ai_text(kt)
        ]
        news_item["sources_used"] = narrative_data.get("sources_used", [])
        truth_data = await generate_truth_tags(news_item["narrative"], news_item["sources_used"])
        news_item["trust_score"] = truth_data.get("trust_score")
        news_item["truth_tags"] = truth_data.get("tags")
        news_item["truth_explanation"] = truth_data.get("explanation")
        
        # Persist and pre-load translations + audio for yo, ha, ig, pcm (background)
        save_story_content(
            news_id,
            title=news_item.get("title") or "",
            short_summary=news_item["short_summary"],
            narrative=news_item["narrative"],
            key_takeaways=news_item.get("key_takeaways") or [],
            sources_used=news_item["sources_used"],
            trust_score=news_item["trust_score"],
            truth_tags=news_item["truth_tags"],
            truth_explanation=news_item["truth_explanation"],
        )
        schedule_prefill_translations_and_audio(
            news_id,
            title=news_item.get("title") or "",
            narrative=news_item["narrative"],
            short_summary=news_item["short_summary"],
            key_takeaways=news_item.get("key_takeaways") or [],
        )
        # If client requested a specific non-English language, translate synchronously so the
        # rendered narrative is already aligned with the selected voice/language on first load,
        # then persist that translation into story_content for subsequent TTS requests.
        if requested_language and requested_language != "en":
            try:
                translated_payload = await translate_story_fields(
                    news_id,
                    requested_language,
                    news_item.get("title") or "",
                    news_item["narrative"],
                    news_item["short_summary"],
                    news_item.get("key_takeaways") or [],
                )
                if translated_payload:
                    news_item["title"] = translated_payload.get("title") or news_item.get("title") or ""
                    news_item["short_summary"] = translated_payload.get("short_summary") or news_item["short_summary"]
                    news_item["narrative"] = translated_payload.get("narrative") or news_item["narrative"]
                    news_item["key_takeaways"] = translated_payload.get("key_takeaways") or news_item["key_takeaways"]
                    update_story_translations_and_audio(
                        news_id,
                        {requested_language: translated_payload},
                        {},
                        {},
                    )
            except Exception as tx_err:
                logger.warning("[News] Inline translation failed for %s/%s: %s", news_id, requested_language, tx_err)
        news_item["audio_by_lang"] = {}

    # Don't expose internal cluster_articles to client
    news_item.pop("cluster_articles", None)
    return news_item


@router.get("/news/{news_id}/related")
async def get_related_news(
    news_id: str,
    limit: int = Query(5, le=10, description="Max related items"),
):
    """Get related news (same category first, then others), excluding the given id. Lightweight payload for mobile."""
    all_news = await _get_full_news_pool()
    current = next((n for n in all_news if n.get("id") == news_id), None)
    if not current:
        raise HTTPException(status_code=404, detail="News item not found")

    category = (current.get("category") or "").lower()
    same_category = [n for n in all_news if n.get("id") != news_id and (n.get("category") or "").lower() == category]
    other = [n for n in all_news if n.get("id") != news_id and (n.get("category") or "").lower() != category]
    related = (same_category + other)[:limit]
    return related
