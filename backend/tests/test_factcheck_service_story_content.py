import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

from services import factcheck_service


def test_check_story_facts_uses_story_content(monkeypatch):
    monkeypatch.setattr(
        factcheck_service,
        "get_story_content",
        lambda story_id: {
            "story_id": story_id,
            "trust_score": 88,
            "truth_tags": ["Multi-Source Verified", "Official Statement"],
            "truth_explanation": "Confidence: 88% based on multiple authoritative citations.",
            "updated_at": "2026-04-08T10:15:00+00:00",
        },
    )

    result = factcheck_service.check_story_facts("story-123")

    assert result == {
        "status": "VERIFIED",
        "confidence": 88,
        "source": "STORY_CONTENT",
        "explanation": "Confidence: 88% based on multiple authoritative citations.",
        "checked_at": "2026-04-08T10:15:00+00:00",
    }


def test_check_story_facts_returns_unavailable_without_story_content(monkeypatch):
    monkeypatch.setattr(factcheck_service, "get_story_content", lambda story_id: None)

    result = factcheck_service.check_story_facts("missing-story")

    assert result["status"] == "UNVERIFIED"
    assert result["confidence"] == 0
    assert result["source"] == "UNAVAILABLE"
    assert "No stored fact-check summary" in result["explanation"]
    assert "checked_at" in result
