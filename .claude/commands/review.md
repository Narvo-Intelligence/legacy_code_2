---
description: Review the current branch diff against Design System v3 — code quality, OKLCH compliance, accessibility, and security.
---
## Changes to Review

!`git diff --name-only main...HEAD`

## Detailed Diff

!`git diff main...HEAD`

Review against these v3 criteria:

1. **Colour compliance:** Are OKLCH tokens used? No hardcoded hex/RGB. Warm amber-tinted shadows only (B2C). No grey shadows.
2. **Typography:** Modular scale respected (16px × 1.250^n)? General Sans for display/body, Geist Mono for technical? Correct font-display/font-body/font-mono classes?
3. **Spacing:** All values on the 8px grid (0, 2, 4, 8, 12, 16, 20, 24, 32, 40, 48, 64)?
4. **Radii:** Cards 16–20px, buttons 12px, inputs 8px? No 0px or arbitrary values?
5. **Motion:** Spring stiffness 260, damping 20? Press scale 0.96? Stagger delay i×0.06?
6. **Accessibility:** Touch targets ≥48px, aria labels, focus rings (2px primary), reduced motion?
7. **Icons:** Phosphor (24px grid, 2px stroke)? Not mixing libraries?
8. **Backend:** /api/ prefix, tenacity retry, Supabase RLS, proper error handling?
9. **Security:** No exposed credentials, no .env values in code
10. **Tone:** User-facing copy is warm and human, not technical jargon

Give specific, actionable feedback per file. Flag any v2 remnants (old hex colours, Clash Display/Satoshi fonts, old shadow values).
