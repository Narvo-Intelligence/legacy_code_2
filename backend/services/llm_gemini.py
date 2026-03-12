# Shared Gemini (Google AI) client for narrative, translation, briefing, recommendations.
# Uses the current google.genai SDK (google-genai package).
# The older google.generativeai package is deprecated and models/gemini-2.0-flash
# is no longer available to new API users via that SDK.
import os
import asyncio
import logging
from typing import List, Optional

logger = logging.getLogger(__name__)

GEMINI_API_KEY = os.environ.get("GEMINI_API_KEY")

# Primary model: gemini-2.0-flash (fast, cost-effective for translation + narrative)
# Fallback used internally if primary returns empty: gemini-2.0-flash-lite
MODEL_NAME  = "gemini-2.0-flash"
MODEL_LITE  = "gemini-2.0-flash-lite"

# Embedding model — 768 dims to match Upstash Vector index.
EMBED_MODEL     = "text-embedding-004"
EMBED_DIMENSION = 768


def _get_client():
    """Return a configured google.genai Client."""
    from google import genai
    return genai.Client(api_key=GEMINI_API_KEY)


def _generate_content_sync(system_instruction: str, user_content: str) -> str:
    """Sync call to Gemini via new google.genai SDK. Run via asyncio.to_thread."""
    from google import genai
    from google.genai import types

    client = genai.Client(api_key=GEMINI_API_KEY)
    config = types.GenerateContentConfig(
        system_instruction=system_instruction,
        temperature=0.7,
    )
    response = client.models.generate_content(
        model=MODEL_NAME,
        contents=user_content,
        config=config,
    )
    text = response.text if response and response.text else ""
    if not text:
        # Try lite model once before raising
        response = client.models.generate_content(
            model=MODEL_LITE,
            contents=user_content,
            config=config,
        )
        text = response.text if response and response.text else ""
    if not text:
        raise ValueError("Empty response from Gemini")
    return text.strip()


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
    from google import genai
    from google.genai import types

    client = genai.Client(api_key=GEMINI_API_KEY)
    try:
        result = client.models.embed_content(
            model=EMBED_MODEL,
            contents=text,
            config=types.EmbedContentConfig(output_dimensionality=EMBED_DIMENSION),
        )
        # result.embeddings is a list of ContentEmbedding objects
        embeddings = getattr(result, "embeddings", None)
        if embeddings and len(embeddings) > 0:
            values = getattr(embeddings[0], "values", None)
            if values:
                return list(values)
        return None
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
