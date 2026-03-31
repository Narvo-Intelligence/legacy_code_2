# Admin routes - Operations, Moderation, Voice Management
from fastapi import APIRouter, Query
from typing import List

from services.admin_service import (
    get_system_metrics,
    get_system_alerts,
    get_stream_status,
    get_voice_metrics,
    get_moderation_queue,
    get_moderation_stats,
    get_curation_stories,
    perform_curation_action
)

router = APIRouter(prefix="/api/admin", tags=["admin"])


@router.get("/metrics")
async def admin_metrics():
    """Get real-time system metrics for admin dashboard"""
    return get_system_metrics()


@router.get("/alerts")
async def system_alerts():
    """Get current system alerts"""
    return get_system_alerts()


@router.get("/streams")
async def stream_status():
    """Get status of all active streams"""
    return get_stream_status()


@router.get("/voices")
async def voice_metrics():
    """Get voice synthesis metrics"""
    return get_voice_metrics()


@router.get("/moderation")
async def moderation_queue():
    """Get content moderation queue"""
    return get_moderation_queue()


@router.get("/stats")
async def moderation_stats():
    """Get moderation queue statistics"""
    return get_moderation_stats()


@router.get("/curation/stories")
async def curation_stories():
    """Get stories for editorial curation"""
    return get_curation_stories()


@router.post("/curation/stories/{story_id}/action")
async def curation_action(
    story_id: str,
    action: str = Query(..., regex="^(feature|archive|remove)$")
):
    """Perform curation action on a story"""
    return perform_curation_action(story_id, action)
