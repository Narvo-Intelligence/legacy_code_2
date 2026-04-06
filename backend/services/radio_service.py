# Radio Service - Radio station integration via Radio Browser API
import logging
from typing import List, Dict, Optional

import httpx

logger = logging.getLogger(__name__)

RADIO_BROWSER_API = "https://de1.api.radio-browser.info"

AFRICA_COUNTRY_LIST = "NG,GH,KE,ZA,EG,MA,TZ,UG,ET,SN,CI,CM,AO,ZW"

# African countries with radio stations
AFRICAN_COUNTRIES = [
    {"code": "NG", "name": "Nigeria", "flag": "🇳🇬"},
    {"code": "GH", "name": "Ghana", "flag": "🇬🇭"},
    {"code": "KE", "name": "Kenya", "flag": "🇰🇪"},
    {"code": "ZA", "name": "South Africa", "flag": "🇿🇦"},
    {"code": "EG", "name": "Egypt", "flag": "🇪🇬"},
    {"code": "MA", "name": "Morocco", "flag": "🇲🇦"},
    {"code": "TZ", "name": "Tanzania", "flag": "🇹🇿"},
    {"code": "UG", "name": "Uganda", "flag": "🇺🇬"},
    {"code": "ET", "name": "Ethiopia", "flag": "🇪🇹"},
    {"code": "SN", "name": "Senegal", "flag": "🇸🇳"},
    {"code": "CM", "name": "Cameroon", "flag": "🇨🇲"},
    {"code": "CI", "name": "Côte d'Ivoire", "flag": "🇨🇮"},
]

FALLBACK_STATIONS = [
    {
        "id": "fallback-1",
        "name": "Cool FM Lagos",
        "url": "https://stream.coolfm.ng/live",
        "url_resolved": "https://stream.coolfm.ng/live",
        "country": "Nigeria",
        "countrycode": "NG",
        "language": "english",
        "tags": "pop,music",
        "votes": 1000,
        "bitrate": 128,
        "codec": "MP3",
        "favicon": "",
    },
    {
        "id": "fallback-2",
        "name": "Wazobia FM",
        "url": "https://stream.wazobiafm.com/live",
        "url_resolved": "https://stream.wazobiafm.com/live",
        "country": "Nigeria",
        "countrycode": "NG",
        "language": "english",
        "tags": "talk,entertainment",
        "votes": 800,
        "bitrate": 128,
        "codec": "MP3",
        "favicon": "",
    },
    {
        "id": "fallback-3",
        "name": "Metro FM South Africa",
        "url": "https://stream.metrofm.co.za/live",
        "url_resolved": "https://stream.metrofm.co.za/live",
        "country": "South Africa",
        "countrycode": "ZA",
        "language": "english",
        "tags": "urban,hits",
        "votes": 600,
        "bitrate": 128,
        "codec": "MP3",
        "favicon": "",
    },
]


def get_countries() -> List[Dict]:
    return AFRICAN_COUNTRIES


async def get_stations(
    country: Optional[str] = None,
    search: Optional[str] = None,
    language: Optional[str] = None,
    limit: int = 20,
) -> List[Dict]:
    """
    Stations from Radio Browser. Defaults: Nigeria; optional `country=ALL` scans listed African codes.
    `language` is passed through (e.g. english, french) when supported by the API.
    """
    try:
        from lib.http_client import get_http_client

        client = await get_http_client()

        params: Dict[str, str] = {
            "limit": str(limit),
            "hidebroken": "true",
            "order": "votes",
            "reverse": "true",
        }

        cc = (country or "NG").strip().upper()
        if cc == "ALL":
            params["countrycodeList"] = AFRICA_COUNTRY_LIST
        else:
            params["countrycode"] = cc

        if search and search.strip():
            params["name"] = search.strip()

        if language and language.strip():
            params["language"] = language.strip().lower()

        url = f"{RADIO_BROWSER_API}/json/stations/search"
        response = await client.get(url, params=params)
        response.raise_for_status()
        data = response.json()

        stations = []
        for item in data[:limit]:
            stations.append(
                {
                    "id": item.get("stationuuid", ""),
                    "name": item.get("name", "Unknown Station"),
                    "url": item.get("url", ""),
                    "url_resolved": item.get("url_resolved", item.get("url", "")),
                    "country": item.get("country", ""),
                    "countrycode": item.get("countrycode", ""),
                    "state": item.get("state", ""),
                    "language": item.get("language", ""),
                    "tags": item.get("tags", ""),
                    "votes": item.get("votes", 0),
                    "codec": item.get("codec", ""),
                    "bitrate": item.get("bitrate", 0),
                    "favicon": item.get("favicon", ""),
                }
            )

        return stations
    except httpx.TimeoutException:
        logger.warning("Radio API timeout - using fallback stations")
        return _filter_fallback_stations(country, limit)
    except Exception as e:
        logger.error("Radio API error: %s", e)
        return _filter_fallback_stations(country, limit)


def _filter_fallback_stations(country: Optional[str], limit: int) -> List[Dict]:
    cc = (country or "").strip().upper()
    if cc and cc != "ALL":
        filtered = [s for s in FALLBACK_STATIONS if s["countrycode"] == cc]
        return filtered[:limit] if filtered else FALLBACK_STATIONS[:limit]
    return FALLBACK_STATIONS[:limit]
