import os
import logging
from supabase import create_client, Client

logger = logging.getLogger("narvo.db")
_db: Client | None = None


def get_supabase_db() -> Client:
    global _db
    if _db is None:
        url = os.getenv("SUPABASE_URL")
        key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")

        # Log a warning instead of raising a RuntimeError immediately
        if not url or not key:
            logger.error(
                "CRITICAL: SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY is missing from environment."
            )
            # We still raise an error here because the function CANNOT proceed without these.
            # However, moving this logic into the function ensures it only crashes when
            # a database operation is actually attempted.
            raise ValueError(
                "Database credentials missing. Check Cloud Run Environment Variables."
            )

        _db = create_client(url, key)
    return _db
