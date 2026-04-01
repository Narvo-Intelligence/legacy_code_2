"""
Extract user identity from Supabase JWT (Bearer token) for personalized routes.
Frontend api.ts attaches Authorization: Bearer <session.access_token>.
Set SUPABASE_JWT_SECRET (Supabase Dashboard > Project Settings > API > JWT Secret) to verify tokens.
"""

import os
import logging
from typing import Optional

logger = logging.getLogger("narvo.auth")

_SUPABASE_JWT_SECRET = os.environ.get("SUPABASE_JWT_SECRET", "").strip()


def get_user_id_from_request(request) -> Optional[str]:
    """
    Decode Supabase JWT from Authorization header and return subject (user id).
    Returns None if no header, invalid token, or SUPABASE_JWT_SECRET not set.
    """
    if not _SUPABASE_JWT_SECRET:
        return None
    headers = getattr(request, "headers", None)
    raw = headers.get("Authorization") if headers else None
    if not raw or not raw.startswith("Bearer "):
        return None
    token = raw[7:].strip()
    if not token:
        return None
    try:
        import jwt
        payload = jwt.decode(
            token,
            _SUPABASE_JWT_SECRET,
            algorithms=["HS256"],
            options={"verify_aud": False, "verify_iss": False},
        )
        sub = payload.get("sub")
        return str(sub).strip() if sub else None
    except Exception as e:
        logger.debug("JWT decode failed: %s", e)
        return None


from fastapi import Request

def get_current_user(request: Request) -> str:
    """
    FastAPI dependency to enforce authentication and return user_id.
    Relies on AuthUserMiddleware having already populated request.state.user_id.
    """
    user_id = getattr(request.state, "user_id", None)
    if not user_id:
        from fastapi import HTTPException
        raise HTTPException(status_code=401, detail="User not authenticated or invalid session")
    return str(user_id)
