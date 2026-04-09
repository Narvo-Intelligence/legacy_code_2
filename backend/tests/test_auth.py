from types import SimpleNamespace

import jwt
from cryptography.hazmat.primitives.asymmetric import rsa

from lib import auth


def _request_with_bearer(token: str):
    return SimpleNamespace(headers={"Authorization": f"Bearer {token}"})


def test_get_user_id_from_request_accepts_hs256_supabase_tokens(monkeypatch):
    secret = "unit-test-supabase-secret"
    token = jwt.encode({"sub": "user-hs-123"}, secret, algorithm="HS256")
    monkeypatch.setenv("SUPABASE_JWT_SECRET", secret)
    monkeypatch.delenv("SUPABASE_URL", raising=False)

    assert auth.get_user_id_from_request(_request_with_bearer(token)) == "user-hs-123"


def test_get_user_id_from_request_accepts_rs256_supabase_tokens_via_jwks(monkeypatch):
    private_key = rsa.generate_private_key(public_exponent=65537, key_size=2048)
    public_key = private_key.public_key()
    token = jwt.encode(
        {"sub": "user-rs-456"},
        private_key,
        algorithm="RS256",
        headers={"kid": "test-kid"},
    )

    class FakeJwksClient:
        def get_signing_key_from_jwt(self, incoming: str):
            assert incoming == token
            return SimpleNamespace(key=public_key)

    monkeypatch.delenv("SUPABASE_JWT_SECRET", raising=False)
    monkeypatch.setenv("SUPABASE_URL", "https://example.supabase.co")
    auth._jwks_client_for_url.cache_clear()
    monkeypatch.setattr(auth, "_jwks_client_for_url", lambda url: FakeJwksClient())

    assert auth.get_user_id_from_request(_request_with_bearer(token)) == "user-rs-456"
