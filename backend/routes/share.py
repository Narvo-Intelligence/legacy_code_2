# Share and Open Graph routes
import html
import logging
import os
from urllib.parse import quote, urlencode
from fastapi import APIRouter, HTTPException, Query, Request
from fastapi.responses import HTMLResponse, JSONResponse

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api", tags=["share"])

_DEFAULT_PUBLIC_SITE = "https://narvo.news"
_OG_DEFAULT_PATH = "/og-default.png"
_SUPPORTED_SHARE_LANGS = {"en", "yo", "ha", "ig", "pcm"}


def _public_site_origin() -> str:
    for key in ("PUBLIC_SITE_URL", "VITE_PUBLIC_URL"):
        v = os.environ.get(key, "").strip()
        if v:
            return v.rstrip("/")
    raw = os.environ.get("FRONTEND_ORIGIN", "").strip()
    if raw and raw != "*":
        first = raw.split(",", 1)[0].strip()
        if first:
            return first.rstrip("/")
    return _DEFAULT_PUBLIC_SITE


def _story_og_image_url(story_image: object | None, public_origin: str) -> str:
    if not story_image:
        return f"{public_origin}{_OG_DEFAULT_PATH}"
    s = str(story_image).strip()
    if not s:
        return f"{public_origin}{_OG_DEFAULT_PATH}"
    if s.startswith(("http://", "https://")):
        return s
    if s.startswith("/"):
        return f"{public_origin}{s}"
    return f"{public_origin}/{s}"


def _compact_text(value: object | None, max_chars: int) -> str:
    text = " ".join(str(value or "").split()).strip()
    if not text:
        return ""
    if len(text) <= max_chars:
        return text
    return f"{text[: max(0, max_chars - 1)].rstrip()}…"


def _normalize_share_lang(value: str | None) -> str | None:
    raw = (value or "").strip().lower()
    if not raw:
        return None
    if raw in _SUPPORTED_SHARE_LANGS:
        return raw
    return None


def _pick_share_lang(
    requested_lang: str | None,
    translations: dict,
    audio_by_lang: dict,
) -> str:
    candidates: list[str] = []
    if requested_lang:
        candidates.append(requested_lang)
    candidates.extend(["pcm", "en"])
    candidates.extend(str(k).strip().lower() for k in audio_by_lang.keys())
    candidates.extend(str(k).strip().lower() for k in translations.keys())

    seen: set[str] = set()
    for cand in candidates:
        if not cand or cand in seen:
            continue
        seen.add(cand)
        if cand in _SUPPORTED_SHARE_LANGS:
            return cand
    return "en"


def _localized_share_content(
    story: dict,
    story_content: dict,
    share_lang: str,
) -> tuple[str, str]:
    translations = story_content.get("translations") if isinstance(story_content.get("translations"), dict) else {}
    translated = translations.get(share_lang) if isinstance(translations.get(share_lang), dict) else {}

    base_title = str(story_content.get("title") or story.get("title") or "Narvo News").strip()
    base_summary = str(
        story_content.get("short_summary")
        or story.get("short_summary")
        or story.get("summary")
        or "Listen on Narvo — Audio-first news for Africa."
    ).strip()

    title = str(translated.get("title") or base_title).strip() or "Narvo News"
    summary = str(translated.get("short_summary") or base_summary).strip() or "Listen on Narvo."
    return title, summary


def _pick_audio_url(
    story_content: dict,
    share_lang: str,
) -> tuple[str | None, str | None]:
    audio_by_lang = story_content.get("audio_by_lang") if isinstance(story_content.get("audio_by_lang"), dict) else {}
    if not audio_by_lang:
        return None, None

    candidates = [share_lang, "pcm", "en", *[str(k).strip().lower() for k in audio_by_lang.keys()]]
    seen: set[str] = set()
    for cand in candidates:
        if not cand or cand in seen:
            continue
        seen.add(cand)
        url = str(audio_by_lang.get(cand) or "").strip()
        if url:
            return cand, url
    return None, None


def _build_story_urls(news_id: str, public_origin: str, share_lang: str) -> dict[str, str]:
    safe_path = quote(news_id, safe="")
    story_path = f"/news/{safe_path}"
    autoplay_params = urlencode({"play": "1", "lang": share_lang})
    return {
        "story_url": f"{public_origin}{story_path}",
        "autoplay_url": f"{public_origin}{story_path}?{autoplay_params}",
        "og_image_url": f"{public_origin}/api/og/{safe_path}",
    }


def _build_whatsapp_text(title: str, summary: str, source: str, autoplay_url: str) -> str:
    lines = [title]
    compact_summary = _compact_text(summary, 220)
    if compact_summary:
        lines.append(compact_summary)
    source_name = source.strip()
    if source_name:
        lines.append(f"Source: {source_name}")
    lines.append(f"Tap to listen on Narvo: {autoplay_url}")
    return "\n\n".join(lines)


async def _find_story(news_id: str) -> dict | None:
    from services.news_service import get_cached_all_news, get_cached_merged_news_pool

    merged = await get_cached_merged_news_pool()
    story = next((item for item in merged if item.get("id") == news_id), None)
    if story:
        return story

    all_news = await get_cached_all_news()
    return next((item for item in all_news if item.get("id") == news_id), None)


def _share_payload_for_story(story: dict, news_id: str, requested_lang: str | None) -> dict:
    from services.story_content_service import get_story_content

    story_content = get_story_content(news_id) or {}
    translations = story_content.get("translations") if isinstance(story_content.get("translations"), dict) else {}
    audio_by_lang = story_content.get("audio_by_lang") if isinstance(story_content.get("audio_by_lang"), dict) else {}
    share_lang = _pick_share_lang(requested_lang, translations, audio_by_lang)
    title, summary = _localized_share_content(story, story_content, share_lang)
    public_origin = _public_site_origin()
    urls = _build_story_urls(news_id, public_origin, share_lang)
    audio_lang, audio_url = _pick_audio_url(story_content, share_lang)
    source = str(story.get("source") or "Narvo").strip() or "Narvo"
    category = str(story.get("category") or "general").strip() or "general"
    region = str(story.get("region") or "").strip()
    whatsapp_text = _build_whatsapp_text(title, summary, source, urls["autoplay_url"])

    return {
        "story_id": news_id,
        "title": title,
        "summary": summary,
        "source": source,
        "category": category,
        "region": region or None,
        "share_lang": share_lang,
        "story_url": urls["story_url"],
        "autoplay_url": urls["autoplay_url"],
        "og_image_url": _story_og_image_url(story.get("image_url"), public_origin),
        "audio_lang": audio_lang,
        "audio_url": audio_url,
        "audio_available": bool(audio_url),
        "share_text": _compact_text(summary, 160) or "Cross-checked by Narvo.",
        "whatsapp_text": whatsapp_text,
        "whatsapp_url": f"https://wa.me/?text={quote(whatsapp_text, safe='')}",
    }


OG_CATEGORY_COLORS = {
    "politics": "#D32F2F", "tech": "#006064", "sports": "#2E7D32",
    "finance": "#F57C00", "business": "#F57C00", "culture": "#7B1FA2",
    "health": "#00796B", "environment": "#388E3C", "general": "#455A64",
}

CRAWLER_USER_AGENTS = [
    "facebookexternalhit", "twitterbot", "linkedinbot", "pinterest",
    "slackbot", "telegrambot", "whatsapp", "discordbot", "applebot",
    "googlebot", "bingbot", "yandex", "baiduspider",
]


def is_crawler(user_agent: str) -> bool:
    if not user_agent:
        return False
    ua_lower = user_agent.lower()
    return any(crawler in ua_lower for crawler in CRAWLER_USER_AGENTS)


@router.get("/share/{news_id}", response_class=HTMLResponse)
async def share_page(news_id: str, request: Request):
    """Shareable page that serves OG meta tags for crawlers, redirects browsers to React app."""
    user_agent = request.headers.get("user-agent", "")
    story = await _find_story(news_id)

    if not story:
        return HTMLResponse(content='<html><head><meta http-equiv="refresh" content="0;url=/"></head></html>')

    title_raw = str(story.get("title", "Narvo News"))[:100]
    desc_raw = str(story.get("summary", "") or "Listen on Narvo — Audio-first news for Africa")[:200]
    source_raw = str(story.get("source", "NARVO"))
    category_raw = str(story.get("category", "general") or "general").lower()
    title = html.escape(title_raw)
    description = html.escape(desc_raw)
    source = html.escape(source_raw)
    category = html.escape(category_raw)
    public_origin = _public_site_origin()
    image_url = html.escape(_story_og_image_url(story.get("image_url"), public_origin))
    safe_path = quote(news_id, safe="")
    canonical_article_url = html.escape(f"{public_origin}/news/{safe_path}")

    if is_crawler(user_agent):
        page = f"""<!DOCTYPE html>
<html lang="en"><head><meta charset="utf-8"><title>{title} — NARVO</title>
<meta name="description" content="{description}">
<meta property="og:type" content="article"><meta property="og:title" content="{title}">
<meta property="og:description" content="{description}"><meta property="og:url" content="{canonical_article_url}">
<meta property="og:image" content="{image_url}"><meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630"><meta property="og:site_name" content="NARVO">
<meta property="article:publisher" content="Narvo"><meta property="article:section" content="{category}">
<meta name="twitter:card" content="summary_large_image"><meta name="twitter:title" content="{title}">
<meta name="twitter:description" content="{description}"><meta name="twitter:image" content="{image_url}">
<meta name="twitter:site" content="@narvo"><meta property="telegram:channel" content="@narvo">
</head><body><h1 style="font-family:serif;">{title}</h1><p>{description}</p><p>Source: {source}</p><a href="{canonical_article_url}">Read on Narvo</a></body></html>"""
        return HTMLResponse(content=page)
    else:
        loc = html.escape(f"/news/{safe_path}")
        return HTMLResponse(
            content=f'<!DOCTYPE html><html><head><meta charset="utf-8"><title>{title} — NARVO</title>'
            f'<meta http-equiv="refresh" content="0;url={loc}"><script>window.location.href="{loc}";</script></head><body>Redirecting...</body></html>'
        )


@router.get("/share/{news_id}/payload")
async def share_story_payload(
    news_id: str,
    lang: str | None = Query(None, description="Optional share language override: en, pcm, yo, ha, ig"),
):
    """Return canonical share metadata for frontend share actions and WhatsApp handoff."""
    story = await _find_story(news_id)
    if not story:
        raise HTTPException(status_code=404, detail="Story not found")

    payload = _share_payload_for_story(story, news_id, _normalize_share_lang(lang))
    return JSONResponse(content=payload)


@router.get("/og/{news_id}", response_class=HTMLResponse)
async def og_image_html(news_id: str):
    """Generate an HTML page that serves as OG image preview (v5.1 Calm Reading style)."""
    from services.news_service import get_cached_all_news
    all_news = await get_cached_all_news()
    story = next((item for item in all_news if item.get("id") == news_id), None)
    if not story:
        raise HTTPException(status_code=404, detail="Story not found")

    title = html.escape(str(story.get("title", "Narvo News"))[:100])
    source = html.escape(str(story.get("source", "NARVO")))
    cat_key = (story.get("category", "general") or "general").lower().replace("#", "").strip()
    accent = OG_CATEGORY_COLORS.get(cat_key, "#006064")
    category = html.escape(cat_key)
    region = html.escape(str(story.get("region", "AFRICA")))

    og_html = f"""<!DOCTYPE html>
<html><head><meta charset="utf-8">
<link href="https://fonts.googleapis.com/css2?family=Instrument+Sans:wght@400;700&family=Newsreader:opsz,ital,wght@6..72,0,400;6..72,0,700;6..72,1,400&display=swap" rel="stylesheet">
<style>
  * {{ margin:0; padding:0; box-sizing:border-box; }}
  body {{ 
    width:1200px; height:630px; 
    background:#F6F8FB; 
    font-family:'Instrument Sans', sans-serif; 
    display:flex; flex-direction:column; 
    color: #1A1C1E;
  }}
  .top-bar {{ height:12px; background:{accent}; }}
  .main {{ flex:1; display:flex; padding:80px; gap:60px; align-items: center; }}
  .content {{ flex:1; display:flex; flex-direction:column; justify-content:center; }}
  .cat-badge {{ 
    display:inline-block; 
    background:{accent}15; 
    color:{accent}; 
    font-size:16px; 
    font-weight:700; 
    letter-spacing:4px; 
    padding:8px 20px; 
    text-transform:uppercase;
    border-radius: 4px;
    margin-bottom: 32px;
    width: fit-content;
  }}
  .title {{ 
    font-family:'Newsreader', serif;
    color:#1A1C1E; 
    font-size:64px; 
    font-weight:700; 
    line-height:1.1; 
    letter-spacing:-1.5px; 
    margin-bottom: 40px;
  }}
  .meta {{ 
    display:flex; 
    gap:24px; 
    align-items:center; 
    font-size:14px; 
    font-weight:600; 
    letter-spacing:2px; 
    text-transform:uppercase;
    color: #00606480;
  }}
  .meta .src {{ color:#1A1C1E; font-weight: 800; }}
  .right-decor {{ 
    width:240px; 
    display:flex; 
    flex-direction:column; 
    justify-content:space-between; 
    align-items:flex-end; 
    height: 100%;
    padding-top: 20px;
    padding-bottom: 20px;
  }}
  .logo-text {{ 
    font-family: 'Newsreader', serif;
    font-weight: 700;
    font-size: 32px;
    color: #006064;
    letter-spacing: -1px;
  }}
  .tagline {{ 
    color:#1A1C1E60; 
    font-size:12px; 
    font-weight:700; 
    letter-spacing:4px; 
    text-align:right; 
    line-height: 2;
  }}
</style></head>
<body>
  <div class="top-bar"></div>
  <div class="main">
    <div class="content">
      <div class="cat-badge">{category}</div>
      <div class="title">{title}</div>
      <div class="meta">
        <span class="src">{source}</span>
        <span>•</span>
        <span>{region}</span>
        <span>•</span>
        <span>AUDIO-FIRST NEWS</span>
      </div>
    </div>
    <div class="right-decor">
      <div class="logo-text">NARVO</div>
      <div class="tagline">CALM_READING<br/>VOICE_DRIVEN<br/>INTELLIGENCE</div>
    </div>
  </div>
</body></html>"""
    return HTMLResponse(content=og_html)
