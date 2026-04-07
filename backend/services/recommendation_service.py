"""
Recommendation Service for Narvo (Supabase)
Combines collaborative filtering (listening history analysis) with
AI-powered topic expansion via Gemini and optional Upstash Vector semantic search.
"""

import json
import logging
from datetime import datetime, timezone
from collections import Counter

from lib.supabase_db import get_supabase_db
from services.llm_gemini import generate_gemini, GEMINI_API_KEY, embed_text, embed_texts_batch

logger = logging.getLogger(__name__)

# Upstash Vector: max items to upsert per recommendation request (avoid timeouts)
VECTOR_UPSERT_BATCH_LIMIT = 100
# Semantic boost added to recommendation_score when article is in vector-similar set
SEMANTIC_BOOST = 25.0


def build_user_profile(user_id: str) -> dict:
    """Analyze listening history to build a preference profile."""
    db = get_supabase_db()
    r = (
        db.table("listening_history")
        .select("category, source, title, played_at, duration")
        .eq("user_id", user_id)
        .order("played_at", desc=True)
        .limit(100)
        .execute()
    )
    history = list(r.data or [])

    if not history:
        return {
            "categories": {},
            "sources": {},
            "keywords": [],
            "recent_categories": [],
            "history_count": 0,
        }

    # Weight recent listens more heavily; longer completed listens count slightly more.
    now = datetime.now(timezone.utc)
    category_weights = Counter()
    source_weights = Counter()
    titles = []
    recent_categories: list[str] = []

    for item in history:
        played = item.get("played_at")
        try:
            if played is None:
                age_days = 7
            elif hasattr(played, "year"):  # datetime-like
                age_days = max(1, (now - played).days)
            elif isinstance(played, str):
                played_dt = datetime.fromisoformat(played.replace("Z", "+00:00"))
                age_days = max(1, (now - played_dt).days)
            else:
                age_days = 7
        except Exception:
            age_days = 7
        # Decay factor: recent items get higher weight
        base_weight = 1.0 / (1.0 + age_days * 0.1)
        try:
            dur = int(item.get("duration") or 0)
        except (TypeError, ValueError):
            dur = 0
        # Engagement proxy: up to +50% weight for listens ≥ ~5 minutes (capped)
        dur_factor = 1.0 + min(max(dur, 0), 600) / 1200.0
        weight = base_weight * dur_factor

        cat = (item.get("category") or "general").lower()
        src = item.get("source", "")
        category_weights[cat] += weight
        if src:
            source_weights[src] += weight
        if item.get("title"):
            titles.append(item["title"])
        if cat and len(recent_categories) < 20:
            recent_categories.append(cat)

    # Normalize category weights
    total_cat = sum(category_weights.values()) or 1
    categories = {k: round(v / total_cat, 3) for k, v in category_weights.most_common(8)}

    total_src = sum(source_weights.values()) or 1
    sources = {k: round(v / total_src, 3) for k, v in source_weights.most_common(5)}

    # Extract frequent keywords from titles
    stop_words = {"the", "a", "an", "in", "on", "at", "to", "for", "of", "is", "and", "with", "by", "as", "from", "has", "its", "was", "are", "be"}
    word_counts = Counter()
    for title in titles:
        words = [w.lower().strip(".,!?\"'()[]") for w in title.split() if len(w) > 3]
        for w in words:
            if w not in stop_words:
                word_counts[w] += 1

    keywords = [w for w, _ in word_counts.most_common(15)]

    # Also load user interests from settings
    prefs = db.table("user_preferences").select("settings").eq("user_id", user_id).limit(1).execute()
    interests = []
    if prefs.data and len(prefs.data) > 0 and prefs.data[0].get("settings"):
        interests = prefs.data[0]["settings"].get("interests", [])

    return {
        "categories": categories,
        "sources": sources,
        "keywords": keywords,
        "interests": interests,
        "recent_categories": recent_categories,
        "history_count": len(history),
    }


async def get_ai_topic_expansion(profile: dict) -> list:
    """Use Gemini to expand user interests into related topics for discovery."""
    if not GEMINI_API_KEY or profile["history_count"] < 3:
        return []

    top_categories = list(profile["categories"].keys())[:5]
    top_keywords = profile["keywords"][:10]
    interests = profile.get("interests", [])

    system = "You are a news recommendation AI. Return only valid JSON arrays."
    user = f"""Based on a user's news listening profile, suggest 5 additional related news topics they might enjoy.

User's top categories: {', '.join(top_categories)}
Frequent keywords in listened articles: {', '.join(top_keywords)}
Declared interests: {', '.join(interests) if interests else 'none'}

Return ONLY a JSON array of 5 topic strings, each 1-3 words. Example: ["Climate Policy", "Startup Funding", "Trade Agreements", "Digital Currency", "Healthcare Reform"]
No explanations, just the JSON array."""

    try:
        response = await generate_gemini(system, user)
        if not response:
            return []
        cleaned = response.strip()
        if cleaned.startswith("```"):
            cleaned = cleaned.split("```")[1]
            if cleaned.startswith("json"):
                cleaned = cleaned[4:]
        cleaned = cleaned.strip()
        return json.loads(cleaned)
    except Exception as e:
        logger.error("[Recommendation] AI expansion error: %s", e)
        return []


def score_article(article: dict, profile: dict, expanded_topics: list) -> float:
    """Score a news article based on user profile match."""
    score = 0.0

    # Category match (strongest signal)
    cat = (article.get("category") or "general").lower()
    cat_weight = profile["categories"].get(cat, 0)
    score += cat_weight * 40

    # Recent listening streak: categories from latest plays (order preserved)
    recent = profile.get("recent_categories") or []
    if recent:
        window = recent[:12]
        matches = sum(1 for c in window if c == cat)
        score += min(matches * 5.0, 22.0)
        if recent and recent[0] == cat:
            score += 8.0

    # Source preference
    src = article.get("source", "")
    src_weight = profile["sources"].get(src, 0)
    score += src_weight * 20

    # Keyword match in title
    title_lower = (article.get("title") or "").lower()
    keyword_hits = sum(1 for kw in profile["keywords"] if kw in title_lower)
    score += min(keyword_hits * 5, 20)

    # Interest category match
    interests = profile.get("interests", [])
    if cat in interests:
        score += 15

    # AI-expanded topic match
    summary_lower = (article.get("summary") or "").lower()
    for topic in expanded_topics:
        topic_words = topic.lower().split()
        if any(w in title_lower or w in summary_lower for w in topic_words):
            score += 8
            break

    # Recency bonus
    try:
        pub = article.get("published", "")
        if pub:
            pub_dt = datetime.fromisoformat(pub.replace("Z", "+00:00"))
            age_hours = (datetime.now(timezone.utc) - pub_dt).total_seconds() / 3600
            if age_hours < 6:
                score += 10
            elif age_hours < 24:
                score += 5
    except Exception:
        pass

    return round(score, 2)


async def _ensure_vectors_upserted(articles: list) -> None:
    """Lazy upsert article embeddings to Upstash Vector (by id). Skips if vector client or Gemini unavailable."""
    from lib.vector_client import _get_index, upsert_vectors, VECTOR_DIMENSION
    if _get_index() is None:
        return
    to_embed = []
    ids = []
    for a in articles[:VECTOR_UPSERT_BATCH_LIMIT]:
        aid = a.get("id")
        if not aid:
            continue
        text = " ".join(filter(None, [a.get("title") or "", (a.get("summary") or "")[:1500], (a.get("narrative") or "")[:500]]))[:4000]
        if not text.strip():
            continue
        to_embed.append(text)
        ids.append(aid)
    if not to_embed:
        return
    vectors_result = await embed_texts_batch(to_embed, batch_size=20)
    vectors = []
    for i, vec in enumerate(vectors_result):
        if i >= len(ids):
            break
        if vec is None or len(vec) != VECTOR_DIMENSION:
            continue
        vectors.append({
            "id": ids[i],
            "vector": vec,
            "metadata": {"category": (articles[i].get("category") or "general")[:64], "source": (articles[i].get("source") or "")[:64]},
        })
    if vectors:
        upsert_vectors(vectors)


def _build_profile_query_text(profile: dict, expanded_topics: list) -> str:
    """Build a single text representing user interests for vector query."""
    parts = []
    parts.extend(expanded_topics[:8])
    parts.extend(profile.get("keywords", [])[:10])
    parts.extend(profile.get("categories", {}).keys())
    return " ".join(str(p) for p in parts if p)[:4000]


async def _get_semantic_similar_ids(profile: dict, expanded_topics: list, top_k: int = 25) -> set:
    """Query Upstash Vector for story ids similar to user profile. Returns set of ids or empty."""
    from lib.vector_client import _get_index, query_similar
    if _get_index() is None:
        return set()
    query_text = _build_profile_query_text(profile, expanded_topics)
    if not query_text.strip():
        return set()
    vector = await embed_text(query_text)
    if not vector:
        return set()
    results = query_similar(vector, top_k=top_k)
    return {r["id"] for r in results if r.get("id")}


async def get_recommendations(user_id: str, available_news: list, limit: int = 10) -> dict:
    """Get personalized recommendations for a user."""
    profile = build_user_profile(user_id)

    # If no listening history, return trending/latest as fallback
    if profile["history_count"] == 0:
        return {
            "recommendations": available_news[:limit],
            "profile_summary": None,
            "strategy": "trending_fallback",
        }

    # Get AI-expanded topics
    expanded_topics = await get_ai_topic_expansion(profile)

    # Optional: ensure article embeddings exist in Upstash Vector (lazy upsert)
    await _ensure_vectors_upserted(available_news)

    # Optional: get semantic-similar story ids from Upstash Vector
    semantic_ids = await _get_semantic_similar_ids(profile, expanded_topics, top_k=25)

    db = get_supabase_db()
    rh = db.table("listening_history").select("track_id").eq("user_id", user_id).order("played_at", desc=True).limit(30).execute()
    recent_history = list(rh.data or [])
    listened_ids = {h.get("track_id") for h in recent_history}

    # Score all articles (metadata + optional semantic boost)
    scored = []
    for article in available_news:
        if article.get("id") in listened_ids:
            continue
        s = score_article(article, profile, expanded_topics)
        if article.get("id") in semantic_ids:
            s += SEMANTIC_BOOST
        scored.append((s, article))

    # Sort by score descending
    scored.sort(key=lambda x: x[0], reverse=True)

    recommendations = []
    for s, article in scored[:limit]:
        rec = {**article, "recommendation_score": s}
        recommendations.append(rec)

    # Build a human-readable profile summary
    top_cats = list(profile["categories"].keys())[:3]
    profile_summary = {
        "top_categories": top_cats,
        "top_sources": list(profile["sources"].keys())[:3],
        "expanded_topics": expanded_topics[:5],
        "history_count": profile["history_count"],
    }

    strategy = "hybrid_collaborative_ai"
    if semantic_ids:
        strategy = "hybrid_collaborative_ai_vector"

    return {
        "recommendations": recommendations,
        "profile_summary": profile_summary,
        "strategy": strategy,
    }
