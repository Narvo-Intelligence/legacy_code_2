# Send web push notifications (e.g. "Briefing ready"). Requires pywebpush and VAPID keys.
import json
import logging
import os
from typing import Any, Dict, List, Optional, Tuple

from services.provider_status import mark_provider_disabled, mark_provider_error, mark_provider_ok
from services.push_payloads import (
    build_breaking_news_payload,
    build_digest_payload,
    build_morning_briefing_payload,
)

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
                mark_provider_error("web_push", ex, kind="delivery", detail="Web push delivery failed")
                logger.warning("Push to %s... failed: %s", endpoint[:50], ex)
        except Exception as e:
            mark_provider_error("web_push", e, kind="delivery", detail="Web push delivery failed")
            logger.warning("Push to %s... failed: %s", endpoint[:50], e)
    return sent, to_remove


def _ensure_push_ready() -> bool:
    if not VAPID_PRIVATE_KEY:
        logger.debug("VAPID_PRIVATE_KEY not set; skipping push")
        mark_provider_disabled("web_push", "VAPID_PRIVATE_KEY not configured")
        return False
    try:
        import pywebpush  # noqa: F401
    except ImportError:
        mark_provider_disabled("web_push", "pywebpush is not installed")
        logger.warning("pywebpush not installed; pip install pywebpush to enable briefing push")
        return False
    mark_provider_ok("web_push", "VAPID and pywebpush are available")
    return True


def _broadcast_payload_obj(obj: Dict[str, Any]) -> int:
    """Send one notification payload to all push_subscriptions and user_push_subscriptions."""
    if not _ensure_push_ready():
        return 0
    payload = json.dumps(obj)

    from lib.supabase_db import get_supabase_db
    db = get_supabase_db()

    r = db.table("push_subscriptions").select("endpoint, subscription_data").execute()
    rows = r.data or []
    sent1, remove_endpoints = _send_to_subscriptions(rows, payload, "push_subscriptions")
    for ep in remove_endpoints:
        try:
            db.table("push_subscriptions").delete().eq("endpoint", ep).execute()
        except Exception as e:
            logger.warning("Failed to remove expired subscription %s: %s", ep[:50], e)

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
        mark_provider_ok("web_push", f"Delivered to {sent} subscribers")
        logger.info("Web push delivered to %d subscribers (action=%s)", sent, obj.get("data", {}).get("narvo_action"))
    return sent


def send_briefing_ready_push(briefing_data: Optional[Dict[str, Any]] = None) -> int:
    """Send morning briefing notification to push_subscriptions and user_push_subscriptions.
    If briefing_data is provided, uses lead story headline for a more engaging body.
    Removes expired subscriptions (404/410). Returns total count sent."""
    obj = build_morning_briefing_payload(briefing_data)
    return _broadcast_payload_obj(obj)


def send_breaking_news_push(title: str, story_id: str) -> int:
    """Breaking headline push — call from ingest or editorial flows when wired."""
    obj = build_breaking_news_payload(title, story_id)
    return _broadcast_payload_obj(obj)


def send_digest_push(digest: Dict[str, Any]) -> int:
    """Daily digest style push using the same shape as /api/notifications/digest."""
    obj = build_digest_payload(digest)
    return _broadcast_payload_obj(obj)
