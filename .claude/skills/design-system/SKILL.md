---
name: design-system
description: >
  Narvo Design System v4 tokens and component patterns.
  Use PROACTIVELY when creating or modifying any UI component, styling,
  or user-facing element. Auto-trigger when working with .tsx, .css files
  in frontend/src/, or when the user mentions colours, typography, cards,
  buttons, shadows, radii, or any visual element.
allowed-tools: Read, Grep, Glob, Write, Edit
---

# Narvo Design System v4 — Quick Reference

Check `frontend/src/index.css` for canonical token definitions.

## Colour Tokens (v4)

```css
--color-bg:           #F3E8CC;   /* Cream — page bg */
--color-surface:      #FDF8EF;   /* Cards, modals */
--color-primary:      #18542A;   /* Forest Green — nav, hero, headings */
--color-accent:       #FFC926;   /* Sunshine Yellow — mark, wordmark on dark */
--color-cta:          #F96015;   /* Crisp Carrot — ALL primary CTAs */
--color-cta-hover:    #e05510;
--color-urgent:       #D52518;   /* Tomato Burst — breaking/errors only */
--color-verified:     #9ABC05;   /* Kiwi — Truth Tag/verified only */
--color-text-primary: #18542A;
--color-text-mid:     #625B52;   /* --neutral-600 */
--color-text-meta:    #A09890;   /* --neutral-400 — timestamps, stamps */
--color-border:       #DDD8D2;   /* --neutral-200 */

/* Warm Neutral Scale */
--neutral-900: #1E1A16;  --neutral-400: #A09890;
--neutral-700: #47413A;  --neutral-300: #C0B9B1;
--neutral-600: #625B52;  --neutral-200: #DDD8D2;
--neutral-500: #807870;  --neutral-100: #EDE9E4;
                         --neutral-50:  #F7F5F2;

/* Tints */
--tint-green:  rgba(24,84,42,0.10);
--tint-carrot: rgba(249,96,21,0.10);
--tint-tomato: rgba(213,37,24,0.10);
--tint-kiwi:   rgba(154,188,5,0.10);
```

## Typography

| Layer | Font | Token | Usage |
|-------|------|-------|-------|
| Headlines | Fraunces | `font-display` | H1–H4, display |
| Body | Plus Jakarta Sans | `font-body` | Body, nav, buttons |
| Labels/Meta | Geist Mono | `font-mono` | Timestamps, stamps, tags |

Scale (Major Third 1.250): `10 → 11 → 13 → 16 → 20 → 25 → 31 → 39 → 49 → 61px`

## Spacing (8px grid)
`4 · 8 · 12 · 16 · 20 · 24 · 32 · 40 · 48 · 64 · 80 · 96 · 128`

## Border Radius
sm: 8px | md: 12px | lg: 16px | xl: 20px | full: 9999px
Note: `rounded-lg` = `0px` in this config. Use `rounded-[16px]` etc.

## Shadows (warm green tint)
```css
--shadow-1: 0 1px 2px rgba(24,84,42,0.06);
--shadow-2: 0 2px 4px rgba(24,84,42,0.08), 0 1px 2px rgba(24,84,42,0.04);
--shadow-3: 0 4px 8px rgba(24,84,42,0.10), 0 2px 4px rgba(24,84,42,0.06);
--shadow-4: 0 8px 16px rgba(24,84,42,0.12), 0 4px 8px rgba(24,84,42,0.08);
```

## Component Sizing

| Component | Landing | App |
|-----------|---------|-----|
| Primary CTA | h-[56px] px-[36px] text-[16px] | h-[52px] px-[32px] text-[15px] |
| Ghost / secondary | h-[48px] | h-[44px] |
| Input | h-[56px] px-[20px] | h-[52px] px-[20px] |
| Nav bar | h-[72px] | h-[64px] |
| Featured card play btn | 64px circle | 56px circle |
| Standard card play btn | — | 52px circle |
| Card padding | 32px | 24px |
| Audio player | 72px bar, 56px play | 64px bar, 52px play |
| Progress bar | 6px | 6px |

## Component Patterns

**Featured Card:** `rounded-[20px] bg-surface shadow-3` · Forest Green overlay · Sunshine Yellow headline
**Standard Card:** `rounded-[16px] bg-surface shadow-2` · 24px padding · 52px Crisp Carrot play btn
**Primary CTA:** `rounded-full bg-[#F96015] text-white` · Plus Jakarta Sans 700
**Brand Button:** `rounded-full bg-[#18542A] text-[#FFC926]`
**Ghost Button:** `rounded-full border-[1.5px] border-[#18542A]/30 text-[#18542A]` · matches primary height
**Category Chip:** `rounded-full bg-[rgba(24,84,42,0.10)] text-[#18542A] font-bold py-[5px] px-[12px]` · Plus Jakarta Sans 11px
**Breaking Tag:** `rounded-[4px] bg-[#D52518] text-white font-bold py-[4px] px-[10px]` · Geist Mono 10px
**Verified Badge:** `rounded-full bg-[rgba(154,188,5,0.10)] text-[#5a7003] py-[4px] px-[10px]` · Geist Mono
**Audio Player:** 72px bar · Forest Green bg · Plus Jakarta Sans 600 title (Sunshine Yellow) · Geist Mono timestamps · 6px progress · 56px Crisp Carrot play/pause

## Motion

Spring: stiffness 260, damping 20. Stagger: `i × 0.06`. Press: `whileTap: { scale: 0.96 }`.
Enter: `cubic-bezier(0.05, 0.7, 0.1, 1)`. Exit: `cubic-bezier(0.3, 0, 0.8, 0.15)`.
Durations: 50ms micro → 100ms toggle → 200ms hover → 300ms modal → 400ms page.

## Hard Rules

- Never: cold grey shadows — warm green tint only
- Never: Plus Jakarta Sans for stamps/meta — Geist Mono owns that layer
- Never: General Sans / Satoshi / Clash Display / Inter
- Never: Sunshine Yellow as button bg — identity only
- Never: Kiwi as CTA — verification only
- Never: Tomato Burst decoratively — urgency only
- Never: hardcode hex — use CSS token variables
- Never: `rounded-lg` (= 0px) — use `rounded-[16px]`
