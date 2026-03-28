---
description: Scaffold a new React component following Narvo Design System v4
argument-hint: [ComponentName]
---
## Create Component: $ARGUMENTS

Create a new React component at `frontend/src/components/$ARGUMENTS.tsx` following Design System v4:

1. **TypeScript** functional component with typed Props interface
2. **Colour tokens** — never hardcode hex. Use CSS custom properties (`var(--color-cta)`, `var(--color-primary)`, etc.)
3. **Three-typeface system:**
   - `font-display` (Fraunces) for headings
   - `font-body` (Plus Jakarta Sans) for body copy, labels, button text
   - `font-mono` (Geist Mono) for timestamps, metadata, Truth Tag strings
4. **Type scale:** `16px × 1.250^n` — valid sizes: 10, 11, 13, 16, 20, 25, 31, 39, 49, 61px
5. **8px grid spacing:** All padding/margin from the scale (4, 8, 12, 16, 20, 24, 32, 40, 48, 64)
6. **Border radius:** Cards `rounded-[16px]`–`rounded-[20px]` · Buttons `rounded-full` · Inputs `rounded-[12px]`
   Note: `rounded-lg` = 0px in this config — always use arbitrary values
7. **Warm green shadows:** `rgba(24, 84, 42, ...)` tint — never cold grey or amber
8. **Component sizing:**
   - Primary CTA: `h-[52px] px-[32px] text-[15px]` (app) or `h-[56px] px-[36px] text-[16px]` (landing)
   - Ghost/secondary: `h-[44px]` (app) or `h-[48px]` (landing) — always matches primary height
   - Inputs: `h-[52px] px-[20px]` (app) or `h-[56px]` (landing) — never web-default 40px
   - Cards: 24px internal padding (app) or 32px (landing)
9. **Framer Motion:** Spring stiffness 260, damping 20. Press: `{ scale: 0.96 }`. Stagger: `delay: i * 0.06`
10. **Icons:** Phosphor Icons, 24px grid, 2px stroke
11. **Accessibility:** aria-labels, focus ring (`2px solid #F96015`, 2px offset), touch targets ≥48px
12. **Reduced motion:** Wrap all animations in `@media (prefers-reduced-motion: no-preference)`

After creating, confirm which v4 design tokens it uses and whether it follows the landing or app sizing register.
