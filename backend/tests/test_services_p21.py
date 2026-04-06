"""
Backend unit tests for yarngpt_service, factcheck_service, and sound_themes_service.
Run: cd /app/backend && python -m pytest tests/test_services_p21.py -v
"""
import pytest
import sys
import os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))


class TestYarnGPTService:
    def test_voice_profiles_returns_list(self):
        from services.yarngpt_service import get_voice_profiles
        profiles = get_voice_profiles()
        assert isinstance(profiles, list)
        assert len(profiles) >= 4

    def test_voice_profiles_have_required_fields(self):
        from services.yarngpt_service import get_voice_profiles
        for p in get_voice_profiles():
            assert 'id' in p
            assert 'name' in p
            assert 'language' in p
            assert 'accent' in p
            assert 'gender' in p

    def test_yarngpt_voices_dict_has_expected_voices(self):
        from services.yarngpt_service import YARNGPT_VOICES
        expected = {'idera', 'emma', 'zainab', 'osagie', 'wura'}
        assert expected.issubset(set(YARNGPT_VOICES.keys()))

    def test_yarngpt_voice_languages(self):
        from services.yarngpt_service import YARNGPT_VOICES
        lang_map = {v['language'] for v in YARNGPT_VOICES.values()}
        assert 'en' in lang_map
        assert 'yo' in lang_map
        assert 'ha' in lang_map

    def test_yarn_voice_languages_match_translation_service(self):
        """Every Yarn narrator language must be translatable (landing preview + TTS)."""
        from services.yarngpt_service import YARNGPT_VOICES
        from services.translation_service import SUPPORTED_LANGUAGES
        for vid, meta in YARNGPT_VOICES.items():
            code = meta.get("language")
            assert code in SUPPORTED_LANGUAGES, f"{vid}: language {code!r} missing from SUPPORTED_LANGUAGES"

    def test_resolve_tts_language_for_voice(self):
        from services.yarngpt_service import resolve_tts_language_for_voice
        assert resolve_tts_language_for_voice("wura", "en") == "pcm"
        assert resolve_tts_language_for_voice("idera", "en") == "yo"
        assert resolve_tts_language_for_voice("emma", "pcm") == "en"
        assert resolve_tts_language_for_voice("nova", "pcm") == "pcm"
        assert resolve_tts_language_for_voice("onyx", "ha") == "ha"

    def test_yarngpt_response_accepts_octet_stream_mp3(self):
        from services.yarngpt_service import _bytes_from_yarngpt_response

        class Resp:
            status_code = 200
            headers = {"content-type": "application/octet-stream"}
            content = bytes([0xFF, 0xF0]) + b"\x00" * 120
            text = ""

        out = _bytes_from_yarngpt_response(Resp())
        assert out is not None and len(out) > 0

    def test_openai_fallback_mapping_exists(self):
        from services.yarngpt_service import OPENAI_FALLBACK
        assert isinstance(OPENAI_FALLBACK, dict)
        assert 'en' in OPENAI_FALLBACK


class TestSoundThemesService:
    def test_get_sound_themes_returns_list(self):
        from services.sound_themes_service import get_sound_themes
        themes = get_sound_themes()
        assert isinstance(themes, list)
        assert len(themes) >= 3

    def test_theme_has_required_fields(self):
        from services.sound_themes_service import get_sound_themes
        for t in get_sound_themes():
            assert 'id' in t
            assert 'name' in t
            assert 'description' in t

    def test_get_single_theme(self):
        from services.sound_themes_service import get_sound_theme
        theme = get_sound_theme('narvo_classic')
        assert theme is not None
        assert theme['id'] == 'narvo_classic'
        assert 'intro' in theme

    def test_get_nonexistent_theme(self):
        from services.sound_themes_service import get_sound_theme
        assert get_sound_theme('does_not_exist') is None

    def test_theme_intro_has_notes(self):
        from services.sound_themes_service import get_sound_theme
        theme = get_sound_theme('narvo_classic')
        intro = theme.get('intro', {})
        assert 'notes' in intro
        assert len(intro['notes']) > 0


class TestFactcheckService:
    def test_service_imports(self):
        from services.factcheck_service import check_story_facts
        assert callable(check_story_facts)

    @pytest.mark.asyncio
    async def test_check_story_with_test_id(self):
        from services.factcheck_service import check_story_facts
        result = check_story_facts("test-nonexistent-id")
        assert isinstance(result, dict)
