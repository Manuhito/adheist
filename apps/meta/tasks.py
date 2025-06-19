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

@shared_task
def create_ad_library_entry(ad_data: dict, media_type: str = "MEME") -> Dict[str, Any]:
    """
    Celery task to create a new AdLibrary entry from Meta Ad data.
    
    Args:
        ad_data: Dictionary containing the ad data from Meta API
        media_type: The media type of the ad (default: MEME)
        
    Returns:
        Dictionary with task execution information
    """
    import logging
    from apps.ads.models import AdLibrary
    from apps.meta.models import FacebookPage
    
    logger = logging.getLogger(__name__)
    logger.info(f"Creating new AdLibrary entry for ad ID: {ad_data.get('id')}")
    
    try:
        # Check if the ad already exists (double check to prevent duplicates)
        meta_ad_id = ad_data.get('id')
        if not meta_ad_id:
            logger.error("Ad data missing ID field")
            return {
                'success': False,
                'error': 'Ad data missing ID field',
                'ad_id': None
            }
            
        if AdLibrary.objects.filter(meta_ad_id=meta_ad_id).exists():
            logger.info(f"Ad with ID {meta_ad_id} already exists, skipping creation")
            return {
                'success': True,
                'message': 'Ad already exists',
                'ad_id': meta_ad_id
            }
            
        # Find the related FacebookPage
        page_id = ad_data.get('page_id')
        if not page_id:
            logger.error(f"Ad data missing page_id field: {ad_data}")
            return {
                'success': False,
                'error': 'Ad data missing page_id field',
                'ad_id': meta_ad_id
            }
            
        try:
            facebook_page = FacebookPage.objects.get(page_id=page_id)
        except FacebookPage.DoesNotExist:
            logger.error(f"FacebookPage with ID {page_id} not found, skipping ad creation")
            return {
                'success': False,
                'error': f'FacebookPage with ID {page_id} not found',
                'ad_id': meta_ad_id
            }
            
        # Create the AdLibrary entry with the mapped fields
        # Note: We don't set the ManyToMany field 'tags' here
        ad_library = AdLibrary(
            facebook_page=facebook_page,
            ad_creative_link_titles=ad_data.get('ad_creative_link_titles', ''),  # Store ad_creative_link_titles in the dedicated field
            ad_image=None,  # Empty for now
            is_fav=False,
            language=ad_data.get('languages', []),
            media_type=media_type,  # From the parameter
            publisher_platform=ad_data.get('publisher_platforms', []),
            meta_ad_id=meta_ad_id,
            ad_creation_time=ad_data.get('ad_creation_time'),
            ad_delivery_start_time=ad_data.get('ad_delivery_start_time'),
            ad_delivery_stop_time=ad_data.get('ad_delivery_stop_time')
        )
        
        # Save the object first (required before setting ManyToMany fields)
        ad_library.save()
        
        logger.info(f"Successfully created AdLibrary entry for ad ID: {meta_ad_id}")
        
        return {
            'success': True,
            'message': 'Ad created successfully',
            'ad_id': meta_ad_id
        }
        
    except Exception as e:
        logger.exception(f"Error creating AdLibrary entry: {str(e)}")
        return {
            'success': False,
            'error': str(e),
            'ad_id': ad_data.get('id')
        }
