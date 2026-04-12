from routes import share as share_route


def test_share_payload_uses_requested_pidgin_lang(monkeypatch):
    monkeypatch.setenv("PUBLIC_SITE_URL", "https://narvo.news")
    monkeypatch.setattr(
        "services.story_content_service.get_story_content",
        lambda story_id: {
            "title": "English title",
            "short_summary": "English summary",
            "translations": {
                "pcm": {
                    "title": "Pidgin title",
                    "short_summary": "Pidgin summary",
                }
            },
            "audio_by_lang": {
                "pcm": "https://cdn.narvo.news/audio/story-1-pcm.mp3",
                "en": "https://cdn.narvo.news/audio/story-1-en.mp3",
            },
        },
    )

    payload = share_route._share_payload_for_story(
        {
            "id": "story-1",
            "title": "Fallback title",
            "summary": "Fallback summary",
            "source": "Narvo",
            "category": "tech",
            "image_url": "/story-1.png",
        },
        "story-1",
        "pcm",
    )

    assert payload["share_lang"] == "pcm"
    assert payload["title"] == "Pidgin title"
    assert payload["summary"] == "Pidgin summary"
    assert payload["audio_available"] is True
    assert payload["audio_lang"] == "pcm"
    assert payload["autoplay_url"] == "https://narvo.news/news/story-1?play=1&lang=pcm"
    assert payload["og_image_url"] == "https://narvo.news/story-1.png"
    assert "https%3A%2F%2Fnarvo.news%2Fnews%2Fstory-1%3Fplay%3D1%26lang%3Dpcm" in payload["whatsapp_url"]


def test_share_payload_falls_back_to_story_fields(monkeypatch):
    monkeypatch.setenv("PUBLIC_SITE_URL", "https://narvo.news")
    monkeypatch.setattr("services.story_content_service.get_story_content", lambda story_id: {})

    payload = share_route._share_payload_for_story(
        {
            "id": "story-2",
            "title": "Market wrap",
            "summary": "Stocks closed higher after the central bank announcement.",
            "source": "Premium Times",
            "category": "business",
            "image_url": "https://cdn.narvo.news/story-2.png",
        },
        "story-2",
        "en",
    )

    assert payload["share_lang"] == "en"
    assert payload["title"] == "Market wrap"
    assert payload["summary"] == "Stocks closed higher after the central bank announcement."
    assert payload["audio_available"] is False
    assert payload["story_url"] == "https://narvo.news/news/story-2"
    assert payload["share_text"] == "Stocks closed higher after the central bank announcement."
