# Briefing Service for Morning Briefing generation (Supabase)
import html
import logging
import re
import secrets
from datetime import datetime, timezone
from typing import Dict, List, Optional, Tuple

from lib.supabase_db import get_supabase_db
from lib.text_utils import clean_text_for_display, clean_text_for_briefing, strip_urls_and_markup
from services.news_service import get_cached_all_news, fetch_all_news
from services.llm_gemini import generate_gemini
from services.yarngpt_service import generate_tts as yarn_generate_tts, resolve_tts_language_for_voice

logger = logging.getLogger(__name__)

# Global default user_id for cron-generated briefings
BRIEFING_GLOBAL_USER_ID = ""

# Briefing shape: random count in [min, max] when the pool is large enough; duration from script (clamped).
BRIEFING_STORY_MIN = 5
BRIEFING_STORY_MAX = 8
BRIEFING_POOL_LIMIT = 20
BRIEFING_MINUTES_LOW = 3
BRIEFING_MINUTES_HIGH = 12
BRIEFING_WPM = 130
BRIEFING_SCRIPT_WORD_MAX = 1700


def _choose_story_count(n_available: int) -> int:
    """Pick how many stories to include (5–8 when possible)."""
    if n_available <= 0:
        return 0
    if n_available < BRIEFING_STORY_MIN:
        return n_available
    high = min(BRIEFING_STORY_MAX, n_available)
    return secrets.randbelow(high - BRIEFING_STORY_MIN + 1) + BRIEFING_STORY_MIN


def _duration_estimate_from_script(script: str) -> str:
    """~N min from word count / WPM, clamped to BRIEFING_MINUTES_LOW..HIGH."""
    if not script or not script.strip():
        return f"~{max(BRIEFING_MINUTES_LOW, min(BRIEFING_MINUTES_HIGH, 8))} min"
    words = len(re.findall(r"\b\w+\b", script))
    if words < 1:
        words = max(1, len(script) // 5)
    mins = round(words / BRIEFING_WPM)
    mins = max(BRIEFING_MINUTES_LOW, min(BRIEFING_MINUTES_HIGH, mins))
    return f"~{mins} min"


def _strip_story_numbering(text: str) -> str:
    """Remove 'Story N:' or 'Story N.' at start of lines so transcript reads like a broadcast."""
    if not text:
        return text
    return re.sub(
        r"(?m)^\s*Story\s+\d+\s*[.:]\s*", "", text, flags=re.IGNORECASE
    ).strip()


def _compute_story_segments(script: str, num_stories: int) -> List[Dict]:
    """Compute character offsets per story from script. Uses paragraph structure: intro, N story blocks, outro.
    Uses exact positions in the original script so slices align with story seeking and display."""
    segments = []
    if not script or num_stories <= 0:
        return segments
    # Find block boundaries in the original script (no stripping) so offsets match script.slice()
    matches = list(re.finditer(r"\n\s*\n", script))
    # Block i is from (0 or matches[i-1].end()) to (matches[i].start() or len(script))
    block_ranges: List[Tuple[int, int]] = []
    for i in range(len(matches) + 1):
        start = 0 if i == 0 else matches[i - 1].end()
        end = matches[i].start() if i < len(matches) else len(script)
        if script[start:end].strip():  # skip empty blocks
            block_ranges.append((start, end))
    if len(block_ranges) >= num_stories + 2:
        # intro + num_stories + outro
        for i in range(num_stories):
            block_idx = 1 + i
            if block_idx >= len(block_ranges):
                break
            s, e = block_ranges[block_idx]
            segments.append({"start_char": s, "length": e - s})
    elif len(block_ranges) >= num_stories + 1:
        # intro + num_stories story blocks, no outro
        for i in range(num_stories):
            block_idx = 1 + i
            if block_idx >= len(block_ranges):
                break
            s, e = block_ranges[block_idx]
            segments.append({"start_char": s, "length": e - s})
    else:
        # Fallback: equal character chunks
        total = len(script)
        chunk = max(1, total // max(1, num_stories))
        for i in range(num_stories):
            segments.append(
                {
                    "start_char": i * chunk,
                    "length": chunk
                    if i < num_stories - 1
                    else total - (num_stories - 1) * chunk,
                }
            )
    return segments


async def generate_briefing_script(
    stories: List[Dict],
    profile_summary: Optional[Dict] = None,
) -> Tuple[str, List[Dict]]:
    """Generate a hyper-personalized broadcast script using Gemini. Returns (script, story_segments).
    When profile_summary is set (from recommendation_service), the intro and transitions acknowledge
    the user's top categories and expanded topics."""
    top_cats = ", ".join(profile_summary.get("top_categories", []) or []) if profile_summary else ""
    interests = ", ".join(profile_summary.get("expanded_topics", []) or []) if profile_summary else ""
    first_cat = (top_cats.split(",")[0].strip() if top_cats else "the news")

    n_stories = len(stories)
    system = f"""You are a professional broadcast journalist for Narvo. Create a radio-style morning briefing script for exactly {n_stories} stories.

Requirements:
- Open with a clear intro: "Good morning. Narvo has the gist." (or "Here's what matters this morning.") """
    if top_cats:
        system += f"If relevant, mention that today's focus includes {top_cats}. "
    system += """
- Cover each of the given stories in order. For each story write one complete paragraph: a self-contained, full brief that captures the entire story. Do not truncate or cut off mid-sentence.
- Use smooth, natural transitions (e.g. "Meanwhile, ...", "In other news, ..."). """
    if top_cats or interests:
        system += f'You may reference the listener\'s interests where natural (e.g. "Moving to {first_cat}..."). '
    system += f"""Do NOT use story labels or numbering like "Story 1:" or "Story 2:"—write like a real news broadcast.
- End with a clean, calm outro (e.g., "That's the briefing for now." or "Catch you on the next one.").
- Aim for roughly 3–12 minutes when read aloud (~130 words per minute). With {n_stories} stories, scale length accordingly: fewer stories should be shorter; more stories may run longer but stay focused.
- Keep the full script at or under """ + str(BRIEFING_SCRIPT_WORD_MAX) + """ words total.
- The spoken audio is synthesized from roughly the first 2,500 characters of the script—put the strongest leads and clearest gist in that opening portion; the rest may appear in the transcript only.
- Output plain text only: no URLs, no links, no markdown, no HTML. Do not include website addresses, "click here", or "link in description". Do not use studio jargon, "we go live", or production filler. Use normal apostrophes and quotes, no bullet points or numbers."""

    stories_text = "\n\n".join(
        [
            f"Source: {clean_text_for_briefing(s.get('source') or '')}\nTitle: {clean_text_for_briefing(s.get('title') or '')[:150]}\nSummary: {clean_text_for_briefing(s.get('summary') or '')[:400]}"
            for s in stories
        ]
    )
    user = f"Generate a personalized script for these stories:\n\n{stories_text}"
    if interests:
        user = f"Listener's expanded interest topics: {interests}\n\n{user}"

    result = None
    try:
        response = await generate_gemini(system, user)
        if response and isinstance(response, str):
            result = response.strip()
        if result:
            result = html.unescape(result)
            result = _strip_story_numbering(result)
            result = strip_urls_and_markup(result)
            result = re.sub(r"[ \t]+", " ", result)
            result = re.sub(r"\n{3,}", "\n\n", result).strip()
            segments = _compute_story_segments(result, len(stories))
            return result, segments
    except Exception as e:
        logger.error("Hyper-personalization script error: %s", e)
    # Fallback: one paragraph per story, no "Story N:" labels
    script = f"Good morning. Narvo has the gist for {datetime.now().strftime('%A, %B %d, %Y')}.\n\n"
    for story in stories:
        title = clean_text_for_briefing(story.get("title") or "")[:120]
        summary = clean_text_for_briefing(story.get("summary") or "")[:300]
        script += f"{title}. {summary}\n\n"
    script += "That's the briefing for now."
    segments = _compute_story_segments(script, len(stories))
    return script, segments


async def generate_briefing(
    voice_id: str = "nova",
    force_regenerate: bool = False,
    user_id: Optional[str] = None,
    speaking_rate: float = 1.0,
    pitch_semitones: float = 0.0,
) -> Optional[Dict]:
    """Generate or retrieve morning briefing. user_id=None or '' = global default; set for personalized."""
    now = datetime.now(timezone.utc)
    today_date = now.strftime("%Y-%m-%d")
    uid = (user_id or "").strip() or BRIEFING_GLOBAL_USER_ID
    db = get_supabase_db()

    if not force_regenerate:
        q = db.table("briefings").select("id, date, title, generated_at, duration_estimate, stories, script, audio_url, voice_id, user_id, story_segments").eq("date", today_date)
        if uid:
            q = q.eq("user_id", uid)
        else:
            q = q.eq("user_id", BRIEFING_GLOBAL_USER_ID)
        r = q.limit(1).execute()
        if r.data and len(r.data) > 0:
            return _briefing_row_to_dict(r.data[0])

    profile_summary = None
    if uid:
        from services.recommendation_service import get_recommendations

        all_news = await get_cached_all_news()
        recs = await get_recommendations(uid, all_news, limit=BRIEFING_POOL_LIMIT)
        pool = [r for r in recs.get("recommendations", [])][:BRIEFING_POOL_LIMIT]
        profile_summary = recs.get("profile_summary")
        if not pool:
            pool = all_news[:BRIEFING_POOL_LIMIT]
    else:
        all_news = await fetch_all_news(limit=BRIEFING_POOL_LIMIT)
        pool = all_news[:BRIEFING_POOL_LIMIT]

    if not pool:
        return None

    k = _choose_story_count(len(pool))
    top_stories = pool[:k]

    script, story_segments = await generate_briefing_script(top_stories, profile_summary=profile_summary)
    lang = resolve_tts_language_for_voice(voice_id, "en")
    audio_url = await yarn_generate_tts(
        script[:2500],
        voice_id=voice_id,
        language=lang,
        speed=speaking_rate,
        pitch_semitones=pitch_semitones,
    )

    # Store clean, display-ready title/summary (decode HTML entities; allow full summary up to 500 chars)
    def _story_for_briefing(s: Dict) -> Dict:
        raw_title = s.get("title") or ""
        raw_summary = s.get("summary") or ""
        title = clean_text_for_display(raw_title)[:150]
        summary = clean_text_for_display(raw_summary)
        if len(summary) > 500:
            summary = summary[:497] + "..."
        return {
            "id": s.get("id"),
            "title": title,
            "summary": summary,
            "source": s.get("source"),
            "category": s.get("category", "General"),
        }

    briefing_data = {
        "id": f"briefing-{today_date}" + (f"-{uid[:8]}" if uid else ""),
        "date": today_date,
        "user_id": uid,
        "title": f"Personalized Briefing - {now.strftime('%B %d, %Y')}" if uid else f"Morning Briefing - {now.strftime('%B %d, %Y')}",
        "generated_at": now.isoformat(),
        "duration_estimate": _duration_estimate_from_script(script),
        "stories": [_story_for_briefing(s) for s in top_stories],
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
    q = (
        db.table("briefings")
        .select("id, date, title, generated_at, duration_estimate, stories, script, audio_url, voice_id, user_id, story_segments")
        .eq("user_id", uid)
        .order("date", desc=True)
        .limit(1)
    )
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
    q = (
        db.table("briefings")
        .select(
            "id, date, title, generated_at, duration_estimate, stories, voice_id, story_segments"
        )
        .eq("user_id", uid)
        .order("date", desc=True)
        .range(skip, skip + limit - 1)
    )
    r = q.execute()
    count_q = (
        db.table("briefings").select("id", count="exact").eq("user_id", uid).execute()
    )
    total = (
        count_q.count
        if getattr(count_q, "count", None) is not None
        else len(count_q.data or [])
    )
    briefings = [_briefing_row_to_dict(x) for x in (r.data or [])]
    return {"briefings": briefings, "total": total}


def get_briefing_by_date(date: str, user_id: Optional[str] = None) -> Optional[Dict]:
    """Get a specific briefing by date. user_id=None or '' = global default."""
    db = get_supabase_db()
    uid = (user_id or "").strip() or BRIEFING_GLOBAL_USER_ID
    r = (
        db.table("briefings")
        .select("id, date, title, generated_at, duration_estimate, stories, script, audio_url, voice_id, user_id, story_segments")
        .eq("date", date)
        .eq("user_id", uid)
        .limit(1)
        .execute()
    )
    if not r.data:
        return None
    return _briefing_row_to_dict(r.data[0])
