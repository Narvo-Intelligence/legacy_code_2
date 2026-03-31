"""
Narvo API Backend Tests - v2 with Bookmark CRUD
Tests all API endpoints for the Narvo audio-first news platform
Including the new bookmark feature endpoints
"""
import pytest
import requests
import os
import uuid

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
        for item in data:
            assert item["region"].lower() == "nigeria"
    
    def test_get_news_detail(self):
        """Test /api/news/{id} returns news detail"""
        list_response = requests.get(f"{BASE_URL}/api/news?limit=1")
        assert list_response.status_code == 200
        news_list = list_response.json()
        
        if len(news_list) > 0:
            news_id = news_list[0]["id"]
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


class TestBookmarkEndpoints:
    """Bookmark CRUD API endpoint tests - NEW FEATURE"""
    
    @pytest.fixture(autouse=True)
    def setup_test_data(self):
        """Setup unique test user for each test"""
        self.test_user_id = f"TEST_user_{uuid.uuid4().hex[:8]}"
        self.test_story_id = f"TEST_story_{uuid.uuid4().hex[:8]}"
        yield
        # Cleanup - remove test bookmark
        requests.delete(
            f"{BASE_URL}/api/bookmarks/{self.test_story_id}?user_id={self.test_user_id}"
        )
    
    def test_create_bookmark(self):
        """Test POST /api/bookmarks creates a bookmark"""
        payload = {
            "user_id": self.test_user_id,
            "story_id": self.test_story_id,
            "title": "Test Story Title",
            "summary": "Test story summary for bookmark test",
            "source": "Test Source",
            "category": "Tech",
            "source_url": "https://example.com/story",
            "saved_at": "2026-01-24T12:00:00Z"
        }
        
        response = requests.post(f"{BASE_URL}/api/bookmarks", json=payload)
        assert response.status_code == 200
        
        data = response.json()
        assert data["status"] == "ok"
        assert "bookmark" in data
        assert data["bookmark"]["story_id"] == self.test_story_id
        assert data["bookmark"]["title"] == "Test Story Title"
    
    def test_get_bookmarks_for_user(self):
        """Test GET /api/bookmarks?user_id=X returns user's bookmarks"""
        # First create a bookmark
        payload = {
            "user_id": self.test_user_id,
            "story_id": self.test_story_id,
            "title": "Test Story for GET",
            "summary": "Summary",
            "source": "Source",
            "category": "General",
            "source_url": "",
            "saved_at": ""
        }
        create_response = requests.post(f"{BASE_URL}/api/bookmarks", json=payload)
        assert create_response.status_code == 200
        
        # Now get bookmarks for user
        response = requests.get(f"{BASE_URL}/api/bookmarks?user_id={self.test_user_id}")
        assert response.status_code == 200
        
        data = response.json()
        assert isinstance(data, list)
        assert len(data) >= 1
        
        # Find our test bookmark
        test_bookmark = next((b for b in data if b["story_id"] == self.test_story_id), None)
        assert test_bookmark is not None
        assert test_bookmark["title"] == "Test Story for GET"
    
    def test_get_bookmarks_empty_user(self):
        """Test GET /api/bookmarks for user with no bookmarks returns empty list"""
        random_user_id = f"TEST_nonexistent_{uuid.uuid4().hex[:8]}"
        response = requests.get(f"{BASE_URL}/api/bookmarks?user_id={random_user_id}")
        assert response.status_code == 200
        
        data = response.json()
        assert isinstance(data, list)
        assert len(data) == 0
    
    def test_delete_bookmark(self):
        """Test DELETE /api/bookmarks/{story_id}?user_id=X removes bookmark"""
        # First create a bookmark
        payload = {
            "user_id": self.test_user_id,
            "story_id": self.test_story_id,
            "title": "Test Story to Delete",
            "summary": "Will be deleted",
            "source": "Source",
            "category": "General",
            "source_url": "",
            "saved_at": ""
        }
        create_response = requests.post(f"{BASE_URL}/api/bookmarks", json=payload)
        assert create_response.status_code == 200
        
        # Verify it exists
        get_response = requests.get(f"{BASE_URL}/api/bookmarks?user_id={self.test_user_id}")
        assert len(get_response.json()) >= 1
        
        # Delete the bookmark
        delete_response = requests.delete(
            f"{BASE_URL}/api/bookmarks/{self.test_story_id}?user_id={self.test_user_id}"
        )
        assert delete_response.status_code == 200
        assert delete_response.json()["status"] == "ok"
        
        # Verify it's gone
        verify_response = requests.get(f"{BASE_URL}/api/bookmarks?user_id={self.test_user_id}")
        verify_data = verify_response.json()
        test_bookmark = next((b for b in verify_data if b["story_id"] == self.test_story_id), None)
        assert test_bookmark is None
    
    def test_bookmark_replaces_existing(self):
        """Test POST /api/bookmarks replaces existing bookmark with same story_id"""
        # Create first bookmark
        payload1 = {
            "user_id": self.test_user_id,
            "story_id": self.test_story_id,
            "title": "Original Title",
            "summary": "Original summary",
            "source": "Original",
            "category": "General",
            "source_url": "",
            "saved_at": "2026-01-01T00:00:00Z"
        }
        requests.post(f"{BASE_URL}/api/bookmarks", json=payload1)
        
        # Create another with same story_id but different title
        payload2 = {
            "user_id": self.test_user_id,
            "story_id": self.test_story_id,
            "title": "Updated Title",
            "summary": "Updated summary",
            "source": "Updated",
            "category": "Tech",
            "source_url": "https://new.url",
            "saved_at": "2026-01-02T00:00:00Z"
        }
        requests.post(f"{BASE_URL}/api/bookmarks", json=payload2)
        
        # Get bookmarks and verify only one exists with updated data
        response = requests.get(f"{BASE_URL}/api/bookmarks?user_id={self.test_user_id}")
        data = response.json()
        
        matching_bookmarks = [b for b in data if b["story_id"] == self.test_story_id]
        assert len(matching_bookmarks) == 1
        assert matching_bookmarks[0]["title"] == "Updated Title"


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
