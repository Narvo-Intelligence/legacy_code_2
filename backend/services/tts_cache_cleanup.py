"""Periodic cleanup for tts_cache (optional; call from cron)."""
import logging
from datetime import datetime, timedelta, timezone

from lib.supabase_db import get_supabase_db

logger = logging.getLogger(__name__)


def delete_tts_cache_older_than_days(days: int = 30) -> int:
    """
    Delete tts_cache rows with created_at strictly before the cutoff.
    Returns the number of rows returned in the delete response (may be 0 if API omits rows).
    """
    if days < 1:
        days = 1
    cutoff = (datetime.now(timezone.utc) - timedelta(days=days)).isoformat()
    try:
        db = get_supabase_db()
        r = db.table("tts_cache").delete().lt("created_at", cutoff).execute()
        n = len(r.data or [])
        logger.info("[tts_cache] cleanup deleted_rows=%s cutoff_before=%s", n, cutoff)
        return n
    except Exception as e:
        logger.warning("[tts_cache] cleanup failed: %s", e)
        raise
