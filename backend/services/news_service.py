# News service for RSS feed fetching and processing
import asyncio
import hashlib
import logging
import aiohttp
import feedparser
from datetime import datetime, timezone
from typing import List, Dict, Optional

logger = logging.getLogger(__name__)

# RSS Feed Sources - Populated from Narvo Content Sources Document
RSS_FEEDS = [
    # === LOCAL (NIGERIA) ===
    {"url": "https://www.bbc.com/hausa/topics/c2dwqd1zr92t/rss.xml", "source": "BBC Hausa", "category": "General", "region": "local"},
    {"url": "https://www.channelstv.com/feed/", "source": "Channels TV", "category": "General", "region": "local"},
    {"url": "https://dailytrust.com/feed/", "source": "Daily Trust", "category": "General", "region": "local"},
    {"url": "https://www.vanguardngr.com/feed/", "source": "Vanguard Nigeria", "category": "General", "region": "local"},
    {"url": "https://guardian.ng/feed/", "source": "Guardian Nigeria", "category": "General", "region": "local"},
    {"url": "https://punchng.com/feed/", "source": "Punch Nigeria", "category": "General", "region": "local"},
    {"url": "https://www.premiumtimesng.com/feed", "source": "Premium Times", "category": "Politics", "region": "local"},
    {"url": "http://saharareporters.com/rss.xml", "source": "Sahara Reporters", "category": "Politics", "region": "local"},
    {"url": "https://nairametrics.com/feed/", "source": "Nairametrics", "category": "Economy", "region": "local"},
    {"url": "https://www.thisdaylive.com/feed/", "source": "ThisDay", "category": "General", "region": "local"},
    {"url": "https://tribuneonlineng.com/feed/", "source": "Nigerian Tribune", "category": "General", "region": "local"},
    {"url": "https://leadership.ng/feed/", "source": "Leadership", "category": "Politics", "region": "local"},
    {"url": "https://businessday.ng/feed/", "source": "Business Day Nigeria", "category": "Economy", "region": "local"},
    {"url": "https://www.pulse.ng/rss", "source": "Pulse Nigeria", "category": "Entertainment", "region": "local"},
    {"url": "https://techpoint.africa/feed/", "source": "Techpoint Africa", "category": "Tech", "region": "local"},
    {"url": "https://ripplesnigeria.com/feed/", "source": "Ripples Nigeria", "category": "Economy", "region": "local"},
    
    # === LOCAL (ADDITIONAL) ===
    {"url": "https://naijanews.com/feed/", "source": "Naija News", "category": "General", "region": "local"},
    {"url": "https://www.tvcnews.tv/feed/", "source": "TVC News", "category": "General", "region": "local"},
    {"url": "https://www.arise.tv/feed/", "source": "Arise News", "category": "General", "region": "local"},
    
    # === INTERNATIONAL ===
    {"url": "https://feeds.bbci.co.uk/news/world/africa/rss.xml", "source": "BBC Africa", "category": "General", "region": "international"},
    {"url": "http://rss.cnn.com/rss/edition_africa.rss", "source": "CNN Africa", "category": "General", "region": "international"},
    {"url": "https://www.aljazeera.com/xml/rss/all.xml", "source": "Al Jazeera", "category": "General", "region": "international"},
    {"url": "https://www.reuters.com/rssFeed/worldNews", "source": "Reuters World", "category": "General", "region": "international"},
    {"url": "https://allafrica.com/tools/headlines/rdf/latest/headlines.rdf", "source": "AllAfrica", "category": "General", "region": "international"},
    {"url": "https://www.voanews.com/api/z-moeqevi_q", "source": "Voice of America Africa", "category": "General", "region": "international"},
    {"url": "https://feeds.npr.org/1001/rss.xml", "source": "NPR News", "category": "General", "region": "international"},
    {"url": "https://feeds.skynews.com/feeds/rss/world.xml", "source": "Sky News World", "category": "General", "region": "international"},
    {"url": "https://feeds.bbci.co.uk/news/rss.xml", "source": "BBC World Service", "category": "General", "region": "international"},
    
    # === AFRICAN CONTINENTAL ===
    {"url": "https://www.africanews.com/feed/", "source": "Africanews", "category": "General", "region": "continental"},
    {"url": "https://www.theafricareport.com/feed/", "source": "The Africa Report", "category": "General", "region": "continental"},
    {"url": "https://mg.co.za/feed/", "source": "Mail & Guardian", "category": "General", "region": "continental"},
    {"url": "https://www.nation.africa/rss.xml", "source": "Nation Africa", "category": "General", "region": "continental"},
    {"url": "https://www.news24.com/rss", "source": "News24", "category": "General", "region": "continental"},
    {"url": "https://www.monitor.co.ug/resource/rss/691150", "source": "Daily Monitor Uganda", "category": "General", "region": "continental"},
    {"url": "https://www.standardmedia.co.ke/rss/headlines.php", "source": "The Standard Kenya", "category": "General", "region": "continental"},
    {"url": "https://www.citizen.digital/feeds/rss.xml", "source": "The Citizen Tanzania", "category": "General", "region": "continental"},

    # === SPORTS ===
    {"url": "https://www.espn.com/espn/rss/soccer/news", "source": "ESPN Soccer", "category": "Sports", "region": "international"},
    {"url": "https://www.goal.com/en-ng/feeds/news", "source": "Goal Nigeria", "category": "Sports", "region": "local"},
    {"url": "https://www.skysports.com/rss/12040", "source": "Sky Sports Football", "category": "Sports", "region": "international"},
]

# ── Response cache (120s TTL): Upstash Redis with in-memory fallback ───
NEWS_CACHE_KEY = "narvo:news:all"
NEWS_CACHE_TTL = 120


async def get_cached_all_news() -> List[Dict]:
    """Return full news list, using cache if fresh (120s TTL). Single source for RSS list."""
    from lib.redis_client import get_json, set_json

    cached = await get_json(NEWS_CACHE_KEY)
    if cached is not None and isinstance(cached, list):
        return list(cached)
    all_news = await fetch_all_news(limit=500, category=None)
    all_news.sort(key=lambda x: x.get("published") or "", reverse=True)
    await set_json(NEWS_CACHE_KEY, all_news, ttl_seconds=NEWS_CACHE_TTL)
    return list(all_news)


# ── Feed Health Monitoring ────────────────────────────────────────────

import time

_feed_health: Dict = {}  # { source_name: { status, latency_ms, last_checked } }
_health_check_running = False


async def _ping_feed(session: aiohttp.ClientSession, feed: Dict) -> Dict:
    """Ping a single feed and return its health status."""
    name = feed["source"]
    url = feed["url"]
    start = time.monotonic()
    try:
        async with session.get(url, headers={"User-Agent": "NarvoBot/2.0"}, allow_redirects=True) as resp:
            latency = int((time.monotonic() - start) * 1000)
            if resp.status == 200:
                status = "green" if latency < 5000 else "amber"
            else:
                status = "amber"
            return {"source": name, "status": status, "latency_ms": latency, "http": resp.status}
    except asyncio.TimeoutError:
        return {"source": name, "status": "red", "latency_ms": 10000, "http": 0}
    except Exception:
        return {"source": name, "status": "red", "latency_ms": -1, "http": 0}


async def run_health_check() -> Dict:
    """Check all feeds concurrently. Returns full health map."""
    global _feed_health, _health_check_running
    if _health_check_running:
        return _feed_health
    _health_check_running = True
    now = datetime.now(timezone.utc).isoformat()
    try:
        timeout = aiohttp.ClientTimeout(total=8)
        async with aiohttp.ClientSession(timeout=timeout) as session:
            tasks = [_ping_feed(session, f) for f in RSS_FEEDS]
            results = await asyncio.gather(*tasks)
        for r in results:
            _feed_health[r["source"]] = {
                "status": r["status"],
                "latency_ms": r["latency_ms"],
                "http": r["http"],
                "last_checked": now,
            }
    finally:
        _health_check_running = False
    return _feed_health


def get_feed_health() -> Dict:
    """Return cached health data with summary stats."""
    sources = []
    green = amber = red = 0
    for feed in RSS_FEEDS:
        name = feed["source"]
        h = _feed_health.get(name, {"status": "unknown", "latency_ms": -1, "last_checked": None})
        entry = {
            "name": name,
            "region": feed.get("region", "local"),
            "status": h["status"] if isinstance(h.get("status"), str) else "unknown",
            "latency_ms": h.get("latency_ms", -1),
            "last_checked": h.get("last_checked"),
        }
        sources.append(entry)
        if entry["status"] == "green":
            green += 1
        elif entry["status"] == "amber":
            amber += 1
        elif entry["status"] == "red":
            red += 1

    return {
        "total": len(RSS_FEEDS),
        "green": green,
        "amber": amber,
        "red": red,
        "unknown": len(RSS_FEEDS) - green - amber - red,
        "sources": sources,
    }

async def fetch_rss_feed(feed_config: Dict, timeout: int = 10) -> List[Dict]:
    """Fetch and parse a single RSS feed with error handling"""
    items = []
    try:
        async with aiohttp.ClientSession(timeout=aiohttp.ClientTimeout(total=timeout)) as session:
            async with session.get(feed_config["url"], headers={"User-Agent": "NarvoBot/2.0"}) as response:
                if response.status == 200:
                    content = await response.text()
                    parsed = feedparser.parse(content)
                    
                    for entry in parsed.entries[:15]:
                        item_id = hashlib.md5(f"{entry.get('link', '')}{entry.get('title', '')}".encode()).hexdigest()[:12]
                        
                        published = None
                        if hasattr(entry, 'published_parsed') and entry.published_parsed:
                            try:
                                published = datetime(*entry.published_parsed[:6]).isoformat()
                            except (TypeError, ValueError):
                                pass
                        
                        image_url = None
                        if hasattr(entry, 'media_content') and entry.media_content:
                            image_url = entry.media_content[0].get('url')
                        elif hasattr(entry, 'enclosures') and entry.enclosures:
                            for enc in entry.enclosures:
                                if enc.get('type', '').startswith('image'):
                                    image_url = enc.get('href')
                                    break
                        
                        summary = entry.get('summary', entry.get('description', ''))[:500]
                        if '<' in summary:
                            import re
                            summary = re.sub(r'<[^>]+>', '', summary)
                        
                        items.append({
                            "id": item_id,
                            "title": entry.get('title', 'Untitled')[:200],
                            "summary": summary,
                            "source": feed_config["source"],
                            "source_url": entry.get('link'),
                            "image_url": image_url,
                            "published": published,
                            "category": feed_config.get("category", "General"),
                            "region": feed_config.get("region", "Africa"),
                            "truth_score": 100,
                            "listen_count": 0,
                            "tags": [t.get('term', '') for t in entry.get('tags', [])][:5] if hasattr(entry, 'tags') else [],
                        })
    except Exception as e:
        logger.error("Error fetching %s: %s", feed_config["source"], e)

    return items

async def fetch_all_news(
    limit: int = 50,
    category: Optional[str] = None,
    region: Optional[str] = None,
) -> List[Dict]:
    """Fetch news from all RSS feeds (single source of truth for RSS)."""
    all_news = []
    tasks = [fetch_rss_feed(feed) for feed in RSS_FEEDS]
    results = await asyncio.gather(*tasks, return_exceptions=True)

    for items in results:
        if isinstance(items, list):
            all_news.extend(items)

    if category:
        all_news = [item for item in all_news if item.get("category", "").lower() == category.lower()]
    if region:
        all_news = [item for item in all_news if item.get("region", "").lower() == region.lower()]
    
    # Sort by published date (newest first) and remove duplicates
    seen_titles = set()
    unique_news = []
    for item in sorted(all_news, key=lambda x: x.get("published") or "", reverse=True):
        title_key = item["title"][:50].lower()
        if title_key not in seen_titles:
            seen_titles.add(title_key)
            unique_news.append(item)
    
    return unique_news[:limit]

async def search_news(query: str, category: Optional[str] = None, limit: int = 20) -> Dict:
    """Search news articles by query"""
    all_news = await fetch_all_news(limit=100)
    
    query_lower = query.lower()
    filtered = []
    
    for item in all_news:
        title_match = query_lower in item.get("title", "").lower()
        summary_match = query_lower in item.get("summary", "").lower()
        
        if title_match or summary_match:
            if category and item.get("category", "").lower() != category.lower():
                continue
            filtered.append(item)
    
    # Sort by relevance
    filtered.sort(key=lambda x: (
        query_lower not in x.get("title", "").lower(),
        x.get("published", "")
    ), reverse=True)
    
    return {
        "results": filtered[:limit],
        "total": len(filtered),
        "query": query
    }

async def get_breaking_news() -> Optional[Dict]:
    """Get breaking/developing news (single item)."""
    all_news = await fetch_all_news(limit=30)
    breaking_keywords = ['breaking', 'urgent', 'flash', 'just in', 'developing', 'live']
    for item in all_news:
        title_lower = item.get("title", "").lower()
        if any(kw in title_lower for kw in breaking_keywords):
            return {**item, "is_breaking": True}
    if all_news:
        return {**all_news[0], "is_developing": True}
    return None


async def get_breaking_news_list(max_items: int = 3) -> List[Dict]:
    """Get breaking/urgent news as a list (for API compatibility)."""
    all_news = await get_cached_all_news()
    all_news = (all_news or [])[:30]
    breaking_keywords = ["breaking", "urgent", "flash", "just in", "developing"]
    breaking = []
    for story in all_news:
        title_lower = (story.get("title") or "").lower()
        if any(kw in title_lower for kw in breaking_keywords):
            breaking.append(story)
    if not breaking and all_news:
        latest = dict(all_news[0])
        latest["is_developing"] = True
        breaking = [latest]
    return breaking[:max_items]

async def get_trending_topics() -> Dict:
    """Get trending topics from recent news"""
    all_news = await fetch_all_news(limit=50)
    
    category_counts = {}
    keyword_counts = {}
    keywords_to_track = ["election", "economy", "trade", "climate", "technology", "health", "politics", "africa"]
    
    for item in all_news:
        cat = item.get("category", "general").lower()
        category_counts[cat] = category_counts.get(cat, 0) + 1
        
        title_lower = item.get("title", "").lower()
        for kw in keywords_to_track:
            if kw in title_lower:
                keyword_counts[kw] = keyword_counts.get(kw, 0) + 1
    
    top_categories = sorted(category_counts.items(), key=lambda x: x[1], reverse=True)[:5]
    top_keywords = sorted(keyword_counts.items(), key=lambda x: x[1], reverse=True)[:5]
    
    return {
        "tags": [f"#{cat.upper()}" for cat, _ in top_categories],
        "topics": [{"name": kw.title(), "count": f"{cnt * 100}+"} for kw, cnt in top_keywords][:5],
        "updated_at": datetime.now(timezone.utc).isoformat()
    }


def get_content_sources() -> Dict:
    """Get metadata about all content sources"""
    local_sources = [f for f in RSS_FEEDS if f.get("region") == "local"]
    intl_sources = [f for f in RSS_FEEDS if f.get("region") == "international"]
    continental_sources = [f for f in RSS_FEEDS if f.get("region") == "continental"]
    
    categories = {}
    for feed in RSS_FEEDS:
        cat = feed.get("category", "General")
        categories[cat] = categories.get(cat, 0) + 1
    
    return {
        "total_sources": len(RSS_FEEDS),
        "local_sources": len(local_sources),
        "international_sources": len(intl_sources),
        "continental_sources": len(continental_sources),
        "categories": categories,
        "sources": [
            {
                "name": f["source"],
                "category": f.get("category", "General"),
                "region": f.get("region", "local"),
                "url": f["url"].split("/feed")[0].split("/rss")[0]
            }
            for f in RSS_FEEDS
        ],
        "broadcast_sources": [
            # TV Stations
            {"name": "Channels TV", "type": "TV", "region": "local", "url": "channelstv.com"},
            {"name": "TVC News", "type": "TV", "region": "local", "url": "tvcnews.tv"},
            {"name": "Arise News", "type": "TV", "region": "local", "url": "arise.tv"},
            {"name": "NTA", "type": "TV", "region": "local", "url": "nta.ng"},
            {"name": "AIT", "type": "TV", "region": "local", "url": "ait.live"},
            {"name": "CNN", "type": "TV", "region": "international", "url": "cnn.com"},
            {"name": "BBC News", "type": "TV", "region": "international", "url": "bbc.com"},
            {"name": "Sky News", "type": "TV", "region": "international", "url": "sky.com"},
            # Radio Stations
            {"name": "Radio Nigeria", "type": "Radio", "region": "local", "url": "radionigeria.gov.ng"},
            {"name": "Cool FM", "type": "Radio", "region": "local", "url": "coolfm.ng"},
            {"name": "Wazobia FM", "type": "Radio", "region": "local", "url": "wazobiafm.com"},
            {"name": "Nigeria Info FM", "type": "Radio", "region": "local", "url": "nigeriainfo.fm"},
            {"name": "Beat FM", "type": "Radio", "region": "local", "url": "thebeat99.com"},
            {"name": "Brila FM", "type": "Radio", "region": "local", "url": "brila.net"},
            {"name": "BBC World Service", "type": "Radio", "region": "international", "url": "bbc.co.uk"},
            {"name": "NPR", "type": "Radio", "region": "international", "url": "npr.org"},
            {"name": "Voice of America", "type": "Radio", "region": "international", "url": "voanews.com"},
        ],
        "verification_apis": [
            {"name": "Google Fact Check", "status": "active", "capability": "ClaimSearch API, ClaimReview Schema"},
            {"name": "ClaimBuster", "status": "planned", "capability": "AI-powered claim-worthiness detection"},
            {"name": "MyAIFactChecker", "status": "planned", "capability": "Africa-focused AI verification"},
        ],
        "aggregator_apis": [
            {"name": "Mediastack", "status": "planned", "capability": "REST API with Nigeria filtering"},
            {"name": "NewsData.io", "status": "planned", "capability": "Global and local news monitoring"},
        ]
    }
