"""Extended backend tests for TTS, Podcast, and Aggregator services."""
import pytest  # type: ignore[reportMissingImports]
import httpx  # type: ignore[reportMissingImports]
import os

from services.news_service import RSS_FEED_COUNT

API_URL = os.environ.get("REACT_APP_BACKEND_URL", "http://localhost:8001")


@pytest.fixture
def http_client():
    """Live API — requires running server on API_URL."""
    return httpx.Client(base_url=API_URL, timeout=30)


# ── TTS Endpoints ─────────────────────────────────────────────────────

class TestTTS:
    def test_tts_generate_returns_audio(self, http_client):
        r = http_client.post(
            "/api/tts/generate",
            json={"text": "Hello Narvo", "voice_id": "onyx", "language": "en"},
        )
        assert r.status_code == 200
        data = r.json()
        assert "audio_url" in data
        assert data["audio_url"].startswith(("data:audio/mpeg;base64,", "http://", "https://"))
        assert data["voice_id"] in ["onyx", "echo", "nova", "shimmer", "alloy"]
        assert data["language"] == "en"

    def test_tts_voice_mapping_english_male(self, http_client):
        r = http_client.post(
            "/api/tts/generate",
            json={"text": "English test", "voice_id": "onyx", "language": "en"},
        )
        assert r.status_code == 200
        data = r.json()
        assert data["voice_id"] == "onyx"  # Male voice for English

    def test_tts_voice_mapping_yoruba_female(self, http_client):
        r = http_client.post(
            "/api/tts/generate",
            json={"text": "Yoruba test", "voice_id": "onyx", "language": "yo"},
        )
        assert r.status_code == 200
        data = r.json()
        assert data["voice_id"] == "nova"  # Female voice for Yoruba
        assert data["translated_text"] is not None  # Should be translated

    def test_tts_with_translation_pidgin(self, http_client):
        r = http_client.post(
            "/api/tts/generate",
            json={"text": "Welcome to the news", "voice_id": "onyx", "language": "pcm"},
        )
        assert r.status_code == 200
        data = r.json()
        assert data["voice_id"] == "echo"  # Male voice for Pidgin

    def test_tts_voices_list(self, client):
        """In-process: canonical `/api/tts/voices` (uses TestClient from conftest)."""
        r = client.get("/api/tts/voices")
        assert r.status_code == 200
        data = r.json()
        assert isinstance(data, list)
        assert len(data) >= 5
        genders = {v["id"]: v.get("gender") for v in data}
        # YarnGPT narrator ids (see `services/yarngpt_service.YARNGPT_VOICES`)
        assert genders.get("emma") == "male"
        assert genders.get("osagie") == "male"
        assert genders.get("idera") == "female"
        assert genders.get("zainab") == "female"
        assert genders.get("wura") == "female"


# ── Podcast Endpoints ─────────────────────────────────────────────────

class TestPodcast:
    def test_podcasts_list(self, http_client):
        r = http_client.get("/api/podcasts?limit=5")
        assert r.status_code == 200
        data = r.json()
        assert isinstance(data, list)

    def test_podcasts_list_main_endpoint(self, http_client):
        r = http_client.get("/api/podcasts?limit=5")
        assert r.status_code == 200


# ── Aggregator Endpoints ──────────────────────────────────────────────

class TestAggregators:
    def test_aggregator_status(self, http_client):
        r = http_client.get("/api/aggregators/status")
        assert r.status_code == 200
        data = r.json()
        assert "mediastack" in data
        assert "newsdata" in data
        assert data["mediastack"]["configured"] is True
        assert data["newsdata"]["configured"] is True

    def test_fetch_mediastack(self, http_client):
        r = http_client.get("/api/aggregators/mediastack?keywords=Nigeria&limit=5")
        assert r.status_code == 200
        data = r.json()
        assert "count" in data
        assert "articles" in data

    def test_fetch_newsdata(self, http_client):
        r = http_client.get("/api/aggregators/newsdata?query=Nigeria&limit=5")
        assert r.status_code == 200
        data = r.json()
        assert "count" in data
        assert "articles" in data

    def test_fetch_all_aggregators(self, http_client):
        r = http_client.get("/api/aggregators/fetch?keywords=Nigeria")
        assert r.status_code == 200
        data = r.json()
        assert "mediastack" in data
        assert "newsdata" in data
        assert "total" in data

    def test_mediastack_article_structure(self, http_client):
        r = http_client.get("/api/aggregators/mediastack?keywords=Nigeria&limit=3")
        data = r.json()
        if data["count"] > 0:
            article = data["articles"][0]
            assert "id" in article
            assert "title" in article
            assert "source" in article
            assert article["aggregator"] == "mediastack"

    def test_newsdata_article_structure(self, http_client):
        r = http_client.get("/api/aggregators/newsdata?query=Nigeria&limit=3")
        data = r.json()
        if data["count"] > 0:
            article = data["articles"][0]
            assert "id" in article
            assert "title" in article
            assert "source" in article
            assert article["aggregator"] == "newsdata"


# ── Regression: Health Check ──────────────────────────────────────────

class TestHealthRegression:
    def test_health_endpoint(self, http_client):
        r = http_client.get("/api/health")
        assert r.status_code == 200

    def test_sources_health(self, http_client):
        r = http_client.get("/api/sources/health")
        assert r.status_code == 200
        data = r.json()
        assert data["total"] == RSS_FEED_COUNT

    def test_sources_count(self, http_client):
        r = http_client.get("/api/sources")
        assert r.status_code == 200
        data = r.json()
        assert data["total_sources"] == RSS_FEED_COUNT
