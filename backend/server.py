# Narvo API — Assembly point: middleware, CORS, router registration, startup/shutdown.
# All route handlers live in routes/*.py (#1 monolith decomposition).
import os
import json
import uuid
import asyncio
import logging
import time
from datetime import datetime, timezone
from dotenv import load_dotenv

load_dotenv()

# ── Structured JSON Logging (#5) ────────────────────────────────────────
class _JsonFormatter(logging.Formatter):
    """Emit structured JSON log lines for Cloud Run / container environments."""
    def format(self, record: logging.LogRecord) -> str:
        log_entry = {
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "level": record.levelname,
            "logger": record.name,
            "message": record.getMessage(),
        }
        if record.exc_info and record.exc_info[0]:
            log_entry["exception"] = self.formatException(record.exc_info)
        for key in ("request_id", "user_id", "latency_ms"):
            val = getattr(record, key, None) or (record.__dict__.get(key))
            if val is not None:
                log_entry[key] = val
        return json.dumps(log_entry, default=str)


def _setup_logging() -> None:
    handler = logging.StreamHandler()
    handler.setFormatter(_JsonFormatter())
    root = logging.getLogger()
    root.handlers.clear()
    root.addHandler(handler)
    root.setLevel(logging.INFO)
    for name in ("httpx", "httpcore", "hpack"):
        logging.getLogger(name).setLevel(logging.WARNING)


_setup_logging()
logger = logging.getLogger("narvo.api")

# ── Optional Sentry ─────────────────────────────────────────────────────
_sentry_dsn = os.environ.get("SENTRY_DSN")
if _sentry_dsn:
    import sentry_sdk
    sentry_sdk.init(dsn=_sentry_dsn, traces_sample_rate=0.1, environment=os.environ.get("SENTRY_ENVIRONMENT", "production"))

# ── FastAPI App ─────────────────────────────────────────────────────────
from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.openapi.docs import get_swagger_ui_html
from fastapi.responses import HTMLResponse, JSONResponse
from starlette.middleware.gzip import GZipMiddleware
from starlette.middleware.base import BaseHTTPMiddleware

API_VERSION = "2.0.1"

SWAGGER_UI_PARAMS = {
    "syntaxHighlight.theme": "monokai", "docExpansion": "list",
    "displayRequestDuration": True, "filter": True, "tryItOutEnabled": True,
}
SWAGGER_CUSTOM_CSS = """<style id="narvo-docs-theme">
  html { background: #1B2126 !important; }
  body { background: #1B2126 !important; color: rgb(242, 242, 242) !important; }
  .swagger-ui { background: #1B2126 !important; }
  .swagger-ui .topbar { background: #242B23 !important; border-bottom: 1px solid rgb(98, 129, 65) !important; }
  .swagger-ui .info .title { color: rgb(235, 213, 171) !important; }
  .swagger-ui .info .base-url { color: rgb(139, 174, 102) !important; }
  .swagger-ui .opblock { border-color: rgb(98, 129, 65) !important; background: #242B23 !important; }
  .swagger-ui .opblock .opblock-summary-method { background: rgb(98, 129, 65) !important; }
  .swagger-ui .opblock .opblock-summary-path { color: rgb(235, 213, 171); }
  .swagger-ui .btn.execute { background: rgb(235, 213, 171) !important; color: #1B2126 !important; }
  .swagger-ui input[type=text], .swagger-ui textarea, .swagger-ui select { background: #242B23 !important; color: rgb(242, 242, 242) !important; border-color: rgb(98, 129, 65) !important; }
  .swagger-ui h1, .swagger-ui h2, .swagger-ui h3, .swagger-ui h4 { color: rgb(242, 242, 242) !important; }
</style>"""

app = FastAPI(
    title="Narvo API", version=API_VERSION,
    description="Broadcast-grade news API: narratives, TTS, translation, fact-check, briefings.",
    docs_url=None,
    openapi_tags=[
        {"name": "core", "description": "Health and root"},
        {"name": "news", "description": "News, search, trending"},
        {"name": "briefing", "description": "Morning Briefings"},
        {"name": "me", "description": "Personal domain: Bookmarks, preferences, settings, history"},
        {"name": "tts", "description": "Text-to-speech generation"},
    ],
)


# ── Standardized Error Responses (#6) ───────────────────────────────────
@app.exception_handler(HTTPException)
async def narvo_http_exception_handler(request: Request, exc: HTTPException):
    """Return a consistent JSON error envelope for all HTTPException responses."""
    detail = exc.detail or "Unknown error"
    code = detail.upper().replace(" ", "_").replace(":", "")[:50] if isinstance(detail, str) else "ERROR"
    request_id = getattr(request.state, "request_id", None) or request.headers.get("X-Request-ID")
    user_id = getattr(request.state, "user_id", None)
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "error": True,
            "code": code,
            "detail": detail,
            "status": exc.status_code,
            "request_id": request_id,
            "user_id": str(user_id) if user_id else None,
        },
    )


@app.exception_handler(Exception)
async def narvo_unhandled_exception_handler(request: Request, exc: Exception):
    """Fallback handler for unexpected errors to keep response shape consistent."""
    request_id = getattr(request.state, "request_id", None) or request.headers.get("X-Request-ID")
    user_id = getattr(request.state, "user_id", None)
    logger.error("Unhandled server error: %s", exc, exc_info=True, extra={"request_id": request_id, "user_id": user_id})
    return JSONResponse(
        status_code=500,
        content={
            "error": True,
            "code": "INTERNAL_SERVER_ERROR",
            "detail": "Internal server error",
            "status": 500,
            "request_id": request_id,
            "user_id": str(user_id) if user_id else None,
        },
    )


# ── Middleware Stack ────────────────────────────────────────────────────
app.add_middleware(GZipMiddleware, minimum_size=500)


class RequestIDMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request, call_next):
        request_id = request.headers.get("X-Request-ID") or str(uuid.uuid4())
        request.state.request_id = request_id
        start = time.monotonic()
        try:
            response = await call_next(request)
        except Exception as e:
            logger.error(f"RequestIDMiddleware caught unhandled exception: {e}", exc_info=True)
            # Re-raise so FastAPI exception handlers can catch it, 
            # or return a direct response to satisfy BaseHTTPMiddleware.
            return await narvo_unhandled_exception_handler(request, e)
            
        latency = round((time.monotonic() - start) * 1000, 1)
        response.headers["X-Request-ID"] = request_id
        user_id = getattr(request.state, "user_id", None)
        logger.info("%s %s %s %sms", request.method, request.url.path, response.status_code, latency,
                    extra={"request_id": request_id, "latency_ms": latency, "user_id": user_id})
        return response


class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request, call_next):
        response = await call_next(request)
        response.headers.setdefault("X-Content-Type-Options", "nosniff")
        response.headers.setdefault("X-Frame-Options", "DENY")
        response.headers.setdefault("Referrer-Policy", "strict-origin-when-cross-origin")
        response.headers.setdefault(
            "Content-Security-Policy",
            "default-src 'self'; script-src 'self' 'unsafe-inline' https://cdnjs.cloudflare.com; "
            "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; "
            "img-src 'self' data: https:; connect-src 'self' https://*.supabase.co https://*.upstash.io "
            "https://yarngpt.ai https://api.openai.com https://generativelanguage.googleapis.com "
            "https://de1.api.radio-browser.info; media-src 'self' data: blob: https:; frame-ancestors 'none'"
        )
        return response


class RateLimitMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request, call_next):
        from lib.ratelimit import check_rate_limit
        forwarded = request.headers.get("X-Forwarded-For")
        ip = forwarded.split(",")[0].strip() if forwarded else (request.client.host if request.client else "unknown")
        
        try:
            allowed, detail = await check_rate_limit(ip, request.url.path)
            if not allowed:
                request_id = getattr(request.state, "request_id", None) or request.headers.get("X-Request-ID")
                user_id = getattr(request.state, "user_id", None)
                return JSONResponse(
                    status_code=429,
                    content={
                        "error": True,
                        "code": "RATE_LIMITED",
                        "detail": detail,
                        "status": 429,
                        "request_id": request_id,
                        "user_id": str(user_id) if user_id else None,
                    },
                )
            return await call_next(request)
        except Exception as e:
            logger.error(f"RateLimitMiddleware caught error: {e}", exc_info=True)
            return await narvo_unhandled_exception_handler(request, e)


class AuthUserMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request, call_next):
        from lib.auth import get_user_id_from_request
        try:
            request.state.user_id = get_user_id_from_request(request)
            return await call_next(request)
        except Exception as e:
            logger.error(f"AuthUserMiddleware caught error: {e}", exc_info=True)
            return await narvo_unhandled_exception_handler(request, e)


# LIFO: last added runs first. RequestID and Auth must run before RateLimit so request_id/user_id are set.
app.add_middleware(SecurityHeadersMiddleware)
app.add_middleware(RateLimitMiddleware)
app.add_middleware(AuthUserMiddleware)
app.add_middleware(RequestIDMiddleware)


# ── CORS ────────────────────────────────────────────────────────────────
_cors_origins = os.environ.get("FRONTEND_ORIGIN", "*")
if _cors_origins.strip() == "*":
    _cors_origins_list = ["http://localhost:3000", "http://127.0.0.1:3000", "https://narvo.news", "https://www.narvo.news"]
else:
    _cors_origins_list = [o.strip() for o in _cors_origins.split(",") if o.strip()]
    _narvo, _narvo_www = "https://narvo.news", "https://www.narvo.news"
    if _narvo in _cors_origins_list and _narvo_www not in _cors_origins_list: _cors_origins_list.append(_narvo_www)
    elif _narvo_www in _cors_origins_list and _narvo not in _cors_origins_list: _cors_origins_list.append(_narvo)
    for _origin in ("http://localhost:3000", "http://127.0.0.1:3000"):
        if _origin not in _cors_origins_list: _cors_origins_list.append(_origin)
app.add_middleware(CORSMiddleware, allow_origins=_cors_origins_list, allow_credentials=True, allow_methods=["*"], allow_headers=["*"])


# ── Router Registration ─────────────────────────────────────────────────
from routes.me import router as me_router
from routes.factcheck import router as factcheck_router
from routes.translation import router as translation_router
from routes.news import router as news_router
from routes.briefing import router as briefing_router
from routes.tts import router as tts_router
from routes.notifications import router as notifications_router
from routes.aggregators import router as aggregators_router
from routes.search import router as search_router
from routes.health import router as health_router
from routes.share import router as share_router
from routes.discover import router as discover_router
from routes.admin import router as admin_router
from routes.billing import router as billing_router
from routes.cron_tasks import router as cron_tasks_router
from routes.feedback import router as feedback_router

app.include_router(discover_router)
app.include_router(admin_router)
app.include_router(me_router)
app.include_router(factcheck_router)
app.include_router(translation_router)
app.include_router(news_router)
app.include_router(briefing_router)
app.include_router(tts_router)
app.include_router(notifications_router)
app.include_router(aggregators_router)
app.include_router(search_router)
app.include_router(health_router)
app.include_router(share_router)
app.include_router(billing_router)
app.include_router(cron_tasks_router)
app.include_router(feedback_router)


# ── Core Routes (kept in server.py) ─────────────────────────────────────

@app.get("/ping", tags=["core"], summary="Keep-alive ping")
@app.get("/api/ping", tags=["core"], summary="Keep-alive ping")
async def ping():
    return {"ok": True}


@app.get("/docs", include_in_schema=False)
async def custom_swagger_ui_html():
    html = get_swagger_ui_html(openapi_url=app.openapi_url, title=f"{app.title} - Docs", swagger_ui_parameters=SWAGGER_UI_PARAMS)
    raw = html.body
    body = raw.decode("utf-8") if isinstance(raw, bytes) else raw
    if "</head>" in body:
        body = body.replace("</head>", SWAGGER_CUSTOM_CSS.strip() + "\n</head>", 1)
    return HTMLResponse(content=body)


@app.get("/", tags=["core"], summary="API info")
async def root():
    return {"service": "Narvo API", "version": API_VERSION, "docs": "/docs", "health": "/api/health", "ping": "/ping or /api/ping"}


# ── Startup / Shutdown ──────────────────────────────────────────────────

@app.on_event("startup")
async def startup():
    from lib.env_check import check_environment
    try:
        check_environment()
    except RuntimeError:
        logger.warning("Environment validation failed - continuing with degraded functionality")
    logger.info("CORS allow_origins: %s", _cors_origins_list)
    async def _startup_warmup():
        try:
            await asyncio.sleep(10)
            from services.story_content_service import batch_prefill_new_stories
            result = await batch_prefill_new_stories(max_stories=20)
            logger.info("[Startup] Prefill warmup complete: %s", result)
        except Exception as e:
            logger.warning("[Startup] Prefill warmup failed: %s", e)
    asyncio.create_task(_startup_warmup())


@app.on_event("shutdown")
async def shutdown():
    from lib.http_client import close_http_client
    await close_http_client()


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
