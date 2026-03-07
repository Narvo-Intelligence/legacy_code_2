# News API — single RSS source via services.news_service
import logging
from typing import Optional
from fastapi import APIRouter, Query, HTTPException

from services.news_service import (
    get_cached_all_news,
    get_breaking_news_list,
    deduplicate_by_title,
)
from services.narrative_service import generate_narrative
from services.article_scraper_service import get_text_for_narrative
from lib.text_utils import sanitize_ai_text

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api", tags=["news"])


@router.get("/news")
async def get_news(
    region: Optional[str] = Query(None, description="Filter by region"),
    category: Optional[str] = Query(None, description="Filter by category"),
    limit: int = Query(20, le=50, description="Number of items to return"),
    include_aggregators: bool = Query(False, description="Include aggregator news"),
    aggregator_sources: Optional[str] = Query(
        None, description="Comma-separated aggregator sources: mediastack,newsdata"
    ),
):
    """Fetch aggregated news from RSS (single source) and optional aggregator APIs."""
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
    return all_news[:limit]


@router.get("/news/breaking")
async def get_breaking():
    """Get breaking/urgent news stories."""
    try:
        return await get_breaking_news_list(max_items=3)
    except Exception:
        return []


def _get_saved_story_for_user(news_id: str, user_id: str):
    """Load story from user's offline_articles or bookmarks when not in live feed."""
    from lib.supabase_db import get_supabase_db
    db = get_supabase_db()
    # Prefer offline_articles (has narrative); fallback to bookmarks
    off = (
        db.table("offline_articles")
        .select("*")
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
):
    """Get detailed news item with narrative. If not in live feed and user_id given, returns saved/offline snapshot."""
    all_news = await get_cached_all_news()
    news_item = next((n for n in all_news if n.get("id") == news_id), None)

    if not news_item and user_id and user_id.strip():
        news_item = _get_saved_story_for_user(news_id, user_id.strip())

    if not news_item:
        raise HTTPException(status_code=404, detail="News item not found")

    if not news_item.get("from_saved") and not news_item.get("narrative"):
        text_for_narrative = await get_text_for_narrative(
            news_item.get("title", ""),
            news_item.get("summary", ""),
            news_item.get("source_url"),
        )
        narrative_data = await generate_narrative(text_for_narrative)
        raw_short = narrative_data.get("short_summary", "")
        raw_narrative = narrative_data.get("narrative", news_item.get("summary", ""))
        raw_takeaways = narrative_data.get("key_takeaways", [])
        if raw_short:
            news_item["short_summary"] = sanitize_ai_text(raw_short)
        news_item["narrative"] = sanitize_ai_text(raw_narrative)
        news_item["key_takeaways"] = [
            sanitize_ai_text(kt) for kt in raw_takeaways if sanitize_ai_text(kt)
        ]

    return news_item


@router.get("/news/{news_id}/related")
async def get_related_news(
    news_id: str,
    limit: int = Query(5, le=10, description="Max related items"),
):
    """Get related news (same category first, then others), excluding the given id. Lightweight payload for mobile."""
    all_news = await get_cached_all_news()
    current = next((n for n in all_news if n.get("id") == news_id), None)
    if not current:
        raise HTTPException(status_code=404, detail="News item not found")

    category = (current.get("category") or "").lower()
    same_category = [n for n in all_news if n.get("id") != news_id and (n.get("category") or "").lower() == category]
    other = [n for n in all_news if n.get("id") != news_id and (n.get("category") or "").lower() != category]
    related = (same_category + other)[:limit]
    return related
