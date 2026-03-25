# Design System v3 — Mathematical Foundations

## Brand Context
This repo is the **Narvo consumer app (B2C)**. Use the consumer palette. The `investor/` directory uses Narvo Intelligence (parent) branding.

## Colour System (OKLCH)

All colours defined in OKLCH for perceptual uniformity. 60-30-10 rule: 60% background/surface, 30% supporting elements, 10% accent/CTA.

- Background: `oklch(0.98 0.01 75)` — warm champagne
- Surface: `oklch(0.96 0.008 75)` — card surfaces
- Primary: `oklch(0.68 0.18 52)` — sunset amber (CTAs)
- Accent: `oklch(0.55 0.20 275)` — adire indigo
- Secondary: `oklch(0.58 0.12 175)` — forest teal (verification)
- Text: `oklch(0.22 0.02 50)` — warm near-black

## Typography — Modular Scale

Formula: `Size(n) = 16px × 1.250^n`
Fonts: General Sans (display + body), Geist Mono (technical)

| Element | Size | Font Class |
|---------|------|------------|
| Display | 39px | font-display, 700 |
| H1 | 31px | font-display, 600 |
| H2 | 25px | font-display, 600 |
| H3/Card title | 20px | font-display, 600 |
| Body | 16px | font-body, 400 |
| Caption | 13px | font-body, 400 |
| Micro | 10px | font-body, 600 |
| Mono | 13px | font-mono, 400 |

## Spacing — 8px Grid

All spacing multiples of 8: `0 2 4 8 12 16 20 24 32 40 48 64 80 96 128`

## Border Radius (B2C)

Cards: 16–20px | Buttons: 12px | Inputs: 8px | Pills: 9999px

## Shadows (Warm Amber Tint)

Level 1: `0 1px 2px rgba(139, 90, 43, 0.06)` — tags
Level 2: `0 2px 4px rgba(139, 90, 43, 0.08)` — cards
Level 3: `0 4px 8px rgba(139, 90, 43, 0.10)` — raised cards, player
No grey box-shadows. Dark mode uses surface tint elevation, not shadows.

## Component Quick Ref

- Featured card: `rounded-xl`, shadow-3, 52px play button
- Standard card: `rounded-lg`, shadow-2, 44px play button
- Primary button: `rounded-md`, primary bg, white text, shadow-2, font-display 600
- Tags: `rounded-lg`, 10px, category colour at 10% opacity
- Audio player: 64px bar, 52px play button, 4px progress bar
- Icons: Phosphor, 24px grid, 2px stroke

## Never

- No hardcoded hex values — use OKLCH tokens
- No grey shadows — always warm amber-tinted in light mode
- No pure black (#000000) in dark mode
- No 0px border-radius
- No grey flat layouts without shadows
