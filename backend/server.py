import os
import io
import base64
import hashlib
import asyncio
import logging
import uuid
from datetime import datetime, timezone
from typing import List, Optional
from dotenv import load_dotenv

load_dotenv()

# Optional Sentry (set SENTRY_DSN in env to enable)
_sentry_dsn = os.environ.get("SENTRY_DSN")
if _sentry_dsn:
    import sentry_sdk

    sentry_sdk.init(
        dsn=_sentry_dsn,
        traces_sample_rate=0.1,
        environment=os.environ.get("SENTRY_ENVIRONMENT", "production"),
    )

logger = logging.getLogger("narvo.api")

from fastapi import FastAPI, HTTPException, Query, BackgroundTasks, Request, Body
from fastapi.middleware.cors import CORSMiddleware
from fastapi.openapi.docs import get_swagger_ui_html
from fastapi.responses import HTMLResponse, JSONResponse
from pydantic import BaseModel, Field
from lib.supabase_db import get_supabase_db
from lib.text_utils import sanitize_ai_text
import httpx
import re as _re
from urllib.parse import quote

# API version: single source of truth for FastAPI, root, and health responses
API_VERSION = "2.0"

# Swagger UI: match Narvo design (dark, forest/sage palette). Custom /docs route injects CSS.
SWAGGER_UI_PARAMS = {
    "syntaxHighlight.theme": "monokai",
    "docExpansion": "list",
    "displayRequestDuration": True,
    "filter": True,
    "tryItOutEnabled": True,
}
# Narvo palette: bg #1B2126, surface #242B23, border #628141, primary #EBD5AB, text #F2F2F2, secondary #8BAE66
SWAGGER_CUSTOM_CSS = """
<style id="narvo-docs-theme">
  html { background: #1B2126 !important; }
  body { background: #1B2126 !important; color: rgb(242, 242, 242) !important; }
  .swagger-ui { background: #1B2126 !important; }
  .swagger-ui .topbar { background: #242B23 !important; border-bottom: 1px solid rgb(98, 129, 65) !important; }
  .swagger-ui .info { color: rgb(242, 242, 242); }
  .swagger-ui .info .title { color: rgb(235, 213, 171) !important; }
  .swagger-ui .info .base-url { color: rgb(139, 174, 102) !important; }
  .swagger-ui .opblock { border-color: rgb(98, 129, 65) !important; background: #242B23 !important; }
  .swagger-ui .opblock.opblock-get { border-color: rgb(98, 129, 65); }
  .swagger-ui .opblock .opblock-summary-method { background: rgb(98, 129, 65) !important; }
  .swagger-ui .opblock .opblock-summary-path { color: rgb(235, 213, 171); }
  .swagger-ui .btn.execute { background: rgb(235, 213, 171) !important; color: #1B2126 !important; border: none !important; }
  .swagger-ui .btn.cancel { color: rgb(139, 174, 102); border-color: rgb(98, 129, 65); }
  .swagger-ui input[type=text], .swagger-ui textarea, .swagger-ui select { background: #242B23 !important; color: rgb(242, 242, 242) !important; border-color: rgb(98, 129, 65) !important; }
  .swagger-ui .model-box { background: #242B23 !important; border-color: rgb(98, 129, 65); color: rgb(242, 242, 242); }
  .swagger-ui .model .property { color: rgb(139, 174, 102); }
  .swagger-ui section.models { border-color: rgb(98, 129, 65); }
  .swagger-ui .tab li { color: rgb(139, 174, 102); }
  .swagger-ui .tab li.active { color: rgb(235, 213, 171); border-bottom-color: rgb(235, 213, 171); }
  .swagger-ui h1, .swagger-ui h2, .swagger-ui h3, .swagger-ui h4 { color: rgb(242, 242, 242) !important; }
  .swagger-ui table thead tr th { color: rgb(235, 213, 171); border-color: rgb(98, 129, 65); }
  .swagger-ui table tbody tr td { color: rgb(242, 242, 242); border-color: rgb(98, 129, 65); }
</style>
"""

# Initialize FastAPI (custom /docs below; disable default docs route)
app = FastAPI(
    title="Narvo API",
    version=API_VERSION,
    description="Broadcast-grade news API: narratives, TTS, translation, fact-check, briefings.",
    docs_url=None,
    openapi_tags=[
        {"name": "core", "description": "Health and root"},
        {"name": "news", "description": "News, search, trending"},
        {"name": "tts", "description": "Text-to-speech generation"},
        {"name": "user", "description": "Bookmarks, preferences, settings"},
    ],
)

# GZip compression for smaller payloads
from starlette.middleware.gzip import GZipMiddleware
from starlette.middleware.base import BaseHTTPMiddleware

app.add_middleware(GZipMiddleware, minimum_size=500)


class RequestIDMiddleware(BaseHTTPMiddleware):
    """Set X-Request-ID on response and log request with correlation ID."""

    async def dispatch(self, request, call_next):
        request_id = request.headers.get("X-Request-ID") or str(uuid.uuid4())
        response = await call_next(request)
        response.headers["X-Request-ID"] = request_id
        logger.debug(
            "Request %s %s",
            request.method,
            request.url.path,
            extra={"request_id": request_id},
        )
        return response


class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    """Add security headers: X-Content-Type-Options, X-Frame-Options; optional CSP."""

    async def dispatch(self, request, call_next):
        response = await call_next(request)
        response.headers.setdefault("X-Content-Type-Options", "nosniff")
        response.headers.setdefault("X-Frame-Options", "DENY")
        return response


# Rate limit: Upstash Ratelimit (or in-memory fallback) for TTS, fact-check, notifications.
def _rate_limit_key(request) -> str:
    forwarded = request.headers.get("X-Forwarded-For")
    if forwarded:
        return forwarded.split(",")[0].strip()
    return request.client.host if request.client else "unknown"


class RateLimitMiddleware(BaseHTTPMiddleware):
    """Apply rate limit to TTS, fact-check, and notification routes by IP (Upstash or in-memory)."""

    async def dispatch(self, request, call_next):
        from lib.ratelimit import check_rate_limit

        allowed, detail = await check_rate_limit(
            _rate_limit_key(request), request.url.path
        )
        if not allowed:
            return JSONResponse(status_code=429, content={"detail": detail})
        return await call_next(request)


class AuthUserMiddleware(BaseHTTPMiddleware):
    """Set request.state.user_id from Supabase JWT (Bearer) when SUPABASE_JWT_SECRET is set."""

    async def dispatch(self, request, call_next):
        from lib.auth import get_user_id_from_request
        request.state.user_id = get_user_id_from_request(request)
        return await call_next(request)


app.add_middleware(RequestIDMiddleware)
app.add_middleware(SecurityHeadersMiddleware)
app.add_middleware(RateLimitMiddleware)
app.add_middleware(AuthUserMiddleware)

# CORS: use FRONTEND_ORIGIN in production (e.g. https://narvo.news or https://www.narvo.news).
# When unset or "*", allow localhost (dev) and production narvo.news so CORS works even if FRONTEND_ORIGIN is missing in deploy.
_cors_origins = os.environ.get("FRONTEND_ORIGIN", "*")
if _cors_origins.strip() == "*":
    _cors_origins_list = [
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "https://narvo.news",
        "https://www.narvo.news",
    ]
else:
    _cors_origins_list = [o.strip() for o in _cors_origins.split(",") if o.strip()]
    # Allow both www and non-www for narvo.news so one env value works for both
    _narvo = "https://narvo.news"
    _narvo_www = "https://www.narvo.news"
    if _narvo in _cors_origins_list and _narvo_www not in _cors_origins_list:
        _cors_origins_list.append(_narvo_www)
    elif _narvo_www in _cors_origins_list and _narvo not in _cors_origins_list:
        _cors_origins_list.append(_narvo)
    # Local dev: allow frontend on port 3000 so CORS works when FRONTEND_ORIGIN is set
    for _origin in ("http://localhost:3000", "http://127.0.0.1:3000"):
        if _origin not in _cors_origins_list:
            _cors_origins_list.append(_origin)
app.add_middleware(
    CORSMiddleware,
    allow_origins=_cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include modular routers
from routes.discover import router as discover_router
from routes.offline import router as offline_router
from routes.admin import router as admin_router
from routes.user import router as user_router
from routes.factcheck import router as factcheck_router
from routes.translation import router as translation_router
from routes.news import router as news_router
from routes.briefing import router as briefing_router

app.include_router(discover_router)
app.include_router(offline_router)
app.include_router(admin_router)
app.include_router(user_router)
app.include_router(factcheck_router)
app.include_router(translation_router)
app.include_router(news_router)
app.include_router(briefing_router)

from services.narrative_service import generate_narrative


# Startup: optional one-off health check. Periodic refresh is handled by Upstash QStash
# (POST /api/sources/health/refresh every 5min, POST /api/aggregators/refresh every 10min).
@app.on_event("startup")
async def startup_feed_health():
    # Supabase indexes are defined in supabase_schema.sql
    logger.info("CORS allow_origins: %s", _cors_origins_list)


# ── In-memory cache for static/semi-static data ──
import time as _time


class MemCache:
    """Simple TTL cache for static data."""

    def __init__(self):
        self._store = {}

    def get(self, key, ttl=300):
        entry = self._store.get(key)
        if entry and (_time.time() - entry[1]) < ttl:
            return entry[0]
        return None

    def set(self, key, value):
        self._store[key] = (value, _time.time())


_cache = MemCache()


# Voice configurations — YarnGPT voices with Nigerian accents
from services.yarngpt_service import (
    get_voice_profiles as _get_yarn_profiles,
    YARNGPT_VOICES,
)

VOICE_PROFILES = _get_yarn_profiles()


# Pydantic Models
class NewsItem(BaseModel):
    id: str
    title: str
    summary: str
    narrative: Optional[str] = None
    source: str
    source_url: str
    published: str
    region: str
    category: str = "General"
    truth_score: int = 100
    audio_url: Optional[str] = None
    listen_count: int = 0
    tags: List[str] = []
    image_url: Optional[str] = None


class BriefingStory(BaseModel):
    id: str
    title: str
    summary: str
    source: str
    category: str


class MorningBriefing(BaseModel):
    id: str
    title: str
    generated_at: str
    duration_estimate: str
    stories: List[BriefingStory]
    script: str
    audio_url: Optional[str] = None
    voice_id: str = "emma"


class TTSRequest(BaseModel):
    text: str = ""  # Ignored when landing_preview=True
    voice_id: str = "emma"
    stability: float = 0.5
    similarity_boost: float = 0.75
    language: str = "en"
    skip_translation: bool = (
        False  # True when text is already in target language (e.g. preview samples)
    )
    landing_preview: bool = False  # Use server-side message + voice_id→language map for Voice Matrix


class TTSResponse(BaseModel):
    audio_url: str
    text: str
    translated_text: Optional[str] = None
    voice_id: str
    language: str = "en"


class ParaphraseRequest(BaseModel):
    text: str
    style: str = "broadcast"


class ParaphraseResponse(BaseModel):
    original: str
    narrative: str
    key_takeaways: List[str]


class VoiceProfile(BaseModel):
    id: str
    name: str
    accent: str
    language: str
    gender: str
    description: str


class UserPreferences(BaseModel):
    voice_id: str = "emma"
    region: str = "Nigeria"
    interests: List[str] = []


class UserPreferencesRequest(BaseModel):
    user_id: str
    region: str = "lagos"
    voice: str = "pidgin"
    interests: List[str] = []


class BookmarkRequest(BaseModel):
    user_id: str
    story_id: str
    title: str
    summary: str = ""
    source: str = ""
    category: str = "General"
    source_url: str = ""
    saved_at: str = ""


# Lightweight ping for keep-alive (e.g. Cloud Scheduler, cron-job.org). Exposed at /ping and /api/ping.
@app.get("/ping", tags=["core"], summary="Keep-alive ping")
@app.get("/api/ping", tags=["core"], summary="Keep-alive ping")
async def ping():
    return {"ok": True}


# Custom Swagger UI at /docs with Narvo theme (docs_url=None above)
@app.get("/docs", include_in_schema=False)
async def custom_swagger_ui_html():
    html = get_swagger_ui_html(
        openapi_url=app.openapi_url,
        title=f"{app.title} – Docs",
        swagger_ui_parameters=SWAGGER_UI_PARAMS,
    )
    raw = html.body
    body = raw.decode("utf-8") if isinstance(raw, bytes) else raw
    if "</head>" in body:
        body = body.replace("</head>", SWAGGER_CUSTOM_CSS.strip() + "\n</head>", 1)
    return HTMLResponse(content=body)


# Root: avoid 404 when visiting /
@app.get("/", tags=["core"], summary="API info")
async def root():
    return {
        "service": "Narvo API",
        "version": API_VERSION,
        "docs": "/docs",
        "health": "/api/health",
        "ping": "/ping or /api/ping",
    }


# API Endpoints
@app.get(
    "/api/health",
    tags=["core"],
    summary="Health check",
    description="Returns API status and optional dependency checks.",
)
async def health_check():
    """Health check for deployment and monitoring. Optionally verifies Supabase connectivity."""
    dependencies = {}
    try:
        db = get_supabase_db()
        db.table("user_preferences").select("user_id").limit(1).execute()
        dependencies["supabase"] = "ok"
    except Exception:
        dependencies["supabase"] = "error"
    return {
        "status": "online",
        "service": "Narvo API",
        "version": API_VERSION,
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "dependencies": dependencies,
    }


@app.post(
    "/api/paraphrase",
    response_model=ParaphraseResponse,
    tags=["news"],
    summary="Paraphrase text to broadcast narrative",
)
async def paraphrase_content(request: ParaphraseRequest):
    """Generate broadcast narrative from text using Gemini."""
    narrative_data = await generate_narrative(request.text)
    raw_narrative = narrative_data.get("narrative", request.text)
    raw_takeaways = narrative_data.get("key_takeaways", [])
    return ParaphraseResponse(
        original=request.text,
        narrative=sanitize_ai_text(raw_narrative),
        key_takeaways=[
            sanitize_ai_text(kt) for kt in raw_takeaways if sanitize_ai_text(kt)
        ],
    )


# Landing-page Voice Matrix: one message, no truncation; language derived from voice_id
LANDING_PREVIEW_MESSAGE = (
    "Welcome to Narvo. We are the local pulse, refined through broadcast-grade AI, "
    "bringing you high-fidelity news in your own voice."
)
VOICE_ID_LANGUAGE_MAP = {
    "emma": "en",
    "idera": "yo",
    "zainab": "ha",
    "osagie": "ig",
    "wura": "pcm",
    "nova": "en",
    "onyx": "en",
}

@app.post(
    "/api/tts/generate",
    response_model=TTSResponse,
    tags=["tts"],
    summary="Generate TTS audio",
)
async def generate_tts(request: TTSRequest):
    """Generate TTS audio — YarnGPT primary, OpenAI fallback, with caching. Rate-limited by IP.
    Returns JSON with audio_url (data URL or external URL). For any future endpoint that streams
    audio bytes, set Accept-Ranges: bytes and support Range requests for progressive playback.
    When landing_preview=True, uses LANDING_PREVIEW_MESSAGE and voice_id→language map (no client truncation)."""
    import hashlib
    from services.yarngpt_service import generate_tts as yarn_generate_tts

    if request.landing_preview:
        text_to_use = LANDING_PREVIEW_MESSAGE
        effective_lang = VOICE_ID_LANGUAGE_MAP.get(request.voice_id.lower(), "en")
        skip_tx = effective_lang == "en"  # translate so each voice plays in its language (yo, ha, ig, pcm, en)
    else:
        text_to_use = request.text or ""
        effective_lang = request.language or "en"
        skip_tx = request.skip_translation

    cache_key = hashlib.md5(
        f"{text_to_use[:200]}:{request.voice_id}:{effective_lang}:{skip_tx}".encode()
    ).hexdigest()

    db = get_supabase_db()
    r = db.table("tts_cache").select("*").eq("cache_key", cache_key).limit(1).execute()
    cached = (r.data or [None])[0]
    if cached and cached.get("audio_url"):
        return TTSResponse(
            audio_url=cached["audio_url"],
            text=text_to_use,
            translated_text=cached.get("translated_text"),
            voice_id=cached.get("voice_id", request.voice_id),
            language=effective_lang,
        )

    try:
        from services.translation_service import translate_text, SUPPORTED_LANGUAGES

        text_to_speak = text_to_use
        translated_text = None

        if (
            not skip_tx
            and effective_lang
            and effective_lang != "en"
            and effective_lang in SUPPORTED_LANGUAGES
        ):
            translation_result = await translate_text(
                text=text_to_use,
                target_language=effective_lang,
                source_language="en",
                style="broadcast",
            )
            if translation_result.get("success"):
                text_to_speak = translation_result.get("translated", text_to_use)
                translated_text = text_to_speak

        audio_url = await yarn_generate_tts(
            text=text_to_speak,
            voice_id=request.voice_id,
            language=effective_lang,
        )

        if not audio_url:
            raise Exception("Both YarnGPT and OpenAI TTS failed")

        db.table("tts_cache").upsert(
            {
                "cache_key": cache_key,
                "audio_url": audio_url,
                "translated_text": translated_text,
                "voice_id": request.voice_id,
                "created_at": datetime.now(timezone.utc).isoformat(),
            },
            on_conflict="cache_key",
        ).execute()

        return TTSResponse(
            audio_url=audio_url,
            text=text_to_use,
            translated_text=translated_text,
            voice_id=request.voice_id,
            language=effective_lang,
        )
    except Exception as e:
        logger.warning("TTS error: %s", e)
        raise HTTPException(status_code=500, detail=f"TTS generation failed: {str(e)}")


@app.get(
    "/api/voices",
    response_model=List[VoiceProfile],
    tags=["tts"],
    summary="List voice profiles",
)
async def get_voices():
    """Get available voice profiles (cached 10min, Redis or in-memory)."""
    from lib.redis_client import get_json, set_json

    cached = await get_json("narvo:memcache:voices")
    if not cached:
        cached = _cache.get("voices", ttl=600)
    if cached:
        return JSONResponse(
            content=cached, headers={"Cache-Control": "public, max-age=600"}
        )
    result = VOICE_PROFILES
    result_list = [dict(v) for v in result]
    await set_json("narvo:memcache:voices", result_list, ttl_seconds=600)
    _cache.set("voices", result_list)
    return result


@app.get("/api/regions")
async def get_regions():
    """Get available news regions"""
    return JSONResponse(
        content=[
            {"id": "nigeria", "name": "Nigeria", "icon": "NG"},
            {"id": "continental", "name": "Continental", "icon": "AF"},
        ],
        headers={"Cache-Control": "public, max-age=3600"},
    )


@app.get("/api/telemetry/regional-env")
async def get_regional_env(city: Optional[str] = Query(None, description="Override city: lagos, abuja")):
    """Get regional environment for dashboard telemetry (region display; weather can be wired later).
    Accepts optional city=lagos|abuja for landing-page toggle; otherwise defaults to Lagos."""
    c = (city or "").strip().lower()
    if c == "abuja":
        city_label, city_name = "ABUJA, NIGERIA", "Abuja"
    else:
        city_label, city_name = "LAGOS, NIGERIA", "Lagos"
    return {
        "region_id": "nigeria",
        "region_name": "Nigeria",
        "city": city_name,
        "label": city_label,
        "temp_c": None,
        "humidity": None,
        "wind_kmh": None,
    }


@app.get("/api/sound-themes")
async def list_sound_themes():
    """Get available broadcast sound themes (cached 10min, Redis or in-memory)."""
    from lib.redis_client import get_json, set_json

    cached = await get_json("narvo:memcache:sound_themes")
    if not cached:
        cached = _cache.get("sound_themes", ttl=600)
    if cached:
        return JSONResponse(
            content=cached, headers={"Cache-Control": "public, max-age=600"}
        )
    from services.sound_themes_service import get_sound_themes

    result = get_sound_themes()
    await set_json("narvo:memcache:sound_themes", result, ttl_seconds=600)
    _cache.set("sound_themes", result)
    return result


@app.get("/api/sound-themes/{theme_id}")
async def get_sound_theme_detail(theme_id: str):
    """Get a specific sound theme with full audio parameters"""
    from services.sound_themes_service import get_sound_theme

    theme = get_sound_theme(theme_id)
    if not theme:
        raise HTTPException(status_code=404, detail="Theme not found")
    return JSONResponse(
        content=theme, headers={"Cache-Control": "public, max-age=3600"}
    )


@app.get("/api/categories")
async def get_categories():
    """Get news categories (cached 1hr)"""
    return JSONResponse(
        content=[
            {"id": "politics", "name": "Politics", "icon": "building"},
            {"id": "economy", "name": "Economy", "icon": "chart"},
            {"id": "tech", "name": "Tech", "icon": "cpu"},
            {"id": "sports", "name": "Sports", "icon": "trophy"},
            {"id": "health", "name": "Health", "icon": "heart"},
            {"id": "general", "name": "General", "icon": "newspaper"},
        ],
        headers={"Cache-Control": "public, max-age=3600"},
    )


@app.get("/api/sources")
async def get_content_sources():
    """Get metadata about all content sources"""
    from services.news_service import get_content_sources as get_sources

    return get_sources()


@app.get("/api/sources/health")
async def get_sources_health():
    """Get real-time health status of all RSS feeds"""
    from services.news_service import get_feed_health

    return get_feed_health()


@app.post("/api/sources/health/refresh")
async def refresh_sources_health(background_tasks: BackgroundTasks):
    """Trigger a fresh health check of all feeds"""
    from services.news_service import run_health_check

    background_tasks.add_task(run_health_check)
    return {"status": "started", "message": "Health check initiated"}


# ── Aggregator Endpoints ──────────────────────────────────────────────


@app.get("/api/aggregators/status")
async def aggregators_status():
    """Get status of programmatic aggregator integrations"""
    from services.aggregator_service import get_aggregator_status

    return await get_aggregator_status()


@app.post("/api/aggregators/refresh")
async def refresh_aggregators(background_tasks: BackgroundTasks):
    """Trigger aggregator cache refresh. Call from QStash (e.g. every 10 min) or manually."""
    from services.aggregator_service import refresh_cache

    background_tasks.add_task(refresh_cache)
    return {"status": "started", "message": "Aggregator refresh initiated"}


@app.get("/api/aggregators/fetch")
async def fetch_aggregators(
    keywords: str = Query("Nigeria Africa", description="Search keywords"),
):
    """Fetch news from all programmatic aggregators (Mediastack + NewsData.io)"""
    from services.aggregator_service import fetch_all_aggregators

    return await fetch_all_aggregators(keywords)


@app.get("/api/aggregators/mediastack")
async def fetch_mediastack_news(
    keywords: str = Query("Nigeria Africa"), limit: int = Query(20, ge=1, le=50)
):
    """Fetch news from Mediastack API"""
    from services.aggregator_service import fetch_mediastack

    articles = await fetch_mediastack(keywords, limit)
    return {"count": len(articles), "articles": articles}


@app.get("/api/aggregators/newsdata")
async def fetch_newsdata_news(
    query: str = Query("Nigeria"), limit: int = Query(20, ge=1, le=50)
):
    """Fetch news from NewsData.io API"""
    from services.aggregator_service import fetch_newsdata

    articles = await fetch_newsdata(query, limit)
    return {"count": len(articles), "articles": articles}


@app.get("/api/trending")
async def get_trending():
    """Get trending tags and topics based on recent news (uses news_service)."""
    try:
        from services.news_service import get_trending_topics

        return await get_trending_topics()
    except Exception:
        return {
            "tags": ["#POLITICS", "#ECONOMY", "#NIGERIA", "#AFRICA", "#TECH"],
            "topics": [
                {"name": "Elections 2025", "count": "12.5k"},
                {"name": "Naira Exchange", "count": "8.2k"},
                {"name": "AfCFTA Trade", "count": "5.1k"},
            ],
            "updated_at": datetime.now(timezone.utc).isoformat(),
        }


@app.get("/api/search")
async def search_news(
    q: str = Query(..., description="Search query"),
    category: str = Query(None, description="Filter by category"),
    source: str = Query(None, description="Filter by source"),
    source_type: str = Query(
        None, description="Filter by source type: rss, aggregator, podcast, radio"
    ),
    limit: int = Query(20, le=50, description="Max results"),
    skip: int = Query(0, description="Offset for pagination"),
    include_aggregators: bool = Query(
        True, description="Include aggregator articles in search"
    ),
    include_radio: bool = Query(
        True, description="Include radio stations (by name search) in results"
    ),
):
    """Unified search: news (RSS), aggregators, podcasts, and radio stations"""
    try:
        from services.news_service import get_cached_all_news

        query_lower = q.lower()
        all_items = []

        # 1. Fetch RSS news (single source)
        all_items = await get_cached_all_news()

        # 2. Include cached aggregator articles
        if include_aggregators:
            try:
                from services.aggregator_service import get_normalized_aggregator_news

                agg_items = await get_normalized_aggregator_news()
                all_items.extend(agg_items)
            except Exception as e:
                logger.warning("[Search] Aggregator error: %s", e)

        # 3. Include podcasts
        try:
            from services.podcast_service import search_podcasts

            pods = await search_podcasts(q, limit=10)
            for p in pods:
                all_items.append(
                    {
                        "id": p.get("id", ""),
                        "title": p.get("title", ""),
                        "summary": p.get("description", ""),
                        "source": p.get("podcast_name", "Podcast"),
                        "source_url": p.get("audio_url", ""),
                        "published": p.get("published", ""),
                        "category": "Podcast",
                        "region": "Africa",
                        "tags": [],
                        "image_url": p.get("image_url"),
                        "aggregator": "podcast",
                    }
                )
        except Exception:
            pass

        # 3.5 Include radio stations (search by name)
        if include_radio and query_lower.strip():
            try:
                async with httpx.AsyncClient(timeout=10.0) as client:
                    url = (
                        f"{RADIO_BROWSER_API}/json/stations/byname/{quote(q, safe='')}"
                    )
                    response = await client.get(
                        url, params={"limit": 15, "hidebroken": "true"}
                    )
                    if response.status_code == 200:
                        data = response.json()
                        for r in data[:15]:
                            station = {
                                "id": r.get("stationuuid", ""),
                                "name": r.get("name", "Unknown"),
                                "url": r.get("url", ""),
                                "url_resolved": r.get("url_resolved", r.get("url", "")),
                                "country": r.get("country", ""),
                                "countrycode": r.get("countrycode", ""),
                                "tags": r.get("tags", ""),
                                "bitrate": r.get("bitrate", 0),
                            }
                            all_items.append(
                                {
                                    "id": f"radio:{station['id']}",
                                    "title": station["name"],
                                    "summary": f"{station['country']} • {(station.get('tags') or '')}"[
                                        :200
                                    ],
                                    "source": station["country"],
                                    "published": "",
                                    "category": "Radio",
                                    "source_type": "radio",
                                    "aggregator": "radio",
                                    "station": station,
                                }
                            )
            except Exception as e:
                logger.warning("[Search] Radio error: %s", e)

        # 4. Filter by search query and source_type
        filtered = []
        for item in all_items:
            # Source type filter
            if source_type:
                is_radio = item.get("source_type") == "radio"
                is_agg = bool(
                    item.get("aggregator")
                    and item.get("aggregator") not in ("podcast", "radio")
                )
                is_podcast = (
                    item.get("aggregator") == "podcast"
                    or item.get("category", "").lower() == "podcast"
                )
                is_rss = not is_agg and not is_podcast and not is_radio
                if source_type == "rss" and not is_rss:
                    continue
                if source_type == "aggregator" and not is_agg:
                    continue
                if source_type == "podcast" and not is_podcast:
                    continue
                if source_type == "radio" and not is_radio:
                    continue

            # Radio items were already matched by API byname; others match by text
            is_radio_item = item.get("source_type") == "radio"
            title_match = query_lower in (item.get("title") or "").lower()
            summary_match = query_lower in (item.get("summary") or "").lower()
            source_match = query_lower in (item.get("source") or "").lower()
            # Normalize tags to list (radio station tags are comma-separated string; RSS/podcasts use list)
            raw_tags = (
                (item.get("station") or {}).get("tags", "")
                if is_radio_item
                else item.get("tags")
            )
            if isinstance(raw_tags, str):
                tags_list = [t.strip() for t in raw_tags.split(",") if t.strip()]
            else:
                tags_list = [str(t).strip() for t in (raw_tags or []) if str(t).strip()]
            tag_match = any(query_lower in (t or "").lower() for t in tags_list)

            if (
                is_radio_item
                or title_match
                or summary_match
                or source_match
                or tag_match
            ):
                if (
                    category
                    and (item.get("category") or "").lower() != category.lower()
                ):
                    continue
                if source and (item.get("source") or "").lower() != source.lower():
                    continue
                filtered.append(item)

        # 5. Deduplicate by id and add source_type field
        seen_ids = set()
        deduped = []
        for item in filtered:
            item_id = item.get("id", "")
            if item_id and item_id in seen_ids:
                continue
            seen_ids.add(item_id)
            # Tag source type for frontend (preserve radio)
            if item.get("source_type") == "radio":
                pass
            elif item.get("aggregator") and item.get("aggregator") not in (
                "podcast",
                "radio",
            ):
                item["source_type"] = "aggregator"
            elif (
                item.get("aggregator") == "podcast"
                or item.get("category", "").lower() == "podcast"
            ):
                item["source_type"] = "podcast"
            else:
                item["source_type"] = item.get("source_type") or "rss"
            deduped.append(item)

        # 6. Sort: title matches first, then by date
        deduped.sort(
            key=lambda x: (
                query_lower not in (x.get("title") or "").lower(),
                x.get("published") or "",
            ),
            reverse=True,
        )

        total = len(deduped)
        paginated = deduped[skip : skip + limit]

        return {
            "results": paginated,
            "total": total,
            "query": q,
            "filters": {"category": category, "source": source},
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Search failed: {str(e)}")


# ===========================================
# USER SETTINGS API
# ===========================================


class UserSettings(BaseModel):
    voice_model: str = "emma"
    voice_dialect: str = "standard"
    voice_region: str = "africa"
    high_contrast: bool = False
    interface_scale: str = "100%"
    haptic_sync: bool = True
    alert_volume: int = 70
    data_limit: float = 2.5
    bandwidth_priority: str = "streaming"
    display_density: str = "standard"
    font_scale: int = 100
    gestural_swipe: bool = True
    gestural_pinch: bool = False
    voice_commands: bool = False
    broadcast_language: str = "en"
    aggregator_mediastack: bool = True
    aggregator_newsdata: bool = True
    interface_language: str = "en"
    theme: str = "dark"
    sound_theme: str = "narvo_classic"
    interests: List[str] = []


@app.get("/api/settings/{user_id}")
async def get_user_settings(user_id: str):
    """Get user settings"""
    from services.user_service import get_settings

    return get_settings(user_id)


@app.post("/api/settings/{user_id}")
async def save_user_settings(user_id: str, settings: UserSettings):
    """Save user settings (merges with existing)"""
    from services.user_service import update_settings

    update_settings(user_id, settings.model_dump(exclude_unset=True))
    return {"status": "success", "message": "Settings saved"}


@app.get("/api/settings/{user_id}/voice")
async def get_voice_settings(user_id: str):
    """Get voice-specific settings"""
    from services.user_service import get_settings

    s = get_settings(user_id)
    return {
        "voice_model": s.get("voice_model", "emma"),
        "voice_dialect": s.get("voice_dialect", "standard"),
        "voice_region": s.get("voice_region", "africa"),
    }


@app.post("/api/settings/{user_id}/voice")
async def save_voice_settings(
    user_id: str,
    voice_model: str = "emma",
    voice_dialect: str = "standard",
    voice_region: str = "africa",
):
    """Save voice settings"""
    from services.user_service import update_settings

    update_settings(
        user_id,
        {
            "voice_model": voice_model,
            "voice_dialect": voice_dialect,
            "voice_region": voice_region,
        },
    )
    return {"status": "success", "message": "Voice settings saved"}


# ===========================================
# SUBSCRIPTION API (user_subscriptions CRUD)
# ===========================================


class SubscriptionUpdate(BaseModel):
    tier: str = "free"
    status: Optional[str] = "active"
    ends_at: Optional[str] = None
    external_id: Optional[str] = None


@app.get("/api/subscription/{user_id}")
async def get_subscription(user_id: str):
    """Get current subscription. Returns tier and metadata or implicit free."""
    from services.subscription_service import get_subscription as get_sub

    sub = get_sub(user_id)
    if not sub:
        return {"tier": "free", "status": "active", "started_at": None, "ends_at": None}
    return sub


@app.put("/api/subscription/{user_id}")
async def update_subscription(user_id: str, body: SubscriptionUpdate):
    """Create or update subscription (upsert)."""
    from services.subscription_service import upsert_subscription

    try:
        sub = upsert_subscription(
            user_id,
            tier=body.tier,
            status=body.status or "active",
            ends_at=body.ends_at,
            external_id=body.external_id,
        )
        return sub
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@app.delete("/api/subscription/{user_id}")
async def delete_subscription(user_id: str):
    """Remove subscription (revert to free)."""
    from services.subscription_service import delete_subscription as delete_sub

    deleted = delete_sub(user_id)
    return {"status": "success", "deleted": deleted, "tier": "free"}


@app.post("/api/subscription/{user_id}/cancel")
async def cancel_subscription(user_id: str):
    """Mark subscription as cancelled."""
    from services.subscription_service import cancel_subscription as cancel_sub

    sub = cancel_sub(user_id)
    if not sub:
        return {"tier": "free", "status": "cancelled"}
    return sub


# ===========================================
# FACT-CHECKING API (Mock Dubawa Integration)
# ===========================================


class FactCheckResult(BaseModel):
    status: str  # 'VERIFIED', 'DISPUTED', 'UNVERIFIED', 'FALSE'
    confidence: int  # 0-100
    source: str
    explanation: str
    checked_at: str


# Simulated fact-check database (keywords that trigger different verdicts)
FACT_CHECK_KEYWORDS = {
    "confirmed": ("VERIFIED", 95, "Official sources confirm this claim"),
    "official": ("VERIFIED", 90, "Statement verified through official channels"),
    "reports": ("UNVERIFIED", 60, "Claim requires additional verification"),
    "alleged": ("UNVERIFIED", 45, "Allegations not yet substantiated"),
    "breaking": ("UNVERIFIED", 55, "Breaking news - verification in progress"),
    "disputed": ("DISPUTED", 35, "Multiple sources contest this claim"),
    "false": ("FALSE", 15, "Claim contradicts verified facts"),
    "rumor": ("DISPUTED", 25, "Circulating as unverified rumor"),
    "viral": ("UNVERIFIED", 40, "Viral content pending fact-check"),
}


@app.get("/api/metrics")
async def get_metrics():
    """Get platform metrics for dashboard"""
    from services.news_service import get_content_sources as get_sources, RSS_FEED_COUNT

    sources_data = get_sources()

    from services.aggregator_service import get_aggregator_status

    agg_status = await get_aggregator_status()

    db = get_supabase_db()
    story_count = 0  # news_cache deprecated; use aggregator/sources for display
    tr = db.table("tts_cache").select("cache_key", count="exact").execute()
    tts_count = (
        tr.count if getattr(tr, "count", None) is not None else len(tr.data or [])
    )
    broadcast_hours = round(tts_count * 0.04, 1)  # ~2.5 min avg per TTS
    lr = db.table("listening_history").select("id", count="exact").execute()
    listen_count = (
        lr.count if getattr(lr, "count", None) is not None else len(lr.data or [])
    )

    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    br = db.table("briefings").select("id").eq("date", today).eq("user_id", "").limit(1).execute()
    broadcast_ready = bool(br.data and len(br.data) > 0)

    listen_str = f"{max(1, listen_count)}"
    return {
        "listeners_today": listen_str,
        "total_listeners": listen_str,
        "sources_online": sources_data.get("total_sources", RSS_FEED_COUNT),
        "total_sources": sources_data.get("total_sources", RSS_FEED_COUNT),
        "local_sources": sources_data.get("local_sources", 17),
        "international_sources": sources_data.get("international_sources", 6),
        "continental_sources": sources_data.get("continental_sources", 0),
        "stories_processed": story_count or sources_data.get("total_sources", RSS_FEED_COUNT) * 8,
        "broadcast_hours": broadcast_hours,
        "signal_strength": "98%",
        "network_load": f"{min(95, max(10, int(story_count / 5)))}%",
        "broadcast_sources": len(sources_data.get("broadcast_sources", [])),
        "verification_apis": len(sources_data.get("verification_apis", [])),
        "aggregators": agg_status,
        "broadcast_ready": broadcast_ready,
        "last_sync": datetime.now(timezone.utc).isoformat(),
    }


# ─── Listening History ───────────────────────────────────────
@app.post("/api/listening-history")
async def add_listening_history(data: dict = Body(...)):
    """Record a played broadcast to listening history"""
    db = get_supabase_db()
    entry = {
        "user_id": data.get("user_id", "guest"),
        "track_id": data.get("track_id", ""),
        "title": data.get("title", "Unknown"),
        "source": data.get("source", ""),
        "category": data.get("category", ""),
        "duration": data.get("duration", 0),
        "played_at": datetime.now(timezone.utc).isoformat(),
    }
    db.table("listening_history").insert(entry).execute()
    return {"status": "ok"}


@app.get("/api/listening-history/{user_id}")
async def get_listening_history(user_id: str, limit: int = Query(20, ge=1, le=100)):
    """Get user's listening history, most recent first"""
    db = get_supabase_db()
    r = (
        db.table("listening_history")
        .select("*")
        .eq("user_id", user_id)
        .order("played_at", desc=True)
        .limit(limit)
        .execute()
    )
    items = []
    for x in r.data or []:
        row = dict(x)
        if row.get("played_at") and hasattr(row["played_at"], "isoformat"):
            row["played_at"] = row["played_at"].isoformat()
        items.append(row)
    return items


@app.delete("/api/listening-history/{user_id}/{entry_id}")
async def delete_listening_history_entry(user_id: str, entry_id: str):
    """Delete a single listening history entry (for real-time updates)."""
    db = get_supabase_db()
    db.table("listening_history").delete().eq("user_id", user_id).eq(
        "id", entry_id
    ).execute()
    return {"status": "deleted", "id": entry_id}


@app.delete("/api/listening-history/{user_id}")
async def clear_listening_history(user_id: str):
    """Clear all listening history for a user."""
    db = get_supabase_db()
    db.table("listening_history").delete().eq("user_id", user_id).execute()
    return {"status": "cleared", "user_id": user_id}


# ─── Recommendations ───────────────────────────────────────
@app.get("/api/recommendations/{user_id}")
async def get_recommendations_endpoint(
    user_id: str, limit: int = Query(10, ge=1, le=30)
):
    """Get personalized news recommendations for a user"""
    from services.recommendation_service import get_recommendations
    from services.news_service import get_cached_all_news

    all_news = await get_cached_all_news()
    try:
        from services.aggregator_service import get_normalized_aggregator_news

        agg_news = await get_normalized_aggregator_news()
        all_news = list(all_news) + list(agg_news)
    except Exception:
        pass

    result = await get_recommendations(user_id, all_news, limit=limit)

    # Strip any _id fields that might have snuck in
    for rec in result.get("recommendations", []):
        rec.pop("_id", None)

    return result


@app.get("/api/system-alerts")
async def get_system_alerts():
    """Get real system alerts based on actual service status"""
    from services.aggregator_service import get_aggregator_status

    agg = await get_aggregator_status()
    alerts = []

    # Check aggregator staleness
    if agg.get("cache_stale"):
        alerts.append(
            {
                "id": "agg-stale",
                "type": "warning",
                "title": "AGGREGATOR_CACHE_STALE",
                "desc": "News aggregator cache has expired. New stories may be delayed.",
                "time": agg.get("last_fetched", ""),
                "priority": True,
            }
        )

    # Check source counts
    ms_count = agg.get("mediastack", {}).get("cached_count", 0)
    nd_count = agg.get("newsdata", {}).get("cached_count", 0)

    if ms_count + nd_count > 0:
        alerts.append(
            {
                "id": "agg-active",
                "type": "info",
                "title": "AGGREGATOR_FEEDS_ACTIVE",
                "desc": f"Mediastack: {ms_count} stories cached. NewsData: {nd_count} stories cached.",
                "time": agg.get("last_fetched", ""),
                "priority": False,
            }
        )

    db = get_supabase_db()
    tr = db.table("tts_cache").select("cache_key", count="exact").execute()
    tts_count = (
        tr.count if getattr(tr, "count", None) is not None else len(tr.data or [])
    )
    if tts_count > 0:
        alerts.append(
            {
                "id": "tts-cache",
                "type": "info",
                "title": "TTS_CACHE_ACTIVE",
                "desc": f"{tts_count} audio broadcasts cached for instant playback.",
                "time": datetime.now(timezone.utc).isoformat(),
                "priority": False,
            }
        )

    # Always show a platform status message
    alerts.append(
        {
            "id": "platform-status",
            "type": "feature",
            "title": "PLATFORM_OPERATIONAL",
            "desc": "All Narvo broadcast systems are online and operational.",
            "time": datetime.now(timezone.utc).isoformat(),
            "priority": False,
        }
    )

    return alerts


# ─── Push Notifications ───────────────────────────────────────
@app.post("/api/notifications/subscribe")
async def subscribe_push(data: dict = Body(...)):
    """Store push notification subscription"""
    endpoint = data.get("endpoint", "")
    if not endpoint:
        raise HTTPException(status_code=400, detail="Missing endpoint")
    db = get_supabase_db()
    db.table("push_subscriptions").upsert(
        {
            "endpoint": endpoint,
            "subscription_data": data,
            "subscribed_at": datetime.now(timezone.utc).isoformat(),
        },
        on_conflict="endpoint",
    ).execute()
    return {"status": "subscribed"}


@app.post("/api/notifications/unsubscribe")
async def unsubscribe_push(data: dict = Body(...)):
    """Remove push notification subscription"""
    endpoint = data.get("endpoint", "")
    if endpoint:
        get_supabase_db().table("push_subscriptions").delete().eq(
            "endpoint", endpoint
        ).execute()
    return {"status": "unsubscribed"}


@app.get("/api/notifications/digest")
async def get_daily_digest():
    """Get daily digest content for push notification (from aggregator, not DB)."""
    from services.news_service import fetch_all_news

    all_news = await fetch_all_news(limit=5)
    stories = [
        {
            "id": s.get("id"),
            "title": s.get("title"),
            "category": s.get("category"),
            "source": s.get("source"),
        }
        for s in all_news[:5]
    ]
    return {
        "title": "NARVO DAILY DIGEST",
        "top_stories": stories,
        "briefing_available": True,
        "generated_at": datetime.now(timezone.utc).isoformat(),
    }


# ===========================================
# RADIO STATIONS API (Radio Browser)
# ===========================================
RADIO_BROWSER_API = "https://de1.api.radio-browser.info"


class RadioStation(BaseModel):
    id: str
    name: str
    url: str
    url_resolved: Optional[str] = None
    country: str
    countrycode: str
    state: Optional[str] = None
    language: Optional[str] = None
    tags: Optional[str] = None
    votes: int = 0
    codec: Optional[str] = None
    bitrate: int = 0
    favicon: Optional[str] = None


@app.get("/api/radio/stations", response_model=List[RadioStation])
async def get_radio_stations(
    country: str = Query(None, description="Filter by country code (e.g., NG, GH, ZA)"),
    limit: int = Query(20, ge=1, le=100, description="Max stations to return"),
    search: str = Query(None, description="Search by station name"),
):
    """Get African radio stations from Radio Browser API"""
    try:
        async with httpx.AsyncClient(timeout=15.0) as client:
            # Build query params
            params = {
                "limit": limit,
                "hidebroken": "true",
                "order": "votes",
                "reverse": "true",
            }

            if search:
                # Search by name
                url = f"{RADIO_BROWSER_API}/json/stations/byname/{search}"
            elif country:
                # Filter by country code
                url = f"{RADIO_BROWSER_API}/json/stations/bycountrycodeexact/{country}"
            else:
                # Default: Get top African stations
                # We'll search for major African countries
                url = f"{RADIO_BROWSER_API}/json/stations/search"
                params["countrycodeList"] = "NG,GH,KE,ZA,EG,MA,TZ,UG,ET,SN,CI,CM,AO,ZW"

            response = await client.get(url, params=params)
            response.raise_for_status()
            data = response.json()

            stations = []
            for item in data[:limit]:
                stations.append(
                    RadioStation(
                        id=item.get("stationuuid", ""),
                        name=item.get("name", "Unknown Station"),
                        url=item.get("url", ""),
                        url_resolved=item.get("url_resolved", item.get("url", "")),
                        country=item.get("country", ""),
                        countrycode=item.get("countrycode", ""),
                        state=item.get("state", ""),
                        language=item.get("language", ""),
                        tags=item.get("tags", ""),
                        votes=item.get("votes", 0),
                        codec=item.get("codec", ""),
                        bitrate=item.get("bitrate", 0),
                        favicon=item.get("favicon", ""),
                    )
                )

            return stations
    except httpx.TimeoutException:
        raise HTTPException(status_code=504, detail="Radio API timeout")
    except Exception as e:
        logger.warning("Radio API error: %s", e)
        # Return fallback stations
        return [
            RadioStation(
                id="fallback-1",
                name="Cool FM Lagos",
                url="https://stream.coolfm.ng/live",
                country="Nigeria",
                countrycode="NG",
                votes=1000,
                bitrate=128,
            ),
            RadioStation(
                id="fallback-2",
                name="Wazobia FM",
                url="https://stream.wazobiafm.com/live",
                country="Nigeria",
                countrycode="NG",
                votes=800,
                bitrate=128,
            ),
            RadioStation(
                id="fallback-3",
                name="Metro FM South Africa",
                url="https://stream.metrofm.co.za/live",
                country="South Africa",
                countrycode="ZA",
                votes=600,
                bitrate=128,
            ),
        ]


@app.get("/api/radio/countries")
async def get_radio_countries():
    """Get list of African countries with radio stations"""
    return [
        {"code": "NG", "name": "Nigeria", "flag": "🇳🇬"},
        {"code": "GH", "name": "Ghana", "flag": "🇬🇭"},
        {"code": "KE", "name": "Kenya", "flag": "🇰🇪"},
        {"code": "ZA", "name": "South Africa", "flag": "🇿🇦"},
        {"code": "EG", "name": "Egypt", "flag": "🇪🇬"},
        {"code": "MA", "name": "Morocco", "flag": "🇲🇦"},
        {"code": "TZ", "name": "Tanzania", "flag": "🇹🇿"},
        {"code": "UG", "name": "Uganda", "flag": "🇺🇬"},
        {"code": "ET", "name": "Ethiopia", "flag": "🇪🇹"},
        {"code": "SN", "name": "Senegal", "flag": "🇸🇳"},
        {"code": "CI", "name": "Côte d'Ivoire", "flag": "🇨🇮"},
        {"code": "CM", "name": "Cameroon", "flag": "🇨🇲"},
    ]


# ===========================================
# DISCOVER ENDPOINTS (Podcasts & Trending)
# ===========================================
class PodcastEpisode(BaseModel):
    id: str
    episode: str
    title: str
    duration: str
    description: str
    category: str = "General"
    published: Optional[str] = None


@app.get("/api/discover/trending")
async def get_trending_topics():
    """Get trending topics and categories for the Discover page"""
    try:
        from services.news_service import get_cached_all_news

        all_news = await get_cached_all_news()
        all_news = all_news[:80]  # enough for category counts

        # Count categories
        category_counts = {}
        for item in all_news:
            cat = item.get("category", "General")
            category_counts[cat] = category_counts.get(cat, 0) + 1

        trending = sorted(category_counts.items(), key=lambda x: x[1], reverse=True)[:8]
        return [
            {"topic": cat, "count": count, "trend": "up" if count > 2 else "stable"}
            for cat, count in trending
        ]
    except Exception as e:
        logger.warning("Trending error: %s", e)
        return [
            {"topic": "Politics", "count": 12, "trend": "up"},
            {"topic": "Economy", "count": 8, "trend": "up"},
            {"topic": "Security", "count": 6, "trend": "stable"},
            {"topic": "Technology", "count": 5, "trend": "up"},
            {"topic": "Health", "count": 4, "trend": "stable"},
        ]


# ===========================================
# OFFLINE ENDPOINTS (Article caching, per-user in DB for future reference)
# ===========================================
class OfflineArticle(BaseModel):
    story_id: str
    title: str
    summary: str
    narrative: Optional[str] = None
    source: str
    category: str = "General"
    image_url: Optional[str] = None
    user_id: Optional[str] = None  # when set, stored for this user; else guest


@app.post("/api/offline/save")
async def save_offline_article(article: OfflineArticle):
    """Save an article for offline reading (stored in DB per user for future reference)."""
    from services.offline_service import save_article

    data = article.dict()
    uid = data.pop("user_id", None)
    return save_article(data, user_id=uid)


@app.get("/api/offline/articles")
async def get_offline_articles(user_id: str = Query("guest", description="User ID for saved offline list")):
    """Get all saved offline articles for the user."""
    from services.offline_service import get_articles

    return get_articles(user_id=user_id or None)


@app.delete("/api/offline/articles/{story_id}")
async def delete_offline_article(story_id: str, user_id: str = Query("guest", description="User ID")):
    """Remove an offline article for the user."""
    from services.offline_service import remove_article

    if not remove_article(story_id, user_id=user_id or None):
        raise HTTPException(status_code=404, detail="Article not found")
    return {"status": "deleted", "story_id": story_id}


@app.delete("/api/offline/articles")
async def clear_offline_articles(user_id: str = Query("guest", description="User ID")):
    """Clear all offline articles for the user."""
    from services.offline_service import clear_all_articles

    count = clear_all_articles(user_id=user_id or None)
    return {"status": "cleared", "count": count}


@app.get("/api/offline/stats")
async def get_offline_stats(user_id: str = Query("guest", description="User ID")):
    """Get offline storage statistics for the user."""
    from services.offline_service import get_stats

    return get_stats(user_id=user_id or None)


# ===========================================
# BOOKMARK ENDPOINTS (Supabase)
# ===========================================
@app.post("/api/bookmarks")
async def add_bookmark(request: BookmarkRequest):
    """Add a bookmark for a user"""
    from services.user_service import add_bookmark as _add

    bookmark_data = {
        "story_id": request.story_id,
        "title": request.title,
        "summary": request.summary,
        "source": request.source,
        "category": request.category,
        "source_url": request.source_url,
    }
    out = _add(request.user_id, bookmark_data)
    return {
        "status": "ok",
        "bookmark": {
            **bookmark_data,
            "saved_at": out.get("saved_at", datetime.now(timezone.utc).isoformat()),
        },
    }


@app.get("/api/bookmarks")
async def get_bookmarks(user_id: str = Query(..., description="User ID")):
    """Get all bookmarks for a user"""
    from services.user_service import get_bookmarks as _get

    return _get(user_id)


@app.delete("/api/bookmarks/{story_id}")
async def remove_bookmark(
    story_id: str, user_id: str = Query(..., description="User ID")
):
    """Remove a bookmark"""
    from services.user_service import remove_bookmark as _remove

    _remove(user_id, story_id)
    return {"status": "ok"}


# ===========================================
# USER PREFERENCES ENDPOINTS (Supabase)
# ===========================================
@app.post("/api/preferences")
async def save_preferences(request: UserPreferencesRequest):
    """Save user preferences"""
    from services.user_service import update_preferences

    update_preferences(
        request.user_id,
        {
            "region": request.region,
            "voice": request.voice,
            "interests": request.interests,
        },
    )
    return {
        "status": "ok",
        "preferences": {
            "region": request.region,
            "voice": request.voice,
            "interests": request.interests,
        },
    }


@app.get("/api/preferences")
async def get_preferences(user_id: str = Query(..., description="User ID")):
    """Get user preferences"""
    from services.user_service import get_preferences as _get

    doc = _get(user_id)
    if doc:
        return doc
    return {
        "region": "lagos",
        "voice": "pidgin",
        "interests": ["politics", "sports", "afrobeats"],
    }


# Category colors for OG image
OG_CATEGORY_COLORS = {
    "politics": "#dc2626",
    "tech": "#0891b2",
    "sports": "#16a34a",
    "finance": "#d97706",
    "business": "#d97706",
    "culture": "#9333ea",
    "health": "#0d9488",
    "environment": "#059669",
    "general": "#6b7280",
}

# Common social media crawler user agents
CRAWLER_USER_AGENTS = [
    "facebookexternalhit",
    "twitterbot",
    "linkedinbot",
    "pinterest",
    "slackbot",
    "telegrambot",
    "whatsapp",
    "discordbot",
    "applebot",
    "googlebot",
    "bingbot",
    "yandex",
    "baiduspider",
]


def is_crawler(user_agent: str) -> bool:
    """Check if request is from a social media crawler"""
    if not user_agent:
        return False
    ua_lower = user_agent.lower()
    return any(crawler in ua_lower for crawler in CRAWLER_USER_AGENTS)


# ─── Analytics ───────────────────────────────────────
@app.get("/api/analytics/{user_id}")
async def get_user_analytics(user_id: str):
    """Get listening analytics for a user with trends and comparisons"""
    db = get_supabase_db()
    r = (
        db.table("listening_history")
        .select("category, source, played_at, duration, title")
        .eq("user_id", user_id)
        .order("played_at", desc=True)
        .limit(500)
        .execute()
    )
    history = []
    for x in r.data or []:
        row = {k: v for k, v in x.items()}
        played_at = row.get("played_at")
        if played_at is not None:
            row["played_at"] = (
                played_at.isoformat()
                if hasattr(played_at, "isoformat")
                else str(played_at)
            )
        else:
            row["played_at"] = ""
        history.append(row)

    if not history:
        return {
            "total_listens": 0,
            "total_duration_minutes": 0,
            "categories": {},
            "sources": {},
            "daily_activity": [],
            "streak": 0,
            "top_categories": [],
            "weekly_trend": [],
            "period_comparison": None,
            "hourly_distribution": {},
        }

    from collections import Counter
    from datetime import timedelta

    now = datetime.now(timezone.utc)
    cat_counts = Counter()
    src_counts = Counter()
    daily_counts = {}
    hourly_counts = Counter()
    this_week = 0
    last_week = 0

    for h in history:
        cat = (h.get("category") or "general").lower()
        cat_counts[cat] += 1
        src = h.get("source", "unknown")
        src_counts[src] += 1
        played = h.get("played_at", "")
        day = played[:10]
        if day:
            daily_counts[day] = daily_counts.get(day, 0) + 1

        # Parse hour for hourly distribution
        try:
            played_dt = datetime.fromisoformat(played.replace("Z", "+00:00"))
            hourly_counts[played_dt.hour] += 1
            age_days = (now - played_dt).days
            if age_days < 7:
                this_week += 1
            elif age_days < 14:
                last_week += 1
        except Exception:
            pass

    # Streak
    streak = 0
    for i in range(30):
        day_str = (now - timedelta(days=i)).strftime("%Y-%m-%d")
        if day_str in daily_counts:
            streak += 1
        else:
            break

    total_duration = sum(h.get("duration", 0) for h in history)
    daily_sorted = sorted(daily_counts.items(), key=lambda x: x[0], reverse=True)[:14]

    # Weekly trend (last 4 weeks)
    weekly_trend = []
    for w in range(4):
        start = now - timedelta(days=(w + 1) * 7)
        end = now - timedelta(days=w * 7)
        label = f"W-{w}" if w > 0 else "This week"
        count = sum(
            1
            for h in history
            if h.get("played_at", "")[:10] >= start.strftime("%Y-%m-%d")
            and h.get("played_at", "")[:10] < end.strftime("%Y-%m-%d")
        )
        weekly_trend.append({"week": label, "count": count})
    weekly_trend.reverse()

    # Period comparison
    change_pct = 0
    if last_week > 0:
        change_pct = round(((this_week - last_week) / last_week) * 100)
    period_comparison = {
        "this_week": this_week,
        "last_week": last_week,
        "change_pct": change_pct,
        "trend": "up"
        if this_week > last_week
        else "down"
        if this_week < last_week
        else "flat",
    }

    # Hourly distribution (24h)
    hourly_dist = {str(h).zfill(2): hourly_counts.get(h, 0) for h in range(24)}

    return {
        "total_listens": len(history),
        "total_duration_minutes": round(total_duration / 60, 1)
        if total_duration
        else 0,
        "categories": dict(cat_counts.most_common(8)),
        "sources": dict(src_counts.most_common(10)),
        "daily_activity": [{"date": d, "count": c} for d, c in daily_sorted],
        "streak": streak,
        "top_categories": [k for k, _ in cat_counts.most_common(3)],
        "weekly_trend": weekly_trend,
        "period_comparison": period_comparison,
        "hourly_distribution": hourly_dist,
    }


@app.get("/api/share/{news_id}", response_class=HTMLResponse)
async def share_page(news_id: str, request: Request):
    """
    Shareable page that serves proper OG meta tags for social media crawlers.
    For regular browsers, redirects to the React app.
    """
    user_agent = request.headers.get("user-agent", "")

    from services.news_service import get_cached_all_news

    all_news = await get_cached_all_news()
    story = next((item for item in all_news if item.get("id") == news_id), None)

    if not story:
        # Redirect to homepage if story not found
        return HTMLResponse(
            content=f'<html><head><meta http-equiv="refresh" content="0;url=/"></head></html>'
        )

    title = story.get("title", "Narvo News")[:100]
    description = (
        story.get("summary", "") or "Listen on Narvo — Audio-first news for Africa"
    )[:200]
    source = story.get("source", "NARVO")
    category = (story.get("category", "general") or "general").lower()
    image_url = (
        story.get("image_url")
        or "https://images.unsplash.com/photo-1590283603385-17ffb3a7f29f?auto=format&fit=crop&w=1200&q=80"
    )

    # Get the base URL from request
    base_url = str(request.base_url).rstrip("/")
    share_url = f"{base_url}/share/{news_id}"
    app_url = f"{base_url}/news/{news_id}"
    og_image_url = f"{base_url}/api/og/{news_id}"

    # For crawlers: return HTML with OG meta tags
    # For browsers: redirect to React app
    if is_crawler(user_agent):
        html = f"""<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="utf-8">
    <title>{title} — NARVO</title>
    <meta name="description" content="{description}">

    <!-- Open Graph -->
    <meta property="og:type" content="article">
    <meta property="og:title" content="{title}">
    <meta property="og:description" content="{description}">
    <meta property="og:url" content="{share_url}">
    <meta property="og:image" content="{image_url}">
    <meta property="og:image:width" content="1200">
    <meta property="og:image:height" content="630">
    <meta property="og:site_name" content="NARVO">
    <meta property="article:publisher" content="Narvo">
    <meta property="article:section" content="{category}">

    <!-- Twitter Card -->
    <meta name="twitter:card" content="summary_large_image">
    <meta name="twitter:title" content="{title}">
    <meta name="twitter:description" content="{description}">
    <meta name="twitter:image" content="{image_url}">
    <meta name="twitter:site" content="@narvo">

    <!-- Telegram -->
    <meta property="telegram:channel" content="@narvo">
</head>
<body>
    <h1>{title}</h1>
    <p>{description}</p>
    <p>Source: {source}</p>
    <a href="{app_url}">Read on Narvo</a>
</body>
</html>"""
        return HTMLResponse(content=html)
    else:
        # For regular browsers, redirect to React app
        return HTMLResponse(
            content=f"""<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>{title} — NARVO</title>
    <meta http-equiv="refresh" content="0;url=/news/{news_id}">
    <script>window.location.href = "/news/{news_id}";</script>
</head>
<body>Redirecting...</body>
</html>"""
        )


@app.get("/api/og/{news_id}", response_class=HTMLResponse)
async def og_image_html(news_id: str):
    """Generate an HTML page that serves as OG image preview for social sharing"""
    from services.news_service import get_cached_all_news

    all_news = await get_cached_all_news()
    story = next((item for item in all_news if item.get("id") == news_id), None)

    if not story:
        raise HTTPException(status_code=404, detail="Story not found")

    title = story.get("title", "Narvo News")[:100]
    source = story.get("source", "NARVO")
    category = (
        (story.get("category", "general") or "general").lower().replace("#", "").strip()
    )
    region = story.get("region", "AFRICA")
    accent = OG_CATEGORY_COLORS.get(category, "#6b7280")

    html = f"""<!DOCTYPE html>
<html><head><meta charset="utf-8">
<meta property="og:title" content="{title}" />
<meta property="og:description" content="Listen on Narvo — Audio-first news for Africa" />
<meta property="og:type" content="article" />
<meta property="og:site_name" content="NARVO" />
<meta name="twitter:card" content="summary_large_image" />
<meta name="twitter:title" content="{title}" />
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
  .logo {{ width:80px; height:80px; }}
  .tag {{ color:#374151; font-size:11px; font-weight:600; letter-spacing:3px; text-align:right; }}
  .bar {{ height:4px; background:linear-gradient(90deg,{accent},transparent); }}
</style></head>
<body>
  <div class="top"></div>
  <div class="main">
    <div class="left">
      <div>
        <span class="cat">{category}</span>
        <div class="title">{title}</div>
      </div>
      <div class="meta">
        <span class="src">{source}</span>
        <span>{region}</span>
        <span>NARVO // AUDIO-FIRST</span>
      </div>
    </div>
    <div class="right">
      <div class="logo"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 421 421" width="80" height="80"><g transform="matrix(1,0,0,1,-409.98,-663.92)"><g transform="matrix(1.26,0,0,1.26,161.58,-953.31)"><rect x="197.085" y="1283.168" width="333.402" height="333.402" fill="#1B211A"/></g><g transform="matrix(0.41,0,0,0.41,409.97,644.21)"><path fill="#EBD5AB" d="M731.43,512H800L736,736H288L224,512H292.57L256,384H372.57L336,256H688L651.43,384H768L731.43,512Z"/><path fill="#EBD5AB" fill-rule="nonzero" d="M352,768H672L640,864H384L352,768Z"/></g></g></svg></div>
      <div class="tag">NARVO.NEWS<br/>VOICE-FIRST<br/>PLATFORM</div>
    </div>
  </div>
  <div class="bar"></div>
</body></html>"""
    return HTMLResponse(content=html)


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=8001)
