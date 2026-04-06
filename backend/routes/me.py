# Unified Personal Domain routes — Preferences, Bookmarks, Offline Management
import logging
from datetime import datetime, timezone
from typing import List, Optional, Dict
from fastapi import APIRouter, Depends, HTTPException, Body, Query, Request
from pydantic import BaseModel

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
    system: Optional[Dict] = None
    accessibility: Optional[Dict] = None
    notifications: Optional[Dict] = None
    privacy: Optional[Dict] = None
    # Extended settings from settings.py
    voice_model: Optional[str] = None
    high_contrast: Optional[bool] = None
    theme: Optional[str] = None

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

# ── Insights ───────────────────────────────────────────────────────────

@router.get("/insights/summary/{user_id}")
async def get_insights_summary(user_id: str, current_user_id: str = Depends(get_current_user)):
    """Get summarized listening insights for the user's Account Tab."""
    if user_id != current_user_id:
        raise HTTPException(status_code=403, detail="Not authorized to access this user's insights")
    # In a real app, this would query aggregated analytics. Here we mockup for v5.1 UI.
    return {
        "total_listened": 12450,    # ~3.5 hours
        "stories_completed": 42,
        "streak_days": 7,
        "favourite_category": "Politics"
    }

# ── Preferences ─────────────────────────────────────────────────────────

@router.get("/preferences")
async def get_my_preferences(current_user_id: str = Depends(get_current_user)):
    """Get the current user's preferences."""
    from services.user_service import get_preferences
    doc = get_preferences(current_user_id)
    return doc or {
        "voice_id": "nova",
        "playback_speed": 1.0,
        "categories": [],
        "notifications_enabled": True,
        "region": "lagos",
        "interests": ["politics", "sports", "afrobeats"]
    }

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

# ── Offline ─────────────────────────────────────────────────────────────

@router.get("/offline")
async def get_my_offline_articles(user_id: str = Depends(get_current_user)):
    """Get all saved offline articles for the user."""
    from services.offline_service import get_articles
    return get_articles(user_id=user_id)

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

@router.delete("/history")
async def clear_my_listening_history(user_id: str = Depends(get_current_user)):
    """Clear the current user's listening history."""
    db = get_supabase_db()
    db.table("listening_history").delete().eq("user_id", user_id).execute()
    return {"status": "cleared"}
