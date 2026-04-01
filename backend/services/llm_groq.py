# Shared Groq client — high-speed inference backup for Gemini.
import os
import asyncio
import logging
from typing import Optional

logger = logging.getLogger(__name__)

GROQ_API_KEY = os.environ.get("GROQ_API_KEY")

# Primary Groq model — small, extremely fast, high rate limits.
# llama-3.3-70b-versatile is a strong all-rounder for news summarization.
MODEL_NAME = "llama-3.3-70b-versatile"
# Backup model — faster, lower quality but good for lightweight tasks.
MODEL_FAST = "llama3-8b-8192"

async def generate_groq(system_instruction: str, user_content: str) -> Optional[str]:
    """Async: call Groq with system + user message. Returns text or None."""
    if not GROQ_API_KEY or "placeholder" in GROQ_API_KEY:
        return None
        
    try:
        from groq import AsyncGroq
        
        client = AsyncGroq(api_key=GROQ_API_KEY)
        
        chat_completion = await client.chat.completions.create(
            messages=[
                {
                    "role": "system",
                    "content": system_instruction,
                },
                {
                    "role": "user",
                    "content": user_content,
                }
            ],
            model=MODEL_NAME,
            temperature=0.7,
            # Groq supports JSON mode if explicitly requested in system prompt
        )
        
        text = chat_completion.choices[0].message.content
        return text.strip() if text else None
        
    except Exception as e:
        err_msg = str(e).lower()
        if "403" in err_msg or "access denied" in err_msg:
            logger.warning("Groq access denied (likely regional restriction or network policy): %s", e)
            return None
        
        logger.error("Groq generate_groq error: %s", e)
        # Try fast model as backup
        try:
            from groq import AsyncGroq
            client = AsyncGroq(api_key=GROQ_API_KEY)
            chat_completion = await client.chat.completions.create(
                messages=[
                    {"role": "system", "content": system_instruction},
                    {"role": "user", "content": user_content}
                ],
                model=MODEL_FAST,
                temperature=0.7,
            )
            text = chat_completion.choices[0].message.content
            return text.strip() if text else None
        except Exception as e2:
            err_msg2 = str(e2).lower()
            if "403" in err_msg2 or "access denied" in err_msg2:
                logger.warning("Groq fallback access denied: %s", e2)
            else:
                logger.error("Groq fallback generate_groq error: %s", e2)
            return None
