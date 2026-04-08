# JSON payloads for Web Push — consumed by public/narvo-sw.js (showNotification).
from __future__ import annotations

from typing import Any, Dict, List, Optional

DEFAULT_ICON = "/narvo-icon-192.png"
DEFAULT_BADGE = "/narvo-icon-192.png"


def _actions_listen_dashboard(_listen_url: str) -> List[Dict[str, str]]:
    return [
        {"action": "listen", "title": "Listen"},
        {"action": "open", "title": "Open app"},
    ]


def _action_urls_listen_dashboard(listen_url: str) -> Dict[str, str]:
    return {"listen": listen_url, "open": "/dashboard"}


def build_morning_briefing_payload(briefing_data: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
    stories = (briefing_data or {}).get("stories") or []
    lead_headline = (stories[0].get("title") or "Your morning update") if stories else "Your morning update"
    body = f"Top Story: {lead_headline}. Click to listen to your 5:00 AM broadcast."
    listen_url = "/briefing?autoplay=1"

    return {
        "title": "NARVO",
        "body": body,
        "tag": "narvo-morning-briefing",
        "icon": DEFAULT_ICON,
        "badge": DEFAULT_BADGE,
        "renotify": True,
        "actions": _actions_listen_dashboard(listen_url),
        "data": {
            "url": listen_url,
            "narvo_action": "morning_briefing",
            "action_urls": _action_urls_listen_dashboard(listen_url),
            "briefing_id": briefing_data.get("id") if briefing_data else None,
        },
    }


def build_breaking_news_payload(title: str, story_id: str) -> Dict[str, Any]:
    headline = (title or "Breaking update").strip() or "Breaking update"
    sid = (story_id or "").strip()
    story_path = f"/news/{sid}" if sid else "/dashboard"

    return {
        "title": "Narvo — Breaking",
        "body": headline,
        "tag": f"narvo-breaking-{sid}" if sid else "narvo-breaking",
        "icon": DEFAULT_ICON,
        "badge": DEFAULT_BADGE,
        "renotify": True,
        "actions": [
            {"action": "open_story", "title": "Read"},
            {"action": "open", "title": "Home"},
        ],
        "data": {
            "url": story_path,
            "narvo_action": "breaking",
            "story_id": sid or None,
            "action_urls": {
                "open_story": story_path,
                "open": "/dashboard",
            },
        },
    }


def build_digest_payload(digest: Dict[str, Any]) -> Dict[str, Any]:
    """Build from GET /api/notifications/digest-style dict."""
    stories = digest.get("top_stories") or []
    first = stories[0] if stories else None
    lead = first.get("title") if isinstance(first, dict) else None
    body = f"Top story: {lead}" if lead else "Your daily digest is ready."
    listen_url = "/briefing?autoplay=1"

    return {
        "title": digest.get("title") or "NARVO Daily",
        "body": body,
        "tag": "narvo-daily-digest",
        "icon": DEFAULT_ICON,
        "badge": DEFAULT_BADGE,
        "actions": _actions_listen_dashboard(listen_url),
        "data": {
            "url": listen_url,
            "narvo_action": "digest",
            "action_urls": _action_urls_listen_dashboard(listen_url),
        },
    }
