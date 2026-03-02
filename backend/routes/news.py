# News API — single RSS source via services.news_service
import logging
from typing import Optional
from fastapi import APIRouter, Query, HTTPException

from services.news_service import (
    get_cached_all_news,
    get_breaking_news_list,
)
from services.narrative_service import generate_narrative
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

    all_news.sort(key=lambda x: x.get("published", ""), reverse=True)
    return all_news[:limit]


@router.get("/news/breaking")
async def get_breaking():
    """Get breaking/urgent news stories."""
    try:
        return await get_breaking_news_list(max_items=3)
    except Exception:
        return []


@router.get("/news/{news_id}")
async def get_news_detail(news_id: str):
    """Get detailed news item with narrative."""
    all_news = await get_cached_all_news()
    news_item = next((n for n in all_news if n.get("id") == news_id), None)

    if not news_item:
        raise HTTPException(status_code=404, detail="News item not found")

    if not news_item.get("narrative"):
        narrative_data = await generate_narrative(
            f"{news_item.get('title', '')}\n\n{news_item.get('summary', '')}"
        )
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
