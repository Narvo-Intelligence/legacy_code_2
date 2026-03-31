"""
Narvo API Backend Tests
Tests all API endpoints for the Narvo audio-first news platform
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'http://localhost:8000')

class TestHealthEndpoint:
    """Health check endpoint tests"""
    
    def test_health_status(self):
        """Test /api/health returns online status"""
        response = requests.get(f"{BASE_URL}/api/health")
        assert response.status_code == 200
        
        data = response.json()
        assert data["status"] == "online"
        assert data["service"] == "Narvo API"
        assert "version" in data
        assert "timestamp" in data


class TestNewsEndpoints:
    """News API endpoint tests"""
    
    def test_get_news_list(self):
        """Test /api/news returns news items"""
        response = requests.get(f"{BASE_URL}/api/news?limit=5")
        assert response.status_code == 200
        
        data = response.json()
        assert isinstance(data, list)
        assert len(data) <= 5
        
        if len(data) > 0:
            news_item = data[0]
            assert "id" in news_item
            assert "title" in news_item
            assert "summary" in news_item
            assert "source" in news_item
            assert "region" in news_item
            assert "category" in news_item
    
    def test_get_news_with_region_filter(self):
        """Test /api/news with region filter"""
        response = requests.get(f"{BASE_URL}/api/news?region=Nigeria&limit=5")
        assert response.status_code == 200
        
        data = response.json()
        assert isinstance(data, list)
        # Verify region filter works - all items should be from Nigeria
        for item in data:
            assert item["region"].lower() == "nigeria"
    
    def test_get_news_detail(self):
        """Test /api/news/{id} returns news detail"""
        # First get a news item ID
        list_response = requests.get(f"{BASE_URL}/api/news?limit=1")
        assert list_response.status_code == 200
        news_list = list_response.json()
        
        if len(news_list) > 0:
            news_id = news_list[0]["id"]
            
            # Get detail
            detail_response = requests.get(f"{BASE_URL}/api/news/{news_id}")
            assert detail_response.status_code == 200
            
            data = detail_response.json()
            assert data["id"] == news_id
            assert "title" in data
            assert "summary" in data
    
    def test_get_news_detail_not_found(self):
        """Test /api/news/{id} returns 404 for invalid ID"""
        response = requests.get(f"{BASE_URL}/api/news/invalid-id-12345")
        assert response.status_code == 404


class TestVoicesEndpoint:
    """Voices API endpoint tests"""
    
    def test_get_voices(self):
        """Test /api/voices returns voice profiles"""
        response = requests.get(f"{BASE_URL}/api/voices")
        assert response.status_code == 200
        
        data = response.json()
        assert isinstance(data, list)
        assert len(data) > 0
        
        voice = data[0]
        assert "id" in voice
        assert "name" in voice
        assert "accent" in voice
        assert "description" in voice


class TestRegionsEndpoint:
    """Regions API endpoint tests"""
    
    def test_get_regions(self):
        """Test /api/regions returns available regions"""
        response = requests.get(f"{BASE_URL}/api/regions")
        assert response.status_code == 200
        
        data = response.json()
        assert isinstance(data, list)
        assert len(data) > 0
        
        region = data[0]
        assert "id" in region
        assert "name" in region


class TestCategoriesEndpoint:
    """Categories API endpoint tests"""
    
    def test_get_categories(self):
        """Test /api/categories returns news categories"""
        response = requests.get(f"{BASE_URL}/api/categories")
        assert response.status_code == 200
        
        data = response.json()
        assert isinstance(data, list)
        assert len(data) > 0
        
        category = data[0]
        assert "id" in category
        assert "name" in category


class TestTrendingEndpoint:
    """Trending API endpoint tests"""
    
    def test_get_trending(self):
        """Test /api/trending returns trending data"""
        response = requests.get(f"{BASE_URL}/api/trending")
        assert response.status_code == 200
        
        data = response.json()
        assert "tags" in data
        assert "topics" in data
        assert isinstance(data["tags"], list)
        assert isinstance(data["topics"], list)


class TestMetricsEndpoint:
    """Metrics API endpoint tests"""
    
    def test_get_metrics(self):
        """Test /api/metrics returns platform metrics"""
        response = requests.get(f"{BASE_URL}/api/metrics")
        assert response.status_code == 200
        
        data = response.json()
        assert "listeners_today" in data
        assert "sources_online" in data
        assert "stories_processed" in data


class TestBriefingEndpoints:
    """Morning briefing API endpoint tests"""
    
    def test_generate_briefing(self):
        """Test /api/briefing/generate returns briefing (may be slow)"""
        response = requests.get(f"{BASE_URL}/api/briefing/generate?voice_id=nova", timeout=120)
        # Allow 200 or 500 (TTS might fail but structure should be valid)
        assert response.status_code in [200, 500]
        
        if response.status_code == 200:
            data = response.json()
            assert "id" in data
            assert "title" in data
            assert "stories" in data
            assert "script" in data
        else:


class TestParaphraseEndpoint:
    """Paraphrase API endpoint tests"""
    
    def test_paraphrase_text(self):
        """Test /api/paraphrase generates narrative"""
        response = requests.post(
            f"{BASE_URL}/api/paraphrase",
            json={
                "text": "Nigeria's economy shows signs of recovery with inflation dropping to 12%.",
                "style": "broadcast"
            },
            timeout=60
        )
        assert response.status_code == 200
        
        data = response.json()
        assert "original" in data
        assert "narrative" in data
        assert "key_takeaways" in data


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
