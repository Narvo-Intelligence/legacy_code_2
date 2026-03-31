# Narrative Service - AI-powered narrative generation for news content
import json
import logging
from typing import Dict, List

from services.llm_gemini import generate_gemini
from services.llm_groq import generate_groq

logger = logging.getLogger(__name__)


async def generate_narrative(text: str, source_name: str = "Unknown") -> Dict:
    """Generate short_summary (lead), detailed narrative (body + TTS), and key_takeaways."""
    system = """You are a professional broadcast journalist for Narvo, an African news platform.
Transform the given news content into four distinct outputs:

1. short_summary: A concise, context-aware summary in 2–4 sentences (max ~50 words). Use this for the display lead below the headline. It must be self-contained and never truncated in UI.

2. narrative: A COMPREHENSIVE and detailed broadcast narrative. Use enough words to cover the story fully: 5–10 paragraphs (600-1200 words) for the main article body and for text-to-speech playback. Expand fully on context, background, causes, quotes, and implications. Do NOT summarize or truncate; tell the complete story so a listener gets the full picture.
   - EVIDENCE-FIRST SYNTHESIS: You MUST explicitly cite the naming source(s) (e.g., "According to Premium Times...", "Vanguard reports...") in the body of the narrative, especially when presenting claims, quotes, or statistics. Give credit to the original publisher.

3. key_takeaways: 4–6 bullet points (one short sentence each) that capture the main points.

4. sources_used: A list of strings, containing the names of the original news publishers/sources that contributed to this story.

Style: Clear, authoritative, journalistic. Maintain objectivity. Use plain text only (no HTML entities; use normal apostrophes and quotes).

Respond in JSON only:
{
  "short_summary": "Two to four concise sentences for the lead...",
  "narrative": "Full multi-paragraph narrative for body and TTS, explicitly citing sources...",
  "key_takeaways": ["Point 1", "Point 2", "Point 3"],
  "sources_used": ["Publisher A"]
}"""
    user = f"Source: {source_name}\n\nTransform this news into short_summary, detailed narrative, key_takeaways, and sources_used:\n\n{text}"
    try:
        # Try Groq first for speed and generous free tier
        response = await generate_groq(system, user)
        if not response:
            # Fallback to Gemini for quality and redundancy
            response = await generate_gemini(system, user)
            
        if not response:
            return _fallback_output(text)
        cleaned = response.strip()
        if cleaned.startswith("```"):
            cleaned = cleaned.split("```")[1]
            if cleaned.startswith("json"):
                cleaned = cleaned[4:]
        cleaned = cleaned.strip()
        result = json.loads(cleaned)
        # Ensure all keys exist
        if "short_summary" not in result or not result["short_summary"]:
            result["short_summary"] = (text[:300] + "...") if len(text) > 300 else text
        if "narrative" not in result or not result["narrative"]:
            short = result.get("short_summary", text)
            result["narrative"] = text if short.strip() == text.strip() else short + "\n\n" + text
        if "key_takeaways" not in result or not isinstance(result["key_takeaways"], list):
            result["key_takeaways"] = ["Story details available in full article"]
        if "sources_used" not in result or not isinstance(result["sources_used"], list):
            result["sources_used"] = [source_name] if source_name != "Unknown" else []
        return result
    except Exception as e:
        logger.error("Error generating narrative: %s", e)
        return _fallback_output(text)


def _fallback_output(text: str) -> Dict:
    """Return safe fallback when AI generation fails."""
    short = (text[:280] + "...") if len(text) > 280 else text
    return {
        "short_summary": short,
        "narrative": text,
        "key_takeaways": ["Story details available in full article"],
        "sources_used": [],
    }


# Roles for multi-source timeline (assign_source_roles via Gemini)
SOURCE_ROLES = ("BREAKING", "CONFIRMATION", "EXPANSION")


async def assign_source_roles(cluster_articles: List[Dict]) -> List[str]:
    """Use Gemini to assign BREAKING / CONFIRMATION / EXPANSION by who broke, confirmed, or expanded the story.
    cluster_articles must be sorted by published time (oldest first). Returns list of roles in same order.
    On failure or missing API key, falls back to order-based: first=BREAKING, second=CONFIRMATION, rest=EXPANSION.
    """
    if not cluster_articles or len(cluster_articles) == 1:
        return [SOURCE_ROLES[0]] if cluster_articles else []
    # Build context for Gemini: source name, time, title/snippet
    lines = []
    for i, a in enumerate(cluster_articles):
        name = a.get("source") or "Unknown"
        time_ = a.get("published") or a.get("time") or ""
        title = (a.get("title") or "")[:120]
        summary = (a.get("summary") or "")[:200]
        lines.append(f"{i + 1}. {name} (published: {time_})\n   Title: {title}\n   Snippet: {summary}")
    system = """You are an editor for Narvo, an African news platform.
Given several news reports about the SAME event (same story), assign each source exactly one role:

- BREAKING: the source that first reported or broke the story (earliest substantive report).
- CONFIRMATION: a source that independently confirmed the story (second or corroborating).
- EXPANSION: a source that added detail, context, or later development (expansion, not the first break).

Rules: Assign exactly one role per source. Order of your list MUST match the input list (1-to-1).
Return ONLY a JSON array of strings, one per source, in the same order as the input. No explanation.
Example: ["BREAKING", "CONFIRMATION", "EXPANSION"]"""
    user = "Sources (in chronological order):\n" + "\n".join(lines) + "\n\nRespond with a JSON array of roles only."
    try:
        # Try Groq for speed
        response = await generate_groq(system, user)
        if not response:
            # Fallback to Gemini
            response = await generate_gemini(system, user)
            
        if not response:
            raise ValueError("Empty response from all providers")
        cleaned = response.strip()
        if cleaned.startswith("```"):
            cleaned = cleaned.split("```")[1]
            if cleaned.startswith("json"):
                cleaned = cleaned[4:]
        cleaned = cleaned.strip()
        roles = json.loads(cleaned)
        if not isinstance(roles, list) or len(roles) != len(cluster_articles):
            raise ValueError("Invalid role list length")
        out = []
        for r in roles:
            r_str = (r if isinstance(r, str) else str(r)).upper()
            if r_str not in SOURCE_ROLES:
                r_str = SOURCE_ROLES[min(len(out), 2)]
            out.append(r_str)
        return out
    except Exception as e:
        logger.warning("assign_source_roles failed, using order-based fallback: %s", e)
        return [SOURCE_ROLES[min(i, 2)] for i in range(len(cluster_articles))]


def _authority_prefix(source_count: int) -> str:
    """Phrase the narrator must use at the start when multiple sources verified."""
    if source_count >= 3:
        return "Narvo has verified this through multiple local reports. "
    if source_count == 2:
        return "Confirmed by dual sources. "
    return ""


async def synthesize_composite_story(source_articles: List[Dict]) -> Dict:
    """Synthesize multiple source reports into one objective broadcast narrative.
    Each source's full scraped content is used — no truncation — so Gemini
    produces a comprehensive 800-1200 word narrative rather than a snippet synthesis."""
    if not source_articles:
        return _fallback_output("")

    # Include full scraped content per source (capped at 6000 chars each to stay within
    # Gemini context while providing far richer material than the old 200-char snippet).
    SOURCE_CONTENT_MAX = 6000
    combined_context = "\n---\n".join(
        f"Source: {a.get('source', 'Unknown')}\nTitle: {a.get('title', '')}\nContent:\n{(a.get('summary') or a.get('title') or '')[:SOURCE_CONTENT_MAX]}"
        for a in source_articles
    )
    source_count = len(source_articles)
    authority_prefix = _authority_prefix(source_count)
    system = f"""You are a lead editor for Narvo, an African news platform.
Synthesize these {source_count} reports into ONE objective, comprehensive broadcast narrative.

Requirements:
- Write a DETAILED narrative of 800-1200 words covering the full story.
- Merge facts from all sources without repeating the same point.
- Cover context, background, causes, key quotes, implications, and what comes next.
- Resolve contradictions by favoring the majority or most authoritative phrasing.
- EVIDENCE-FIRST SYNTHESIS: You MUST explicitly cite the naming source(s) (e.g., "According to Premium Times...", "Vanguard reports...") inline in the narrative body whenever presenting claims, differing accounts, or statistics. Give credit to the original publishers.
- short_summary: 2-4 concise sentences (max 60 words) as a self-contained article lead.
- key_takeaways: 4-6 bullet points (one short sentence each) capturing main points.
- sources_used: A list of strings containing the names of the original news publishers/sources that contributed to this story.
{"You MUST start the narrative with this exact phrase: " + repr(authority_prefix) if authority_prefix else ""}
Output plain text only (no HTML). Respond in JSON only:
{{
  "short_summary": "Two to four concise sentences for the lead...",
  "narrative": "Full 800-1200 word narrative, explicitly citing sources...",
  "key_takeaways": ["Point 1", "Point 2", "Point 3"],
  "sources_used": ["Publisher A", "Publisher B"]
}}"""
    user = f"Reports:\n{combined_context}\n\nTask: Create a comprehensive, unified narrative of at least 800 words."
    try:
        # Try Groq first
        response = await generate_groq(system, user)
        if not response:
            # Fallback to Gemini
            response = await generate_gemini(system, user)
            
        if not response:
            first_summary = (source_articles[0].get("summary") or source_articles[0].get("title") or "")[:2000]
            return _fallback_output(first_summary)
        cleaned = response.strip()
        if cleaned.startswith("```"):
            cleaned = cleaned.split("```")[1]
            if cleaned.startswith("json"):
                cleaned = cleaned[4:]
        cleaned = cleaned.strip()
        result = json.loads(cleaned)
        if "short_summary" not in result or not result["short_summary"]:
            result["short_summary"] = (combined_context[:300] + "...") if len(combined_context) > 300 else combined_context
        if "narrative" not in result or not result["narrative"]:
            result["narrative"] = result.get("short_summary", combined_context)
        if "key_takeaways" not in result or not isinstance(result["key_takeaways"], list):
            result["key_takeaways"] = ["Story details available in full article"]
        if "sources_used" not in result or not isinstance(result["sources_used"], list):
            result["sources_used"] = [a.get("source") for a in source_articles if a.get("source")]
            
        if authority_prefix and result.get("narrative") and not result["narrative"].strip().startswith(authority_prefix.strip()):
            result["narrative"] = authority_prefix + result["narrative"]
        if authority_prefix and result.get("short_summary") and not result["short_summary"].strip().startswith(authority_prefix.strip()):
            result["short_summary"] = authority_prefix + result["short_summary"]
        return result
    except Exception as e:
        logger.error("Error synthesizing composite story: %s", e)
        first_summary = (source_articles[0].get("summary") or source_articles[0].get("title") or "")[:2000]
        return _fallback_output(first_summary)


async def narrative_duel(narrative_a: str, narrative_b: str) -> Dict:
    """Compare two narratives and return structured discrepancies (Narrative Duel).
    Returns { discrepancies: [ { type, summary, detail, severity } ], summary: str }."""
    if not (narrative_a or "").strip() or not (narrative_b or "").strip():
        return {"discrepancies": [], "summary": "One or both narratives are empty."}
    system = """You are an editor for Narvo, an African news platform. Compare two news narratives about the SAME or RELATED event and list factual or tonal discrepancies.

Output JSON only:
{
  "discrepancies": [
    {
      "type": "factual" | "emphasis" | "omission" | "contradiction" | "tone",
      "summary": "Short one-line description",
      "detail": "One or two sentences explaining the difference",
      "severity": "low" | "medium" | "high"
    }
  ],
  "summary": "One paragraph overall comparison and which narrative is more complete or neutral (if any)."
}

Rules: Be objective. List only clear differences. If narratives agree, return empty discrepancies and a brief summary."""
    user = f"Narrative A:\n{(narrative_a or '')[:4000]}\n\n---\n\nNarrative B:\n{(narrative_b or '')[:4000]}\n\nTask: List discrepancies and write summary."
    try:
        response = await generate_gemini(system, user)
        if not response:
            return {"discrepancies": [], "summary": "Analysis unavailable."}
        cleaned = response.strip()
        if cleaned.startswith("```"):
            cleaned = cleaned.split("```")[1]
            if cleaned.startswith("json"):
                cleaned = cleaned[4:]
        cleaned = cleaned.strip()
        result = json.loads(cleaned)
        if "discrepancies" not in result or not isinstance(result["discrepancies"], list):
            result["discrepancies"] = []
        if "summary" not in result or not result["summary"]:
            result["summary"] = "Comparison complete."
        return result
    except Exception as e:
        logger.error("narrative_duel error: %s", e)
        return {"discrepancies": [], "summary": "Analysis failed."}


def extract_category(title: str, summary: str) -> str:
    """Simple category extraction based on keywords"""
    text = (title + " " + summary).lower()

    category_keywords = {
        "Politics": ["election", "government", "president", "minister", "policy", "parliament", "senate"],
        "Economy": ["economy", "market", "stock", "naira", "inflation", "trade", "gdp", "fiscal"],
        "Tech": ["tech", "digital", "app", "startup", "innovation", "software", "ai", "internet"],
        "Sports": ["sport", "football", "match", "player", "league", "afcon", "olympics"],
        "Health": ["health", "hospital", "disease", "medical", "doctor", "vaccine", "pandemic"],
        "Environment": ["climate", "environment", "weather", "flood", "drought", "pollution"],
    }

    for category, keywords in category_keywords.items():
        if any(word in text for word in keywords):
            return category

    return "General"


def extract_tags(title: str, category: str) -> List[str]:
    """Extract hashtags from content"""
    tags = [f"#{category.upper()}"]

    title_lower = title.lower()
    if "nigeria" in title_lower:
        tags.append("#NIGERIA")
    if "africa" in title_lower:
        tags.append("#AFRICA")
    if "breaking" in title_lower:
        tags.append("#BREAKING")

    return tags[:3]
