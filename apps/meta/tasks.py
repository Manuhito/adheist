"""
Celery tasks for the Meta app.

This module contains Celery tasks for interacting with the Meta API in the background.
"""

import logging
from typing import Dict, List, Any, Optional

from celery import shared_task
from django.core.management import call_command

from apps.meta.models import Backload

logger = logging.getLogger(__name__)


@shared_task
def fetch_meta_ads(
    token: str = None,
    output_dir: str = "meta_ads_results",
    active_only: bool = False,
    page_ids: List[str] = None,
    delay: int = 2,
    ad_reached_countries: List[str] = None,
    content_languages: List[str] = None,
    media_types: List[str] = None,
    fields: str = None,
    limit: int = None,
    backload_id: int = None
) -> Dict[str, Any]:
    """
    Celery task to fetch ads from Meta Ad Library API.
    
    This task executes the fetch_meta_ads management command in the background.
    
    Args:
        token: Access token for the Meta API
        output_dir: Directory to save the JSON result files
        active_only: Query only pages marked as active
        page_ids: Specific page IDs to query
        delay: Seconds to wait between batch queries
        ad_reached_countries: List of country codes where ads are shown
        content_languages: List of content language codes
        media_types: Media types to include in the search
        fields: Fields to include in the response
        limit: Maximum number of ads per page in the response
        backload_id: ID of the Backload object to update with error logs
    
    Returns:
        Dictionary with task execution information
    """
    logger.info(f"Starting fetch_meta_ads task with backload_id={backload_id}")
    
    # Update Backload status to PROCESSING if it exists
    if backload_id:
        try:
            backload = Backload.objects.get(id=backload_id)
            backload.status = Backload.STATUS_PENDING
            backload.save()
            logger.info(f"Updated Backload {backload_id} status to PENDING")
        except Backload.DoesNotExist:
            logger.error(f"Backload with ID {backload_id} not found")
    
    # Prepare command arguments
    command_kwargs = {
        'output_dir': output_dir,
        'active_only': active_only,
        'delay': delay,
    }
    
    # Add optional arguments if provided
    if token:
        command_kwargs['token'] = token
    if page_ids:
        command_kwargs['page_ids'] = page_ids
    if ad_reached_countries:
        command_kwargs['ad_reached_countries'] = ad_reached_countries
    if content_languages:
        command_kwargs['content_languages'] = content_languages
    if media_types:
        command_kwargs['media_types'] = media_types
    if fields:
        command_kwargs['fields'] = fields
    if limit:
        command_kwargs['limit'] = limit
    if backload_id:
        command_kwargs['backload_id'] = backload_id
    
    try:
        # Execute the management command
        error_messages = call_command('fetch_meta_ads', **command_kwargs)
        
        # Convertir el resultado a lista si es una cadena de texto
        errors_list = []
        if error_messages and isinstance(error_messages, str):
            errors_list = error_messages.split('\n')
            errors_list = [e for e in errors_list if e.strip()]  # Eliminar líneas vacías
        
        result = {
            'success': not errors_list,  # Éxito si no hay errores
            'backload_id': backload_id,
            'errors': errors_list
        }
        
        logger.info(f"fetch_meta_ads task completed successfully")
        return result
        
    except Exception as e:
        logger.exception(f"Error executing fetch_meta_ads command: {str(e)}")
        
        # Update Backload status to FAILED if it exists and wasn't updated by the command
        if backload_id:
            try:
                backload = Backload.objects.get(id=backload_id)
                if backload.status != Backload.STATUS_SUCCESS:
                    backload.status = Backload.STATUS_FAILED
                    backload.error_log = f"Error executing fetch_meta_ads command: {str(e)}"
                    backload.save()
                    logger.info(f"Updated Backload {backload_id} status to FAILED")
            except Exception as be:
                logger.error(f"Error updating Backload {backload_id}: {str(be)}")
        
        result = {
            'success': False,
            'backload_id': backload_id,
            'errors': [str(e)]
        }
        
        return result
