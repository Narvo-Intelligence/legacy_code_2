# Narvo

**Broadcast-grade news platform** — AI-produced narratives, regional TTS, and the Truth Tag. Built for African markets with a Swiss Grid design.

## Quick start

### Backend (FastAPI)

```bash
cd backend
pip install -r requirements.txt
cp .env.example .env   # fill in Supabase, Gemini, OpenAI keys
uvicorn server:app --host 0.0.0.0 --port 8000
```

- Health: [http://localhost:8000/api/health](http://localhost:8000/api/health)  
- API docs: [http://localhost:8000/docs](http://localhost:8000/docs)

### Frontend (Vite + React)

```bash
cd frontend
npm install
cp .env.example .env   # set VITE_BACKEND_URL, VITE_PUBLIC_URL, Supabase
npm start
```

- App: [http://localhost:3000](http://localhost:3000)  
- Build: `npm run build` → `build/`. Preview: `npm run preview`.

### Environment

- **Backend:** See `backend/.env.example` (Supabase, GEMINI_API_KEY, OPENAI_API_KEY, optional YARNGPT, FRONTEND_ORIGIN for CORS, optional SENTRY_DSN).
- **Frontend:** See `frontend/.env.example` (VITE_BACKEND_URL, VITE_PUBLIC_URL, Supabase auth, optional VITE_SENTRY_DSN for error tracking). Only `VITE_*` vars are exposed to the client.

## Docs

- [Technical overview & architecture](docs/technical/Narvo_Technical_Documentation.md)
- [Backend deploy & domain](docs/configuration/Backend_Deploy_And_Domain.md)
- [Morning Briefing cron & push](docs/configuration/Briefing_Cron_And_Push.md) — QStash 5am pre-generate, push “brief ready”
- [Render keep-alive (free tier)](docs/configuration/Render_Keep_Alive.md) — cron ping so backend doesn’t sleep
- [Observability and service limits](docs/configuration/Observability_And_Services.md) — Status page, Sentry error tracking, Supabase inactivity pause
- [API & PWA versioning](docs/technical/API_And_PWA_Versioning.md)

## Stack

| Layer        | Tech              |
|-------------|-------------------|
| Frontend    | React (Vite), PWA  |
| Backend     | FastAPI            |
| Persistence | Supabase (Postgres)|
| Auth        | Supabase Auth     |
| AI / TTS    | Gemini, YarnGPT, OpenAI |
