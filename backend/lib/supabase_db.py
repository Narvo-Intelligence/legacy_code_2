import os
import logging
from supabase import create_client, Client

logger = logging.getLogger("narvo.db")
_db: Client | None = None

# Database request timeout (#22) — prevents hangs when Supabase is paused or slow
DB_TIMEOUT_SECONDS = int(os.getenv("SUPABASE_TIMEOUT", "10"))

try:
    from supabase import ClientOptions
except ImportError:
    from supabase.lib.client_options import ClientOptions


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

        options = ClientOptions(postgrest_client_timeout=DB_TIMEOUT_SECONDS)
        try:
            _db = create_client(url, key, options=options)
        except TypeError:
            _db = create_client(url, key)
        from httpx import Timeout
        try:
            if hasattr(_db, "postgrest") and hasattr(_db.postgrest, "_session"):
                _db.postgrest._session.timeout = Timeout(DB_TIMEOUT_SECONDS)
        except Exception:
            pass
    return _db
