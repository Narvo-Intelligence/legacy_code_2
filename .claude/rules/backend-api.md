---
paths:
  - "backend/**/*.py"
---
# Backend API Conventions — Narvo Technical v5

## Endpoint Patterns
- All routes under `/api/` prefix (e.g., `/api/news`, `/api/briefing`, `/api/discover`).
- Use FastAPI's APIRouter for route grouping.
- Entry point: `backend/server.py`.
- Swagger docs auto-generated at `/docs`.

## Error Handling
- Every endpoint must include try/except with standardized JSON error responses.
- Use tenacity for retry logic on external API calls (Supabase, Gemini, YarnGPT).
- Standard retry config: `stop_after_attempt(3)`, `wait_exponential(min=1, max=4)`.
- Optional Sentry integration via `SENTRY_DSN` env var.

## Supabase
- Use service role key for server-side operations — never expose anon key in backend.
- Always enable RLS on new tables.
- Use `auth.uid()` for user-scoped RLS policies.
- Table schema: `story_content`, `listening_history`, `bookmarks`, `user_preferences`.

## Content Pipeline
- Gemini: `gemini-1.5-flash` for narrative synthesis, `gemini-embedding-001` for vectors.
- Scraper Cascade: `trafilatura` → `newspaper4k` → `readability-lxml` → `goose3` → `BS4` → RSS summary.
- TTS: YarnGPT (Nigerian accents) with OpenAI `tts-1` fallback.
- Morning Briefing: Pre-generated at 05:00 WAT via QStash cron.

## Caching & Scheduling
- Redis: Upstash Redis for HTTP-based caching (`NEWS_CACHE_TTL = 120s`).
- Scheduling: Upstash QStash for HMAC-SHA256 verified cron jobs.

## Environment Variables
- Required: `SUPABASE_URL`, `SUPABASE_SERVICE_KEY`, `GEMINI_API_KEY`, `UPSTASH_REDIS_REST_URL`, `YARNGPT_API_KEY`.
- Optional: `OPENAI_API_KEY`, `SENTRY_DSN`, `QSTASH_SIGNING_KEY`.
