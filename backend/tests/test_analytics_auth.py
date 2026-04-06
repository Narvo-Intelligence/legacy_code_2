"""GET /api/analytics/{user_id} must require JWT and forbid cross-user access (IDOR fix)."""

import pytest
from fastapi.testclient import TestClient

from lib.auth import get_current_user
from server import app


@pytest.fixture
def clear_overrides():
    yield
    app.dependency_overrides.pop(get_current_user, None)


def test_analytics_without_auth_returns_401(client: TestClient, clear_overrides):
    res = client.get("/api/analytics/any-user-id")
    assert res.status_code == 401


def test_analytics_wrong_user_returns_403(client: TestClient, clear_overrides):
    app.dependency_overrides[get_current_user] = lambda: "user-a"
    try:
        res = client.get("/api/analytics/user-b")
        assert res.status_code == 403
        body = res.json()
        assert body.get("error") is True
    finally:
        app.dependency_overrides.pop(get_current_user, None)


def test_analytics_matching_user_ok(client: TestClient, monkeypatch, clear_overrides):
    uid = "same-user"

    class _Exec:
        data = []

    class _Chain:
        def select(self, *a, **k):
            return self

        def eq(self, *a, **k):
            return self

        def order(self, *a, **k):
            return self

        def limit(self, n):
            return self

        def execute(self):
            return _Exec()

    class _DB:
        def table(self, name):
            return _Chain()

    monkeypatch.setattr("routes.health.get_supabase_db", lambda: _DB())
    app.dependency_overrides[get_current_user] = lambda: uid
    try:
        res = client.get(f"/api/analytics/{uid}")
        assert res.status_code == 200
        data = res.json()
        assert data.get("total_listens") == 0
    finally:
        app.dependency_overrides.pop(get_current_user, None)
