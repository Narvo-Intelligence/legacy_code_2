# Translation Service - Multi-language translation using Gemini (standalone)
import json
import logging
import re as _re
from typing import Dict, Optional

from services.llm_gemini import generate_gemini

logger = logging.getLogger(__name__)

# ── Sanitizer: strip stage directions / sound-effect text from AI output ──
_STAGE_DIRECTION_PATTERNS = [
    _re.compile(r'\[.*?\]'),
    _re.compile(r'\(.*?(music|sound|pause|sigh|jingle|transition|SFX|fade|clears?).*?\)', _re.IGNORECASE),
    _re.compile(r'\*.*?(music|sound|pause|sigh|jingle|transition|SFX|fade|clears?).*?\*', _re.IGNORECASE),
    _re.compile(r'(?i)^\s*(?:sound of|sounds? of|sfx:?).*$', _re.MULTILINE),
    _re.compile(r'(?i)^\s*(?:\(|\*).*?(?:music|jingle|theme|fade|transition).*?(?:\)|\*)\s*$', _re.MULTILINE),
]

def _sanitize(text: str) -> str:
    if not text:
        return text
    result = text
    for p in _STAGE_DIRECTION_PATTERNS:
        result = p.sub('', result)
    return _re.sub(r'\n{3,}', '\n\n', result).strip()

# Supported languages with authentic native names and TTS voice recommendations
SUPPORTED_LANGUAGES = {
    "en": {
        "name": "English",
        "native_name": "English",
        "voice_id": "onyx",
        "voice_name": "Emeka",
        "gender": "male",
        "description": "International English broadcast"
    },
    "pcm": {
        "name": "Naijá",
        "native_name": "Naijá Tok",
        "voice_id": "echo",
        "voice_name": "Tunde",
        "gender": "male",
        "description": "Naijá Pidgin - di language wey everybody sabi for Naija"
    },
    "yo": {
        "name": "Yorùbá",
        "native_name": "Èdè Yorùbá",
        "voice_id": "nova",
        "voice_name": "Adùnní",
        "gender": "female",
        "description": "Èdè Yorùbá - àwọn ará Gúúsù Ìwọ̀ Oòrùn Nàìjíríà"
    },
    "ha": {
        "name": "Hausa",
        "native_name": "Harshen Hausa",
        "voice_id": "shimmer",
        "voice_name": "Halima",
        "gender": "female",
        "description": "Harshen Hausa - yaren Arewacin Najeriya"
    },
    "ig": {
        "name": "Igbo",
        "native_name": "Asụsụ Igbo",
        "voice_id": "alloy",
        "voice_name": "Adaeze",
        "gender": "female",
        "description": "Asụsụ Igbo - asụsụ ndị Ala Igbo"
    }
}

def get_supported_languages():
    """Get list of supported languages"""
    return [
        {"code": code, **info}
        for code, info in SUPPORTED_LANGUAGES.items()
    ]


def get_language_info(language_code: str) -> Optional[Dict]:
    """Get information about a specific language"""
    return SUPPORTED_LANGUAGES.get(language_code)


async def translate_text(
    text: str,
    target_language: str,
    source_language: str = "en",
    style: str = "broadcast"
) -> Dict:
    """
    Translate text into target language using Gemini.
    Also transforms into broadcast narrative style.
    
    Args:
        text: The text to translate
        target_language: Target language code (en, pcm, yo, ha, ig)
        source_language: Source language code (default: en)
        style: Writing style (broadcast, formal, casual)
    
    Returns:
        Dict with translated text and metadata
    """
    if target_language not in SUPPORTED_LANGUAGES:
        return {
            "success": False,
            "error": f"Unsupported language: {target_language}",
            "original": text,
            "translated": text
        }
    
    # If same language, just return original
    if target_language == source_language:
        return {
            "success": True,
            "original": text,
            "translated": text,
            "language": target_language,
            "language_name": SUPPORTED_LANGUAGES[target_language]["name"]
        }
    
    lang_info = SUPPORTED_LANGUAGES[target_language]

    _no_sfx_rule = """
CRITICAL: NEVER include sound descriptions, stage directions, or production cues.
No text like "[music fades]", "(pause)", "*sigh*", "Sound of..." etc.
Write ONLY the actual spoken news content."""

    system_prompts = {
        "pcm": """You are a professional Nigerian broadcast journalist fluent in Nigerian Pidgin (Naija).
Translate the news into natural, authentic Nigerian Pidgin while maintaining journalistic accuracy.
Use common Pidgin expressions and idioms. Keep the broadcast tone professional but relatable.
Example style: "Di goment don tok say..." instead of "The government has announced..."
Write ONLY the translated text, no explanations.""" + _no_sfx_rule,
        "yo": """You are a professional Yoruba broadcast journalist.
Translate the news into fluent, natural Yoruba (Èdè Yorùbá) while maintaining journalistic accuracy.
Use proper Yoruba grammar, tones, and expressions. Keep the broadcast tone dignified and clear.
Write ONLY the translated text in Yoruba, no explanations or English.""" + _no_sfx_rule,
        "ha": """You are a professional Hausa broadcast journalist.
Translate the news into fluent, natural Hausa (Harshen Hausa) while maintaining journalistic accuracy.
Use proper Hausa grammar and expressions common in Northern Nigeria. Keep the broadcast tone professional.
Write ONLY the translated text in Hausa, no explanations or English.""" + _no_sfx_rule,
        "ig": """You are a professional Igbo broadcast journalist.
Translate the news into fluent, natural Igbo (Asụsụ Igbo) while maintaining journalistic accuracy.
Use proper Igbo grammar, dialect (Central Igbo preferred), and expressions. Keep the broadcast tone clear and authoritative.
Write ONLY the translated text in Igbo, no explanations or English.""" + _no_sfx_rule,
        "en": """You are a professional broadcast journalist.
Rewrite this news in clear, engaging broadcast English.
Use an authoritative but accessible tone suitable for radio/audio news.
Write ONLY the rewritten text, no explanations.""" + _no_sfx_rule,
    }
    system_message = system_prompts.get(target_language, system_prompts["en"])
    user_content = f"Translate this news:\n\n{text}"

    try:
        response = await generate_gemini(system_message, user_content)
        if not response:
            return {"success": False, "error": "No Gemini response", "original": text, "translated": text, "language": target_language}
        translated_text = _sanitize(response.strip())
        return {
            "success": True,
            "original": text,
            "translated": translated_text,
            "language": target_language,
            "language_name": lang_info["name"],
            "voice_id": lang_info["voice_id"]
        }
    except Exception as e:
        logger.error("Translation error: %s", e)
        return {
            "success": False,
            "error": str(e),
            "original": text,
            "translated": text,
            "language": target_language
        }


async def translate_and_narrate(
    title: str,
    summary: str,
    target_language: str
) -> Dict:
    """
    Combined function to translate news content and generate broadcast narrative.
    
    Args:
        title: News headline
        summary: News summary/content
        target_language: Target language code
    
    Returns:
        Dict with translated narrative and key takeaways
    """
    if target_language not in SUPPORTED_LANGUAGES:
        return {
            "success": False,
            "error": f"Unsupported language: {target_language}",
            "narrative": summary,
            "key_takeaways": []
        }
    
    lang_info = SUPPORTED_LANGUAGES[target_language]

    lang_instructions = {
        "pcm": "Write in Nigerian Pidgin (Naija). Make am sound natural like how person wey dey do radio go yarn am.",
        "yo": "Kọ ní èdè Yorùbá. Jẹ́ kí ó dún bíi ìròyìn rédíò.",
        "ha": "Rubuta a Hausa. Ka yi shi kamar labarin rediyo.",
        "ig": "Dee n'asụsụ Igbo. Mee ka ọ dị ka akụkọ redio.",
        "en": "Write in clear broadcast English suitable for radio."
    }
    instruction = lang_instructions.get(target_language, lang_instructions["en"])

    system_message = f"""You are a professional broadcast journalist for Narvo, an African news platform.
Transform news into engaging broadcast narratives in the specified language.

Language: {lang_info['name']} ({lang_info['native_name']})
Style: {instruction}

Requirements:
- Write a 2-3 paragraph broadcast narrative
- Extract 2-3 key takeaways (in the same language)
- Maintain journalistic accuracy
- Use natural expressions for the target language

CRITICAL: NEVER include sound descriptions, stage directions, or production cues.
No text like "Sound of music fades", "[pause]", "(jingle plays)", "*transition*" etc.
Write ONLY the actual spoken news content — every word must be substantive reporting.

Respond in JSON format:
{{
  "narrative": "The broadcast narrative in {lang_info['name']}...",
  "key_takeaways": ["Point 1 in {lang_info['name']}", "Point 2", "Point 3"]
}}"""
    user_content = f"Transform this news:\n\nTitle: {title}\n\nContent: {summary}"

    try:
        response = await generate_gemini(system_message, user_content)
        if not response:
            return {"success": False, "error": "No Gemini response", "narrative": summary, "key_takeaways": [], "language": target_language}
        cleaned = response.strip()
        if cleaned.startswith("```"):
            cleaned = cleaned.split("```")[1]
            if cleaned.startswith("json"):
                cleaned = cleaned[4:]
        cleaned = cleaned.strip()
        result = json.loads(cleaned)
        narrative = _sanitize(result.get("narrative", summary))
        takeaways = [_sanitize(kt) for kt in result.get("key_takeaways", []) if _sanitize(kt)]
        return {
            "success": True,
            "narrative": narrative,
            "key_takeaways": takeaways,
            "language": target_language,
            "language_name": lang_info["name"],
            "voice_id": lang_info["voice_id"]
        }
    except Exception as e:
        logger.error("Translation/narration error: %s", e)
        return {
            "success": False,
            "error": str(e),
            "narrative": summary,
            "key_takeaways": ["Story details available in full article"],
            "language": target_language
        }
