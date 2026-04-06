---
paths:
  - "frontend/app/**/*.tsx"
  - "frontend/app/**/*.ts"
  - "frontend/app/**/*.css"
  - "frontend/components/**/*.tsx"
  - "frontend/lib/**/*.ts"
  - "frontend/hooks/**/*.ts"
---
# Frontend Code Style — Next.js 15 + Narvo Design System v5.1

## Framework
Next.js 15, App Router, React 18. All routes in `frontend/app/`. Components in `frontend/components/`. Libs in `frontend/lib/`. Hooks in `frontend/hooks/`.

## Colour System (v5.1 — globals.css @theme)

Named Tailwind classes from `@theme` block:
- `text-narvo-teal` / `bg-narvo-teal` → `#0F5F73` Petrol Teal (structural)
- `text-narvo-vermilion` / `bg-narvo-vermilion` → `#F04B24` Signal Vermilion (CTAs, play, urgent)
- `text-narvo-ink` / `bg-narvo-ink` → `#17324A` Deep Ink (rail, max-contrast text)
- `bg-narvo-cloud` → `#F6F8FB` Cloud White (page bg)
- `bg-narvo-mist` → `#EEF3F7` Cool Mist (cards, secondary surfaces)
- `text-narvo-butter` → `#F2D66B` Soft Butter (highlights, onboarding)
- `text-narvo-mint` → `#7FDDCA` Seafoam Mint (success, verified)

CSS custom props (dynamic light/dark):
- `var(--bg-primary)` — `#f9f6ef` light / `#0a1520` dark
- `var(--bg-card)` — `#ffffff` light / `#17324a` dark
- `var(--text-primary)` — `#17324a` light / `#eef3f7` dark
- `var(--border-primary)` — `rgba(23,50,74,0.05)` light / `rgba(238,243,247,0.15)` dark

## Typography (v5.1)
- `font-serif` → Newsreader (Headlines H1–H4, display)
- `font-sans` → Instrument Sans (Body, UI, nav, buttons) — body default
- `font-mono` → Geist Mono (timestamps, truth tags, stamps, metadata)
- `h1,h2,h3,h4` get `@apply font-serif` globally via `globals.css`

Scale: display 64px / h1 52px / h2 40px / h3 32px / h4 26px / body 16px / label 12px / stamp 11px

## Icons
**Lucide React** only. No Phosphor icons in the Next.js app.
`import { LayoutDashboard, Headphones, Search } from 'lucide-react'`

## Animation
**`motion`** package only. Not framer-motion.
`import { motion } from 'motion/react'` or `import { animate } from 'motion'`

## Dark Mode
ThemeProvider sets `class="dark"` on `<html>`. Use `dark:` Tailwind variant.
`@custom-variant dark (&:where(.dark, .dark *))` in globals.css.

## Server vs Client Components
- Default to React Server Components.
- Add `'use client'` only when using: hooks, event handlers, browser APIs, context, motion.
- Layout files (`layout.tsx`) are RSC; wrap interactive children in client wrappers.

## API Patterns
- Public reads: `lib/narvo-api.ts` → `fetchNews()`, `fetchBriefingLatest()`, etc.
- Authenticated ops: `lib/me-api.ts` → sends `Authorization: Bearer` from `narvo-session.ts`
- All backend endpoints under `/api/` prefix
- User-scoped ops: `/api/me/*` routes only (never caller-supplied `user_id` in path)

## Auth
- Browser Supabase client: `lib/supabase-browser.ts`
- Server auth actions: `lib/narvo-auth-actions.ts`
- Session token: `lib/narvo-session.ts` (stored in `narvo_demo_session` cookie)
- Route protection: `middleware.ts` redirects to `/auth?next=...`

## Copy
All user-facing strings from `lib/narvo-app-copy.ts` COPY object. Never hardcode inline.

## Performance
- Bottom padding on all scrollable authenticated pages: `pb-[calc(5.75rem+env(safe-area-inset-bottom,0px))]`
- Next.js `<Image>` for all images. `unoptimized` in dev only.
- Persistent AudioPlayer mounts in root layout.

## Build
- `npm run build` → output to `build/` (distDir in next.config.ts)
- `npm run dev` → http://localhost:3000
