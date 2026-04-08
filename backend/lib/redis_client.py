"""
Upstash Redis client with in-memory fallback when env vars are not set.
Use for persistent, shared cache (news, voices, sound_themes, aggregator).
"""
import json
import logging
import os
import time
from typing import Any, Optional

logger = logging.getLogger(__name__)

_redis = None
_memory_fallback: dict = {}  # key -> (value, expiry_ts)


def _get_redis():
    """Lazy init Redis from env. Returns None if not configured."""
    global _redis
    if _redis is not None:
        return _redis
    url = os.environ.get("UPSTASH_REDIS_REST_URL", "").strip()
    token = os.environ.get("UPSTASH_REDIS_REST_TOKEN", "").strip()
    if not url or not token:
        return None
    try:
        from upstash_redis.asyncio import Redis
        _redis = Redis.from_env()
        logger.info("[redis] Upstash Redis client initialized")
        return _redis
    except Exception as e:
        logger.warning("[redis] Failed to init Upstash Redis: %s", e)
        return None


async def get(key: str) -> Optional[str]:
    """Get value by key. Returns None if missing or Redis unavailable."""
    r = _get_redis()
    if r:
        try:
            return await r.get(key)
        except Exception as e:
            logger.warning("[redis] get %s failed: %s", key, e)
            return None
    # In-memory fallback
    entry = _memory_fallback.get(key)
    if entry and (entry[1] is None or time.monotonic() < entry[1]):
        return entry[0]
    if entry and entry[1] is not None:
        del _memory_fallback[key]
    return None


async def delete_key(key: str) -> bool:
    """Remove key from Redis and in-memory fallback. Returns True when attempted."""
    r = _get_redis()
    if r:
        try:
            await r.delete(key)
            return True
        except Exception as e:
            logger.warning("[redis] delete %s failed: %s", key, e)
            return False
    _memory_fallback.pop(key, None)
    return True


async def set(key: str, value: str, ttl_seconds: Optional[int] = None) -> bool:
    """Set value. If ttl_seconds given, key expires. Returns True on success."""
    r = _get_redis()
    if r:
        try:
            if ttl_seconds is not None:
                await r.set(key, value, ex=ttl_seconds)
            else:
                await r.set(key, value)
            return True
        except Exception as e:
            logger.warning("[redis] set %s failed: %s", key, e)
            return False
    # In-memory fallback
    expiry = time.monotonic() + ttl_seconds if ttl_seconds else None
    _memory_fallback[key] = (value, expiry)
    return True


async def get_json(key: str) -> Optional[Any]:
    """Get and JSON-decode value. Returns None if missing or invalid."""
    raw = await get(key)
    if raw is None:
        return None
    try:
        return json.loads(raw)
    except (TypeError, json.JSONDecodeError):
        return None


async def set_json(key: str, value: Any, ttl_seconds: Optional[int] = None) -> bool:
    """JSON-encode and set value. Returns True on success."""
    try:
        raw = json.dumps(value)
    except (TypeError, ValueError):
        return False
    return await set(key, raw, ttl_seconds=ttl_seconds)
