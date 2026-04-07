"""Regression: aggregator Redis key constants must exist (avoid NameError at runtime)."""


def test_aggregator_redis_constants_defined():
    from services import aggregator_service as agg

    assert getattr(agg, "AGGREDIS_MS", None) == "narvo:agg:mediastack"
    assert getattr(agg, "AGGREDIS_ND", None) == "narvo:agg:newsdata"
    assert getattr(agg, "AGGREDIS_TS", None) == "narvo:agg:last_fetched"
    assert getattr(agg, "CACHE_TTL", None) == 600
