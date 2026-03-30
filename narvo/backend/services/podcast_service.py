"""
Podcast service — fetches real podcast episodes from RSS feeds + provides search/detail.
"""
import asyncio
import logging
import feedparser
import hashlib
from datetime import datetime, timezone
from typing import List, Dict, Optional

logger = logging.getLogger(__name__)

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

# In-memory cache
_podcast_cache: Dict[str, dict] = {}
_cache_time: Optional[datetime] = None
CACHE_TTL = 1800  # 30 min


def _parse_duration(entry) -> str:
    """Extract duration from feed entry"""
    dur = entry.get("itunes_duration", "")
    if dur:
        return str(dur)
    return "30:00"


def _generate_id(title: str, url: str) -> str:
    """Generate stable ID from title + URL"""
    return "ep-" + hashlib.md5(f"{title}:{url}".encode()).hexdigest()[:8]


def _parse_feed(feed_info: dict) -> List[dict]:
    """Parse a single RSS feed into podcast episodes"""
    episodes = []
    try:
        feed = feedparser.parse(feed_info["url"])
        if not feed.entries:
            return episodes
        
        for entry in feed.entries[:5]:  # Max 5 per feed
            title = entry.get("title", "Untitled Episode")
            ep_id = _generate_id(title, feed_info["url"])
            
            # Get audio URL
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
            
            # Published date
            published = ""
            if entry.get("published_parsed"):
                try:
                    published = datetime(*entry.published_parsed[:6]).strftime("%Y-%m-%d")
                except Exception:
                    pass
            
            ep = {
                "id": ep_id,
                "episode": entry.get("itunes_episode", ""),
                "title": title,
                "duration": _parse_duration(entry),
                "description": entry.get("summary", entry.get("description", ""))[:500],
                "category": feed_info.get("category", "General"),
                "published": published,
                "audio_url": audio_url,
                "source": feed.feed.get("title", feed_info.get("fallback_title", "")),
            }
            episodes.append(ep)
            _podcast_cache[ep_id] = ep
    except Exception as e:
        logger.error("[Podcast] Feed parse error for %s: %s", feed_info.get("url", "unknown"), e)
    return episodes


async def get_podcasts(sort: str = "latest", limit: int = 10, category: str = None) -> List[dict]:
    """Fetch podcast episodes from all feeds"""
    global _cache_time
    
    # Use cache if fresh
    if _cache_time and (datetime.now(timezone.utc) - _cache_time).seconds < CACHE_TTL and _podcast_cache:
        episodes = list(_podcast_cache.values())
    else:
        episodes = []
        # Parse feeds concurrently-ish (feedparser is sync, but we batch)
        loop = asyncio.get_event_loop()
        for feed_info in PODCAST_FEEDS:
            try:
                parsed = await loop.run_in_executor(None, _parse_feed, feed_info)
                episodes.extend(parsed)
            except Exception as e:
                logger.error("[Podcast] Error fetching %s: %s", feed_info.get("url"), e)
        _cache_time = datetime.now(timezone.utc)
    
    # Filter by category
    if category and category != "all":
        episodes = [e for e in episodes if e.get("category", "").lower() == category.lower()]
    
    # Sort
    if sort == "popular":
        episodes.sort(key=lambda x: x.get("duration", "0"), reverse=True)
    else:
        episodes.sort(key=lambda x: x.get("published", ""), reverse=True)
    
    return episodes[:limit]


def get_podcast_by_id(podcast_id: str) -> Optional[dict]:
    """Get a specific podcast episode by ID"""
    return _podcast_cache.get(podcast_id)


async def search_podcasts(query: str, limit: int = 10) -> List[dict]:
    """Search podcasts by title or description"""
    q = query.lower()
    # Ensure cache is populated
    if not _podcast_cache:
        await get_podcasts()
    
    results = []
    for ep in _podcast_cache.values():
        if q in ep.get("title", "").lower() or q in ep.get("description", "").lower():
            results.append(ep)
    return results[:limit]


def get_podcast_audio_url(podcast_id: str) -> Optional[str]:
    """Get audio URL for a specific podcast"""
    ep = _podcast_cache.get(podcast_id)
    return ep.get("audio_url") if ep else None
