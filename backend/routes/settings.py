# Compatibility routes for frontend paths: GET/POST /api/settings/{user_id}
# Guest uses DEFAULT_SETTINGS (no DB). Authenticated routes use JWT user id only — path user_id is not trusted.
from typing import Any, Dict

from fastapi import APIRouter, Body, HTTPException, Request

from services.user_service import DEFAULT_SETTINGS, get_settings, update_settings

router = APIRouter(prefix="/api", tags=["me"])


def _require_user(request: Request) -> str:
    uid = getattr(request.state, "user_id", None)
    if not uid:
        raise HTTPException(status_code=401, detail="User not authenticated or invalid session")
    return str(uid)


@router.get("/settings/{user_id}")
async def get_settings_compat(user_id: str, request: Request) -> Dict[str, Any]:
    if user_id == "guest":
        return DEFAULT_SETTINGS.copy()
    uid = _require_user(request)
    return get_settings(uid)


@router.post("/settings/{user_id}")
@router.put("/settings/{user_id}")
async def update_settings_compat(
    user_id: str,
    request: Request,
    body: Dict[str, Any] = Body(default_factory=dict),
) -> Dict[str, Any]:
    if user_id == "guest":
        return {"status": "updated"}
    uid = _require_user(request)
    return update_settings(uid, body)
