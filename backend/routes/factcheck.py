# Fact-check routes - Google Fact Check API Integration
from fastapi import APIRouter, Query, HTTPException, Response
from pydantic import BaseModel
from typing import Optional, List

from services.factcheck_service import (
    search_fact_checks,
    check_story_facts,
    analyze_claim
)

router = APIRouter(prefix="/api/factcheck", tags=["factcheck"])


class FactCheckReview(BaseModel):
    publisher: str
    publisher_site: Optional[str] = ""
    verdict: str
    review_url: Optional[str] = ""
    review_date: Optional[str] = None
    title: Optional[str] = ""


class FactCheckClaim(BaseModel):
    claim_text: str
    claimant: Optional[str] = None
    claim_date: Optional[str] = None
    reviews: List[FactCheckReview] = []


class FactCheckResponse(BaseModel):
    success: bool
    source: str
    query: str
    claims_found: int
    claims: List[FactCheckClaim] = []
    primary_verdict: Optional[str] = None
    confidence: int = 0
    checked_at: str
    note: Optional[str] = None


class QuickCheckResponse(BaseModel):
    status: str
    confidence: int
    source: str
    explanation: str
    checked_at: str


@router.get("/search", response_model=FactCheckResponse)
async def factcheck_search(
    query: str = Query(..., min_length=3, description="Text or claim to fact-check"),
    language: str = Query("en", description="Language code (en, ha, yo, ig, pcm)"),
    max_age_days: int = Query(365, ge=1, le=3650, description="Maximum age of results in days")
):
    """
    Search for existing fact-checks related to a query using Google Fact Check API.
    
    Returns fact-check reviews from publishers like AFP, Reuters, Africa Check, etc.
    Falls back to mock data if API key is not configured.
    """
    result = await search_fact_checks(
        query=query,
        language_code=language,
        max_age_days=max_age_days
    )
    
    return FactCheckResponse(**result)


@router.get("/story/{story_id}", response_model=QuickCheckResponse)
async def factcheck_story(story_id: str, response: Response):
    """
    Get fact-check status for a specific news story.
    Uses keyword-based analysis; no DB story lookup (news_cache deprecated).
    """
    result = check_story_facts(story_id)
    response.headers["Cache-Control"] = "public, max-age=3600"
    return QuickCheckResponse(**result)


@router.post("/analyze", response_model=QuickCheckResponse)
async def factcheck_analyze(
    text: str = Query(..., min_length=10, description="Text to analyze")
):
    """
    Quick keyword-based analysis of a text claim.
    For thorough fact-checking, use the /search endpoint.
    """
    result = analyze_claim(text)
    return QuickCheckResponse(**result)


@router.get("/verify")
async def factcheck_verify(
    claim: str = Query(..., min_length=3, description="Claim to verify")
):
    """
    Simplified verification endpoint - returns verdict and confidence only.
    """
    result = await search_fact_checks(query=claim)
    
    return {
        "claim": claim,
        "verdict": result.get("primary_verdict", "UNVERIFIED"),
        "confidence": result.get("confidence", 0),
        "reviews_found": result.get("claims_found", 0),
        "source": result.get("source", "UNKNOWN")
    }
