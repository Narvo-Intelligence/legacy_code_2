"""
Shared pytest configuration and fixtures for backend tests.
Use the `client` fixture for in-process requests (no live server needed).
"""
import os
import sys

import pytest

# Ensure backend root is on path when running pytest from repo root (e.g. pytest backend/tests)
_backend_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if _backend_dir not in sys.path:
    sys.path.insert(0, _backend_dir)

from fastapi.testclient import TestClient

from server import app


@pytest.fixture
def client():
    """FastAPI TestClient for in-process requests. Use client.get('/api/health'), client.post('/api/...', json={}), etc."""
    with TestClient(app) as c:
        yield c
