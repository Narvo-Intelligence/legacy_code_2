# Narvo News — Improvements & Enhancements Audit

> Improvements that **preserve** the existing logic, functionality, and design system.
> Audited: March 12, 2026 — commit history through `features_fixes` branch.

---

## 1. Backend: Decompose the `server.py` Monolith

**Current state:** `server.py` is **2,143 lines** containing **60 inline route handlers** alongside middleware, startup logic, HTML templates, and utility functions. Meanwhile, the `routes/` directory already holds 49 handlers across 8 modules — so the migration is half-done.

**Improvement:**

- Extract the remaining 60 inline routes into the `routes/` package. Natural groupings based on what's already in `server.py`:
  - `routes/tts.py` — `/api/tts/generate`, `/api/voices`, `/api/tts/preview`
  - `routes/settings.py` — `/api/settings/{user_id}`, `/api/user/*`, `/api/listening-history`
  - `routes/notifications.py` — `/api/notifications/subscribe`, `/api/notifications/unsubscribe`, `/api/notifications/digest`
  - `routes/radio.py` — `/api/radio/stations`, `/api/radio/countries`
  - `routes/metrics.py` — `/api/admin/*`, `/api/health`, `/api/metrics`
  - `routes/content.py` — `/api/story/*`, `/api/bookmark/*`, `/api/recommendations`
- Keep `server.py` as the **assembly point only**: app creation, middleware stack, router registration, startup hooks. Target: under 300 lines.

**Why it matters:** Easier code navigation, isolated testing per module, cleaner git diffs, and onboarding new contributors becomes faster.

---

## 2. Eliminate the Duplicate `NewsItem` Pydantic Model

**Current state:** `NewsItem(BaseModel)` is defined in **both** `models/__init__.py` (line 7) and `server.py` (line 271). They may drift out of sync.

**Improvement:** Delete the duplicate in `server.py` and import from `models`. Audit all other inline Pydantic classes in `server.py` and consolidate them into `models/`.

---

## 3. Replace Raw `dict = Body(...)` with Typed Pydantic Models

**Current state:** Several route handlers accept unvalidated `dict` bodies:

```python
async def add_listening_history(data: dict = Body(...)):
async def subscribe_push(data: dict = Body(...)):
async def unsubscribe_push(data: dict = Body(...)):
```

**Improvement:** Create specific Pydantic request models (e.g., `ListeningHistoryRequest`, `PushSubscriptionRequest`). This gives you automatic validation, clear API docs in Swagger, and type safety — without changing any business logic.

---

## 4. Reuse a Shared `httpx.AsyncClient` Instead of Per-Request Clients

**Current state:** Every external HTTP call creates and tears down a fresh `httpx.AsyncClient`:

```python
async with httpx.AsyncClient(timeout=15.0) as client:
    response = await client.get(url)
```

This appears in `radio_service.py`, `yarngpt_service.py`, `factcheck_service.py`, `server.py`, and `routes/discover.py` — at least 6 call sites.

**Improvement:** Create a module-level shared client (or lifespan-managed client attached to the FastAPI app state) with a connection pool. This eliminates TCP/TLS handshake overhead on every request and enables HTTP/2 multiplexing:

```python
# lib/http_client.py
_client: httpx.AsyncClient | None = None

async def get_client() -> httpx.AsyncClient:
    global _client
    if _client is None:
        _client = httpx.AsyncClient(timeout=15.0, limits=httpx.Limits(max_connections=20))
    return _client
```

---

## 5. Add Structured JSON Logging

**Current state:** The backend uses Python's standard `logging.getLogger()` with default text formatting. In a Cloud Run / container environment, structured JSON logs are much easier to query and alert on.

**Improvement:** Add `python-json-logger` or `structlog` to format log output as JSON. Include request_id, user_id, and latency fields in a middleware context. No logic change — just how logs are emitted.

---

## 6. Standardize Backend Error Responses

**Current state:** HTTPException details vary in format:

```python
raise HTTPException(status_code=500, detail=f"TTS generation failed: {str(e)}")
raise HTTPException(status_code=504, detail="Radio API timeout")
raise HTTPException(status_code=404, detail="Article not found")
```

**Improvement:** Create a consistent error envelope via a FastAPI exception handler:

```json
{
  "error": true,
  "code": "TTS_GENERATION_FAILED",
  "detail": "TTS generation failed: timeout",
  "status": 500
}
```

This makes frontend error handling more predictable without changing any existing behavior.

---

## 7. IndexedDB Audio Cache: Add Eviction Policy

**Current state:** `audioCache.ts` stores MP3 blobs in IndexedDB indefinitely. There is a `clearAllCache()` function but **no automatic eviction** — no max item count, no max storage size, no TTL-based pruning.

**Improvement:** Add a lightweight eviction strategy that runs on app startup or after each new cache write:

- **Max items:** e.g., 100 stories. When exceeded, evict oldest by `cached_at`.
- **Max total size:** e.g., 200 MB. Evict largest-and-oldest entries first.
- **TTL:** Optionally expire entries older than 7 days.

This prevents the cache from silently growing until the browser enforces a storage quota eviction (which would clear everything at once).

---

## 8. Consolidate the Duplicate Push Subscription Code

**Current state:** Push subscription logic exists in **two separate files** with different implementations:

- `notificationService.ts` — **hardcodes** the VAPID public key as a string literal.
- `api.ts` — reads it from the **environment variable** `VITE_VAPID_PUBLIC_KEY`.

The `DailyDigestToggle` component uses `notificationService.ts`, while `api.ts`'s `subscribeToNotifications()` appears to be an alternative path.

**Improvement:** Consolidate into one canonical subscription function. Remove the hardcoded VAPID key from `notificationService.ts` and use the environment variable exclusively. If the env var is missing, fall back to the hardcoded value with a deprecation warning during development.

---

## 9. Add `useEffect` Cleanup for All Async Operations in `AudioContext`

**Current state:** `AudioContext.tsx` has **8 `useEffect` hooks** but only **1 cleanup return**. Several effects initiate async operations (fetching settings, playing tracks) without abort/cancellation on unmount.

**Improvement:** Add `AbortController` signals or boolean `isMounted` flags to all async effects so that state updates don't fire after the component unmounts. Other pages (`DashboardPage`, `useAudioPrefetch`) already use `AbortController` correctly — apply the same pattern consistently in `AudioContext`.

---

## 10. Replace Empty `catch` Blocks with Contextual Logging

**Current state:** At least **10+ empty `catch {}` blocks** in the frontend (AudioContext alone has 7). These silently swallow errors:

```tsx
} catch {
  /* ignore */
}
```

**Improvement:** Replace with `catch (err) { logger.debug('[AudioContext] settings cache read failed', err); }` using the existing `logger.ts` utility. This preserves the "don't crash" behavior while making debugging possible. For truly ignorable operations (like localStorage reads), a single-line debug log is sufficient.

---

## 11. Vite Build: Add Manual Chunk Splitting

**Current state:** The `vite.config.js` build output has an empty `rollupOptions.output` block. All vendor code ends up in a single chunk.

**Improvement:** Add `manualChunks` to split large dependencies:

```js
output: {
  manualChunks: {
    'vendor-react': ['react', 'react-dom', 'react-router-dom'],
    'vendor-motion': ['framer-motion'],
    'vendor-i18n': ['react-i18next', 'i18next'],
    'vendor-swr': ['swr'],
    'vendor-charts': ['recharts'],
  },
}
```

This improves caching efficiency — when you update app code, users don't re-download React. It also enables parallel loading of vendor chunks.

---

## 12. Service Worker: Fix the Unreferenced Revalidation Promise

**Current state:** In `sw.js` line 110, the stale-while-revalidate strategy for `/api/news` has a no-op statement:

```js
if (cached) {
  fetchPromise; // ← does nothing, background fetch may be GC'd
  return cached;
}
```

**Improvement:** Assign the promise to `event.waitUntil()` so the Service Worker lifecycle keeps the background fetch alive:

```js
if (cached) {
  event.waitUntil(fetchPromise);
  return cached;
}
```

Note: this requires restructuring slightly since `event.respondWith` has already been called, but `event.waitUntil` can still be used alongside it to extend the SW lifetime.

---

## 13. Expand Frontend Test Coverage

**Current state:** Frontend has only **5 test files** covering `BackToSettings`, `usePullToRefresh`, accessibility basics, `SettingsPage.logout`, and `accessibilityApply`. The largest and most critical components — `DashboardPage` (1,122 lines), `AudioPlayerBar` (988 lines), `AudioContext` (718 lines) — have **zero test coverage**.

**Improvement (high-priority targets):**

- **AudioContext:** Test queue management (add, remove, reorder), auto-play advancement, track generation with TTS, volume/mute state, broadcast language switching.
- **AudioPlayerBar:** Test play/pause toggle, seek interaction, queue panel open/close, speed selector.
- **TruthTag:** Test VERIFIED/DISPUTED/UNVERIFIED rendering, lazy-loading via IntersectionObserver mock, cache hit behavior.
- **DashboardPage:** Test story card rendering, recommendation section visibility, pull-to-refresh trigger, SWR data fetching.
- **notificationService:** Test permission flow, subscription/unsubscription lifecycle.

---

## 14. Expand Backend Test Coverage for Critical Paths

**Current state:** Backend has ~13 test files with solid coverage of aggregators, translation, voice mapping, and API routes. However, several critical services lack dedicated tests.

**Improvement (high-priority targets):**

- **`briefing_service.py`:** Test `generate_briefing_script()` with mocked Gemini responses, `_compute_story_segments()` edge cases, personalization with profile data.
- **`push_sender.py`:** Test `send_briefing_ready_push()` with mocked `pywebpush`, expired subscription cleanup (404/410 handling).
- **`narrative_service.py`:** Test `synthesize_composite_story()` with multi-source inputs, authority prefix logic, `assign_source_roles()` Gemini parsing and fallback.
- **`recommendation_service.py`:** Test scoring, embedding fallback, cold-start behavior.
- **Rate limiter:** Test `check_rate_limit()` with Upstash mock and in-memory fallback.

---

## 15. Add HTTP Response Caching Headers to More API Endpoints

**Current state:** Only `/api/voices`, `/api/categories`, `/api/regions`, and `/api/sound-themes` return `Cache-Control` headers. The main `/api/news` endpoint and `/api/briefing/latest` return no caching directives.

**Improvement:**

- `/api/news` — Add `Cache-Control: public, s-maxage=120, stale-while-revalidate=60` (matches the Supabase Edge Function already).
- `/api/briefing/latest` — Add `Cache-Control: private, max-age=300` (briefing changes once per day).
- `/api/factcheck/story/{id}` — Add `Cache-Control: public, max-age=3600` (fact-check results are stable).
- `/api/recommendations` — Add `Cache-Control: private, max-age=600`.

This reduces backend load without any logic change.

---

## 16. Add OpenGraph and Twitter Card Meta to More Pages

**Current state:** `LandingPage` and `NewsDetailPage` use `react-helmet-async` for SEO meta tags. Other key pages (DashboardPage, MorningBriefingPage, VoiceStudioPage, DiscoverPage) lack page-specific meta.

**Improvement:** Add `<Helmet>` with appropriate `og:title`, `og:description`, and `twitter:card` tags to all public-facing pages. For the briefing page, include the date and lead story in the description. This improves social sharing and SEO without any visual or logical change.

---

## 17. Add a Global Request ID Middleware

**Current state:** No request correlation ID. When debugging a failed TTS call, there's no way to trace the full request chain from frontend → API → Gemini → YarnGPT.

**Improvement:** Add a middleware that generates or propagates an `X-Request-ID` header, injects it into the logging context, and returns it in the response. The frontend `api.ts` can then include this ID in error reports to Sentry.

---

## 18. Add Backend Startup Validation for Required Environment Variables

**Current state:** Services silently fall back when keys are missing (e.g., `GEMINI_API_KEY`, `SUPABASE_URL`). This can lead to confusing runtime failures — a missing `GEMINI_API_KEY` just returns `None` from `generate_gemini()`, which downstream code handles as "no content."

**Improvement:** Add a startup check that logs warnings for missing optional keys and raises an error for truly required ones (`SUPABASE_URL`, `SUPABASE_SERVICE_KEY`). This surfaces configuration issues at deploy time rather than at request time.

---

## 19. Add Content-Security-Policy Headers

**Current state:** The backend sets `X-Content-Type-Options: nosniff` and `X-Frame-Options: DENY` but has **no Content-Security-Policy (CSP)** header.

**Improvement:** Add a basic CSP that restricts script sources to self and trusted CDNs (cdnjs, Google Fonts), restricts `connect-src` to the API domain and Supabase, and blocks `frame-ancestors`. This hardens against XSS without changing any functionality.

---

## 20. Frontend: Add `React.memo` to Expensive List Item Components

**Current state:** Story cards in `DashboardPage` are rendered as inline JSX within `.map()` callbacks. With 20+ stories, category filters, and SWR revalidation, every state change re-renders all cards.

**Improvement:** Extract the story card JSX into a named `StoryCard` component wrapped in `React.memo`. The existing `useMemo` usage (125 instances across the app) shows the pattern is already adopted — extend it to the heaviest render paths. Similarly, extract `QueueItem` from `AudioPlayerBar`'s queue list rendering.

---

## 21. Add Lighthouse CI / Web Vitals Monitoring

**Current state:** No automated performance monitoring. The app uses Sentry for errors but doesn't track Core Web Vitals (LCP, FID, CLS).

**Improvement:**

- Add `web-vitals` library reporting to Sentry (or a custom endpoint). This requires about 5 lines in `index.jsx`.
- Optionally add Lighthouse CI to the CI pipeline to catch performance regressions on PRs.

---

## 22. Backend: Add Database Query Timeouts

**Current state:** Supabase queries via `get_supabase_db()` have no explicit timeout. If Supabase is slow or paused (as noted in the Known Issues — Supabase can auto-pause on free tier), queries hang until the default HTTP timeout.

**Improvement:** Configure the Supabase client with explicit request timeouts (e.g., 10 seconds) and wrap critical queries in try/except with a fallback message like "Database temporarily unavailable."

---

## 23. Add `rel="noopener noreferrer"` to External Links

**Current state:** Any `<a target="_blank">` links in the frontend (landing page, news detail, external source links) should include `rel="noopener noreferrer"` to prevent `window.opener` access from the linked page.

**Improvement:** Audit all `<a>` tags with `target="_blank"` and add the `rel` attribute. This is a one-line-per-link security hardening with zero functional impact.

---

## 24. Service Worker: Add Cache Size Limit

**Current state:** The `narvo-v5` cache grows unbounded as the stale-while-revalidate strategy caches every visited page and API response.

**Improvement:** Add a max-entries check after each cache write. When the cache exceeds a threshold (e.g., 150 entries), evict the oldest entries. Alternatively, use Workbox's `ExpirationPlugin` pattern if migrating to Workbox is on the table.

---

## Summary: Priority Ranking

| Priority | Improvement | Effort | Impact |
|----------|------------|--------|--------|
| High | #1 Decompose server.py monolith | Medium | Maintainability |
| High | #7 IndexedDB cache eviction | Low | Storage reliability |
| High | #13 Frontend test coverage | Medium | Quality assurance |
| High | #8 Consolidate push subscription | Low | Bug prevention |
| High | #12 Fix SW revalidation promise | Low | Offline correctness |
| Medium | #3 Typed Pydantic request bodies | Low | API safety |
| Medium | #4 Shared httpx client | Low | Performance |
| Medium | #6 Standardize error responses | Low | DX consistency |
| Medium | #10 Replace empty catch blocks | Low | Debuggability |
| Medium | #11 Vite manual chunk splitting | Low | Load performance |
| Medium | #14 Backend test coverage | Medium | Quality assurance |
| Medium | #15 HTTP caching headers | Low | Performance |
| Medium | #9 useEffect cleanup | Low | Memory safety |
| Medium | #17 Request ID middleware | Low | Observability |
| Low | #2 Remove duplicate NewsItem | Trivial | Code hygiene |
| Low | #5 Structured JSON logging | Low | Observability |
| Low | #16 OpenGraph meta tags | Low | SEO |
| Low | #18 Env var startup validation | Low | DevOps |
| Low | #19 CSP headers | Low | Security |
| Low | #20 React.memo on list items | Low | Render performance |
| Low | #21 Web Vitals monitoring | Low | Performance tracking |
| Low | #22 DB query timeouts | Low | Resilience |
| Low | #23 noopener on external links | Trivial | Security |
| Low | #24 SW cache size limit | Low | Storage hygiene |
