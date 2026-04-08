import asyncio
import hashlib
import logging
import os
import threading
from typing import Optional

from lib.supabase_db import get_supabase_db

logger = logging.getLogger("narvo.audio_storage")

SUPABASE_AUDIO_STORAGE_ENABLED = (
    os.getenv("SUPABASE_AUDIO_STORAGE_ENABLED", "true").strip().lower()
    not in {"0", "false", "no", "off"}
)
SUPABASE_AUDIO_BUCKET = os.getenv("SUPABASE_AUDIO_BUCKET", "narvo-audio").strip() or "narvo-audio"
SUPABASE_AUDIO_PATH_PREFIX = os.getenv("SUPABASE_AUDIO_PATH_PREFIX", "tts").strip("/ ")
SUPABASE_AUDIO_CACHE_CONTROL = (
    os.getenv("SUPABASE_AUDIO_CACHE_CONTROL", "public, max-age=31536000, immutable").strip()
    or "public, max-age=31536000, immutable"
)
SUPABASE_AUDIO_PUBLIC = (
    os.getenv("SUPABASE_AUDIO_PUBLIC", "true").strip().lower()
    not in {"0", "false", "no", "off"}
)
SUPABASE_AUDIO_AUTO_CREATE_BUCKET = (
    os.getenv("SUPABASE_AUDIO_AUTO_CREATE_BUCKET", "true").strip().lower()
    not in {"0", "false", "no", "off"}
)
try:
    SUPABASE_AUDIO_SIGNED_URL_TTL_SECONDS = int(
        os.getenv("SUPABASE_AUDIO_SIGNED_URL_TTL_SECONDS", "31536000").strip() or "31536000"
    )
except ValueError:
    SUPABASE_AUDIO_SIGNED_URL_TTL_SECONDS = 31536000

_bucket_ready = False
_bucket_lock = threading.Lock()


def build_audio_cache_key(
    text: str,
    voice_id: str,
    language: str,
    namespace: str = "tts",
) -> str:
    raw = f"{namespace}|{(language or '').strip().lower()}|{(voice_id or '').strip().lower()}|{(text or '').strip()}"
    return hashlib.sha256(raw.encode("utf-8")).hexdigest()


def _build_object_path(cache_key: str, category: str) -> str:
    prefix = SUPABASE_AUDIO_PATH_PREFIX or "tts"
    shard = cache_key[:2] if cache_key else "00"
    kind = (category or "tts").strip().lower() or "tts"
    return f"{prefix}/{kind}/{shard}/{cache_key}.mp3"


def _ensure_bucket_sync() -> None:
    global _bucket_ready
    if _bucket_ready or not SUPABASE_AUDIO_STORAGE_ENABLED:
        return
    with _bucket_lock:
        if _bucket_ready:
            return
        db = get_supabase_db()
        try:
            db.storage.get_bucket(SUPABASE_AUDIO_BUCKET)
        except Exception:
            if not SUPABASE_AUDIO_AUTO_CREATE_BUCKET:
                raise
            db.storage.create_bucket(
                SUPABASE_AUDIO_BUCKET,
                options={
                    "public": SUPABASE_AUDIO_PUBLIC,
                    "allowed_mime_types": ["audio/mpeg"],
                },
            )
            logger.info("[audio_storage] Created bucket %s", SUPABASE_AUDIO_BUCKET)
        else:
            if SUPABASE_AUDIO_PUBLIC:
                try:
                    db.storage.update_bucket(
                        SUPABASE_AUDIO_BUCKET,
                        options={"public": True},
                    )
                except Exception:
                    logger.debug("[audio_storage] Bucket %s exists; public update skipped", SUPABASE_AUDIO_BUCKET)
        _bucket_ready = True


def _upload_audio_sync(audio_bytes: bytes, cache_key: str, category: str) -> Optional[str]:
    if not SUPABASE_AUDIO_STORAGE_ENABLED or not audio_bytes or not cache_key:
        return None

    _ensure_bucket_sync()
    db = get_supabase_db()
    bucket = db.storage.from_(SUPABASE_AUDIO_BUCKET)
    object_path = _build_object_path(cache_key, category)
    file_options = {
        "content-type": "audio/mpeg",
        "cache-control": SUPABASE_AUDIO_CACHE_CONTROL,
        "upsert": "true",
        "x-upsert": "true",
    }

    try:
        bucket.upload(object_path, audio_bytes, file_options=file_options)
    except Exception as exc:
        msg = str(exc).lower()
        if "already exists" in msg or "duplicate" in msg or "resource already exists" in msg:
            bucket.update(object_path, audio_bytes, file_options=file_options)
        else:
            raise

    if SUPABASE_AUDIO_PUBLIC:
        return bucket.get_public_url(object_path)

    signed = bucket.create_signed_url(object_path, SUPABASE_AUDIO_SIGNED_URL_TTL_SECONDS)
    if hasattr(signed, "get"):
        return signed.get("signedURL") or signed.get("signedUrl")
    return None


async def store_audio_bytes(audio_bytes: bytes, cache_key: str, category: str = "tts") -> Optional[str]:
    if not SUPABASE_AUDIO_STORAGE_ENABLED or not audio_bytes or not cache_key:
        return None
    try:
        return await asyncio.to_thread(_upload_audio_sync, audio_bytes, cache_key, category)
    except Exception as exc:
        logger.warning("[audio_storage] upload failed for %s/%s: %s", category, cache_key[:12], exc)
        return None
