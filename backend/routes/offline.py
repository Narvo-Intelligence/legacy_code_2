# Offline routes - Save articles, manage offline content (per-user in DB)
from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel
from typing import Optional, List

from services.offline_service import (
    save_article,
    get_articles,
    remove_article,
    clear_all_articles,
    get_stats
)

router = APIRouter(prefix="/api/offline", tags=["offline"])


class OfflineArticle(BaseModel):
    story_id: str
    title: str
    summary: Optional[str] = ""
    narrative: Optional[str] = ""
    source: Optional[str] = ""
    category: Optional[str] = "General"
    image_url: Optional[str] = None
    user_id: Optional[str] = None


class OfflineArticleResponse(BaseModel):
    story_id: str
    title: str
    summary: Optional[str] = ""
    narrative: Optional[str] = ""
    source: Optional[str] = ""
    category: Optional[str] = "General"
    image_url: Optional[str] = None
    saved_at: str


@router.post("/save")
async def save_article_offline(article: OfflineArticle):
    """Save an article for offline reading (stored per user in DB)."""
    try:
        data = {k: v for k, v in article.dict().items() if k != "user_id"}
        return save_article(data, user_id=article.user_id)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to save article: {str(e)}")


@router.get("/articles", response_model=List[OfflineArticleResponse])
async def get_offline_articles(user_id: str = Query("guest", description="User ID")):
    """Get all saved offline articles for the user."""
    return get_articles(user_id=user_id or None)


@router.delete("/articles/{story_id}")
async def remove_offline_article(story_id: str, user_id: str = Query("guest", description="User ID")):
    """Remove a specific article from offline storage for the user."""
    if not remove_article(story_id, user_id=user_id or None):
        raise HTTPException(status_code=404, detail="Article not found")
    return {"status": "deleted", "story_id": story_id}


@router.delete("/articles")
async def clear_all_offline_articles(user_id: str = Query("guest", description="User ID")):
    """Clear all saved offline articles for the user."""
    deleted_count = clear_all_articles(user_id=user_id or None)
    return {"status": "cleared", "deleted_count": deleted_count}


@router.get("/stats")
async def get_offline_stats(user_id: str = Query("guest", description="User ID")):
    """Get offline storage statistics for the user."""
    return get_stats(user_id=user_id or None)
