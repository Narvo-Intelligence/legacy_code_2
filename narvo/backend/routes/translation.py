# Translation routes - Multi-language translation endpoints
from fastapi import APIRouter, Query, HTTPException
from pydantic import BaseModel
from typing import Optional, List

from services.translation_service import (
    get_supported_languages,
    get_language_info,
    translate_text,
    translate_and_narrate
)

router = APIRouter(prefix="/api/translate", tags=["translation"])


class TranslationRequest(BaseModel):
    text: str
    target_language: str
    source_language: str = "en"


class NarrateRequest(BaseModel):
    title: str
    summary: str
    target_language: str


@router.get("/languages")
async def list_languages():
    """Get list of supported languages for translation"""
    return get_supported_languages()


@router.get("/languages/{language_code}")
async def get_language(language_code: str):
    """Get details about a specific language"""
    info = get_language_info(language_code)
    if not info:
        raise HTTPException(status_code=404, detail=f"Language not found: {language_code}")
    return {"code": language_code, **info}


@router.post("/text")
async def translate(request: TranslationRequest):
    """
    Translate text into target language.
    Supported languages: en (English), pcm (Pidgin), yo (Yoruba), ha (Hausa), ig (Igbo)
    """
    result = await translate_text(
        text=request.text,
        target_language=request.target_language,
        source_language=request.source_language
    )
    
    if not result.get("success"):
        raise HTTPException(status_code=400, detail=result.get("error", "Translation failed"))
    
    return result


@router.post("/narrate")
async def translate_narrate(request: NarrateRequest):
    """
    Translate news content and generate broadcast narrative in target language.
    Combines translation + narrative generation for TTS delivery.
    """
    result = await translate_and_narrate(
        title=request.title,
        summary=request.summary,
        target_language=request.target_language
    )
    
    if not result.get("success"):
        raise HTTPException(status_code=400, detail=result.get("error", "Translation failed"))
    
    return result


@router.get("/quick")
async def quick_translate(
    text: str = Query(..., description="Text to translate"),
    lang: str = Query("pcm", description="Target language code")
):
    """Quick translation endpoint for simple text"""
    result = await translate_text(text=text, target_language=lang)
    
    if not result.get("success"):
        raise HTTPException(status_code=400, detail=result.get("error", "Translation failed"))
    
    return {"translated": result["translated"], "language": result["language_name"]}
