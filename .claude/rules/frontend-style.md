---
paths:
  - "frontend/src/**/*.tsx"
  - "frontend/src/**/*.ts"
  - "frontend/src/**/*.css"
---
# Frontend Code Style — Design System v3

## Component Patterns
- Functional components with hooks. No class components.
- Framer Motion for all animations. Spring: `{ type: "spring", stiffness: 260, damping: 20 }`.
- Press feedback: `whileTap: { scale: 0.96 }` (was 0.92 in v2).
- Stagger: `delay: i * 0.06`. Enter: `{ opacity: 0, y: 12 } → { opacity: 1, y: 0 }`.
- Duration tokens: 50ms (micro), 100ms (toggle), 200ms (hover), 300ms (modal), 400ms (page).

## Colour & Styling
- Tailwind CSS utility-first + OKLCH custom properties.
- Never hardcode hex or RGB — use token references (`bg-primary`, `text-text-primary`).
- Radii: `rounded-sm` (8px), `rounded-md` (12px), `rounded-lg` (16px), `rounded-xl` (20px).
- Shadows must be warm amber-tinted in light mode. Dark mode: surface tint elevation only.
- 60-30-10 colour distribution: 60% bg/surface, 30% supporting, 10% primary/accent.

## Typography
- `font-display` for headings (General Sans 600–700).
- `font-body` for body/UI (General Sans 400–500).
- `font-mono` for technical (Geist Mono).
- Type scale: `Size(n) = 16px × 1.250^n`. Body 16px → H3 20px → H2 25px → H1 31px → Display 39px.

## Icons
- Phosphor Icons (24px grid, 2px stroke). Import from `@phosphor-icons/react`.
- Alternative: Lucide. Never mix icon libraries within a view.
- Icon buttons: 48px touch target minimum, even if icon is visually 24px.

## Accessibility
- WCAG 2.1 AA. 4.5:1 for normal text, 3:1 for large text/UI.
- Focus ring: 2px solid primary, 2px offset.
- Reduced motion: respect `prefers-reduced-motion`.
- Touch targets: 48px minimum.
- Font scaling: respect `--font-scale` variable.
- `aria-label` on all interactive elements without visible text labels.

## Performance
- LCP < 2.5s on 3G. Lazy load images and non-critical routes.
- Preconnect hints for font CDNs in `index.html`.
- Only animate `transform` and `opacity` for GPU-accelerated performance.
