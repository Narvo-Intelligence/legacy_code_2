import routes.news as news_route

from services.ssml_decorator import (
    AUDIO_RENDER_VERSION,
    audio_voice_matches_request,
    build_audio_voice_marker,
    decorate_text_for_tts,
    split_audio_voice_marker,
)


def test_decorate_text_for_tts_adds_narvo_ssml_markup():
    text = "Good morning, Nigeria. Lagos traders may pay ₦5,000 from April 8, 2026 by 2:30pm."

    decorated = decorate_text_for_tts(text, language="en", voice_id="emma")

    assert decorated.plain_text == text
    assert decorated.ssml.startswith("<speak>")
    assert '<prosody rate="94%" pitch="+1st">' in decorated.ssml
    assert 'interpret-as="currency"' in decorated.ssml
    assert 'interpret-as="date"' in decorated.ssml
    assert "2026-04-08" in decorated.ssml
    assert 'interpret-as="time"' in decorated.ssml
    assert '<phoneme alphabet="ipa" ph="ˈleɪɡɒs">Lagos</phoneme>' in decorated.ssml
    assert "Narvo's Warm Gist style" in decorated.openai_instructions
    assert "naira" in decorated.openai_instructions
    assert "Read dates clearly and naturally." in decorated.openai_instructions
    assert "Read times clearly and naturally." in decorated.openai_instructions


def test_audio_voice_marker_requires_current_render_version():
    marker = build_audio_voice_marker("Emma")

    voice, version = split_audio_voice_marker(marker)

    assert voice == "emma"
    assert version == AUDIO_RENDER_VERSION
    assert audio_voice_matches_request(marker, "emma", require_current_version=True) is True
    assert audio_voice_matches_request("emma", "emma", require_current_version=True) is False


def test_news_audio_filter_hides_stale_or_untracked_audio():
    audio_by_lang = {
        "en": "https://example.com/audio-en.mp3",
        "yo": "https://example.com/audio-yo.mp3",
    }
    audio_voice_by_lang = {
        "en": build_audio_voice_marker("emma"),
        "yo": "idera",
    }

    assert news_route._filter_audio_for_voice_id(audio_by_lang, audio_voice_by_lang, "emma") == {
        "en": "https://example.com/audio-en.mp3"
    }
    assert news_route._filter_audio_for_voice_id(audio_by_lang, audio_voice_by_lang, "idera") == {}


def test_decorate_text_for_tts_adds_local_language_openai_guidance():
    decorated = decorate_text_for_tts(
        "Good morning. Make sure you check am before midday.",
        language="pcm",
        voice_id="wura",
    )

    assert "do not translate or flatten local phrasing" in decorated.openai_instructions
    assert "Slow down a little on advisory or cautionary lines." in decorated.openai_instructions
    assert "avoid caricature" in decorated.openai_instructions
