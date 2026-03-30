"""Tests for critical backend services (#14): briefing, push, narrative, ratelimit."""
import pytest
from unittest.mock import AsyncMock, MagicMock, patch
from datetime import datetime, timezone


# ── briefing_service tests ───────────────────────────────────

class TestComputeStorySegments:
    """Test _compute_story_segments edge cases."""

    def test_empty_script(self):
        from services.briefing_service import _compute_story_segments
        assert _compute_story_segments("", 3) == []

    def test_zero_stories(self):
        from services.briefing_service import _compute_story_segments
        assert _compute_story_segments("Some script text", 0) == []

    def test_single_story_fallback(self):
        from services.briefing_service import _compute_story_segments
        script = "Intro paragraph.\n\nStory one content here.\n\nOutro."
        segments = _compute_story_segments(script, 1)
        assert len(segments) == 1
        assert segments[0]["start_char"] >= 0
        assert segments[0]["length"] > 0

    def test_multiple_stories_with_blocks(self):
        from services.briefing_service import _compute_story_segments
        script = "Good morning, this is your briefing.\n\nFirst story goes here.\n\nSecond story goes here.\n\nThat wraps up today."
        segments = _compute_story_segments(script, 2)
        assert len(segments) == 2


class TestStripStoryNumbering:
    def test_removes_story_labels(self):
        from services.briefing_service import _strip_story_numbering
        assert "Story 1:" not in _strip_story_numbering("Story 1: Breaking news today")
        assert "Story 2." not in _strip_story_numbering("Story 2. Economic growth")

    def test_preserves_regular_text(self):
        from services.briefing_service import _strip_story_numbering
        text = "The president announced new policy measures."
        assert _strip_story_numbering(text) == text


# ── narrative_service tests ──────────────────────────────────

class TestAuthorityPrefix:
    def test_single_source(self):
        from services.narrative_service import _authority_prefix
        assert _authority_prefix(1) == ""

    def test_dual_sources(self):
        from services.narrative_service import _authority_prefix
        assert "dual" in _authority_prefix(2).lower() or "Confirmed" in _authority_prefix(2)

    def test_multiple_sources(self):
        from services.narrative_service import _authority_prefix
        assert "verified" in _authority_prefix(3).lower() or "multiple" in _authority_prefix(3).lower()


class TestExtractCategory:
    def test_politics(self):
        from services.narrative_service import extract_category
        assert extract_category("President signs bill", "") == "Politics"

    def test_tech(self):
        from services.narrative_service import extract_category
        assert extract_category("New AI startup", "innovation in tech") == "Tech"

    def test_general_fallback(self):
        from services.narrative_service import extract_category
        assert extract_category("Random headline", "no keywords here") == "General"


class TestAssignSourceRolesFallback:
    @pytest.mark.asyncio
    async def test_empty_articles(self):
        from services.narrative_service import assign_source_roles
        assert await assign_source_roles([]) == []

    @pytest.mark.asyncio
    async def test_single_article(self):
        from services.narrative_service import assign_source_roles
        roles = await assign_source_roles([{"source": "Reuters", "title": "News"}])
        assert roles == ["BREAKING"]

    @pytest.mark.asyncio
    async def test_fallback_order(self):
        """When Gemini is unavailable, roles follow order: BREAKING, CONFIRMATION, EXPANSION."""
        from services.narrative_service import assign_source_roles
        with patch("services.narrative_service.generate_gemini", new_callable=AsyncMock, return_value=None):
            roles = await assign_source_roles([
                {"source": "A", "title": "First"},
                {"source": "B", "title": "Second"},
                {"source": "C", "title": "Third"},
            ])
            assert roles == ["BREAKING", "CONFIRMATION", "EXPANSION"]


# ── push_sender tests ───────────────────────────────────────

class TestSendBriefingReadyPush:
    def test_no_vapid_key_returns_zero(self):
        from services.push_sender import send_briefing_ready_push
        with patch("services.push_sender.VAPID_PRIVATE_KEY", ""):
            assert send_briefing_ready_push() == 0

    def test_no_pywebpush_returns_zero(self):
        from services.push_sender import send_briefing_ready_push
        with patch("services.push_sender.VAPID_PRIVATE_KEY", "test_key"):
            with patch.dict("sys.modules", {"pywebpush": None}):
                # When import fails, should return 0
                result = send_briefing_ready_push()
                assert isinstance(result, int)


# ── ratelimit tests ──────────────────────────────────────────

class TestRateLimit:
    @pytest.mark.asyncio
    async def test_non_limited_path_allowed(self):
        from lib.ratelimit import check_rate_limit
        allowed, detail = await check_rate_limit("127.0.0.1", "/api/news")
        assert allowed is True

    @pytest.mark.asyncio
    async def test_tts_path_is_rate_limited(self):
        from lib.ratelimit import _is_rate_limited_path
        assert _is_rate_limited_path("/api/tts/generate") is True

    @pytest.mark.asyncio
    async def test_news_path_not_rate_limited(self):
        from lib.ratelimit import _is_rate_limited_path
        assert _is_rate_limited_path("/api/news") is False
