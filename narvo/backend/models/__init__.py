# Models for Narvo API
from pydantic import BaseModel, Field
from typing import List, Optional
from datetime import datetime

# News Models
class NewsItem(BaseModel):
    id: str
    title: str
    summary: str
    source: str
    source_url: Optional[str] = None
    image_url: Optional[str] = None
    published: Optional[str] = None
    category: str = "General"
    region: str = "Africa"
    tags: List[str] = []
    narrative: Optional[str] = None
    key_takeaways: List[str] = []

class NewsResponse(BaseModel):
    items: List[NewsItem]
    total: int
    page: int = 1

# Briefing Models
class BriefingStory(BaseModel):
    id: str
    title: str
    summary: str
    source: str
    category: str = "General"

class MorningBriefing(BaseModel):
    id: str
    date: Optional[str] = None
    title: str
    generated_at: str
    duration_estimate: str
    stories: List[BriefingStory]
    script: str
    audio_url: Optional[str] = None
    voice_id: str = "nova"

# User Models
class UserPreferences(BaseModel):
    voice_id: str = "nova"
    playback_speed: float = 1.0
    categories: List[str] = []
    notifications_enabled: bool = True

class UserSettings(BaseModel):
    system: Optional[dict] = None
    accessibility: Optional[dict] = None
    notifications: Optional[dict] = None
    privacy: Optional[dict] = None

# Admin Models
class AdminMetrics(BaseModel):
    active_streams: int = 1240
    avg_bitrate: float = 4.8
    error_rate: float = 0.02
    storage_used: int = 84
    node_load: str = "42%"
    api_latency: str = "12ms"
    uptime: str = "99.98%"
    active_traffic: str = "4.8GBPS"

class SystemAlert(BaseModel):
    id: str
    type: str  # 'warning', 'success', 'error'
    title: str
    description: str
    timestamp: str
    priority: bool = False

class StreamStatus(BaseModel):
    status: str  # 'LIVE', 'OFFLINE'
    id: str
    source: str
    region: str
    bitrate: str
    uptime: str

class VoiceMetrics(BaseModel):
    name: str
    id: str
    language: str
    latency: str
    clarity: float
    status: str  # 'LIVE', 'TRAINING'

class ModerationItem(BaseModel):
    id: str
    source: str
    status: str  # 'DISPUTED', 'VERIFIED', 'UNVERIFIED'
    title: str
    description: str
    tags: List[str]
    confidence: str

# Radio Models
class RadioStation(BaseModel):
    id: str
    name: str
    url: str
    country: str
    countrycode: str
    language: Optional[str] = None
    tags: Optional[str] = None
    favicon: Optional[str] = None
    codec: Optional[str] = None
    bitrate: Optional[int] = None

# TTS Models
class TTSRequest(BaseModel):
    text: str
    voice_id: str = "nova"
    speed: float = 1.0

class TTSResponse(BaseModel):
    audio_url: str
    voice_id: str
    duration_estimate: Optional[float] = None
