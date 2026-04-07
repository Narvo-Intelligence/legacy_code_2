"""
Upstash Ratelimit for distributed rate limiting on expensive or abuse-prone paths.
Falls back to in-memory when Redis env vars are missing.

When Upstash raises during a limit check: by default we **fail open** (allow the request)
so a Redis outage does not block the API. Set `RATE_LIMIT_FAIL_CLOSED=1` to deny with
429 instead when the limiter cannot run.
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

_ratelimit_instance = None


def _fail_closed_on_ratelimit_error() -> bool:
    v = os.environ.get("RATE_LIMIT_FAIL_CLOSED", "").strip().lower()
    return v in ("1", "true", "yes")


def _is_rate_limited_path(path: str) -> bool:
    return (
        path.startswith("/api/tts/")
        or path.startswith("/api/factcheck/")
        or path.startswith("/api/notifications/")
        or path.startswith("/api/briefing/generate")
        or path.startswith("/api/briefing/audio")
        or path.startswith("/api/translate")
        or path.startswith("/api/search")
        or path.startswith("/api/share/")
        or path.startswith("/api/og/")
        or path.startswith("/api/feedback")
    )


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
            if _fail_closed_on_ratelimit_error():
                return False, "Too many requests. Please try again later."
            return True, ""
    # In-memory fallback (same logic as original server.py)
    now = time.monotonic()
    if identifier not in _memory_times:
        _memory_times[identifier] = []
    times = _memory_times[identifier]
    times[:] = [t for t in times if now - t < _MEMORY_WINDOW]
    if len(times) >= _MEMORY_MAX:
        return False, "Too many requests. Please try again later."
    times.append(now)
    return True, ""
