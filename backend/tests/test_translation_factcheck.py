# Test file for Translation and Fact-check APIs - Iteration 27
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestTranslationAPI:
    """Translation API endpoint tests"""
    
    def test_get_supported_languages(self):
        """Test /api/translate/languages returns all 5 supported languages"""
        response = requests.get(f"{BASE_URL}/api/translate/languages")
        assert response.status_code == 200
        
        languages = response.json()
        assert isinstance(languages, list)
        assert len(languages) == 5
        
        # Verify all expected languages are present
        language_codes = [lang['code'] for lang in languages]
        assert 'en' in language_codes, "English should be supported"
        assert 'pcm' in language_codes, "Nigerian Pidgin should be supported"
        assert 'yo' in language_codes, "Yoruba should be supported"
        assert 'ha' in language_codes, "Hausa should be supported"
        assert 'ig' in language_codes, "Igbo should be supported"
        
        # Verify each language has required fields
        for lang in languages:
            assert 'code' in lang
            assert 'name' in lang
            assert 'native_name' in lang
            assert 'voice_id' in lang
            assert 'description' in lang
    
    def test_get_specific_language(self):
        """Test /api/translate/languages/{code} returns language details"""
        response = requests.get(f"{BASE_URL}/api/translate/languages/pcm")
        assert response.status_code == 200
        
        lang = response.json()
        assert lang['code'] == 'pcm'
        assert lang['name'] == 'Nigerian Pidgin'
        assert 'native_name' in lang
    
    def test_get_invalid_language(self):
        """Test /api/translate/languages/{code} returns 404 for invalid language"""
        response = requests.get(f"{BASE_URL}/api/translate/languages/invalid")
        assert response.status_code == 404
    
    def test_quick_translate_to_pidgin(self):
        """Test /api/translate/quick translates text to Pidgin"""
        response = requests.get(
            f"{BASE_URL}/api/translate/quick",
            params={"text": "Hello world", "lang": "pcm"}
        )
        assert response.status_code == 200
        
        data = response.json()
        assert 'translated' in data
        assert 'language' in data
        assert data['language'] == 'Nigerian Pidgin'
        assert len(data['translated']) > 0
    
    def test_quick_translate_to_yoruba(self):
        """Test /api/translate/quick translates text to Yoruba"""
        response = requests.get(
            f"{BASE_URL}/api/translate/quick",
            params={"text": "Good morning", "lang": "yo"}
        )
        assert response.status_code == 200
        
        data = response.json()
        assert 'translated' in data
        assert data['language'] == 'Yoruba'
    
    def test_quick_translate_to_hausa(self):
        """Test /api/translate/quick translates text to Hausa"""
        response = requests.get(
            f"{BASE_URL}/api/translate/quick",
            params={"text": "Welcome to Nigeria", "lang": "ha"}
        )
        assert response.status_code == 200
        
        data = response.json()
        assert 'translated' in data
        assert data['language'] == 'Hausa'
    
    def test_quick_translate_to_igbo(self):
        """Test /api/translate/quick translates text to Igbo"""
        response = requests.get(
            f"{BASE_URL}/api/translate/quick",
            params={"text": "Thank you", "lang": "ig"}
        )
        assert response.status_code == 200
        
        data = response.json()
        assert 'translated' in data
        assert data['language'] == 'Igbo'
    
    def test_translate_text_post(self):
        """Test /api/translate/text POST endpoint"""
        response = requests.post(
            f"{BASE_URL}/api/translate/text",
            json={
                "text": "The government announced new policies today.",
                "target_language": "pcm",
                "source_language": "en"
            }
        )
        assert response.status_code == 200
        
        data = response.json()
        assert data['success'] == True
        assert 'translated' in data
        assert data['language'] == 'pcm'
        assert data['language_name'] == 'Nigerian Pidgin'
    
    def test_translate_narrate_endpoint(self):
        """Test /api/translate/narrate generates broadcast narrative"""
        response = requests.post(
            f"{BASE_URL}/api/translate/narrate",
            json={
                "title": "Breaking News",
                "summary": "The government has announced new economic policies.",
                "target_language": "pcm"
            }
        )
        assert response.status_code == 200
        
        data = response.json()
        assert data['success'] == True
        assert 'narrative' in data
        assert 'key_takeaways' in data
        assert isinstance(data['key_takeaways'], list)
        assert data['language'] == 'pcm'
        assert data['language_name'] == 'Nigerian Pidgin'
        assert 'voice_id' in data
    
    def test_translate_invalid_language(self):
        """Test translation with invalid language returns error"""
        response = requests.post(
            f"{BASE_URL}/api/translate/text",
            json={
                "text": "Hello",
                "target_language": "invalid_lang",
                "source_language": "en"
            }
        )
        assert response.status_code == 400


class TestFactCheckAPI:
    """Fact-check API endpoint tests"""
    
    def test_factcheck_search(self):
        """Test /api/factcheck/search returns fact-check results"""
        response = requests.get(
            f"{BASE_URL}/api/factcheck/search",
            params={"query": "Nigeria election"}
        )
        assert response.status_code == 200
        
        data = response.json()
        assert data['success'] == True
        assert 'source' in data
        assert data['source'] in ['GOOGLE_FACTCHECK_API', 'MOCK_FACTCHECK']
        assert 'query' in data
        assert 'claims_found' in data
        assert 'claims' in data
        assert 'primary_verdict' in data
        assert 'confidence' in data
        assert 'checked_at' in data
    
    def test_factcheck_verify(self):
        """Test /api/factcheck/verify returns verdict and confidence"""
        response = requests.get(
            f"{BASE_URL}/api/factcheck/verify",
            params={"claim": "Nigeria election results"}
        )
        assert response.status_code == 200
        
        data = response.json()
        assert 'claim' in data
        assert 'verdict' in data
        assert data['verdict'] in ['VERIFIED', 'FALSE', 'MISLEADING', 'UNVERIFIED']
        assert 'confidence' in data
        assert isinstance(data['confidence'], int)
        assert 0 <= data['confidence'] <= 100
        assert 'reviews_found' in data
        assert 'source' in data
    
    def test_factcheck_story(self):
        """Test /api/factcheck/story/{story_id} returns status"""
        response = requests.get(f"{BASE_URL}/api/factcheck/story/test-story-123")
        assert response.status_code == 200
        
        data = response.json()
        assert 'status' in data
        assert 'confidence' in data
        assert 'source' in data
        assert 'explanation' in data
        assert 'checked_at' in data
    
    def test_factcheck_analyze(self):
        """Test /api/factcheck/analyze POST endpoint"""
        response = requests.post(
            f"{BASE_URL}/api/factcheck/analyze",
            params={"text": "This is a confirmed official statement from the government."}
        )
        assert response.status_code == 200
        
        data = response.json()
        assert 'status' in data
        assert 'confidence' in data
        assert 'source' in data
        assert data['source'] == 'KEYWORD_ANALYSIS'
    
    def test_factcheck_search_with_language(self):
        """Test /api/factcheck/search with language parameter"""
        response = requests.get(
            f"{BASE_URL}/api/factcheck/search",
            params={"query": "COVID vaccine", "language": "en"}
        )
        assert response.status_code == 200
        
        data = response.json()
        assert data['success'] == True
    
    def test_factcheck_search_min_query_length(self):
        """Test /api/factcheck/search requires minimum query length"""
        response = requests.get(
            f"{BASE_URL}/api/factcheck/search",
            params={"query": "ab"}  # Less than 3 characters
        )
        assert response.status_code == 422  # Validation error


class TestHealthAndIntegration:
    """Health check and integration tests"""
    
    def test_health_endpoint(self):
        """Test /api/health returns online status"""
        response = requests.get(f"{BASE_URL}/api/health")
        assert response.status_code == 200
        
        data = response.json()
        assert data['status'] == 'online'
        assert 'service' in data
        assert 'version' in data
