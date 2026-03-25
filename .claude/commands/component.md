---
description: Scaffold a new React component following Narvo Design System v3
argument-hint: [ComponentName]
---
## Create Component: $ARGUMENTS

Create a new React component at `frontend/src/components/$ARGUMENTS.tsx` following Design System v3:

1. **TypeScript** functional component with typed Props interface
2. **OKLCH tokens** — never hardcode colours. Use `bg-primary`, `text-text-primary`, etc.
3. **Modular scale typography:** `16px × 1.250^n`. Use font-display (General Sans) for headings, font-body for text, font-mono for technical.
4. **8px grid spacing:** All padding/margin values from the scale (0, 2, 4, 8, 12, 16, 20, 24, 32, 40, 48, 64)
5. **Border radius:** Cards 16–20px, buttons 12px, inputs 8px
6. **Warm amber shadows:** Level 2 for standard cards, level 3 for raised cards
7. **Framer Motion:** Spring stiffness 260, damping 20. Press: `{ scale: 0.96 }`. Stagger: `delay: i * 0.06`
8. **Icons:** Phosphor Icons, 24px grid
9. **Accessibility:** aria-labels, focus ring (2px primary, 2px offset), touch targets ≥48px
10. **Reduced motion:** Respect `prefers-reduced-motion`

After creating, confirm which design tokens and mathematical foundations it uses.
