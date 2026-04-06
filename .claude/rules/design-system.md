---
paths:
  - "frontend/components/**/*"
  - "frontend/app/**/*.tsx"
  - "frontend/app/**/*.css"
---
# Narvo Design System — Component Language v1.1

## Core Principles
- **Calm by Default**: Quiet, light surfaces with strong hierarchy and minimal noise.
- **Audio is Active**: Player, waveform, and briefing components can carry higher energy (Vermilion).
- **Large UI, Calm Reading**: 
  - **Large UI**: Use on Dashboard, Discover, Listen, and Player habit surfaces for better touch targets and clarity.
  - **Calm Reading**: Use on Article Detail, Settings, and dense info blocks.
- **Deep Rail, Airy Canvas**: Desktop Narvo uses a dark anchored rail (`Deep Ink`) with a lighter main canvas (`Cloud White`).

## Locked Component Contracts
All new components MUST adhere to these architectural contracts:
- `MobileNavDock` (`components/app/MobileNavDock.tsx`): Floating mobile bottom-nav with oversized touch targets. Teal emphasis.
- `DesktopRail` (`components/app/DesktopRail.tsx`): Dark anchored navigation shell (`Deep Ink`). 4.5rem collapsed / 15.5rem expanded.
- `AuthenticatedAppShell` (`components/app/AuthenticatedAppShell.tsx`): Wraps Rail + Dock + Header.
- `FilterPillGroup` (`components/FilterPillGroup.tsx`): Large, segmented browsing controls for top-level feeds.
- `StatusPill` (`components/StatusPill.tsx`): (Saved, Live, Breaking, Downloaded, Syncing) — Geist Mono 10/700 with state colors.
- `TruthTag` (`components/TruthTag.tsx`): Verified/Mixed/Disputed. Semantic. Never over-designed.
- `StoryCardLarge` (`components/StoryCardLarge.tsx`): High-importance editorial card with strong Newsreader headline and primary play action.
- `StoryNewsListCard` (`components/StoryNewsListCard.tsx`): Repeatable, scans well in dense feeds.
- `AudioPlayer` (`components/AudioPlayer.tsx`): Persistent bottom player with `AudioPlayerContext`.
- `NarvoClientBootstrap` (`components/NarvoClientBootstrap.tsx`): Client-only global bootstrap (analytics, session restore).

## Nav Items
Canonical destinations defined in `components/app/nav-items.ts`:
Home (`/dashboard`) · Briefing (`/briefing`) · Listen (`/listen`) · Search (`/search`) · Library (`/library`)

## Layout Tokens
- **Grid**: 8px baseline grid system.
- **Shell**: `--shell-radius: 32px`, DesktopRail: `lg:ml-[4.5rem] xl:ml-[15.5rem]`.
- **Cards**: `--card-radius: 24px`, `--card-padding-lg: 24px`.
- **Buttons**: `--button-lg: 56px`, `--button-md: 48px`.
- **Docks**: `--dock-height: 84px` (floating mobile container).
- **Bottom clearance**: `pb-[calc(5.75rem+env(safe-area-inset-bottom,0px))]` on scrollable areas.

## Copy Strings
All user-facing strings must come from `lib/narvo-app-copy.ts` (COPY object). Never hardcode English strings inline.

## Reference Documents
- `docs/current/design/Narvo_Design_Foundation_v5.md` — colour, type, spacing foundation
- `docs/current/design/Narvo_Component_Design_System_v1.md` — component spec
- `docs/current/design/Narvo_UI_UX_Revamp_Workflow_v1.md` — active revamp phase tracker
- `docs/current/design/Narvo_UI_Inventory_and_Migration_Map_v1.md` — migration status
