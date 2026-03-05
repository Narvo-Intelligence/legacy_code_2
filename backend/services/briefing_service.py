# Briefing Service for Morning Briefing generation (Supabase)
import logging
import re
from datetime import datetime, timezone
from typing import Dict, List, Optional, Tuple

from lib.supabase_db import get_supabase_db
from services.news_service import get_cached_all_news, fetch_all_news
from services.tts_service import generate_tts_audio
from services.llm_gemini import generate_gemini

logger = logging.getLogger(__name__)

# Global default user_id for cron-generated briefings
BRIEFING_GLOBAL_USER_ID = ""


def _compute_story_segments(script: str, num_stories: int) -> List[Dict]:
    """Compute character offsets per story from script. Uses 'Story N:' markers or paragraph splits."""
    segments = []
    if not script or num_stories <= 0:
        return segments
    # Match "Story 1:", "Story 2:", ... (case-insensitive, flexible spacing)
    pattern = re.compile(r"\n\s*Story\s+(\d+)\s*[.:]\s*", re.IGNORECASE)
    matches = list(pattern.finditer(script))
    if len(matches) >= num_stories:
        for i in range(num_stories):
            start = matches[i].start()
            end = matches[i + 1].start() if i + 1 < len(matches) else len(script)
            segments.append({"start_char": start, "length": end - start})
    else:
        # Fallback: split script into N+2 parts (intro, N stories, outro) by paragraph blocks
        blocks = re.split(r"\n\s*\n", script)
        if len(blocks) <= 1:
            total = len(script)
            chunk = max(1, total // max(1, num_stories))
            for i in range(num_stories):
                segments.append({"start_char": i * chunk, "length": chunk if i < num_stories - 1 else total - (num_stories - 1) * chunk})
        else:
            # First block = intro; last = outro; middle = stories
            intro_len = len(blocks[0]) + 2
            outro_len = len(blocks[-1]) + 2 if len(blocks) > 1 else 0
            mid_blocks = blocks[1:-1] if len(blocks) > 2 else blocks[1:]
            per_story = max(1, len(mid_blocks) // max(1, num_stories))
            offset = intro_len
            for i in range(num_stories):
                start = offset
                take = mid_blocks[i * per_story:(i + 1) * per_story] if per_story else mid_blocks[i : i + 1]
                length = sum(len(b) + 2 for b in take)
                segments.append({"start_char": start, "length": length})
                offset += length
    return segments


async def generate_briefing_script(stories: List[Dict]) -> Tuple[str, List[Dict]]:
    """Generate a broadcast script from top stories using Gemini. Returns (script, story_segments)."""
    system = """You are a professional broadcast journalist for Narvo. Create a concise 3-minute radio-style briefing script.

Requirements:
- Open with a brief greeting (refer yourself as "your Narvo Briefing")
- For each story, start a new paragraph with exactly "Story N:" where N is 1, 2, 3, 4, or 5 (e.g. "Story 1:", "Story 2:").
- Cover each story in 2-3 sentences
- Use smooth transitions
- End with a short sign-off (refer yourself as "your Narvo Briefing")
- Keep it under 500 words
- Plain text only, no markdown"""
    stories_text = "\n\n".join([
        f"**{(s.get('title') or '')[:100]}** ({(s.get('source') or '')})\n{(s.get('summary') or '')[:200]}"
        for s in stories[:5]
    ])
    user = f"Create a brief morning news script:\n\n{stories_text}"
    result = None
    try:
        response = await generate_gemini(system, user)
        if response and isinstance(response, str):
            result = response.strip()
        if result:
            segments = _compute_story_segments(result, min(5, len(stories)))
            return result, segments
    except Exception as e:
        logger.error("Error generating briefing script: %s", e)
    script = f"Good morning, this is your Narvo Briefing for {datetime.now().strftime('%A, %B %d, %Y')}.\n\n"
    for i, story in enumerate(stories[:5], 1):
        title = (story.get("title") or "")[:100]
        summary = (story.get("summary") or "")[:150]
        script += f"Story {i}: {title}. {summary}.\n\n"
    script += "That's all for this briefing. Stay informed with Narvo."
    segments = _compute_story_segments(script, min(5, len(stories)))
    return script, segments


async def generate_briefing(
    voice_id: str = "nova",
    force_regenerate: bool = False,
    user_id: Optional[str] = None,
) -> Optional[Dict]:
    """Generate or retrieve morning briefing. user_id=None or '' = global default; set for personalized."""
    now = datetime.now(timezone.utc)
    today_date = now.strftime("%Y-%m-%d")
    uid = (user_id or "").strip() or BRIEFING_GLOBAL_USER_ID
    db = get_supabase_db()

    if not force_regenerate:
        q = db.table("briefings").select("*").eq("date", today_date)
        if uid:
            q = q.eq("user_id", uid)
        else:
            q = q.eq("user_id", BRIEFING_GLOBAL_USER_ID)
        r = q.limit(1).execute()
        if r.data and len(r.data) > 0:
            return _briefing_row_to_dict(r.data[0])

    if uid:
        from services.recommendation_service import get_recommendations
        all_news = await get_cached_all_news()
        recs = await get_recommendations(uid, all_news, limit=10)
        top_stories = [r for r in recs.get("recommendations", [])][:5]
        if not top_stories:
            top_stories = all_news[:5]
    else:
        all_news = await fetch_all_news(limit=10)
        top_stories = all_news[:5]

    if not top_stories:
        return None

    script, story_segments = await generate_briefing_script(top_stories)
    audio_url = await generate_tts_audio(script[:2500], voice_id)

    briefing_data = {
        "id": f"briefing-{today_date}" + (f"-{uid[:8]}" if uid else ""),
        "date": today_date,
        "user_id": uid,
        "title": f"Morning Briefing - {now.strftime('%B %d, %Y')}",
        "generated_at": now.isoformat(),
        "duration_estimate": "~3 minutes",
        "stories": [
            {
                "id": s.get("id"),
                "title": (s.get("title") or "")[:100],
                "summary": (s.get("summary") or "")[:150] + "..." if len(s.get("summary") or "") > 150 else (s.get("summary") or ""),
                "source": s.get("source"),
                "category": s.get("category", "General"),
            }
            for s in top_stories
        ],
        "script": script,
        "audio_url": audio_url,
        "voice_id": voice_id,
        "story_segments": story_segments,
    }
    db.table("briefings").upsert(briefing_data, on_conflict="date,user_id").execute()
    return briefing_data


def _briefing_row_to_dict(row: dict) -> dict:
    out = dict(row)
    for k in ("generated_at",):
        if k in out and hasattr(out[k], "isoformat"):
            out[k] = out[k].isoformat()
    return out


def get_latest_briefing(user_id: Optional[str] = None) -> Optional[Dict]:
    """Get the most recent briefing. user_id=None or '' = global default."""
    db = get_supabase_db()
    uid = (user_id or "").strip() or BRIEFING_GLOBAL_USER_ID
    q = db.table("briefings").select("*").eq("user_id", uid).order("date", desc=True).limit(1)
    r = q.execute()
    if not r.data:
        return None
    return _briefing_row_to_dict(r.data[0])


def get_briefing_history(
    limit: int = 30,
    skip: int = 0,
    user_id: Optional[str] = None,
) -> Dict:
    """Get historical briefings list. user_id=None or '' = global default."""
    db = get_supabase_db()
    uid = (user_id or "").strip() or BRIEFING_GLOBAL_USER_ID
    q = db.table("briefings").select("id, date, title, generated_at, duration_estimate, stories, voice_id, story_segments").eq("user_id", uid).order("date", desc=True).range(skip, skip + limit - 1)
    r = q.execute()
    count_q = db.table("briefings").select("id", count="exact").eq("user_id", uid).execute()
    total = count_q.count if getattr(count_q, "count", None) is not None else len(count_q.data or [])
    briefings = [_briefing_row_to_dict(x) for x in (r.data or [])]
    return {"briefings": briefings, "total": total}


def get_briefing_by_date(date: str, user_id: Optional[str] = None) -> Optional[Dict]:
    """Get a specific briefing by date. user_id=None or '' = global default."""
    db = get_supabase_db()
    uid = (user_id or "").strip() or BRIEFING_GLOBAL_USER_ID
    r = db.table("briefings").select("*").eq("date", date).eq("user_id", uid).limit(1).execute()
    if not r.data:
        return None
    return _briefing_row_to_dict(r.data[0])
