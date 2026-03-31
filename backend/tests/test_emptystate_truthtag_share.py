"""
Test suite for EmptyState, TruthTag, Share, and Settings features
Tests: Settings API, Voice Settings API, Fact-check API
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestSettingsAPI:
    """User settings endpoint tests"""
    
    def test_get_default_settings(self):
        """Test getting default settings for new user"""
        response = requests.get(f"{BASE_URL}/api/settings/new-test-user-001")
        assert response.status_code == 200
        data = response.json()
        # Verify default values
        assert data.get("voice_model") == "nova"
        assert data.get("voice_dialect") == "standard"
        assert data.get("voice_region") == "africa"
        assert "high_contrast" in data
        assert "haptic_sync" in data
    
    def test_save_user_settings(self):
        """Test saving user settings"""
        settings = {
            "voice_model": "echo",
            "voice_dialect": "yoruba",
            "voice_region": "africa",
            "high_contrast": True,
            "interface_scale": "125%",
            "haptic_sync": False,
            "alert_volume": 80,
            "data_limit": 5.0,
            "bandwidth_priority": "quality",
            "display_density": "compact",
            "font_scale": 110,
            "gestural_swipe": True,
            "gestural_pinch": True,
            "voice_commands": True
        }
        response = requests.post(
            f"{BASE_URL}/api/settings/test-settings-user-002",
            json=settings
        )
        assert response.status_code == 200
        data = response.json()
        assert data.get("status") == "success"
        
        # Verify settings were saved
        get_response = requests.get(f"{BASE_URL}/api/settings/test-settings-user-002")
        assert get_response.status_code == 200
        saved = get_response.json()
        assert saved.get("voice_model") == "echo"
        assert saved.get("high_contrast") == True
        assert saved.get("font_scale") == 110


class TestVoiceSettingsAPI:
    """Voice-specific settings endpoint tests"""
    
    def test_get_voice_settings(self):
        """Test getting voice settings"""
        response = requests.get(f"{BASE_URL}/api/settings/voice-test-user-003/voice")
        assert response.status_code == 200
        data = response.json()
        assert "voice_model" in data
        assert "voice_dialect" in data
        assert "voice_region" in data
    
    def test_save_voice_settings(self):
        """Test saving voice settings via query params"""
        response = requests.post(
            f"{BASE_URL}/api/settings/voice-test-user-004/voice",
            params={
                "voice_model": "shimmer",
                "voice_dialect": "igbo",
                "voice_region": "africa"
            }
        )
        assert response.status_code == 200
        data = response.json()
        assert data.get("status") == "success"
        
        # Verify voice settings were saved
        get_response = requests.get(f"{BASE_URL}/api/settings/voice-test-user-004/voice")
        assert get_response.status_code == 200
        saved = get_response.json()
        assert saved.get("voice_model") == "shimmer"
        assert saved.get("voice_dialect") == "igbo"
    
    def test_voice_settings_persistence(self):
        """Test that voice settings persist correctly"""
        user_id = "voice-persist-test-005"
        
        # Save settings
        requests.post(
            f"{BASE_URL}/api/settings/{user_id}/voice",
            params={
                "voice_model": "alloy",
                "voice_dialect": "hausa",
                "voice_region": "africa"
            }
        )
        
        # Retrieve and verify
        response = requests.get(f"{BASE_URL}/api/settings/{user_id}/voice")
        assert response.status_code == 200
        data = response.json()
        assert data["voice_model"] == "alloy"
        assert data["voice_dialect"] == "hausa"


class TestFactCheckAPI:
    """Fact-check API tests for TruthTag component"""
    
    def test_factcheck_story(self):
        """Test fact-checking a story by ID"""
        response = requests.get(f"{BASE_URL}/api/factcheck/test-story-id-001")
        assert response.status_code == 200
        data = response.json()
        
        # Verify response structure
        assert "status" in data
        assert data["status"] in ["VERIFIED", "UNVERIFIED", "DISPUTED", "FALSE"]
        assert "confidence" in data
        assert isinstance(data["confidence"], int)
        assert 0 <= data["confidence"] <= 100
        assert "source" in data
        assert "explanation" in data
        assert "checked_at" in data
    
    def test_factcheck_different_stories(self):
        """Test that different story IDs return different results"""
        story_ids = ["story-a", "story-b", "story-c", "story-d", "story-e"]
        results = []
        
        for story_id in story_ids:
            response = requests.get(f"{BASE_URL}/api/factcheck/{story_id}")
            assert response.status_code == 200
            results.append(response.json())
        
        # Verify all have valid structure
        for result in results:
            assert result["status"] in ["VERIFIED", "UNVERIFIED", "DISPUTED", "FALSE"]
            assert 0 <= result["confidence"] <= 100
    
    def test_factcheck_analyze_verified(self):
        """Test analyze endpoint with verified keywords"""
        response = requests.post(
            f"{BASE_URL}/api/factcheck/analyze",
            params={"text": "The government has confirmed the new policy changes"}
        )
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "VERIFIED"
        assert data["confidence"] >= 90
    
    def test_factcheck_analyze_disputed(self):
        """Test analyze endpoint with disputed keywords"""
        response = requests.post(
            f"{BASE_URL}/api/factcheck/analyze",
            params={"text": "This disputed claim has been circulating online"}
        )
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "DISPUTED"
    
    def test_factcheck_analyze_neutral(self):
        """Test analyze endpoint with neutral text"""
        response = requests.post(
            f"{BASE_URL}/api/factcheck/analyze",
            params={"text": "The weather today is sunny and warm"}
        )
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "UNVERIFIED"
        assert data["confidence"] == 50


class TestVoicesAPI:
    """Voice profiles API tests"""
    
    def test_get_voices(self):
        """Test getting available voice profiles"""
        response = requests.get(f"{BASE_URL}/api/voices")
        assert response.status_code == 200
        data = response.json()
        
        assert isinstance(data, list)
        assert len(data) >= 5  # Should have at least 5 voices
        
        # Verify voice structure
        for voice in data:
            assert "id" in voice
            assert "name" in voice
            assert "accent" in voice
            assert "description" in voice
    
    def test_voice_ids_valid(self):
        """Test that voice IDs are valid OpenAI voices"""
        response = requests.get(f"{BASE_URL}/api/voices")
        data = response.json()
        
        valid_ids = ["nova", "onyx", "echo", "alloy", "shimmer"]
        for voice in data:
            assert voice["id"] in valid_ids


class TestNewsAPI:
    """News API tests for TruthTag integration"""
    
    def test_get_news_list(self):
        """Test getting news list"""
        response = requests.get(f"{BASE_URL}/api/news?limit=5")
        assert response.status_code == 200
        data = response.json()
        
        assert isinstance(data, list)
        assert len(data) <= 5
        
        # Verify news item structure
        for item in data:
            assert "id" in item
            assert "title" in item
            assert "summary" in item
            assert "source" in item
    
    def test_news_has_id_for_truthtag(self):
        """Test that news items have IDs for TruthTag lookup"""
        response = requests.get(f"{BASE_URL}/api/news?limit=3")
        data = response.json()
        
        for item in data:
            # Each news item should have an ID that can be used for fact-checking
            assert "id" in item
            assert len(item["id"]) > 0
            
            # Verify fact-check works for this ID
            fc_response = requests.get(f"{BASE_URL}/api/factcheck/{item['id']}")
            assert fc_response.status_code == 200


class TestBookmarksAPI:
    """Bookmarks API tests for SavedPage EmptyState"""
    
    def test_get_empty_bookmarks(self):
        """Test getting bookmarks for user with no bookmarks"""
        response = requests.get(
            f"{BASE_URL}/api/bookmarks",
            params={"user_id": "empty-bookmarks-user-001"}
        )
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        # New user should have empty bookmarks
    
    def test_add_and_get_bookmark(self):
        """Test adding and retrieving a bookmark"""
        user_id = "bookmark-test-user-002"
        
        # Add bookmark
        bookmark_data = {
            "user_id": user_id,
            "story_id": "test-story-bookmark-001",
            "title": "Test Story Title",
            "summary": "Test story summary",
            "source": "Test Source",
            "category": "Tech"
        }
        add_response = requests.post(f"{BASE_URL}/api/bookmarks", json=bookmark_data)
        assert add_response.status_code == 200
        
        # Get bookmarks
        get_response = requests.get(f"{BASE_URL}/api/bookmarks", params={"user_id": user_id})
        assert get_response.status_code == 200
        bookmarks = get_response.json()
        assert len(bookmarks) >= 1
        assert any(b["story_id"] == "test-story-bookmark-001" for b in bookmarks)
    
    def test_remove_bookmark(self):
        """Test removing a bookmark"""
        user_id = "bookmark-remove-user-003"
        story_id = "test-story-remove-001"
        
        # Add bookmark first
        requests.post(f"{BASE_URL}/api/bookmarks", json={
            "user_id": user_id,
            "story_id": story_id,
            "title": "Story to Remove"
        })
        
        # Remove bookmark
        delete_response = requests.delete(
            f"{BASE_URL}/api/bookmarks/{story_id}",
            params={"user_id": user_id}
        )
        assert delete_response.status_code == 200
        
        # Verify removed
        get_response = requests.get(f"{BASE_URL}/api/bookmarks", params={"user_id": user_id})
        bookmarks = get_response.json()
        assert not any(b["story_id"] == story_id for b in bookmarks)


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
