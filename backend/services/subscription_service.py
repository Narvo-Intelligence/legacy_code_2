# Subscription service: CRUD for user_subscriptions (Supabase)
from datetime import datetime, timezone
from typing import Dict, Optional

from lib.supabase_db import get_supabase_db

VALID_TIERS = ("free", "pro", "enterprise")
VALID_STATUSES = ("active", "cancelled", "past_due")


def get_subscription(user_id: str) -> Optional[Dict]:
    """Get current subscription for user. Returns None if no row (treated as free)."""
    db = get_supabase_db()
    r = (
        db.table("user_subscriptions")
        .select("*")
        .eq("user_id", user_id)
        .limit(1)
        .execute()
    )
    row = (r.data or [None])[0]
    if not row:
        return None
    return _row_to_sub(row)


def upsert_subscription(
    user_id: str,
    tier: str,
    status: str = "active",
    ends_at: Optional[str] = None,
    external_id: Optional[str] = None,
) -> Dict:
    """Create or update subscription. Tier must be free, pro, or enterprise."""
    if tier not in VALID_TIERS:
        raise ValueError(f"tier must be one of {VALID_TIERS}")
    if status not in VALID_STATUSES:
        raise ValueError(f"status must be one of {VALID_STATUSES}")

    db = get_supabase_db()
    now = datetime.now(timezone.utc).isoformat()
    doc = {
        "user_id": user_id,
        "tier": tier.lower(),
        "status": status,
        "updated_at": now,
        "ends_at": ends_at,
        "external_id": external_id,
    }
    existing = get_subscription(user_id)
    if existing:
        doc["started_at"] = existing.get("started_at") or now
    else:
        doc["started_at"] = now

    db.table("user_subscriptions").upsert(doc, on_conflict="user_id").execute()
    return get_subscription(user_id) or doc


def cancel_subscription(user_id: str) -> Optional[Dict]:
    """Set status to cancelled and clear ends_at. Returns updated row or None."""
    sub = get_subscription(user_id)
    if not sub:
        return None
    return upsert_subscription(user_id, tier=sub["tier"], status="cancelled", ends_at=None)


def delete_subscription(user_id: str) -> bool:
    """Remove subscription row (user reverts to implicit free). Returns True if deleted."""
    db = get_supabase_db()
    r = db.table("user_subscriptions").delete().eq("user_id", user_id).execute()
    return len(r.data or []) > 0


def _row_to_sub(row: dict) -> Dict:
    out = dict(row)
    for k in ("started_at", "ends_at", "updated_at"):
        if k in out and out[k] and hasattr(out[k], "isoformat"):
            out[k] = out[k].isoformat()
    return out
