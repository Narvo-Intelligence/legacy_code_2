# Aggregator, sources, and reference data routes
import logging
from typing import Optional
from datetime import datetime, timezone
from fastapi import APIRouter, BackgroundTasks, Query, Depends, HTTPException
from fastapi.responses import JSONResponse

from lib.supabase_db import get_supabase_db
from lib.gcp_verify import verify_gcp_scheduler

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api", tags=["aggregators"])

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


# ── Reference Data ───────────────────────────────────

@router.get("/regions")
async def get_regions():
    return JSONResponse(content=[{"id": "nigeria", "name": "Nigeria", "icon": "NG"}, {"id": "continental", "name": "Continental", "icon": "AF"}], headers={"Cache-Control": "public, max-age=3600"})


@router.get("/telemetry/regional-env")
async def get_regional_env(city: Optional[str] = Query(None)):
    c = (city or "").strip().lower()
    if c == "abuja":
        city_label, city_name = "ABUJA, NIGERIA", "Abuja"
    else:
        city_label, city_name = "LAGOS, NIGERIA", "Lagos"
    return {"region_id": "nigeria", "region_name": "Nigeria", "city": city_name, "label": city_label, "temp_c": None, "humidity": None, "wind_kmh": None}


@router.get("/sound-themes")
async def list_sound_themes():
    from lib.redis_client import get_json, set_json
    cached = await get_json("narvo:memcache:sound_themes")
    if not cached:
        cached = _cache.get("sound_themes", ttl=600)
    if cached:
        return JSONResponse(content=cached, headers={"Cache-Control": "public, max-age=600"})
    from services.sound_themes_service import get_sound_themes
    result = get_sound_themes()
    await set_json("narvo:memcache:sound_themes", result, ttl_seconds=600)
    _cache.set("sound_themes", result)
    return result


@router.get("/sound-themes/{theme_id}")
async def get_sound_theme_detail(theme_id: str):
    from services.sound_themes_service import get_sound_theme
    theme = get_sound_theme(theme_id)
    if not theme:
        raise HTTPException(status_code=404, detail="Theme not found")
    return JSONResponse(content=theme, headers={"Cache-Control": "public, max-age=3600"})


@router.get("/categories")
async def get_categories():
    return JSONResponse(content=[
        {"id": "politics", "name": "Politics", "icon": "building"}, {"id": "economy", "name": "Economy", "icon": "chart"},
        {"id": "tech", "name": "Tech", "icon": "cpu"}, {"id": "sports", "name": "Sports", "icon": "trophy"},
        {"id": "health", "name": "Health", "icon": "heart"}, {"id": "general", "name": "General", "icon": "newspaper"},
    ], headers={"Cache-Control": "public, max-age=3600"})


# ── Sources ──────────────────────────────────────────

@router.get("/sources")
async def get_content_sources():
    from services.news_service import get_content_sources as get_sources
    return get_sources()


@router.get("/sources/health")
async def get_sources_health():
    from services.news_service import get_feed_health
    return get_feed_health()


@router.post("/sources/health/refresh")
async def refresh_sources_health(background_tasks: BackgroundTasks):
    from services.news_service import run_health_check
    background_tasks.add_task(run_health_check)
    return {"status": "started", "message": "Health check initiated"}


@router.get("/sources/reputation")
async def get_sources_reputation():
    from services.news_service import SOURCE_WEIGHTS
    db = get_supabase_db()
    try:
        r = db.table("source_reputation").select("source_key, display_name, score, region, updated_at").order("score", desc=True).execute()
        if r.data and len(r.data) > 0:
            return {"sources": [{"source_key": x.get("source_key"), "display_name": x.get("display_name") or x.get("source_key"),
                                  "score": round(float(x.get("score", 50)), 1), "region": x.get("region"),
                                  "updated_at": x.get("updated_at").isoformat() if hasattr(x.get("updated_at"), "isoformat") else x.get("updated_at")} for x in r.data]}
    except Exception:
        pass
    return {"sources": [{"source_key": k, "display_name": k, "score": round(v * 100, 1), "region": None, "updated_at": None} for k, v in sorted(SOURCE_WEIGHTS.items(), key=lambda x: -x[1])]}


# ── Aggregators ──────────────────────────────────────

@router.get("/aggregators/status")
async def aggregators_status():
    from services.aggregator_service import get_aggregator_status
    return await get_aggregator_status()


@router.post("/aggregators/refresh")
async def refresh_aggregators(background_tasks: BackgroundTasks, _: None = Depends(verify_gcp_scheduler)):
    from services.aggregator_service import refresh_cache
    from services.story_content_service import refresh_news_cache_and_prefill

    async def _refresh_pipeline() -> None:
        await refresh_cache()
        await refresh_news_cache_and_prefill(max_stories=500)

    background_tasks.add_task(_refresh_pipeline)
    return {"status": "started", "message": "Aggregator refresh initiated"}


@router.post("/news/refresh", summary="Batch pre-translate & pre-generate audio")
async def refresh_news_content(background_tasks: BackgroundTasks, max_stories: int = Query(500, le=500), _: None = Depends(verify_gcp_scheduler)):
    from services.story_content_service import refresh_news_cache_and_prefill

    background_tasks.add_task(refresh_news_cache_and_prefill, max_stories)
    return {"status": "started", "message": f"Feed refresh + prefill initiated for up to {max_stories} stories"}


@router.get("/aggregators/fetch")
async def fetch_aggregators(keywords: str = Query("Nigeria Africa")):
    from services.aggregator_service import fetch_all_aggregators
    return await fetch_all_aggregators(keywords)


@router.get("/aggregators/mediastack")
async def fetch_mediastack_news(keywords: str = Query("Nigeria Africa"), limit: int = Query(20, ge=1, le=50)):
    from services.aggregator_service import fetch_mediastack
    articles = await fetch_mediastack(keywords, limit)
    return {"count": len(articles), "articles": articles}


@router.get("/aggregators/newsdata")
async def fetch_newsdata_news(query: str = Query("Nigeria"), limit: int = Query(20, ge=1, le=50)):
    from services.aggregator_service import fetch_newsdata
    articles = await fetch_newsdata(query, limit)
    return {"count": len(articles), "articles": articles}
