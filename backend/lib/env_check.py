# Startup environment validation — surfaces missing config at deploy time.
import os
import logging

logger = logging.getLogger(__name__)

REQUIRED_VARS = [
    "SUPABASE_URL",
    "SUPABASE_SERVICE_KEY",
]

RECOMMENDED_VARS = [
    "GEMINI_API_KEY",
    "YARNGPT_API_KEY",
    "UPSTASH_REDIS_REST_URL",
    "UPSTASH_REDIS_REST_TOKEN",
]

OPTIONAL_VARS = [
    "OPENAI_API_KEY",
    "VAPID_PRIVATE_KEY",
    "QSTASH_SIGNING_KEY",
    "MEDIASTACK_API_KEY",
    "NEWSDATA_API_KEY",
    "GOOGLE_FACT_CHECK_API_KEY",
    "SENTRY_DSN",
]


def check_environment() -> None:
    """Log warnings for missing env vars; raise for truly required ones."""
    missing_required = [v for v in REQUIRED_VARS if not os.environ.get(v)]
    missing_recommended = [v for v in RECOMMENDED_VARS if not os.environ.get(v)]
    missing_optional = [v for v in OPTIONAL_VARS if not os.environ.get(v)]

    if missing_required:
        msg = f"CRITICAL: Missing required environment variables: {', '.join(missing_required)}"
        logger.error(msg)
        raise RuntimeError(msg)

    if missing_recommended:
        logger.warning(
            "Missing recommended environment variables (features degraded): %s",
            ", ".join(missing_recommended),
        )

    if missing_optional:
        logger.info(
            "Missing optional environment variables: %s",
            ", ".join(missing_optional),
        )
