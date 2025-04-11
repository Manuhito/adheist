from django.db.models.signals import post_save, post_delete
from django.dispatch import receiver
from django.core.cache import cache

from .models import AdLibrary


@receiver([post_save, post_delete], sender=AdLibrary)
def invalidate_adlibrary_cache(sender, instance, **kwargs):
    """
    Signal handler to invalidate the AdLibrary company names cache
    when an AdLibrary instance is created, updated, or deleted.
    """
    # Delete the cache key to force regeneration on next request
    cache.delete('adlibrary_company_names')
