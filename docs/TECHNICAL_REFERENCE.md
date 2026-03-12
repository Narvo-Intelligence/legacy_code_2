# Narvo News — Technical Reference

> **Maintained document.** Update this file whenever a major technical or logical change is made to the codebase.
> Last updated: 2026-03-12 — covers commits up to `e11bd5b` on `features_fixes`.

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
   - [App Shell & Routing](#51-app-shell--routing)
   - [API Client](#52-api-client)
   - [Audio System](#53-audio-system)
   - [Audio Cache (IndexedDB)](#54-audio-cache-indexeddb)
   - [Audio Prefetch](#55-audio-prefetch)
   - [Service Worker & PWA](#56-service-worker--pwa)
   - [Mobile Navigation](#57-mobile-navigation)
   - [Internationalisation](#58-internationalisation)
   - [Theme System](#59-theme-system)
6. [Data Model](#6-data-model)
7. [Key Constants & Tunables](#7-key-constants--tunables)
8. [Infrastructure & Deployment](#8-infrastructure--deployment)
9. [Environment Variables](#9-environment-variables)
10. [Known Issues & Decisions Log](#10-known-issues--decisions-log)

---

## 1. Project Overview

Narvo is an African broadcast-grade news platform that ingests RSS feeds and aggregator APIs, clusters related articles, synthesises AI-written long-form narratives via Gemini, pre-generates text-to-speech audio in five Nigerian languages, and serves a React PWA with offline playback, queue management, and a Morning Briefing feature.

**Core differentiators:**
- Authentic Nigerian-accented TTS via YarnGPT (Yoruba, Hausa, Igbo, Nigerian Pidgin, English)
- Multi-source composite story synthesis — not just one article, but a cross-source narrative
- Full pre-generation pipeline: translate → TTS all 5 languages before user opens a story
- PWA with IndexedDB blob cache for true offline audio playback

---

## 2. Repository Structure

```
narvo_news/
├── backend/
│   ├── server.py                  # FastAPI app entry point, all inline routes
│   ├── Dockerfile
│   ├── entrypoint.sh
│   ├── requirements.txt
│   ├── pyrightconfig.json
│   ├── pytest.ini
│   ├── supabase_schema.sql
│   ├── supabase_migrations/
│   ├── lib/
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
├── frontend/
│   ├── public/
│   │   └── sw.js                  # Service Worker (Cache v: narvo-v5)
│   ├── src/
│   │   ├── App.jsx                # Root — providers, router, lazy routes
│   │   ├── lib/
│   │   │   ├── api.ts             # Central fetch client (retry, auth, proxy)
│   │   │   ├── audioCache.ts      # IndexedDB blob store (DB v3)
│   │   │   ├── supabase.ts        # Supabase browser client
│   │   │   └── logger.ts          # Console wrapper
│   │   ├── contexts/
│   │   │   ├── AudioContext.tsx   # Global audio state, queue, playback
│   │   │   ├── AuthContext.tsx    # Supabase session, user
│   │   │   ├── ThemeContext.tsx   # Theme switching
│   │   │   ├── ContentSourcesContext.tsx
│   │   │   ├── DownloadQueueContext.tsx
│   │   │   └── LenisProvider.tsx  # No-op stub (Lenis not active)
│   │   ├── hooks/
│   │   │   ├── useAudioPrefetch.ts  # Viewport-intersection TTS prefetch
│   │   │   ├── useBookmarks.ts      # SWR bookmark CRUD
│   │   │   ├── useNewsRefresh.ts    # Manual feed refresh trigger
│   │   │   ├── useBackendPing.ts    # Keep-alive ping
│   │   │   ├── usePullToRefresh.ts  # Mobile pull gesture
│   │   │   ├── usePwaApis.ts        # PWA install prompt
│   │   │   └── useSettings.ts       # User settings SWR
│   │   ├── components/
│   │   │   ├── MobileNav.tsx        # Full-width 5-tab bottom bar + More sheet
│   │   │   ├── AudioPlayerBar.tsx   # Persistent bottom audio dock
│   │   │   ├── DashboardLayout.tsx  # Shell layout wrapper
│   │   │   └── ...
│   │   ├── pages/                   # One file per route
│   │   ├── types/                   # Shared TypeScript interfaces
│   │   ├── constants/               # App-wide constants
│   │   └── i18n/                    # i18next config + locale JSON files
│   ├── vite.config.js               # Vite + /api proxy → localhost:8000
│   └── .env.example
├── docs/
│   └── TECHNICAL_REFERENCE.md      # ← this file
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
| HTTP client | httpx + aiohttp | Async feed/API fetching |
| Container | Docker → Google Cloud Run | Managed serverless |
| CI/CD | Google Cloud Build | `cloudbuild.yaml` |

### Frontend
| Layer | Technology | Notes |
|---|---|---|
| Framework | React 18 + TypeScript | Concurrent rendering |
| Build | Vite | HMR, `/api` proxy in dev |
| Styling | Tailwind CSS | Utility-first, no Shadcn/UI |
| Routing | React Router v6 | Lazy-loaded pages |
| Data fetching | SWR | Stale-while-revalidate |
| Animation | Framer Motion | Page transitions, player, sheet |
| Icons | Phosphor Icons | Tree-shaken per-icon imports |
| i18n | i18next | 5 languages |
| Audio | Web Audio API + HTMLAudioElement | |
| Offline | Service Worker + IndexedDB | narvo-v5 cache, DB v3 |
| PWA | Web App Manifest + Background Sync | |
| Push | Web Push API | VAPID from pywebpush |
| Monitoring | Sentry | Frontend + backend |
| Analytics | Vercel Analytics | Privacy-first |
| Hosting | Vercel | Edge CDN |

---

## 4. Backend Architecture

### 4.1 Server & Routing

`server.py` is the FastAPI application entry point. It:
- Configures CORS (`CORSMiddleware`) with allowed origins from `ALLOWED_ORIGINS` env var
- Registers `APIRouter` modules from `routes/`
- Defines inline routes for health (`/ping`, `/api/ping`), settings, preferences, cron endpoints
- Conditionally initialises Sentry when `SENTRY_DSN` is set
- Exposes a custom Swagger UI at `/docs` with Narvo dark theme

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
| `MODEL_NAME` | `gemini-2.0-flash` | Narrative, translation, roles, recommendations |
| `MODEL_LITE` | `gemini-2.0-flash-lite` | In-function fallback if flash returns empty |
| `EMBED_MODEL` | `text-embedding-004` | 768-dim embeddings for vector recommendations |

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
3. **Upstash Vector semantic boost** — articles embedded with `text-embedding-004`, upserted in batches of `VECTOR_UPSERT_BATCH_LIMIT=100`. Articles in the vector-similar set get `SEMANTIC_BOOST=25.0` added to their recommendation score

### 4.8 Morning Briefing

`briefing_service.py` generates a broadcast-style daily digest:

1. Pull top N stories from cached feed
2. Gemini selects + orders stories for broadcast curation
3. Generate full broadcast script (intro, N story blocks, outro)
4. `_strip_story_numbering()` cleans "Story 1:" prefixes so transcript reads naturally
5. `_compute_story_segments()` calculates char offsets per story block → enables seek-to-story
6. OpenAI TTS (`tts-1`) generates single long-form audio for the full script
7. Stored in Supabase, retrieved via `GET /api/briefing/today`

Frontend `MorningBriefingPage` uses Tone.js for cinematic broadcast cues (intro jingle, transitions) via `sound_themes_service.py`.

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

### 5.1 App Shell & Routing

`App.jsx` wraps the entire app in a provider stack (outermost first):
```
ThemeProvider
  └─ Sentry ErrorBoundary
       └─ HelmetProvider (react-helmet-async)
            └─ LenisProvider (no-op stub — Lenis not active)
                 └─ AuthProvider
                      └─ AudioProvider
                           └─ DownloadQueueProvider
                                └─ ContentSourcesProvider
                                     └─ BreakingNewsProvider
                                          └─ HapticAlertProvider
                                               └─ BrowserRouter
                                                    └─ Routes (lazy-loaded)
```

All page components are lazy-loaded via `React.lazy` + `<Suspense>`. Protected routes use `<ProtectedRoute>` which checks `AuthContext`.

The layout shell for authenticated routes is `DashboardLayout`:
```jsx
<div className="flex flex-col h-screen overflow-hidden">
  {/* page content fills remaining height */}
  <MobileNav />          {/* md:hidden — full-width 5-tab bottom bar */}
  <AudioPlayerBar />     {/* docked above MobileNav on mobile */}
</div>
```

### 5.2 API Client

`src/lib/api.ts` — all backend calls go through `api.get()` / `api.post()`:

- **Base URL**: `VITE_BACKEND_URL` env var. Unset in dev → Vite proxies `/api/*` to `localhost:8000`
- **Auth**: attaches `Authorization: Bearer <supabase_session_token>` when user is signed in
- **Timeout**: 10 000 ms
- **Retries**: exponential backoff — 3 attempts at 1s, 2s, 4s — only for 502/503/504 and network errors
- **Edge news URL**: `VITE_EDGE_NEWS_URL` optionally routes `GET /api/news` to a regional Supabase Edge Function for lower latency

**Dev warning system:** logs to console when `VITE_BACKEND_URL` points at `api.narvo.news` (causes CORS errors from localhost) or is unset.

**Vite proxy** (`vite.config.js`):
```js
proxy: { '/api': { target: 'http://localhost:8000', changeOrigin: true } }
```
Ensures relative `/api/*` requests work in dev without setting `VITE_BACKEND_URL`.

### 5.3 Audio System

`AudioContext.tsx` is the single source of truth for all audio state.

**Playback modes:**
- `'tts'` — story TTS audio (data URL or blob URL from IndexedDB)
- `'radio'` — live radio stream URL from Radio Browser API

**Track resolution order** when `playTrack(track)` is called:
```
1. Check IndexedDB (audioCache.getCachedAudio) → blob URL (instant, offline-capable)
2. Check AudioContext state for in-memory URL
3. Fetch from backend /api/news/detail → audio_by_lang[broadcastLanguage]
4. If still no audio → show error state
```

**Queue system:**
- `queue: AudioTrack[]` — ordered list
- `queueIndex: number` — current position
- `addToQueue()`, `playTrackAndQueue()` — manage queue
- Auto-advance to next track when current ends
- Queue panel shown in mobile fullscreen player

**Media Session API integration:**
- Sets `navigator.mediaSession.metadata` (title, artist/source, artwork)
- Registers `play`, `pause`, `nexttrack`, `previoustrack` action handlers
- Enables lock-screen controls and hardware media keys

**Playback rate, volume, mute** — all persisted in user preferences via `useSettings` hook.

### 5.4 Audio Cache (IndexedDB)

`src/lib/audioCache.ts` — IndexedDB store for offline MP3 blob storage.

```
Database:  narvo_audio_cache  (DB_VERSION = 3)
Store:     audio_files         keyPath: story_id
Indices:   cached_at, type
```

Schema per record:
```ts
{
  story_id: string,
  audioBlob: Blob,       // raw MP3 bytes
  audio_url: string,     // blob: URL created from audioBlob
  title: string,
  source: string,
  duration: string,
  type: string,          // 'tts' | 'radio'
  size: number,          // bytes
  cached_at: string,     // ISO timestamp
}
```

**Why `DB_VERSION = 3`:** Version 2→3 migration dropped and recreated the store to add the `type` index. The version is bumped whenever the schema changes — IndexedDB automatically runs `onupgradeneeded`.

**Key operations:**
- `getCachedAudio(story_id)` → returns `CachedAudioResult` with a live blob URL, or `null`
- `cacheAudio(story_id, blob, metadata)` → upsert
- `downloadAndCacheAudio(story_id, url, metadata)` → fetch + store in one call
- `listCachedAudio()` → all cached items for the Library offline section
- `deleteCachedAudio(story_id)` → remove one item

### 5.5 Audio Prefetch

`src/hooks/useAudioPrefetch.ts` — proactive TTS warm-up before user taps play.

**Viewport prefetch:** Uses `react-intersection-observer` to watch story cards. When a card enters the viewport, `prefetchAndCacheStory()` is called for that article (skipped if already cached or in-flight).

**Bookmark warm-up:** On component mount, `prefetchBookmarkedStories()` runs sequentially through the user's bookmarks and pre-caches audio for any that aren't already stored. Sequential (not concurrent) to avoid API rate pressure.

**In-flight deduplication:** `prefetchInFlight: Set<string>` prevents duplicate concurrent requests for the same story ID. `prefetchedIds: Set<string>` (module-level, persists across renders) prevents re-fetching in the same session.

### 5.6 Service Worker & PWA

`public/sw.js` — Service Worker strategy is **cache-first for static assets, network-first for API**.

**Cache name:** `narvo-v5` (bump version to force re-registration on deploy).

**Critical cross-origin guard** (fixed in commit `b1dab4b`):
```js
// CORRECT: skip ALL cross-origin requests
if (url.origin !== self.location.origin) return;
```
The previous version accidentally let cross-origin `/api/*` requests through, causing CORS errors when a production API URL was cached in a stale JS bundle.

**Background Sync:** Registered for bookmark saves and listening history when offline. Replays when connectivity returns.

**Web App Manifest:** Enables PWA install prompt, home screen icon, splash screen, standalone display mode.

### 5.7 Mobile Navigation

`MobileNav.tsx` — full-width 5-tab bottom bar (mobile only, `md:hidden`).

**Structure:**
```
<div ref={sheetRef} className="md:hidden">   ← stable wrapper for outside-click ref
  <AnimatePresence>                           ← More sheet (conditionally rendered)
    {moreOpen && <motion.div ...>}            ← NO ref here (Framer Motion PopChild warning)
  </AnimatePresence>
  <nav ...>                                   ← always-rendered tab bar
    PRIMARY_TABS × 4 + More button
  </nav>
</div>
```

**Primary tabs:** Feed (`/dashboard`), Discover (`/discover`), Briefing (`/briefing`), Library (`/library`), More.

**More sheet:** Insights, Reputation, Narrative Duel, Settings — in a 4-column grid. Closes on: route change (`useEffect` on `location`), outside click (checks `sheetRef.contains`), Close button, re-tap More.

**Important ref placement:** The `ref` is on the stable outer `<div>`, NOT on `motion.div` inside `AnimatePresence`. Framer Motion wraps children in `PresenceChild`/`PopChild` which does not forward refs, causing a React warning.

**Bottom clearance pattern:**
- Nav height: `min-h-14` (56px)
- Audio dock: ~60px, positioned `bottom-14`
- Total stack: ~116px
- All page scroll containers use `pb-32 md:pb-N` (128px) to clear both

### 5.8 Internationalisation

`src/i18n/` — `i18next` with `react-i18next`. 5 locale files matching the 5 broadcast languages:

```
en.json   — English (default)
yo.json   — Yoruba
ha.json   — Hausa
ig.json   — Igbo
pcm.json  — Nigerian Pidgin
```

UI language is controlled by `broadcastLanguage` in `AudioContext`, which also drives TTS voice selection. When the user changes language, `AudioContext.setBroadcastLanguage()` persists to user preferences via the API.

### 5.9 Theme System

`ThemeContext.tsx` — dark/light/system theme switching using CSS custom properties on `:root`. Palette is the Narvo design system:

```css
--color-bg          /* background */
--color-surface     /* elevated surface */
--color-border      /* 1px border lines */
--color-primary     /* accent — forest green / warm parchment */
--color-text-primary
--color-text-secondary
--color-text-dim-accessible
```

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
theme               TEXT DEFAULT 'dark'
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
| `DB_VERSION` | audioCache.ts | `3` | IndexedDB schema version (bump on schema changes) |
| `CACHE_NAME` | sw.js | `narvo-v5` | SW cache name (bump on deploy to force re-registration) |
| `API_VERSION` | server.py | `"2.0"` | Reported in `/ping` and `/api/ping` |
| `MODEL_NAME` | llm_gemini.py | `gemini-2.0-flash` | Primary Gemini model |
| `EMBED_MODEL` | llm_gemini.py | `text-embedding-004` | Embedding model for vector search |
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
- `VITE_BACKEND_URL` set to `https://api.narvo.news` in Vercel env vars
- `VITE_EDGE_NEWS_URL` optionally set for Supabase Edge Function routing

### Local Development

```bash
# Backend
cd backend
pip install -r requirements.txt
cp .env.example .env      # fill in keys
uvicorn server:app --host 0.0.0.0 --port 8000

# Frontend
cd frontend
cp .env.example .env.local
# Set VITE_BACKEND_URL=http://localhost:8000 (or leave unset — Vite proxy handles it)
npm install
npm run dev
```

**Never set `VITE_BACKEND_URL=https://api.narvo.news` in local `.env`** — this routes requests directly to production, bypassing the Vite proxy and causing CORS failures. Use `.env.local` to override.

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
| `VITE_BACKEND_URL` | No | Backend base URL. Leave unset in dev (Vite proxy). Set to `https://api.narvo.news` in Vercel. |
| `VITE_SUPABASE_URL` | Yes | Supabase project URL |
| `VITE_SUPABASE_ANON_KEY` | Yes | Supabase anon key (safe to expose) |
| `VITE_SENTRY_DSN` | No | Frontend Sentry |
| `VITE_EDGE_NEWS_URL` | No | Regional Supabase Edge Function for `/api/news` |

---

## 10. Known Issues & Decisions Log

### 2026-03-12 — Gemini SDK Migration
**Problem:** `google.generativeai` package is end-of-life. `models/gemini-2.0-flash` returns 404 for new API users through the old SDK.
**Fix:** Migrated `llm_gemini.py` to `google.genai` (package: `google-genai==1.63.0`). Updated embedding model from `models/embedding-001` to `text-embedding-004`.
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
