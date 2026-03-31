# Shared httpx.AsyncClient — reuse TCP connections and enable HTTP/2 multiplexing.
# Import via: from lib.http_client import get_http_client
import httpx
import logging

logger = logging.getLogger(__name__)

_client: httpx.AsyncClient | None = None


async def get_http_client() -> httpx.AsyncClient:
    """Return a module-level shared httpx.AsyncClient with connection pooling."""
    global _client
    if _client is None or _client.is_closed:
        _client = httpx.AsyncClient(
            timeout=httpx.Timeout(15.0, connect=5.0),
            limits=httpx.Limits(max_connections=30, max_keepalive_connections=10),
            follow_redirects=True,
        )
    return _client


async def close_http_client() -> None:
    """Gracefully close the shared client (call on app shutdown)."""
    global _client
    if _client and not _client.is_closed:
        await _client.aclose()
        _client = None
