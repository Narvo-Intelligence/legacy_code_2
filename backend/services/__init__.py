# Services package initialization
# This file makes the services directory a Python package

from services.news_service import fetch_all_news, search_news, get_breaking_news, get_trending_topics
from services.tts_service import generate_tts_audio, get_available_voices
from services.podcast_service import get_podcasts, get_podcast_by_id, get_podcast_audio_url
from services.radio_service import get_countries, get_stations
from services.admin_service import get_system_metrics, get_system_alerts
from services.factcheck_service import check_story_facts, analyze_claim
from services.narrative_service import generate_narrative, extract_category, extract_tags
from services.offline_service import save_article, get_articles, remove_article
from services.user_service import get_bookmarks, add_bookmark, get_preferences, get_voice_profiles

__all__ = [
    # News
    "fetch_all_news", "search_news", "get_breaking_news", "get_trending_topics",
    # TTS
    "generate_tts_audio", "get_available_voices",
    # Podcast
    "get_podcasts", "get_podcast_by_id", "get_podcast_audio_url",
    # Radio
    "get_countries", "get_stations",
    # Admin
    "get_system_metrics", "get_system_alerts",
    # Factcheck
    "check_story_facts", "analyze_claim",
    # Narrative
    "generate_narrative", "extract_category", "extract_tags",
    # Offline
    "save_article", "get_articles", "remove_article",
    # User
    "get_bookmarks", "add_bookmark", "get_preferences", "get_voice_profiles",
]
