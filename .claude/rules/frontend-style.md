---
paths:
  - "frontend/src/**/*.tsx"
  - "frontend/src/**/*.ts"
  - "frontend/src/**/*.css"
---
# Frontend Code Style — Narvo Design Foundation v5

## Component Patterns
- Functional components with hooks. No class components.
- Framer Motion for all animations. Spring: `{ type: "spring", stiffness: 260, damping: 20 }`.
- Press feedback: `whileTap: { scale: 0.96 }`.
- Duration tokens: 50ms (micro), 100ms (toggle), 200ms (hover), 300ms (modal), 400ms (page).

## Colour & Styling (v5 Approved) — *Implementation Pending*
- Primary: `Petrol Teal (#0F5F73)` — brand anchor, navigation, structural surfaces.
- Accent/Action: `Signal Vermilion (#F04B24)` — playback, CTA, breaking, urgency.
- Surfaces: `Cloud White (#F6F8FB)` (bg), `Cool Mist (#EEF3F7)` (cards/shells).
- Text: `Deep Ink (#17324A)` (headlines), `Slate Mist (#6C7F93)` (secondary body).
- Soft Fills: Use `rgba` tints (10-14%) of primary/alert for hover and chips.

## Typography (v5 Approved) — *Implementation Pending*
- **Display/Headlines**: `Newsreader` — Editorial authority, trusted storytelling.
- **Body/UI**: `Instrument Sans` — Modern clarity, product speed.
- **Metadata/Stamps**: `Geist Mono` — Precision, truth, intelligence markers.
- Never use `Newsreader` for body. Never use `Geist Mono` for paragraphs.

## Component Sizing & Layout
- 8px baseline grid system.
- Radii: `10px` (sm), `14px` (md), `18px` (lg), `24px` (xl), `30px` (2xl).
- Persistent Player: Bottom-docked, clears `MobileNav` (total ~116px clearance).
- Page Padding: `pb-32` on mobile to clear player + nav.

## Performance & Offline
- Audio Cache: IndexedDB store for offline MP3 blobs via `audioCache.ts`.
- Prefetch: `useAudioPrefetch` for proactive TTS caching on viewport intersection.
- Service Worker: `sw.js` (Cache v: `narvo-v5`). Skip cross-origin requests.

## Accessibility
- Contrast: 4.5:1 minimum for body text.
- Reduced motion: Always wrap decorative animations in media query guards.
- Touch target: 48px minimum for all interactive elements.
