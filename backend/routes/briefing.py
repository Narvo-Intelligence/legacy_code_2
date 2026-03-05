# Briefing routes — single module for /api/briefing/*
import os
import logging
from fastapi import APIRouter, Query, Header, HTTPException, Request

from services.briefing_service import (
    generate_briefing,
    get_latest_briefing,
    get_briefing_history,
    get_briefing_by_date,
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/briefing", tags=["briefing"])

BRIEFING_CRON_SECRET = os.environ.get("BRIEFING_CRON_SECRET", os.environ.get("QSTASH_CRON_SECRET", ""))


def _verify_cron_request(authorization: str = None, x_cron_secret: str = None) -> bool:
    """Verify cron trigger (QStash or internal). Expects Bearer <secret> or X-Cron-Secret header."""
    secret = (x_cron_secret or "").strip() or (authorization or "").replace("Bearer", "").strip()
    return bool(BRIEFING_CRON_SECRET and secret and secret == BRIEFING_CRON_SECRET)


@router.get("/generate")
async def generate_morning_briefing(
    request: Request,
    voice_id: str = Query("emma", description="Voice for TTS"),
    force_regenerate: bool = Query(False, description="Force regeneration"),
    user_id: str = Query(None, description="Optional: user ID for personalized briefing (overrides auth)"),
):
    """Generate or retrieve morning briefing with audio. Uses authenticated user when Bearer token present."""
    resolved_user_id = getattr(request.state, "user_id", None) or user_id or None
    try:
        out = await generate_briefing(
            voice_id=voice_id,
            force_regenerate=force_regenerate,
            user_id=resolved_user_id,
        )
        if out is None:
            raise HTTPException(status_code=404, detail="No stories available for briefing")
        return out
    except HTTPException:
        raise
    except Exception as e:
        logger.error("Briefing generation error: %s", e)
        raise HTTPException(status_code=500, detail=f"Failed to generate briefing: {str(e)}")


@router.get("/latest")
async def get_latest(request: Request, user_id: str = Query(None, description="Optional: user ID (overrides auth)")):
    """Get the most recent briefing from database."""
    resolved_user_id = getattr(request.state, "user_id", None) or user_id
    latest = get_latest_briefing(user_id=resolved_user_id)
    if latest:
        return latest
    raise HTTPException(status_code=404, detail="No briefing available. Generate one first.")


@router.get("/history")
async def get_history(
    request: Request,
    limit: int = Query(30, le=90, description="Number of briefings to return"),
    skip: int = Query(0, description="Number to skip for pagination"),
    user_id: str = Query(None, description="Optional: user ID (overrides auth)"),
):
    """Get historical briefings list."""
    resolved_user_id = getattr(request.state, "user_id", None) or user_id
    return get_briefing_history(limit=limit, skip=skip, user_id=resolved_user_id)


@router.post("/cron")
async def cron_generate_briefing(
    authorization: str = Header(None, alias="Authorization"),
    x_cron_secret: str = Header(None, alias="X-Cron-Secret"),
):
    """Called by Upstash QStash (or cron) at 5:00 AM to pre-generate the global daily briefing.
    Set BRIEFING_CRON_SECRET or QSTASH_CRON_SECRET and pass it as Bearer token or X-Cron-Secret.
    After success, sends push notification to subscribers."""
    if not _verify_cron_request(authorization=authorization, x_cron_secret=x_cron_secret):
        raise HTTPException(status_code=401, detail="Invalid or missing cron secret")
    try:
        out = await generate_briefing(voice_id="emma", force_regenerate=False, user_id=None)
        if out is None:
            raise HTTPException(status_code=404, detail="No stories available for briefing")
        try:
            from services.push_sender import send_briefing_ready_push
            send_briefing_ready_push()
        except Exception as push_err:
            logger.warning("Briefing push notification failed (non-fatal): %s", push_err)
        return {"ok": True, "briefing_id": out.get("id"), "date": out.get("date")}
    except HTTPException:
        raise
    except Exception as e:
        logger.error("Briefing cron generation error: %s", e)
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/{briefing_date}")
async def get_by_date(
    request: Request,
    briefing_date: str,
    user_id: str = Query(None, description="Optional: user ID (overrides auth)"),
):
    """Get a specific briefing by date (YYYY-MM-DD)."""
    resolved_user_id = getattr(request.state, "user_id", None) or user_id
    briefing = get_briefing_by_date(briefing_date, user_id=resolved_user_id)
    if not briefing:
        raise HTTPException(status_code=404, detail=f"No briefing found for {briefing_date}")
    return briefing


@router.post("/audio")
async def generate_audio(
    script: str = Query(..., description="Briefing script text"),
    voice_id: str = Query("emma", description="Voice for TTS"),
):
    """Generate audio for a custom briefing script (YarnGPT TTS)."""
    try:
        from services.yarngpt_service import generate_tts as yarn_generate_tts
        tts_text = script[:4000] if len(script) > 4000 else script
        audio_url = await yarn_generate_tts(text=tts_text, voice_id=voice_id, language="en")
        if not audio_url:
            raise Exception("TTS generation failed")
        return {"audio_url": audio_url, "voice_id": voice_id}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Audio generation failed: {str(e)}")
