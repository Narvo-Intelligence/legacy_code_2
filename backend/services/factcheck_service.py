# Fact-check Service - Google Fact Check API Integration
# Note: Google Fact Check API is FREE and doesn't require billing enabled
import os
import logging
import httpx
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

logger = logging.getLogger(__name__)

from services.llm_gemini import generate_gemini
from services.llm_groq import generate_groq
from services.story_content_service import get_story_content
import json

# Google Fact Check API - FREE tier, no billing required
# Get API key from: https://console.cloud.google.com/apis/credentials
GOOGLE_FACT_CHECK_API_KEY = os.environ.get("GOOGLE_FACT_CHECK_API_KEY", "")
GOOGLE_FACT_CHECK_API_URL = "https://factchecktools.googleapis.com/v1alpha1/claims:search"


async def generate_truth_tags(narrative: str, sources: List[str]) -> Dict[str, Any]:
    """
    Generate evidence-based trust scoring and truth tags for a narrative.
    Evaluates the narrative against its cited sources to determine:
    1. A trust score (0-100)
    2. A list of truth tags (e.g., 'Multi-Source Verified', 'Opinionated', 'Data-Backed')
    3. A brief explanation of the score.
    """
    if not narrative or not narrative.strip():
        return {
            "trust_score": 0,
            "tags": [],
            "explanation": "No narrative provided."
        }

    sources_str = ", ".join(sources) if sources else "Unknown"

    system = """You are the Lead Fact-Checker for Narvo, an African news platform.
Evaluate the given news narrative and assign an Evidence-Based Trust Score (0-100) and Truth Tags.

Criteria for Trust Score:
- 90-100: Multiple authoritative sources cited, objective tone, data-backed claims.
- 75-89: Single reliable source or minor subjective phrasing, but factually sound.
- 50-74: Lack of direct citations, heavily opinionated, or single unverified source.
- <50: Sensationalist, clear bias without evidence, or contradictory claims.

Truth Tags (choose 1-3 that apply):
"Multi-Source Verified", "Data-Backed", "Single Source", "Opinionated", "Sensational", "Developing Story", "Investigative", "Official Statement"

Output JSON only:
{
  "trust_score": 85,
  "tags": ["Multi-Source Verified", "Official Statement"],
  "explanation": "Confidence: 85% based on multiple reliable citations and official statements."
}
"""
    user = f"Sources Cited: {sources_str}\\n\\nNarrative to evaluate:\\n{narrative}"

    try:
        # Try Groq first for speed
        response = await generate_groq(system, user)
        if not response:
            # Fallback to Gemini
            response = await generate_gemini(system, user)
            
        if not response:
            return _fallback_factcheck()
            
        cleaned = response.strip()
        if cleaned.startswith("```"):
            cleaned = cleaned.split("```")[1]
            if cleaned.startswith("json"):
                cleaned = cleaned[4:]
        cleaned = cleaned.strip()
        
        result = json.loads(cleaned)
        
        score = result.get("trust_score", 50)
        if not isinstance(score, (int, float)) or score < 0 or score > 100:
            score = 50
            
        tags = result.get("tags", [])
        if not isinstance(tags, list):
            tags = ["Developing Story"]
            
        explanation = result.get("explanation", "This story is still developing.")
        
        return {
            "trust_score": int(score),
            "tags": tags[:3],
            "explanation": explanation
        }
        
    except Exception as e:
        logger.error("Error generating truth tags: %s", e)
        return _fallback_factcheck()


def _fallback_factcheck() -> Dict[str, Any]:
    return {
        "trust_score": 50,
        "tags": ["Developing Story"],
        "explanation": "This story is still developing."
    }


async def search_fact_checks(
    query: str,
    language_code: str = "en",
    max_age_days: int = 365,
    page_size: int = 10
) -> Dict:
    """
    Search for existing fact-checks using Google Fact Check API.
    
    Args:
        query: The claim text to search for
        language_code: Language code (e.g., 'en', 'ha', 'yo')
        max_age_days: Maximum age of results in days
        page_size: Number of results to return
    
    Returns:
        Dict with fact-check results
    """
    if not GOOGLE_FACT_CHECK_API_KEY:
        return _degraded_fact_check_response(
            query, "Fact-check API is not configured (set GOOGLE_FACT_CHECK_API_KEY)."
        )
    
    params = {
        "query": query,
        "key": GOOGLE_FACT_CHECK_API_KEY,
        "languageCode": language_code,
        "pageSize": page_size,
        "maxAgeDays": max_age_days
    }
    
    try:
        from lib.http_client import get_http_client
        client = await get_http_client()
        response = await client.get(GOOGLE_FACT_CHECK_API_URL, params=params)
        response.raise_for_status()
        
        data = response.json()
        claims = data.get("claims", [])
        
        # Parse and format results
        results = []
        for claim in claims:
            reviews = []
            for review in claim.get("claimReview", []):
                reviews.append({
                    "publisher": review.get("publisher", {}).get("name", "Unknown"),
                    "publisher_site": review.get("publisher", {}).get("site", ""),
                    "verdict": review.get("textualRating", "Unknown"),
                    "review_url": review.get("url", ""),
                    "review_date": review.get("reviewDate"),
                    "title": review.get("title", "")
                })
            
            results.append({
                "claim_text": claim.get("text", ""),
                "claimant": claim.get("claimant"),
                "claim_date": claim.get("claimDate"),
                "reviews": reviews
            })
        
        # Determine overall verdict
        primary_verdict = _extract_primary_verdict(results)
        confidence = _calculate_confidence(results)
        
        return {
            "success": True,
            "source": "GOOGLE_FACTCHECK_API",
            "query": query,
            "claims_found": len(results),
            "claims": results,
            "primary_verdict": primary_verdict,
            "confidence": confidence,
            "checked_at": datetime.now(timezone.utc).isoformat()
        }
            
    except httpx.HTTPStatusError as e:
        if e.response.status_code == 401:
            logger.warning("Google Fact Check API: Invalid API key")
        elif e.response.status_code == 429:
            logger.warning("Google Fact Check API: Rate limited")
        return _degraded_fact_check_response(query, "Fact-check service temporarily unavailable.")
    except Exception as e:
        logger.error("Google Fact Check API error: %s", e)
        return _degraded_fact_check_response(query, "Fact-check service error.")


def _extract_primary_verdict(claims: List[Dict]) -> Optional[str]:
    """Extract the most common verdict from claims"""
    verdicts = {}
    for claim in claims:
        for review in claim.get("reviews", []):
            verdict = review.get("verdict", "").lower()
            if verdict:
                verdicts[verdict] = verdicts.get(verdict, 0) + 1
    
    if not verdicts:
        return None
    
    # Normalize verdict
    primary = max(verdicts, key=verdicts.get)
    
    if any(word in primary for word in ["true", "correct", "accurate"]):
        return "VERIFIED"
    elif any(word in primary for word in ["false", "incorrect", "wrong", "fake"]):
        return "FALSE"
    elif any(word in primary for word in ["misleading", "partially", "mixed"]):
        return "MISLEADING"
    else:
        return "UNVERIFIED"


def _calculate_confidence(claims: List[Dict]) -> int:
    """Calculate confidence score based on number of reviews"""
    if not claims:
        return 0
    
    total_reviews = sum(len(claim.get("reviews", [])) for claim in claims)
    
    if total_reviews == 0:
        return 0
    elif total_reviews == 1:
        return 60
    elif total_reviews <= 3:
        return 75
    elif total_reviews <= 5:
        return 85
    else:
        return min(95, 85 + total_reviews)


def _degraded_fact_check_response(query: str, reason: str) -> Dict:
    """Honest empty response when the Google Fact Check API cannot be used (no mock publishers)."""
    return {
        "success": False,
        "source": "UNAVAILABLE",
        "query": query,
        "claims_found": 0,
        "claims": [],
        "primary_verdict": None,
        "confidence": 0,
        "checked_at": datetime.now(timezone.utc).isoformat(),
        "note": reason,
    }


def _story_quickcheck_status(
    trust_score: Optional[int],
    truth_tags: List[str],
    explanation: str,
) -> str:
    score = int(trust_score or 0)
    haystack = " ".join([*(truth_tags or []), explanation or ""]).lower()
    if any(flag in haystack for flag in ("misleading", "sensational", "false", "disputed")):
        return "DISPUTED"
    if score >= 80 or any(
        flag in haystack
        for flag in ("verified", "multi-source", "data-backed", "official statement")
    ):
        return "VERIFIED"
    return "UNVERIFIED"


# Legacy function for backward compatibility
def check_story_facts(story_id: str) -> Dict:
    """Quick story verification backed by persisted `story_content`, never synthetic publishers."""
    row = get_story_content(story_id)
    checked_at = datetime.now(timezone.utc).isoformat()
    if not row:
        return {
            "status": "UNVERIFIED",
            "confidence": 0,
            "source": "UNAVAILABLE",
            "explanation": "No stored fact-check summary is available for this story yet.",
            "checked_at": checked_at,
        }

    truth_tags = [str(tag).strip() for tag in (row.get("truth_tags") or []) if str(tag).strip()]
    explanation = str(row.get("truth_explanation") or "").strip()
    trust_score_raw = row.get("trust_score")
    trust_score = trust_score_raw if isinstance(trust_score_raw, int) else 0
    status = _story_quickcheck_status(trust_score, truth_tags, explanation)
    return {
        "status": status,
        "confidence": max(0, min(100, int(trust_score))),
        "source": "STORY_CONTENT",
        "explanation": explanation or "Stored story verification data is available, but no summary was saved.",
        "checked_at": str(row.get("updated_at") or checked_at),
    }


def analyze_claim(text: str) -> Dict:
    """Quick synchronous claim analysis using keywords"""
    text_lower = text.lower()
    
    # Keyword-based quick check
    false_indicators = ["fake", "hoax", "debunked", "false claim", "misinformation"]
    true_indicators = ["confirmed", "official statement", "verified", "fact-checked true"]
    
    for word in false_indicators:
        if word in text_lower:
            return {
                "status": "LIKELY_FALSE",
                "confidence": 70,
                "source": "KEYWORD_ANALYSIS",
                "explanation": f"Contains indicator: '{word}'",
                "checked_at": datetime.now(timezone.utc).isoformat()
            }
    
    for word in true_indicators:
        if word in text_lower:
            return {
                "status": "LIKELY_TRUE",
                "confidence": 70,
                "source": "KEYWORD_ANALYSIS", 
                "explanation": f"Contains indicator: '{word}'",
                "checked_at": datetime.now(timezone.utc).isoformat()
            }
    
    return {
        "status": "UNVERIFIED",
        "confidence": 50,
        "source": "KEYWORD_ANALYSIS",
        "explanation": "No clear indicators found. Manual verification recommended.",
        "checked_at": datetime.now(timezone.utc).isoformat()
    }
