---
paths:
  - "frontend/src/**/*.tsx"
  - "frontend/src/**/*.ts"
  - "frontend/src/**/*.css"
---
# Frontend Code Style — Narvo Design Foundation v5.1

## Colour System (v5.1 Locked)
- **Primary**: `Petrol Teal (#0F5F73)` — Brand anchor, structural surfaces.
- **Accent**: `Signal Vermilion (#F04B24)` — Playback, urgency, live, CTA.
- **Contrast**: `Deep Ink (#17324A)` — Contrast text, nav ink, highest emphasis.
- **Surfaces**: `Cloud White (#F6F8FB)` (Base BG), `Cool Mist (#EEF3F7)` (Secondary).
- **Secondary Text**: `Slate Mist (#6C7F93)`.

### Tints and Fills
- `--color-primary-tint`: `rgba(15, 95, 115, 0.10)`
- `--color-alert-tint`: `rgba(240, 75, 36, 0.10)`
- `--color-success-tint`: `rgba(127, 221, 202, 0.14)`
- `--color-highlight-tint`: `rgba(242, 214, 107, 0.16)`

## Typography (v5.1 Locked)
- **Display/Headlines**: `Newsreader` — Editorial authority.
- **Body/UI**: `Instrument Sans` — Modern clarity, product speed.
- **Metadata/Stamps**: `Geist Mono` — Technical precision, intelligence markers.

### Hierarchy Rules
- Headlines: `Size(n) = 16px × 1.250^n` (Major Third).
- `display`: 64px / `h1`: 52px / `h2`: 40px / `h3`: 32px / `h4`: 26px.
- `body`: 16px / `body-sm`: 14px / `label`: 12px / `stamp`: 11px.
- Line Height: 1.60 to 1.72 (Body), 0.94 to 1.00 (H1).

## Layout & Sizing
- **Grid**: 8px baseline system.
- **Radius**: `10px` (sm), `14px` (md), `18px` (lg), `24px` (xl), `32px` (2xl).
- **Persistent Player**: Bottom-docked, clears `MobileNav` (total ~116px clearance).

## Performance & Offline
- **Audio Cache**: IndexedDB store (`audioCache.ts`).
- **Prefetch**: Proactive caching via intersection observers (`useAudioPrefetch`).
- **Service Worker**: `sw.js` (Cache v: `narvo-v5`).

## Accessibility
- Contrast: 4.5:1 minimum for body.
- Touch Target: 48px minimum.
- Reduced Motion: Always wrap decorative animations in media query guards.
