---
paths:
  - "frontend/src/components/**/*"
  - "frontend/src/styles/**/*"
---
# Narvo Design System — Component Language v1.1

## Core Principles
- **Calm by Default**: Quiet, light surfaces with strong hierarchy and minimal noise.
- **Audio is Active**: Player, waveform, and briefing components can carry higher energy (Vermilion).
- **Large UI, Calm Reading**: 
  - **Large UI**: Use on Dashboard, Discover, Listen, and Player habit surfaces for better touch targets and clarity.
  - **Calm Reading**: Use on Article Detailed, Settings, and dense info blocks.
- **Deep Rail, Airy Canvas**: Desktop Narvo uses a dark anchored rail (`Deep Ink`) with a lighter main canvas (`Cloud White`).

## Locked Component Contracts
All new components MUST adhere to these architectural contracts:
- `NavDock`: Floating mobile bottom-nav with oversized touch targets. Teal emphasis.
- `DesktopRail`: Dark anchored navigation shell (`Deep Ink`). Visually stable.
- `FilterPill`: Large, segmented browsing controls for top-level feeds.
- `StatusPill`: (Saved, Live, Breaking, Downloaded, Syncing) — Geist Mono 10/700 with state colors.
- `TruthPill`: (Verified, Mixed, Disputed, Checking) — Semantic colors. Forensic, never over-designed.
- `StoryCardLarge`: High-importance editorial card with strong Newsreader headline and primary play action.
- `StoryCardCompact`: Repeatable, scans well in dense feeds. Scalable metadata row.
- `PlayerCluster`: Central transport control family (Play, Pause, Progress, Waveform). Higher Vermilion ratio.
- `LandingHeroFrame`: Bold, campaign-level hero transitioning into calm product details.

## Layout & Scale Tokens
- **Grid**: 8px baseline grid system.
- **Shells**: `--shell-radius: 32px`, `--rail-width: 232px`.
- **Cards**: `--card-radius: 24px`, `--card-padding-lg: 24px`.
- **Buttons**: `--button-lg: 56px`, `--button-md: 48px`.
- **Docks**: `--dock-height: 84px` (floating mobile container).

## Reference Document
Always consult `docs/current/design/Narvo_Design_Foundation_v5.md` for base tokens before modifying component styles.
