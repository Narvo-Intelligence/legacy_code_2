# Centralized cache registry for Narvo - reducing Redis overhead at MVP scale.
import logging
from cachetools import TTLCache
from typing import Dict, Any

logger = logging.getLogger(__name__)

# Cache Registry Configuration
# TTL in seconds; MaxSize in number of items
CACHE_CONFIGS = {
    "aggregators": {"ttl": 600, "maxsize": 10},  # 10 min, results from Mediastack/NewsData
    "news_feeds": {"ttl": 120, "maxsize": 20},    # 2 min, unified RSS feed lists
    "story_details": {"ttl": 300, "maxsize": 100}, # 5 min, individual story objects
    "narratives": {"ttl": 600, "maxsize": 50},    # 10 min, generated narrative components
}

class CacheRegistry:
    _caches: Dict[str, TTLCache] = {}

    @classmethod
    def get_cache(cls, name: str) -> TTLCache:
        if name not in cls._caches:
            config = CACHE_CONFIGS.get(name, {"ttl": 60, "maxsize": 100})
            cls._caches[name] = TTLCache(maxsize=config["maxsize"], ttl=config["ttl"])
            logger.debug(f"Initialized in-memory cache: {name} (TTL: {config['ttl']}s)")
        return cls._caches[name]

    @classmethod
    def clear_all(cls):
        for cache in cls._caches.values():
            cache.clear()
        logger.info("Cleared all in-memory caches.")

# Singleton-style access
def get_cache(name: str) -> TTLCache:
    return CacheRegistry.get_cache(name)
