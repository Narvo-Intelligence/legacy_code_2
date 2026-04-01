# Narvo UI Route Acceptance Checklist — v1

> **Date:** April 1, 2026  
> **Purpose:** Route-by-route approval gate for the B2C revamp.

---

## Global Rules

Every redesigned route must satisfy these checks:

- uses approved v5.1 color and type system
- uses the correct scale for its surface type
- does not depend on legacy `rgb(var(--token))` misuse
- does not visually regress on mobile
- does not create duplicate shell behavior already owned globally

---

## 1. Landing

- hero is bold and dominant
- below-the-fold sections are calmer and more product-led
- CTA path is clear for both signed-out and signed-in states
- story/product blocks use the same system language as the app shell

## 2. Authenticated Shell

- desktop rail is dark, anchored, and premium
- mobile dock is floating, pill-based, and thumb-friendly
- top header feels integrated with the rail/dock language
- shell spacing is consistent across breakpoints

## 3. Dashboard

- large-card rhythm is visible
- filter rail uses semantic pill logic
- scan state shows trust and source cues
- no fintech/e-commerce feel

## 4. Morning Briefing and Player

- player controls are central and visually obvious
- active states use vermilion carefully
- queue and now-playing states feel premium, not noisy

## 5. News Detail

- reading remains calmer than dashboard/listen/discover
- typography leads
- proof modules are visible but restrained
- action controls do not overpower reading

## 6. Listen / Discover / Library / Search

- modular browsing is clear
- pills and groupings help scan, not decorate
- density is controlled where utility matters

## 7. Settings / Onboarding / Auth Utilities

- calmer utility shell
- same typography and tokens as the rest of the product
- less exaggerated large-UI scale than habit surfaces

## 8. System States

- empty, loading, and error states feel part of the same product
- no stale v4 styling remains
- no old typography stacks remain visible
