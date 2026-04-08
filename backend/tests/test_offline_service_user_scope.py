import os
import sys

import pytest

sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

from services.offline_service import get_stats, save_article


def test_save_article_requires_user_id():
    with pytest.raises(ValueError):
        save_article({"story_id": "story-1", "title": "Test"}, user_id=None)


def test_get_stats_requires_user_id():
    with pytest.raises(ValueError):
        get_stats(user_id="")
