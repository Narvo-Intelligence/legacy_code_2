"""
Test suite for Narvo API - MongoDB Persistence Features (v7)
Tests: Bookmarks persistence, User preferences persistence, Core APIs
"""
import pytest
import requests
import os
import uuid
from datetime import datetime

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Generate unique test user ID for each test run
TEST_USER_ID = f"test_user_{uuid.uuid4().hex[:8]}"


class TestHealthEndpoints:
    """Health and basic API tests"""
    
    def test_health_endpoint(self):
        """Test /api/health returns OK"""
        response = requests.get(f"{BASE_URL}/api/health")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "online"
        assert "timestamp" in data

    def test_news_endpoint(self):
        """Test /api/news returns news data"""
        response = requests.get(f"{BASE_URL}/api/news?limit=5")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)

    def test_voices_endpoint(self):
        """Test /api/voices returns voice profiles"""
        response = requests.get(f"{BASE_URL}/api/voices")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        assert len(data) > 0
        # Verify voice structure
        assert "id" in data[0]
        assert "name" in data[0]


class TestBookmarksPersistence:
    """Test MongoDB-backed bookmark persistence"""
    
    def test_bookmarks_empty_for_new_user(self):
        """Test that new user has empty bookmarks"""
        unique_user = f"empty_user_{uuid.uuid4().hex[:8]}"
        response = requests.get(f"{BASE_URL}/api/bookmarks", params={"user_id": unique_user})
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        assert len(data) == 0

    def test_create_bookmark(self):
        """Test POST /api/bookmarks creates bookmark in MongoDB"""
        bookmark_data = {
            "user_id": TEST_USER_ID,
            "story_id": f"test_story_{uuid.uuid4().hex[:8]}",
            "title": "Test Story Title",
            "summary": "This is a test story summary",
            "source": "Test Source",
            "category": "Politics",
            "source_url": "https://example.com/story",
            "saved_at": datetime.utcnow().isoformat()
        }
        response = requests.post(f"{BASE_URL}/api/bookmarks", json=bookmark_data)
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "ok"
        assert "bookmark" in data
        assert data["bookmark"]["title"] == bookmark_data["title"]
        return bookmark_data

    def test_get_bookmarks_returns_created(self):
        """Test GET /api/bookmarks returns previously created bookmark"""
        # First create a bookmark
        story_id = f"persist_test_{uuid.uuid4().hex[:8]}"
        bookmark_data = {
            "user_id": TEST_USER_ID,
            "story_id": story_id,
            "title": "Persistence Test Story",
            "summary": "Testing that bookmarks persist in MongoDB",
            "source": "MongoDB Test",
            "category": "Tech"
        }
        create_response = requests.post(f"{BASE_URL}/api/bookmarks", json=bookmark_data)
        assert create_response.status_code == 200
        
        # Then retrieve bookmarks
        get_response = requests.get(f"{BASE_URL}/api/bookmarks", params={"user_id": TEST_USER_ID})
        assert get_response.status_code == 200
        bookmarks = get_response.json()
        
        # Verify the created bookmark exists
        story_ids = [b["story_id"] for b in bookmarks]
        assert story_id in story_ids, f"Created story_id '{story_id}' not found in retrieved bookmarks"

    def test_delete_bookmark(self):
        """Test DELETE /api/bookmarks removes from MongoDB"""
        # Create a bookmark to delete
        story_id = f"delete_test_{uuid.uuid4().hex[:8]}"
        create_data = {
            "user_id": TEST_USER_ID,
            "story_id": story_id,
            "title": "Story to Delete",
            "summary": "This will be deleted",
            "source": "Delete Test"
        }
        requests.post(f"{BASE_URL}/api/bookmarks", json=create_data)
        
        # Verify it exists
        get_response = requests.get(f"{BASE_URL}/api/bookmarks", params={"user_id": TEST_USER_ID})
        bookmarks_before = get_response.json()
        before_ids = [b["story_id"] for b in bookmarks_before]
        assert story_id in before_ids, "Bookmark should exist before deletion"
        
        # Delete it
        delete_response = requests.delete(f"{BASE_URL}/api/bookmarks/{story_id}", params={"user_id": TEST_USER_ID})
        assert delete_response.status_code == 200
        assert delete_response.json()["status"] == "ok"
        
        # Verify it's gone
        get_after = requests.get(f"{BASE_URL}/api/bookmarks", params={"user_id": TEST_USER_ID})
        bookmarks_after = get_after.json()
        after_ids = [b["story_id"] for b in bookmarks_after]
        assert story_id not in after_ids, "Bookmark should not exist after deletion"

    def test_bookmark_upsert_behavior(self):
        """Test that same story_id updates existing bookmark (upsert)"""
        story_id = f"upsert_test_{uuid.uuid4().hex[:8]}"
        
        # Create initial bookmark
        initial_data = {
            "user_id": TEST_USER_ID,
            "story_id": story_id,
            "title": "Original Title",
            "summary": "Original summary",
            "source": "Original Source"
        }
        requests.post(f"{BASE_URL}/api/bookmarks", json=initial_data)
        
        # Update with same story_id
        updated_data = {
            "user_id": TEST_USER_ID,
            "story_id": story_id,
            "title": "Updated Title",
            "summary": "Updated summary",
            "source": "Updated Source"
        }
        update_response = requests.post(f"{BASE_URL}/api/bookmarks", json=updated_data)
        assert update_response.status_code == 200
        
        # Verify only one bookmark exists with updated data
        get_response = requests.get(f"{BASE_URL}/api/bookmarks", params={"user_id": TEST_USER_ID})
        bookmarks = get_response.json()
        matching = [b for b in bookmarks if b["story_id"] == story_id]
        assert len(matching) == 1, "Should have exactly one bookmark with this story_id"
        assert matching[0]["title"] == "Updated Title", "Title should be updated"


class TestUserPreferencesPersistence:
    """Test MongoDB-backed user preferences persistence"""
    
    def test_preferences_default_for_unknown_user(self):
        """Test that unknown user gets default preferences"""
        unknown_user = f"unknown_{uuid.uuid4().hex[:8]}"
        response = requests.get(f"{BASE_URL}/api/preferences", params={"user_id": unknown_user})
        assert response.status_code == 200
        prefs = response.json()
        
        # Verify default preferences
        assert prefs["region"] == "lagos"
        assert prefs["voice"] == "pidgin"
        assert "interests" in prefs
        assert isinstance(prefs["interests"], list)

    def test_save_preferences(self):
        """Test POST /api/preferences saves to MongoDB"""
        pref_user = f"pref_user_{uuid.uuid4().hex[:8]}"
        preferences = {
            "user_id": pref_user,
            "region": "nairobi",
            "voice": "yoruba",
            "interests": ["tech", "sports", "finance"]
        }
        response = requests.post(f"{BASE_URL}/api/preferences", json=preferences)
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "ok"
        assert "preferences" in data
        assert data["preferences"]["region"] == "nairobi"
        assert data["preferences"]["voice"] == "yoruba"
        return pref_user, preferences

    def test_get_saved_preferences(self):
        """Test GET /api/preferences returns saved preferences"""
        # First save preferences
        pref_user = f"get_pref_user_{uuid.uuid4().hex[:8]}"
        saved_prefs = {
            "user_id": pref_user,
            "region": "johannesburg",
            "voice": "igbo",
            "interests": ["politics", "culture"]
        }
        save_response = requests.post(f"{BASE_URL}/api/preferences", json=saved_prefs)
        assert save_response.status_code == 200
        
        # Then retrieve preferences
        get_response = requests.get(f"{BASE_URL}/api/preferences", params={"user_id": pref_user})
        assert get_response.status_code == 200
        fetched_prefs = get_response.json()
        
        # Verify preferences match
        assert fetched_prefs["region"] == "johannesburg"
        assert fetched_prefs["voice"] == "igbo"
        assert set(fetched_prefs["interests"]) == set(["politics", "culture"])
        assert "updated_at" in fetched_prefs  # Should have timestamp

    def test_preferences_update(self):
        """Test that preferences can be updated"""
        pref_user = f"update_pref_user_{uuid.uuid4().hex[:8]}"
        
        # Initial save
        initial_prefs = {
            "user_id": pref_user,
            "region": "lagos",
            "voice": "pidgin",
            "interests": ["politics"]
        }
        requests.post(f"{BASE_URL}/api/preferences", json=initial_prefs)
        
        # Update preferences
        updated_prefs = {
            "user_id": pref_user,
            "region": "accra",
            "voice": "yoruba",
            "interests": ["tech", "sports", "afrobeats"]
        }
        update_response = requests.post(f"{BASE_URL}/api/preferences", json=updated_prefs)
        assert update_response.status_code == 200
        
        # Verify update
        get_response = requests.get(f"{BASE_URL}/api/preferences", params={"user_id": pref_user})
        fetched = get_response.json()
        
        assert fetched["region"] == "accra"
        assert fetched["voice"] == "yoruba"
        assert "tech" in fetched["interests"]


class TestAdditionalAPIs:
    """Test additional API endpoints"""
    
    def test_regions_endpoint(self):
        """Test /api/regions returns region list"""
        response = requests.get(f"{BASE_URL}/api/regions")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        assert len(data) > 0

    def test_categories_endpoint(self):
        """Test /api/categories returns category list"""
        response = requests.get(f"{BASE_URL}/api/categories")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        assert len(data) > 0

    def test_trending_endpoint(self):
        """Test /api/trending returns trending data"""
        response = requests.get(f"{BASE_URL}/api/trending")
        assert response.status_code == 200
        data = response.json()
        assert "tags" in data
        assert "topics" in data

    def test_metrics_endpoint(self):
        """Test /api/metrics returns metrics"""
        response = requests.get(f"{BASE_URL}/api/metrics")
        assert response.status_code == 200
        data = response.json()
        assert "listeners_today" in data
        assert "sources_online" in data


class TestNewsDetail:
    """Test news detail endpoint"""
    
    def test_news_detail_404_for_invalid_id(self):
        """Test /api/news/{id} returns 404 for invalid ID"""
        response = requests.get(f"{BASE_URL}/api/news/invalid_id_12345")
        assert response.status_code == 404

    def test_news_detail_for_valid_id(self):
        """Test /api/news/{id} returns detail for valid ID"""
        # First get a valid ID from news list
        list_response = requests.get(f"{BASE_URL}/api/news?limit=1")
        assert list_response.status_code == 200
        news_list = list_response.json()
        
        if len(news_list) > 0:
            valid_id = news_list[0]["id"]
            detail_response = requests.get(f"{BASE_URL}/api/news/{valid_id}")
            assert detail_response.status_code == 200
            detail = detail_response.json()
            assert detail["id"] == valid_id
            assert "title" in detail
        else:
            pytest.skip("No news items available for detail test")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
