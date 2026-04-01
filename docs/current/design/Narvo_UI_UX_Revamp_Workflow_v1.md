# Narvo UI/UX Revamp Workflow — v1

> **Version:** 1.0  
> **Date:** April 1, 2026  
> **Scope:** B2C frontend + landing page redesign inside `narvo_news/frontend`  
> **Mode:** Hybrid shell reset  
> **Depends on:** `Narvo_Design_Foundation_v5.md`, `Narvo_Component_Design_System_v1.md`, `Narvo_Emotional_Interaction_Guidelines_v1.md`, `MVP_Implementation_Entry_Spec.md`

---

## 1. Objective

Revamp the full B2C frontend so the product reflects the approved Narvo system:

- `Petrol Teal` as the structural core
- `Signal Vermilion` for action and urgency
- `Newsreader + Instrument Sans + Geist Mono`
- large UI on habit surfaces
- calm reading on detail and settings surfaces

This workflow keeps data/auth/audio/backend flows intact by default while rebuilding the visual and interaction layer.

---

## 2. Program Rules

1. Keep backend/API scope frozen unless a route contract blocks a redesign milestone.
2. Treat the current frontend as mixed-state, not trustworthy baseline.
3. Replace legacy visual systems route by route rather than layering new styling over old styling indefinitely.
4. Do not introduce parallel component families once a v5.1 contract exists.
5. Each milestone must leave the frontend in a more consistent state than before it started.

---

## 3. Execution Order

### Phase 0 — Baseline Stabilization

- Fix TypeScript errors
- Fix test harness blockers
- Fix obvious shell-level token misuse
- Identify legacy duplicates:
  - `MobileNav` vs `NavDock`
  - `DashboardSidebar` vs `DesktopRail`
  - `StoryCard` vs `StoryCardLarge` / `StoryCardCompact`

### Phase 1 — Source of Truth in Repo

- Maintain this workflow doc as the active implementation tracker
- Maintain the UI inventory and migration map
- Maintain the route acceptance checklist
- Keep the approved design docs canonical; do not fork design decisions in code comments

### Phase 2 — Shared Presentation Layer

- Normalize root tokens and Tailwind semantics
- Stabilize shell variables, radii, shadows, and motion primitives
- Rebuild shared primitives:
  - buttons
  - pills
  - shell surfaces
  - global navigation frames

### Phase 3 — First Milestone: Landing + App Shell

- Replace the landing page with the approved hero-first system
- Replace top-level app framing:
  - desktop rail
  - mobile dock
  - top header
  - authenticated shell spacing

### Phase 4 — Core Product Surfaces

Implement in this order:

1. dashboard / feed
2. morning briefing + player
3. news detail
4. listen
5. discover + library + search
6. settings + onboarding + auth
7. empty / error / loading / system states

### Phase 5 — Consolidation

- remove deprecated visual components
- remove v4 comments and naming from active files
- ensure one canonical component per job

---

## 4. Milestone Tracker

### Milestone A — Stabilize and expose the new system

- [x] establish v5.1 tokens in frontend root CSS
- [x] begin shell reset with `DesktopRail`, `NavDock`, and `DashboardHeader`
- [x] replace landing page with approved hero-first direction
- [x] add implementation-facing revamp documentation inside repo
- [ ] clear remaining TypeScript errors
- [ ] clear remaining active-route token drift

### Milestone B — Dashboard and player surfaces

- [ ] dashboard large-card shell
- [ ] filter pill rail
- [ ] briefing entry and scan-state truth cues
- [ ] persistent player cluster alignment

### Milestone C — Reading and detail surfaces

- [ ] calm article shell
- [ ] quieter action treatment
- [ ] truth / certainty / source modules aligned to reading tone

### Milestone D — Browse, utility, and support surfaces

- [ ] discover
- [ ] library
- [ ] search
- [ ] settings
- [ ] auth / onboarding
- [ ] empty / error / skeleton states

---

## 5. Review Gates

Every milestone must pass:

- `npm run typecheck`
- targeted route tests relevant to changed surfaces
- mobile and desktop visual verification
- no new legacy token drift introduced
- no duplicate navigation or card families introduced

---

## 6. First Milestone Deliverable

The first visible milestone is complete when:

- the landing page expresses the new brand and layout system
- the authenticated shell expresses the new rail + dock + header system
- top-level navigation no longer looks v4
- the next implementation wave can focus on route surfaces instead of shell recovery
