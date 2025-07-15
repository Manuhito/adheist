"""
Django app configuration for the scraper app.
"""
from django.apps import AppConfig


class ScraperConfig(AppConfig):
    """Configuration for the scraper app."""
    
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'apps.scraper'
    
    def ready(self):
        """
        Initialize app when Django starts.
        
        This method is called when the app is ready.
        """
        pass
