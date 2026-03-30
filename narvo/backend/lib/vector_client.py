"""
Upstash Vector client for semantic search (recommendations).
Uses UPSTASH_VECTOR_REST_URL and UPSTASH_VECTOR_REST_TOKEN.
If env vars are missing, query/upsert are no-ops and return empty/success.
"""
import logging
import os
from typing import Any, List, Optional

logger = logging.getLogger(__name__)

_index = None

# Dimension must match the Upstash Vector index (use 768 with Gemini embedding output_dimensionality=768).
# If you see "Invalid vector dimension: 768, expected: 1536", the index was created with dimension 1536;
# recreate the Upstash Vector index with dimension 768 to match this app.
VECTOR_DIMENSION = 768


def _get_index():
    """Lazy init Upstash Vector Index from env. Returns None if not configured."""
    global _index
    if _index is not None:
        return _index
    url = os.environ.get("UPSTASH_VECTOR_REST_URL", "").strip()
    token = os.environ.get("UPSTASH_VECTOR_REST_TOKEN", "").strip()
    if not url or not token:
        return None
    try:
        from upstash_vector import Index
        _index = Index.from_env()
        logger.info("[vector] Upstash Vector index initialized")
        return _index
    except Exception as e:
        logger.warning("[vector] Failed to init Upstash Vector: %s", e)
        return None


def upsert_vectors(vectors: List[dict]) -> bool:
    """
    Upsert vectors into the index. Each item: id, vector (list of float), metadata (dict), data (str, optional).
    Returns True on success, False if index unavailable or error.
    """
    index = _get_index()
    if not index:
        return False
    if not vectors:
        return True
    try:
        index.upsert(vectors=vectors)
        return True
    except Exception as e:
        logger.warning("[vector] upsert failed: %s", e)
        return False


def query_similar(
    vector: List[float],
    top_k: int = 20,
    include_metadata: bool = True,
    filter_metadata: Optional[dict] = None,
) -> List[dict]:
    """
    Query for similar vectors. Returns list of dicts with id, score, metadata.
    Returns [] if index unavailable or error.
    """
    index = _get_index()
    if not index:
        return []
    try:
        result = index.query(
            vector=vector,
            top_k=top_k,
            include_metadata=include_metadata,
            include_data=False,
            filter=filter_metadata,
        )
        # SDK returns iterable of results with .id, .score, .metadata
        out = []
        for r in (result if hasattr(result, "__iter__") and not isinstance(result, dict) else [result]):
            out.append({
                "id": getattr(r, "id", None),
                "score": getattr(r, "score", 0.0),
                "metadata": getattr(r, "metadata", {}) or {},
            })
        return out
    except Exception as e:
        logger.warning("[vector] query failed: %s", e)
        return []
