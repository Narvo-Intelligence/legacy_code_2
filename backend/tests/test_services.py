"""Backend integration tests for Narvo core services."""
import pytest
import httpx
import os

API_URL = os.environ.get("REACT_APP_BACKEND_URL", "http://localhost:8001")


@pytest.fixture
def http_client():
    """Live API (requires running server). Do not name `client` — that is the in-process TestClient from conftest."""
    return httpx.Client(base_url=API_URL, timeout=30)


# ── News / Content Sources ────────────────────────────────────────────

class TestContentSources:
    def test_sources_returns_total(self, http_client):
        r = http_client.get("/api/sources")
        assert r.status_code == 200
        data = r.json()
        assert "total_sources" in data
        assert data["total_sources"] >= 30

    def test_sources_has_regions(self, http_client):
        r = http_client.get("/api/sources")
        data = r.json()
        assert data["local_sources"] > 0
        assert data["international_sources"] > 0
        assert data.get("continental_sources", 0) > 0

    def test_sources_has_categories(self, http_client):
        r = http_client.get("/api/sources")
        data = r.json()
        assert "categories" in data
        assert "General" in data["categories"]

    def test_sources_lists_individual(self, http_client):
        r = http_client.get("/api/sources")
        data = r.json()
        assert "sources" in data
        assert len(data["sources"]) > 0
        source = data["sources"][0]
        assert "name" in source
        assert "category" in source
        assert "region" in source

    def test_sources_no_dubawa(self, http_client):
        r = http_client.get("/api/sources")
        data = r.json()
        api_names = [v["name"] for v in data.get("verification_apis", [])]
        assert "Dubawa" not in api_names

    def test_sources_has_aggregators(self, http_client):
        r = http_client.get("/api/sources")
        data = r.json()
        assert "aggregator_apis" in data
        names = [a["name"] for a in data["aggregator_apis"]]
        assert "Mediastack" in names
        assert "NewsData.io" in names


class TestNewsEndpoint:
    def test_news_returns_list(self, http_client):
        r = http_client.get("/api/news?limit=5")
        assert r.status_code == 200
        data = r.json()
        assert isinstance(data, list)

    def test_news_search(self, http_client):
        r = http_client.get("/api/search?q=Nigeria&limit=5")
        assert r.status_code == 200


# ── Settings via /api/me/settings ────────────────────────────────────

class TestMeSettings:
    USER_ID = "test_user_pytest"

    def test_save_settings(self, auth_me_client_factory):
        c = auth_me_client_factory(self.USER_ID)
        r = c.post("/api/me/settings", json={"broadcast_language": "yo"})
        assert r.status_code == 200
        assert r.json()["status"] == "updated"

    def test_fetch_settings_reflects_save(self, auth_me_client_factory):
        c = auth_me_client_factory(self.USER_ID)
        c.post("/api/me/settings", json={"broadcast_language": "ha"})
        r = c.get("/api/me/settings")
        assert r.status_code == 200
        data = r.json()
        assert data["broadcast_language"] == "ha"

    def test_settings_merge_preserves_fields(self, auth_me_client_factory):
        c = auth_me_client_factory(self.USER_ID)
        c.post(
            "/api/me/settings",
            json={"broadcast_language": "ig", "alert_volume": 90},
        )
        c.post("/api/me/settings", json={"alert_volume": 50})
        r = c.get("/api/me/settings")
        data = r.json()
        assert data["broadcast_language"] == "ig"
        assert data["alert_volume"] == 50

    def test_default_settings_for_new_user(self, auth_me_client_factory):
        c = auth_me_client_factory("nonexistent_user_xyz_99")
        r = c.get("/api/me/settings")
        assert r.status_code == 200
        data = r.json()
        assert data["broadcast_language"] == "en"


# ── Translation Endpoints ─────────────────────────────────────────────

class TestTranslation:
    def test_languages_list(self, http_client):
        r = http_client.get("/api/translate/languages")
        assert r.status_code == 200
        data = r.json()
        assert isinstance(data, list)
        codes = [lang["code"] for lang in data]
        assert "en" in codes
        assert "pcm" in codes

    def test_quick_translate(self, http_client):
        r = http_client.get("/api/translate/quick?text=Hello&lang=pcm")
        assert r.status_code == 200


# ── Fact-Check Endpoints ──────────────────────────────────────────────

class TestFactCheck:
    def test_factcheck_search(self, http_client):
        r = http_client.get("/api/factcheck/search?query=climate+change")
        assert r.status_code == 200

    def test_factcheck_verify(self, http_client):
        r = http_client.get("/api/factcheck/verify?claim=The+earth+is+flat")
        assert r.status_code == 200
        data = r.json()
        assert "verdict" in data or "error" in data


# ── Metrics ───────────────────────────────────────────────────────────

class TestMetrics:
    def test_metrics_includes_total_sources(self, http_client):
        r = http_client.get("/api/metrics")
        assert r.status_code == 200
        data = r.json()
        assert "total_sources" in data
        assert data["total_sources"] >= 30

    def test_metrics_includes_local_and_international(self, http_client):
        r = http_client.get("/api/metrics")
        data = r.json()
        assert data["local_sources"] > 0
        assert data["international_sources"] > 0


# ── Health ────────────────────────────────────────────────────────────

class TestHealth:
    def test_health_endpoint(self, http_client):
        r = http_client.get("/api/health")
        assert r.status_code == 200
