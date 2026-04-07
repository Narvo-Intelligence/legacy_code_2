# Aggregator service for Mediastack and NewsData.io
import os
import asyncio
import logging
import aiohttp
import hashlib
import time
from datetime import datetime, timezone
from typing import List, Dict
from lib.cache_registry import get_cache

logger = logging.getLogger(__name__)

MEDIASTACK_KEY = os.environ.get("MEDIASTACK_API_KEY", "")
NEWSDATA_KEY = os.environ.get("NEWSDATA_API_KEY", "")

# Upstash Redis keys (must stay stable across deploys)
AGGREDIS_MS = "narvo:agg:mediastack"
AGGREDIS_ND = "narvo:agg:newsdata"
AGGREDIS_TS = "narvo:agg:last_fetched"
CACHE_TTL = 600

# Cache Registry Access
_aggregator_cache = get_cache("aggregators")
_refresh_lock = False


def _cache_is_stale() -> bool:
    """True if in-memory cache is empty or stale."""
    return "last_fetched" not in _aggregator_cache


async def _redis_aggregator_fresh() -> bool:
    """True if Redis has fresh aggregator data."""
    from lib.redis_client import get
    return (await get(AGGREDIS_TS)) is not None


async def fetch_mediastack(keywords: str = "Nigeria Africa", limit: int = 20) -> List[Dict]:
    """Fetch news from Mediastack API."""
    if not MEDIASTACK_KEY:
        return []
    url = "http://api.mediastack.com/v1/news"
    params = {
        "access_key": MEDIASTACK_KEY,
        "keywords": keywords,
        "languages": "en",
        "limit": limit,
        "sort": "published_desc",
    }
    try:
        async with aiohttp.ClientSession(timeout=aiohttp.ClientTimeout(total=15)) as session:
            async with session.get(url, params=params) as resp:
                if resp.status == 200:
                    data = await resp.json()
                    articles = data.get("data", [])
                    results = []
                    for a in articles:
                        item_id = hashlib.md5((a.get("url", "") + a.get("title", "")).encode()).hexdigest()[:12]
                        results.append({
                            "id": f"ms_{item_id}",
                            "title": (a.get("title") or "Untitled")[:200],
                            # Allow the full description through
                            "summary": a.get("description") or "",
                            "source": a.get("source") or "Mediastack",
                            "source_url": a.get("url"),
                            "image_url": a.get("image"),
                            "published": a.get("published_at"),
                            "category": a.get("category") or "General",
                            "region": "Africa",
                            "tags": [],
                            "aggregator": "mediastack",
                        })
                    return results
                else:
                    logger.warning("[Mediastack] Error: HTTP %s", resp.status)
    except Exception as e:
        logger.error("[Mediastack] Error: %s", e)
    return []


async def fetch_newsdata(query: str = "Nigeria", limit: int = 10) -> List[Dict]:
    """Fetch news from NewsData.io API."""
    if not NEWSDATA_KEY:
        return []
    limit = min(limit, 10)  # Free plan caps at 10
    url = "https://newsdata.io/api/1/latest"
    params = {
        "apikey": NEWSDATA_KEY,
        "q": query,
        "country": "ng",
        "language": "en",
        "size": limit,
    }
    try:
        async with aiohttp.ClientSession(timeout=aiohttp.ClientTimeout(total=15)) as session:
            async with session.get(url, params=params) as resp:
                if resp.status == 200:
                    data = await resp.json()
                    articles = data.get("results", [])
                    results = []
                    for a in articles:
                        item_id = hashlib.md5((a.get("link", "") + a.get("title", "")).encode()).hexdigest()[:12]
                        results.append({
                            "id": f"nd_{item_id}",
                            "title": (a.get("title") or "Untitled")[:200],
                            # Allow the full description through
                            "summary": a.get("description") or "",
                            "source": (a.get("source_id") or "NewsData").replace("_", " ").title(),
                            "source_url": a.get("link"),
                            "image_url": a.get("image_url"),
                            "published": a.get("pubDate"),
                            "category": (a.get("category") or ["General"])[0] if isinstance(a.get("category"), list) else "General",
                            "region": "Africa",
                            "tags": a.get("keywords", [])[:5] if a.get("keywords") else [],
                            "aggregator": "newsdata",
                        })
                    return results
                else:
                    logger.warning("[NewsData] Error: HTTP %s", resp.status)
    except Exception as e:
        logger.error("[NewsData] Error: %s", e)
    return []


async def refresh_cache() -> Dict:
    """Refresh the aggregator cache. Called by QStash or in-process. Writes to Redis + in-memory."""
    global _refresh_lock
    if _refresh_lock:
        return _aggregator_cache
    _refresh_lock = True
    try:
        ms_task = fetch_mediastack("Nigeria Africa", 20)
        nd_task = fetch_newsdata("Nigeria", 10)  # NewsData.io free plan caps at 10
        ms_results, nd_results = await asyncio.gather(ms_task, nd_task)
        now_iso = datetime.now(timezone.utc).isoformat()
        _aggregator_cache["mediastack"] = ms_results
        _aggregator_cache["newsdata"] = nd_results
        _aggregator_cache["last_fetched"] = now_iso
        from lib.redis_client import set_json, set
        await set_json(AGGREDIS_MS, ms_results, ttl_seconds=600)
        await set_json(AGGREDIS_ND, nd_results, ttl_seconds=600)
        await set(AGGREDIS_TS, now_iso, ttl_seconds=600)
        logger.info("[Aggregator] Cache refreshed: %s mediastack, %s newsdata", len(ms_results), len(nd_results))
    finally:
        _refresh_lock = False
    return _aggregator_cache


async def fetch_all_aggregators(keywords: str = "Nigeria Africa") -> Dict:
    """Fetch from all programmatic aggregators. Uses Redis or in-memory cache if fresh."""
    from lib.redis_client import get_json
    ms_cached = await get_json(AGGREDIS_MS)
    nd_cached = await get_json(AGGREDIS_ND)
    if ms_cached is not None and nd_cached is not None:
        ms, nd = ms_cached, nd_cached
        last_fetched = _aggregator_cache.get("last_fetched")  # may be from Redis earlier
        from lib.redis_client import get
        lf = await get(AGGREDIS_TS)
        if lf:
            last_fetched = lf
        return {
            "mediastack": {"count": len(ms), "articles": ms},
            "newsdata": {"count": len(nd), "articles": nd},
            "total": len(ms) + len(nd),
            "last_fetched": last_fetched or "",
            "cached": True,
        }
    if not _cache_is_stale() and (_aggregator_cache["mediastack"] or _aggregator_cache["newsdata"]):
        ms = _aggregator_cache["mediastack"]
        nd = _aggregator_cache["newsdata"]
    else:
        ms_task = fetch_mediastack(keywords)
        nd_task = fetch_newsdata(keywords.split()[0] if keywords else "Nigeria")
        ms, nd = await asyncio.gather(ms_task, nd_task)
        _aggregator_cache["mediastack"] = ms
        _aggregator_cache["newsdata"] = nd
        _aggregator_cache["last_fetched"] = datetime.now(timezone.utc).isoformat()
    return {
        "mediastack": {"count": len(ms), "articles": ms},
        "newsdata": {"count": len(nd), "articles": nd},
        "total": len(ms) + len(nd),
        "last_fetched": _aggregator_cache["last_fetched"],
        "cached": not _cache_is_stale(),
    }


async def get_aggregator_status() -> Dict:
    """Return current aggregator cache status (Redis or in-memory)."""
    from lib.redis_client import get_json, get
    ms_cached = await get_json(AGGREDIS_MS)
    nd_cached = await get_json(AGGREDIS_ND)
    last_fetched = await get(AGGREDIS_TS)
    if ms_cached is not None and nd_cached is not None:
        return {
            "mediastack": {"configured": bool(MEDIASTACK_KEY), "cached_count": len(ms_cached)},
            "newsdata": {"configured": bool(NEWSDATA_KEY), "cached_count": len(nd_cached)},
            "last_fetched": last_fetched,
            "cache_ttl_seconds": CACHE_TTL,
            "cache_stale": False,
        }
    return {
        "mediastack": {
            "configured": bool(MEDIASTACK_KEY),
            "cached_count": len(_aggregator_cache.get("mediastack", [])),
        },
        "newsdata": {
            "configured": bool(NEWSDATA_KEY),
            "cached_count": len(_aggregator_cache.get("newsdata", [])),
        },
        "last_fetched": _aggregator_cache.get("last_fetched"),
        "cache_ttl_seconds": 600,
        "cache_stale": _cache_is_stale(),
    }


def normalize_to_news_items(articles: List[Dict]) -> List[Dict]:
    """Normalize aggregator articles to match NewsItem schema."""
    items = []
    for a in articles:
        items.append({
            "id": a.get("id", ""),
            "title": a.get("title", "Untitled"),
            "summary": a.get("summary", ""),
            "narrative": None,
            "source": a.get("source", "Unknown"),
            "source_url": a.get("source_url", ""),
            "published": a.get("published", ""),
            "region": a.get("region", "Africa"),
            "category": (a.get("category") or "General").title(),
            "truth_score": 100,
            "audio_url": None,
            "listen_count": 0,
            "tags": a.get("tags", []),
            "image_url": a.get("image_url"),
            "aggregator": a.get("aggregator", ""),
        })
    return items


async def get_normalized_aggregator_news(sources: List[str] = None) -> List[Dict]:
    """Get cached aggregator news as normalized items. Optionally filter by source."""
    from lib.redis_client import get_json
    ms_cached = await get_json(AGGREDIS_MS)
    nd_cached = await get_json(AGGREDIS_ND)
    if ms_cached is not None and nd_cached is not None:
        all_articles = []
        if sources is None or "mediastack" in sources:
            all_articles.extend(ms_cached)
        if sources is None or "newsdata" in sources:
            all_articles.extend(nd_cached)
        return normalize_to_news_items(all_articles)
    if _cache_is_stale() or not (_aggregator_cache["mediastack"] or _aggregator_cache["newsdata"]):
        await refresh_cache()
    all_articles = []
    if sources is None or "mediastack" in sources:
        all_articles.extend(_aggregator_cache.get("mediastack", []))
    if sources is None or "newsdata" in sources:
        all_articles.extend(_aggregator_cache.get("newsdata", []))
    return normalize_to_news_items(all_articles)


async def search_cached_aggregators(query: str, sources: List[str] = None) -> List[Dict]:
    """Search through cached aggregator articles (Redis or in-memory)."""
    from lib.redis_client import get_json
    ms_cached = await get_json(AGGREDIS_MS)
    nd_cached = await get_json(AGGREDIS_ND)
    if ms_cached is not None and nd_cached is not None:
        all_articles = []
        if sources is None or "mediastack" in sources:
            all_articles.extend(ms_cached)
        if sources is None or "newsdata" in sources:
            all_articles.extend(nd_cached)
    else:
        all_articles = []
        if sources is None or "mediastack" in sources:
            all_articles.extend(_aggregator_cache.get("mediastack", []))
        if sources is None or "newsdata" in sources:
            all_articles.extend(_aggregator_cache.get("newsdata", []))
    q = query.lower()
    results = []
    for a in all_articles:
        title_match = q in (a.get("title") or "").lower()
        summary_match = q in (a.get("summary") or "").lower()
        if title_match or summary_match:
            results.append(a)
    return normalize_to_news_items(results)
