# Stripe webhooks and billing callbacks (optional — requires STRIPE_* env).
import logging
import os

import stripe
from fastapi import APIRouter, HTTPException, Request

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/billing", tags=["billing"])


@router.post("/webhook")
async def stripe_webhook(request: Request):
    """Stripe → Supabase subscription sync. Configure endpoint in Stripe Dashboard."""
    secret = os.environ.get("STRIPE_WEBHOOK_SECRET", "").strip()
    api_key = os.environ.get("STRIPE_SECRET_KEY", "").strip()
    if not secret or not api_key:
        raise HTTPException(status_code=503, detail="Stripe webhook not configured")

    payload = await request.body()
    sig = request.headers.get("stripe-signature") or ""
    stripe.api_key = api_key
    try:
        event = stripe.Webhook.construct_event(payload=payload, sig_header=sig, secret=secret)
    except Exception as e:
        logger.warning("Stripe webhook verify failed: %s", e)
        raise HTTPException(status_code=400, detail="Invalid webhook signature or payload")

    etype = event.get("type")
    obj = (event.get("data") or {}).get("object") or {}

    try:
        from services.subscription_service import upsert_subscription, cancel_subscription

        if etype == "checkout.session.completed":
            uid = (obj.get("client_reference_id") or "").strip() or (
                (obj.get("metadata") or {}).get("user_id") or ""
            ).strip()
            sub_id = obj.get("subscription")
            cust_id = obj.get("customer")
            if uid and sub_id:
                upsert_subscription(
                    uid,
                    "pro",
                    status="active",
                    external_id=str(sub_id),
                    stripe_customer_id=str(cust_id) if cust_id else None,
                )
                logger.info("Activated pro for user %s via checkout", uid[:8])

        elif etype in ("customer.subscription.deleted", "customer.subscription.canceled"):
            sub_id = obj.get("id")
            meta = obj.get("metadata") or {}
            uid = (meta.get("user_id") or "").strip()
            if not uid and sub_id:
                # Fallback: find user by external_id (stored Stripe subscription id)
                from lib.supabase_db import get_supabase_db
                db = get_supabase_db()
                r = (
                    db.table("user_subscriptions")
                    .select("user_id")
                    .eq("external_id", str(sub_id))
                    .limit(1)
                    .execute()
                )
                row = (r.data or [None])[0]
                if row:
                    uid = str(row.get("user_id") or "")
            if uid:
                cancel_subscription(uid)

    except Exception as e:
        logger.exception("Stripe webhook handler error: %s", e)
        raise HTTPException(status_code=500, detail="Webhook processing failed")

    return {"received": True}
