# Unified Personal Domain routes — Preferences, Bookmarks, Offline Management
import logging
import uuid as uuid_lib
from collections import Counter
from datetime import datetime, timezone, timedelta
from typing import List, Optional, Dict
from fastapi import APIRouter, Depends, HTTPException, Body, Query, Request
from pydantic import BaseModel, ConfigDict

from lib.auth import get_current_user
from lib.supabase_db import get_supabase_db

logger = logging.getLogger("narvo.me")
router = APIRouter(prefix="/api/me", tags=["me"])

# ── Models ──────────────────────────────────────────────────────────────

class BookmarkRequest(BaseModel):
    story_id: str
    title: str
    summary: str = ""
    source: str = ""
    category: str = "General"
    source_url: str = ""

class UserPreferences(BaseModel):
    id: Optional[str] = None
    user_id: Optional[str] = None
    voice_id: str = "nova"
    voice: Optional[str] = None  # Legacy support
    playback_speed: float = 1.0
    categories: List[str] = []
    notifications_enabled: bool = True
    region: str = "lagos"
    interests: List[str] = []
    updated_at: Optional[str] = None

class UserSettings(BaseModel):
    model_config = ConfigDict(extra="allow")

    system: Optional[Dict] = None
    accessibility: Optional[Dict] = None
    notifications: Optional[Dict] = None
    privacy: Optional[Dict] = None
    # Extended flat settings keys (persisted in `user_preferences.settings` JSON)
    voice_model: Optional[str] = None
    high_contrast: Optional[bool] = None
    theme: Optional[str] = None
    broadcast_language: Optional[str] = None
    haptic_sync: Optional[bool] = None
    reduced_motion: Optional[bool] = None
    font_scale: Optional[int] = None
    display_density: Optional[str] = None
    article_font_preset: Optional[str] = None
    reading_scope: Optional[str] = None
    # Briefing / TTS synthesis (stored in settings JSON; applied when generating briefing audio)
    tts_speaking_rate: Optional[float] = None
    tts_pitch_semitones: Optional[float] = None

class OfflineArticle(BaseModel):
    story_id: str
    title: str
    summary: Optional[str] = ""
    narrative: Optional[str] = ""
    source: Optional[str] = ""
    category: Optional[str] = "General"
    image_url: Optional[str] = None

class UserPushSubscriptionRequest(BaseModel):
    endpoint: str
    keys: Optional[dict] = None
    expirationTime: Optional[str] = None

    class Config:
        extra = "allow"


class SubscriptionCheckoutBody(BaseModel):
    """Optional Stripe Price id; defaults to STRIPE_PRICE_ID_PRO env."""
    price_id: Optional[str] = None


class ListeningHistoryAppend(BaseModel):
    """Append one play/completion row (client calls on track end)."""
    track_id: str = ""
    title: str = ""
    source: str = ""
    category: str = ""
    duration: int = 0

# ── Insights ───────────────────────────────────────────────────────────

def _listening_insights_from_rows(rows: List[dict]) -> dict:
    """Aggregate listening_history rows for summary API (matches legacy response keys)."""
    if not rows:
        return {
            "total_listened": 0,
            "stories_completed": 0,
            "streak_days": 0,
            "favourite_category": "—",
        }
    total_duration = sum(int(x.get("duration") or 0) for x in rows)
    distinct_tracks = {x.get("track_id") for x in rows if x.get("track_id")}
    stories_completed = len(distinct_tracks) if distinct_tracks else len(rows)
    cat_counts = Counter(
        ((x.get("category") or "").strip() or "General") for x in rows
    )
    favourite = cat_counts.most_common(1)[0][0] if cat_counts else "—"

    daily_counts: dict = {}
    now = datetime.now(timezone.utc)
    for x in rows:
        pa = x.get("played_at")
        if pa is None:
            continue
        if hasattr(pa, "isoformat"):
            day = pa.isoformat()[:10]
        else:
            day = str(pa)[:10]
        if len(day) >= 10:
            daily_counts[day] = daily_counts.get(day, 0) + 1

    streak = 0
    for i in range(366):
        d = (now - timedelta(days=i)).strftime("%Y-%m-%d")
        if d in daily_counts:
            streak += 1
        else:
            break

    return {
        "total_listened": int(total_duration),
        "stories_completed": int(stories_completed),
        "streak_days": int(streak),
        "favourite_category": favourite,
    }


@router.get("/insights/summary/{user_id}")
async def get_insights_summary(user_id: str, current_user_id: str = Depends(get_current_user)):
    """Summarized listening metrics from `listening_history` (same source as `/api/me/history`)."""
    if user_id != current_user_id:
        raise HTTPException(status_code=403, detail="Not authorized to access this user's insights")
    db = get_supabase_db()
    r = (
        db.table("listening_history")
        .select("category, track_id, played_at, duration")
        .eq("user_id", user_id)
        .order("played_at", desc=True)
        .limit(500)
        .execute()
    )
    return _listening_insights_from_rows(list(r.data or []))

# ── Preferences ─────────────────────────────────────────────────────────

@router.get("/preferences")
async def get_my_preferences(current_user_id: str = Depends(get_current_user)):
    """Get the current user's preferences from `user_preferences` (merged server defaults)."""
    from services.user_service import get_preferences

    return get_preferences(current_user_id)

@router.put("/preferences")
@router.post("/preferences")  # Support both for compatibility during transition
async def update_my_preferences(
    preferences: UserPreferences,
    current_user_id: str = Depends(get_current_user)
):
    """Update the current user's preferences."""
    from services.user_service import update_preferences
    return update_preferences(current_user_id, preferences.model_dump(exclude_unset=True))

# ── Settings ────────────────────────────────────────────────────────────

@router.get("/settings")
async def get_my_settings(user_id: str = Depends(get_current_user)):
    """Get the current user's settings."""
    from services.user_service import get_settings
    return get_settings(user_id)

@router.put("/settings")
@router.post("/settings")
async def update_my_settings(
    settings: UserSettings,
    user_id: str = Depends(get_current_user)
):
    """Update the current user's settings."""
    from services.user_service import update_settings
    return update_settings(user_id, settings.model_dump(exclude_unset=True))


@router.get("/profile")
async def get_my_profile(
    history_limit: int = Query(20, ge=1, le=100),
    user_id: str = Depends(get_current_user),
):
    """Bundled profile: preferences, settings highlights, listening preview, library counts."""
    from services.user_service import get_profile_summary

    return get_profile_summary(user_id, history_limit)


# ── Bookmarks ───────────────────────────────────────────────────────────

@router.get("/bookmarks")
async def get_my_bookmarks(user_id: str = Depends(get_current_user)):
    """Get the current user's saved/bookmarked articles."""
    from services.user_service import get_bookmarks
    return get_bookmarks(user_id)

@router.post("/bookmarks")
async def add_my_bookmark(
    bookmark: BookmarkRequest,
    user_id: str = Depends(get_current_user)
):
    """Save/bookmark an article."""
    from services.user_service import add_bookmark
    try:
        out = add_bookmark(user_id, bookmark.model_dump())
        return {
            "status": "ok",
            "bookmark": {
                **bookmark.model_dump(),
                "saved_at": out.get("saved_at", datetime.now(timezone.utc).isoformat())
            }
        }
    except Exception as e:
        logger.error(f"Failed to add bookmark: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/bookmarks/{story_id}")
async def remove_my_bookmark(
    story_id: str,
    user_id: str = Depends(get_current_user)
):
    """Remove a saved article."""
    from services.user_service import remove_bookmark
    if not remove_bookmark(user_id, story_id):
        raise HTTPException(status_code=404, detail="Bookmark not found")
    return {"status": "ok", "story_id": story_id}


@router.get("/recommendations")
async def get_my_recommendations(
    limit: int = Query(16, ge=1, le=40),
    current_user_id: str = Depends(get_current_user),
):
    """Personalized story list (same engine as morning briefing picks). Requires Bearer JWT."""
    from services.news_service import get_cached_all_news, deduplicate_by_title
    from services.recommendation_service import get_recommendations

    all_news = await get_cached_all_news()
    try:
        from services.aggregator_service import get_normalized_aggregator_news

        agg = await get_normalized_aggregator_news()
        all_news = deduplicate_by_title(list(all_news) + list(agg))
    except Exception as ex:
        logger.debug("Aggregator merge for /me/recommendations: %s", ex)
        all_news = list(all_news)
    all_news.sort(key=lambda x: str(x.get("published") or ""), reverse=True)

    result = await get_recommendations(str(current_user_id), all_news, limit=limit)
    recs = result.get("recommendations") or []
    strategy = result.get("strategy") or "trending_fallback"
    drop = frozenset({"cluster_articles", "recommendation_score"})
    out = []
    for n in recs:
        if not isinstance(n, dict):
            continue
        out.append({k: v for k, v in n.items() if k not in drop})
    return {"recommendations": out, "strategy": str(strategy)}


# ── Offline ─────────────────────────────────────────────────────────────

@router.get("/offline")
async def get_my_offline_articles(user_id: str = Depends(get_current_user)):
    """Get all saved offline articles for the user."""
    from services.offline_service import get_articles
    return get_articles(user_id=user_id)


@router.get("/offline/stats")
async def get_my_offline_stats(user_id: str = Depends(get_current_user)):
    """Count of cloud-synced offline rows (per user). Client adds IndexedDB audio size."""
    from services.offline_service import get_stats
    return get_stats(user_id=user_id)


@router.post("/offline")
async def save_my_article_offline(
    article: OfflineArticle,
    user_id: str = Depends(get_current_user)
):
    """Save an article for offline reading."""
    from services.offline_service import save_article
    try:
        return save_article(article.model_dump(), user_id=user_id)
    except Exception as e:
        logger.error(f"Failed to save offline article: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to save article: {str(e)}")

@router.delete("/offline/{story_id}")
async def remove_my_offline_article(
    story_id: str,
    user_id: str = Depends(get_current_user)
):
    """Remove a specific article from offline storage."""
    from services.offline_service import remove_article
    if not remove_article(story_id, user_id=user_id):
        raise HTTPException(status_code=404, detail="Article not found")
    return {"status": "deleted", "story_id": story_id}

@router.delete("/offline")
async def clear_my_offline_articles(user_id: str = Depends(get_current_user)):
    """Clear all saved offline articles for the user."""
    from services.offline_service import clear_all_articles
    deleted_count = clear_all_articles(user_id=user_id)
    return {"status": "cleared", "deleted_count": deleted_count}

# ── Paid subscription (Stripe) ───────────────────────────────────────────

@router.get("/subscription")
async def get_my_subscription(current_user_id: str = Depends(get_current_user)):
    """Current tier from user_subscriptions (implicit free when no row)."""
    from services.subscription_service import get_subscription

    sub = get_subscription(str(current_user_id))
    if not sub:
        return {"tier": "free", "status": "active", "subscription": None}
    return {
        "tier": sub.get("tier", "free"),
        "status": sub.get("status", "active"),
        "subscription": sub,
    }


@router.post("/subscription/checkout")
async def create_subscription_checkout(
    body: SubscriptionCheckoutBody,
    current_user_id: str = Depends(get_current_user),
):
    """Returns Stripe Checkout URL when STRIPE_SECRET_KEY and price are configured."""
    import os
    import stripe

    secret = os.environ.get("STRIPE_SECRET_KEY", "").strip()
    price = (body.price_id or os.environ.get("STRIPE_PRICE_ID_PRO", "")).strip()
    raw_site = os.environ.get("PUBLIC_SITE_URL", "").strip()
    if not raw_site:
        fe = os.environ.get("FRONTEND_ORIGIN", "http://localhost:3000").split(",")[0].strip()
        raw_site = fe
    site = raw_site.rstrip("/")
    if not secret or not price:
        raise HTTPException(
            status_code=503,
            detail="Billing is not configured (set STRIPE_SECRET_KEY and STRIPE_PRICE_ID_PRO)",
        )
    stripe.api_key = secret
    session = stripe.checkout.Session.create(
        mode="subscription",
        client_reference_id=str(current_user_id),
        line_items=[{"price": price, "quantity": 1}],
        success_url=f"{site}/settings?tab=billing&billing=success",
        cancel_url=f"{site}/settings?tab=billing",
        metadata={"user_id": str(current_user_id)},
        subscription_data={"metadata": {"user_id": str(current_user_id)}},
    )
    url = getattr(session, "url", None)
    if not url:
        raise HTTPException(status_code=500, detail="Checkout session missing URL")
    return {"url": url}


@router.post("/subscription/portal")
async def create_billing_portal(current_user_id: str = Depends(get_current_user)):
    """Stripe Customer Portal when stripe_customer_id exists."""
    import os
    import stripe
    from services.subscription_service import get_subscription

    secret = os.environ.get("STRIPE_SECRET_KEY", "").strip()
    raw_site = os.environ.get("PUBLIC_SITE_URL", "http://localhost:3000").split(",")[0].strip()
    site = raw_site.rstrip("/")
    if not secret:
        raise HTTPException(status_code=503, detail="Billing is not configured")
    sub = get_subscription(str(current_user_id))
    cust = (sub or {}).get("stripe_customer_id")
    if not cust:
        raise HTTPException(status_code=400, detail="No billing account yet — subscribe first")
    stripe.api_key = secret
    session = stripe.billing_portal.Session.create(
        customer=str(cust),
        return_url=f"{site}/settings?tab=billing",
    )
    url = getattr(session, "url", None)
    if not url:
        raise HTTPException(status_code=500, detail="Portal session missing URL")
    return {"url": url}


# ── Push Subscriptions ──────────────────────────────────────────────────

@router.post("/push")
async def subscribe_my_push(
    body: UserPushSubscriptionRequest,
    user_id: str = Depends(get_current_user)
):
    """Save Web Push subscription for the current user."""
    endpoint = (body.endpoint or "").strip()
    if not endpoint:
        raise HTTPException(status_code=400, detail="Missing endpoint in subscription")

    db = get_supabase_db()
    db.table("user_push_subscriptions").upsert(
        {
            "user_id": str(user_id),
            "endpoint": endpoint,
            "subscription_data": body.model_dump(),
        },
        on_conflict="user_id,endpoint",
    ).execute()
    return {"status": "success", "message": "Subscription active"}

# ── Listening History ───────────────────────────────────────────────────

@router.get("/history")
async def get_my_listening_history(
    limit: int = Query(20, ge=1, le=100),
    user_id: str = Depends(get_current_user)
):
    """Get the current user's listening history."""
    db = get_supabase_db()
    r = db.table("listening_history")\
          .select("*")\
          .eq("user_id", user_id)\
          .order("played_at", desc=True)\
          .limit(limit)\
          .execute()
    
    return r.data or []


@router.post("/history")
async def append_my_listening_history(
    row: ListeningHistoryAppend,
    user_id: str = Depends(get_current_user),
):
    """Record a completed (or ended) listen for recommendations and history surfaces."""
    tid = (row.track_id or "").strip()[:512]
    if not tid:
        raise HTTPException(status_code=400, detail="track_id required")
    db = get_supabase_db()
    payload = {
        "user_id": user_id,
        "track_id": tid,
        "title": (row.title or "")[:500] or "Untitled",
        "source": (row.source or "")[:200],
        "category": (row.category or "")[:100],
        "duration": max(0, min(int(row.duration or 0), 86400)),
    }
    try:
        db.table("listening_history").insert(payload).execute()
    except Exception as e:
        logger.warning("listening_history insert failed: %s", e)
        raise HTTPException(status_code=500, detail="Could not save listen") from e
    return {"status": "ok"}


@router.delete("/history")
async def clear_my_listening_history(user_id: str = Depends(get_current_user)):
    """Clear the current user's listening history."""
    db = get_supabase_db()
    db.table("listening_history").delete().eq("user_id", user_id).execute()
    return {"status": "cleared"}


@router.delete("/history/{entry_id}")
async def delete_my_listening_history_row(
    entry_id: str,
    user_id: str = Depends(get_current_user),
):
    """Remove one history row by primary key (must belong to the current user)."""
    eid = entry_id.strip()
    try:
        uuid_lib.UUID(eid)
    except ValueError as e:
        raise HTTPException(status_code=400, detail="Invalid entry id") from e
    db = get_supabase_db()
    exists = (
        db.table("listening_history")
        .select("id")
        .eq("id", eid)
        .eq("user_id", user_id)
        .limit(1)
        .execute()
    )
    if not (exists.data or []):
        raise HTTPException(status_code=404, detail="History entry not found")
    db.table("listening_history").delete().eq("id", eid).eq("user_id", user_id).execute()
    return {"status": "ok", "id": eid}
