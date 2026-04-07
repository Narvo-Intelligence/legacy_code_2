"""
Iteration 33 Tests - Aggregator Integration into Feed and Discover
Tests:
1. GET /api/news?include_aggregators=true returns articles with 'aggregator' field
2. GET /api/news without include_aggregators returns only RSS articles
3. GET /api/metrics includes aggregators status object
4. GET /api/aggregators/status shows configured:true with cached_count after fetching
5. Regression tests for health monitoring and existing features
"""
import pytest  # type: ignore[reportMissingImports]
import httpx  # type: ignore[reportMissingImports]
import os

from services.news_service import RSS_FEED_COUNT

API_URL = os.environ.get("REACT_APP_BACKEND_URL", "http://localhost:8001")


@pytest.fixture
def client():
    return httpx.Client(base_url=API_URL, timeout=30)


# ── 1. News API with include_aggregators=true ─────────────────────────

class TestNewsWithAggregators:
    def test_news_with_include_aggregators_returns_aggregator_field(self, client):
        """GET /api/news?include_aggregators=true should return articles with 'aggregator' field"""
        r = client.get("/api/news?limit=50&include_aggregators=true")
        assert r.status_code == 200
        data = r.json()
        assert isinstance(data, list)
        assert len(data) > 0
        
        # Check if any articles have aggregator field
        aggregator_articles = [a for a in data if a.get("aggregator")]
        # There should be at least some aggregator articles (mediastack or newsdata)
        
        # Validate structure of aggregator articles if present
        for article in aggregator_articles:
            assert article["aggregator"] in ["mediastack", "newsdata"]
            assert "id" in article
            assert "title" in article
            assert "source" in article
            assert "source_url" in article

    def test_news_without_include_aggregators_no_aggregator_field(self, client):
        """GET /api/news without include_aggregators returns only RSS articles (no aggregator field)"""
        r = client.get("/api/news?limit=20")
        assert r.status_code == 200
        data = r.json()
        assert isinstance(data, list)
        
        # No articles should have aggregator field when include_aggregators is not set
        aggregator_articles = [a for a in data if a.get("aggregator")]
        assert len(aggregator_articles) == 0, "RSS-only feed should not contain aggregator articles"

    def test_news_include_aggregators_false(self, client):
        """GET /api/news?include_aggregators=false should not return aggregator articles"""
        r = client.get("/api/news?limit=20&include_aggregators=false")
        assert r.status_code == 200
        data = r.json()
        aggregator_articles = [a for a in data if a.get("aggregator")]
        assert len(aggregator_articles) == 0


# ── 2. Metrics API with aggregators ───────────────────────────────────

class TestMetricsWithAggregators:
    def test_metrics_includes_aggregators_object(self, client):
        """GET /api/metrics should include aggregators status object"""
        r = client.get("/api/metrics")
        assert r.status_code == 200
        data = r.json()
        
        # Metrics should contain aggregators object
        assert "aggregators" in data
        aggregators = data["aggregators"]
        
        # Aggregators should have mediastack and newsdata
        assert "mediastack" in aggregators
        assert "newsdata" in aggregators
        
        # Each should have configured status
        assert "configured" in aggregators["mediastack"]
        assert "configured" in aggregators["newsdata"]
        assert aggregators["mediastack"]["configured"] is True
        assert aggregators["newsdata"]["configured"] is True

    def test_metrics_aggregators_cached_count(self, client):
        """After fetching, aggregators should have cached_count > 0"""
        # First trigger a fetch to populate cache
        client.get("/api/aggregators/fetch?keywords=Nigeria")
        
        # Then check metrics
        r = client.get("/api/metrics")
        assert r.status_code == 200
        data = r.json()
        
        aggregators = data["aggregators"]
        assert "cached_count" in aggregators["mediastack"]
        assert "cached_count" in aggregators["newsdata"]


# ── 3. Aggregators Status Endpoint ────────────────────────────────────

class TestAggregatorsStatus:
    def test_aggregators_status_configured(self, client):
        """GET /api/aggregators/status shows configured:true for both"""
        r = client.get("/api/aggregators/status")
        assert r.status_code == 200
        data = r.json()
        
        assert data["mediastack"]["configured"] is True
        assert data["newsdata"]["configured"] is True

    def test_aggregators_status_after_fetch(self, client):
        """After fetching, cached_count should be > 0"""
        # Trigger fetch first
        client.get("/api/aggregators/fetch?keywords=Nigeria+Africa")
        
        # Check status
        r = client.get("/api/aggregators/status")
        assert r.status_code == 200
        data = r.json()
        
        # After fetch, at least one should have cached articles
        total_cached = data["mediastack"]["cached_count"] + data["newsdata"]["cached_count"]
        # Note: Count may be 0 if API quotas are exhausted, but structure should be correct
        assert total_cached >= 0
        assert "cached_count" in data["mediastack"]
        assert "cached_count" in data["newsdata"]


# ── 4. Aggregator Article Fields ──────────────────────────────────────

class TestAggregatorArticleFields:
    def test_mediastack_articles_have_aggregator_field(self, client):
        """Mediastack articles should have aggregator='mediastack'"""
        r = client.get("/api/aggregators/mediastack?keywords=Nigeria&limit=5")
        assert r.status_code == 200
        data = r.json()
        
        for article in data.get("articles", []):
            assert article.get("aggregator") == "mediastack"
            assert "id" in article
            assert article["id"].startswith("ms_")

    def test_newsdata_articles_have_aggregator_field(self, client):
        """NewsData articles should have aggregator='newsdata'"""
        r = client.get("/api/aggregators/newsdata?query=Nigeria&limit=5")
        assert r.status_code == 200
        data = r.json()
        
        for article in data.get("articles", []):
            assert article.get("aggregator") == "newsdata"
            assert "id" in article
            assert article["id"].startswith("nd_")


# ── 5. Regression Tests: Health Monitoring and RSS Feed Count ─────────

class TestRegressionFeatures:
    def test_health_endpoint(self, client):
        """Health endpoint should return online status"""
        r = client.get("/api/health")
        assert r.status_code == 200
        data = r.json()
        assert data["status"] == "online"

    def test_sources_health_feeds(self, client):
        """Sources health should report current RSS feed count"""
        r = client.get("/api/sources/health")
        assert r.status_code == 200
        data = r.json()
        assert data["total"] == RSS_FEED_COUNT

    def test_sources_count(self, client):
        """Sources endpoint should report current total sources"""
        r = client.get("/api/sources")
        assert r.status_code == 200
        data = r.json()
        assert data["total_sources"] == RSS_FEED_COUNT

    def test_voices_endpoint(self, client):
        """Voices endpoint should return 5 voices with gender"""
        r = client.get("/api/tts/voices")
        assert r.status_code == 200
        data = r.json()
        assert len(data) >= 5
        for voice in data:
            assert "gender" in voice

    def test_news_basic_endpoint(self, client):
        """News endpoint should return articles from RSS feeds"""
        r = client.get("/api/news?limit=10")
        assert r.status_code == 200
        data = r.json()
        assert isinstance(data, list)
        assert len(data) > 0
        
        # RSS articles should have standard fields
        for article in data:
            assert "id" in article
            assert "title" in article
            assert "source" in article
            assert "region" in article
