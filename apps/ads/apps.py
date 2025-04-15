from django.apps import AppConfig


class adsConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "apps.ads"
    label = "ads"
    
    def ready(self):
        # Import signals to register signal handlers
        import apps.ads.signals
