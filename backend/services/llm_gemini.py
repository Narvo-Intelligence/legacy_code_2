# Shared Gemini (Google AI) client — narrative, translation, briefing, recommendations.
# SDK: google.genai (google-genai package). The older google.generativeai is end-of-life.
#
# Model availability note (as of March 2026):
#   gemini-1.5-flash / gemini-1.5-flash-8b → 404 NOT_FOUND for API version v1beta.
#   Use gemini-2.5-flash and gemini-2.5-flash-lite for generateContent.
#
# Embedding note:
#   text-embedding-004 was deprecated 2026-01-14. We use gemini-embedding-001, which
#   supports output_dimensionality=768 (matches Upstash Vector index) via MRL.
import os
import asyncio
import logging
import random
import time
from typing import List, Optional

logger = logging.getLogger(__name__)

GEMINI_API_KEY = os.environ.get("GEMINI_API_KEY")

# Primary generation model (gemini-1.5-flash is 404 on v1beta; use 2.5).
# gemini-2.5-flash: 1M context, fast, supports system instructions, JSON mode.
MODEL_NAME = "gemini-2.5-flash"
# Lite fallback — fastest, budget-friendly.
MODEL_LITE = "gemini-2.5-flash-lite"

# Embedding model — gemini-embedding-001 (text-embedding-004 was deprecated 2026-01-14).
# Supports 768-dimensional output; must match Upstash Vector index.
EMBED_MODEL     = "gemini-embedding-001"
EMBED_DIMENSION = 768   # must match Upstash Vector index dimension

_GEMINI_AUTH_COOLDOWN_SECONDS = 120.0
_gemini_auth_cooldown_until = 0.0
_gemini_auth_cooldown_log_at = 0.0


def _is_gemini_auth_error(err_s: str) -> bool:
    return any(
        token in err_s
        for token in (
            "permission_denied",
            "permission denied",
            "denied access",
            "forbidden",
            "unauthorized",
            "api key not valid",
            "invalid api key",
            "invalid_argument: api key",
            "403",
        )
    )


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
    global _gemini_auth_cooldown_until, _gemini_auth_cooldown_log_at

    if not GEMINI_API_KEY:
        return None
    now = time.monotonic()
    if _gemini_auth_cooldown_until > now:
        if now - _gemini_auth_cooldown_log_at >= 30.0:
            remaining = max(1, int(_gemini_auth_cooldown_until - now))
            logger.warning(
                "Gemini generate_gemini skipped during auth cooldown (%ss remaining)",
                remaining,
            )
            _gemini_auth_cooldown_log_at = now
        return None
    max_attempts = 3
    for attempt in range(max_attempts):
        try:
            return await asyncio.to_thread(_generate_content_sync, system_instruction, user_content)
        except Exception as e:
            err_s = str(e).lower()
            if _is_gemini_auth_error(err_s):
                _gemini_auth_cooldown_until = time.monotonic() + _GEMINI_AUTH_COOLDOWN_SECONDS
                _gemini_auth_cooldown_log_at = 0.0
                logger.error(
                    "Gemini generate_gemini auth/config error; cooling down for %ss: %s",
                    int(_GEMINI_AUTH_COOLDOWN_SECONDS),
                    e,
                )
                return None
            transient = any(
                s in err_s
                for s in ("503", "unavailable", "429", "resource exhausted", "deadline", "timeout")
            )
            if transient and attempt < max_attempts - 1:
                wait = (2**attempt) + random.uniform(0.0, 0.75)
                logger.warning(
                    "Gemini transient error (attempt %s/%s), retry in %.1fs: %s",
                    attempt + 1,
                    max_attempts,
                    wait,
                    e,
                )
                await asyncio.sleep(wait)
                continue
            logger.error("Gemini generate_gemini error: %s", e)
            return None
    return None


def _embed_text_sync(text: str) -> Optional[List[float]]:
    """Sync: embed a single text. Returns list of floats or None (768-dim with EMBED_MODEL)."""
    from google import genai
    from google.genai import types

    client = genai.Client(api_key=GEMINI_API_KEY)
    try:
        result = client.models.embed_content(
            model=EMBED_MODEL,
            contents=text,
            config=types.EmbedContentConfig(output_dimensionality=EMBED_DIMENSION),
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
