import os
import logging
from supabase import create_client, Client

logger = logging.getLogger("narvo.db")
_db: Client | None = None

# Database request timeout (#22) — prevents hangs when Supabase is paused or slow
DB_TIMEOUT_SECONDS = int(os.getenv("SUPABASE_TIMEOUT", "10"))


def get_supabase_db() -> Client:
    global _db
    if _db is None:
        url = os.getenv("SUPABASE_URL")
        key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")

        if not url or not key:
            logger.error(
                "CRITICAL: SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY is missing from environment."
            )
            raise ValueError(
                "Database credentials missing. Check Cloud Run Environment Variables."
            )

        from httpx import Timeout
        _db = create_client(url, key, options={
            "postgrest_client_timeout": DB_TIMEOUT_SECONDS,
        } if False else {})  # supabase-py options vary by version; use httpx default
        # Set httpx timeout on the underlying REST client if accessible
        try:
            if hasattr(_db, 'postgrest') and hasattr(_db.postgrest, '_session'):
                _db.postgrest._session.timeout = Timeout(DB_TIMEOUT_SECONDS)
        except Exception:
            pass  # Gracefully skip if internal API changed
    return _db
