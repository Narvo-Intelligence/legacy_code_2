# Narrative Service - AI-powered narrative generation for news content
import json
import logging
from typing import Dict, List

from services.llm_gemini import generate_gemini

logger = logging.getLogger(__name__)


async def generate_narrative(text: str) -> Dict:
    """Generate short_summary (lead), detailed narrative (body + TTS), and key_takeaways."""
    system = """You are a professional broadcast journalist for Narvo, an African news platform.
Transform the given news content into three distinct outputs:

1. short_summary: A concise, context-aware summary in 2–4 sentences (max ~50 words). Use this for the display lead below the headline. It must be self-contained and never truncated in UI.

2. narrative: A COMPREHENSIVE, detailed broadcast narrative. Cover the story from start to finish across 5–8 paragraphs (400–800 words) for the main article body and for text-to-speech playback. Expand fully on context, background, causes, quotes, and implications. Do NOT summarize; tell the complete story.

3. key_takeaways: 4–6 bullet points (one short sentence each) that capture the main points.

Style: Clear, authoritative, journalistic. Maintain objectivity.

Respond in JSON only:
{
  "short_summary": "Two to four concise sentences for the lead...",
  "narrative": "Full multi-paragraph narrative for body and TTS...",
  "key_takeaways": ["Point 1", "Point 2", "Point 3", ...]
}"""
    user = f"Transform this news into short_summary, detailed narrative, and key_takeaways:\n\n{text}"
    try:
        response = await generate_gemini(system, user)
        if not response:
            fallback = _fallback_output(text)
            return fallback
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
    }


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
