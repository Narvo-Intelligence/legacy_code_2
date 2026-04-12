# Narvo

Audio-first news platform for African markets. Narvo clusters daily stories, synthesizes broadcast-style narratives, generates multilingual audio, and serves a Next.js PWA with Morning Briefing, Truth Tag, and offline playback.

## Current Structure

- `frontend/` — Next.js 15 App Router consumer app
- `backend/` — FastAPI API, content pipeline, briefing generation, TTS, and `/api/me/*`
- `investor/` — separate investor site
- `docs/NARVO_APP_ROUTES.md` — canonical current route map for the shipping app
- `docs/NARVO_MVP_SCOPE_LOCK.md` — current launch scope lock and release boundary

## Quick Start

### Backend

```bash
cd backend
pip install -r requirements.txt
cp .env.example .env
uvicorn server:app --host 0.0.0.0 --port 8000
```

- Health: `http://localhost:8000/api/health`
- API docs: `http://localhost:8000/docs`

### Frontend

```bash
cd frontend
npm install
cp .env.example .env.local
npm run dev
```

- App: `http://localhost:3000`
- Build: `npm run build`
- Start production build locally: `npm run start`

### Investor Site

```bash
cd investor
npm install
npm run dev
```

## Environment

- Backend variables live in `backend/.env.example`
- Frontend browser variables live in `frontend/.env.example`
- Only `NEXT_PUBLIC_*` frontend variables are exposed to the browser

## Key Docs

- [Current Route Map](docs/NARVO_APP_ROUTES.md)
- [Current MVP Scope Lock](docs/NARVO_MVP_SCOPE_LOCK.md)
- [Technical Documentation](docs/technical/Narvo_Technical_Documentation.md)
- [Project Configuration](docs/configuration/Project_Configuration.md)

## Stack

| Layer | Technology |
| --- | --- |
| Frontend | Next.js 15, React 19, Tailwind CSS v4 |
| Backend | FastAPI, Python 3.12 |
| Auth / Database | Supabase |
| Primary LLM | Gemini |
| Fallback / Secondary LLM | Groq |
| Primary TTS | YarnGPT |
| Fallback TTS | Google Cloud TTS, then OpenAI |
| Frontend Hosting | Vercel |
| Backend Hosting | Google Cloud Run |
