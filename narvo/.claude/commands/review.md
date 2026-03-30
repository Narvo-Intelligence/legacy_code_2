---
description: Review the current branch diff against Design System v4 — code quality, token compliance, accessibility, and security.
---
## Changes to Review

!`git diff --name-only main...HEAD`

## Detailed Diff

!`git diff main...HEAD`

Review against these v4 criteria:

1. **Colour compliance:** Are CSS token variables used? No hardcoded hex/RGB. Warm green shadows only (`rgba(24,84,42,...)`). No v3 amber tint (`rgba(139,90,43,...)`). No cold grey shadows. No v3 stale values (`#D4850A`, `#5B5BD6`, `#18967E`).
2. **Typography:** Correct typeface per layer? Fraunces for headings · Plus Jakarta Sans for body/buttons · Geist Mono for timestamps/stamps/meta. No General Sans, Satoshi, or Clash Display. Modular scale respected (16px × 1.250^n)?
3. **Spacing:** All values on the 8px grid (4, 8, 12, 16, 20, 24, 32, 40, 48, 64)?
4. **Radii:** Cards 16–20px · Buttons `rounded-full` · Inputs ≥12px. No `rounded-lg` (= 0px). No values below 12px on interactive elements.
5. **Sizing:** Primary CTA 52px (app) / 56px (landing). Ghost button matches primary height. Inputs ≥52px. Standard card play button 52px. No web-default 40px inputs or 44px CTAs (v3 sizes).
6. **Motion:** Spring stiffness 260, damping 20? Press scale 0.96? Stagger delay i×0.06? Reduced motion respected?
7. **Accessibility:** Touch targets ≥48px · aria labels · focus rings (`2px solid #F96015`) · reduced motion?
8. **Icons:** Phosphor (24px grid, 2px stroke)? Not mixing libraries?
9. **Backend:** /api/ prefix · tenacity retry · Supabase RLS · proper error handling?
10. **Security:** No exposed credentials, no .env values in code.
11. **Tone:** User-facing copy warm and human, not technical jargon.

Flag v3 remnants with severity:
🔴 Wrong colour system (amber/indigo palette, cold shadows)
🟡 Sizing regression (44px CTA, 40px inputs, wrong radii)
🔵 Typography layer mixing (Jakarta Sans on stamps, Geist Mono on body)
