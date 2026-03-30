---
paths:
  - "backend/**/*.py"
---
# Backend API Conventions

## Endpoint Patterns
- All routes under `/api/` prefix (e.g., `/api/health`, `/api/stories`, `/api/playlists`).
- Use FastAPI's APIRouter for route grouping.
- Entry point: `backend/server.py`.
- Swagger docs auto-generated at `/docs`.

## Error Handling
- Every endpoint must include try/except with meaningful error responses.
- Use tenacity for retry logic on external API calls (Supabase, Gemini, TTS services).
- Standard retry config: `stop_after_attempt(3)`, `wait_exponential(min=1, max=4)`.
- Optional Sentry integration via `SENTRY_DSN` env var — don't require it.

## Supabase
- Use service role key (server-side, full access) — never expose anon key in backend.
- Always enable RLS on new tables.
- Use `auth.uid()` for user-scoped RLS policies.
- Foreign keys to users: `references auth.users(id) on delete cascade`.
- Migrations in `supabase/migrations/` — descriptive filenames.

## CORS
- Configured via `FRONTEND_ORIGIN` env var.
- In dev: `http://localhost:3000`. In prod: `https://narvo.news`.

## Content Pipeline
- Gemini handles narrative synthesis — all prompts must produce Truth Tags.
- TTS pipeline: YarnGPT (regional accents) with OpenAI fallback.
- Morning Briefing pre-generated at 5am via cron endpoint.
- 3G optimisation: fast-fallback to paraphrased text when audio generation is slow.

## Environment Variables
- See `backend/.env.example` for the full list.
- Required: SUPABASE_URL, SUPABASE_KEY, GEMINI_API_KEY, OPENAI_API_KEY, FRONTEND_ORIGIN.
- Optional: YARNGPT, SENTRY_DSN.
