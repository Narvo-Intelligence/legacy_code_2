# backend/test_push.py
import asyncio
import json
from pywebpush import webpush, WebPushException
from lib.supabase_db import get_supabase_db
from core.config import settings


async def trigger_test_push():
    print("🚀 Initializing Narvo Push Test...")
    db = get_supabase_db()

    # 1. Grab the latest subscription from your new table
    # Make sure you've clicked [ACTIVATE] on the landing page first!
    res = (
        db.table("user_push_subscriptions")
        .select("*")
        .order("created_at", desc=True)
        .limit(1)
        .execute()
    )

    if not res.data:
        print("❌ Error: No subscriptions found in 'user_push_subscriptions'.")
        print("👉 Go to the Landing Page and click 'ACTIVATE' for 5AM Alerts first.")
        return

    sub = res.data[0]
    print(f"📡 Found subscription for User: {sub['user_id']}")

    # 2. Construct the 5 AM Payload
    payload = {
        "title": "🌅 TEST: Narvo 5AM Briefing",
        "body": "System Check: Your personalized broadcast is ready. Click to listen.",
        "data": {"url": "/briefing"},
    }

    # 3. Sign and Send
    try:
        webpush(
            subscription_info=sub["subscription_data"],
            data=json.dumps(payload),
            vapid_private_key=settings.VAPID_PRIVATE_KEY,
            vapid_claims={"sub": settings.VAPID_SUB_CLAIM},
        )
        print("✅ SUCCESS: Push notification dispatched to browser!")
    except WebPushException as ex:
        print(f"❌ FAILED: {ex}")


if __name__ == "__main__":
    asyncio.run(trigger_test_push())
