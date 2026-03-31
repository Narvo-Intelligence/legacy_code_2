"""
Google Cloud Scheduler OIDC verification for Narvo backend.
Verifies that an incoming request carries a valid Google-signed OIDC token
with the correct audience (Narvo API URL).
"""
import os
import logging
from typing import Optional
from fastapi import Header, HTTPException, Request
from google.oauth2 import id_token
from google.auth.transport import requests

logger = logging.getLogger(__name__)

# Expected audience for the OIDC token. 
# Usually the full URL of the service, e.g. "https://api.narvo.news"
GCP_OIDC_AUDIENCE = os.environ.get("GCP_OIDC_AUDIENCE", "")


async def verify_gcp_scheduler(
    request: Request,
    authorization: Optional[str] = Header(None, alias="Authorization"),
) -> None:
    """
    FastAPI dependency — verifies that the incoming request has a valid 
    Google Cloud OIDC token.
    """
    if not authorization or not authorization.startswith("Bearer "):
        # Fallback to QStash if enabled (transitional)
        from lib.qstash_verify import verify_qstash
        try:
            return await verify_qstash(request)
        except HTTPException:
            raise HTTPException(status_code=401, detail="Missing or invalid Authorization header")

    token = authorization.replace("Bearer ", "").strip()
    
    try:
        # Verify the ID token using Google's public keys
        # The 'audience' must match what's configured in Google Cloud Scheduler
        # If audience is empty, we skip audience verification (dev only)
        id_info = id_token.verify_oauth2_token(
            token, 
            requests.Request(), 
            audience=GCP_OIDC_AUDIENCE if GCP_OIDC_AUDIENCE else None
        )

        # Check issuer to ensure it's from Google
        if id_info['iss'] not in ['accounts.google.com', 'https://accounts.google.com']:
            raise ValueError('Wrong issuer.')

        # Metadata for logging
        request.state.is_cron = True
        request.state.cron_email = id_info.get("email")
        
        return
    except Exception as e:
        logger.warning("[GCP Verify] Token verification failed: %s", e)
        # Try QStash fallback even if Bearer was present (might be a QStash Bearer token)
        from lib.qstash_verify import verify_qstash
        try:
            return await verify_qstash(request)
        except HTTPException:
            raise HTTPException(status_code=401, detail=f"Invalid OIDC token or QStash signature: {e}")
