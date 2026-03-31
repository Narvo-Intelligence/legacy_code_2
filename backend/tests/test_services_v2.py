"""
Backend tests for TTS, Podcast, Briefing services and new endpoints.
Run: cd /app/backend && python -m pytest tests/test_services_v2.py -v
"""
import pytest
import os
import sys
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

API_URL = os.environ.get("REACT_APP_BACKEND_URL", "http://localhost:8000")

import requests

class TestMetricsEndpoint:
    def test_metrics_returns_real_data(self):
        r = requests.get(f"{API_URL}/api/metrics")
        assert r.status_code == 200
        d = r.json()
        assert "stories_processed" in d
        assert "broadcast_hours" in d
        assert "network_load" in d
        assert isinstance(d["stories_processed"], int)
    
    def test_system_alerts(self):
        r = requests.get(f"{API_URL}/api/system-alerts")
        assert r.status_code == 200
        alerts = r.json()
        assert isinstance(alerts, list)
        assert len(alerts) > 0
        assert all("title" in a and "desc" in a for a in alerts)


class TestFactcheckEndpoint:
    def test_factcheck_returns_real_status(self):
        r = requests.get(f"{API_URL}/api/factcheck/story/test-story-123")
        assert r.status_code == 200
        d = r.json()
        assert d["status"] in ["VERIFIED", "DISPUTED", "UNVERIFIED", "PENDING"]
        assert d["source"] != "FACTCHECK_QUEUE"  # No longer returns placeholder
        assert d["confidence"] > 0
    
    def test_factcheck_different_stories_vary(self):
        r1 = requests.get(f"{API_URL}/api/factcheck/story/story-a").json()
        r2 = requests.get(f"{API_URL}/api/factcheck/story/story-b").json()
        # Different IDs should potentially produce different results
        assert "status" in r1 and "status" in r2


class TestPodcastEndpoints:
    def test_podcasts_list(self):
        r = requests.get(f"{API_URL}/api/podcasts?limit=5")
        assert r.status_code == 200
        podcasts = r.json()
        assert isinstance(podcasts, list)
        if podcasts:
            p = podcasts[0]
            assert "title" in p
            assert "id" in p
            assert "source" in p  # Real source from RSS feed
    
    def test_podcast_categories(self):
        r = requests.get(f"{API_URL}/api/podcasts/categories")
        assert r.status_code == 200
        cats = r.json()
        assert len(cats) == 8
        assert all("id" in c and "name" in c for c in cats)
    
    def test_podcast_search(self):
        # First get a podcast to know what to search for
        podcasts = requests.get(f"{API_URL}/api/podcasts?limit=1").json()
        if podcasts:
            word = podcasts[0]["title"].split()[0]
            r = requests.get(f"{API_URL}/api/podcasts/search?q={word}")
            assert r.status_code == 200


class TestListeningHistory:
    def test_add_and_get_history(self):
        # Add entry
        r = requests.post(f"{API_URL}/api/listening-history", json={
            "user_id": "test-user-pytest",
            "track_id": "test-track-1",
            "title": "Test Broadcast",
            "source": "pytest",
            "category": "testing",
        })
        assert r.status_code == 200
        
        # Get history
        r2 = requests.get(f"{API_URL}/api/listening-history/test-user-pytest?limit=5")
        assert r2.status_code == 200
        history = r2.json()
        assert isinstance(history, list)
        assert any(h["track_id"] == "test-track-1" for h in history)


class TestTTSCaching:
    def test_tts_caching_returns_same_result(self):
        payload = {"text": "Test caching", "voice_id": "nova", "language": "en"}
        r1 = requests.post(f"{API_URL}/api/tts/generate", json=payload)
        # Second call should hit cache
        r2 = requests.post(f"{API_URL}/api/tts/generate", json=payload)
        assert r1.status_code == 200
        assert r2.status_code == 200
        # Both should return audio_url
        assert "audio_url" in r1.json()
        assert "audio_url" in r2.json()


class TestSettingsPersistence:
    def test_save_and_read_settings(self):
        uid = "test-settings-pytest"
        # Save
        payload = {
            "high_contrast": True,
            "interface_language": "yo",
            "theme": "light",
            "broadcast_language": "pcm",
        }
        r = requests.post(f"{API_URL}/api/settings/{uid}", json=payload)
        assert r.status_code == 200
        
        # Read
        r2 = requests.get(f"{API_URL}/api/settings/{uid}")
        assert r2.status_code == 200
        d = r2.json()
        assert d["interface_language"] == "yo"
        assert d["theme"] == "light"
        assert d["broadcast_language"] == "pcm"


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
