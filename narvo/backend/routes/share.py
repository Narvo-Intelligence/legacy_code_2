# Share and Open Graph routes
import logging
from fastapi import APIRouter, HTTPException, Request
from fastapi.responses import HTMLResponse

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api", tags=["share"])

OG_CATEGORY_COLORS = {
    "politics": "#dc2626", "tech": "#0891b2", "sports": "#16a34a",
    "finance": "#d97706", "business": "#d97706", "culture": "#9333ea",
    "health": "#0d9488", "environment": "#059669", "general": "#6b7280",
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

    title = story.get("title", "Narvo News")[:100]
    description = (story.get("summary", "") or "Listen on Narvo — Audio-first news for Africa")[:200]
    source = story.get("source", "NARVO")
    category = (story.get("category", "general") or "general").lower()
    image_url = story.get("image_url") or "https://images.unsplash.com/photo-1590283603385-17ffb3a7f29f?auto=format&fit=crop&w=1200&q=80"
    base_url = str(request.base_url).rstrip("/")
    share_url = f"{base_url}/share/{news_id}"
    app_url = f"{base_url}/news/{news_id}"

    if is_crawler(user_agent):
        html = f"""<!DOCTYPE html>
<html lang="en"><head><meta charset="utf-8"><title>{title} — NARVO</title>
<meta name="description" content="{description}">
<meta property="og:type" content="article"><meta property="og:title" content="{title}">
<meta property="og:description" content="{description}"><meta property="og:url" content="{share_url}">
<meta property="og:image" content="{image_url}"><meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630"><meta property="og:site_name" content="NARVO">
<meta property="article:publisher" content="Narvo"><meta property="article:section" content="{category}">
<meta name="twitter:card" content="summary_large_image"><meta name="twitter:title" content="{title}">
<meta name="twitter:description" content="{description}"><meta name="twitter:image" content="{image_url}">
<meta name="twitter:site" content="@narvo"><meta property="telegram:channel" content="@narvo">
</head><body><h1>{title}</h1><p>{description}</p><p>Source: {source}</p><a href="{app_url}">Read on Narvo</a></body></html>"""
        return HTMLResponse(content=html)
    else:
        return HTMLResponse(content=f'<!DOCTYPE html><html><head><meta charset="utf-8"><title>{title} — NARVO</title><meta http-equiv="refresh" content="0;url=/news/{news_id}"><script>window.location.href="/news/{news_id}";</script></head><body>Redirecting...</body></html>')


@router.get("/og/{news_id}", response_class=HTMLResponse)
async def og_image_html(news_id: str):
    """Generate an HTML page that serves as OG image preview."""
    from services.news_service import get_cached_all_news
    all_news = await get_cached_all_news()
    story = next((item for item in all_news if item.get("id") == news_id), None)
    if not story:
        raise HTTPException(status_code=404, detail="Story not found")

    title = story.get("title", "Narvo News")[:100]
    source = story.get("source", "NARVO")
    category = (story.get("category", "general") or "general").lower().replace("#", "").strip()
    region = story.get("region", "AFRICA")
    accent = OG_CATEGORY_COLORS.get(category, "#6b7280")

    html = f"""<!DOCTYPE html>
<html><head><meta charset="utf-8">
<meta property="og:title" content="{title}" /><meta property="og:description" content="Listen on Narvo — Audio-first news for Africa" />
<meta property="og:type" content="article" /><meta property="og:site_name" content="NARVO" />
<meta name="twitter:card" content="summary_large_image" /><meta name="twitter:title" content="{title}" />
<style>
  * {{ margin:0; padding:0; box-sizing:border-box; }}
  body {{ width:1200px; height:630px; background:#0a0a0a; font-family:'Segoe UI',system-ui,sans-serif; display:flex; flex-direction:column; }}
  .top {{ height:6px; background:{accent}; }}
  .main {{ flex:1; display:flex; padding:60px; gap:40px; }}
  .left {{ flex:1; display:flex; flex-direction:column; justify-content:space-between; }}
  .cat {{ display:inline-block; background:{accent}; color:#fff; font-size:14px; font-weight:700; letter-spacing:3px; padding:6px 16px; text-transform:uppercase; }}
  .title {{ color:#fff; font-size:48px; font-weight:800; line-height:1.1; letter-spacing:-1px; text-transform:uppercase; margin-top:24px; }}
  .meta {{ display:flex; gap:20px; align-items:center; }}
  .meta span {{ color:#6b7280; font-size:13px; font-weight:600; letter-spacing:2px; text-transform:uppercase; }}
  .meta .src {{ color:{accent}; }}
  .right {{ width:200px; display:flex; flex-direction:column; justify-content:space-between; align-items:flex-end; }}
  .tag {{ color:#374151; font-size:11px; font-weight:600; letter-spacing:3px; text-align:right; }}
  .bar {{ height:4px; background:linear-gradient(90deg,{accent},transparent); }}
</style></head>
<body>
  <div class="top"></div>
  <div class="main">
    <div class="left">
      <div><span class="cat">{category}</span><div class="title">{title}</div></div>
      <div class="meta"><span class="src">{source}</span><span>{region}</span><span>NARVO // AUDIO-FIRST</span></div>
    </div>
    <div class="right">
      <div class="logo"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 421 421" width="80" height="80"><g transform="matrix(1,0,0,1,-409.98,-663.92)"><g transform="matrix(1.26,0,0,1.26,161.58,-953.31)"><rect x="197.085" y="1283.168" width="333.402" height="333.402" fill="#1B211A"/></g><g transform="matrix(0.41,0,0,0.41,409.97,644.21)"><path fill="#EBD5AB" d="M731.43,512H800L736,736H288L224,512H292.57L256,384H372.57L336,256H688L651.43,384H768L731.43,512Z"/><path fill="#EBD5AB" fill-rule="nonzero" d="M352,768H672L640,864H384L352,768Z"/></g></g></svg></div>
      <div class="tag">NARVO.NEWS<br/>VOICE-FIRST<br/>PLATFORM</div>
    </div>
  </div>
  <div class="bar"></div>
</body></html>"""
    return HTMLResponse(content=html)
