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
    import logging
    logger = logging.getLogger(__name__)
    
    try:
        logger.info(f"Starting blog post import task. config_id={config_id}, max_posts={max_posts}")
        
        # Verificar que existe una página de índice del blog antes de importar
        from apps.blog.models import BlogIndexPage
        blog_index = BlogIndexPage.objects.live().first()
        
        if not blog_index:
            logger.error("No se encontró ninguna página de índice del blog (BlogIndexPage). "
                       "Por favor, crea una desde el admin de Wagtail antes de importar posts.")
            return {
                'success': False,
                'count': 0,
                'message': 'No existe una página de índice del blog. Crea una desde el admin de Wagtail.'
            }
            
        # Import posts
        created_posts = import_posts_from_api(max_posts=max_posts)
        
        # Update last import date if config_id is provided
        if config_id:
            try:
                config = BlogApiConfig.objects.get(pk=config_id)
                config.last_import = timezone.now()
                config.save(update_fields=['last_import'])
                logger.info(f"Updated last_import timestamp for config {config_id}")
            except BlogApiConfig.DoesNotExist:
                logger.warning(f"BlogApiConfig with ID {config_id} not found")
        
        result = {
            'success': True,
            'count': len(created_posts),
            'message': f'Successfully imported {len(created_posts)} posts.'
        }
        logger.info(f"Import task completed: {result}")
        return result
    except Exception as e:
        import traceback
        error_details = traceback.format_exc()
        logger.error(f"Error in import task: {str(e)}\n{error_details}")
        
        return {
            'success': False,
            'count': 0,
            'message': f'Error importing posts: {str(e)}'
        }
