from django.apps import AppConfig


class WebConfig(AppConfig):
    default_auto_field = 'django.db.models.AutoField'
    name = 'apps.web'
    verbose_name = 'Web'

    def ready(self):
        """
        Initialize services when Django starts.
        """
        # Import and initialize PostHog client
        from apps.web.posthog_client import init_posthog
        init_posthog()
