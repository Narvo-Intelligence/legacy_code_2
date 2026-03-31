# Notification routes — push subscribe/unsubscribe/digest
import logging
from datetime import datetime, timezone
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional

from lib.supabase_db import get_supabase_db

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/notifications", tags=["notifications"])


class PushSubscriptionRequest(BaseModel):
    endpoint: str
    keys: Optional[dict] = None
    expirationTime: Optional[str] = None
    class Config:
        extra = "allow"


class PushUnsubscribeRequest(BaseModel):
    endpoint: str = ""


@router.post("/subscribe")
async def subscribe_push(data: PushSubscriptionRequest):
    """Store push notification subscription (legacy table, by endpoint)."""
    if not data.endpoint:
        raise HTTPException(status_code=400, detail="Missing endpoint")
    db = get_supabase_db()
    db.table("push_subscriptions").upsert(
        {"endpoint": data.endpoint, "subscription_data": data.model_dump(),
         "subscribed_at": datetime.now(timezone.utc).isoformat()},
        on_conflict="endpoint",
    ).execute()
    return {"status": "subscribed"}


@router.post("/unsubscribe")
async def unsubscribe_push(data: PushUnsubscribeRequest):
    """Remove push notification subscription"""
    if data.endpoint:
        get_supabase_db().table("push_subscriptions").delete().eq("endpoint", data.endpoint).execute()
    return {"status": "unsubscribed"}


@router.get("/digest")
async def get_daily_digest():
    """Get daily digest content for push notification."""
    from services.news_service import fetch_all_news
    all_news = await fetch_all_news(limit=5)
    stories = [{"id": s.get("id"), "title": s.get("title"), "category": s.get("category"), "source": s.get("source")} for s in all_news[:5]]
    return {"title": "NARVO DAILY DIGEST", "top_stories": stories, "briefing_available": True, "generated_at": datetime.now(timezone.utc).isoformat()}
