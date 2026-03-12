# Content routes — bookmarks, preferences, listening history, recommendations
import logging
from datetime import datetime, timezone
from typing import List
from fastapi import APIRouter, Query
from pydantic import BaseModel

from lib.supabase_db import get_supabase_db

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api", tags=["content"])


class BookmarkRequest(BaseModel):
    user_id: str
    story_id: str
    title: str
    summary: str = ""
    source: str = ""
    category: str = "General"
    source_url: str = ""
    saved_at: str = ""


class UserPreferencesRequest(BaseModel):
    user_id: str
    region: str = "lagos"
    voice: str = "pidgin"
    interests: List[str] = []


class ListeningHistoryRequest(BaseModel):
    user_id: str = "guest"
    track_id: str = ""
    title: str = "Unknown"
    source: str = ""
    category: str = ""
    duration: int = 0


# ── Bookmarks ────────────────────────────────────────

@router.post("/bookmarks")
async def add_bookmark(request: BookmarkRequest):
    from services.user_service import add_bookmark as _add
    bookmark_data = {"story_id": request.story_id, "title": request.title, "summary": request.summary,
                     "source": request.source, "category": request.category, "source_url": request.source_url}
    out = _add(request.user_id, bookmark_data)
    return {"status": "ok", "bookmark": {**bookmark_data, "saved_at": out.get("saved_at", datetime.now(timezone.utc).isoformat())}}


@router.get("/bookmarks")
async def get_bookmarks(user_id: str = Query(..., description="User ID")):
    from services.user_service import get_bookmarks as _get
    return _get(user_id)


@router.delete("/bookmarks/{story_id}")
async def remove_bookmark(story_id: str, user_id: str = Query(..., description="User ID")):
    from services.user_service import remove_bookmark as _remove
    _remove(user_id, story_id)
    return {"status": "ok"}


# ── Preferences ──────────────────────────────────────

@router.post("/preferences")
async def save_preferences(request: UserPreferencesRequest):
    from services.user_service import update_preferences
    update_preferences(request.user_id, {"region": request.region, "voice": request.voice, "interests": request.interests})
    return {"status": "ok", "preferences": {"region": request.region, "voice": request.voice, "interests": request.interests}}


@router.get("/preferences")
async def get_preferences(user_id: str = Query(..., description="User ID")):
    from services.user_service import get_preferences as _get
    doc = _get(user_id)
    return doc or {"region": "lagos", "voice": "pidgin", "interests": ["politics", "sports", "afrobeats"]}


# ── Listening History ────────────────────────────────

@router.post("/listening-history")
async def add_listening_history(data: ListeningHistoryRequest):
    db = get_supabase_db()
    entry = {"user_id": data.user_id, "track_id": data.track_id, "title": data.title,
             "source": data.source, "category": data.category, "duration": data.duration,
             "played_at": datetime.now(timezone.utc).isoformat()}
    db.table("listening_history").insert(entry).execute()
    return {"status": "ok"}


@router.get("/listening-history/{user_id}")
async def get_listening_history(user_id: str, limit: int = Query(20, ge=1, le=100)):
    db = get_supabase_db()
    r = db.table("listening_history").select("id, user_id, track_id, title, source, category, duration, played_at").eq("user_id", user_id).order("played_at", desc=True).limit(limit).execute()
    items = []
    for x in r.data or []:
        row = dict(x)
        if row.get("played_at") and hasattr(row["played_at"], "isoformat"):
            row["played_at"] = row["played_at"].isoformat()
        items.append(row)
    return items


@router.delete("/listening-history/{user_id}/{entry_id}")
async def delete_listening_history_entry(user_id: str, entry_id: str):
    db = get_supabase_db()
    db.table("listening_history").delete().eq("user_id", user_id).eq("id", entry_id).execute()
    return {"status": "deleted", "id": entry_id}


@router.delete("/listening-history/{user_id}")
async def clear_listening_history(user_id: str):
    db = get_supabase_db()
    db.table("listening_history").delete().eq("user_id", user_id).execute()
    return {"status": "cleared", "user_id": user_id}


# ── Recommendations ──────────────────────────────────

@router.get("/recommendations/{user_id}")
async def get_recommendations_endpoint(user_id: str, limit: int = Query(10, ge=1, le=30)):
    from services.recommendation_service import get_recommendations
    from services.news_service import get_cached_all_news
    all_news = await get_cached_all_news()
    try:
        from services.aggregator_service import get_normalized_aggregator_news
        agg_news = await get_normalized_aggregator_news()
        all_news = list(all_news) + list(agg_news)
    except Exception:
        pass
    result = await get_recommendations(user_id, all_news, limit=limit)
    for rec in result.get("recommendations", []):
        rec.pop("_id", None)
    return result
