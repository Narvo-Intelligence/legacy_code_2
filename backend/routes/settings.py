# Settings & subscription routes
import logging
from typing import List, Optional
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api", tags=["settings"])


class UserSettings(BaseModel):
    voice_model: str = "emma"
    voice_dialect: str = "standard"
    voice_region: str = "africa"
    high_contrast: bool = False
    interface_scale: str = "100%"
    haptic_sync: bool = True
    alert_volume: int = 70
    data_limit: float = 2.5
    bandwidth_priority: str = "streaming"
    display_density: str = "standard"
    font_scale: int = 100
    gestural_swipe: bool = True
    gestural_pinch: bool = False
    voice_commands: bool = False
    broadcast_language: str = "en"
    aggregator_mediastack: bool = True
    aggregator_newsdata: bool = True
    interface_language: str = "en"
    theme: str = "dark"
    sound_theme: str = "narvo_classic"
    interests: List[str] = []


class SubscriptionUpdate(BaseModel):
    tier: str = "free"
    status: Optional[str] = "active"
    ends_at: Optional[str] = None
    external_id: Optional[str] = None


# ── Settings ─────────────────────────────────────────

@router.get("/settings/{user_id}")
async def get_user_settings(user_id: str):
    from services.user_service import get_settings
    return get_settings(user_id)


@router.post("/settings/{user_id}")
async def save_user_settings(user_id: str, settings: UserSettings):
    from services.user_service import update_settings
    update_settings(user_id, settings.model_dump(exclude_unset=True))
    return {"status": "success", "message": "Settings saved"}


@router.get("/settings/{user_id}/voice")
async def get_voice_settings(user_id: str):
    from services.user_service import get_settings
    s = get_settings(user_id)
    return {"voice_model": s.get("voice_model", "emma"), "voice_dialect": s.get("voice_dialect", "standard"), "voice_region": s.get("voice_region", "africa")}


@router.post("/settings/{user_id}/voice")
async def save_voice_settings(user_id: str, voice_model: str = "emma", voice_dialect: str = "standard", voice_region: str = "africa"):
    from services.user_service import update_settings
    update_settings(user_id, {"voice_model": voice_model, "voice_dialect": voice_dialect, "voice_region": voice_region})
    return {"status": "success", "message": "Voice settings saved"}


# ── Subscriptions ────────────────────────────────────

@router.get("/subscription/{user_id}")
async def get_subscription(user_id: str):
    from services.subscription_service import get_subscription as get_sub
    sub = get_sub(user_id)
    if not sub:
        return {"tier": "free", "status": "active", "started_at": None, "ends_at": None}
    return sub


@router.put("/subscription/{user_id}")
async def update_subscription(user_id: str, body: SubscriptionUpdate):
    from services.subscription_service import upsert_subscription
    try:
        return upsert_subscription(user_id, tier=body.tier, status=body.status or "active", ends_at=body.ends_at, external_id=body.external_id)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.delete("/subscription/{user_id}")
async def delete_subscription(user_id: str):
    from services.subscription_service import delete_subscription as delete_sub
    deleted = delete_sub(user_id)
    return {"status": "success", "deleted": deleted, "tier": "free"}


@router.post("/subscription/{user_id}/cancel")
async def cancel_subscription(user_id: str):
    from services.subscription_service import cancel_subscription as cancel_sub
    sub = cancel_sub(user_id)
    if not sub:
        return {"tier": "free", "status": "cancelled"}
    return sub
