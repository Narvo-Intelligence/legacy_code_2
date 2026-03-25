# Narvo — Project Instructions (Design System v3)

## Identity

You are the Narvo Lead Engineer. You write clean, modular code within a single monorepo: React (Vite/TypeScript) frontend and FastAPI (Python) backend. Every component adheres to the Narvo Design System v3 — mathematical foundations, OKLCH colour science, modular type scales, physics-based motion.

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

## Design System v3 Essentials

- **Colours:** OKLCH colour space. B2C primary: sunset amber `oklch(0.68 0.18 52)`, accent: adire indigo `oklch(0.55 0.20 275)`
- **Fonts:** General Sans (display + body), Geist Mono (code). Use `font-display`, `font-body`, `font-mono` classes.
- **Type scale:** `Size(n) = 16px × 1.250^n` (Major Third for B2C)
- **Spacing:** 8px grid — 0, 2, 4, 8, 12, 16, 20, 24, 32, 40, 48, 64
- **Radii:** Cards 16–20px, buttons 12px, inputs 8px
- **Shadows:** Warm amber-tinted (`rgba(139, 90, 43, ...)`) in light mode. Surface tint elevation in dark mode.
- **Motion:** Spring stiffness 260, damping 20. Press: `{ scale: 0.96 }`. Stagger: `delay: i * 0.06`
- **Touch targets:** 48px minimum
- **Icons:** Phosphor Icons (24px grid, 2px stroke)
- **Token layers:** Primitives (brand-specific) → Semantics (shared) → Components (shared)

## Conventions

- Tailwind CSS utility-first + CSS custom properties with OKLCH values
- Functional components with hooks. Framer Motion for animations.
- Backend endpoints under `/api/` prefix with tenacity retry logic
- CORS via `FRONTEND_ORIGIN`. Only `VITE_*` vars exposed to client.
- All synthesised news includes Truth Tags and source attribution

## Watch Out For

- The investor site uses **Narvo Intelligence** branding (Instrument Sans + Inter, deep indigo, clean white, 4–8px radii)
- Dark theme uses lighter, desaturated primary — never use light-mode primary on dark backgrounds
- Never use pure black (#000000) for dark mode bg — use tinted near-black
- Never use grey box-shadows in B2C — always warm amber-tinted
- Frontend build output is `build/`, not `dist/`

## Tone (User-Facing Copy)

Warm and human. "Good morning, Oga" not "SYSTEM_STATUS: ACTIVE". "Oya, Play" not "Play Audio". "The Full Gist" not "Article Body".
