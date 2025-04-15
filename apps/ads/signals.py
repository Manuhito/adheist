from django.db.models.signals import post_save, post_delete
from django.dispatch import receiver
from django.core.cache import cache

from .models import AdLibrary, IndustryList, TagList


@receiver([post_save, post_delete], sender=AdLibrary)
def invalidate_adlibrary_cache(sender, instance, **kwargs):
    """
    Signal handler to invalidate the AdLibrary company names cache
    when an AdLibrary instance is created, updated, or deleted.
    """
    # Delete the cache key to force regeneration on next request
    cache.delete('adlibrary_company_names')


@receiver([post_save, post_delete], sender=IndustryList)
def invalidate_industry_cache(sender, instance, **kwargs):
    """
    Signal handler to invalidate the industry names cache
    when an IndustryList instance is created, updated, or deleted.
    """
    # Delete the cache key to force regeneration on next request
    cache.delete('industry_name_list')


@receiver([post_save, post_delete], sender=TagList)
def invalidate_tag_cache(sender, instance, **kwargs):
    """
    Signal handler to invalidate the tag names cache
    when a TagList instance is created, updated, or deleted.
    """
    # Delete the cache key to force regeneration on next request
    cache.delete('tag_name_list')
