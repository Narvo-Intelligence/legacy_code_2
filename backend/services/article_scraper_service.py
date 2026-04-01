# Full-article scraper — multi-library extraction cascade
# Priority: trafilatura → newspaper4k → readability-lxml → goose3 → BeautifulSoup
# Each extractor is tried in order; first one returning ≥ MIN_CONTENT_CHARS wins.
# RSS summary is kept as final fallback so callers always receive something useful.
import asyncio
import logging
from typing import Dict, List, Optional

logger = logging.getLogger(__name__)

DEFAULT_MIN_SNIPPET_CHARS = 350
MIN_CONTENT_CHARS = 150          # minimum chars to accept from any extractor
SCRAPE_USER_AGENT = "NarvoBot/3.0 (+https://narvo.news)"

from lib.supabase_db import get_supabase_db
import hashlib


def _get_url_hash(url: str) -> str:
    """Consistently generate MD5 hash for a URL."""
    return hashlib.md5(url.strip().lower().encode()).hexdigest()


# ── Synchronous extractors (each runs in a thread-pool executor) ──────────────

def _extract_trafilatura(html: str, url: str) -> Optional[str]:
    """Primary extractor — trafilatura is purpose-built for news article extraction
    and handles boilerplate removal, paywalls, and multilingual text well."""
    try:
        import trafilatura
        text = trafilatura.extract(
            html,
            url=url,
            include_comments=False,
            include_tables=False,
            no_fallback=False,
            favor_precision=False,
            favor_recall=True,
        )
        return (text or "").strip() or None
    except Exception as e:
        logger.debug("[Scraper] trafilatura failed for %s: %s", url[:60], e)
        return None

def _extract_newspaper4k(html: str, url: str) -> Optional[str]:
    """Secondary extractor — newspaper4k is a modern fork of newspaper3k."""
    try:
        from newspaper import Article
        article = Article(url)
        article.download(input_html=html)
        article.parse()
        text = (article.text or "").strip()
        return text if len(text) >= MIN_CONTENT_CHARS else None
    except Exception as e:
        logger.debug("[Scraper] newspaper4k failed for %s: %s", url[:60], e)
        return None


# ── Core synchronous scrape (runs in executor) ────────────────────────────────

def _extract_newspaper4k_full(html: str, url: str) -> Dict:
    """Advanced newspaper4k extraction returning text and enriched metadata."""
    try:
        from newspaper import Article
        article = Article(url)
        article.download(input_html=html)
        article.parse()
        text = (article.text or "").strip()
        return {
            "text": text if len(text) >= MIN_CONTENT_CHARS else None,
            "title": (article.title or "").strip(),
            "authors": article.authors or [],
            "top_image": article.top_image,
            "publish_date": article.publish_date.isoformat() if article.publish_date else None,
        }
    except Exception:
        return {}


def _extract_readability(html: str, url: str) -> Optional[str]:
    """Tertiary extractor — readability-lxml ports Mozilla Readability to Python."""
    try:
        from readability import Document
        from html.parser import HTMLParser

        doc = Document(html)
        raw = doc.summary(html_partial=True)

        class _StripHTML(HTMLParser):
            def __init__(self):
                super().__init__()
                self._parts: List[str] = []
            def handle_data(self, data: str):
                self._parts.append(data)
            def get_text(self) -> str:
                return " ".join(p.strip() for p in self._parts if p.strip())

        parser = _StripHTML()
        parser.feed(raw)
        text = parser.get_text().strip()
        return text if len(text) >= MIN_CONTENT_CHARS else None
    except Exception as e:
        logger.debug("[Scraper] readability failed for %s: %s", url[:60], e)
        return None


def _extract_goose3(html: str, url: str) -> Optional[str]:
    """Quaternary extractor — Goose3 is a robust extractor."""
    try:
        from goose3 import Goose
        with Goose() as g:
            article = g.extract(url=url, raw_html=html)
            text = (article.cleaned_text or "").strip()
        return text if len(text) >= MIN_CONTENT_CHARS else None
    except Exception as e:
        logger.debug("[Scraper] goose3 failed for %s: %s", url[:60], e)
        return None


def _extract_beautifulsoup(html: str, url: str) -> Optional[str]:
    """Final fallback — strips all HTML tags."""
    try:
        from bs4 import BeautifulSoup
        soup = BeautifulSoup(html, "lxml")
        for tag in soup(["script", "style", "nav", "header", "footer", "aside", "form", "noscript"]):
            tag.decompose()
        text = " ".join(soup.get_text(" ", strip=True).split())
        return text if len(text) >= MIN_CONTENT_CHARS else None
    except Exception as e:
        logger.debug("[Scraper] BeautifulSoup failed for %s: %s", url[:60], e)
        return None


# ── Core synchronous scrape (runs in executor) ────────────────────────────────

def _sync_scrape_article(url: str, timeout: int = 15) -> Optional[str]:
    """
    Synchronous scraping logic: fetches HTML and runs the extraction cascade.
    """
    import requests
    try:
        response = requests.get(
            url,
            headers={"User-Agent": SCRAPE_USER_AGENT},
            timeout=timeout,
            verify=False  # Tolerate SSL issues for broad coverage
        )
        response.raise_for_status()
        html = response.text
    except Exception as e:
        logger.warning("[Scraper] HTTP fetch failed for %s: %s", url[:60], e)
        return None

    # Try enriched newspaper4k first to capture metadata
    enriched = _extract_newspaper4k_full(html, url)
    best_text = enriched.get("text")
    extraction_source = "newspaper4k_enriched"

    if not best_text:
        extractors = [
            ("trafilatura",   _extract_trafilatura),
            ("newspaper4k",   _extract_newspaper4k),
            ("readability",   _extract_readability),
            ("goose3",        _extract_goose3),
            ("beautifulsoup", _extract_beautifulsoup),
        ]

        for name, extractor in extractors:
            text = extractor(html, url)
            if text and len(text) >= MIN_CONTENT_CHARS:
                best_text = text
                extraction_source = name
                break

    if best_text:
        logger.debug("[Scraper] %s succeeded for %s (%d chars)", extraction_source, url[:60], len(best_text))
        # Persistence: Save to DB in the background or synchronously here for consistency
        try:
            url_hash = _get_url_hash(url)
            metadata = enriched if extraction_source == "newspaper4k_enriched" else {"source": extraction_source}
            get_supabase_db().table("scraped_articles").upsert({
                "url_hash": url_hash,
                "url": url,
                "title": enriched.get("title") or "",
                "full_text": best_text,
                "metadata": metadata,
                "scraped_at": "now()",
            }).execute()
        except Exception as e:
            logger.error("[Scraper] DB persistence failed: %s", e)
        return best_text

    logger.warning("[Scraper] All extractors failed for %s", url[:60])
    return None


# ── Async public API ──────────────────────────────────────────────────────────

async def fetch_article_text(
    url: str,
    timeout_seconds: int = 10,
) -> Optional[str]:
    """
    Async wrapper around _sync_scrape_article.
    Runs the blocking cascade in a thread-pool executor; enforces a hard timeout.
    Returns the best extracted text, or None on failure / timeout.
    """
    if not url or not url.startswith("http"):
        return None

    # Step 1: Check Persistence
    try:
        url_hash = _get_url_hash(url)
        db = get_supabase_db()
        cached = db.table("scraped_articles").select("full_text").eq("url_hash", url_hash).limit(1).execute()
        if cached and cached.data:
            logger.debug("[Scraper] Serving from DB: %s", url[:60])
            return cached.data[0]["full_text"]
    except Exception as e:
        logger.warning("[Scraper] Persistence lookup failed: %s", e)

    # Step 2: Fetch and Cascade
    try:
        loop = asyncio.get_event_loop()
        return await asyncio.wait_for(
            loop.run_in_executor(None, _sync_scrape_article, url, timeout_seconds),
            timeout=timeout_seconds + 3,
        )
    except asyncio.TimeoutError:
        logger.warning("[Scraper] Timeout: %s", url[:60])
        return None
    except Exception as e:
        logger.warning("[Scraper] Unexpected error for %s: %s", url[:60], e)
        return None


async def get_text_for_narrative(
    title: str,
    summary: str,
    source_url: Optional[str],
    min_snippet_chars: int = DEFAULT_MIN_SNIPPET_CHARS,
    scrape_timeout: int = 12,
    prefer_scrape: bool = True,
) -> str:
    """
    Return the richest available text for AI narrative generation.

    When prefer_scrape=True (default): scraping is primary — the multi-library cascade
    fetches full article text; RSS summary is used only as fallback.
    When prefer_scrape=False: legacy mode — only scrapes when the RSS summary is short.
    """
    title = (title or "").strip()
    summary = (summary or "").strip()
    snippet = f"{title}\n\n{summary}".strip() if (title or summary) else ""

    if not source_url:
        return snippet or "No content."

    if prefer_scrape:
        full_text = await fetch_article_text(source_url, timeout_seconds=scrape_timeout)
        if full_text and len(full_text) >= MIN_CONTENT_CHARS:
            return f"{title}\n\n{full_text}".strip() if title else full_text
        return snippet or "No content."

    # Legacy: scrape only when RSS summary is too short
    if len(summary) >= min_snippet_chars:
        return snippet or "No content."
    full_text = await fetch_article_text(source_url, timeout_seconds=scrape_timeout)
    if full_text and len(full_text) > len(summary):
        return f"{title}\n\n{full_text}".strip() if title else full_text
    return snippet or "No content."


async def scrape_articles_for_cluster(
    articles: List[Dict],
    scrape_timeout: int = 10,
    max_concurrent: int = 5,
) -> List[Dict]:
    """
    Concurrently scrape full article text for all articles in a cluster.
    Uses the full multi-library cascade per article.
    Falls back to the original RSS summary when scraping yields thin content.
    Concurrency is bounded by max_concurrent to avoid hammering sources.
    """
    semaphore = asyncio.Semaphore(max_concurrent)

    async def _scrape_one(article: Dict) -> Dict:
        url = article.get("source_url") or ""
        rss_summary = (article.get("summary") or "").strip()
        title = (article.get("title") or "").strip()
        if not url or not url.startswith("http"):
            return article
        async with semaphore:
            full_text = await fetch_article_text(url, timeout_seconds=scrape_timeout)
        if full_text and len(full_text) > max(len(rss_summary), MIN_CONTENT_CHARS):
            enriched = dict(article)
            enriched["summary"] = f"{title}\n\n{full_text}".strip() if title else full_text
            return enriched
        return article

    tasks = [_scrape_one(a) for a in articles]
    results = await asyncio.gather(*tasks, return_exceptions=True)
    out = []
    for original, result in zip(articles, results):
        if isinstance(result, Exception):
            logger.warning("[Scraper] cluster scrape error: %s", result)
            out.append(original)
        else:
            out.append(result)
    return out
