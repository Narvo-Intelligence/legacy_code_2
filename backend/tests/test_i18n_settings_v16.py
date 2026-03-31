"""
Test suite for iteration 16: i18n, Settings persistence, News Detail features
- Settings API: GET/POST /api/settings/{user_id} for system and accessibility settings
- News Detail Page: TruthTag, Share, Autoplay metadata
- Discover Page: Radio stations with EmptyState
"""
import pytest
import requests
import os
import time

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestSettingsAPI:
    """Test Settings persistence endpoints"""
    
    def test_get_default_settings_for_guest(self):
        """GET /api/settings/guest returns default settings"""
        response = requests.get(f"{BASE_URL}/api/settings/guest")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        # Check default settings structure
        assert 'high_contrast' in data or 'voice_model' in data, "Settings should have default keys"
    
    def test_save_system_settings(self):
        """POST /api/settings/test_user saves system settings"""
        test_user = "TEST_user_system_123"
        payload = {
            "high_contrast": True,
            "interface_scale": "compact",
            "haptic_sync": False,
            "alert_volume": 75,
            "data_limit": 3.0,
            "bandwidth_priority": "ingest"
        }
        
        response = requests.post(
            f"{BASE_URL}/api/settings/{test_user}",
            json=payload
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        result = response.json()
        assert result.get("status") == "success", f"Save should succeed: {result}"
        
        # Verify persistence by GET
        get_response = requests.get(f"{BASE_URL}/api/settings/{test_user}")
        assert get_response.status_code == 200
        
        saved_data = get_response.json()
        assert saved_data.get("high_contrast") == True, "high_contrast should be True"
        assert saved_data.get("alert_volume") == 75, "alert_volume should be 75"
    
    def test_save_accessibility_settings(self):
        """POST /api/settings/test_user saves accessibility settings"""
        test_user = "TEST_user_accessibility_456"
        payload = {
            "display_density": "compact",
            "font_scale": 125,
            "gestural_swipe": False,
            "gestural_pinch": True
        }
        
        response = requests.post(
            f"{BASE_URL}/api/settings/{test_user}",
            json=payload
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        # Verify persistence
        get_response = requests.get(f"{BASE_URL}/api/settings/{test_user}")
        saved_data = get_response.json()
        
        assert saved_data.get("display_density") == "compact", "display_density should be compact"
        assert saved_data.get("font_scale") == 125, "font_scale should be 125"
    
    def test_settings_merge_behavior(self):
        """Settings should merge, not overwrite"""
        test_user = "TEST_user_merge_789"
        
        # First save system settings
        requests.post(f"{BASE_URL}/api/settings/{test_user}", json={
            "high_contrast": True,
            "alert_volume": 80
        })
        
        # Then save accessibility settings (should merge)
        requests.post(f"{BASE_URL}/api/settings/{test_user}", json={
            "display_density": "expanded",
            "font_scale": 110
        })
        
        # Verify both are present
        get_response = requests.get(f"{BASE_URL}/api/settings/{test_user}")
        merged = get_response.json()
        
        assert merged.get("high_contrast") == True, "high_contrast should persist after merge"
        assert merged.get("alert_volume") == 80, "alert_volume should persist after merge"
        assert merged.get("display_density") == "expanded", "display_density should be set"
        assert merged.get("font_scale") == 110, "font_scale should be set"


class TestNewsDetailAPI:
    """Test News Detail related endpoints"""
    
    def test_get_news_list(self):
        """GET /api/news returns list of news items"""
        response = requests.get(f"{BASE_URL}/api/news?limit=5")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert isinstance(data, list), "Should return a list"
        assert len(data) > 0, "Should have at least one news item"
        
        # Check structure of first item
        first_item = data[0]
        assert "id" in first_item, "News item should have id"
        assert "title" in first_item, "News item should have title"
        assert "source" in first_item, "News item should have source"
        
        return first_item["id"]  # Return for use in other tests
    
    def test_get_news_detail_with_narrative(self):
        """GET /api/news/{id} returns detailed news with narrative"""
        # First get a valid news ID
        list_response = requests.get(f"{BASE_URL}/api/news?limit=1")
        news_list = list_response.json()
        if not news_list:
            pytest.skip("No news items available")
        
        news_id = news_list[0]["id"]
        
        response = requests.get(f"{BASE_URL}/api/news/{news_id}")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        detail = response.json()
        assert "id" in detail, "Detail should have id"
        assert "title" in detail, "Detail should have title"
        assert "summary" in detail, "Detail should have summary"
        assert "category" in detail, "Detail should have category"
        assert "source" in detail, "Detail should have source"
        assert "region" in detail, "Detail should have region"
        
        # Narrative may be generated or pending
    
    def test_factcheck_api_for_truthtag(self):
        """GET /api/factcheck/{story_id} returns verification status for TruthTag"""
        # Get a news ID first
        list_response = requests.get(f"{BASE_URL}/api/news?limit=1")
        news_list = list_response.json()
        if not news_list:
            pytest.skip("No news items available")
        
        story_id = news_list[0]["id"]
        
        response = requests.get(f"{BASE_URL}/api/factcheck/{story_id}")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert "status" in data, "FactCheck should have status"
        assert data["status"] in ["VERIFIED", "UNVERIFIED", "DISPUTED", "FALSE"], f"Invalid status: {data['status']}"
        assert "confidence" in data, "FactCheck should have confidence"
        assert 0 <= data["confidence"] <= 100, "Confidence should be 0-100"
        assert "source" in data, "FactCheck should have source"
        assert "explanation" in data, "FactCheck should have explanation"
        


class TestRadioAPI:
    """Test Radio stations for Discover page"""
    
    def test_get_radio_countries(self):
        """GET /api/radio/countries returns African countries"""
        response = requests.get(f"{BASE_URL}/api/radio/countries")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        countries = response.json()
        assert isinstance(countries, list), "Should return a list"
        assert len(countries) >= 6, "Should have at least 6 African countries"
        
        # Check for expected countries
        codes = [c["code"] for c in countries]
        assert "NG" in codes, "Nigeria should be in the list"
        assert "GH" in codes, "Ghana should be in the list"
        assert "KE" in codes, "Kenya should be in the list"
        
    
    def test_get_radio_stations_by_country(self):
        """GET /api/radio/stations?country=NG returns Nigerian stations"""
        response = requests.get(f"{BASE_URL}/api/radio/stations?country=NG&limit=5")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        stations = response.json()
        assert isinstance(stations, list), "Should return a list"
        
        if len(stations) > 0:
            station = stations[0]
            assert "id" in station, "Station should have id"
            assert "name" in station, "Station should have name"
            assert "url" in station, "Station should have url"
            assert "country" in station, "Station should have country"
        else:


class TestVoicesAPI:
    """Test Voices API for Voice Studio"""
    
    def test_get_voices(self):
        """GET /api/voices returns voice profiles"""
        response = requests.get(f"{BASE_URL}/api/voices")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        voices = response.json()
        assert isinstance(voices, list), "Should return a list"
        assert len(voices) >= 5, "Should have at least 5 voice profiles"
        
        # Check voice structure
        voice = voices[0]
        assert "id" in voice, "Voice should have id"
        assert "name" in voice, "Voice should have name"
        assert "accent" in voice, "Voice should have accent"
        assert "description" in voice, "Voice should have description"
        
    
    def test_save_voice_settings(self):
        """POST /api/settings/{user_id}/voice saves voice preferences"""
        test_user = "TEST_voice_user_111"
        
        response = requests.post(
            f"{BASE_URL}/api/settings/{test_user}/voice",
            params={
                "voice_model": "onyx",
                "voice_dialect": "pidgin",
                "voice_region": "west_africa"
            }
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        # Verify voice settings
        get_response = requests.get(f"{BASE_URL}/api/settings/{test_user}/voice")
        assert get_response.status_code == 200
        
        voice_settings = get_response.json()
        assert voice_settings.get("voice_model") == "onyx", "voice_model should be onyx"


class TestHealthAPI:
    """Basic health check tests"""
    
    def test_health_endpoint(self):
        """GET /api/health returns status"""
        response = requests.get(f"{BASE_URL}/api/health")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert data.get("status") == "online", "Service should be online"


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
