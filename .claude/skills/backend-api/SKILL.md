---
name: backend-api
description: >
  Narvo FastAPI backend patterns, Supabase integration, and content pipeline.
  Use PROACTIVELY when creating or modifying backend endpoints, database queries,
  AI pipeline code, TTS integration, or cron jobs. Auto-trigger when working with
  .py files in backend/, or when the user mentions API, endpoint, Supabase, Gemini,
  TTS, Morning Briefing, or Truth Tags.
allowed-tools: Read, Grep, Glob, Write, Edit, Bash
---

# Narvo Backend — Quick Reference

## Endpoint Template

```python
from fastapi import APIRouter, HTTPException, Depends
import tenacity

router = APIRouter(prefix="/api")

@router.get("/example")
@tenacity.retry(stop=tenacity.stop_after_attempt(3), wait=tenacity.wait_exponential(min=1, max=4))
async def get_example(user_id: str = Depends(get_current_user)):
    try:
        response = supabase.table("example") \
            .select("*") \
            .eq("user_id", user_id) \
            .execute()
        return {"data": response.data}
    except Exception as e:
        raise HTTPException(status_code=500, detail="Failed to fetch data")
```

## Content Pipeline

1. **Sources:** RSS feeds, local news APIs → raw articles
2. **Synthesis:** Gemini transforms raw articles into narrative stories
3. **Truth Tags:** Every synthesised story must include source attribution and verification status
4. **TTS:** YarnGPT (regional accents: Pidgin, Yorùbá, Hausa, Igbo) → OpenAI fallback
5. **Caching:** Pre-generate Morning Briefing audio at 5am via cron

## Supabase Patterns

```python
# Read with RLS (user-scoped)
response = supabase.table("stories").select("*").eq("user_id", user_id).execute()

# Insert
response = supabase.table("stories").insert({"title": title, "user_id": user_id}).execute()

# Realtime subscription (frontend-side, not backend)
# Backend uses service role key — bypasses RLS when needed for admin operations
```

## Environment

Required: `SUPABASE_URL`, `SUPABASE_KEY`, `GEMINI_API_KEY`, `OPENAI_API_KEY`, `FRONTEND_ORIGIN`
Optional: `YARNGPT`, `SENTRY_DSN`
