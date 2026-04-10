"""
Upstash Ratelimit for distributed rate limiting on expensive or abuse-prone paths.
Falls back to in-memory when Redis env vars are missing.

When Upstash raises during a limit check: by default we **fail open** (allow the request)
so a Redis outage does not block the API. Set `RATE_LIMIT_FAIL_CLOSED=1` to deny with
429 instead when the limiter cannot run.

Security: Auth endpoints use stricter limits and fail-closed behavior.
"""
import asyncio
import logging
import os
import time
from typing import Tuple

logger = logging.getLogger(__name__)

# In-memory fallback: ip -> list of timestamps (for sliding window)
_memory_times: dict = {}
_MEMORY_WINDOW = 60
_MEMORY_MAX = 120

# Rate limits
AUTH_LIMIT = 5  # 5 requests per minute for auth endpoints
API_LIMIT = 120  # 120 requests per minute for general API

# Critical paths that require stricter rate limiting and fail-closed behavior
_AUTH_PATHS = frozenset([
    "/auth/login",
    "/auth/token", 
    "/auth/register",
    "/auth/forgot",
    "/auth/reset",
])

CRITICAL_PATHS = frozenset([
    "/auth/login",
    "/auth/token",
    "/auth/register",
])

_ratelimit_instance = None


def _fail_closed_on_ratelimit_error() -> bool:
    v = os.environ.get("RATE_LIMIT_FAIL_CLOSED", "").strip().lower()
    return v in ("1", "true", "yes")


def _is_auth_path(path: str) -> bool:
    """Check if path is an authentication endpoint requiring stricter limits."""
    return any(path.startswith(p) for p in _AUTH_PATHS)


def _is_rate_limited_path(path: str) -> bool:
    return (
        path.startswith("/api/tts/")
        or path.startswith("/api/factcheck/")
        or path.startswith("/api/notifications/")
        or path.startswith("/api/briefing/")
        or path.startswith("/api/translate")
        or path.startswith("/api/search")
        or path.startswith("/api/share/")
        or path.startswith("/api/og/")
        or path.startswith("/api/feedback")
        or _is_auth_path(path)  # Include auth paths
    )


def _get_limit_for_path(path: str) -> int:
    """Return the appropriate rate limit based on path criticality."""
    if _is_auth_path(path):
        return AUTH_LIMIT
    return API_LIMIT


def _get_ratelimit():
    """Lazy-init Upstash Ratelimit. Returns None if not configured."""
    global _ratelimit_instance
    if _ratelimit_instance is not None:
        return _ratelimit_instance
    url = os.environ.get("UPSTASH_REDIS_REST_URL", "").strip()
    token = os.environ.get("UPSTASH_REDIS_REST_TOKEN", "").strip()
    if not url or not token:
        return None
    try:
        from upstash_ratelimit import Ratelimit, SlidingWindow
        from upstash_redis import Redis
        redis = Redis.from_env()
        _ratelimit_instance = Ratelimit(
            redis=redis,
            limiter=SlidingWindow(max_requests=120, window=60),
        )
        logger.info("[ratelimit] Upstash Ratelimit initialized")
        return _ratelimit_instance
    except Exception as e:
        logger.warning("[ratelimit] Failed to init Upstash: %s", e)
        return None


async def check_rate_limit(identifier: str, path: str) -> Tuple[bool, str]:
    """
    Returns (allowed, detail). If not allowed, detail is the message to return in 429.
    
    Implements fail-closed behavior for critical endpoints (auth) during Redis failures.
    """
    if not _is_rate_limited_path(path):
        return True, ""

    rl = _get_ratelimit()
    if rl:
        try:
            loop = asyncio.get_event_loop()
            response = await loop.run_in_executor(
                None,
                lambda: rl.limit(identifier),
            )
            if response.allowed:
                return True, ""
            return False, "Too many requests. Please try again later."
        except Exception as e:
            logger.warning("[ratelimit] Upstash failed: %s", e)
            # Fail-closed for critical paths (auth endpoints)
            if any(path.startswith(p) for p in CRITICAL_PATHS):
                logger.warning("Failing closed for critical endpoint: %s", path)
                return False, "Service temporarily unavailable"
            # Fail-open for non-critical paths
            if _fail_closed_on_ratelimit_error():
                return False, "Too many requests. Please try again later."
            return True, ""
    # In-memory fallback (same logic as original server.py)
    now = time.monotonic()
    if identifier not in _memory_times:
        _memory_times[identifier] = []
    times = _memory_times[identifier]
    times[:] = [t for t in times if now - t < _MEMORY_WINDOW]
    # Apply auth-specific limits even in fallback
    limit = _get_limit_for_path(path)
    if len(times) >= limit:
        return False, "Too many requests. Please try again later."
    times.append(now)
    return True, ""
