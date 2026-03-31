# Send web push notifications (e.g. "Briefing ready"). Requires pywebpush and VAPID keys.
import json
import logging
import os
from typing import Any, Dict, List, Optional, Tuple

logger = logging.getLogger(__name__)

VAPID_PRIVATE_KEY = os.environ.get("VAPID_PRIVATE_KEY", "")
VAPID_SUB_CLAIM = os.environ.get("VAPID_SUB_CLAIM", "mailto:ops@narvo.news")


def _send_to_subscriptions(
    rows: List[Dict],
    payload: str,
    table_name: str,
    id_column: str = "endpoint",
) -> Tuple[int, List[Any]]:
    """Send payload to all rows; return (sent_count, list of row ids to remove on 404/410)."""
    try:
        from pywebpush import webpush, WebPushException
    except ImportError:
        return 0, []
    sent = 0
    to_remove: List[Any] = []
    for row in rows:
        endpoint = row.get("endpoint")
        sub_data = row.get("subscription_data") or row
        if not endpoint:
            continue
        try:
            webpush(
                subscription_info=sub_data,
                data=payload,
                vapid_private_key=VAPID_PRIVATE_KEY,
                vapid_claims={"sub": VAPID_SUB_CLAIM},
            )
            sent += 1
        except WebPushException as ex:
            if ex.response and getattr(ex.response, "status_code", None) in (404, 410):
                to_remove.append(row.get(id_column) or row.get("endpoint"))
            else:
                logger.warning("Push to %s... failed: %s", endpoint[:50], ex)
        except Exception as e:
            logger.warning("Push to %s... failed: %s", endpoint[:50], e)
    return sent, to_remove


def send_briefing_ready_push(briefing_data: Optional[Dict[str, Any]] = None) -> int:
    """Send morning briefing notification to push_subscriptions and user_push_subscriptions.
    If briefing_data is provided, uses lead story headline for a more engaging body.
    Removes expired subscriptions (404/410). Returns total count sent."""
    if not VAPID_PRIVATE_KEY:
        logger.debug("VAPID_PRIVATE_KEY not set; skipping push")
        return 0
    try:
        import pywebpush  # noqa: F401 - ensure pywebpush is available; used in _send_to_subscriptions
    except ImportError:
        logger.warning("pywebpush not installed; pip install pywebpush to enable briefing push")
        return 0

    stories = (briefing_data or {}).get("stories") or []
    lead_headline = (stories[0].get("title") or "Your morning update") if stories else "Your morning update"
    body = f"Top Story: {lead_headline}. Click to listen to your 5:00 AM broadcast."

    payload = json.dumps({
        "title": "NARVO",
        "body": body,
        "url": "/briefing?autoplay=1",
        "briefing_id": briefing_data.get("id") if briefing_data else None,
    })

    from lib.supabase_db import get_supabase_db
    db = get_supabase_db()

    # 1. Legacy push_subscriptions (anonymous / by endpoint)
    r = db.table("push_subscriptions").select("endpoint, subscription_data").execute()
    rows = r.data or []
    sent1, remove_endpoints = _send_to_subscriptions(rows, payload, "push_subscriptions")
    for ep in remove_endpoints:
        try:
            db.table("push_subscriptions").delete().eq("endpoint", ep).execute()
        except Exception as e:
            logger.warning("Failed to remove expired subscription %s: %s", ep[:50], e)

    # 2. User-scoped user_push_subscriptions
    r2 = db.table("user_push_subscriptions").select("id, endpoint, subscription_data").execute()
    rows2 = r2.data or []
    sent2, remove_ids = _send_to_subscriptions(rows2, payload, "user_push_subscriptions", "id")
    for row_id in remove_ids:
        try:
            db.table("user_push_subscriptions").delete().eq("id", row_id).execute()
        except Exception as e:
            logger.warning("Failed to remove expired user subscription %s: %s", row_id, e)

    sent = sent1 + sent2
    if sent:
        logger.info("Sent briefing-ready push to %d subscribers", sent)
    return sent
