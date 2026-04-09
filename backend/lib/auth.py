"""
Extract user identity from Supabase JWT (Bearer token) for personalized routes.
Frontend api.ts attaches Authorization: Bearer <session.access_token>.
Set SUPABASE_JWT_SECRET (Supabase Dashboard > Project Settings > API > JWT Secret) to verify tokens.
"""

import os
import logging
from functools import lru_cache
from typing import Optional

logger = logging.getLogger("narvo.auth")

def get_supabase_jwt_secret() -> str:
    """Lazily load the Supabase JWT secret from the environment."""
    return os.environ.get("SUPABASE_JWT_SECRET", "").strip()

def get_supabase_url() -> str:
    """Supabase project URL for JWKS discovery when asymmetric signing is enabled."""
    return os.environ.get("SUPABASE_URL", "").strip().rstrip("/")

def get_supabase_jwks_url() -> str:
    base = get_supabase_url()
    if not base:
        return ""
    return f"{base}/auth/v1/.well-known/jwks.json"

@lru_cache(maxsize=4)
def _jwks_client_for_url(jwks_url: str):
    import jwt

    return jwt.PyJWKClient(jwks_url)

def _decode_supabase_token(token: str) -> Optional[dict]:
    """
    Decode Supabase-issued JWTs.

    Supports both:
    - legacy HS* tokens verified by `SUPABASE_JWT_SECRET`
    - asymmetric RS*/ES* tokens verified through Supabase JWKS
    """
    try:
        import jwt
    except Exception as e:
        logger.debug("PyJWT import failed: %s", e)
        return None

    try:
        header = jwt.get_unverified_header(token)
    except Exception as e:
        logger.debug("JWT header parse failed: %s", e)
        return None

    alg = str(header.get("alg") or "").strip()
    secret = get_supabase_jwt_secret()
    jwks_url = get_supabase_jwks_url()

    if secret and alg.startswith("HS"):
        try:
            return jwt.decode(
                token,
                secret,
                algorithms=[alg],
                options={"verify_aud": False, "verify_iss": False},
            )
        except Exception as e:
            logger.debug("HS JWT decode failed: %s", e)

    if jwks_url and alg.startswith(("RS", "ES")):
        try:
            signing_key = _jwks_client_for_url(jwks_url).get_signing_key_from_jwt(token)
            return jwt.decode(
                token,
                signing_key.key,
                algorithms=[alg],
                options={"verify_aud": False, "verify_iss": False},
            )
        except Exception as e:
            logger.debug("JWKS JWT decode failed: %s", e)

    if secret and not alg.startswith("HS"):
        try:
            return jwt.decode(
                token,
                secret,
                algorithms=["HS256"],
                options={"verify_aud": False, "verify_iss": False},
            )
        except Exception as e:
            logger.debug("Fallback HS256 JWT decode failed: %s", e)

    return None

def get_user_id_from_request(request) -> Optional[str]:
    """
    Decode Supabase JWT from Authorization header and return subject (user id).
    Returns None if no header, invalid token, or no configured verifier can validate it.
    """
    headers = getattr(request, "headers", None)
    raw = headers.get("Authorization") if headers else None
    if not raw or not raw.startswith("Bearer "):
        return None
    token = raw[7:].strip()
    if not token:
        return None
    payload = _decode_supabase_token(token)
    if not payload:
        return None
    sub = payload.get("sub")
    return str(sub).strip() if sub else None


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
