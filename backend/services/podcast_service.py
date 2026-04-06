"""
Podcast service — RSS feeds + optional Podcast Index (African-biased discovery).
"""
import asyncio
import hashlib
import logging
import os
import time
from datetime import datetime, timezone, timedelta
from typing import Dict, List, Optional

import feedparser
import httpx

logger = logging.getLogger(__name__)

PI_BASE = "https://api.podcastindex.org/api/1.0"

# Real African / global podcast RSS feeds
PODCAST_FEEDS = [
    {"url": "https://feeds.megaphone.fm/TPG2735498498", "category": "Geopolitics", "fallback_title": "The Continent"},
    {"url": "https://rss.art19.com/the-daily", "category": "News", "fallback_title": "The Daily"},
    {"url": "https://feeds.simplecast.com/54nAGcIl", "category": "Technology", "fallback_title": "The Vergecast"},
    {"url": "https://feeds.megaphone.fm/HSW7835457691", "category": "Science", "fallback_title": "Stuff You Should Know"},
    {"url": "https://www.omnycontent.com/d/playlist/e73c998e-6e60-432f-8610-ae210140c5b1/A91018A4-EA4F-4130-BF55-AE270180C327/44710ECC-10BB-48D1-93C7-AE270180C33E/podcast.rss", "category": "Finance", "fallback_title": "Planet Money"},
    {"url": "https://feeds.megaphone.fm/GLT1412515089", "category": "Culture", "fallback_title": "TED Talks Daily"},
    {"url": "https://rss.art19.com/global-news-podcast", "category": "News", "fallback_title": "BBC Global News Podcast"},
    {"url": "https://feeds.npr.org/510289/podcast.xml", "category": "News", "fallback_title": "NPR Up First"},
    {"url": "https://feeds.megaphone.fm/ESP4810498498", "category": "Health", "fallback_title": "On Purpose with Jay Shetty"},
    {"url": "https://feeds.simplecast.com/l2i9YnTd", "category": "Business", "fallback_title": "How I Built This"},
]

_podcast_cache: Dict[str, dict] = {}
_cache_time: Optional[datetime] = None
CACHE_TTL = 1800  # 30 min

# Search terms biased toward African voices / diaspora (Podcast Index)
PI_AFRICA_SEARCH_TERMS = [
    "africa",
    "lagos",
    "nairobi kenya",
    "accra ghana",
    "south africa news",
    "west africa",
    "afrobeats",
    "nigerian",
]


def _parse_duration(entry) -> str:
    dur = entry.get("itunes_duration", "")
    if dur:
        return str(dur)
    return "30:00"


def _generate_id(title: str, url: str) -> str:
    return "ep-" + hashlib.md5(f"{title}:{url}".encode()).hexdigest()[:8]


def _entry_image(entry) -> str:
    img = entry.get("image", {})
    if isinstance(img, dict) and img.get("href"):
        return str(img["href"])
    return ""


def _parse_feed(feed_info: dict) -> List[dict]:
    episodes = []
    try:
        feed = feedparser.parse(feed_info["url"])
        if not feed.entries:
            return episodes

        feed_image = ""
        if feed.feed.get("image"):
            fi = feed.feed["image"]
            if isinstance(fi, dict) and fi.get("href"):
                feed_image = str(fi["href"])

        for entry in feed.entries[:5]:
            title = entry.get("title", "Untitled Episode")
            ep_id = _generate_id(title, feed_info["url"])

            audio_url = ""
            for link in entry.get("links", []):
                if link.get("type", "").startswith("audio"):
                    audio_url = link.get("href", "")
                    break
            if not audio_url:
                for enc in entry.get("enclosures", []):
                    if enc.get("type", "").startswith("audio"):
                        audio_url = enc.get("href", "")
                        break

            published = ""
            if entry.get("published_parsed"):
                try:
                    published = datetime(*entry.published_parsed[:6]).strftime("%Y-%m-%d")
                except Exception:
                    pass

            cover = _entry_image(entry) or feed_image

            ep = {
                "id": ep_id,
                "episode": entry.get("itunes_episode", ""),
                "title": title,
                "duration": _parse_duration(entry),
                "description": (entry.get("summary", entry.get("description", "")) or "")[:500],
                "category": feed_info.get("category", "General"),
                "published": published,
                "audio_url": audio_url,
                "source": feed.feed.get("title", feed_info.get("fallback_title", "")),
                "podcast_name": feed.feed.get("title", feed_info.get("fallback_title", "")),
                "image_url": cover,
            }
            episodes.append(ep)
            _podcast_cache[ep_id] = ep
    except Exception as e:
        logger.error("[Podcast] Feed parse error for %s: %s", feed_info.get("url", "unknown"), e)
    return episodes


def _podcast_index_headers() -> Optional[Dict[str, str]]:
    key = (os.environ.get("PODCASTINDEX_API_KEY") or "").strip()
    secret = (os.environ.get("PODCASTINDEX_API_SECRET") or "").strip()
    if not key or not secret:
        return None
    epoch = str(int(time.time()))
    auth = hashlib.sha1(f"{key}{secret}{epoch}".encode("utf-8")).hexdigest()
    return {
        "X-Auth-Key": key,
        "X-Auth-Date": epoch,
        "Authorization": auth,
        "User-Agent": "NarvoNews/1.0; contact https://narvo.news",
    }


def _normalize_pi_episode(item: dict, feed_title: str, feed_image: str) -> dict:
    raw_id = item.get("id")
    ep_id = f"pi-{raw_id}" if raw_id is not None else _generate_id(
        str(item.get("title", "")), str(item.get("enclosureUrl", ""))
    )
    audio = item.get("enclosureUrl") or ""
    pub = ""
    if item.get("datePublished"):
        try:
            ts = int(item["datePublished"])
            pub = datetime.fromtimestamp(ts, tz=timezone.utc).strftime("%Y-%m-%d")
        except (TypeError, ValueError, OSError):
            pub = str(item.get("datePublished", ""))[:10]

    title = item.get("title") or "Episode"
    return {
        "id": ep_id,
        "episode": str(item.get("episode") or item.get("episodeNumber") or ""),
        "title": title,
        "duration": str(item.get("duration") or "30:00"),
        "description": (item.get("description") or "")[:500],
        "category": "Podcast",
        "published": pub,
        "audio_url": audio,
        "source": feed_title,
        "podcast_name": feed_title,
        "image_url": item.get("image") or feed_image or "",
    }


async def _fetch_podcast_index_african(max_items: int) -> None:
    headers = _podcast_index_headers()
    if not headers:
        return

    added_ids: set = set()
    count = 0

    async with httpx.AsyncClient(timeout=25.0) as client:
        for term in PI_AFRICA_SEARCH_TERMS:
            if count >= max_items:
                break
            try:
                r = await client.get(
                    f"{PI_BASE}/search/byterm",
                    params={"q": term, "max": 8},
                    headers=headers,
                )
                if r.status_code != 200:
                    logger.warning("[Podcast] PI search %r → %s", term, r.status_code)
                    continue
                feeds = (r.json() or {}).get("feeds") or []
                for feed in feeds[:4]:
                    if count >= max_items:
                        break
                    fid = feed.get("id")
                    if fid is None:
                        continue
                    feed_title = feed.get("title") or "Podcast"
                    feed_image = feed.get("image") or feed.get("artwork") or ""

                    er = await client.get(
                        f"{PI_BASE}/episodes/byfeedid",
                        params={"id": int(fid), "max": 3},
                        headers=headers,
                    )
                    if er.status_code != 200:
                        continue
                    for raw in (er.json() or {}).get("items") or []:
                        if count >= max_items:
                            break
                        ep = _normalize_pi_episode(raw, feed_title, feed_image)
                        if ep["id"] in added_ids or not ep.get("audio_url"):
                            continue
                        added_ids.add(ep["id"])
                        _podcast_cache[ep["id"]] = ep
                        count += 1
            except Exception as e:
                logger.warning("[Podcast] PI fetch error for %r: %s", term, e)


async def _podcast_index_search_episodes(query: str, limit: int) -> List[dict]:
    headers = _podcast_index_headers()
    if not headers:
        return []

    out: List[dict] = []
    q = query.strip()
    if len(q) < 2:
        return out

    async with httpx.AsyncClient(timeout=22.0) as client:
        try:
            r = await client.get(
                f"{PI_BASE}/search/byterm",
                params={"q": q, "max": min(15, limit + 5)},
                headers=headers,
            )
            if r.status_code != 200:
                return out
            feeds = (r.json() or {}).get("feeds") or []
            for feed in feeds[:8]:
                if len(out) >= limit:
                    break
                fid = feed.get("id")
                if fid is None:
                    continue
                feed_title = feed.get("title") or "Podcast"
                feed_image = feed.get("image") or feed.get("artwork") or ""
                er = await client.get(
                    f"{PI_BASE}/episodes/byfeedid",
                    params={"id": int(fid), "max": 2},
                    headers=headers,
                )
                if er.status_code != 200:
                    continue
                for raw in (er.json() or {}).get("items") or []:
                    if len(out) >= limit:
                        break
                    ep = _normalize_pi_episode(raw, feed_title, feed_image)
                    if ep.get("audio_url"):
                        _podcast_cache[ep["id"]] = ep
                        out.append(ep)
        except Exception as e:
            logger.warning("[Podcast] PI search error: %s", e)

    return out


def _cache_stale() -> bool:
    if not _cache_time or not _podcast_cache:
        return True
    return datetime.now(timezone.utc) - _cache_time >= timedelta(seconds=CACHE_TTL)


async def get_podcasts(sort: str = "latest", limit: int = 10, category: str = None) -> List[dict]:
    global _cache_time

    if not _cache_stale():
        episodes = list(_podcast_cache.values())
    else:
        _podcast_cache.clear()
        loop = asyncio.get_event_loop()
        for feed_info in PODCAST_FEEDS:
            try:
                await loop.run_in_executor(None, _parse_feed, feed_info)
            except Exception as e:
                logger.error("[Podcast] Error fetching %s: %s", feed_info.get("url"), e)
        await _fetch_podcast_index_african(min(48, max(24, limit * 3)))
        _cache_time = datetime.now(timezone.utc)
        episodes = list(_podcast_cache.values())

    if category and category != "all":
        episodes = [e for e in episodes if e.get("category", "").lower() == category.lower()]

    if sort == "popular":
        episodes.sort(key=lambda x: str(x.get("duration", "0")), reverse=True)
    else:
        episodes.sort(key=lambda x: x.get("published", ""), reverse=True)

    return episodes[:limit]


def get_podcast_by_id(podcast_id: str) -> Optional[dict]:
    return _podcast_cache.get(podcast_id)


async def search_podcasts(query: str, limit: int = 10) -> List[dict]:
    q = (query or "").strip().lower()
    if not q:
        return []

    pi_results = await _podcast_index_search_episodes(query, limit)

    if _cache_stale() or len(_podcast_cache) < 8:
        await get_podcasts(limit=80)

    seen = {e["id"] for e in pi_results}
    local: List[dict] = []
    for ep in _podcast_cache.values():
        if ep["id"] in seen:
            continue
        if q in (ep.get("title") or "").lower() or q in (ep.get("description") or "").lower():
            local.append(ep)

    merged = pi_results + local
    return merged[:limit]


def get_podcast_audio_url(podcast_id: str) -> Optional[str]:
    ep = _podcast_cache.get(podcast_id)
    return ep.get("audio_url") if ep else None
