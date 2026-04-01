# Narvo UI Inventory and Migration Map — v1

> **Date:** April 1, 2026  
> **Purpose:** Track every B2C surface and classify whether we keep data flows but rebuild the UI, refactor partial v5.1 work, or remove legacy duplicates.

---

## 1. Route Inventory

| Route / Surface | Current state | Data posture | UI action |
|---|---|---|---|
| `/` Landing | Legacy v4 marketing logic; now replaced with first v5.1 shell | Keep public reads | Rebuild complete |
| `/dashboard` | Mixed state; partial v5.1 cards and shells | Keep SWR/data hooks | Rebuild surface |
| `/briefing` | Mixed state | Keep briefing API contract | Rebuild surface |
| `/listen` | Legacy styling with older comments and tone | Keep audio/history hooks | Rebuild surface |
| `/news/:id` | Functionally rich, visually mixed | Keep article/truth/audio hooks | Rebuild surface |
| `/discover` | Unknown consistency; likely mixed | Keep existing data contract | Rebuild surface |
| `/library` | Likely mixed utility shell | Keep bookmarks/offline flows | Rebuild surface |
| `/search` | Older utility styling | Keep search API usage | Rebuild surface |
| `/settings` | Functional but visually older utility layout | Keep settings/preferences API usage | Rebuild surface |
| `/onboarding` | Not yet aligned to final system | Keep current onboarding logic | Rebuild surface |
| `/auth`, `/forgot-password` | Utility/auth surfaces | Keep auth flow | Rebuild surface |
| `404 / 500 / empty / skeleton / error` | Mixed fallback styling | Keep behavior | Rebuild surface |

---

## 2. Shell and Navigation Inventory

| Component | Current status | Action |
|---|---|---|
| `DashboardLayout` | Partial v5.1 shell | Refactor forward |
| `DashboardHeader` | Rebuilt toward v5.1 shell | Keep and refine |
| `DesktopRail` | Rebuilt as wave-1 shell anchor | Keep and refine |
| `NavDock` | Rebuilt as wave-1 mobile anchor | Keep and refine |
| `MobileNav` | Legacy duplicate | Compatibility shim now; remove later |
| `DashboardSidebar` | Legacy duplicate | Replace with `DesktopRail`; remove later |

---

## 3. Component Family Migration

| Legacy / existing | Target family | Status |
|---|---|---|
| `StoryCard.tsx` | `StoryCardLarge`, `StoryCardCompact` | Legacy still present; migrate and remove |
| `TruthTag.tsx` | `TruthPill` + calmer truth module | Keep behavior; redesign presentation |
| `AudioPlayerBar.tsx` | `PlayerCluster` + persistent player shell | Refactor in upcoming milestone |
| `AudioPlayer.tsx` | full player shell | Refactor in upcoming milestone |
| `ThemeToggle.tsx` | keep behavior; align shell visuals | Refactor forward |
| `EmptyState`, `ErrorState`, `Skeleton` | same behaviors with v5.1 visuals | Rebuild later wave |

---

## 4. Styling Drift Inventory

### Active issues already identified

- `rgb(var(--color-*` patterns still exist against hex-based CSS vars in multiple active files
- v4 naming and commentary still remain in some route files
- duplicate shell/nav components remain in repo
- some components rely on compatibility aliases rather than clean v5.1 tokens

### Priority cleanup order

1. shell primitives and global navigation
2. active route shells
3. story and player families
4. fallback/system states
5. remove legacy duplicates

---

## 5. Keep / Refactor / Replace / Delete

### Keep data, rebuild UI

- auth context
- audio context
- SWR data fetch patterns
- API client
- storage/background sync utilities

### Refactor forward

- `DashboardLayout`
- `DashboardHeader`
- `DesktopRail`
- `NavDock`
- token root in `index.css`
- Tailwind semantic layer

### Replace

- landing page implementation
- dashboard surface layout
- briefing surface layout
- listen surface layout
- search surface layout
- settings surface layout

### Delete after migration

- `MobileNav`
- `DashboardSidebar`
- legacy `StoryCard` once all callers are moved
- stale v4 comments and token references in active surfaces
