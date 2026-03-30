"""
QStash request verification for Narvo backend.

Upstash QStash signs every outgoing request with HMAC-SHA256 using the current
signing key (and optionally the next key during key rotation).  We verify the
signature before processing any cron-triggered endpoint.

Verification algorithm (from Upstash docs):
  1. Build the signing string: "<method>\n<path>\n<body_hash>"
     where body_hash = base64url(SHA256(raw_body))
  2. HMAC-SHA256 the signing string with the signing key (base64url-decoded).
  3. Compare to the value in the `Upstash-Signature` header (constant-time).
  4. Repeat with QSTASH_NEXT_SIGNING_KEY if the first fails (key rotation window).

Fallback: when signing keys are not configured (local dev / early staging), the
dependency accepts requests that carry the legacy QSTASH_CRON_SECRET as either a
Bearer token or X-Cron-Secret header.  This keeps the briefing and aggregator
endpoints working without changes to their existing auth logic.

If neither signing keys nor a cron secret is configured the dependency rejects
every request — misconfigured environments must not allow arbitrary cron calls.
"""
import base64
import hashlib
import hmac
import logging
import os
from typing import Optional

from fastapi import Header, HTTPException, Request

logger = logging.getLogger(__name__)

# Primary QStash HMAC keys (Upstash dashboard → QStash → Signing Keys)
_CURRENT_KEY = os.environ.get("QSTASH_CURRENT_SIGNING_KEY", "").strip()
_NEXT_KEY = os.environ.get("QSTASH_NEXT_SIGNING_KEY", "").strip()

# Legacy fallback: simple shared secret (still accepted when signing keys absent)
_CRON_SECRET = (
    os.environ.get("QSTASH_CRON_SECRET", "")
    or os.environ.get("BRIEFING_CRON_SECRET", "")
).strip()


def _b64url_decode(s: str) -> bytes:
    """Decode a base64url string (with or without padding)."""
    padding = 4 - len(s) % 4
    if padding != 4:
        s += "=" * padding
    return base64.urlsafe_b64decode(s)


def _verify_hmac(raw_body: bytes, signature_header: str, key_b64: str) -> bool:
    """Return True if signature_header matches HMAC-SHA256(raw_body, key)."""
    if not key_b64 or not signature_header:
        return False
    try:
        key_bytes = _b64url_decode(key_b64)
        expected = hmac.new(key_bytes, raw_body, hashlib.sha256).digest()
        expected_b64 = base64.urlsafe_b64encode(expected).decode().rstrip("=")
        return hmac.compare_digest(expected_b64, signature_header.rstrip("="))
    except Exception as exc:
        logger.debug("[QStash] HMAC verification error: %s", exc)
        return False


async def verify_qstash(
    request: Request,
    upstash_signature: Optional[str] = Header(None, alias="Upstash-Signature"),
    authorization: Optional[str] = Header(None, alias="Authorization"),
    x_cron_secret: Optional[str] = Header(None, alias="X-Cron-Secret"),
) -> None:
    """
    FastAPI dependency — verifies that the incoming request is from Upstash QStash.

    Verification order:
    1. HMAC-SHA256 with QSTASH_CURRENT_SIGNING_KEY  (preferred)
    2. HMAC-SHA256 with QSTASH_NEXT_SIGNING_KEY      (key-rotation window)
    3. Legacy shared secret via Bearer / X-Cron-Secret (fallback for local dev)

    Raises HTTP 401 if all checks fail.
    """
    # ── Path 1 & 2: HMAC signature verification ──────────────────────────────
    if (_CURRENT_KEY or _NEXT_KEY) and upstash_signature:
        raw_body = await request.body()
        if _verify_hmac(raw_body, upstash_signature, _CURRENT_KEY):
            return
        if _NEXT_KEY and _verify_hmac(raw_body, upstash_signature, _NEXT_KEY):
            logger.info("[QStash] Accepted with NEXT signing key (rotation in progress)")
            return
        logger.warning("[QStash] Signature verification failed for %s", request.url.path)
        raise HTTPException(status_code=401, detail="Invalid QStash signature")

    # ── Path 3: legacy shared-secret fallback ────────────────────────────────
    if _CRON_SECRET:
        secret = (x_cron_secret or "").strip() or (authorization or "").replace("Bearer", "").strip()
        if secret and hmac.compare_digest(secret, _CRON_SECRET):
            return
        raise HTTPException(status_code=401, detail="Invalid or missing cron secret")

    # ── No auth configured at all ─────────────────────────────────────────────
    raise HTTPException(
        status_code=401,
        detail=(
            "QStash verification not configured. Set QSTASH_CURRENT_SIGNING_KEY "
            "and QSTASH_NEXT_SIGNING_KEY (or QSTASH_CRON_SECRET for dev)."
        ),
    )
