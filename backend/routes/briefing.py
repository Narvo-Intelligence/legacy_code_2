# Briefing routes — single module for /api/briefing/*
import logging
from typing import Optional
from fastapi import APIRouter, Query, Header, HTTPException, Request, Body, Depends, Response
from pydantic import BaseModel, Field

from lib.supabase_db import get_supabase_db
from lib.gcp_verify import verify_gcp_scheduler
from lib.auth import get_current_user
from services.briefing_service import (
    generate_briefing,
    get_latest_briefing,
    get_briefing_history,
    get_briefing_by_date,
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/briefing", tags=["briefing"])


class BriefingGenerateBody(BaseModel):
    voice_id: str = "emma"
    force_regenerate: bool = False
    user_id: Optional[str] = None
    speaking_rate: float = Field(default=1.0, ge=0.5, le=2.0)
    pitch_semitones: float = Field(default=0.0, ge=-12.0, le=12.0)


async def _generate_morning_briefing_core(
    request: Request,
    voice_id: str,
    force_regenerate: bool,
    user_id: Optional[str],
    speaking_rate: float = 1.0,
    pitch_semitones: float = 0.0,
):
    resolved_user_id = getattr(request.state, "user_id", None) or user_id or None
    try:
        out = await generate_briefing(
            voice_id=voice_id,
            force_regenerate=force_regenerate,
            user_id=resolved_user_id,
            speaking_rate=speaking_rate,
            pitch_semitones=pitch_semitones,
        )
        if out is None:
            raise HTTPException(status_code=404, detail="No stories available for briefing")
        return out
    except HTTPException:
        raise
    except Exception as e:
        logger.error("Briefing generation error: %s", e)
        raise HTTPException(status_code=500, detail=f"Failed to generate briefing: {str(e)}")


@router.get("/generate")
async def generate_morning_briefing(
    request: Request,
    voice_id: str = Query("emma", description="Voice for TTS"),
    force_regenerate: bool = Query(False, description="Force regeneration"),
    user_id: str = Query(None, description="Optional: user ID for personalized briefing (overrides auth)"),
    speaking_rate: float = Query(1.0, ge=0.5, le=2.0, description="TTS speaking rate (fallback providers)"),
    pitch_semitones: float = Query(0.0, ge=-12.0, le=12.0, description="Pitch in semitones (Google TTS fallback)"),
):
    """**Deprecated:** prefer `POST /api/briefing/generate` with JSON body (MVP contract). Same behaviour as POST for backwards compatibility."""
    return await _generate_morning_briefing_core(
        request, voice_id, force_regenerate, user_id, speaking_rate, pitch_semitones
    )


@router.post("/generate")
async def generate_morning_briefing_post(
    request: Request,
    body: BriefingGenerateBody = Body(default_factory=BriefingGenerateBody),
):
    """**Canonical:** generate or retrieve morning briefing with audio. Uses authenticated user when Bearer token present. JSON body: `voice_id`, `force_regenerate`, optional `user_id`, optional `speaking_rate`, `pitch_semitones`."""
    return await _generate_morning_briefing_core(
        request,
        body.voice_id,
        body.force_regenerate,
        body.user_id,
        body.speaking_rate,
        body.pitch_semitones,
    )


@router.get("/latest")
async def get_latest(request: Request, response: Response, user_id: str = Query(None, description="Optional: user ID (overrides auth)")):
    """Get the most recent briefing from database."""
    resolved_user_id = getattr(request.state, "user_id", None) or user_id
    latest = get_latest_briefing(user_id=resolved_user_id)
    if latest:
        response.headers["Cache-Control"] = "private, max-age=300"
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
async def cron_generate_briefing(_: None = Depends(verify_gcp_scheduler)):
    """Called by Google Cloud Scheduler (or QStash legacy) at 5:00 AM to pre-generate the global daily briefing.
    Secured via Google OIDC token or QStash HMAC signature fallback."""
    try:
        out = await generate_briefing(voice_id="emma", force_regenerate=False, user_id=None)
        if out is None:
            raise HTTPException(status_code=404, detail="No stories available for briefing")
        try:
            from services.push_sender import send_briefing_ready_push
            send_briefing_ready_push(briefing_data=out)
        except Exception as push_err:
            logger.warning("Briefing push notification failed (non-fatal): %s", push_err)
        return {"ok": True, "briefing_id": out.get("id"), "date": out.get("date")}
    except HTTPException:
        raise
    except Exception as e:
        logger.error("Briefing cron generation error: %s", e)
        raise HTTPException(status_code=500, detail=str(e))


class BriefingAudioRequest(BaseModel):
    script: str
    voice_id: str = "emma"
    briefing_id: Optional[str] = None
    speaking_rate: float = Field(default=1.0, ge=0.5, le=2.0)
    pitch_semitones: float = Field(default=0.0, ge=-12.0, le=12.0)


@router.post("/audio")
async def generate_audio(body: BriefingAudioRequest = Body(...)):
    """Generate audio for a briefing script. Use when briefing has script but no audio_url.
    If briefing_id is provided, updates the briefing row with the new audio_url."""
    script = (body.script or "").strip()
    voice_id = (body.voice_id or "emma").strip() or "emma"
    briefing_id = (body.briefing_id or "").strip() or None
    if not script:
        raise HTTPException(status_code=400, detail="Script is required")
    try:
        from services.yarngpt_service import generate_tts as yarn_generate_tts, resolve_tts_language_for_voice

        tts_text = script[:4000] if len(script) > 4000 else script
        lang = resolve_tts_language_for_voice(voice_id, "en")
        audio_url = await yarn_generate_tts(
            tts_text,
            voice_id=voice_id,
            language=lang,
            speed=body.speaking_rate,
            pitch_semitones=body.pitch_semitones,
        )
        if not audio_url:
            from services.tts_service import generate_tts_audio

            audio_url = await generate_tts_audio(
                text=tts_text,
                voice_id=voice_id,
                speed=body.speaking_rate,
                pitch_semitones=body.pitch_semitones,
            )
        if not audio_url:
            raise Exception("TTS generation failed")
        if briefing_id:
            db = get_supabase_db()
            db.table("briefings").update({"audio_url": audio_url}).eq("id", briefing_id).execute()
        return {"audio_url": audio_url, "voice_id": voice_id}
    except HTTPException:
        raise
    except Exception as e:
        logger.exception("Briefing audio generation failed: %s", e)
        raise HTTPException(status_code=500, detail="Audio generation failed")


@router.delete("/by-date/{briefing_date}")
async def delete_briefing_by_date(
    briefing_date: str,
    current_user_id: str = Depends(get_current_user),
):
    """Remove the signed-in user's briefing row for that date (Postgres).
    Path is `/by-date/{date}` so DELETE does not collide with GET `/{briefing_date}` in the router (avoids 405)."""
    db = get_supabase_db()
    r = (
        db.table("briefings")
        .delete()
        .eq("date", briefing_date)
        .eq("user_id", str(current_user_id))
        .execute()
    )
    deleted = r.data if isinstance(r.data, list) else []
    if not deleted:
        raise HTTPException(status_code=404, detail="Briefing not found or not owned by this user")
    return {"status": "ok", "date": briefing_date}


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
