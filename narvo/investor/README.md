# Narvo Investor Site

Standalone investor site served at `investor.narvo.news`.

This project reuses the main Narvo design system (`frontend/src/index.css`) and shared utilities via Vite aliases.

## Getting Started

1. Run `npm install`
2. Run `npm run dev`

### Routes

- `/` — Investor landing (Board / Pitch CTA)
- `/board` — Investor board (metrics)
- `/pitch` — Pitch deck

### Backend

Set `VITE_BACKEND_URL` if the investor app is served on a different origin than the API.
