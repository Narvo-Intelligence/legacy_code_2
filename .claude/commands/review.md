---
description: Review the current branch diff against Design System v5.1 — code quality, token compliance, accessibility, and security.
---
## Changes to Review

!`git diff --name-only main...HEAD`

## Detailed Diff

!`git diff main...HEAD`

Review against **`CLAUDE.md`** and **`.claude/rules/frontend-style.md`** (Next.js 15 B2C app under `frontend/app/`):

1. **Colours:** Tailwind tokens (`text-narvo-teal`, `bg-narvo-vermilion`, `narvo-ink`, surfaces). Prefer semantic CSS vars (`--bg-primary`, `--text-primary`) where globals define them. No stray legacy v3/v4-only palettes on new UI unless explicitly migrating.
2. **Typography:** `font-serif` (Newsreader) headlines · `font-sans` (Instrument Sans) UI/body · `font-mono` (Geist Mono) meta. Major Third scale `16px × 1.250^n`.
3. **Spacing:** 8px grid (0, 4, 8, 12, 16, 20, 24, 32, 40, 48, 64).
4. **Radii:** sm 10px · md 14px · lg 18px · xl 24px · 2xl 32px (per design system).
5. **Motion:** `motion` package · spring stiffness 260, damping 20 · press `scale: 0.96` · respect `prefers-reduced-motion`.
6. **Icons:** Lucide only for B2C `frontend/`. Do not mix icon libraries.
7. **Copy:** User-facing strings from `lib/narvo-app-copy.ts` (`COPY`) where applicable.
8. **Backend:** `/api/` prefix · retries where appropriate · Supabase RLS · structured errors.
9. **Security:** No credentials or `.env` values in code.
10. **Tone:** Warm, human copy (see `.claude/rules/copy-system.md`).

Severity hints:
🔴 Wrong stack (e.g. framer-motion / Phosphor on B2C app) or broken auth/data contracts
🟡 Token drift (hardcoded hex where tokens exist, wrong font layer)
🔵 Minor a11y or copy nits
