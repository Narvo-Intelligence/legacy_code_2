# Secured cron hooks (GCP Scheduler OIDC or QStash / legacy secret).
import logging

from fastapi import APIRouter, Depends, Query

from lib.gcp_verify import verify_gcp_scheduler

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/cron", tags=["cron"])


@router.post("/morning-briefing-push")
async def cron_morning_briefing_push(_: None = Depends(verify_gcp_scheduler)):
    """
    Send 5 AM-style briefing-ready web push to all registered subscribers.
    Schedule in GCP Cloud Scheduler or QStash for 05:00 Africa/Lagos (or your market).
    """
    from services.briefing_service import get_latest_briefing
    from services.push_sender import send_briefing_ready_push

    briefing = get_latest_briefing()
    sent = send_briefing_ready_push(briefing)
    logger.info("[cron] morning-briefing-push sent=%s", sent)
    return {"ok": True, "sent": sent, "briefing_date": (briefing or {}).get("date")}


@router.get("/morning-briefing-push/health")
async def cron_morning_push_health():
    """Lightweight probe (no auth) — returns whether VAPID is configured."""
    import os
    return {"vapid_configured": bool(os.environ.get("VAPID_PRIVATE_KEY", "").strip())}


@router.post("/tts-cache-cleanup")
async def cron_tts_cache_cleanup(
    days: int = Query(30, ge=7, le=365, description="Delete rows older than this many days"),
    _: None = Depends(verify_gcp_scheduler),
):
    """
    Remove stale tts_cache entries. Schedule weekly via GCP Scheduler or QStash.
    """
    from services.tts_cache_cleanup import delete_tts_cache_older_than_days

    deleted = delete_tts_cache_older_than_days(days)
    return {"ok": True, "deleted_rows": deleted, "older_than_days": days}
