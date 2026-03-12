from fastapi.testclient import TestClient

from server import app


client = TestClient(app)


def test_ping_ok():
    res = client.get("/api/ping")
    assert res.status_code == 200
    assert res.json() == {"ok": True}


def test_not_found_error_envelope():
    res = client.get("/__missing__")
    assert res.status_code == 404
    payload = res.json()
    assert payload.get("error") is True
    assert payload.get("status") == 404
    assert "code" in payload
    assert "request_id" in payload
