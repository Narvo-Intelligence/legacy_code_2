# Discover routes - Podcasts, Trending, Radio integration
from fastapi import APIRouter, Query, HTTPException
from fastapi.responses import StreamingResponse
from typing import List
import httpx

from services.podcast_service import get_podcasts, get_podcast_by_id, get_podcast_audio_url, search_podcasts
from services.radio_service import get_countries, get_stations
from lib.http_client import get_http_client

router = APIRouter(prefix="/api", tags=["discover"])


@router.get("/podcasts/categories")
async def get_podcast_categories():
    """Get unique podcast categories"""
    cats = ["Geopolitics", "Technology", "Urban", "Environment", "Finance", "Health", "Climate", "Culture"]
    return [{"id": c.lower(), "name": c} for c in cats]


@router.get("/podcasts/search")
async def search_podcast_episodes(q: str = Query("", min_length=1), limit: int = Query(10, ge=1, le=50)):
    """Search podcasts by title or description"""
    results = await search_podcasts(q, limit=limit)
    return results


@router.get("/podcasts")
async def list_podcasts(
    limit: int = Query(6, le=20),
    sort: str = Query("latest", regex="^(latest|popular)$")
):
    """Get curated podcast episodes"""
    return await get_podcasts(limit=limit, sort=sort)


@router.get("/podcasts/{podcast_id}")
async def get_podcast_detail(podcast_id: str):
    """Get specific podcast episode details"""
    podcast = get_podcast_by_id(podcast_id)
    if not podcast:
        raise HTTPException(status_code=404, detail="Podcast not found")
    return podcast


@router.get("/podcasts/{podcast_id}/audio")
async def stream_podcast_audio(podcast_id: str):
    """Stream podcast audio file (proxy to avoid CORS issues)"""
    audio_url = get_podcast_audio_url(podcast_id)
    
    if not audio_url:
        raise HTTPException(status_code=404, detail="Podcast audio not found")
    
    async def audio_stream():
        client = await get_http_client()
        async with client.stream("GET", audio_url, timeout=httpx.Timeout(60.0, connect=10.0)) as response:
            async for chunk in response.aiter_bytes(chunk_size=8192):
                yield chunk
    
    return StreamingResponse(
        audio_stream(),
        media_type="audio/mpeg",
        headers={
            "Content-Disposition": f'attachment; filename="{podcast_id}.mp3"',
            "Cache-Control": "public, max-age=86400"
        }
    )


@router.get("/discover/trending")
async def get_trending_topics():
    """Get trending topics from news analysis"""
    # In production, this would analyze real news data
    trending = [
        {"topic": "ELECTION_2027", "count": "2.4K", "trend": "up", "category": "Politics"},
        {"topic": "NAIRA_FOREX", "count": "1.8K", "trend": "up", "category": "Economy"},
        {"topic": "TECH_STARTUPS", "count": "1.2K", "trend": "stable", "category": "Technology"},
        {"topic": "AFCON_2025", "count": "980", "trend": "up", "category": "Sports"},
        {"topic": "CLIMATE_SAHEL", "count": "756", "trend": "down", "category": "Environment"},
        {"topic": "HEALTH_INITIATIVE", "count": "654", "trend": "stable", "category": "Health"},
    ]
    return trending


@router.get("/radio/countries")
async def list_radio_countries():
    """Get list of African countries with radio stations"""
    return get_countries()


@router.get("/radio/stations")
async def list_radio_stations(
    country: str = Query("NG", description="Country code"),
    search: str = Query(None, description="Search by station name"),
    limit: int = Query(20, le=50)
):
    """Get radio stations for a specific African country"""
    return await get_stations(country=country, search=search, limit=limit)
