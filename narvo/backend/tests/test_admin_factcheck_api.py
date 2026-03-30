"""
Backend API Tests for Admin Dashboard and Fact-Check APIs
Tests: /api/admin/metrics, /api/admin/alerts, /api/admin/streams, 
       /api/admin/voices, /api/admin/moderation, /api/admin/stats,
       /api/factcheck/{story_id}, /api/factcheck/analyze
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestHealthCheck:
    """Basic health check to ensure API is running"""
    
    def test_health_endpoint(self):
        response = requests.get(f"{BASE_URL}/api/health")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "online"
        assert data["service"] == "Narvo API"
        assert "timestamp" in data


class TestAdminMetricsAPI:
    """Tests for /api/admin/metrics endpoint"""
    
    def test_metrics_returns_200(self):
        response = requests.get(f"{BASE_URL}/api/admin/metrics")
        assert response.status_code == 200
    
    def test_metrics_has_required_fields(self):
        response = requests.get(f"{BASE_URL}/api/admin/metrics")
        data = response.json()
        
        # Check all required fields exist
        required_fields = [
            "active_streams", "avg_bitrate", "error_rate", "storage_used",
            "node_load", "api_latency", "uptime", "active_traffic",
            "listeners_today", "sources_online", "stories_processed",
            "signal_strength", "network_load"
        ]
        for field in required_fields:
            assert field in data, f"Missing field: {field}"
    
    def test_metrics_values_are_valid(self):
        response = requests.get(f"{BASE_URL}/api/admin/metrics")
        data = response.json()
        
        # Validate data types and ranges
        assert isinstance(data["active_streams"], int)
        assert data["active_streams"] > 0
        assert isinstance(data["avg_bitrate"], (int, float))
        assert isinstance(data["error_rate"], (int, float))
        assert 0 <= data["error_rate"] <= 1
        assert isinstance(data["storage_used"], int)
        assert 0 <= data["storage_used"] <= 100
        assert "%" in data["node_load"]
        assert "ms" in data["api_latency"].lower()


class TestAdminAlertsAPI:
    """Tests for /api/admin/alerts endpoint"""
    
    def test_alerts_returns_200(self):
        response = requests.get(f"{BASE_URL}/api/admin/alerts")
        assert response.status_code == 200
    
    def test_alerts_returns_list(self):
        response = requests.get(f"{BASE_URL}/api/admin/alerts")
        data = response.json()
        assert isinstance(data, list)
        assert len(data) > 0
    
    def test_alert_structure(self):
        response = requests.get(f"{BASE_URL}/api/admin/alerts")
        data = response.json()
        
        for alert in data:
            assert "id" in alert
            assert "type" in alert
            assert alert["type"] in ["warning", "success", "error"]
            assert "title" in alert
            assert "description" in alert
            assert "timestamp" in alert
            assert "priority" in alert


class TestAdminStreamsAPI:
    """Tests for /api/admin/streams endpoint"""
    
    def test_streams_returns_200(self):
        response = requests.get(f"{BASE_URL}/api/admin/streams")
        assert response.status_code == 200
    
    def test_streams_returns_list(self):
        response = requests.get(f"{BASE_URL}/api/admin/streams")
        data = response.json()
        assert isinstance(data, list)
        assert len(data) > 0
    
    def test_stream_structure(self):
        response = requests.get(f"{BASE_URL}/api/admin/streams")
        data = response.json()
        
        for stream in data:
            assert "status" in stream
            assert stream["status"] in ["LIVE", "OFFLINE"]
            assert "id" in stream
            assert "source" in stream
            assert "region" in stream
            assert "bitrate" in stream
            assert "uptime" in stream


class TestAdminVoicesAPI:
    """Tests for /api/admin/voices endpoint"""
    
    def test_voices_returns_200(self):
        response = requests.get(f"{BASE_URL}/api/admin/voices")
        assert response.status_code == 200
    
    def test_voices_returns_list(self):
        response = requests.get(f"{BASE_URL}/api/admin/voices")
        data = response.json()
        assert isinstance(data, list)
        assert len(data) > 0
    
    def test_voice_structure(self):
        response = requests.get(f"{BASE_URL}/api/admin/voices")
        data = response.json()
        
        for voice in data:
            assert "name" in voice
            assert "id" in voice
            assert "language" in voice
            assert "latency" in voice
            assert "clarity" in voice
            assert isinstance(voice["clarity"], (int, float))
            assert 0 <= voice["clarity"] <= 100
            assert "status" in voice
            assert voice["status"] in ["LIVE", "TRAINING"]


class TestAdminModerationAPI:
    """Tests for /api/admin/moderation endpoint"""
    
    def test_moderation_returns_200(self):
        response = requests.get(f"{BASE_URL}/api/admin/moderation")
        assert response.status_code == 200
    
    def test_moderation_returns_list(self):
        response = requests.get(f"{BASE_URL}/api/admin/moderation")
        data = response.json()
        assert isinstance(data, list)
        assert len(data) > 0
    
    def test_moderation_item_structure(self):
        response = requests.get(f"{BASE_URL}/api/admin/moderation")
        data = response.json()
        
        for item in data:
            assert "id" in item
            assert "source" in item
            assert "status" in item
            assert item["status"] in ["DISPUTED", "VERIFIED", "UNVERIFIED"]
            assert "title" in item
            assert "description" in item
            assert "tags" in item
            assert isinstance(item["tags"], list)
            assert "confidence" in item
            assert "timestamp" in item


class TestAdminStatsAPI:
    """Tests for /api/admin/stats endpoint"""
    
    def test_stats_returns_200(self):
        response = requests.get(f"{BASE_URL}/api/admin/stats")
        assert response.status_code == 200
    
    def test_stats_has_required_fields(self):
        response = requests.get(f"{BASE_URL}/api/admin/stats")
        data = response.json()
        
        required_fields = [
            "queue_total", "disputed", "verified", "pending",
            "dubawa_status", "last_sync"
        ]
        for field in required_fields:
            assert field in data, f"Missing field: {field}"
    
    def test_stats_dubawa_status(self):
        response = requests.get(f"{BASE_URL}/api/admin/stats")
        data = response.json()
        
        # Dubawa status should be CONNECTED (mocked)
        assert data["dubawa_status"] == "CONNECTED"
        assert isinstance(data["queue_total"], int)
        assert isinstance(data["disputed"], int)
        assert isinstance(data["verified"], int)
        assert isinstance(data["pending"], int)


class TestFactCheckStoryAPI:
    """Tests for /api/factcheck/{story_id} endpoint"""
    
    def test_factcheck_story_returns_200(self):
        response = requests.get(f"{BASE_URL}/api/factcheck/test-story-123")
        assert response.status_code == 200
    
    def test_factcheck_story_structure(self):
        response = requests.get(f"{BASE_URL}/api/factcheck/test-story-123")
        data = response.json()
        
        assert "status" in data
        assert data["status"] in ["VERIFIED", "UNVERIFIED", "DISPUTED", "FALSE"]
        assert "confidence" in data
        assert isinstance(data["confidence"], int)
        assert 0 <= data["confidence"] <= 100
        assert "source" in data
        assert "explanation" in data
        assert "checked_at" in data
    
    def test_factcheck_different_stories_may_vary(self):
        # Different story IDs should produce consistent but potentially different results
        response1 = requests.get(f"{BASE_URL}/api/factcheck/story-abc")
        response2 = requests.get(f"{BASE_URL}/api/factcheck/story-xyz")
        
        assert response1.status_code == 200
        assert response2.status_code == 200
        
        data1 = response1.json()
        data2 = response2.json()
        
        # Both should have valid structure
        assert data1["status"] in ["VERIFIED", "UNVERIFIED", "DISPUTED", "FALSE"]
        assert data2["status"] in ["VERIFIED", "UNVERIFIED", "DISPUTED", "FALSE"]


class TestFactCheckAnalyzeAPI:
    """Tests for /api/factcheck/analyze endpoint (POST)"""
    
    def test_analyze_confirmed_text(self):
        response = requests.post(f"{BASE_URL}/api/factcheck/analyze?text=This%20is%20a%20confirmed%20report")
        assert response.status_code == 200
        data = response.json()
        
        assert data["status"] == "VERIFIED"
        assert data["source"] == "DUBAWA_KEYWORD_SCAN"
        assert data["confidence"] == 95
    
    def test_analyze_disputed_text(self):
        response = requests.post(f"{BASE_URL}/api/factcheck/analyze?text=This%20is%20a%20disputed%20claim")
        assert response.status_code == 200
        data = response.json()
        
        assert data["status"] == "DISPUTED"
        assert data["source"] == "DUBAWA_KEYWORD_SCAN"
        assert data["confidence"] == 35
    
    def test_analyze_rumor_text(self):
        response = requests.post(f"{BASE_URL}/api/factcheck/analyze?text=This%20is%20a%20rumor%20spreading")
        assert response.status_code == 200
        data = response.json()
        
        assert data["status"] == "DISPUTED"
        assert data["source"] == "DUBAWA_KEYWORD_SCAN"
        assert data["confidence"] == 25
    
    def test_analyze_neutral_text(self):
        response = requests.post(f"{BASE_URL}/api/factcheck/analyze?text=This%20is%20a%20neutral%20statement")
        assert response.status_code == 200
        data = response.json()
        
        assert data["status"] == "UNVERIFIED"
        assert data["source"] == "DUBAWA_QUEUE"
        assert data["confidence"] == 50
    
    def test_analyze_false_text(self):
        response = requests.post(f"{BASE_URL}/api/factcheck/analyze?text=This%20is%20a%20false%20claim")
        assert response.status_code == 200
        data = response.json()
        
        assert data["status"] == "FALSE"
        assert data["source"] == "DUBAWA_KEYWORD_SCAN"
        assert data["confidence"] == 15
    
    def test_analyze_response_structure(self):
        response = requests.post(f"{BASE_URL}/api/factcheck/analyze?text=test%20text")
        assert response.status_code == 200
        data = response.json()
        
        assert "status" in data
        assert "confidence" in data
        assert "source" in data
        assert "explanation" in data
        assert "checked_at" in data


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
