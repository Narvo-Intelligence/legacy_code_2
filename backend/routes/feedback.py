# Public feedback — story-specific or general app feedback; optional auth attaches user_id.
import logging
import re
from typing import Literal, Optional

from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel, Field, field_validator

from lib.supabase_db import get_supabase_db

logger = logging.getLogger("narvo.feedback")
router = APIRouter(prefix="/api/feedback", tags=["feedback"])

_KIND = Literal["story", "app"]
_CAT = Literal["bug", "idea", "accuracy", "other", "general"]


class FeedbackBody(BaseModel):
    kind: _KIND
    message: str = Field(..., min_length=3, max_length=4000)
    story_id: Optional[str] = Field(None, max_length=128)
    category: Optional[_CAT] = None
    contact_email: Optional[str] = Field(None, max_length=200)
    client_path: Optional[str] = Field(None, max_length=500)

    @field_validator("message", mode="before")
    @classmethod
    def strip_message(cls, v: object) -> object:
        return v.strip() if isinstance(v, str) else v

    @field_validator("story_id", "client_path", mode="before")
    @classmethod
    def strip_optional(cls, v: object) -> object:
        if v is None or not isinstance(v, str):
            return v
        s = v.strip()
        return s or None

    @field_validator("contact_email", mode="before")
    @classmethod
    def clean_email(cls, v: object) -> object:
        if v is None or v == "":
            return None
        if not isinstance(v, str):
            return v
        s = v.strip()
        if not s:
            return None
        if len(s) > 200 or not re.match(r"^[^@\s]+@[^@\s]+\.[^@\s]+$", s):
            raise ValueError("invalid contact_email")
        return s


@router.post("", summary="Submit feedback")
async def post_feedback(request: Request, body: FeedbackBody):
    if body.kind == "story" and not body.story_id:
        raise HTTPException(status_code=400, detail="story_id is required when kind is story")

    user_id = getattr(request.state, "user_id", None)
    ua = (request.headers.get("user-agent") or "")[:500]

    row = {
        "user_id": str(user_id) if user_id else None,
        "kind": body.kind,
        "story_id": body.story_id,
        "category": body.category,
        "message": body.message,
        "contact_email": body.contact_email,
        "client_path": body.client_path,
        "user_agent": ua or None,
    }

    try:
        db = get_supabase_db()
        res = db.table("user_feedback").insert(row).execute()
        inserted = getattr(res, "data", None) or []
        fid = inserted[0].get("id") if inserted and isinstance(inserted[0], dict) else None
        return {"ok": True, "id": fid}
    except Exception as e:
        logger.exception("user_feedback insert failed: %s", e)
        raise HTTPException(
            status_code=503,
            detail="Could not store feedback. If this persists, ensure migration 007_user_feedback.sql is applied.",
        ) from e
