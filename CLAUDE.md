# Narvo — Project Instructions (Design System v5.1)

## Identity

You are the Narvo Lead Engineer. You write clean, modular code within a single monorepo: **Next.js 15** frontend and **FastAPI (Python)** backend. Every component adheres to the Narvo Design System v5.1 — Petrol Teal/Signal Vermilion palette, editorial typography, and modular layout scales.

## Commands

```bash
# Backend
cd backend && uvicorn server:app --host 0.0.0.0 --port 8000

# Frontend (Next.js 15 — App Router)
cd frontend && npm install && npm run dev   # → http://localhost:3000
cd frontend && npm run build               # output dir: build/

# Investor site (uses Intelligence branding — still Vite)
cd investor && npm install && npm run dev  # → http://localhost:5173
```

## Architecture

- **Monorepo:** `frontend/` (Next.js 15 / App Router / TypeScript), `backend/` (FastAPI/Python), `investor/` (Vite/React), `supabase/` (migrations)
- **Frontend framework:** Next.js 15 with App Router. Routes live under `frontend/app/`. Components under `frontend/components/`. Libs under `frontend/lib/`. Hooks under `frontend/hooks/`.
- **Database:** Supabase (Postgres) with RLS on every table
- **Auth:** Supabase Auth — browser client in `lib/supabase-browser.ts`, server actions in `lib/narvo-auth-actions.ts`
- **AI pipeline:** Gemini (narrative synthesis) → YarnGPT/OpenAI (TTS)
- **Deploy:** Backend → Cloud Run (`api.narvo.news`), Frontend → Vercel (`narvo.news`, `distDir: build`), Investor → Vercel (`investor.narvo.news`)
- **Route protection:** `frontend/middleware.ts` — redirects unauthenticated users via `narvo_demo_session` cookie

## Frontend Tech Stack (Next.js era)

- **Framework:** Next.js 15, App Router, React 18
- **Styling:** Tailwind CSS v4 with `@theme` directive in `app/globals.css`
- **Icons:** Lucide React (not Phosphor)
- **Animation:** `motion` package (not framer-motion)
- **API client:** `lib/narvo-api.ts` (public), `lib/me-api.ts` (authenticated `/api/me/*`)
- **Session:** `lib/narvo-session.ts` — stores Supabase access token in `narvo_demo_session` cookie
- **App shell:** `components/app/AuthenticatedAppShell.tsx` — wraps DesktopRail + MobileNavDock + AppUniversalHeader
- **Nav:** `components/app/MobileNavDock.tsx` (floating), `components/app/DesktopRail.tsx` (dark fixed 240px)
- **Nav items canonical definition:** `components/app/nav-items.ts`
- **Copy strings:** `lib/narvo-app-copy.ts` (COPY object — all user-facing strings)
- **Analytics:** `lib/narvo-analytics.ts`
- **Offline storage:** `lib/offlineStorage.ts`

## App Routes (Next.js App Router)

| Route | Directory | Notes |
|-------|-----------|-------|
| `/` | `app/page.tsx` | Landing |
| `/auth` | `app/auth/page.tsx` | Sign in / Sign up |
| `/auth/callback` | `app/auth/callback/page.tsx` | Supabase OAuth callback |
| `/forgot-password` | `app/forgot-password/` | |
| `/onboarding` | `app/onboarding/page.tsx` | |
| `/dashboard` | `app/dashboard/page.tsx` | |
| `/briefing` | `app/briefing/page.tsx` | |
| `/news/[id]` | `app/news/[id]/page.tsx` | |
| `/listen` | `app/listen/page.tsx` | |
| `/discover` | `app/discover/page.tsx` | |
| `/library` | `app/library/page.tsx` | |
| `/search` | `app/search/page.tsx` | |
| `/settings` | `app/settings/page.tsx` | |
| `/insights` | `app/insights/page.tsx` | |

**Route aliases** (in `next.config.ts`): `/profile` → `/settings?tab=account`, `/subscription` → `/settings?tab=billing`, `/voices` → `/settings?tab=voice`, `/bookmarks` → `/library`, `/history` → `/insights`

## Design System v5.1 Essentials

- **Colours:** Petrol Teal `#0F5F73` (Primary), Signal Vermilion `#F04B24` (CTAs/audio/urgency), Deep Ink `#17324A` (contrast text/rail).
- **Surfaces:** Cloud White `#F6F8FB` (bg), Cool Mist `#EEF3F7` (cards), Dark bg `#0a1520` (dark mode)
- **Fonts:** Newsreader (Headlines via `font-serif`), Instrument Sans (Body/UI via `font-sans`), Geist Mono (Metadata via `font-mono`)
- **Type scale:** `Size(n) = 16px × 1.250^n` (Major Third)
- **Spacing:** 8px grid — 0, 4, 8, 12, 16, 20, 24, 32, 40, 48, 64
- **Radii:** 10px (sm), 14px (md), 18px (lg), 24px (xl), 32px (2xl)
- **Shadows:** From Deep Ink (`rgba(23, 50, 74, ...)`). No cold grey.
- **Motion:** Spring stiffness 260, damping 20. Press: `{ scale: 0.96 }`.
- **Layout:** `AuthenticatedAppShell` → `DesktopRail` (lg: 4.5rem icon / xl: 15.5rem expanded) + `MobileNavDock` (floating pill)
- **Dark mode:** Toggle via ThemeProvider sets `class="dark"` on `<html>`

## CSS Tokens (globals.css — Tailwind v4 @theme)

```css
/* Tailwind v4 @theme block */
--color-narvo-teal: #0f5f73;
--color-narvo-vermilion: #f04b24;
--color-narvo-ink: #17324a;
--color-narvo-mist: #eef3f7;
--color-narvo-cloud: #f6f8fb;
--color-narvo-butter: #f2d66b;
--color-narvo-mint: #7fddca;

/* CSS custom props (light/dark) */
:root { --bg-primary: #f9f6ef; --bg-card: #ffffff; }
.dark { --bg-primary: #0a1520; --bg-card: #17324a; }
```

## Conventions

- **Tailwind v4** — use `@theme` for colour tokens, `@custom-variant dark` for dark mode. Class names: `text-narvo-teal`, `bg-narvo-vermilion`, `font-serif`, `font-sans`, `font-mono`.
- Functional components (RSC where possible, `'use client'` only when needed).
- `motion` for animations (not framer-motion).
- `Lucide` icons (not Phosphor).
- Backend endpoints under `/api/` prefix. All authenticated user ops via `/api/me/*`.
- RLS policies must use `auth.uid()`.
- Copy strings must come from `lib/narvo-app-copy.ts` (COPY object).

## Watch Out For

- `frontend/` is **Next.js 15 App Router** — not Vite. Old `frontend/src/` structure no longer exists.
- Build output is `build/` (configured in `next.config.ts` as `distDir: 'build'`).
- `narvo_demo_session` cookie controls auth gating in middleware.
- Investor site is **still Vite** — different build system.
- Legacy `rgb(var(--token))` patterns from v4 may still exist in some components — replace with direct hex vars.
- UI revamp is in progress per `Narvo_UI_UX_Revamp_Workflow_v1.md` Phase 3→4.

## Tone (User-Facing Copy)

Warm and human. Source all strings from `lib/narvo-app-copy.ts`. "Good morning, {name}" not "SYSTEM_STATUS: ACTIVE". "Oya, Play" not "Play Audio". Follow `Narvo_Copy_System.md`.
