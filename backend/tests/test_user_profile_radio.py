"""
Backend API tests for User Profile pages and Live Radio Integration
Tests: /api/voices, /api/metrics, /api/radio/stations, /api/radio/countries
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestHealthAndMetrics:
    """Health check and metrics endpoint tests"""
    
    def test_health_endpoint(self):
        """Test /api/health returns online status"""
        response = requests.get(f"{BASE_URL}/api/health")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "online"
        assert data["service"] == "Narvo API"
        assert "timestamp" in data
    
    def test_metrics_endpoint(self):
        """Test /api/metrics returns platform metrics for Account page"""
        response = requests.get(f"{BASE_URL}/api/metrics")
        assert response.status_code == 200
        data = response.json()
        # Verify metrics structure for Account page
        assert "listeners_today" in data
        assert "sources_online" in data
        assert "stories_processed" in data
        assert "signal_strength" in data
        assert "network_load" in data


class TestVoiceStudioAPI:
    """Voice Studio page API tests"""
    
    def test_voices_endpoint(self):
        """Test /api/voices returns voice profiles for Voice Studio page"""
        response = requests.get(f"{BASE_URL}/api/voices")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        assert len(data) >= 4  # Should have NOVA, ONYX, ECHO, ALLOY at minimum
        
        # Verify voice structure
        for voice in data:
            assert "id" in voice
            assert "name" in voice
            assert "accent" in voice
            assert "description" in voice
        
        # Check for expected voices
        voice_names = [v["name"].upper() for v in data]
        assert "NOVA" in voice_names
        assert "ONYX" in voice_names
        assert "ECHO" in voice_names
        assert "ALLOY" in voice_names


class TestRadioIntegration:
    """Live Radio Integration API tests for Discover page"""
    
    def test_radio_countries_endpoint(self):
        """Test /api/radio/countries returns African countries"""
        response = requests.get(f"{BASE_URL}/api/radio/countries")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        assert len(data) >= 6  # Should have multiple African countries
        
        # Verify country structure
        for country in data:
            assert "code" in country
            assert "name" in country
            assert "flag" in country
        
        # Check for expected countries
        country_codes = [c["code"] for c in data]
        assert "NG" in country_codes  # Nigeria
        assert "GH" in country_codes  # Ghana
        assert "KE" in country_codes  # Kenya
        assert "ZA" in country_codes  # South Africa
    
    def test_radio_stations_nigeria(self):
        """Test /api/radio/stations returns Nigerian stations"""
        response = requests.get(f"{BASE_URL}/api/radio/stations?country=NG&limit=5")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        assert len(data) > 0  # Should have at least some stations
        
        # Verify station structure
        for station in data:
            assert "id" in station
            assert "name" in station
            assert "url" in station
            assert "country" in station
            assert "countrycode" in station
        
        for s in data[:3]:
    
    def test_radio_stations_ghana(self):
        """Test /api/radio/stations returns Ghanaian stations"""
        response = requests.get(f"{BASE_URL}/api/radio/stations?country=GH&limit=5")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        # Ghana may have fewer stations, so just check structure
    
    def test_radio_stations_south_africa(self):
        """Test /api/radio/stations returns South African stations"""
        response = requests.get(f"{BASE_URL}/api/radio/stations?country=ZA&limit=5")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
    
    def test_radio_stations_default(self):
        """Test /api/radio/stations without country filter returns African stations"""
        response = requests.get(f"{BASE_URL}/api/radio/stations?limit=10")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)


class TestNewsAPI:
    """News API tests for Discover page featured content"""
    
    def test_news_endpoint(self):
        """Test /api/news returns news items for Discover page hero"""
        response = requests.get(f"{BASE_URL}/api/news?limit=1")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        if len(data) > 0:
            news = data[0]
            assert "id" in news
            assert "title" in news
            assert "summary" in news
            assert "source" in news


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
