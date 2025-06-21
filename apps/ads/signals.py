from django.db.models.signals import post_save, post_delete, pre_save
from django.dispatch import receiver
from django.core.cache import cache
import json
import redis
from django.conf import settings

from .models import AdLibrary, IndustryList, TagList, AdRequest

# Initialize Redis connection
redis_client = redis.from_url(settings.REDIS_URL)

@receiver([post_save, post_delete], sender=AdLibrary)
def invalidate_adlibrary_cache(sender, instance, **kwargs):
    """
    Signal handler to invalidate the AdLibrary company names cache
    when an AdLibrary instance is created, updated, or deleted.
    """
    # Delete the cache key to force regeneration on next request
    cache.delete('adlibrary_page_names')


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


@receiver(pre_save, sender=AdRequest)
def track_adrequest_status_changes(sender, instance, **kwargs):
    """
    Signal handler to track AdRequest status changes and publish notifications to Redis.
    This runs before the model is saved, so we can compare with the previous state.
    """
    # Only run this for existing instances (not new ones)
    if instance.pk:
        try:
            # Get the previous state of the instance from the database
            previous = AdRequest.objects.get(pk=instance.pk)
            
            # Check if the status has changed
            if previous.status != instance.status:
                # Status mapping for display
                status_mapping = {
                    'NEW': 'Draft',
                    'DRAFT': 'Draft',
                    'FILLED': 'Draft',
                    'SUBMITTED': 'Generating...',
                    'COMPLETED': 'Done',
                    'REOPENED': 'Generating...'
                }
                
                # Prepare notification data
                notification_data = {
                    'type': 'status_change',
                    'ad_request_id': instance.pk,
                    'previous_status': previous.status,
                    'new_status': instance.status,
                    'display_status': status_mapping.get(instance.status, instance.status),
                    'timestamp': instance.updated_at.isoformat() if instance.updated_at else None,
                    # Include additional data needed for UI updates
                    'ad_library_name': instance.ad_library.facebook_page.page_name if instance.ad_library else None,
                    'canvas_size': instance.canvas_size,
                }
                
                # Get tags and industries if ad_library exists
                if instance.ad_library:
                    notification_data['tags'] = [tag.name for tag in instance.ad_library.tags.all()]
                    notification_data['industries'] = [industry.name for industry in instance.ad_library.industries.all()]
                else:
                    notification_data['tags'] = []
                    notification_data['industries'] = []
                
                # Publish to a user-specific channel
                channel = f"user:{instance.user.id}:adrequest_updates"
                redis_client.publish(channel, json.dumps(notification_data))
                
                # If status changed to COMPLETED, send a special notification
                if instance.status == 'COMPLETED':
                    completion_notification = {
                        'type': 'completion',
                        'ad_request_id': instance.pk,
                        'message': 'Your ad request has been completed!',
                        'timestamp': instance.updated_at.isoformat() if instance.updated_at else None,
                    }
                    redis_client.publish(channel, json.dumps(completion_notification))
        except AdRequest.DoesNotExist:
            # This is a new instance, no previous state to compare
            pass
