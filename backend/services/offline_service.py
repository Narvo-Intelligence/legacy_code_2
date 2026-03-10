# Offline Service - Article caching and management (Supabase, per-user)
from datetime import datetime, timezone
from typing import Dict, List, Optional

from lib.supabase_db import get_supabase_db


def _user_id(user_id: Optional[str]) -> str:
    return (user_id or "").strip() or "guest"


def save_article(article_data: Dict, user_id: Optional[str] = None) -> Dict:
    """Save an article for offline reading for a user. Stored in DB for future reference."""
    uid = _user_id(user_id)
    db = get_supabase_db()
    doc = {
        "user_id": uid,
        "story_id": article_data.get("story_id"),
        "title": article_data.get("title"),
        "summary": article_data.get("summary", ""),
        "narrative": article_data.get("narrative", ""),
        "source": article_data.get("source", ""),
        "category": article_data.get("category", "General"),
        "image_url": article_data.get("image_url"),
        "saved_at": datetime.now(timezone.utc).isoformat(),
    }
    db.table("offline_articles").upsert(doc, on_conflict="user_id,story_id").execute()
    return {"status": "saved", "story_id": doc["story_id"]}


def get_articles(user_id: Optional[str] = None) -> List[Dict]:
    """Get all saved offline articles for a user."""
    uid = _user_id(user_id)
    db = get_supabase_db()
    r = (
        db.table("offline_articles")
        .select("story_id, title, summary, narrative, source, category, image_url, saved_at")
        .eq("user_id", uid)
        .order("saved_at", desc=True)
        .execute()
    )
    rows = r.data or []
    return [{k: v for k, v in row.items() if k not in ("id", "user_id")} for row in rows]


def remove_article(story_id: str, user_id: Optional[str] = None) -> bool:
    """Remove a specific article from offline storage for a user."""
    uid = _user_id(user_id)
    db = get_supabase_db()
    r = (
        db.table("offline_articles")
        .delete()
        .eq("user_id", uid)
        .eq("story_id", story_id)
        .execute()
    )
    return len(r.data or []) > 0


def clear_all_articles(user_id: Optional[str] = None) -> int:
    """Clear all saved offline articles for a user."""
    uid = _user_id(user_id)
    db = get_supabase_db()
    count_r = (
        db.table("offline_articles").select("story_id", count="exact").eq("user_id", uid).execute()
    )
    n = count_r.count if getattr(count_r, "count", None) is not None else len(count_r.data or [])
    db.table("offline_articles").delete().eq("user_id", uid).execute()
    return n


def get_stats(user_id: Optional[str] = None) -> Dict:
    """Get offline storage statistics for a user."""
    uid = _user_id(user_id)
    db = get_supabase_db()
    r = (
        db.table("offline_articles")
        .select("story_id", count="exact")
        .eq("user_id", uid)
        .execute()
    )
    count = r.count if getattr(r, "count", None) is not None else len(r.data or [])
    return {
        "article_count": count,
        "audio_note": "Audio caching is managed client-side via IndexedDB",
    }
