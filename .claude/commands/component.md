---
description: Scaffold a new React component for the Next.js app following Narvo Design System v5.1
argument-hint: [ComponentName]
---
## Create Component: $ARGUMENTS

Add a component under **`frontend/components/`** (or colocate under `frontend/app/` if it is route-only). Follow **`CLAUDE.md`** and **`.claude/rules/frontend-style.md`**:

1. **TypeScript** — functional component with a typed `Props` interface (or inline props type).
2. **RSC by default** — add `'use client'` only if you need hooks, browser APIs, event handlers, context, or `motion`.
3. **Colours** — Tailwind tokens: `narvo-teal`, `narvo-vermilion`, `narvo-ink`, `narvo-cloud`, `narvo-mist`, plus `dark:` variants. Use `var(--bg-primary)` / `var(--text-primary)` when matching page semantics from `globals.css`.
4. **Typography** — `font-serif` (Newsreader), `font-sans` (Instrument Sans), `font-mono` (Geist Mono). Scale: `16px × 1.250^n`.
5. **Spacing** — 8px grid (4, 8, 12, 16, 20, 24, 32, 40, 48, 64).
6. **Radii** — design-system radii (e.g. `rounded-lg`, `rounded-xl`, `rounded-2xl` per Tailwind theme mapping).
7. **Shadows** — from Deep Ink (`rgba(23, 50, 74, …)`), not cold grey.
8. **Motion** — `import { motion } from 'motion/react'` when animated; spring stiffness 260, damping 20; press `scale: 0.96`; respect reduced motion.
9. **Icons** — `lucide-react` only.
10. **Copy** — pull strings from `lib/narvo-app-copy.ts` (`COPY`) for user-visible text.
11. **Accessibility** — labels, focus-visible rings, touch targets ≥48px where interactive.

**Investor site** (`investor/`) is Vite — do not place this component there unless the task says so.

After creating, note which tokens and whether the shell expects `AuthenticatedAppShell` patterns.
