# test_health_monitoring_v30.py - Tests for Feed Health Monitoring Feature
# Iteration 30: Testing real-time feed health monitoring in SOURCE_MATRIX widget

import pytest  # type: ignore[reportMissingImports]
import requests  # type: ignore[reportMissingModuleSource]
import os
import time

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestHealthMonitoringAPI:
    """Backend API tests for feed health monitoring endpoints"""
    
    def test_sources_health_endpoint_returns_200(self):
        """Test GET /api/sources/health returns 200 OK"""
        response = requests.get(f"{BASE_URL}/api/sources/health", timeout=15)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
    
    def test_sources_health_has_summary_counts(self):
        """Test /api/sources/health returns total, green, amber, red counts"""
        response = requests.get(f"{BASE_URL}/api/sources/health", timeout=15)
        assert response.status_code == 200
        data = response.json()
        
        # Verify required fields
        assert "total" in data, "Missing 'total' field"
        assert "green" in data, "Missing 'green' field"
        assert "amber" in data, "Missing 'amber' field"
        assert "red" in data, "Missing 'red' field"
        assert "sources" in data, "Missing 'sources' array"
        
        # Verify counts are integers
        assert isinstance(data["total"], int), f"total should be int, got {type(data['total'])}"
        assert isinstance(data["green"], int), f"green should be int, got {type(data['green'])}"
        assert isinstance(data["amber"], int), f"amber should be int, got {type(data['amber'])}"
        assert isinstance(data["red"], int), f"red should be int, got {type(data['red'])}"
        
        # Verify total matches RSS_FEEDS count
        assert data["total"] == 42, f"Expected total=42, got {data['total']}"
        
        # Verify sum of status counts makes sense
        total_status = data["green"] + data["amber"] + data["red"]
        assert total_status == data["total"]

    def test_sources_health_has_sources_array(self):
        """Test /api/sources/health has sources array with required fields"""
        response = requests.get(f"{BASE_URL}/api/sources/health", timeout=15)
        assert response.status_code == 200
        data = response.json()
        
        assert "sources" in data
        assert isinstance(data["sources"], list)
        assert len(data["sources"]) == 42, f"Expected 42 sources, got {len(data['sources'])}"
        
        # Check first source has required fields
        source = data["sources"][0]
        assert "name" in source, "Source missing 'name' field"
        assert "region" in source, "Source missing 'region' field"
        assert "status" in source, "Source missing 'status' field"
        assert "latency_ms" in source, "Source missing 'latency_ms' field"
        assert "last_checked" in source, "Source missing 'last_checked' field"
        
        # Verify status is one of valid values
        valid_statuses = ["green", "amber", "red", "unknown"]
        assert source["status"] in valid_statuses, f"Invalid status: {source['status']}"
        
    
    def test_sources_health_refresh_endpoint(self):
        """Test POST /api/sources/health/refresh triggers health check"""
        response = requests.post(f"{BASE_URL}/api/sources/health/refresh", timeout=10)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "status" in data, "Missing 'status' field"
        assert data["status"] == "started", f"Expected status='started', got {data['status']}"
        
    
    def test_sources_health_regions_covered(self):
        """Test /api/sources/health covers all 3 regions"""
        response = requests.get(f"{BASE_URL}/api/sources/health", timeout=15)
        assert response.status_code == 200
        data = response.json()
        
        regions_found = set()
        for source in data["sources"]:
            regions_found.add(source.get("region", ""))
        
        expected_regions = {"local", "continental", "international"}
        assert regions_found == expected_regions, f"Expected regions {expected_regions}, got {regions_found}"
        
        # Count sources per region
        region_counts = {"local": 0, "continental": 0, "international": 0}
        for source in data["sources"]:
            region = source.get("region", "")
            if region in region_counts:
                region_counts[region] += 1
        
        assert region_counts["local"] == 20, f"Expected 20 local sources, got {region_counts['local']}"
        assert region_counts["continental"] == 8, f"Expected 8 continental sources, got {region_counts['continental']}"
        assert region_counts["international"] == 11, f"Expected 11 international sources, got {region_counts['international']}"
        
    
    def test_health_refresh_then_verify_updated(self):
        """Test that refresh triggers update and data changes"""
        # Get initial health state
        initial_response = requests.get(f"{BASE_URL}/api/sources/health", timeout=15)
        assert initial_response.status_code == 200
        
        # Trigger refresh
        refresh_response = requests.post(f"{BASE_URL}/api/sources/health/refresh", timeout=10)
        assert refresh_response.status_code == 200
        
        # Wait for refresh to complete (background task)
        time.sleep(3)
        
        # Get updated health state
        updated_response = requests.get(f"{BASE_URL}/api/sources/health", timeout=15)
        assert updated_response.status_code == 200
        
        updated_data = updated_response.json()
        # Verify structure is still valid after refresh
        assert "total" in updated_data
        assert "green" in updated_data
        assert "sources" in updated_data
        assert updated_data["total"] == 42
        
    
    def test_health_sources_latency_values(self):
        """Test that sources have reasonable latency values"""
        response = requests.get(f"{BASE_URL}/api/sources/health", timeout=15)
        assert response.status_code == 200
        data = response.json()
        
        sources_with_latency = 0
        for source in data["sources"]:
            latency = source.get("latency_ms", -1)
            # latency_ms should be -1 (error), 0 (timeout), or positive value
            assert isinstance(latency, int), f"latency_ms should be int, got {type(latency)}"
            if latency > 0:
                sources_with_latency += 1
        
    
    def test_health_last_checked_format(self):
        """Test that last_checked is ISO format timestamp or None"""
        response = requests.get(f"{BASE_URL}/api/sources/health", timeout=15)
        assert response.status_code == 200
        data = response.json()
        
        checked_count = 0
        for source in data["sources"]:
            last_checked = source.get("last_checked")
            if last_checked is not None:
                # Should be ISO format string
                assert isinstance(last_checked, str), "last_checked should be string"
                assert "T" in last_checked or "-" in last_checked, f"Invalid timestamp format: {last_checked}"
                checked_count += 1
        


class TestExistingFeaturesRegression:
    """Regression tests to ensure previous features still work"""
    
    def test_api_sources_still_returns_feed_count(self):
        """Test /api/sources returns current total sources"""
        response = requests.get(f"{BASE_URL}/api/sources", timeout=15)
        assert response.status_code == 200
        data = response.json()
        assert data.get("total_sources") == 42, f"Expected 42 sources, got {data.get('total_sources')}"
    
    def test_api_metrics_endpoint(self):
        """Test /api/metrics endpoint still works"""
        response = requests.get(f"{BASE_URL}/api/metrics", timeout=15)
        assert response.status_code == 200
        data = response.json()
        assert "total_sources" in data
    
    def test_api_news_endpoint(self):
        """Test /api/news endpoint still works"""
        response = requests.get(f"{BASE_URL}/api/news?limit=5", timeout=30)
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
    
    def test_api_health_endpoint(self):
        """Test /api/health endpoint still works"""
        response = requests.get(f"{BASE_URL}/api/health", timeout=10)
        assert response.status_code == 200
        data = response.json()
        assert data.get("status") == "online"


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
