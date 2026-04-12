# Notification routes — push subscribe/unsubscribe/digest
import logging
from datetime import datetime, timezone
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional

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
    """Legacy unauthenticated write path — disabled in favor of `/api/me/push`."""
    logger.warning("Legacy push subscribe blocked for endpoint=%s", (data.endpoint or "")[:80])
    raise HTTPException(
        status_code=410,
        detail="Legacy push subscription is disabled. Use the authenticated /api/me/push endpoint instead.",
    )


@router.post("/unsubscribe")
async def unsubscribe_push(data: PushUnsubscribeRequest):
    """Legacy unauthenticated delete path — disabled in favor of `/api/me/push`."""
    logger.warning("Legacy push unsubscribe blocked for endpoint=%s", (data.endpoint or "")[:80])
    raise HTTPException(
        status_code=410,
        detail="Legacy push unsubscription is disabled. Use the authenticated /api/me/push endpoint instead.",
    )


@router.get("/digest")
async def get_daily_digest():
    """Get daily digest content for push notification."""
    from services.news_service import fetch_all_news
    all_news = await fetch_all_news(limit=5)
    stories = [{"id": s.get("id"), "title": s.get("title"), "category": s.get("category"), "source": s.get("source")} for s in all_news[:5]]
    return {"title": "NARVO DAILY DIGEST", "top_stories": stories, "briefing_available": True, "generated_at": datetime.now(timezone.utc).isoformat()}
