"""Launch smoke for backend feed/share contracts without live network dependence."""

import services.news_service as news_service
import services.story_content_service as story_content_service
import routes.news as news_routes


def test_launch_smoke_feed_and_share_contract(client, monkeypatch):
    sample_story = {
        "id": "smoke-story-1",
        "title": "Narvo smoke story",
        "summary": "Base summary for smoke verification.",
        "short_summary": "Short smoke summary.",
        "source": "Smoke Desk",
        "category": "general",
        "region": "lagos",
        "published": "2026-04-12T10:00:00Z",
    }

    async def fake_cached_all_news(*args, **kwargs):
        return [sample_story]

    async def fake_cached_merged_news_pool(*args, **kwargs):
        return [sample_story]

    monkeypatch.setattr(news_service, "get_cached_all_news", fake_cached_all_news)
    monkeypatch.setattr(news_service, "get_cached_merged_news_pool", fake_cached_merged_news_pool)
    monkeypatch.setattr(news_routes, "get_cached_all_news", fake_cached_all_news)
    monkeypatch.setattr(
        news_routes,
        "schedule_batch_prefill_story_items",
        lambda *args, **kwargs: None,
    )
    monkeypatch.setattr(
        story_content_service,
        "get_story_content",
        lambda story_id: {
            "title": "Narvo smoke story",
            "short_summary": "A short smoke summary",
            "translations": {
                "pcm": {
                    "title": "Narvo smoke story for pidgin",
                    "short_summary": "Smoke summary for pidgin listeners",
                }
            },
            "audio_by_lang": {
                "pcm": "https://cdn.narvo.news/audio/smoke-story-1-pcm.mp3",
            },
        }
        if story_id == "smoke-story-1"
        else {},
    )

    news_res = client.get("/api/news?limit=1")
    assert news_res.status_code == 200
    news_payload = news_res.json()
    assert isinstance(news_payload, list) and news_payload
    assert news_payload[0]["id"] == "smoke-story-1"

    share_res = client.get("/api/share/smoke-story-1/payload?lang=pcm")
    assert share_res.status_code == 200
    payload = share_res.json()
    assert payload["story_id"] == "smoke-story-1"
    assert payload["share_lang"] == "pcm"
    assert payload["audio_available"] is True
    assert payload["autoplay_url"].endswith("/news/smoke-story-1?play=1&lang=pcm")
    assert "wa.me/" in payload["whatsapp_url"]
