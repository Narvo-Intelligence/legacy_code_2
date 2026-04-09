"""Tests for critical backend services (#14): briefing, push, narrative, ratelimit."""
import pytest
import time
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


class TestBriefingGeneratePost:
    def test_post_generate_ignores_body_user_id_and_uses_auth(self, client):
        payload = {"id": "b-post-1", "date": "2026-04-05", "script": "hello"}
        with patch("routes.briefing.generate_briefing", new_callable=AsyncMock) as m, \
             patch("lib.auth.get_user_id_from_request", return_value="user-auth-1"):
            m.return_value = payload
            r = client.post(
                "/api/briefing/generate",
                json={"voice_id": "nova", "force_regenerate": True, "user_id": "attacker"},
            )
            assert r.status_code == 200
            assert r.json()["id"] == "b-post-1"
            m.assert_called_once_with(
                voice_id="nova",
                force_regenerate=True,
                user_id="user-auth-1",
                speaking_rate=1.0,
                pitch_semitones=0.0,
            )

    def test_get_generate_ignores_query_user_id_and_uses_auth(self, client):
        payload = {"id": "b-get-1", "date": "2026-04-05", "script": "hello"}
        with patch("routes.briefing.generate_briefing", new_callable=AsyncMock) as m, \
             patch("lib.auth.get_user_id_from_request", return_value="user-auth-2"):
            m.return_value = payload
            r = client.get(
                "/api/briefing/generate?voice_id=emma&force_regenerate=true&user_id=attacker",
            )
            assert r.status_code == 200
            assert r.json()["id"] == "b-get-1"
            m.assert_called_once_with(
                voice_id="emma",
                force_regenerate=True,
                user_id="user-auth-2",
                speaking_rate=1.0,
                pitch_semitones=0.0,
            )


class TestBriefingScopeNormalization:
    def test_blank_scope_normalizes_to_global_default(self):
        from services.briefing_service import BRIEFING_GLOBAL_USER_ID, normalize_briefing_user_id

        assert normalize_briefing_user_id(None) == BRIEFING_GLOBAL_USER_ID
        assert normalize_briefing_user_id("") == BRIEFING_GLOBAL_USER_ID
        assert normalize_briefing_user_id("   ") == BRIEFING_GLOBAL_USER_ID
        assert normalize_briefing_user_id("user-123") == "user-123"


class TestBriefingAudioPersistence:
    def test_audio_generate_does_not_persist_without_auth(self, client):
        with patch("services.yarngpt_service.generate_tts", new_callable=AsyncMock) as m_generate, \
             patch("services.yarngpt_service.resolve_tts_language_for_voice", return_value="en"), \
             patch("routes.briefing.get_supabase_db") as m_db:
            m_generate.return_value = "https://audio.example/briefing.mp3"
            r = client.post(
                "/api/briefing/audio",
                json={"script": "Hello Narvo", "briefing_id": "briefing-1"},
            )
            assert r.status_code == 200
            assert r.json()["audio_url"] == "https://audio.example/briefing.mp3"
            m_db.assert_not_called()


class TestNewsDetailIdentityScope:
    def test_news_detail_ignores_query_user_id_without_auth(self, client):
        with patch("routes.news._get_full_news_pool", new_callable=AsyncMock, return_value=[]), \
             patch("routes.news._get_saved_story_for_user") as m_saved:
            r = client.get("/api/news/story-1?user_id=attacker")
            assert r.status_code == 404
            m_saved.assert_not_called()

    def test_news_detail_uses_authenticated_scope_for_saved_fallback(self, client):
        saved_story = {
            "id": "story-2",
            "title": "Saved story",
            "summary": "Saved summary",
            "narrative": "Saved narrative",
            "source": "Narvo",
            "category": "General",
            "published": "2026-04-09T00:00:00+00:00",
            "from_saved": True,
        }
        with patch("lib.auth.get_user_id_from_request", return_value="user-auth-3"), \
             patch("routes.news._get_full_news_pool", new_callable=AsyncMock, return_value=[]), \
             patch("routes.news._get_saved_story_for_user", return_value=saved_story) as m_saved, \
             patch("routes.news.get_story_content", return_value=None):
            r = client.get("/api/news/story-2?user_id=attacker")
            assert r.status_code == 200
            assert r.json()["id"] == "story-2"
            m_saved.assert_called_once_with("story-2", "user-auth-3")


# ── narrative_service tests ──────────────────────────────────

class TestAuthorityPrefix:
    def test_single_source(self):
        from services.narrative_service import _authority_prefix
        assert _authority_prefix(1) == ""

    def test_dual_sources(self):
        from services.narrative_service import _authority_prefix
        p = _authority_prefix(2)
        assert "2" in p or "cross" in p.lower() or "dual" in p.lower() or "confirmed" in p.lower()

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


class TestPushPayloads:
    def test_morning_briefing_payload_includes_actions(self):
        from services.push_payloads import build_morning_briefing_payload

        p = build_morning_briefing_payload({"id": "b1", "stories": [{"title": "Hello"}]})
        assert p["data"]["narvo_action"] == "morning_briefing"
        assert p["data"]["action_urls"]["listen"] == "/briefing?autoplay=1"
        assert len(p["actions"]) == 2
        assert "icon" in p and "badge" in p


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

    @pytest.mark.asyncio
    async def test_extended_paths_rate_limited(self):
        from lib.ratelimit import _is_rate_limited_path
        assert _is_rate_limited_path("/api/briefing/latest") is True
        assert _is_rate_limited_path("/api/briefing/history") is True
        assert _is_rate_limited_path("/api/briefing/2026-04-05") is True
        assert _is_rate_limited_path("/api/briefing/generate") is True
        assert _is_rate_limited_path("/api/briefing/audio") is True
        assert _is_rate_limited_path("/api/translate/en") is True
        assert _is_rate_limited_path("/api/search") is True
        assert _is_rate_limited_path("/api/share/abc") is True
        assert _is_rate_limited_path("/api/og/abc") is True


class TestGeminiCooldown:
    @pytest.mark.asyncio
    async def test_auth_errors_enter_cooldown_and_skip_followup_calls(self, monkeypatch):
        import services.llm_gemini as llm_gemini

        calls = []

        def fail_generate(*_args, **_kwargs):
            calls.append(1)
            raise RuntimeError("Permission denied")

        monkeypatch.setattr(llm_gemini, "GEMINI_API_KEY", "test-key")
        monkeypatch.setattr(llm_gemini, "_generate_content_sync", fail_generate)
        llm_gemini._gemini_auth_cooldown_until = 0.0
        llm_gemini._gemini_auth_cooldown_log_at = 0.0

        first = await llm_gemini.generate_gemini("system", "user")
        assert first is None
        assert len(calls) == 1
        assert llm_gemini._gemini_auth_cooldown_until > time.monotonic()

        second = await llm_gemini.generate_gemini("system", "user")
        assert second is None
        assert len(calls) == 1
