from routes import health as health_routes
from services import provider_status


class _TableResult:
    def __init__(self, data=None, count=None):
        self.data = data or []
        self.count = count


class _Table:
    def __init__(self, name: str):
        self.name = name

    def select(self, *args, **kwargs):
        return self

    def limit(self, *args, **kwargs):
        return self

    def eq(self, *args, **kwargs):
        return self

    def execute(self):
        if self.name == "tts_cache":
            return _TableResult(count=4)
        if self.name == "listening_history":
            return _TableResult(count=7)
        if self.name == "briefings":
            return _TableResult(data=[{"id": "briefing-1"}])
        if self.name == "user_preferences":
            return _TableResult(data=[{"user_id": "user-1"}])
        return _TableResult()


class _DB:
    def table(self, name: str):
        return _Table(name)


def test_health_and_metrics_include_provider_status(client, monkeypatch):
    provider_status._reset_provider_runtime()
    monkeypatch.setattr(health_routes, "get_supabase_db", lambda: _DB())

    async def fake_aggregator_status():
        return {"cache_stale": False, "mediastack": {"cached_count": 0}, "newsdata": {"cached_count": 0}}

    monkeypatch.setattr("services.aggregator_service.get_aggregator_status", fake_aggregator_status)
    provider_status.mark_provider_error(
        "gemini",
        "403 PERMISSION_DENIED",
        kind="auth",
        cooldown_seconds=120,
        detail="Gemini auth/config failure",
    )
    provider_status.mark_provider_ok("yarngpt", "Voice Emma synthesized successfully")

    health_res = client.get("/api/health")
    assert health_res.status_code == 200
    health_payload = health_res.json()
    assert "providers" in health_payload
    assert health_payload["providers"]["gemini"]["status"] == "cooldown"
    assert health_payload["providers"]["yarngpt"]["status"] == "ok"

    metrics_res = client.get("/api/metrics")
    assert metrics_res.status_code == 200
    metrics_payload = metrics_res.json()
    assert "provider_summary" in metrics_payload
    assert metrics_payload["provider_summary"]["cooldown"] >= 1
    assert metrics_payload["providers"]["gemini"]["error_kind"] == "auth"


def test_system_alerts_surface_provider_degradation(client, monkeypatch):
    provider_status._reset_provider_runtime()
    monkeypatch.setattr(health_routes, "get_supabase_db", lambda: _DB())

    async def fake_aggregator_status():
        return {"cache_stale": False, "mediastack": {"cached_count": 0}, "newsdata": {"cached_count": 0}}

    monkeypatch.setattr("services.aggregator_service.get_aggregator_status", fake_aggregator_status)
    provider_status.mark_provider_error(
        "gemini",
        "quota exhausted",
        kind="quota",
        cooldown_seconds=60,
        detail="Gemini quota exceeded",
    )

    res = client.get("/api/system-alerts")
    assert res.status_code == 200
    alerts = res.json()
    assert any(alert["id"] == "provider-gemini" for alert in alerts)
    assert any(alert["title"] == "PLATFORM_DEGRADED" for alert in alerts)


def test_system_alerts_ignore_optional_disabled_providers(client, monkeypatch):
    provider_status._reset_provider_runtime()
    monkeypatch.setattr(health_routes, "get_supabase_db", lambda: _DB())

    async def fake_aggregator_status():
        return {"cache_stale": False, "mediastack": {"cached_count": 0}, "newsdata": {"cached_count": 0}}

    monkeypatch.setattr("services.aggregator_service.get_aggregator_status", fake_aggregator_status)
    provider_status.mark_provider_disabled("web_push", "VAPID_PRIVATE_KEY not configured")

    res = client.get("/api/system-alerts")
    assert res.status_code == 200
    alerts = res.json()
    assert not any(alert["id"] == "provider-web_push" for alert in alerts)
    assert any(alert["title"] == "PLATFORM_OPERATIONAL" for alert in alerts)
