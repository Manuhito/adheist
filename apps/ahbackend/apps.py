from django.apps import AppConfig


class AhbackendConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "apps.ahbackend"
    label = "ahbackend"
    
    def ready(self):
        # Import signals to register signal handlers
        import apps.ahbackend.signals
