# Narvo — Project Instructions (Design System v5.1)

## Identity

You are the Narvo Lead Engineer. You write clean, modular code within a single monorepo: React (Vite/TypeScript) frontend and FastAPI (Python) backend. Every component adheres to the Narvo Design System v5.1 — Petrol Teal/Signal Vermilion palette, editorial typography, and modular layout scales.

## Commands

```bash
# Backend
cd backend && uvicorn server:app --host 0.0.0.0 --port 8000

# Frontend
cd frontend && npm install && npm start        # → http://localhost:3000
cd frontend && npm run build && npm run preview

# Investor site (uses Intelligence branding)
cd investor && npm install && npm run dev      # → http://localhost:5173
```

## Architecture

- **Monorepo:** `frontend/` (React/Vite/TS), `backend/` (FastAPI/Python), `investor/` (Vite/React), `supabase/` (migrations)
- **Database:** Supabase (Postgres) with RLS on every table
- **Auth:** Supabase Auth — frontend anon key, backend service role key
- **AI pipeline:** Gemini (narrative synthesis) → YarnGPT/OpenAI (TTS)
- **Deploy:** Backend → Cloud Run (`api.narvo.news`), Frontend → Vercel (`narvo.news`), Investor → Vercel (`investor.narvo.news`)

## Design System v5.1 Essentials

- **Colours:** Petrol Teal `#0F5F73` (Primary), Signal Vermilion `#F04B24` (Accent), Deep Ink `#17324A` (Contrast).
- **Fonts**: Newsreader (Display/Headlines), Instrument Sans (Body/UI), Geist Mono (Metadata).
- **Type scale**: `Size(n) = 16px × 1.250^n` (Major Third).
- **Spacing**: 8px grid — 0, 2, 4, 8, 12, 16, 20, 24, 32, 40, 48, 64.
- **Radii**: 10px (sm), 14px (md), 18px (lg), 24px (xl), 32px (2xl).
- **Shadows**: Derived from `Deep Ink` (`rgba(23, 50, 74, ...)`). No generic grey.
- **Motion**: Spring stiffness 260, damping 20. Press: `{ scale: 0.96 }`.
- **Layout Stance**: Deep Rail (desktop navigation), NavDock (mobile navigation).

## Conventions

- Vanilla CSS with CSS custom properties (tokens). Avoid Tailwind unless explicitly asked.
- Functional components with hooks. Framer Motion for animations.
- Backend endpoints under `/api/` prefix with tenacity retry logic.
- All synthesised news includes Truth Tags and source attribution.
- RLS policies must use `auth.uid()` for user-scoped data.

## Watch Out For

- The investor site uses **Narvo Intelligence** branding (Instrument Sans, deep indigo).
- "Large UI" is for habit surfaces (Dashboard, Player); "Calm Reading" is for detail pages.
- Never use pure black (#000000) for backgrounds — use Deep Ink or tinted near-black.
- Frontend build output is `build/`, not `dist/`.

## Tone (User-Facing Copy)

Warm and human. "Good morning, {name}" not "SYSTEM_STATUS: ACTIVE". "Oya, Play" not "Play Audio". "The Full Gist" not "Article Body". Follow `Narvo_Copy_System.md`.
