# User Service - User preferences, bookmarks, and settings management (Supabase)
from datetime import datetime, timezone
from typing import Dict, List

from lib.supabase_db import get_supabase_db

# Default values (no fabricated interests — empty until onboarding or PUT /api/me/preferences)
DEFAULT_PREFERENCES = {
    "voice_id": "nova",
    "playback_speed": 1.0,
    "categories": [],
    "interests": [],
    "notifications_enabled": True,
    "region": "lagos",
}

# Mirrors server UserSettings defaults so GET /api/settings returns full shape for new users
DEFAULT_SETTINGS = {
    "voice_model": "emma",
    "voice_dialect": "standard",
    "voice_region": "africa",
    "broadcast_language": "en",
    "high_contrast": False,
    "interface_scale": "100%",
    "haptic_sync": True,
    "alert_volume": 70,
    "data_limit": 2.5,
    "bandwidth_priority": "streaming",
    "display_density": "standard",
    "font_scale": 100,
    "gestural_swipe": True,
    "gestural_pinch": False,
    "voice_commands": False,
    "aggregator_mediastack": True,
    "aggregator_newsdata": True,
    "interface_language": "en",
    "theme": "dark",
    "sound_theme": "narvo_classic",
    "interests": [],
    "reduced_motion": False,
}


def _row_to_bookmark(row: dict) -> dict:
    out = {k: v for k, v in row.items() if k not in ("id", "user_id")}
    if "saved_at" in out and hasattr(out["saved_at"], "isoformat"):
        out["saved_at"] = out["saved_at"].isoformat()
    return out


def _row_to_prefs(row: dict) -> dict:
    out = {k: v for k, v in row.items() if k not in ("id", "user_id")}
    if "updated_at" in out and hasattr(out["updated_at"], "isoformat"):
        out["updated_at"] = out["updated_at"].isoformat()
    return out


# Bookmark functions
def get_bookmarks(user_id: str) -> List[Dict]:
    """Get user's saved/bookmarked articles"""
    db = get_supabase_db()
    r = db.table("bookmarks").select("story_id, title, summary, source, category, source_url, saved_at").eq("user_id", user_id).order("saved_at", desc=True).execute()
    rows = r.data or []
    return [_row_to_bookmark(x) for x in rows]


def add_bookmark(user_id: str, bookmark_data: Dict) -> Dict:
    """Save/bookmark an article. Returns status, story_id, and saved_at (from DB)."""
    db = get_supabase_db()
    saved_at = datetime.now(timezone.utc).isoformat()
    doc = {
        "user_id": user_id,
        "story_id": bookmark_data.get("story_id"),
        "title": bookmark_data.get("title"),
        "summary": bookmark_data.get("summary", ""),
        "source": bookmark_data.get("source", ""),
        "category": bookmark_data.get("category"),
        "source_url": bookmark_data.get("source_url"),
        "saved_at": saved_at,
    }
    db.table("bookmarks").upsert(doc, on_conflict="user_id,story_id").execute()
    return {"status": "saved", "story_id": doc["story_id"], "saved_at": saved_at}


def remove_bookmark(user_id: str, story_id: str) -> bool:
    """Remove a saved article"""
    db = get_supabase_db()
    r = db.table("bookmarks").delete().eq("user_id", user_id).eq("story_id", story_id).execute()
    return len(r.data or []) > 0


# Preferences functions
def get_preferences(user_id: str) -> Dict:
    """Get user preferences. Merges with DEFAULT_PREFERENCES so all expected keys are present."""
    db = get_supabase_db()
    r = db.table("user_preferences").select("id, user_id, region, voice, interests, voice_id, playback_speed, categories, notifications_enabled, settings, updated_at").eq("user_id", user_id).limit(1).execute()
    row = (r.data or [None])[0]
    if not row:
        return DEFAULT_PREFERENCES.copy()
    return {**DEFAULT_PREFERENCES, **_row_to_prefs(row)}


def update_preferences(user_id: str, preferences: Dict) -> Dict:
    """Merge partial preference updates into the existing row (never wipe columns)."""
    db = get_supabase_db()
    allowed = {
        "voice_id",
        "voice",
        "playback_speed",
        "categories",
        "interests",
        "notifications_enabled",
        "region",
    }
    patch = {k: v for k, v in (preferences or {}).items() if k in allowed}
    r = (
        db.table("user_preferences")
        .select("region, voice, voice_id, playback_speed, categories, interests, notifications_enabled, settings")
        .eq("user_id", user_id)
        .limit(1)
        .execute()
    )
    row = (r.data or [None])[0]
    base = {**DEFAULT_PREFERENCES}
    if row:
        for k in (
            "region",
            "voice",
            "voice_id",
            "playback_speed",
            "categories",
            "interests",
            "notifications_enabled",
        ):
            if k in row:
                base[k] = row[k]
    merged = {**base, **patch}
    doc = {
        "user_id": user_id,
        "region": merged.get("region"),
        "voice": merged.get("voice"),
        "voice_id": merged.get("voice_id"),
        "playback_speed": merged.get("playback_speed"),
        "categories": merged.get("categories") or [],
        "interests": merged.get("interests") or [],
        "notifications_enabled": bool(merged.get("notifications_enabled", True)),
        "updated_at": datetime.now(timezone.utc).isoformat(),
    }
    if row and row.get("settings") is not None:
        doc["settings"] = row["settings"]
    db.table("user_preferences").upsert(doc, on_conflict="user_id").execute()
    return {"status": "updated"}


# Settings functions
def get_settings(user_id: str) -> Dict:
    """Get user settings"""
    db = get_supabase_db()
    r = db.table("user_preferences").select("settings").eq("user_id", user_id).limit(1).execute()
    row = (r.data or [None])[0]
    if not row or not row.get("settings"):
        return DEFAULT_SETTINGS.copy()
    return {**DEFAULT_SETTINGS, **row["settings"]}


def update_settings(user_id: str, settings: Dict) -> Dict:
    """Update user settings"""
    db = get_supabase_db()
    # Ensure row exists then update settings
    r = db.table("user_preferences").select("id, settings").eq("user_id", user_id).limit(1).execute()
    existing = (r.data or [None])[0]
    merged = {**(existing.get("settings") or {}), **settings} if existing else settings
    doc = {"user_id": user_id, "settings": merged, "updated_at": datetime.now(timezone.utc).isoformat()}
    db.table("user_preferences").upsert(doc, on_conflict="user_id").execute()
    return {"status": "updated"}


# Voice profiles — sourced from YarnGPT service (primary TTS)
def get_voice_profiles() -> List[Dict]:
    """Get available voice profiles from YarnGPT"""
    from services.yarngpt_service import get_voice_profiles as _yarn_profiles
    return _yarn_profiles()
