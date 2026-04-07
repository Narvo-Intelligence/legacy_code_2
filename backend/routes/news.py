# News API — single RSS source via services.news_service
import logging
from collections import Counter
from typing import Optional
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
    save_story_content,
    schedule_prefill_translations_and_audio,
)
from services.factcheck_service import generate_truth_tags
from lib.text_utils import sanitize_ai_text

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api", tags=["news"])


async def _get_full_news_pool() -> list:
    """RSS news merged with cached aggregator articles (ms_*, nd_* prefixes).
    Used by detail and related endpoints so aggregator-sourced stories are
    always resolvable — not just when the list view includes_aggregators=True."""
    rss = await get_cached_all_news()
    try:
        from services.aggregator_service import get_normalized_aggregator_news
        agg = await get_normalized_aggregator_news()
        return deduplicate_by_title(list(rss) + list(agg))
    except Exception:
        return list(rss)


@router.get("/news")
async def get_news(
    response: Response,
    region: Optional[str] = Query(None, description="Filter by region"),
    category: Optional[str] = Query(None, description="Filter by category"),
    limit: int = Query(20, le=50, description="Number of items to return"),
    skip: int = Query(0, ge=0, le=5000, description="Offset for pagination (same sort as first page)"),
    include_aggregators: bool = Query(False, description="Include aggregator news"),
    aggregator_sources: Optional[str] = Query(
        None, description="Comma-separated aggregator sources: mediastack,newsdata"
    ),
):
    """Fetch aggregated news from RSS (single source) and optional aggregator APIs."""
    response.headers["Cache-Control"] = "public, s-maxage=120, stale-while-revalidate=60"
    all_news = await get_cached_all_news()

    if include_aggregators:
        try:
            from services.aggregator_service import get_normalized_aggregator_news
            sources_list = aggregator_sources.split(",") if aggregator_sources else None
            agg_news = await get_normalized_aggregator_news(sources=sources_list)
            all_news = list(all_news) + list(agg_news)
        except Exception as e:
            logger.error("[News] Aggregator fetch error: %s", e)

    if region:
        all_news = [n for n in all_news if n.get("region", "").lower() == region.lower()]
    if category:
        all_news = [n for n in all_news if n.get("category", "").lower() == category.lower()]

    all_news.sort(key=lambda x: str(x.get("published") or ""), reverse=True)
    all_news = deduplicate_by_title(all_news)
    # Strip cluster_articles from list response (used only for detail synthesis)
    start = min(skip, len(all_news))
    end = min(start + limit, len(all_news))
    out = []
    for n in all_news[start:end]:
        item = {k: v for k, v in n.items() if k != "cluster_articles"}
        out.append(item)
    return out


@router.get("/news/dashboard-bundle")
async def get_dashboard_bundle(
    response: Response,
    limit: int = Query(24, le=50, description="News items (same shape as GET /api/news)"),
    skip: int = Query(0, ge=0, le=5000, description="Offset into sorted feed"),
    include_aggregators: bool = Query(True, description="Include Mediastack/NewsData when configured"),
    aggregator_sources: Optional[str] = Query(
        None, description="Comma-separated aggregator sources: mediastack,newsdata"
    ),
    feed_sources_limit: int = Query(10, ge=1, le=30, description="Top N sources by count in recent window"),
):
    """Single round-trip for dashboard: news list + breaking + feed source activity (shared merge/sort)."""
    response.headers["Cache-Control"] = "public, s-maxage=120, stale-while-revalidate=60"
    all_news = await get_cached_all_news()

    if include_aggregators:
        try:
            from services.aggregator_service import get_normalized_aggregator_news

            sources_list = aggregator_sources.split(",") if aggregator_sources else None
            agg_news = await get_normalized_aggregator_news(sources=sources_list)
            all_news = list(all_news) + list(agg_news)
        except Exception as e:
            logger.error("[News] Aggregator fetch error: %s", e)

    all_news.sort(key=lambda x: str(x.get("published") or ""), reverse=True)
    all_news = deduplicate_by_title(all_news)

    start = min(skip, len(all_news))
    end = min(start + limit, len(all_news))
    news_out = []
    for n in all_news[start:end]:
        news_out.append({k: v for k, v in n.items() if k != "cluster_articles"})

    try:
        breaking = await get_breaking_news_list(max_items=3)
    except Exception:
        breaking = []

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
async def get_breaking():
    """Get breaking/urgent news stories."""
    try:
        return await get_breaking_news_list(max_items=3)
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
        .select("story_id, title, summary, source, category, source_url, saved_at")
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
            "narrative": "",
            "source": row.get("source") or "",
            "category": row.get("category") or "General",
            "source_url": row.get("source_url") or "",
            "image_url": None,
            "published": saved_at,
            "from_saved": True,
        }
    return None


@router.get("/news/{news_id}")
async def get_news_detail(
    news_id: str,
    user_id: Optional[str] = Query(None, description="User ID: when provided, fallback to saved/offline if not in feed"),
    language: Optional[str] = Query(None, description="Preferred language (yo, ha, ig, pcm): return pre-translated narrative and audio URL when available"),
):
    """Get detailed news item with narrative. If not in live feed and user_id given, returns saved/offline snapshot.
    When language is set, pre-translated narrative and pre-generated audio for that language are returned when available."""
    all_news = await _get_full_news_pool()
    news_item = next((n for n in all_news if n.get("id") == news_id), None)

    if not news_item and user_id and user_id.strip():
        news_item = _get_saved_story_for_user(news_id, user_id.strip())

    if not news_item:
        raise HTTPException(status_code=404, detail="News item not found")

    # Prefer persisted story_content (includes pre-translations and audio_by_lang)
    content = get_story_content(news_id)
    if content:
        news_item["short_summary"] = content.get("short_summary") or news_item.get("short_summary") or ""
        news_item["narrative"] = content.get("narrative") or news_item.get("narrative") or ""
        news_item["key_takeaways"] = content.get("key_takeaways") or []
        news_item["sources_used"] = content.get("sources_used") or []
        news_item["trust_score"] = content.get("trust_score")
        news_item["truth_tags"] = content.get("truth_tags") or []
        news_item["truth_explanation"] = content.get("truth_explanation")
        translations = content.get("translations") or {}
        audio_by_lang = content.get("audio_by_lang") or {}
        if language and language in translations:
            trans = translations[language]
            news_item["short_summary"] = trans.get("short_summary") or news_item["short_summary"]
            news_item["narrative"] = trans.get("narrative") or news_item["narrative"]
            news_item["key_takeaways"] = trans.get("key_takeaways") or news_item["key_takeaways"]
        if audio_by_lang:
            news_item["audio_by_lang"] = audio_by_lang
        # Recovery: if the row exists but translations/audio are empty (prefill failed or
        # hasn't run yet), reschedule silently so subsequent requests get instant playback.
        if not translations or not audio_by_lang:
            schedule_prefill_translations_and_audio(
                news_id,
                narrative=news_item["narrative"],
                short_summary=news_item["short_summary"],
                key_takeaways=news_item.get("key_takeaways") or [],
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
            narrative=news_item["narrative"],
            short_summary=news_item["short_summary"],
            key_takeaways=news_item.get("key_takeaways") or [],
        )
        # If client requested a specific non-English language, translate synchronously so the
        # rendered narrative and short_summary are already in the target voice/language on first load.
        # (Pre-generated audio will be picked up on subsequent requests via story_content cache.)
        if language and language != "en":
            try:
                from services.translation_service import translate_text, SUPPORTED_LANGUAGES
                if language in SUPPORTED_LANGUAGES:
                    tx_result = await translate_text(
                        text=news_item["narrative"],
                        target_language=language,
                        source_language="en",
                        style="broadcast",
                    )
                    if tx_result.get("success") and tx_result.get("translated"):
                        translated_narrative = tx_result["translated"]
                        news_item["narrative"] = translated_narrative
                        # Also translate short_summary for the lead text
                        short_tx = await translate_text(
                            text=news_item.get("short_summary", ""),
                            target_language=language,
                            source_language="en",
                            style="broadcast",
                        )
                        if short_tx.get("success") and short_tx.get("translated"):
                            news_item["short_summary"] = short_tx["translated"]
            except Exception as tx_err:
                logger.warning("[News] Inline translation failed for %s/%s: %s", news_id, language, tx_err)
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
