# Search routes — unified search + trending
import logging
from datetime import datetime, timezone
from typing import Optional
from urllib.parse import quote

from fastapi import APIRouter, HTTPException, Query

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api", tags=["search"])

RADIO_BROWSER_API = "https://de1.api.radio-browser.info"


@router.get("/search")
async def search_news(
    q: str = Query(..., description="Search query"),
    category: str = Query(None), source: str = Query(None),
    source_type: str = Query(None), limit: int = Query(20, le=50),
    skip: int = Query(0), include_aggregators: bool = Query(True),
    include_radio: bool = Query(True),
):
    """Unified search: news (RSS), aggregators, podcasts, and radio stations"""
    try:
        from services.news_service import get_cached_all_news
        query_lower = q.lower()
        all_items = list(await get_cached_all_news())

        if include_aggregators:
            try:
                from services.aggregator_service import get_normalized_aggregator_news
                all_items.extend(await get_normalized_aggregator_news())
            except Exception as e:
                logger.warning("[Search] Aggregator error: %s", e)

        try:
            from services.podcast_service import search_podcasts
            pods = await search_podcasts(q, limit=10)
            for p in pods:
                all_items.append({"id": p.get("id", ""), "title": p.get("title", ""), "summary": p.get("description", ""),
                    "source": p.get("podcast_name", "Podcast"), "source_url": p.get("audio_url", ""), "published": p.get("published", ""),
                    "category": "Podcast", "region": "Africa", "tags": [], "image_url": p.get("image_url"), "aggregator": "podcast"})
        except Exception:
            pass

        if include_radio and query_lower.strip():
            try:
                from lib.http_client import get_http_client
                client = await get_http_client()
                url = f"{RADIO_BROWSER_API}/json/stations/byname/{quote(q, safe='')}"
                response = await client.get(url, params={"limit": 15, "hidebroken": "true"}, timeout=10.0)
                if response.status_code == 200:
                    for r in response.json()[:15]:
                        station = {"id": r.get("stationuuid", ""), "name": r.get("name", "Unknown"),
                            "url": r.get("url", ""), "url_resolved": r.get("url_resolved", r.get("url", "")),
                            "country": r.get("country", ""), "countrycode": r.get("countrycode", ""),
                            "tags": r.get("tags", ""), "bitrate": r.get("bitrate", 0)}
                        all_items.append({"id": f"radio:{station['id']}", "title": station["name"],
                            "summary": f"{station['country']} \u2022 {(station.get('tags') or '')}"[:200],
                            "source": station["country"], "published": "", "category": "Radio",
                            "source_type": "radio", "aggregator": "radio", "station": station})
            except Exception as e:
                logger.warning("[Search] Radio error: %s", e)

        # Filter
        filtered = []
        for item in all_items:
            if source_type:
                is_radio = item.get("source_type") == "radio"
                is_agg = bool(item.get("aggregator") and item.get("aggregator") not in ("podcast", "radio"))
                is_podcast = item.get("aggregator") == "podcast" or item.get("category", "").lower() == "podcast"
                is_rss = not is_agg and not is_podcast and not is_radio
                if source_type == "rss" and not is_rss: continue
                if source_type == "aggregator" and not is_agg: continue
                if source_type == "podcast" and not is_podcast: continue
                if source_type == "radio" and not is_radio: continue

            is_radio_item = item.get("source_type") == "radio"
            title_match = query_lower in (item.get("title") or "").lower()
            summary_match = query_lower in (item.get("summary") or "").lower()
            source_match = query_lower in (item.get("source") or "").lower()
            raw_tags = (item.get("station") or {}).get("tags", "") if is_radio_item else item.get("tags")
            tags_list = [t.strip() for t in raw_tags.split(",") if t.strip()] if isinstance(raw_tags, str) else [str(t).strip() for t in (raw_tags or []) if str(t).strip()]
            tag_match = any(query_lower in (t or "").lower() for t in tags_list)

            if is_radio_item or title_match or summary_match or source_match or tag_match:
                if category and (item.get("category") or "").lower() != category.lower(): continue
                if source and (item.get("source") or "").lower() != source.lower(): continue
                filtered.append(item)

        # Deduplicate
        seen_ids = set()
        deduped = []
        for item in filtered:
            item_id = item.get("id", "")
            if item_id and item_id in seen_ids: continue
            seen_ids.add(item_id)
            if item.get("source_type") != "radio":
                if item.get("aggregator") and item.get("aggregator") not in ("podcast", "radio"):
                    item["source_type"] = "aggregator"
                elif item.get("aggregator") == "podcast" or item.get("category", "").lower() == "podcast":
                    item["source_type"] = "podcast"
                else:
                    item["source_type"] = item.get("source_type") or "rss"
            deduped.append(item)

        deduped.sort(key=lambda x: (query_lower not in (x.get("title") or "").lower(), x.get("published") or ""), reverse=True)
        total = len(deduped)
        return {"results": deduped[skip:skip + limit], "total": total, "query": q, "filters": {"category": category, "source": source}}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Search failed: {str(e)}")


@router.get("/trending")
async def get_trending():
    """Get trending tags and topics based on recent news."""
    try:
        from services.news_service import get_trending_topics
        return await get_trending_topics()
    except Exception:
        return {"tags": ["#POLITICS", "#ECONOMY", "#NIGERIA", "#AFRICA", "#TECH"],
                "topics": [{"name": "Elections 2025", "count": "12.5k"}, {"name": "Naira Exchange", "count": "8.2k"}, {"name": "AfCFTA Trade", "count": "5.1k"}],
                "updated_at": datetime.now(timezone.utc).isoformat()}
