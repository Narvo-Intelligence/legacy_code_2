# Design System v4 — Reference

## Brand Context
This repo is the **Narvo consumer app (B2C)**. Use the consumer palette only.
The `investor/` directory uses Narvo Intelligence (parent) branding.

## Colour System

Six colours across two tiers. Each colour owns exactly one job.

### Brand Identity
- Background: `#F3E8CC` — Cream (page bg, cards, editorial ground)
- Primary: `#18542A` — Forest Green (nav, hero bg, mark, headings)
- Accent: `#FFC926` — Sunshine Yellow (mark accent, wordmark on dark)

### Functional (one role each — never swap)
- CTA: `#F96015` — Crisp Carrot (ALL primary buttons, play buttons)
- Urgent: `#D52518` — Tomato Burst (breaking tags, errors only)
- Verified: `#9ABC05` — Kiwi (Truth Tag, verified badges only)

### Warm Neutral Scale (OKLCH hue 60° — cream axis)
```
--neutral-900: #1E1A16   --neutral-600: #625B52   --neutral-200: #DDD8D2
--neutral-800: #2E2922   --neutral-500: #807870   --neutral-100: #EDE9E4
--neutral-700: #47413A   --neutral-400: #A09890   --neutral-50:  #F7F5F2
```
Never use cold grey (#808080 family). Always use warm neutral scale.

### Surface tokens
```css
--color-bg:       #F3E8CC;
--color-surface:  #FDF8EF;
--color-primary:  #18542A;
--color-accent:   #FFC926;
--color-cta:      #F96015;
--color-urgent:   #D52518;
--color-verified: #9ABC05;
--color-text-primary: #18542A;
--color-text-mid:     #625B52;
--color-text-meta:    #A09890;
--color-border:       #DDD8D2;
```

## Typography — Three Typefaces, Three Layers

| Layer | Font | CSS token | Usage |
|-------|------|-----------|-------|
| Headlines | Fraunces (variable serif) | `font-display` | H1–H4, display text |
| Body | Plus Jakarta Sans | `font-body` | Body, nav, buttons, descriptions |
| Labels/Meta | Geist Mono | `font-mono` | Timestamps, stamps, Truth Tag strings |

### Type Scale: `16px × 1.250^n`

| Size | Usage | Font | Weight |
|------|-------|------|--------|
| 61px | Display | Fraunces | 700 |
| 49px | H1 | Fraunces | 700 |
| 39px | H2 | Fraunces | 700 |
| 31px | H3 | Fraunces | 600 |
| 25px | H4 / Card title | Fraunces | 600 |
| 20px | H5 / UI label | Plus Jakarta Sans | 600 |
| 16px | Body | Plus Jakarta Sans | 400 |
| 13px | Label | Plus Jakarta Sans | 600 |
| 11px | Stamp / meta | Geist Mono | 500 |
| 10px | Caption | Geist Mono | 400 |

Off-scale values to flag: 14px, 17px, 22px, 28px (v3 remnants)

## Spacing — 8px Grid

`0  2  4  8  12  16  20  24  32  40  48  64  80  96  128`

## Border Radius

sm: 8px | md: 12px | lg: 16px | xl: 20px | 2xl: 24px | full: 9999px

Note: `rounded-lg` = `0px` in legacy Tailwind config — use `rounded-[16px]` etc.

## Shadows (Warm Green Tint — never cold grey)

```css
--shadow-1: 0 1px 2px rgba(24, 84, 42, 0.06);
--shadow-2: 0 2px 4px rgba(24, 84, 42, 0.08), 0 1px 2px rgba(24, 84, 42, 0.04);
--shadow-3: 0 4px 8px rgba(24, 84, 42, 0.10), 0 2px 4px rgba(24, 84, 42, 0.06);
--shadow-4: 0 8px 16px rgba(24, 84, 42, 0.12), 0 4px 8px rgba(24, 84, 42, 0.08);
```
Dark mode: surface tint elevation only — no box-shadows.

## Component Sizing — Two Registers

| Component | Landing page | App (daily use) |
|-----------|-------------|-----------------|
| Primary CTA button | 56px h, 36px h-padding | 52px h, 32px h-padding |
| Ghost / secondary | 48px | 44px |
| Input fields | 56px | 52px |
| Nav bar | 72px | 64px |
| Card internal padding | 32px | 24px |
| Featured play button | 64px circle | 56px circle |
| Standard play button | — | 52px circle |
| Audio player bar | 72px | 64px |
| Progress bar height | 6px | 6px |

## Never

- Never hardcode hex — use CSS token variables
- Never use cold grey shadows — always warm green tint `rgba(24,84,42,...)`
- Never use General Sans, Satoshi, Clash Display — use Plus Jakarta Sans / Fraunces / Geist Mono
- Never use Plus Jakarta Sans for stamps/meta — Geist Mono owns that layer
- Never use Sunshine Yellow as button bg — identity only
- Never use Kiwi for CTAs — verification only
- Never use Tomato Burst decoratively — urgency states only
- Never use pure #000000 as dark mode background
- Never use `rounded-lg` (= 0px in this config) — use `rounded-[16px]` etc.
