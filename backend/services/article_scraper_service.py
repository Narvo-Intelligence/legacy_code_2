# Full-article scraper fallback when feeds supply short snippets
import asyncio
import logging
from typing import Dict, List, Optional

logger = logging.getLogger(__name__)

# Minimum snippet length (chars) below which we always prefer scraped content.
# When prefer_scrape=True, we try scraping first regardless of snippet length (RSS as backup).
DEFAULT_MIN_SNIPPET_CHARS = 350


def _sync_scrape_article(url: str, timeout_seconds: int = 10) -> Optional[str]:
    """Synchronously fetch and extract main article text from URL. Run in executor. Respects timeout_seconds for the HTTP request."""
    try:
        import requests
        from newspaper import Article

        resp = requests.get(url, timeout=timeout_seconds, headers={"User-Agent": "NarvoBot/2.0"})
        resp.raise_for_status()
        html = resp.text

        article = Article(url)
        article.download(input_html=html)
        article.parse()
        text = (article.text or "").strip()
        return text if len(text) > 100 else None
    except Exception as e:
        logger.warning("[ArticleScraper] %s: %s", url[:60], e)
        return None


async def fetch_article_text(
    url: str,
    timeout_seconds: int = 10,
) -> Optional[str]:
    """Fetch full article text from URL. Runs sync newspaper3k in thread; returns None on failure or timeout."""
    if not url or not url.startswith("http"):
        return None
    try:
        loop = asyncio.get_event_loop()
        return await asyncio.wait_for(
            loop.run_in_executor(None, _sync_scrape_article, url, timeout_seconds),
            timeout=timeout_seconds + 2,
        )
    except asyncio.TimeoutError:
        logger.warning("[ArticleScraper] Timeout: %s", url[:60])
        return None
    except Exception as e:
        logger.warning("[ArticleScraper] %s: %s", url[:60], e)
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
    Return the best available text for AI narrative generation.
    When prefer_scrape=True (default), web scraping is the main method: we try to fetch
    full article text first; RSS summary is used only as fallback. This yields more
    content for detailed narratives. When prefer_scrape=False, we only scrape when
    summary is below min_snippet_chars (legacy behaviour).
    """
    title = (title or "").strip()
    summary = (summary or "").strip()
    snippet = f"{title}\n\n{summary}".strip() if (title or summary) else ""

    if not source_url:
        return snippet or "No content."

    # Prioritise scraping: try full article first when we have a URL
    if prefer_scrape:
        full_text = await fetch_article_text(source_url, timeout_seconds=scrape_timeout)
        if full_text and len(full_text) > 100:
            return f"{title}\n\n{full_text}".strip() if title else full_text
        return snippet or "No content."

    # Legacy: scrape only when summary is short
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
    Concurrently scrape full article text for a list of cluster article dicts.
    Each dict must have at least 'source_url', 'title', and 'summary' keys.
    Returns the same list with 'summary' replaced by scraped full text where available;
    original RSS snippet is kept as fallback when scraping fails or yields thin content.
    Limits concurrency to max_concurrent to avoid hammering sources.
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
        if full_text and len(full_text) > max(len(rss_summary), 200):
            enriched = dict(article)
            enriched["summary"] = f"{title}\n\n{full_text}".strip() if title else full_text
            return enriched
        return article

    tasks = [_scrape_one(a) for a in articles]
    results = await asyncio.gather(*tasks, return_exceptions=True)
    out = []
    for original, result in zip(articles, results):
        if isinstance(result, Exception):
            logger.warning("[ArticleScraper] cluster scrape error: %s", result)
            out.append(original)
        else:
            out.append(result)
    return out
