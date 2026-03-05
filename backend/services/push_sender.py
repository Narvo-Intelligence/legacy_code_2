# Send web push notifications (e.g. "Briefing ready"). Requires pywebpush and VAPID keys.
import json
import logging
import os

logger = logging.getLogger(__name__)

VAPID_PRIVATE_KEY = os.environ.get("VAPID_PRIVATE_KEY", "")
VAPID_SUB_CLAIM = os.environ.get("VAPID_SUB_CLAIM", "mailto:ops@narvo.news")


def send_briefing_ready_push() -> int:
    """Send 'Your 3-minute morning brief is ready' to all push_subscriptions. Returns count sent."""
    if not VAPID_PRIVATE_KEY:
        logger.debug("VAPID_PRIVATE_KEY not set; skipping push")
        return 0
    try:
        from pywebpush import webpush
    except ImportError:
        logger.warning("pywebpush not installed; pip install pywebpush to enable briefing push")
        return 0

    from lib.supabase_db import get_supabase_db
    db = get_supabase_db()
    r = db.table("push_subscriptions").select("endpoint, subscription_data").execute()
    rows = r.data or []
    payload = json.dumps({
        "title": "NARVO",
        "body": "Your 3-minute morning brief is ready.",
        "url": "/briefing?autoplay=1",
    })
    sent = 0
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
        except Exception as e:
            logger.warning("Push to %s... failed: %s", endpoint[:50], e)
    if sent:
        logger.info("Sent briefing-ready push to %d subscribers", sent)
    return sent
