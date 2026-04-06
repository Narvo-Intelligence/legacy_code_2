---
name: design-system
description: >
  Narvo Design System v5.1 tokens and UI patterns for the Next.js app.
  Use when creating or modifying components, styling, or user-facing visuals.
  Auto-trigger for frontend/app, frontend/components, frontend/lib, globals.css,
  or when the user mentions colours, typography, cards, buttons, motion, or layout.
allowed-tools: Read, Grep, Glob, Write, Edit
---

# Narvo Design System v5.1 — Claude quick reference

**Canonical for implementation:** root **`CLAUDE.md`** § Design System + **`.claude/rules/frontend-style.md`**.

## Where tokens live

- **Tailwind v4 `@theme` + light/dark CSS vars:** `frontend/app/globals.css`
- **Shared repeated class strings:** `frontend/lib/narvo-ui-classes.ts` (`NARVO_TOOLBAR_RAIL_CLASS`, `NARVO_AUTH_CANVAS_CARD_CLASS`, panel classes)
- **User-facing strings:** `frontend/lib/narvo-app-copy.ts` (`COPY`)

## v5.1 palette (Tailwind)

| Role | Class examples | Hex |
|------|----------------|-----|
| Primary / structure | `text-narvo-teal`, `bg-narvo-teal` | `#0F5F73` |
| CTA / audio / urgent | `text-narvo-vermilion`, `bg-narvo-vermilion` | `#F04B24` |
| Ink / rail | `text-narvo-ink`, `bg-narvo-ink` | `#17324A` |
| Surfaces | `bg-narvo-cloud`, `bg-narvo-mist` | `#F6F8FB`, `#EEF3F7` |
| Accents | `text-narvo-butter`, `text-narvo-mint` | highlights, success |

Use **`var(--bg-primary)`**, **`var(--text-primary)`** where semantic page colours are needed.

## Typography & icons

- **Serif (headlines):** `font-serif` → Newsreader  
- **Sans (UI/body):** `font-sans` → Instrument Sans  
- **Mono (meta):** `font-mono` → Geist Mono  
- **Icons:** Lucide only — `import { … } from 'lucide-react'`

## Motion

- Package: **`motion`** — `import { motion } from 'motion/react'`
- Default spring: stiffness **260**, damping **20**; press **0.96** scale
- Respect **`prefers-reduced-motion`** on marketing/heavy animation surfaces

## Deprecated for this repo

- **Do not** use this skill’s old **v4** cream/green palette or **`frontend/src/index.css`** paths — that tree does not exist in `frontend/`.
- **Do not** specify Phosphor, Framer Motion, or Vite routing for the B2C app.

For historical v4 notes only, see archived org docs; **shipping UI is v5.1**.
