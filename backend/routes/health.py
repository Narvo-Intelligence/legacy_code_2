# Health, metrics, system alerts, and analytics routes
import logging
from collections import Counter
from datetime import datetime, timezone, timedelta

from fastapi import APIRouter, Depends, HTTPException

from lib.auth import get_current_user
from lib.supabase_db import get_supabase_db
from services.provider_status import (
    build_provider_alerts,
    get_provider_status,
    get_provider_summary,
)

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api", tags=["health"])

API_VERSION = "2.0"


@router.get("/health", summary="Health check")
async def health_check():
    dependencies = {}
    try:
        db = get_supabase_db()
        db.table("user_preferences").select("user_id").limit(1).execute()
        dependencies["supabase"] = "ok"
    except Exception:
        dependencies["supabase"] = "error"
    return {"status": "online", "service": "Narvo API", "version": API_VERSION,
            "timestamp": datetime.now(timezone.utc).isoformat(), "dependencies": dependencies,
            "providers": get_provider_status()}


@router.get("/metrics")
async def get_metrics():
    from services.news_service import get_content_sources as get_sources, RSS_FEED_COUNT
    from services.aggregator_service import get_aggregator_status
    from services.briefing_service import normalize_briefing_user_id

    sources_data = get_sources()
    agg_status = await get_aggregator_status()
    db = get_supabase_db()
    story_count = 0
    tr = db.table("tts_cache").select("cache_key", count="exact").execute()
    tts_count = tr.count if getattr(tr, "count", None) is not None else len(tr.data or [])
    broadcast_hours = round(tts_count * 0.04, 1)
    lr = db.table("listening_history").select("id", count="exact").execute()
    listen_count = lr.count if getattr(lr, "count", None) is not None else len(lr.data or [])
    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    br = (
        db.table("briefings")
        .select("id")
        .eq("date", today)
        .eq("user_id", normalize_briefing_user_id(None))
        .limit(1)
        .execute()
    )
    broadcast_ready = bool(br.data and len(br.data) > 0)
    listen_str = f"{max(1, listen_count)}"
    return {
        "listeners_today": listen_str, "total_listeners": listen_str,
        "sources_online": sources_data.get("total_sources", RSS_FEED_COUNT),
        "total_sources": sources_data.get("total_sources", RSS_FEED_COUNT),
        "local_sources": sources_data.get("local_sources", 17),
        "international_sources": sources_data.get("international_sources", 6),
        "continental_sources": sources_data.get("continental_sources", 0),
        "stories_processed": story_count or sources_data.get("total_sources", RSS_FEED_COUNT) * 8,
        "broadcast_hours": broadcast_hours, "signal_strength": "98%",
        "network_load": f"{min(95, max(10, int(story_count / 5)))}%",
        "broadcast_sources": len(sources_data.get("broadcast_sources", [])),
        "verification_apis": len(sources_data.get("verification_apis", [])),
        "aggregators": agg_status, "broadcast_ready": broadcast_ready,
        "last_sync": datetime.now(timezone.utc).isoformat(),
        "providers": get_provider_status(),
        "provider_summary": get_provider_summary(),
    }


@router.get("/system-alerts")
async def get_system_alerts():
    from services.aggregator_service import get_aggregator_status
    agg = await get_aggregator_status()
    alerts = []
    if agg.get("cache_stale"):
        alerts.append({"id": "agg-stale", "type": "warning", "title": "AGGREGATOR_CACHE_STALE",
                        "desc": "News aggregator cache has expired. New stories may be delayed.", "time": agg.get("last_fetched", ""), "priority": True})
    ms_count = agg.get("mediastack", {}).get("cached_count", 0)
    nd_count = agg.get("newsdata", {}).get("cached_count", 0)
    if ms_count + nd_count > 0:
        alerts.append({"id": "agg-active", "type": "info", "title": "AGGREGATOR_FEEDS_ACTIVE",
                        "desc": f"Mediastack: {ms_count} stories cached. NewsData: {nd_count} stories cached.", "time": agg.get("last_fetched", ""), "priority": False})
    db = get_supabase_db()
    tr = db.table("tts_cache").select("cache_key", count="exact").execute()
    tts_count = tr.count if getattr(tr, "count", None) is not None else len(tr.data or [])
    if tts_count > 0:
        alerts.append({"id": "tts-cache", "type": "info", "title": "TTS_CACHE_ACTIVE",
                        "desc": f"{tts_count} audio broadcasts cached for instant playback.", "time": datetime.now(timezone.utc).isoformat(), "priority": False})
    provider_alerts = build_provider_alerts()
    alerts.extend(provider_alerts)
    if provider_alerts or agg.get("cache_stale"):
        alerts.append({"id": "platform-status", "type": "warning", "title": "PLATFORM_DEGRADED",
                        "desc": "Narvo is online, but one or more launch-critical dependencies need attention.", "time": datetime.now(timezone.utc).isoformat(), "priority": True})
    else:
        alerts.append({"id": "platform-status", "type": "feature", "title": "PLATFORM_OPERATIONAL",
                        "desc": "All Narvo broadcast systems are online and operational.", "time": datetime.now(timezone.utc).isoformat(), "priority": False})
    return alerts


@router.get("/analytics/{user_id}")
async def get_user_analytics(user_id: str, current_user_id: str = Depends(get_current_user)):
    """Get listening analytics for the authenticated user only. Path user_id must match JWT sub."""
    if user_id != current_user_id:
        raise HTTPException(status_code=403, detail="Cannot access another user's analytics")
    db = get_supabase_db()
    r = db.table("listening_history").select("category, source, played_at, duration, title").eq("user_id", user_id).order("played_at", desc=True).limit(500).execute()
    history = []
    for x in r.data or []:
        row = {k: v for k, v in x.items()}
        played_at = row.get("played_at")
        row["played_at"] = played_at.isoformat() if played_at is not None and hasattr(played_at, "isoformat") else str(played_at) if played_at else ""
        history.append(row)

    if not history:
        return {"total_listens": 0, "total_duration_minutes": 0, "categories": {}, "sources": {},
                "daily_activity": [], "streak": 0, "top_categories": [], "weekly_trend": [], "period_comparison": None, "hourly_distribution": {}}

    now = datetime.now(timezone.utc)
    cat_counts, src_counts, hourly_counts = Counter(), Counter(), Counter()
    daily_counts = {}
    this_week = last_week = 0

    for h in history:
        cat_counts[(h.get("category") or "general").lower()] += 1
        src_counts[h.get("source", "unknown")] += 1
        day = h.get("played_at", "")[:10]
        if day:
            daily_counts[day] = daily_counts.get(day, 0) + 1
        try:
            played_dt = datetime.fromisoformat(h.get("played_at", "").replace("Z", "+00:00"))
            hourly_counts[played_dt.hour] += 1
            age_days = (now - played_dt).days
            if age_days < 7: this_week += 1
            elif age_days < 14: last_week += 1
        except Exception:
            pass

    streak = 0
    for i in range(30):
        if (now - timedelta(days=i)).strftime("%Y-%m-%d") in daily_counts: streak += 1
        else: break

    total_duration = sum(h.get("duration", 0) for h in history)
    daily_sorted = sorted(daily_counts.items(), key=lambda x: x[0], reverse=True)[:14]
    weekly_trend = []
    for w in range(4):
        start = now - timedelta(days=(w + 1) * 7)
        end = now - timedelta(days=w * 7)
        label = f"W-{w}" if w > 0 else "This week"
        count = sum(1 for h in history if h.get("played_at", "")[:10] >= start.strftime("%Y-%m-%d") and h.get("played_at", "")[:10] < end.strftime("%Y-%m-%d"))
        weekly_trend.append({"week": label, "count": count})
    weekly_trend.reverse()

    change_pct = round(((this_week - last_week) / last_week) * 100) if last_week > 0 else 0
    return {
        "total_listens": len(history), "total_duration_minutes": round(total_duration / 60, 1) if total_duration else 0,
        "categories": dict(cat_counts.most_common(8)), "sources": dict(src_counts.most_common(10)),
        "daily_activity": [{"date": d, "count": c} for d, c in daily_sorted], "streak": streak,
        "top_categories": [k for k, _ in cat_counts.most_common(3)], "weekly_trend": weekly_trend,
        "period_comparison": {"this_week": this_week, "last_week": last_week, "change_pct": change_pct,
                              "trend": "up" if this_week > last_week else "down" if this_week < last_week else "flat"},
        "hourly_distribution": {str(h).zfill(2): hourly_counts.get(h, 0) for h in range(24)},
    }
