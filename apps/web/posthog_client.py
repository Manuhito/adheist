"""
PostHog client initialization and utility functions.
"""
import logging
from django.conf import settings
import posthog

logger = logging.getLogger(__name__)

def init_posthog():
    """
    Initialize PostHog client with settings from Django settings.
    """
    if settings.POSTHOG_ENABLED:
        try:
            posthog.api_key = settings.POSTHOG_API_KEY
            posthog.host = settings.POSTHOG_HOST
            logger.info("PostHog client initialized successfully")
        except Exception as e:
            logger.error(f"Failed to initialize PostHog client: {e}")
    else:
        logger.info("PostHog is disabled (no API key provided)")

# Initialize PostHog when this module is imported
init_posthog()
