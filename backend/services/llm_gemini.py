# Shared Gemini (Google AI) client for narrative, translation, briefing, recommendations.
# Uses google-generativeai with GEMINI_API_KEY (standalone, no Emergent).
import os
import asyncio
import logging
from typing import List, Optional

logger = logging.getLogger(__name__)

GEMINI_API_KEY = os.environ.get("GEMINI_API_KEY")
MODEL_NAME = "gemini-2.0-flash"
# Embedding model; use 768 dims to match Upstash Vector index (gemini-embedding-001 supports output_dimensionality).
EMBED_MODEL = "models/embedding-001"
EMBED_DIMENSION = 768


def _generate_content_sync(system_instruction: str, user_content: str) -> str:
    """Sync call to Gemini. Run via asyncio.to_thread from async code."""
    import google.generativeai as genai
    genai.configure(api_key=GEMINI_API_KEY)
    model = genai.GenerativeModel(
        MODEL_NAME,
        system_instruction=system_instruction,
    )
    response = model.generate_content(user_content)
    if not response or not response.text:
        raise ValueError("Empty response from Gemini")
    return response.text.strip()


async def generate_gemini(system_instruction: str, user_content: str) -> Optional[str]:
    """Async wrapper: call Gemini with system + user message. Returns response text or None."""
    if not GEMINI_API_KEY:
        return None
    try:
        return await asyncio.to_thread(_generate_content_sync, system_instruction, user_content)
    except Exception as e:
        logger.error("Gemini generate_gemini error: %s", e)
        return None


def _embed_text_sync(text: str) -> Optional[List[float]]:
    """Sync: embed a single text with Gemini. Returns list of floats or None."""
    import google.generativeai as genai
    genai.configure(api_key=GEMINI_API_KEY)
    try:
        result = genai.embed_content(
            model=EMBED_MODEL,
            content=text,
            output_dimensionality=EMBED_DIMENSION,
        )
        if not result:
            return None
        emb = getattr(result, "embedding", None) or (getattr(result, "embeddings", None) or [])
        if isinstance(emb, list) and len(emb) > 0:
            first = emb[0]
            if isinstance(first, list):
                return list(first)
            if isinstance(first, (int, float)):
                return list(emb)
        return list(emb) if isinstance(emb, (list, tuple)) else None
    except Exception as e:
        logger.warning("Gemini embed error: %s", e)
        return None


async def embed_text(text: str) -> Optional[List[float]]:
    """Async: embed a single text. Returns vector of length EMBED_DIMENSION or None."""
    if not GEMINI_API_KEY or not (text or "").strip():
        return None
    try:
        return await asyncio.to_thread(_embed_text_sync, (text or "").strip()[:8000])
    except Exception as e:
        logger.error("Gemini embed_text error: %s", e)
        return None


async def embed_texts_batch(texts: List[str], batch_size: int = 50) -> List[Optional[List[float]]]:
    """Async: embed multiple texts in batches. Returns list of vectors (None for failures)."""
    if not GEMINI_API_KEY or not texts:
        return []
    results = []
    for i in range(0, len(texts), batch_size):
        batch = texts[i : i + batch_size]
        for t in batch:
            vec = await embed_text(t)
            results.append(vec)
    return results
