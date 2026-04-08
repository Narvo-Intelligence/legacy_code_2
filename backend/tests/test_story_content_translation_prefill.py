from types import SimpleNamespace

import pytest

import routes.news as news_route
import services.story_content_service as story_content_service


class DummyTable:
    def __init__(self, db, name):
        self.db = db
        self.name = name
        self._eq_filters = []
        self._in_filter = None
        self._limit = None
        self._update_payload = None
        self._upsert_payload = None

    def select(self, *_args, **_kwargs):
        return self

    def eq(self, column, value):
        self._eq_filters.append((column, value))
        return self

    def in_(self, column, values):
        self._in_filter = (column, set(values))
        return self

    def limit(self, value):
        self._limit = value
        return self

    def update(self, payload):
        self._update_payload = dict(payload)
        return self

    def upsert(self, payload, on_conflict=None):
        self._upsert_payload = (dict(payload), on_conflict)
        return self

    def _rows(self):
        rows = self.db.tables.setdefault(self.name, [])
        out = []
        for row in rows:
            if any(row.get(column) != value for column, value in self._eq_filters):
                continue
            if self._in_filter is not None:
                column, values = self._in_filter
                if row.get(column) not in values:
                    continue
            out.append(row)
        if self._limit is not None:
            out = out[: self._limit]
        return out

    def execute(self):
        rows = self.db.tables.setdefault(self.name, [])

        if self._upsert_payload is not None:
            payload, on_conflict = self._upsert_payload
            conflict_columns = [c.strip() for c in (on_conflict or "").split(",") if c.strip()]
            existing = None
            for row in rows:
                if conflict_columns and all(row.get(column) == payload.get(column) for column in conflict_columns):
                    existing = row
                    break
            if existing is None:
                rows.append(payload)
                existing = payload
            else:
                existing.update(payload)
            return SimpleNamespace(data=[dict(existing)], count=1)

        target_rows = self._rows()
        if self._update_payload is not None:
            for row in target_rows:
                row.update(self._update_payload)
            return SimpleNamespace(data=[dict(row) for row in target_rows], count=len(target_rows))

        return SimpleNamespace(data=[dict(row) for row in target_rows], count=len(target_rows))


class DummyDB:
    def __init__(self, tables):
        self.tables = tables

    def table(self, name):
        return DummyTable(self, name)


def test_save_story_content_preserves_prefilled_maps(monkeypatch):
    db = DummyDB(
        {
            "story_content": [
                {
                    "story_id": "story-1",
                    "translations": {"yo": {"narrative": "itan Yoruba"}},
                    "audio_by_lang": {"yo": "audio-yo"},
                    "audio_voice_by_lang": {"yo": "idera"},
                }
            ]
        }
    )
    monkeypatch.setattr(story_content_service, "get_supabase_db", lambda: db)

    ok = story_content_service.save_story_content(
        "story-1",
        title="Updated title",
        short_summary="English short",
        narrative="English narrative",
        key_takeaways=["One point"],
    )

    assert ok is True
    row = db.tables["story_content"][0]
    assert row["title"] == "Updated title"
    assert row["translations"]["yo"]["narrative"] == "itan Yoruba"
    assert row["audio_by_lang"]["yo"] == "audio-yo"
    assert row["audio_voice_by_lang"]["yo"] == "idera"


def test_update_story_translations_and_audio_merges_existing_maps(monkeypatch):
    db = DummyDB(
        {
            "story_content": [
                {
                    "story_id": "story-2",
                    "translations": {"yo": {"narrative": "itan Yoruba"}},
                    "audio_by_lang": {"en": "audio-en"},
                    "audio_voice_by_lang": {"en": "emma"},
                }
            ]
        }
    )
    monkeypatch.setattr(story_content_service, "get_supabase_db", lambda: db)

    ok = story_content_service.update_story_translations_and_audio(
        "story-2",
        {"ig": {"narrative": "akuko Igbo"}},
        {"ig": "audio-ig"},
        {"ig": "osagie"},
    )

    assert ok is True
    row = db.tables["story_content"][0]
    assert row["translations"]["yo"]["narrative"] == "itan Yoruba"
    assert row["translations"]["ig"]["narrative"] == "akuko Igbo"
    assert row["audio_by_lang"]["en"] == "audio-en"
    assert row["audio_by_lang"]["ig"] == "audio-ig"
    assert row["audio_voice_by_lang"]["en"] == "emma"
    assert row["audio_voice_by_lang"]["ig"] == "osagie"


@pytest.mark.asyncio
async def test_get_news_detail_persists_missing_requested_translation(monkeypatch):
    async def fake_pool():
        return [
            {
                "id": "story-3",
                "title": "Story title",
                "summary": "Story summary",
                "source": "Source",
                "category": "General",
            }
        ]

    monkeypatch.setattr(news_route, "_get_full_news_pool", fake_pool)
    monkeypatch.setattr(
        news_route,
        "get_story_content",
        lambda _story_id: {
            "story_id": "story-3",
            "short_summary": "English short",
            "narrative": "English narrative",
            "key_takeaways": ["English takeaway"],
            "translations": {},
            "audio_by_lang": {},
            "audio_voice_by_lang": {},
            "sources_used": [],
            "truth_tags": [],
        },
    )

    async def fake_translate_story_fields(story_id, lang, title, narrative, short_summary, key_takeaways):
        assert story_id == "story-3"
        assert lang == "yo"
        assert title == "Story title"
        assert narrative == "English narrative"
        assert short_summary == "English short"
        assert key_takeaways == ["English takeaway"]
        return {
            "title": "Akọle Yoruba",
            "short_summary": "Akotan Yoruba",
            "narrative": "Itan Yoruba",
            "key_takeaways": ["Koko Yoruba"],
        }

    monkeypatch.setattr(news_route, "translate_story_fields", fake_translate_story_fields)

    persisted = []
    monkeypatch.setattr(
        news_route,
        "update_story_translations_and_audio",
        lambda story_id, translations, audio_by_lang, audio_voice_by_lang: persisted.append(
            {
                "story_id": story_id,
                "translations": translations,
                "audio_by_lang": audio_by_lang,
                "audio_voice_by_lang": audio_voice_by_lang,
            }
        )
        or True,
    )

    scheduled = []
    monkeypatch.setattr(
        news_route,
        "schedule_prefill_translations_and_audio",
        lambda *args, **kwargs: scheduled.append((args, kwargs)),
    )

    detail = await news_route.get_news_detail("story-3", language="yo", user_id=None, voice_id=None)

    assert detail["title"] == "Akọle Yoruba"
    assert detail["short_summary"] == "Akotan Yoruba"
    assert detail["narrative"] == "Itan Yoruba"
    assert detail["key_takeaways"] == ["Koko Yoruba"]
    assert persisted == [
        {
            "story_id": "story-3",
            "translations": {
                "yo": {
                    "title": "Akọle Yoruba",
                    "short_summary": "Akotan Yoruba",
                    "narrative": "Itan Yoruba",
                    "key_takeaways": ["Koko Yoruba"],
                }
            },
            "audio_by_lang": {},
            "audio_voice_by_lang": {},
        }
    ]
    assert len(scheduled) == 1


def test_localize_news_list_items_uses_translated_title_and_summary(monkeypatch):
    monkeypatch.setattr(
        news_route,
        "get_story_content_map",
        lambda story_ids: {
            "story-4": {
                "story_id": "story-4",
                "title": "English title",
                "short_summary": "English short",
                "translations": {
                    "yo": {
                        "title": "Akọle Yoruba",
                        "short_summary": "Akotan Yoruba",
                    }
                },
                "trust_score": 91,
                "truth_tags": ["verified"],
                "truth_explanation": "Checked",
            }
        },
    )

    items = [
        {
            "id": "story-4",
            "title": "Feed title",
            "summary": "Feed summary",
            "short_summary": "Feed short",
        }
    ]
    localized = news_route._localize_news_list_items(items, "yo")

    assert localized[0]["title"] == "Akọle Yoruba"
    assert localized[0]["short_summary"] == "Akotan Yoruba"
    assert localized[0]["summary"] == "Akotan Yoruba"
    assert localized[0]["trust_score"] == 91
    assert localized[0]["truth_tags"] == ["verified"]
    assert localized[0]["truth_explanation"] == "Checked"
