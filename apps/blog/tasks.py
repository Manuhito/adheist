"""
Celery tasks for the blog app.
"""
from celery import shared_task
from django.utils import timezone

from .models import BlogApiConfig
from .api_utils import import_posts_from_api


@shared_task
def import_blog_posts_task(config_id=None, max_posts=None):
    """
    Celery task to import blog posts from the external API.
    
    Args:
        config_id: ID of the BlogApiConfig to update after import
        max_posts: Maximum number of posts to import (None for all)
        
    Returns:
        Dict with results information
    """
    try:
        # Import posts
        created_posts = import_posts_from_api(max_posts=max_posts)
        
        # Update last import date if config_id is provided
        if config_id:
            try:
                config = BlogApiConfig.objects.get(pk=config_id)
                config.last_import = timezone.now()
                config.save(update_fields=['last_import'])
            except BlogApiConfig.DoesNotExist:
                pass
        
        return {
            'success': True,
            'count': len(created_posts),
            'message': f'Successfully imported {len(created_posts)} posts.'
        }
    except Exception as e:
        return {
            'success': False,
            'count': 0,
            'message': f'Error importing posts: {str(e)}'
        }
