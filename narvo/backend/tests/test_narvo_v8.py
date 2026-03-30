"""
Narvo API Backend Tests - Iteration 8
Testing all API endpoints after UI rebuild
"""
import pytest
import requests
import os
import uuid

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'http://localhost:8000')

class TestHealthAndCore:
    """Health and core endpoint tests"""
    
    def test_health_endpoint(self):
        """Test /api/health returns online status"""
        response = requests.get(f"{BASE_URL}/api/health")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "online"
        assert data["service"] == "Narvo API"
        assert data["version"] == "2.0"
        assert "timestamp" in data
    
    def test_metrics_endpoint(self):
        """Test /api/metrics returns platform metrics"""
        response = requests.get(f"{BASE_URL}/api/metrics")
        assert response.status_code == 200
        data = response.json()
        assert "listeners_today" in data
        assert "sources_online" in data
        assert "stories_processed" in data
        assert "signal_strength" in data
    
    def test_regions_endpoint(self):
        """Test /api/regions returns available regions"""
        response = requests.get(f"{BASE_URL}/api/regions")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        assert len(data) >= 2  # Nigeria and Continental
    
    def test_categories_endpoint(self):
        """Test /api/categories returns news categories"""
        response = requests.get(f"{BASE_URL}/api/categories")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        assert len(data) >= 5  # Multiple categories
    
    def test_trending_endpoint(self):
        """Test /api/trending returns trending topics"""
        response = requests.get(f"{BASE_URL}/api/trending")
        assert response.status_code == 200
        data = response.json()
        assert "tags" in data
        assert "topics" in data
    
    def test_voices_endpoint(self):
        """Test /api/voices returns voice profiles"""
        response = requests.get(f"{BASE_URL}/api/voices")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        assert len(data) == 5  # 5 voice profiles
        voice_ids = [v["id"] for v in data]
        assert "nova" in voice_ids
        assert "onyx" in voice_ids


class TestNewsEndpoints:
    """News feed and detail endpoint tests"""
    
    def test_news_list(self):
        """Test /api/news returns news items"""
        response = requests.get(f"{BASE_URL}/api/news?limit=5")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        assert len(data) > 0
        # Verify news item structure
        item = data[0]
        assert "id" in item
        assert "title" in item
        assert "summary" in item
        assert "source" in item
        assert "category" in item
    
    def test_news_limit_parameter(self):
        """Test /api/news respects limit parameter"""
        response = requests.get(f"{BASE_URL}/api/news?limit=3")
        assert response.status_code == 200
        data = response.json()
        assert len(data) <= 3
    
    def test_news_detail_valid_id(self):
        """Test /api/news/{id} returns news detail with narrative"""
        # First get a valid news ID
        list_response = requests.get(f"{BASE_URL}/api/news?limit=1")
        news_items = list_response.json()
        assert len(news_items) > 0
        news_id = news_items[0]["id"]
        
        # Get detail
        response = requests.get(f"{BASE_URL}/api/news/{news_id}")
        assert response.status_code == 200
        data = response.json()
        assert data["id"] == news_id
        assert "title" in data
        assert "summary" in data
        # Narrative may or may not be generated
    
    def test_news_detail_invalid_id(self):
        """Test /api/news/{id} returns 404 for invalid ID"""
        response = requests.get(f"{BASE_URL}/api/news/invalid_id_12345")
        assert response.status_code == 404


class TestBookmarksEndpoints:
    """Bookmark CRUD endpoint tests"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Generate unique user ID for test isolation"""
        self.user_id = f"test_user_{uuid.uuid4().hex[:8]}"
        yield
    
    def test_get_empty_bookmarks(self):
        """Test /api/bookmarks returns empty for new user"""
        user_id = f"new_user_{uuid.uuid4().hex[:8]}"
        response = requests.get(f"{BASE_URL}/api/bookmarks?user_id={user_id}")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        assert len(data) == 0
    
    def test_add_bookmark(self):
        """Test POST /api/bookmarks adds bookmark"""
        bookmark_data = {
            "user_id": self.user_id,
            "story_id": f"story_{uuid.uuid4().hex[:8]}",
            "title": "Test Bookmark Story",
            "summary": "Test summary for bookmark",
            "source": "Test Source",
            "category": "Tech",
            "source_url": "https://example.com/story"
        }
        response = requests.post(
            f"{BASE_URL}/api/bookmarks",
            json=bookmark_data
        )
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "ok"
        assert "bookmark" in data
    
    def test_get_bookmarks_after_add(self):
        """Test GET /api/bookmarks returns added bookmark"""
        story_id = f"story_{uuid.uuid4().hex[:8]}"
        # Add bookmark
        requests.post(
            f"{BASE_URL}/api/bookmarks",
            json={
                "user_id": self.user_id,
                "story_id": story_id,
                "title": "Test Persistence",
                "summary": "Testing persistence",
                "source": "Test",
                "category": "General"
            }
        )
        # Get bookmarks
        response = requests.get(f"{BASE_URL}/api/bookmarks?user_id={self.user_id}")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        # Find our bookmark
        found = any(b["story_id"] == story_id for b in data)
        assert found, "Added bookmark should be in list"
    
    def test_delete_bookmark(self):
        """Test DELETE /api/bookmarks/{story_id} removes bookmark"""
        story_id = f"delete_test_{uuid.uuid4().hex[:8]}"
        # Add bookmark first
        requests.post(
            f"{BASE_URL}/api/bookmarks",
            json={
                "user_id": self.user_id,
                "story_id": story_id,
                "title": "To Delete",
                "source": "Test"
            }
        )
        # Delete it
        response = requests.delete(
            f"{BASE_URL}/api/bookmarks/{story_id}?user_id={self.user_id}"
        )
        assert response.status_code == 200
        assert response.json()["status"] == "ok"
        
        # Verify deletion
        get_response = requests.get(f"{BASE_URL}/api/bookmarks?user_id={self.user_id}")
        bookmarks = get_response.json()
        found = any(b["story_id"] == story_id for b in bookmarks)
        assert not found, "Deleted bookmark should not be in list"


class TestPreferencesEndpoints:
    """User preferences CRUD endpoint tests"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Generate unique user ID for test isolation"""
        self.user_id = f"pref_user_{uuid.uuid4().hex[:8]}"
        yield
    
    def test_get_default_preferences(self):
        """Test /api/preferences returns defaults for unknown user"""
        user_id = f"unknown_{uuid.uuid4().hex[:8]}"
        response = requests.get(f"{BASE_URL}/api/preferences?user_id={user_id}")
        assert response.status_code == 200
        data = response.json()
        # Should have default values
        assert "region" in data
        assert "voice" in data
        assert "interests" in data
    
    def test_save_preferences(self):
        """Test POST /api/preferences saves preferences"""
        prefs_data = {
            "user_id": self.user_id,
            "region": "lagos",
            "voice": "pidgin",
            "interests": ["politics", "tech", "sports"]
        }
        response = requests.post(
            f"{BASE_URL}/api/preferences",
            json=prefs_data
        )
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "ok"
        assert "preferences" in data
    
    def test_get_saved_preferences(self):
        """Test /api/preferences returns saved preferences"""
        # Save first
        requests.post(
            f"{BASE_URL}/api/preferences",
            json={
                "user_id": self.user_id,
                "region": "nairobi",
                "voice": "echo",
                "interests": ["economy"]
            }
        )
        # Get preferences
        response = requests.get(f"{BASE_URL}/api/preferences?user_id={self.user_id}")
        assert response.status_code == 200
        data = response.json()
        assert data["region"] == "nairobi"
        assert data["voice"] == "echo"
    
    def test_update_preferences(self):
        """Test updating preferences overwrites old values"""
        # Save initial
        requests.post(
            f"{BASE_URL}/api/preferences",
            json={
                "user_id": self.user_id,
                "region": "lagos",
                "voice": "nova",
                "interests": ["sports"]
            }
        )
        # Update
        requests.post(
            f"{BASE_URL}/api/preferences",
            json={
                "user_id": self.user_id,
                "region": "accra",
                "voice": "onyx",
                "interests": ["tech", "politics"]
            }
        )
        # Verify
        response = requests.get(f"{BASE_URL}/api/preferences?user_id={self.user_id}")
        data = response.json()
        assert data["region"] == "accra"
        assert data["voice"] == "onyx"
        assert "tech" in data["interests"]


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
