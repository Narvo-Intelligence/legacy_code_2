# Share and Open Graph routes
import html
import logging
import os
from urllib.parse import quote
from fastapi import APIRouter, HTTPException, Request
from fastapi.responses import HTMLResponse

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api", tags=["share"])

_DEFAULT_PUBLIC_SITE = "https://narvo.news"
_OG_DEFAULT_PATH = "/og-default.png"


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
    from services.news_service import get_cached_all_news
    all_news = await get_cached_all_news()
    story = next((item for item in all_news if item.get("id") == news_id), None)

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