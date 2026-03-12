# Shared Gemini (Google AI) client — narrative, translation, briefing, recommendations.
# SDK: google.genai (google-genai package). The older google.generativeai is end-of-life.
#
# Model availability note (as of March 2026):
#   gemini-2.0-flash / gemini-2.0-flash-lite → 404 NOT_FOUND for API keys created after
#   Google restricted these models to legacy accounts. All new API keys must use the
#   1.5 family or later models that are explicitly available to all tiers.
#
# Embedding note:
#   The google.genai SDK always uses api_version=v1beta for Gemini Developer API.
#   text-embedding-004 is only accessible via v1, so EmbedContentConfig must override
#   api_version via http_options. Without this override the call returns 404 NOT_FOUND.
import os
import asyncio
import logging
from typing import List, Optional

logger = logging.getLogger(__name__)

GEMINI_API_KEY = os.environ.get("GEMINI_API_KEY")

# Primary generation model — available to all API key tiers including new accounts.
# gemini-1.5-flash: 1M context, fast, supports system instructions, JSON mode.
MODEL_NAME = "gemini-1.5-flash"
# Lite fallback — smaller/faster, same availability.
MODEL_LITE = "gemini-1.5-flash-8b"

# Embedding model — text-embedding-004 is the current stable embedding model.
# Must be called with api_version="v1" (not "v1beta" which the SDK defaults to).
EMBED_MODEL     = "text-embedding-004"
EMBED_DIMENSION = 768   # must match Upstash Vector index dimension


def _generate_content_sync(system_instruction: str, user_content: str) -> str:
    """Sync call to Gemini. Run via asyncio.to_thread from async callers."""
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
    """Async wrapper: call Gemini with system + user message. Returns text or None."""
    if not GEMINI_API_KEY:
        return None
    try:
        return await asyncio.to_thread(_generate_content_sync, system_instruction, user_content)
    except Exception as e:
        logger.error("Gemini generate_gemini error: %s", e)
        return None


def _embed_text_sync(text: str) -> Optional[List[float]]:
    """Sync: embed a single text. Returns list of floats or None.

    Forces api_version='v1' via EmbedContentConfig.http_options — the SDK default
    of 'v1beta' does not expose text-embedding-004's embedContent method.
    """
    from google import genai
    from google.genai import types

    client = genai.Client(api_key=GEMINI_API_KEY)
    try:
        result = client.models.embed_content(
            model=EMBED_MODEL,
            contents=text,
            config=types.EmbedContentConfig(
                output_dimensionality=EMBED_DIMENSION,
                http_options=types.HttpOptions(api_version="v1"),
            ),
        )
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
    """Async: embed a single text. Returns 768-dim vector or None."""
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
