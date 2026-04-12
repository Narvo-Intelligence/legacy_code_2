def test_legacy_push_subscribe_is_gone(client):
    res = client.post(
        "/api/notifications/subscribe",
        json={"endpoint": "https://push.example.test/sub/123", "keys": {"p256dh": "k", "auth": "a"}},
    )

    assert res.status_code == 410
    assert "/api/me/push" in res.json()["detail"]


def test_legacy_push_unsubscribe_is_gone(client):
    res = client.post(
        "/api/notifications/unsubscribe",
        json={"endpoint": "https://push.example.test/sub/123"},
    )

    assert res.status_code == 410
    assert "/api/me/push" in res.json()["detail"]


def test_digest_stays_available(client, monkeypatch):
    async def fake_fetch_all_news(limit=5):
        return [
            {"id": "story-1", "title": "Story one", "category": "tech", "source": "Narvo"},
            {"id": "story-2", "title": "Story two", "category": "politics", "source": "Narvo"},
        ]

    monkeypatch.setattr("services.news_service.fetch_all_news", fake_fetch_all_news)

    res = client.get("/api/notifications/digest")

    assert res.status_code == 200
    body = res.json()
    assert body["title"] == "NARVO DAILY DIGEST"
    assert body["briefing_available"] is True
    assert [story["id"] for story in body["top_stories"]] == ["story-1", "story-2"]
