import pytest
from types import SimpleNamespace

import services.recommendation_service as rs


class DummyTable:
    def __init__(self, data):
        self._data = data

    def select(self, *args, **kwargs):
        return self

    def eq(self, *args, **kwargs):
        return self

    def order(self, *args, **kwargs):
        return self

    def limit(self, *args, **kwargs):
        return self

    def execute(self):
        return SimpleNamespace(data=list(self._data), count=len(self._data))


class DummyDB:
    def __init__(self, tables):
        self._tables = tables

    def table(self, name):
        return DummyTable(self._tables.get(name, []))


def test_build_user_profile_empty_history(monkeypatch):
    monkeypatch.setattr(rs, "get_supabase_db", lambda: DummyDB({"listening_history": [], "user_preferences": []}))
    profile = rs.build_user_profile("user-1")
    assert profile["history_count"] == 0
    assert profile["categories"] == {}
    assert profile["sources"] == {}
    assert profile.get("recent_categories") == []


def test_score_article_recent_listening_boost():
    profile = {
        "categories": {"politics": 0.2},
        "sources": {},
        "keywords": [],
        "interests": [],
        "recent_categories": ["politics", "politics", "sports"],
        "history_count": 3,
    }
    article = {"category": "Politics", "source": "", "title": "X", "summary": ""}
    base = {
        "categories": {"politics": 0.2},
        "sources": {},
        "keywords": [],
        "interests": [],
        "history_count": 3,
    }
    with_recent = rs.score_article(article, profile, [])
    without_recent = rs.score_article(article, base, [])
    assert with_recent > without_recent


def test_score_article_category_match():
    profile = {
        "categories": {"politics": 1.0},
        "sources": {"Reuters": 1.0},
        "keywords": ["election"],
        "interests": [],
        "recent_categories": [],
        "history_count": 5,
    }
    article = {
        "category": "Politics",
        "source": "Reuters",
        "title": "Election updates",
        "summary": "Campaign trail",
        "published": "2026-03-12T08:00:00+00:00",
    }
    score = rs.score_article(article, profile, expanded_topics=[])
    assert score > 0


@pytest.mark.asyncio
async def test_get_recommendations_fallback(monkeypatch):
    monkeypatch.setattr(rs, "get_supabase_db", lambda: DummyDB({"listening_history": [], "user_preferences": []}))
    async def _noop(*_args, **_kwargs):
        return None
    async def _empty_set(*_args, **_kwargs):
        return set()
    monkeypatch.setattr(rs, "_ensure_vectors_upserted", _noop)
    monkeypatch.setattr(rs, "_get_semantic_similar_ids", _empty_set)
    available = [
        {"id": "n1", "title": "Story 1"},
        {"id": "n2", "title": "Story 2"},
        {"id": "n3", "title": "Story 3"},
    ]
    result = await rs.get_recommendations("user-1", available, limit=2)
    assert result["strategy"] == "trending_fallback"
    assert len(result["recommendations"]) == 2
