# Narvo News — Technical Reference

> **Maintained document.** Update this file whenever a major technical or logical change is made to the codebase.
> Last updated: 2026-04-06 — §2 `frontend/` tree, §3 frontend stack, §5–§5.10, §7–§9 frontend rows aligned with **Next.js 15 App Router** (see root **`CLAUDE.md`**).
>
> **Author:** Ajibola Akelebe — Founder & Sole Developer, Narvo Intelligence

> **Note:** Decision-log entries in §10 may still name **Vite** or **`frontend/src/`** files from earlier eras; treat §2–§5 and §8–§9 as current for the B2C app unless a log entry explicitly supersedes them.

---

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [Repository Structure](#2-repository-structure)
3. [Tech Stack](#3-tech-stack)
4. [Backend Architecture](#4-backend-architecture)
   - [Server & Routing](#41-server--routing)
   - [Content Pipeline](#42-content-pipeline)
   - [AI & LLM Layer](#43-ai--llm-layer)
   - [TTS Pipeline](#44-tts-pipeline)
   - [Translation Pipeline](#45-translation-pipeline)
   - [Caching & Scheduling](#46-caching--scheduling)
   - [Recommendations Engine](#47-recommendations-engine)
   - [Morning Briefing](#48-morning-briefing)
   - [Authentication & Security](#49-authentication--security)
   - [Push Notifications](#410-push-notifications)
5. [Frontend Architecture](#5-frontend-architecture)
   - [App shell, layout & routing](#51-app-shell-layout--routing)
   - [API clients & auth](#52-api-clients--auth)
   - [Audio](#53-audio)
   - [Offline storage (IndexedDB)](#54-offline-storage-indexeddb)
   - [Service worker & PWA](#55-service-worker--pwa)
   - [Navigation (desktop & mobile)](#56-navigation-desktop--mobile)
   - [Copy & language](#57-copy--language)
   - [Theme](#58-theme)
   - [Client utilities](#59-client-utilities)
6. [Data Model](#6-data-model)
7. [Key Constants & Tunables](#7-key-constants--tunables)
8. [Infrastructure & Deployment](#8-infrastructure--deployment)
9. [Environment Variables](#9-environment-variables)
10. [Known Issues & Decisions Log](#10-known-issues--decisions-log)

---

## 1. Project Overview

Narvo is a bold, audio-first news platform for Africa. Part of **Narvo Intelligence Ltd.**, it ingests RSS feeds and aggregator APIs, clusters related articles, synthesises AI-written broadcast narratives via Gemini, pre-generates text-to-speech audio in five Nigerian launch languages, and serves a React PWA with offline playback, queue management, and a Morning Briefing feature.

**Core differentiators:**
- Authentic Nigerian-accented TTS via YarnGPT (Yoruba, Hausa, Igbo, Nigerian Pidgin, English)
- Multi-source composite story synthesis — not just one article, but a cross-source narrative
- Full pre-generation pipeline: translate → TTS all 5 languages before user opens a story
- PWA with IndexedDB blob cache for true offline audio playback

**Company structure:** Narvo Intelligence (parent) → Narvo (B2C consumer app, this repo) + Narvo Platform (B2B NaaS, planned).

**Design system (B2C `frontend/`):** **Design System v5.1** — Petrol Teal / Signal Vermilion, editorial type (`Newsreader` + `Instrument Sans` + `Geist Mono`), Tailwind v4 tokens in `frontend/app/globals.css`. Product copy is centralised in `frontend/lib/narvo-app-copy.ts`. Older v4 design docs under `design/` remain historical reference where noted.

---

## 2. Repository Structure

```
narvo_news/
├── backend/
│   ├── server.py                  # FastAPI app assembly point (middleware, CORS, routers)
│   ├── Dockerfile
│   ├── entrypoint.sh
│   ├── requirements.txt
│   ├── pyrightconfig.json
│   ├── pytest.ini
│   ├── supabase_schema.sql
│   ├── supabase_migrations/
│   ├── lib/
│   │   ├── http_client.py         # Shared httpx.AsyncClient pool
│   │   ├── supabase_db.py         # Supabase client singleton
│   │   ├── text_utils.py          # sanitize_ai_text, clean_text_for_briefing, strip_urls
│   │   └── qstash_verify.py       # HMAC-SHA256 QStash signature dependency
│   ├── models/                    # Pydantic request/response models
│   ├── routes/
│   │   ├── news.py                # GET /api/news, /api/news/breaking, /api/news/detail
│   │   ├── briefing.py            # POST /api/briefing/generate, GET /api/briefing/today
│   │   ├── discover.py            # Radio, voice studio, trending
│   │   ├── factcheck.py           # GET /api/factcheck/:story_id
│   │   ├── translation.py         # POST /api/translate
│   │   ├── user.py                # Preferences, bookmarks, listening history
│   │   ├── admin.py               # Admin-only operations
│   │   └── offline.py             # Offline digest generation
│   └── services/
│       ├── llm_gemini.py          # Gemini client (google.genai SDK)
│       ├── narrative_service.py   # generate_narrative, synthesize_composite_story
│       ├── story_content_service.py # Pre-generation pipeline (translate + TTS)
│       ├── yarngpt_service.py     # YarnGPT TTS + OpenAI fallback, chunking
│       ├── tts_service.py         # Standalone OpenAI TTS (used by briefing)
│       ├── translation_service.py # Gemini translation, stage-direction sanitizer
│       ├── news_service.py        # RSS fetch, cluster, merge, cache
│       ├── article_scraper_service.py # 5-library extraction cascade
│       ├── aggregator_service.py  # Mediastack + NewsData.io normalisation
│       ├── recommendation_service.py # Collaborative + vector + Gemini recs
│       ├── briefing_service.py    # Morning Briefing script + TTS
│       ├── factcheck_service.py   # Google Fact Check API wrapper
│       ├── push_sender.py         # VAPID push via pywebpush
│       ├── radio_service.py       # Radio Browser API proxy
│       ├── podcast_service.py     # Podcast feed normalisation
│       ├── sound_themes_service.py # Tone.js theme config served to frontend
│       ├── subscription_service.py # User subscription management
│       ├── admin_service.py       # Admin operations
│       ├── offline_service.py     # Offline digest compilation
│       └── user_service.py        # User profile helpers
├── frontend/                        # Next.js 15 (App Router) — B2C consumer app
│   ├── app/                         # Routes: page.tsx, layout.tsx per segment
│   │   ├── globals.css              # Tailwind v4 @theme + light/dark CSS vars
│   │   ├── layout.tsx               # Root layout: fonts, ThemeProvider, audio providers
│   │   ├── page.tsx                 # Landing
│   │   ├── dashboard/, briefing/, discover/, library/, listen/, search/
│   │   ├── settings/, insights/, onboarding/, auth/, forgot-password/
│   │   └── news/[id]/               # Story detail
│   ├── components/                  # Shared UI (app shell, cards, audio, auth)
│   │   ├── app/                     # AuthenticatedAppShell, DesktopRail, MobileNavDock, nav-items
│   │   ├── AudioPlayer.tsx          # Docked player UI
│   │   ├── AudioPlayerContext.tsx   # Playback state
│   │   ├── OfflineDownloadContext.tsx
│   │   ├── ThemeProvider.tsx
│   │   └── ...
│   ├── hooks/                       # use-mobile, use-latest-briefing, …
│   ├── lib/                         # narvo-api, me-api, supabase-browser, narvo-session, COPY, …
│   ├── middleware.ts                # Auth gating via narvo_demo_session cookie
│   ├── next.config.ts               # distDir: build, redirects, images
│   ├── public/                      # manifest, logos, sw.js / narvo-sw.js (push-focused)
│   ├── package.json
│   └── tsconfig.json
├── investor/                        # Vite + React — investor.narvo.news (separate deploy)
├── .claude/
│   └── TECHNICAL_REFERENCE.md      # ← this file (Claude / internal reference)
├── docs/                           # Additional product & design docs
├── cloudbuild.yaml                  # Cloud Build CI/CD
├── Dockerfile                       # Backend container
└── README.md
```

---

## 3. Tech Stack

### Backend
| Layer | Technology | Notes |
|---|---|---|
| Framework | FastAPI 0.11x | Async, auto-OpenAPI |
| Runtime | Python 3.12 + uvicorn | ASGI |
| Validation | Pydantic v2 | Request/response models |
| Database | Supabase (PostgreSQL) | With RLS policies |
| LLM | Google Gemini (`gemini-2.0-flash`) | Via `google.genai` SDK (not deprecated `google.generativeai`) |
| Primary TTS | YarnGPT | Chunked MP3 at sentence boundaries |
| Fallback TTS | OpenAI `tts-1` | Per-chunk fallback if YarnGPT fails |
| Caching | Upstash Redis | HTTP Redis for serverless |
| Scheduling | Upstash QStash | HMAC-SHA256 verified cron |
| Rate limiting | Upstash Ratelimit | Distributed across Cloud Run instances |
| Vector search | Upstash Vector | Semantic story recommendations |
| HTTP client | httpx + aiohttp | Shared httpx client + aiohttp for RSS/aggregators |
| Container | Docker → Google Cloud Run | Managed serverless |
| CI/CD | Google Cloud Build | `cloudbuild.yaml` |

### Frontend (B2C — `frontend/`)
| Layer | Technology | Notes |
|---|---|---|
| Framework | Next.js 15 App Router | RSC by default; `'use client'` where needed |
| UI | React 19 + TypeScript | Root layout in `app/layout.tsx` |
| Build / output | `next build` · `distDir: build` | See `next.config.ts` |
| Styling | Tailwind CSS v4 | `@theme` + tokens in `app/globals.css` |
| Fonts | next/font (Google) | Newsreader, Instrument Sans, Geist Mono → CSS variables |
| Routing | File-system routes under `app/` | Middleware protects authenticated segments |
| Data fetching | `fetch` + `lib/narvo-api.ts`, `lib/me-api.ts` | Base URL from `NEXT_PUBLIC_NARVO_API_URL` (see §9) |
| Animation | `motion` | `import { motion } from 'motion/react'` |
| Icons | Lucide React | |
| Copy | `lib/narvo-app-copy.ts` | Single `COPY` object for user-facing strings |
| Audio | `AudioPlayerContext` + `<Audio>` | `components/AudioPlayer.tsx` |
| Offline | `lib/offlineStorage.ts` (IndexedDB) + SW stubs | `NarvoOfflineDB` v1; `public/sw.js` push-focused |
| i18n | English-first UI in repo | Broadcast language prefs may appear in settings/API |
| Testing | ESLint + `tsc --noEmit` | Add Playwright/Vitest when reintroduced |
| PWA | `public/manifest.json` + SW | Install / push hooks evolve independently of shell |
| Monitoring | Sentry (optional) | DSN via env when wired |
| Hosting | Vercel | Production `narvo.news` |

---

## 4. Backend Architecture

### 4.1 Server & Routing

`server.py` is the FastAPI application assembly point. It:
- Configures CORS (`CORSMiddleware`) with allowed origins from `ALLOWED_ORIGINS` env var
- Registers `APIRouter` modules from `routes/`
- Defines root/ping/docs handlers (all API routes live in `routes/*.py`)
- Conditionally initialises Sentry when `SENTRY_DSN` is set
- Exposes a custom Swagger UI at `/docs` with Narvo dark theme
- Emits structured JSON logs and standardized error envelopes (includes `request_id`)

Cron endpoints protected by `Depends(verify_qstash)`:
- `POST /api/news/refresh` — RSS refresh every 15 min
- `POST /api/aggregators/refresh` — Mediastack + NewsData.io every 10 min
- `POST /api/sources/health/refresh` — source health check every 5 min

### 4.2 Content Pipeline

The full pipeline from raw feeds to a stored multi-language story:

```
RSS Feeds (40+)
    │
    ▼
news_service.fetch_all_news()
    │  feedparser + aiohttp, concurrent per-feed
    │  Each article: title, summary, url, published, source, category, region, story_id
    ▼
news_service.cluster_related_articles()
    │  Title-word overlap (≥3 shared words)
    │  Same category + region only (no Sports + Politics mixing)
    │  Returns List[List[article]]
    ▼
news_service.merge_clusters_to_stories()
    │  Per cluster:
    │    - Sort articles by published time (oldest first = primary source)
    │    - Scrape full text for all articles concurrently
    │    - Call narrative_service.assign_source_roles() via Gemini
    │      (assigns PRIMARY, SUPPORTING, CONTEXT roles)
    │    - Build story dict with original_sources[], certainty_score
    ▼
story_id = SHA-1(title[:120].lower())   ← deterministic; same story → same ID
    ▼
Cached in Upstash Redis (TTL: 120 seconds)
    ▼
On /api/news/detail request:
    ├─ story_content_service.get_story_content(story_id) → check Supabase
    │   HIT  → return cached narrative + translations + audio immediately
    │   MISS →
    │         article_scraper_service.get_text_for_narrative(prefer_scrape=True)
    │             cascade: trafilatura → newspaper4k → readability-lxml → goose3 → BS4 → RSS summary
    │         narrative_service.synthesize_composite_story(sources) OR generate_narrative(text)
    │             Gemini → {short_summary, narrative (600-1200w), key_takeaways[]}
    │         story_content_service.save_story_content() → persist English to Supabase
    │         BackgroundTask: schedule_prefill_translations_and_audio()
    └─ Return story to client
```

**Article scraper cascade** (`article_scraper_service.py`):

Each extractor runs in a thread-pool executor (CPU-bound HTML parsing). The first one returning `≥ MIN_CONTENT_CHARS (150)` characters wins. Falls through on exception or short output:

1. `trafilatura` — purpose-built news extractor, boilerplate removal, favour-recall mode
2. `newspaper4k` — NLP-aware, handles author/date extraction as side-effects
3. `readability-lxml` — Mozilla Readability port, reliable when others get blocked
4. `goose3` — handles JS-rendered pages better than pure HTML parsers
5. `BeautifulSoup4` — last resort, strips all tags, returns raw visible text
6. RSS summary — always available, ensures callers receive something

**Multi-source composite story** (`narrative_service.synthesize_composite_story`):

When a cluster has ≥2 sources, Gemini synthesises a combined narrative that:
- Uses the PRIMARY source as the authoritative account
- Weaves SUPPORTING sources' facts and quotes in
- Uses CONTEXT sources for background
- Output format identical to single-source: `{short_summary, narrative, key_takeaways}`

`SOURCE_CONTENT_MAX = 6000` chars per source before passing to Gemini.

### 4.3 AI & LLM Layer

**`services/llm_gemini.py`** — all Gemini calls go through two public async functions:

```python
await generate_gemini(system_instruction: str, user_content: str) -> Optional[str]
await embed_text(text: str) -> Optional[List[float]]   # 768-dim vector
```

**SDK**: `google.genai` (package `google-genai`). The older `google.generativeai` package is **deprecated** and was removed. The new API pattern:

```python
client = genai.Client(api_key=GEMINI_API_KEY)
config = types.GenerateContentConfig(system_instruction=..., temperature=0.7)
response = client.models.generate_content(model=MODEL_NAME, contents=..., config=config)
```

**Models in use:**
| Constant | Value | Purpose |
|---|---|---|
| `MODEL_NAME` | `gemini-1.5-flash` | Narrative, translation, roles, recommendations |
| `MODEL_LITE` | `gemini-1.5-flash-8b` | In-function fallback if flash returns empty |
| `EMBED_MODEL` | `gemini-embedding-001` | 768-dim embeddings (text-embedding-004 deprecated 2026-01-14) |

`generate_gemini` returns `None` on any exception — all callers have fallback logic.

**Gemini usage across services:**
- `narrative_service` — story synthesis (2+ calls per story: roles + narrative)
- `translation_service` — one call per language per story (4 languages × N stories in batch)
- `recommendation_service` — topic expansion and semantic query generation
- `briefing_service` — script curation and structuring
- `news_service` — `assign_source_roles` for multi-source clusters

### 4.4 TTS Pipeline

**Primary: YarnGPT** (`yarngpt_service.py`)

Long narratives are split at sentence boundaries before each API call:

```
Text → _split_into_chunks(text, YARNGPT_CHUNK_MAX=1900)
     → [chunk1, chunk2, ..., chunkN]
     → generate_yarngpt_audio(chunk, voice) for each   ← sequential (rate-limit safe)
     → _concat_mp3_bytes(parts)                        ← naive MP3 concatenation
```

**Chunk failure behaviour (resilient fallback):**
If YarnGPT fails a chunk, that specific chunk is retried with OpenAI TTS using the language-matched fallback voice. If both fail, the chunk is skipped (not the whole story). Only returns `None` when zero chunks succeeded across all providers.

```
YarnGPT chunk fails
    └─ OpenAI TTS for that chunk (OPENAI_CHUNK_MAX=4000 chars)
        └─ both fail → skip chunk, continue
                        └─ if 0 chunks → return None
```

**Voice mapping:**
| Language | YarnGPT Voice | OpenAI Fallback |
|---|---|---|
| English (`en`) | `emma` | `onyx` |
| Yoruba (`yo`) | `idera` | `nova` |
| Hausa (`ha`) | `zainab` | `shimmer` |
| Igbo (`ig`) | `osagie` | `alloy` |
| Nigerian Pidgin (`pcm`) | `wura` | `echo` |

**Fallback TTS: OpenAI** (`tts_service.py`)

Standalone OpenAI TTS used directly by `briefing_service`. Model: `tts-1`. Truncates to 4000 chars for single-chunk requests.

### 4.5 Translation Pipeline

`translation_service.py` uses Gemini with language-specific system prompts. Before storing, a **stage-direction sanitizer** strips any AI-generated performance cues that leak into translated text:

```python
_STAGE_DIRECTION_PATTERNS = [
    re.compile(r'\[.*?\]'),                                    # [pause], [music]
    re.compile(r'\(.*?(music|sound|pause|...).*?\)', IGNORECASE),
    re.compile(r'(?i)^\s*(?:sound of|sfx:?).*$', MULTILINE),
    ...
]
```

`SUPPORTED_LANGUAGES` dict maps codes to native names, voice IDs, and descriptions. Language codes: `en`, `pcm`, `yo`, `ha`, `ig`.

**Pre-generation batch** (`story_content_service.schedule_prefill_translations_and_audio`):

Triggered as a FastAPI `BackgroundTask` after story is first fetched. For each story:

```
For lang in PRELOAD_LANGUAGES = ["en", "yo", "ha", "ig", "pcm"]:
    1. translate narrative → translations[lang]
    2. generate TTS for translated text → audio_by_lang[lang]
    3. upsert to Supabase story_content row

Concurrency: asyncio.Semaphore(BATCH_STORY_CONCURRENCY=4)
```

### 4.6 Caching & Scheduling

**Upstash Redis** — `NEWS_CACHE_TTL = 120` seconds. Keys:
- `narvo:news:all` — full RSS feed list
- `narvo:aggregator:*` — Mediastack/NewsData.io responses
- `narvo:briefing:*` — today's briefing

**QStash cron schedule** (configured in Upstash dashboard):
- Every 5 min → `POST /api/sources/health/refresh`
- Every 10 min → `POST /api/aggregators/refresh`
- Every 15 min → `POST /api/news/refresh`
- Daily at 05:00 WAT → `POST /api/briefing/generate`

**QStash verification** (`lib/qstash_verify.py`):
All cron endpoints use `Depends(verify_qstash)`. Algorithm:
1. Build signing string: `"<METHOD>\n<path>\n<base64url(SHA256(body))>"`
2. HMAC-SHA256 with `QSTASH_SIGNING_KEY` (base64url-decoded)
3. Compare to `Upstash-Signature` header (constant-time)
4. Retry with `QSTASH_NEXT_SIGNING_KEY` during key rotation window
5. Dev fallback: accept `QSTASH_CRON_SECRET` as Bearer or `X-Cron-Secret` header

### 4.7 Recommendations Engine

`recommendation_service.py` combines three signals:

1. **Collaborative filtering** — `build_user_profile()` analyses last 100 listening history rows, weights recent items more heavily (age-decay), extracts category preferences and source patterns
2. **Gemini topic expansion** — profile fed to Gemini which generates related topic queries
3. **Upstash Vector semantic boost** — articles embedded with `gemini-embedding-001`, upserted in batches of `VECTOR_UPSERT_BATCH_LIMIT=100`. Articles in the vector-similar set get `SEMANTIC_BOOST=25.0` added to their recommendation score

### 4.8 Morning Briefing

`briefing_service.py` generates a broadcast-style daily digest:

1. Pull top N stories from cached feed
2. Gemini selects + orders stories for broadcast curation
3. Generate full broadcast script (intro, N story blocks, outro)
4. `_strip_story_numbering()` cleans "Story 1:" prefixes so transcript reads naturally
5. `_compute_story_segments()` calculates char offsets per story block → enables seek-to-story
6. OpenAI TTS (`tts-1`) generates single long-form audio for the full script
7. Stored in Supabase, retrieved via `GET /api/briefing/today`

The B2C briefing route is `frontend/app/briefing/page.tsx`. Cinematic broadcast cues (Tone.js, themes) may be served via `sound_themes_service.py` when integrated end-to-end.

### 4.9 Authentication & Security

- **Supabase Auth** — JWT-based. Frontend sends `Authorization: Bearer <supabase_jwt>` on all authenticated requests
- **python-jose** — JWT decode/verify in backend middleware
- **passlib + bcrypt** — password hashing for any legacy password fields
- **CORS** — `ALLOWED_ORIGINS` env var; defaults restrict to known Narvo domains
- **RLS** — Supabase Row Level Security on all user tables (bookmarks, listening history, preferences)

### 4.10 Push Notifications

`push_sender.py` uses `pywebpush` to send VAPID-signed Web Push notifications:
- Subscription endpoints stored per user in Supabase
- Triggered for: briefing ready (05:00), breaking news alerts
- VAPID keys: `VAPID_PRIVATE_KEY`, `VAPID_PUBLIC_KEY`, `VAPID_CLAIMS_EMAIL` in env

---

## 5. Frontend Architecture

### 5.1 App shell, layout & routing

**Root layout** (`app/layout.tsx`): loads **next/font** variables on `<html>`, wraps the tree in `ThemeProvider`, `NarvoClientBootstrap`, `AudioPlayerProvider`, `OfflineDownloadProvider`, renders `{children}` and a global `AudioPlayer`.

**Route segments** live under `app/*/page.tsx` (e.g. `dashboard`, `briefing`, `news/[id]`, `settings`). Metadata and segment layouts follow Next.js conventions.

**Authenticated shell** — `components/app/AuthenticatedAppShell.tsx` composes `DesktopRail`, `MobileNavDock`, `AppUniversalHeader`, and main content. **Canonical nav** is `components/app/nav-items.ts`.

**Middleware** (`middleware.ts`): for matched paths (dashboard, briefing, settings, library, discover, search, listen, insights, onboarding), redirects to `/auth?next=…` when the **`narvo_demo_session`** cookie is not set to `1`. Public marketing/auth routes are unaffected.

**Config** (`next.config.ts`): `distDir: 'build'` (Vercel output parity), redirects for legacy paths (`/profile` → settings tab, `/bookmarks` → `/library`, host redirect `narvo.live` → `narvo.news`, etc.).

### 5.2 API clients & auth

**Public FastAPI** — `lib/narvo-api.ts`: `getNarvoApiBase()` resolves, in order, `NEXT_PUBLIC_NARVO_API_URL`, `NEXT_PUBLIC_BACKEND_URL`, legacy `VITE_BACKEND_URL`, else `http://127.0.0.1:8000`. Uses `fetch` for JSON endpoints (news list/detail, briefing, etc.).

**Authenticated `/api/me/*`** — `lib/me-api.ts`: attaches bearer token from the session layer when present.

**Supabase (browser)** — `lib/supabase-browser.ts` when `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` are set.

**Session / demo cookie** — `lib/narvo-session.ts`, `lib/narvo-auth-actions.ts`; must stay consistent with `middleware.ts`.

### 5.3 Audio

**State** — `components/AudioPlayerContext.tsx`: `currentTrack`, `playTrack`, `togglePlayPause`, skip controls, briefing handoff hook after playback ends.

**UI** — `components/AudioPlayer.tsx`: docked player bound to that context (HTML `<audio>` element managed in the provider).

Story playback helpers (e.g. resolving URLs) may live in `lib/story-playback.ts` and page-level code that calls the API.

### 5.4 Offline storage (IndexedDB)

**`lib/offlineStorage.ts`** — database **`NarvoOfflineDB`**, version **`1`**, object store **`stories`** (`keyPath: id`). Stores offline story metadata and optional `audioBlob` for library/offline flows. API: `initDB`, save/list/delete helpers (see file for exact exports).

*Historical note:* an older **`narvo_audio_cache`** IndexedDB design existed in a prior Vite app; the current B2C codebase uses the schema above.

### 5.5 Service worker & PWA

**`public/sw.js`** and **`public/narvo-sw.js`** — minimal workers: `install`/`activate` (`skipWaiting`, `clients.claim`), **web push** handler (`push`), **notificationclick** to focus or open a window (default `/dashboard`). They are **not** the large cache-first asset router from the legacy stack; offline HTML caching strategy may evolve separately.

**`public/manifest.json`** — PWA manifest for install / standalone display.

### 5.6 Navigation (desktop & mobile)

- **`components/app/DesktopRail.tsx`** — fixed rail (lg+).
- **`components/app/MobileNavDock.tsx`** — floating mobile dock; uses **`motion`** where animated; place **refs** on stable wrappers, not on `motion` nodes inside conditional trees (same React constraint as legacy Framer docs).
- Spacing for scroll areas should clear the dock + audio bar (see layout classes in pages and `lib/narvo-ui-classes.ts`).

### 5.7 Copy & language

**User-visible strings** — centralised in **`lib/narvo-app-copy.ts`** (`COPY`). Prefer importing from there rather than inline literals.

**Broadcast / UI language** — English-first in-repo; settings and backend preferences may store language for TTS (see `app/settings/page.tsx` and user preference APIs).

### 5.8 Theme

**`components/ThemeProvider.tsx`** — `light` | `dark`, persisted as `narvo-theme` in `localStorage`, toggles `class="dark"` on `document.documentElement` to pair with **`app/globals.css`** semantic variables.

### 5.9 Client utilities

**`lib/utils.ts`** — `cn()` (clsx + tailwind-merge) and shared helpers.

**`lib/offlineStorage.ts`**, **`lib/narvo-session.ts`**, **`lib/narvo-notifications.ts`**, **`lib/narvo-analytics.ts`** — feature-specific browser-side logic; see each file for entry points.

**`components/NarvoClientBootstrap.tsx`** — client-only boot (analytics, feature flags, etc., as wired).

---

## 6. Data Model

### Supabase Tables (key tables)

**`story_content`** — pre-generated content for each story
```sql
story_id        TEXT PRIMARY KEY          -- SHA-1 of normalised title
title           TEXT
short_summary   TEXT                      -- 2-4 sentence lead, EN only
narrative       TEXT                      -- full 600-1200w broadcast narrative, EN
key_takeaways   JSONB                     -- string[]
translations    JSONB  DEFAULT '{}'       -- { "yo": { short_summary, narrative, key_takeaways }, ... }
audio_by_lang   JSONB  DEFAULT '{}'       -- { "en": "data:audio/mpeg;base64,...", "yo": ..., ... }
created_at      TIMESTAMPTZ DEFAULT now()
updated_at      TIMESTAMPTZ
```

**`listening_history`**
```sql
id          UUID PRIMARY KEY DEFAULT gen_random_uuid()
user_id     UUID REFERENCES auth.users
story_id    TEXT
title       TEXT
source      TEXT
category    TEXT
played_at   TIMESTAMPTZ DEFAULT now()
```

**`bookmarks`**
```sql
id          UUID PRIMARY KEY
user_id     UUID REFERENCES auth.users
story_id    TEXT
title       TEXT
summary     TEXT
source      TEXT
category    TEXT
created_at  TIMESTAMPTZ DEFAULT now()
```

**`user_preferences`**
```sql
user_id             UUID PRIMARY KEY REFERENCES auth.users
broadcast_language  TEXT DEFAULT 'en'
voice_model         TEXT DEFAULT 'emma'
playback_rate       FLOAT DEFAULT 1.0
theme               TEXT DEFAULT 'light'
auto_play           BOOLEAN DEFAULT true
```

**`push_subscriptions`**
```sql
user_id     UUID REFERENCES auth.users
endpoint    TEXT
p256dh      TEXT    -- encryption key
auth        TEXT    -- auth secret
created_at  TIMESTAMPTZ DEFAULT now()
```

---

## 7. Key Constants & Tunables

| Constant | Location | Value | Purpose |
|---|---|---|---|
| `YARNGPT_CHUNK_MAX` | yarngpt_service.py | `1900` | Max chars per YarnGPT request (API limit 2000) |
| `OPENAI_CHUNK_MAX` | yarngpt_service.py | `4000` | Max chars per OpenAI TTS request |
| `MIN_CONTENT_CHARS` | article_scraper_service.py | `150` | Min chars to accept from a scraper |
| `SOURCE_CONTENT_MAX` | narrative_service.py | `6000` | Max chars per source fed to Gemini for composite story |
| `BATCH_STORY_CONCURRENCY` | story_content_service.py | `4` | Semaphore for parallel pre-generation |
| `TTS_TEXT_MAX` | story_content_service.py | `2000` | Defined but no longer used for hard truncation |
| `NEWS_CACHE_TTL` | news_service.py | `120` | Redis TTL for feed cache (seconds) |
| `PRELOAD_LANGUAGES` | story_content_service.py | `["en","yo","ha","ig","pcm"]` | Languages pre-generated for every story |
| `VECTOR_UPSERT_BATCH_LIMIT` | recommendation_service.py | `100` | Max vector upserts per recommendation cycle |
| `SEMANTIC_BOOST` | recommendation_service.py | `25.0` | Score bonus for vector-similar stories |
| `DB_VERSION` | `lib/offlineStorage.ts` | `1` | IndexedDB `NarvoOfflineDB` schema version |
| SW | `public/sw.js` | — | Push + notification click (not a large asset cache in current code) |
| `API_VERSION` | server.py | `"2.0"` | Reported in `/ping` and `/api/ping` |
| `MODEL_NAME` | llm_gemini.py | `gemini-1.5-flash` | Primary Gemini model (available to all API key tiers) |
| `MODEL_LITE` | llm_gemini.py | `gemini-1.5-flash-8b` | In-function fallback if primary returns empty |
| `EMBED_MODEL` | llm_gemini.py | `gemini-embedding-001` | Embedding model (768-dim; text-embedding-004 deprecated 2026-01-14) |
| `EMBED_DIMENSION` | llm_gemini.py | `768` | Must match Upstash Vector index dimension |

---

## 8. Infrastructure & Deployment

### Backend (Google Cloud Run)

- Containerised via `Dockerfile` in repo root
- `entrypoint.sh` runs `uvicorn server:app --host 0.0.0.0 --port $PORT`
- `cloudbuild.yaml` — on push to `main`: build Docker image → push to Artifact Registry → deploy to Cloud Run
- Cloud Run auto-scales to zero; keep-alive via QStash `/ping` calls or Cloud Scheduler

### Frontend (Vercel)

- Auto-deployed on push to `main`
- Preview deployments on PRs
- Set **`NEXT_PUBLIC_NARVO_API_URL`** (or `NEXT_PUBLIC_BACKEND_URL`) to `https://api.narvo.news` in Vercel project env for production API calls from the browser

### Local Development

```bash
# Backend
cd backend
pip install -r requirements.txt
cp .env.example .env      # fill in keys
uvicorn server:app --host 0.0.0.0 --port 8000

# Frontend (Next.js)
cd frontend
cp .env.example .env.local   # if present; otherwise create .env.local
# NEXT_PUBLIC_NARVO_API_URL=http://127.0.0.1:8000   # default in code matches this
npm install
npm run dev    # http://localhost:3000
```

**Local tip:** Point **`NEXT_PUBLIC_NARVO_API_URL`** at your local FastAPI origin so the browser calls the same host you run for `uvicorn`. Avoid committing `.env.local`.

---

## 9. Environment Variables

### Backend (`.env`)

| Variable | Required | Description |
|---|---|---|
| `GEMINI_API_KEY` | Yes | Google AI Studio API key |
| `SUPABASE_URL` | Yes | Supabase project URL |
| `SUPABASE_SERVICE_KEY` | Yes | Service role key (bypasses RLS) |
| `UPSTASH_REDIS_REST_URL` | Yes | Upstash Redis REST endpoint |
| `UPSTASH_REDIS_REST_TOKEN` | Yes | Upstash Redis auth token |
| `UPSTASH_VECTOR_REST_URL` | No | For semantic recommendations |
| `UPSTASH_VECTOR_REST_TOKEN` | No | |
| `YARNGPT_API_KEY` | Yes | YarnGPT API key |
| `OPENAI_API_KEY` | No | OpenAI TTS fallback (429 when quota exhausted) |
| `QSTASH_SIGNING_KEY` | Yes (prod) | QStash HMAC signing key |
| `QSTASH_NEXT_SIGNING_KEY` | No | QStash key rotation backup |
| `QSTASH_CRON_SECRET` | No | Legacy dev fallback for cron auth |
| `VAPID_PRIVATE_KEY` | No | Web push VAPID private key |
| `VAPID_PUBLIC_KEY` | No | Web push VAPID public key |
| `VAPID_CLAIMS_EMAIL` | No | VAPID admin email |
| `MEDIASTACK_API_KEY` | No | Mediastack aggregator |
| `NEWSDATA_API_KEY` | No | NewsData.io aggregator |
| `GOOGLE_FACT_CHECK_API_KEY` | No | Fact Check Tools API |
| `SENTRY_DSN` | No | Backend Sentry |
| `ALLOWED_ORIGINS` | No | Comma-separated CORS origins |

### Frontend (`.env.local`)

| Variable | Required | Description |
|---|---|---|
| `NEXT_PUBLIC_NARVO_API_URL` | No | FastAPI origin (no trailing slash). Defaults to `http://127.0.0.1:8000` in code if unset. |
| `NEXT_PUBLIC_BACKEND_URL` | No | Legacy alias read by `getNarvoApiBase()` after `NEXT_PUBLIC_NARVO_API_URL`. |
| `VITE_BACKEND_URL` | No | Legacy Vite-era alias still read by `getNarvoApiBase()` if Next vars unset. |
| `NEXT_PUBLIC_SUPABASE_URL` | For full auth | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | For full auth | Supabase anon key (safe to expose) |
| `NEXT_PUBLIC_APP_URL` | No | Canonical site URL (`lib/site-url.ts`) |
| `NEXT_PUBLIC_GEMINI_API_KEY` | Optional | Used where client-side Gemini is wired (see `app/page.tsx`) |
| `NEXT_PUBLIC_NARVO_ANALYTICS_ENABLED` | No | Enables analytics logging path when `true` |

---

## 10. Known Issues & Decisions Log

### 2026-04-06 — Technical reference: B2C frontend matches Next.js 15

**Update:** §2 `frontend/` tree, §3 frontend stack table, §5 (all subsections), §7 constants rows for IndexedDB/SW, §8 local dev + Vercel frontend bullets, and §9 frontend env table were rewritten for the **Next.js 15 App Router** app under `frontend/app/`. Entries below dated **2026-03-12** and earlier may still describe **Vite**, **`frontend/src/`**, **`audioCache.ts`**, or **i18next**; those reflect the pre-migration stack unless a newer entry explicitly updates them.

### 2026-03-12 — Runtime Hardening & Tooling Additions

**Highlights:** standardized error envelopes include `request_id`/`user_id`, server logs emit JSON, API client adds GET dedupe + timing logs, Service Worker retries digest/queue sync, versioned `storage.ts` and `validators.ts` added for safer client persistence and response parsing, Playwright smoke tests and dependency audit script added.

### 2026-03-12 — text-embedding-004 Deprecated → gemini-embedding-001

**Problem:** Google deprecated `text-embedding-004` on 2026-01-14. Calls to that model fail.
**Fix:** Switched to `gemini-embedding-001`, which supports 768-dimensional output (matches Upstash Vector index) via Matryoshka Representation Learning. Removed `api_version="v1"` override from embed calls; `gemini-embedding-001` is available on the SDK default path.

### 2026-03-12 — Gemini Model Availability: gemini-2.0-flash / gemini-1.5-flash 404 → gemini-2.5-flash

**Problem 1 — `gemini-2.0-flash` 404 NOT_FOUND:** (earlier) Google restricted these to legacy API keys.
**Problem 2 — `gemini-1.5-flash` 404 for API version v1beta:** As of March 2026, `gemini-1.5-flash` and `gemini-1.5-flash-8b` are not found for v1beta generateContent.
**Fix:** Use `gemini-2.5-flash` (primary) and `gemini-2.5-flash-lite` (lite). Model codes and availability are documented at ai.google.dev/gemini-api/docs/models.

**Problem 2 — `text-embedding-004` 404 for `v1beta/embedContent` (superseded):**
`text-embedding-004` was only exposed via `api_version="v1"`. It was deprecated 2026-01-14; we now use `gemini-embedding-001` (see above).

### 2026-03-12 — Upstash Vector dimension mismatch (768 vs 1536)

**Symptom:** Logs show `Invalid vector dimension: 768, expected: 1536` on upsert or query.
**Cause:** The app and `gemini-embedding-001` use **768** dimensions. The error means the Upstash Vector index was created with dimension **1536** (e.g. from an older or different embedding setup).
**Fix:** Recreate the Upstash Vector index with **dimension 768** so it matches `VECTOR_DIMENSION` in `lib/vector_client.py` and `EMBED_DIMENSION` in `llm_gemini.py`. Do not change the app to 1536 unless you switch to an embedding model that outputs 1536 and re-index.

### 2026-03-12 — Gemini SDK Migration
**Problem:** `google.generativeai` package is end-of-life. `models/gemini-2.0-flash` returns 404 for new API users through the old SDK.
**Fix:** Migrated `llm_gemini.py` to `google.genai` (package: `google-genai==1.63.0`). Embedding model is now `gemini-embedding-001` (768-dim); previously `text-embedding-004` (deprecated 2026-01-14).
**Impact:** All Gemini calls now work. Every feature that depends on Gemini (narrative, translation, recommendations, briefing, source-role assignment) was broken before this fix.

### 2026-03-12 — TTS Chunk Abort → Resilient Per-Chunk Fallback
**Problem:** When YarnGPT failed any single chunk, `_generate_yarngpt_long` returned `None` immediately. This triggered OpenAI TTS for the whole story, which was also failing with `429 insufficient_quota`. Result: no audio for any story.
**Fix:** Per-chunk fallback — YarnGPT failure triggers OpenAI for that chunk only. If both fail, chunk is skipped rather than aborting the whole story. Partial audio is returned.

### 2026-03-12 — MobileNav `ref` on `motion.div` Inside `AnimatePresence`
**Problem:** `ref={sheetRef}` on `motion.div` inside `AnimatePresence` caused React's `ref is not a prop` warning. Framer Motion wraps children in `PopChild` which doesn't forward refs.
**Fix:** `ref` moved to stable outer `<div className="md:hidden">` that wraps both `AnimatePresence` and `<nav>`. Outside-click detection is unaffected since `contains()` works on the parent element.

### 2026-03-11 — SW Cross-Origin Guard Bug (CORS Errors)
**Problem:** Service Worker had a faulty guard: `if (url.origin !== self.location.origin && !url.pathname.startsWith('/api')) return;` — cross-origin `/api/*` requests were NOT skipped, fell through to SW caching. When `VITE_BACKEND_URL` pointed at `api.narvo.news`, every API request was intercepted by the SW before the browser could apply CORS.
**Fix:** `if (url.origin !== self.location.origin) return;` — all cross-origin requests are now skipped unconditionally. Cache bumped to `narvo-v5`.

### Design Decision — `ref` Never Inside `AnimatePresence`
Any element that needs a DOM ref for outside-click, focus management, or measurement should be placed **outside** or **above** the `AnimatePresence` subtree. The `motion.div` itself should not receive `ref` props when it is an `AnimatePresence` direct child.

### Design Decision — Scraper Cascade Returns RSS Summary as Fallback
Callers of `get_text_for_narrative()` always receive a string (never `None`). The RSS `summary` field is the guaranteed last resort. This avoids null-checks across every narrative generation call site.

### Design Decision — `TTS_TEXT_MAX` is Defined But Not Used for Truncation
Early versions truncated narratives to 2000 chars before TTS. Now YarnGPT chunking handles any length. `TTS_TEXT_MAX` is kept for reference but is not applied as a hard cut in the current pipeline.

### Design Decision — Vite Proxy for Dev, No Hard `VITE_BACKEND_URL` Required
Setting `VITE_BACKEND_URL=http://localhost:8000` in `.env` was the source of confusion — if committed or left as default, it could point at prod from localhost. The current setup: `vite.config.js` proxies `/api/*` to `http://localhost:8000` by default, so no env var is needed for local dev. Vercel sets `VITE_BACKEND_URL` in its project settings.

### 2026-03-12 — Infrastructure Audit: 24-Point Improvement Batch

A comprehensive code audit identified 24 improvements that preserve existing logic, functionality, and design. All were implemented in a single batch commit:

**Backend:**
1. **Typed Pydantic request models** — `ListeningHistoryRequest`, `PushSubscriptionRequest`, `PushUnsubscribeRequest` replace raw `dict = Body(...)` for automatic validation and Swagger docs.
2. **Shared `httpx.AsyncClient`** (`lib/http_client.py`) — module-level connection pool reused across `factcheck_service`, `radio_service`, and other services. Eliminates per-request TCP/TLS handshake overhead. Shutdown handler registered via `app.on_event("shutdown")`.
3. **Startup env validation** (`lib/env_check.py`) — `SUPABASE_URL` and `SUPABASE_SERVICE_KEY` are validated at boot; missing recommended vars (`GEMINI_API_KEY`, `YARNGPT_API_KEY`, etc.) emit warnings.
4. **Content-Security-Policy header** — `SecurityHeadersMiddleware` now emits CSP restricting `script-src`, `connect-src`, `frame-ancestors`, and `media-src` to trusted origins.
5. **Referrer-Policy header** — `strict-origin-when-cross-origin` added alongside CSP.
6. **`X-Request-ID` middleware** was already present (commit earlier); verified functional.

**Frontend:**
7. **IndexedDB audio cache eviction** (`audioCache.ts`) — `evictStaleEntries()` runs after each `downloadAndCacheAudio()` write. Policy: TTL (7 days), max items (100), max size (200 MB). Oldest entries evicted first.
8. **VAPID key consolidation** (`notificationService.ts`) — now reads `VITE_VAPID_PUBLIC_KEY` env var first, falls back to hardcoded key with a dev-mode warning. Eliminates duplication between `notificationService.ts` and `api.ts`.
9. **Service Worker fixes** (`sw.js`): (a) Stale-while-revalidate for `/api/news` now calls `event.waitUntil(fetchPromise)` so background revalidation isn't garbage-collected. (b) `trimCache()` evicts oldest entries when cache exceeds 150 items.
10. **Empty `catch {}` blocks replaced** — 20+ silent catch blocks across `AudioContext`, `AuthContext`, `ThemeContext`, hooks, etc. now bind the error parameter (`catch (err)`) for debuggability. Critical paths log to `console.debug`.
11. **Vite vendor chunk splitting** (`vite.config.js`) — `manualChunks` splits `react`, `framer-motion`, `i18next`, and `swr` into separate cacheable bundles.
12. **`rel="noopener noreferrer"`** added to all `target="_blank"` links in `DashboardSidebar`, `SourceTimeline`, `ToolsPage`, and `NewsDetailPage`.

**Docs & Tools page:**
13. `/tools` page updated with new infrastructure entries: shared httpx pool, IndexedDB eviction, SW cache limiter, CSP, env validation.
14. This technical reference updated with audit log.

### 2026-03-12 — Complete IMPROVEMENTS_AUDIT Implementation (24/24)

All remaining audit items implemented in a single commit:

**#1 server.py decomposition:** 2,194→266 lines. 60 inline routes extracted into 8 new modules:
`routes/tts.py`, `routes/settings.py`, `routes/notifications.py`, `routes/content.py`,
`routes/aggregators.py`, `routes/search.py`, `routes/health.py`, `routes/share.py`.
server.py now contains only: app creation, middleware stack, CORS, router registration, ping/docs/root, startup/shutdown.

**#2 Model consolidation:** Route-specific Pydantic models moved to their respective route modules. `models/__init__.py` retains shared models.

**#4 Shared httpx (complete):** `yarngpt_service.py` updated to use `lib/http_client.py` with per-request timeout=45s. All external HTTP services now use the shared connection pool.

**#5 Structured JSON logging:** `_JsonFormatter` in server.py emits JSON log lines with timestamp, level, logger, message, request_id, latency_ms. Applied to all loggers at startup.

**#6 Standardized error responses:** `@app.exception_handler(HTTPException)` returns consistent envelope: `{error, code, detail, status}`. Rate limiter also uses this format.

**#9 useEffect cleanup:** `fetchLanguagePreference` effect in AudioContext now uses `isMounted` guard to prevent state updates after unmount.

**#13 Frontend tests:** 3 new test files — `AudioContext.test.tsx` (queue mgmt, state), `TruthTag.test.tsx` (status rendering), `notificationService.test.ts` (API availability checks).

**#14 Backend tests:** `test_critical_services.py` — tests for `_compute_story_segments`, `_strip_story_numbering`, `_authority_prefix`, `extract_category`, `assign_source_roles` fallback, `send_briefing_ready_push`, rate limiter path detection.

**#15 HTTP caching headers:** `Cache-Control: private, max-age=300` on `/api/briefing/latest`, `Cache-Control: public, max-age=3600` on `/api/factcheck/story/{id}`.

**#16 OpenGraph meta:** `react-helmet-async` Helmet tags added to MorningBriefingPage, DiscoverPage, VoiceStudioPage, SearchPage.

**#20 React.memo:** `StoryCard.tsx` — memoized reusable component for recommendation grid cards.

**#21 Web Vitals:** `web-vitals` package installed; CLS, FID, LCP, FCP, TTFB reported to console (dev) and Sentry metrics (prod) from `index.jsx`.

**#22 DB query timeouts:** `lib/supabase_db.py` attempts to set httpx timeout on the Supabase REST client. `SUPABASE_TIMEOUT` env var (default 10s).
