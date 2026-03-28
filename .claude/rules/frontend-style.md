---
paths:
  - "frontend/src/**/*.tsx"
  - "frontend/src/**/*.ts"
  - "frontend/src/**/*.css"
---
# Frontend Code Style — Design System v4

## Component Patterns
- Functional components with hooks. No class components.
- Framer Motion for all animations. Spring: `{ type: "spring", stiffness: 260, damping: 20 }`.
- Press feedback: `whileTap: { scale: 0.96 }`.
- Stagger: `delay: i * 0.06`. Enter: `{ opacity: 0, y: 12 } to { opacity: 1, y: 0 }`.
- Duration tokens: 50ms (micro), 100ms (toggle), 200ms (hover), 300ms (modal), 400ms (page).

## Colour & Styling
- Tailwind CSS utility-first + CSS custom properties.
- Never hardcode hex or RGB — use token references (`bg-[var(--color-cta)]`, `text-[var(--color-text-primary)]`).
- Radii: `rounded-[8px]` (sm), `rounded-[12px]` (md), `rounded-[16px]` (lg), `rounded-[20px]` (xl).
  Note: `rounded-lg` = `0px` in this Tailwind config. Always use arbitrary values.
- Shadows must be warm green-tinted in light mode: `rgba(24, 84, 42, ...)`.
  Never: `rgba(0,0,0,...)` or `rgba(139, 90, 43, ...)` (v3 amber tint — stale).
- Dark mode: surface tint elevation only — no box-shadows.

## Typography
- `font-display` (Fraunces) for all headings H1–H4 and display text.
- `font-body` (Plus Jakarta Sans) for body copy, UI labels, nav, button text.
- `font-mono` (Geist Mono) for timestamps, metadata stamps, Truth Tag strings, source credits.
- Type scale: `Size(n) = 16px × 1.250^n`.
- Never use `font-display` for body. Never use `font-body` for meta stamps. Never use General Sans.

## Component Sizing
- Primary CTA buttons: `h-[56px] px-[36px] text-[16px]` (landing) / `h-[52px] px-[32px] text-[15px]` (app).
- Ghost buttons always match primary height in their context.
- Inputs: `h-[56px] px-[20px]` (landing) / `h-[52px] px-[20px]` (app). Never web-default 40px.
- Cards: 24px internal padding (app), 32px (landing).

## Icons
- Phosphor Icons (24px grid, 2px stroke). Import from `@phosphor-icons/react`.
- Alternative: Lucide. Never mix icon libraries within a view.
- Icon buttons: 48px touch target minimum.

## Accessibility
- WCAG 2.1 AA. 4.5:1 for normal text, 3:1 for large text/UI.
- Focus ring: `2px solid #F96015` (Crisp Carrot), 2px offset.
- Reduced motion: always wrap animations in `prefers-reduced-motion: no-preference`.
- Touch targets: 48px minimum.
- `aria-label` on all interactive elements without visible text labels.

## Performance
- LCP < 2.5s on 3G. Lazy load images and non-critical routes.
- Preconnect hints for Google Fonts in `index.html`.
- Only animate `transform` and `opacity` for GPU-accelerated performance.
