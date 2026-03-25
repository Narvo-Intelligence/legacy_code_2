---
name: design-system
description: >
  Narvo Design System v3 — mathematical foundations, OKLCH tokens, modular type scales.
  Use PROACTIVELY when creating or modifying any UI component, styling, or user-facing element.
  Auto-trigger when working with .tsx, .css files in frontend/src/, or when the user mentions
  colours, typography, cards, buttons, shadows, radii, OKLCH, modular scale, or any visual element.
allowed-tools: Read, Grep, Glob, Write, Edit
---

# Narvo Design System v3 — Token Reference

Check `frontend/src/index.css` for canonical definitions. This skill provides the quick reference.

## Palette (B2C Light — OKLCH)

| Token | OKLCH | Hex | Role |
|-------|-------|-----|------|
| `--color-bg` | `oklch(0.98 0.01 75)` | #FDF8F0 | Warm champagne bg |
| `--color-surface` | `oklch(0.96 0.008 75)` | #FAF6EE | Cards |
| `--color-surface-raised` | `oklch(0.92 0.04 65)` | #F5E0C2 | Hover |
| `--color-primary` | `oklch(0.68 0.18 52)` | #D4850A | Sunset amber |
| `--color-primary-hover` | `oklch(0.63 0.18 50)` | #BE7508 | |
| `--color-accent` | `oklch(0.55 0.20 275)` | #5B5BD6 | Adire indigo |
| `--color-secondary` | `oklch(0.58 0.12 175)` | #18967E | Forest teal |
| `--color-text` | `oklch(0.22 0.02 50)` | #2A2420 | Primary text |
| `--color-text-secondary` | `oklch(0.50 0.14 48)` | #6B5A40 | Secondary |
| `--color-border` | `oklch(0.78 0.10 55)` | #CFA46E | Borders |

Category tags: Finance #E8C86A · Politics #D4944A · Tech #B080E0 · Health #4ADE80 · Sports #E8923A · Culture #E070A8 · Science #50D0C0 · Security #8890A8 · Urgent #E06050

## Type Scale: `16px × 1.250^n`

| n | Size | Usage | Font | Weight |
|---|------|-------|------|--------|
| 4 | 39px | Display | font-display | 700 |
| 3 | 31px | H1 | font-display | 600 |
| 2 | 25px | H2 | font-display | 600 |
| 1 | 20px | H3 / Card title | font-display | 600 |
| 0 | 16px | Body | font-body | 400 |
| -1 | 13px | Caption | font-body | 400 |
| -2 | 10px | Micro / Tags | font-body | 600 |

Fonts: General Sans (display + body), Geist Mono (mono).

## Spacing (8px grid)

`0 2 4 8 12 16 20 24 32 40 48 64 80 96 128`

## Radius

sm: 8px | md: 12px | lg: 16px | xl: 20px | full: 9999px

## Shadows (warm amber tint)

| Level | Value | Use |
|-------|-------|-----|
| 1 | `0 1px 2px rgba(139, 90, 43, 0.06)` | Tags |
| 2 | `0 2px 4px rgba(139, 90, 43, 0.08)` | Cards |
| 3 | `0 4px 8px rgba(139, 90, 43, 0.10)` | Player |
| 4 | `0 8px 16px rgba(139, 90, 43, 0.12)` | Dialogs |

## Motion

Spring: stiffness 260, damping 20. Stagger: `i × 0.06`.
Press: `whileTap: { scale: 0.96 }`.
Enter: `cubic-bezier(0.05, 0.7, 0.1, 1)`. Exit: `cubic-bezier(0.3, 0, 0.8, 0.15)`.
Durations: 50ms → 100ms → 200ms → 300ms → 400ms.

## Components

Featured card: `rounded-xl`, shadow-3, 52px play btn.
Standard card: `rounded-lg`, shadow-2, 44px play btn.
Primary btn: `rounded-md`, primary bg, white text, shadow-2, font-display 600.
Tags: `rounded-lg`, 10px, category colour at 10% bg.
Player: 64px bar, 52px primary play btn, 4px progress.
Icons: Phosphor, 24px grid, 2px stroke.
