# News service for RSS feed fetching and processing
import asyncio
import html
import hashlib
import logging
import re
import time
import aiohttp  # type: ignore[reportMissingImports]
import feedparser  # type: ignore[reportMissingImports]
from datetime import datetime, timezone
from typing import List, Dict, Optional
from lib.cache_registry import get_cache

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
    {"url": "https://www.france24.com/en/africa/rss", "source": "France 24 Africa", "category": "General", "region": "international"},
    {"url": "https://rss.dw.com/rdf/rss-en-africa", "source": "DW Africa", "category": "General", "region": "international"},
    
    # === AFRICAN CONTINENTAL ===
    {"url": "https://www.africanews.com/feed/", "source": "Africanews", "category": "General", "region": "continental"},
    {"url": "https://www.theafricareport.com/feed/", "source": "The Africa Report", "category": "General", "region": "continental"},
    {"url": "https://mg.co.za/feed/", "source": "Mail & Guardian", "category": "General", "region": "continental"},
    {"url": "https://www.nation.africa/rss.xml", "source": "Nation Africa", "category": "General", "region": "continental"},
    {"url": "https://www.news24.com/rss", "source": "News24", "category": "General", "region": "continental"},
    {"url": "https://www.monitor.co.ug/resource/rss/691150", "source": "Daily Monitor Uganda", "category": "General", "region": "continental"},
    {"url": "https://www.standardmedia.co.ke/rss/headlines.php", "source": "The Standard Kenya", "category": "General", "region": "continental"},
    {"url": "https://www.citizen.digital/feeds/rss.xml", "source": "The Citizen Tanzania", "category": "General", "region": "continental"},
    {"url": "https://theconversation.com/africa/articles.atom", "source": "The Conversation Africa", "category": "General", "region": "continental"},

    # === SPORTS ===
    {"url": "https://www.espn.com/espn/rss/soccer/news", "source": "ESPN Soccer", "category": "Sports", "region": "international"},
    {"url": "https://www.goal.com/en-ng/feeds/news", "source": "Goal Nigeria", "category": "Sports", "region": "local"},
    {"url": "https://www.skysports.com/rss/12040", "source": "Sky Sports Football", "category": "Sports", "region": "international"},
]

# Single source of truth for RSS feed count (used by API, tests, and docs)
RSS_FEED_COUNT = len(RSS_FEEDS)

# Authority weights for certainty scoring (domain -> weight 0.0–1.0). Unknown = 0.5.
SOURCE_WEIGHTS: Dict[str, float] = {
    "nan.ng": 1.0,
    "channelstv.com": 0.95,
    "channels.tv": 0.95,
    "premiumtimesng.com": 0.9,
    "punchng.com": 0.85,
    "vanguardngr.com": 0.8,
    "guardian.ng": 0.8,
    "dailytrust.com": 0.8,
    "bbc.com": 0.9,
    "bbci.co.uk": 0.9,
    "reuters.com": 0.95,
    "aljazeera.com": 0.85,
    "thisdaylive.com": 0.75,
    "tribuneonlineng.com": 0.75,
    "leadership.ng": 0.75,
    "businessday.ng": 0.8,
    "nairametrics.com": 0.8,
    "saharareporters.com": 0.75,
    "africanews.com": 0.85,
    "twitter.com": 0.2,
    "x.com": 0.2,
}

# ── Response cache (120s TTL): Upstash Redis with in-memory fallback ───
NEWS_CACHE_KEY = "narvo:news:all"
NEWS_MERGED_POOL_KEY = "narvo:news:merged_agg"
NEWS_CACHE_TTL = 120
_news_list_cache = get_cache("news_feeds")


def _invalidate_merged_news_pools() -> None:
    """Clear merged RSS+aggregator cluster caches when the base RSS feed is rebuilt."""
    prefix = NEWS_MERGED_POOL_KEY
    for k in list(_news_list_cache.keys()):
        if k == prefix or (isinstance(k, str) and k.startswith(prefix + ":")):
            try:
                del _news_list_cache[k]
            except KeyError:
                pass


async def _invalidate_all_news_caches() -> None:
    """Drop in-process and Redis news caches so the next read rebuilds from RSS/aggregators."""
    from lib.redis_client import delete_key

    _invalidate_merged_news_pools()
    try:
        del _news_list_cache[NEWS_CACHE_KEY]
    except KeyError:
        pass
    await delete_key(NEWS_CACHE_KEY)


def _title_words(title: str, min_len: int = 3) -> set:
    """Normalize title to set of significant words for clustering."""
    if not title or not isinstance(title, str):
        return set()
    raw = re.sub(r"[^\w\s]", " ", title.lower())
    return {w for w in raw.split() if len(w) >= min_len}


def cluster_related_articles(articles: List[Dict], min_shared_words: int = 3) -> List[List[Dict]]:
    """Group articles that report on the same event (title-based similarity).
    Only clusters articles with the same category and region so merged stories
    never mix e.g. Sports with Politics, and category/region filters apply correctly.
    Optimized to pre-calculate word sets to avoid N^2 regex overhead."""
    if not articles:
        return []
    
    # Pre-calculate tokens and metadata for all articles
    processed_articles = []
    for art in articles:
        processed_articles.append({
            "art": art,
            "words": _title_words(art.get("title") or ""),
            "cat": (art.get("category") or "").strip().lower(),
            "reg": (art.get("region") or "").strip().lower()
        })
    
    clusters: List[List[Dict]] = []
    # Store words of the representative article of each cluster
    cluster_reps_info = []

    for item in processed_articles:
        words = item["words"]
        art_cat = item["cat"]
        art_reg = item["reg"]
        art = item["art"]
        
        placed = False
        for i, cluster in enumerate(clusters):
            rep_info = cluster_reps_info[i]
            if art_cat != rep_info["cat"] or art_reg != rep_info["reg"]:
                continue
                
            rep_words = rep_info["words"]
            overlap = len(words & rep_words) if words and rep_words else 0
            if overlap >= min_shared_words or (words and rep_words and overlap >= min(2, len(words), len(rep_words))):
                cluster.append(art)
                placed = True
                break
        
        if not placed:
            clusters.append([art])
            cluster_reps_info.append({
                "words": words,
                "cat": art_cat,
                "reg": art_reg
            })
            
    return clusters


def _extract_domain(url: str) -> str:
    """Extract hostname from URL for weight lookup (e.g. punchng.com)."""
    if not url or not isinstance(url, str):
        return ""
    url = url.strip().lower()
    if "://" in url:
        url = url.split("://", 1)[1]
    return url.split("/")[0].replace("www.", "")


def get_source_weight(article: Dict) -> float:
    """Return authority weight for an article (by source_url or source name)."""
    url = article.get("source_url") or ""
    domain = _extract_domain(url)
    if domain and domain in SOURCE_WEIGHTS:
        return SOURCE_WEIGHTS[domain]
    return 0.5


def calculate_certainty_score(original_sources: List[Dict]) -> int:
    """Weighted average of source authority, normalized to 0–100."""
    if not original_sources:
        return 50
    total = 0.0
    for src in original_sources:
        url = src.get("url") or ""
        domain = _extract_domain(url)
        total += SOURCE_WEIGHTS.get(domain, 0.5)
    return min(100, round((total / len(original_sources)) * 100))


async def merge_clusters_to_stories(clusters: List[List[Dict]], enrich_with_scraping: bool = True) -> List[Dict]:
    """Turn clusters into one story per cluster with original_sources (time, role), certainty_score, and cluster_articles.
    When a cluster has multiple sources, roles are assigned via Gemini (assign_source_roles); otherwise order-based.
    Full article text is scraped concurrently per cluster so synthesize_composite_story gets rich content, not RSS snippets.
    Set enrich_with_scraping=False for faster list views where RSS snippets are sufficient."""
    from services.narrative_service import assign_source_roles, SOURCE_ROLES
    from services.article_scraper_service import scrape_articles_for_cluster

    result: List[Dict] = []
    for cluster in clusters:
        if not cluster:
            continue
        # Sort by published time (oldest first) for timeline order
        sorted_cluster = sorted(cluster, key=lambda x: (x.get("published") or ""))
        canonical = max(cluster, key=lambda x: len(x.get("summary") or ""))
        base = dict(canonical)

        # Scrape full article text for all sources in the cluster concurrently if requested.
        # This enriches cluster_articles so synthesize_composite_story gets full content,
        # not just RSS snippets. Falls back to original summary on scrape failure.
        if enrich_with_scraping:
            scraped_cluster = await scrape_articles_for_cluster(sorted_cluster, scrape_timeout=8, max_concurrent=4)
        else:
            scraped_cluster = sorted_cluster

        cluster_articles = [
            {
                "source": a.get("source") or "Unknown",
                "summary": a.get("summary") or "",
                "title": a.get("title") or "",
                "source_url": a.get("source_url") or "",
                "published": a.get("published") or "",
            }
            for a in scraped_cluster
        ]
        base["cluster_articles"] = cluster_articles
        # Build original_sources; assign roles via Gemini when multiple sources, else order-based.
        # Skip Gemini roles for performance when scraping is disabled (e.g. for list view).
        roles: List[str]
        if enrich_with_scraping and len(sorted_cluster) > 1:
            roles = await assign_source_roles(cluster_articles)
        elif len(sorted_cluster) > 1:
            roles = [SOURCE_ROLES[min(i, 2)] for i in range(len(sorted_cluster))]
        else:
            roles = [SOURCE_ROLES[0]]
            
        original_sources = []
        for i, a in enumerate(sorted_cluster):
            role = roles[i] if i < len(roles) else "EXPANSION"
            original_sources.append({
                "name": a.get("source") or "Unknown",
                "url": a.get("source_url") or "",
                "time": a.get("published") or "",
                "role": role,
            })
        base["original_sources"] = original_sources
        base["certainty_score"] = calculate_certainty_score(original_sources)
        if len(cluster) > 1:
            base["truth_score"] = min(100, (base.get("truth_score") or 100) + min(15, (len(cluster) - 1) * 5))
        result.append(base)
    return result


def deduplicate_by_title(items: List[Dict], title_slice: int = 60) -> List[Dict]:
    """Deduplicate items by normalized title. Prefer RSS (non-aggregator) over aggregator when both exist."""
    seen: Dict[str, Dict] = {}
    deduped: List[Dict] = []
    for item in items:
        raw = (item.get("title") or "").strip()
        key = raw.lower()[:title_slice] if raw else ""
        if not key:
            deduped.append(item)
            continue
        existing = seen.get(key)
        if not existing:
            seen[key] = item
            deduped.append(item)
        elif item.get("aggregator") and not existing.get("aggregator"):
            pass  # keep existing RSS, skip this aggregator duplicate
        elif not item.get("aggregator") and existing.get("aggregator"):
            idx = deduped.index(existing)
            deduped[idx] = item
            seen[key] = item
    return deduped


def flatten_merged_story_to_articles(story: Dict) -> List[Dict]:
    """Expand a pre-merged RSS cluster story into atomic articles for re-clustering with aggregators."""
    ca = story.get("cluster_articles")
    if not isinstance(ca, list) or len(ca) <= 1:
        return [story]
    parent_cat = story.get("category") or "General"
    parent_reg = story.get("region") or ""
    out: List[Dict] = []
    for c in ca:
        sid = hashlib.md5(
            f"{c.get('source_url', '')}{c.get('title', '')}{c.get('source', '')}".encode()
        ).hexdigest()[:12]
        out.append(
            {
                "id": sid,
                "title": (c.get("title") or story.get("title") or "Untitled")[:200],
                "summary": c.get("summary") or "",
                "source": c.get("source") or "Unknown",
                "source_url": c.get("source_url") or "",
                "published": c.get("published") or story.get("published") or "",
                "category": parent_cat,
                "region": parent_reg,
                "truth_score": story.get("truth_score", 100),
                "listen_count": story.get("listen_count", 0),
                "tags": story.get("tags") or [],
                "image_url": story.get("image_url"),
            }
        )
    return out


async def merge_rss_feed_with_aggregator_items(
    rss_merged: List[Dict],
    aggregator_items: List[Dict],
    *,
    enrich_with_scraping: bool = False,
    max_flat_articles: int = 400,
) -> List[Dict]:
    """Re-cluster RSS (possibly pre-merged) with aggregator items → one story per event."""
    flat: List[Dict] = []
    for s in rss_merged:
        flat.extend(flatten_merged_story_to_articles(s))
    flat.extend(aggregator_items)
    flat.sort(key=lambda x: str(x.get("published") or ""), reverse=True)
    cap = max_flat_articles if max_flat_articles > 0 else len(flat)
    flat = flat[:cap]
    clusters = cluster_related_articles(flat)
    return await merge_clusters_to_stories(clusters, enrich_with_scraping=enrich_with_scraping)


def _merged_pool_cache_key(aggregator_sources: Optional[List[str]]) -> str:
    if not aggregator_sources:
        return NEWS_MERGED_POOL_KEY
    return f"{NEWS_MERGED_POOL_KEY}:{'+'.join(sorted(aggregator_sources))}"


async def get_cached_merged_news_pool(
    aggregator_sources: Optional[List[str]] = None,
    max_flat_articles: int = 400,
    force_refresh: bool = False,
) -> List[Dict]:
    """RSS clustered feed + Mediastack/NewsData, re-clustered for multi-source synthesis (short TTL cache)."""
    if force_refresh:
        await _invalidate_all_news_caches()
    cache_key = _merged_pool_cache_key(aggregator_sources)
    if cache_key in _news_list_cache:
        return list(_news_list_cache[cache_key])

    rss = await get_cached_all_news()
    try:
        from services.aggregator_service import get_normalized_aggregator_news

        agg = await get_normalized_aggregator_news(sources=aggregator_sources)
        merged = await merge_rss_feed_with_aggregator_items(
            rss,
            list(agg),
            enrich_with_scraping=False,
            max_flat_articles=max_flat_articles,
        )
    except Exception as e:
        logger.warning("[News] Merged pool fallback to RSS-only: %s", e)
        merged = list(rss)

    merged.sort(key=lambda x: str(x.get("published") or ""), reverse=True)
    _news_list_cache[cache_key] = list(merged)
    return list(merged)


async def get_cached_all_news(force_refresh: bool = False) -> List[Dict]:
    """Return full news list, using cache if fresh (120s TTL). Tiered: memory -> Redis -> fetch."""
    if force_refresh:
        await _invalidate_all_news_caches()
    if NEWS_CACHE_KEY in _news_list_cache:
        return list(_news_list_cache[NEWS_CACHE_KEY])

    from lib.redis_client import get_json, set_json

    cached = await get_json(NEWS_CACHE_KEY)
    if cached is not None and isinstance(cached, list):
        _news_list_cache[NEWS_CACHE_KEY] = list(cached)
        _invalidate_merged_news_pools()
        return list(cached)

    all_news = await fetch_all_news(limit=500, category=None)
    all_news.sort(key=lambda x: x.get("published") or "", reverse=True)

    # Update both layers
    _news_list_cache[NEWS_CACHE_KEY] = list(all_news)
    _invalidate_merged_news_pools()
    await set_json(NEWS_CACHE_KEY, all_news, ttl_seconds=NEWS_CACHE_TTL)
    return list(all_news)


# ── Feed Health Monitoring ────────────────────────────────────────────

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
        "total": RSS_FEED_COUNT,
        "green": green,
        "amber": amber,
        "red": red,
        "unknown": RSS_FEED_COUNT - green - amber - red,
        "sources": sources,
    }

async def fetch_rss_feed(session: aiohttp.ClientSession, feed_config: Dict, timeout: int = 5) -> List[Dict]:
    """Fetch and parse a single RSS feed with error handling"""
    items = []
    try:
        async with session.get(feed_config["url"], headers={"User-Agent": "NarvoBot/2.0"}, timeout=aiohttp.ClientTimeout(total=timeout)) as response:
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
                    
                    # Strip HTML tags and decode entities for clean, display-ready text
                    summary = entry.get('summary', entry.get('description', ''))
                    if '<' in summary:
                        summary = re.sub(r'<[^>]+>', '', summary)
                    summary = html.unescape(summary)
                    title = entry.get('title', 'Untitled')
                    if '<' in title:
                        title = re.sub(r'<[^>]+>', '', title)
                    title = html.unescape(title)[:200]
                    items.append({
                        "id": item_id,
                        "title": title,
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
        logger.debug("Error fetching %s: %s", feed_config["source"], e)

    return items

async def fetch_all_news(
    limit: int = 50,
    category: Optional[str] = None,
    region: Optional[str] = None,
    enrich_with_scraping: bool = False,
) -> List[Dict]:
    """Fetch news from all RSS feeds (single source of truth for RSS).
    enrich_with_scraping: If True, scrapes full article text for every cluster.
    Keep False for default list views to ensure sub-5s response times."""
    all_news = []
    
    # Per-feed concurrency limit to avoid overwhelming the network/system
    semaphore = asyncio.Semaphore(20)
    
    async def _fetch_with_sem(session, feed):
        async with semaphore:
            return await fetch_rss_feed(session, feed)

    timeout = aiohttp.ClientTimeout(total=15)
    async with aiohttp.ClientSession(timeout=timeout) as session:
        tasks = [_fetch_with_sem(session, feed) for feed in RSS_FEEDS]
        results = await asyncio.gather(*tasks, return_exceptions=True)
    
    for items in results:
        if isinstance(items, list):
            all_news.extend(items)
    
    # Multi-source: cluster related articles, then one story per cluster with original_sources (roles via Gemini)
    clusters = cluster_related_articles(all_news)
    all_news = await merge_clusters_to_stories(clusters, enrich_with_scraping=enrich_with_scraping)

    if category:
        all_news = [item for item in all_news if item.get("category", "").lower() == category.lower()]
    if region:
        all_news = [item for item in all_news if item.get("region", "").lower() == region.lower()]
    
    # Sort by published date (newest first) and remove duplicates
    seen_titles = set()
    unique_news = []
    for item in sorted(all_news, key=lambda x: x.get("published") or "", reverse=True):
        title_key = (item.get("title") or "")[:50].lower()
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


async def get_breaking_news_list(max_items: int = 3, force_refresh: bool = False) -> List[Dict]:
    """Get breaking/urgent news as a list (for API compatibility)."""
    try:
        all_news = await get_cached_merged_news_pool(force_refresh=force_refresh)
    except Exception:
        all_news = await get_cached_all_news(force_refresh=force_refresh)
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
        "total_sources": RSS_FEED_COUNT,
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
