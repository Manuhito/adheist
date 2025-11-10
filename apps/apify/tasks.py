"""
Celery tasks for the Apify app.

This module contains Celery tasks for interacting with the Apify API in the background.
"""

import logging
from typing import Dict, List, Any, Optional

from celery import shared_task
from django.core.management import call_command
from playwright.sync_api import sync_playwright, TimeoutError as PlaywrightTimeoutError
from apify_client import ApifyClient

from apps.apify.models import Backload
from apps.aiinterface.tasks import send_slack_notification

logger = logging.getLogger(__name__)


def process_apify_dataset(dataset_id: str, client: ApifyClient, backload_id: int = None, page_id: str = None, is_automated: bool = False) -> dict:
    """
    Procesa los items de un dataset de Apify y crea entradas en AdLibrary para cada anuncio.
    
    Args:
        dataset_id: ID del dataset de Apify a procesar
        client: Cliente de Apify inicializado
        backload_id: ID del Backload asociado a esta ejecución
        page_id: ID de la página de Facebook asociada a esta tarea
        is_automated: Si True, extrae datos adicionales para completar FacebookPage
        
    Returns:
        Diccionario con estadísticas de procesamiento
    """
    from apps.apify.models import Backload
    
    # Get the Backload object if provided to extract media_type and content_languages
    media_type = "MEME"  # Default value
    content_languages = ["en"]  # Default value
    
    if backload_id:
        try:
            backload = Backload.objects.get(id=backload_id)
            media_type = backload.media_types
            if backload.content_languages:
                content_languages = [backload.content_languages]
        except Backload.DoesNotExist:
            logger.warning(f"Backload with ID {backload_id} not found, using default values")
    
    # Fetch items from the dataset
    items = []
    for item in client.dataset(dataset_id).iterate_items():
        items.append(item)
    
    logger.info(f"Retrieved {len(items)} items from Apify dataset {dataset_id}")
    
    # Process the items and save them to AdLibrary model
    processed_count = 0
    failed_count = 0
    skipped_count = 0
    errors = []
    
    from apps.ads.models import AdLibrary, IndustryList
    from apps.apify.models import FacebookPage

    # Variables para extracción de datos adicionales en modo automatizado
    facebook_page = None
    page_name_updated = False
    page_url_updated = False
    industries_updated = False
    
    if page_id and is_automated:
        try:
            facebook_page = FacebookPage.objects.get(page_id=page_id)
            # Marcar como automatizado
            if "[AUTOMATED]" not in facebook_page.notes:
                facebook_page.notes = "[AUTOMATED]" + ("\n" + facebook_page.notes if facebook_page.notes else "")
                facebook_page.save(update_fields=['notes'])
        except FacebookPage.DoesNotExist:
            logger.warning(f"FacebookPage with page_id {page_id} not found")

    # Obtener la lista de meta_ad_id únicos de AdLibrary asociados al FacebookPage
    existing_ad_ids = []
    if page_id:
        # Consultar los meta_ad_id únicos para la página de Facebook específica
        existing_ad_ids = list(AdLibrary.objects.filter(
            facebook_page__page_id=page_id,
            meta_ad_id__isnull=False
        ).values_list('meta_ad_id', flat=True).distinct())
        
        logger.info(f"Found {len(existing_ad_ids)} existing ads for FacebookPage ID {page_id}")
        
        # Extraer los meta_ad_id de los items actuales
        current_ad_ids = []
        for item in items:
            meta_ad_id = item.get('ad_archive_id')
            if meta_ad_id:
                current_ad_ids.append(meta_ad_id)
        
        # Identificar anuncios que ya no están activos (existentes pero no en la lista actual)
        inactive_ad_ids = [ad_id for ad_id in existing_ad_ids if ad_id not in current_ad_ids]
        
        # Marcar como inactivos los anuncios que ya no aparecen en el dataset
        if inactive_ad_ids:
            inactive_count = AdLibrary.objects.filter(
                facebook_page__page_id=page_id,
                meta_ad_id__in=inactive_ad_ids,
                meta_status=AdLibrary.STATUS_ACTIVE
            ).update(meta_status=AdLibrary.STATUS_INACTIVE)
            
            logger.info(f"Marked {inactive_count} ads as inactive for FacebookPage ID {page_id}")
    else:
        logger.warning("No page_id provided, skipping existing ads lookup")
    
    for item in items:
        try:
            # Extraer datos adicionales para FacebookPage si es automatizado
            if page_id and is_automated and facebook_page:
                # 1. Extraer page_name (solo una vez)
                if not page_name_updated and item.get('page_name'):
                    facebook_page.page_name = item.get('page_name')
                    facebook_page.save(update_fields=['page_name'])
                    page_name_updated = True
                    logger.info(f"Updated FacebookPage.page_name to: {item.get('page_name')}")
                
                # 2. Extraer industries desde page_categories (solo si no es UNKNOWN)
                if not industries_updated and item.get('page_categories'):
                    categories = item.get('page_categories', [])
                    if categories and categories != ['UNKNOWN']:
                        for category_name in categories:
                            if category_name != 'UNKNOWN':
                                # Buscar o crear la industria
                                industry, created = IndustryList.objects.get_or_create(
                                    name=category_name
                                )
                                facebook_page.industries.add(industry)
                                if created:
                                    logger.info(f"Created new industry: {category_name}")
                        industries_updated = True
                        logger.info(f"Updated FacebookPage.industries with: {categories}")
                
                # 3. Extraer page_url desde caption
                if not page_url_updated and item.get('caption'):
                    caption = item.get('caption', '')
                    # Buscar URL en el caption
                    import re
                    url_pattern = r'https?://[^\s]+'
                    urls_found = re.findall(url_pattern, caption)
                    if urls_found:
                        # Tomar la primera URL encontrada
                        facebook_page.page_url = urls_found[0]
                        facebook_page.save(update_fields=['page_url'])
                        page_url_updated = True
                        logger.info(f"Updated FacebookPage.page_url to: {urls_found[0]}")
            
            # Skip if this ad has already been processed
            meta_ad_id = item.get('ad_archive_id')
            if not meta_ad_id:
                logger.warning(f"Item without ad_archive_id, skipping: {item}")
                skipped_count += 1
                continue
                
            if AdLibrary.objects.filter(meta_ad_id=meta_ad_id).exists():
                logger.info(f"Ad with ID {meta_ad_id} already exists, skipping creation")
                skipped_count += 1
                continue
            
            # Check if this is an item with cards (multiple ads)
            if item.get('snapshot') and item['snapshot'].get('cards'):
                logger.info(f"Processing item with cards: {meta_ad_id}")
                result = create_adlibrary_from_cards(item, media_type, content_languages)
                processed_count += result['processed_count']
                failed_count += result['failed_count']
                errors.extend(result['errors'])
                continue
            
            # Process as a regular single ad item
            else:
                logger.info(f"Processing item: {meta_ad_id}")
                result = create_adlibrary_from_single_ad(item, media_type, content_languages)
                processed_count += result['processed_count']
                failed_count += result['failed_count']
                errors.extend(result['errors'])
            
            # Note: Since create_ad_library_entry is a Celery task,
            # we're not waiting for the result here. Each task will run
            # independently and handle its own success/failure.
            processed_count += 1
            
        except Exception as e:
            error_msg = f"Error processing item {item.get('id', 'unknown')}: {str(e)}"
            logger.error(error_msg)
            errors.append(error_msg)
            failed_count += 1
    
    return {
        'item_count': len(items),
        'processed_count': processed_count,
        'failed_count': failed_count,
        'skipped_count': skipped_count,
        'errors': errors
    }


def create_adlibrary_from_single_ad(item: dict, media_type: str, content_languages: list) -> Dict[str, Any]:
    """
    Create an AdLibrary entry from a single ad item without cards.
    
    Args:
        item: Diccionario con datos del anuncio de Apify sin cards
        media_type: Tipo de medio del anuncio
        content_languages: Lista de idiomas del contenido
        
    Returns:
        Diccionario con estadísticas de procesamiento
    """
    from datetime import datetime
    from apps.ads.models import AdLibrary
    from apps.apify.models import FacebookPage
    from django.core.files import File
    import os
    import tempfile
    import requests
    
    processed_count = 0
    failed_count = 0
    errors = []
    
    # Extract data from the item
    meta_ad_id = item.get('ad_archive_id')
    page_id = item.get('page_id')
    start_date = item.get('start_date')
    end_date = item.get('end_date')
    currency = item.get('currency', '')
    publisher_platform = item.get('publisher_platform', [])
    is_active = item.get('is_active')
    
    # Convert Unix timestamps to datetime objects if present
    ad_creation_time = None
    ad_delivery_start_time = None
    ad_delivery_stop_time = None
    
    if start_date:
        try:
            ad_creation_time = datetime.fromtimestamp(start_date).date()
            ad_delivery_start_time = ad_creation_time
        except (ValueError, TypeError):
            logger.warning(f"Invalid start_date format: {start_date}")
    
    if end_date:
        try:
            ad_delivery_stop_time = datetime.fromtimestamp(end_date).date()
        except (ValueError, TypeError):
            logger.warning(f"Invalid end_date format: {end_date}")
    
    # Find the related FacebookPage
    try:
        facebook_page = FacebookPage.objects.get(page_id=page_id)
    except FacebookPage.DoesNotExist:
        error_msg = f"FacebookPage with ID {page_id} not found, skipping ad creation"
        logger.error(error_msg)
        return {
            'processed_count': 0,
            'failed_count': 1,
            'errors': [error_msg]
        }
    
    # Determine meta_status based on is_active
    meta_status = AdLibrary.STATUS_ACTIVE if is_active else AdLibrary.STATUS_INACTIVE
    
    try:
        # Get the snapshot data
        snapshot = item.get('snapshot', {})
        
        # Get image URL from the first image in the snapshot
        image_url = None
        images = snapshot.get('images', [])
        if images and len(images) > 0:
            image_url = images[0].get('original_image_url')
        
        image_temp_file = None
        
        if image_url:
            try:
                # Create a temporary file to store the image
                image_temp_file = tempfile.NamedTemporaryFile(delete=False, suffix='.jpg')
                
                # Download the image
                response = requests.get(image_url, stream=True, timeout=30)
                response.raise_for_status()
                
                # Write the image to the temporary file
                for chunk in response.iter_content(chunk_size=8192):
                    image_temp_file.write(chunk)
                
                image_temp_file.flush()
                image_temp_file.close()
                
                # Reopen the file in read mode
                image_temp_file = open(image_temp_file.name, 'rb')
            except Exception as e:
                logger.error(f"Error downloading image from {image_url}: {str(e)}")
                if image_temp_file and hasattr(image_temp_file, 'name'):
                    try:
                        os.unlink(image_temp_file.name)
                    except:
                        pass
                image_temp_file = None
        
        # Extract text content from snapshot
        body_text = ''
        if snapshot.get('body') and isinstance(snapshot.get('body'), dict):
            body_text = snapshot.get('body', {}).get('text', '')
        
        # Create the AdLibrary entry
        ad_library = AdLibrary(
            facebook_page=facebook_page,
            ad_creative_link_titles=snapshot.get('title', ''),
            is_fav=False,
            is_active=True,
            language=content_languages,
            media_type=media_type,
            publisher_platform=publisher_platform,
            meta_ad_id=meta_ad_id,
            ad_creation_time=ad_creation_time,
            ad_delivery_start_time=ad_delivery_start_time,
            ad_delivery_stop_time=ad_delivery_stop_time,
            meta_status=meta_status,
            ad_creative_bodies=body_text,
            ad_creative_link_captions=snapshot.get('caption', ''),
            ad_creative_link_descriptions=snapshot.get('link_description', ''),
            age_country_gender_reach_breakdown={},
            beneficiary_payers={},
            br_total_reach='',
            bylines='',
            currency=currency
        )
        
        # Save the image if available
        if image_temp_file:
            # Generate a filename for the image
            filename = f"ad_{meta_ad_id}_{datetime.now().strftime('%Y%m%d%H%M%S')}.jpg"
            
            # Save the image to the ad_image field
            ad_library.ad_image.save(filename, File(image_temp_file))
            
            # Close and delete the temporary file
            image_temp_file.close()
            try:
                os.unlink(image_temp_file.name)
            except:
                pass
        
        # Save the object
        ad_library.save()
        
        processed_count += 1
        logger.info(f"Successfully created AdLibrary entry for ad ID {meta_ad_id}")
        
    except Exception as e:
        error_msg = f"Error processing ad ID {meta_ad_id}: {str(e)}"
        logger.error(error_msg)
        errors.append(error_msg)
        failed_count += 1
    
    return {
        'processed_count': processed_count,
        'failed_count': failed_count,
        'errors': errors
    }


def create_adlibrary_from_cards(item: dict, media_type: str, content_languages: List[str]) -> dict:
    """
    Crea entradas de AdLibrary a partir de un item que contiene múltiples cards.
    
    Args:
        item: Diccionario con datos del anuncio de Apify que contiene cards
        media_type: Tipo de medio del anuncio
        content_languages: Lista de idiomas del contenido
        
    Returns:
        Diccionario con estadísticas de procesamiento
    """
    from datetime import datetime
    from apps.ads.models import AdLibrary
    from apps.apify.models import FacebookPage
    from django.core.files import File
    import os
    import tempfile
    import requests
    
    processed_count = 0
    failed_count = 0
    errors = []
    
    # Extract common data from the parent item
    meta_ad_id = item.get('ad_archive_id')
    page_id = item.get('page_id')
    start_date = item.get('start_date')
    end_date = item.get('end_date')
    currency = item.get('currency', '')
    publisher_platform = item.get('publisher_platform', [])
    is_active = item.get('is_active', True)
    
    # Convert Unix timestamps to datetime objects if present
    ad_creation_time = None
    ad_delivery_start_time = None
    ad_delivery_stop_time = None
    
    if start_date:
        try:
            ad_creation_time = datetime.fromtimestamp(start_date).date()
            ad_delivery_start_time = ad_creation_time
        except (ValueError, TypeError):
            logger.warning(f"Invalid start_date format: {start_date}")
    
    if end_date:
        try:
            ad_delivery_stop_time = datetime.fromtimestamp(end_date).date()
        except (ValueError, TypeError):
            logger.warning(f"Invalid end_date format: {end_date}")
    
    # Find the related FacebookPage
    try:
        facebook_page = FacebookPage.objects.get(page_id=page_id)
    except FacebookPage.DoesNotExist:
        error_msg = f"FacebookPage with ID {page_id} not found, skipping ad creation"
        logger.error(error_msg)
        return {
            'processed_count': 0,
            'failed_count': 1,
            'errors': [error_msg]
        }
    
    # Determine meta_status based on is_active
    meta_status = AdLibrary.STATUS_ACTIVE if is_active else AdLibrary.STATUS_INACTIVE
    
    # Process each card in the item
    cards = item['snapshot'].get('cards', [])
    for index, card in enumerate(cards):
        try:
            
            # Download the image from the card
            image_url = card.get('original_image_url')
            image_temp_file = None
            
            if image_url:
                try:
                    # Create a temporary file to store the image
                    image_temp_file = tempfile.NamedTemporaryFile(delete=False, suffix='.jpg')
                    
                    # Download the image
                    response = requests.get(image_url, stream=True, timeout=30)
                    response.raise_for_status()
                    
                    # Write the image to the temporary file
                    for chunk in response.iter_content(chunk_size=8192):
                        image_temp_file.write(chunk)
                    
                    image_temp_file.flush()
                    image_temp_file.close()
                    
                    # Reopen the file in read mode
                    image_temp_file = open(image_temp_file.name, 'rb')
                except Exception as e:
                    logger.error(f"Error downloading image from {image_url}: {str(e)}")
                    if image_temp_file and hasattr(image_temp_file, 'name'):
                        try:
                            os.unlink(image_temp_file.name)
                        except:
                            pass
                    image_temp_file = None
            
            # Skip if no image was found
            if not image_temp_file:
                logger.warning(f"No image found for card {index} in ad ID {meta_ad_id}, skipping creation")
                failed_count += 1
                continue
            
            # Create the AdLibrary entry
            ad_library = AdLibrary(
                facebook_page=facebook_page,
                ad_creative_link_titles=card.get('link_url', ''),
                is_fav=False,
                is_active=True,
                language=content_languages,
                media_type=media_type,
                publisher_platform=publisher_platform,
                meta_ad_id=meta_ad_id,
                ad_creation_time=ad_creation_time,
                ad_delivery_start_time=ad_delivery_start_time,
                ad_delivery_stop_time=ad_delivery_stop_time,
                meta_status=meta_status,
                ad_creative_bodies=card.get('body', ''),
                ad_creative_link_captions=card.get('caption', ''),
                ad_creative_link_descriptions=card.get('link_description', ''),
                age_country_gender_reach_breakdown={},
                beneficiary_payers={},
                br_total_reach='',
                bylines='',
                currency=currency
            )
            
            # Generate a filename for the image
            filename = f"ad_{meta_ad_id}_{datetime.now().strftime('%Y%m%d%H%M%S')}.jpg"
            
            # Save the image to the ad_image field
            ad_library.ad_image.save(filename, File(image_temp_file))
            
            # Save the object
            ad_library.save()
            
            # Close and delete the temporary file
            image_temp_file.close()
            try:
                os.unlink(image_temp_file.name)
            except:
                pass
            
            processed_count += 1
            logger.info(f"Successfully created AdLibrary entry for card {index} in ad ID {meta_ad_id}")
            
        except Exception as e:
            error_msg = f"Error processing card {index} in ad ID {meta_ad_id}: {str(e)}"
            logger.error(error_msg)
            errors.append(error_msg)
            failed_count += 1
    
    return {
        'processed_count': processed_count,
        'failed_count': failed_count,
        'errors': errors
    }


@shared_task
def fetch_apify_ads(
    output_dir: str = "apify_ads_results",
    urls: List[Dict[str, str]] = None,
    period: str = "",
    actor_id: str = "XtaWFhbtfxyzqrFmd",
    page_id: str = None,
    backload_id: int = None,
    is_automated: bool = False
) -> Dict[str, Any]:
    """
    Celery task to fetch ads from Apify API.
    
    This task calls the Apify API directly to fetch Facebook ads data.
    
    Args:
        output_dir: Directory to save the JSON result files
        urls: List of dictionaries with URLs to scrape (e.g. [{'url': 'https://www.facebook.com/ads/library/...'}])
        period: Time period for ads (empty string for all time)
        actor_id: ID of the Apify actor to run
        page_id: ID de la página de Facebook asociada a esta tarea
        backload_id: ID of the Backload object to update with error logs
        is_automated: Si True, extrae datos adicionales para completar FacebookPage
    
    Returns:
        Dictionary with task execution information
    """
    logger.info(f"Starting fetch_apify_ads task with backload_id={backload_id}")
    
    # Update Backload status to PROCESSING if it exists
    backload = None
    if backload_id:
        try:
            backload = Backload.objects.get(id=backload_id)
            backload.status = Backload.STATUS_PENDING
            backload.save()
            logger.info(f"Updated Backload {backload_id} status to PENDING")
        except Backload.DoesNotExist:
            logger.warning(f"Backload with ID {backload_id} not found, continuing without Backload updates")
            # Continue execution without a Backload object
            backload_id = None
    
    # API key should be stored in settings or environment variables
    # For now, we'll use a placeholder that should be replaced in production
    api_key = "apify_api_fz8hiOfkgiMWMSdOQC7iqSq0fdoeOU07N0iZ"  # Replace with actual API key from settings
    
    # Default URLs if none provided
    if not urls:
        urls = [
            {"url": "https://www.facebook.com/ads/library/?active_status=active&ad_type=all&country=ALL&is_targeted_country=false&media_type=image_and_meme&search_type=page&view_all_page_id=2281559212068421"}
        ]
    
    try:
        # Initialize the ApifyClient with API token
        client = ApifyClient(api_key)
        
        # Prepare the Actor input with fixed value for scrapePageAds.activeStatus
        run_input = {
            "urls": urls,
            "scrapePageAds.activeStatus": "all",  # Fixed value as per API requirements
            "period": period,
        }
        
        logger.info(f"Calling Apify actor {actor_id} with input: {run_input}")
        
        # Run the Actor and wait for it to finish
        run = client.actor(actor_id).call(run_input=run_input)
        
        if not run:
            error_message = "Failed to start Apify actor run"
            logger.error(error_message)
            
            # Send Slack notification
            context = {
                "backload_id": backload_id,
                "actor_id": actor_id,
                "urls": str(urls)[:200] if urls else None
            }
            send_slack_notification(
                error_message=error_message,
                context=context,
                title="Failed to Start Apify Actor"
            )
            
            # Update Backload status to FAILED
            if backload_id:
                try:
                    backload = Backload.objects.get(id=backload_id)
                    backload.status = Backload.STATUS_FAILED
                    backload.error_log = error_message
                    backload.save()
                except Exception as be:
                    logger.error(f"Error updating Backload {backload_id}: {str(be)}")
            
            return {
                'success': False,
                'backload_id': backload_id,
                'errors': [error_message]
            }
        
        # Get the dataset ID from the run
        dataset_id = run.get("defaultDatasetId")
        if not dataset_id:
            error_message = "No dataset ID returned from Apify run"
            logger.error(error_message)
            
            # Send Slack notification
            context = {
                "backload_id": backload_id,
                "run_id": run.get('id') if run else None,
                "actor_id": actor_id
            }
            send_slack_notification(
                error_message=error_message,
                context=context,
                title="No Dataset ID from Apify Run"
            )
            
            # Update Backload status to FAILED
            if backload_id:
                try:
                    backload = Backload.objects.get(id=backload_id)
                    backload.status = Backload.STATUS_FAILED
                    backload.error_log = error_message
                    backload.save()
                except Exception as be:
                    logger.error(f"Error updating Backload {backload_id}: {str(be)}")
            
            return {
                'success': False,
                'backload_id': backload_id,
                'errors': [error_message]
            }
        
        # Fetch and process items from the dataset
        processing_result = process_apify_dataset(dataset_id, client, backload_id, page_id, is_automated)
        
        # Update Backload status to SUCCESS
        if backload_id:
            try:
                backload = Backload.objects.get(id=backload_id)
                backload.status = Backload.STATUS_SUCCESS
                # Guardar información de procesamiento en el error_log para referencia
                backload.error_log = f"Procesados: {processing_result['processed_count']}, Fallidos: {processing_result['failed_count']}, Omitidos: {processing_result['skipped_count']}"
                backload.save()
                logger.info(f"Updated Backload {backload_id} status to SUCCESS")
            except Exception as be:
                logger.error(f"Error updating Backload {backload_id}: {str(be)}")
        
        result = {
            'success': True,
            'backload_id': backload_id,
            'dataset_id': dataset_id,
            'item_count': processing_result['item_count'],
            'processed_count': processing_result['processed_count'],
            'failed_count': processing_result['failed_count'],
            'skipped_count': processing_result['skipped_count'],
            'errors': processing_result['errors'][:10] if processing_result['errors'] else []  # Incluir solo los primeros 10 errores para evitar respuestas demasiado grandes
        }
        
        logger.info(f"fetch_apify_ads task completed successfully")
        return result
        
    except Exception as e:
        logger.exception(f"Error executing Apify API call: {str(e)}")
        
        # Send Slack notification
        context = {
            "backload_id": backload_id,
            "page_id": page_id,
            "actor_id": actor_id,
            "urls": str(urls)[:200] if urls else None,
            "period": period
        }
        send_slack_notification(
            error_message=str(e),
            context=context,
            title="Error in Apify Ads Extraction Task"
        )
        
        # Update Backload status to FAILED if it exists
        if backload_id:
            try:
                backload = Backload.objects.get(id=backload_id)
                if backload.status != Backload.STATUS_SUCCESS:
                    backload.status = Backload.STATUS_FAILED
                    backload.error_log = f"Error executing Apify API call: {str(e)}"
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
    from apps.apify.models import FacebookPage
    from django.core.files import File
    
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
        
        # Extract image URL from ad snapshot page
        snapshot_url = ad_data.get('ad_snapshot_url')
        if not snapshot_url:
            logger.error(f"Ad data missing ad_snapshot_url field: {ad_data}")
            return {
                'success': False,
                'error': 'Ad data missing ad_snapshot_url field',
                'ad_id': meta_ad_id
            }
        
        # Extract and download image using Playwright
        image_temp_file = extract_image_from_ad_page(snapshot_url, logger)
        
        # Only create AdLibrary entry if image was successfully retrieved
        if not image_temp_file:
            logger.warning(f"No image found for ad ID {meta_ad_id}, skipping creation")
            return {
                'success': False,
                'error': 'No image found for ad',
                'ad_id': meta_ad_id
            }
            
        # Determine meta_status based on ad_delivery_stop_time
        # If ad_delivery_stop_time exists and has a value, the ad is INACTIVE, otherwise it's ACTIVE
        ad_delivery_stop_time = ad_data.get('ad_delivery_stop_time')
        # Ensure meta_status always has a value, defaulting to ACTIVE if the logic fails
        meta_status = AdLibrary.STATUS_INACTIVE if ad_delivery_stop_time else AdLibrary.STATUS_ACTIVE
        if not meta_status:  # Extra safety check
            meta_status = AdLibrary.STATUS_ACTIVE
        
        # Create the AdLibrary entry with the mapped fields
        ad_library = AdLibrary(
            facebook_page=facebook_page,
            ad_creative_link_titles=ad_data.get('ad_creative_link_titles', ''),
            is_fav=False,
            language=ad_data.get('languages', []),
            media_type=media_type,
            publisher_platform=ad_data.get('publisher_platforms', []),
            meta_ad_id=meta_ad_id,
            ad_creation_time=ad_data.get('ad_creation_time'),
            ad_delivery_start_time=ad_data.get('ad_delivery_start_time'),
            ad_delivery_stop_time=ad_delivery_stop_time,
            # New fields from Meta API
            ad_creative_bodies=ad_data.get('ad_creative_bodies'),
            ad_creative_link_captions=ad_data.get('ad_creative_link_captions'),
            ad_creative_link_descriptions=ad_data.get('ad_creative_link_descriptions'),
            age_country_gender_reach_breakdown=ad_data.get('age_country_gender_reach_breakdown'),
            beneficiary_payers=ad_data.get('beneficiary_payers'),
            br_total_reach=ad_data.get('br_total_reach'),
            bylines=ad_data.get('bylines'),
            currency=ad_data.get('currency'),
            delivery_by_region=ad_data.get('delivery_by_region'),
            demographic_distribution=ad_data.get('demographic_distribution'),
            estimated_audience_size=ad_data.get('estimated_audience_size'),
            eu_total_reach=ad_data.get('eu_total_reach'),
            impressions=ad_data.get('impressions'),
            spend=ad_data.get('spend'),
            target_ages=ad_data.get('target_ages'),
            target_gender=ad_data.get('target_gender'),
            target_locations=ad_data.get('target_locations'),
            # Set meta_status based on ad_delivery_stop_time
            meta_status=meta_status
        )
        
        # Generate a filename for the image
        import os
        from datetime import datetime
        filename = f"ad_{meta_ad_id}_{datetime.now().strftime('%Y%m%d%H%M%S')}.jpg"
        
        # Save the image to the ad_image field
        ad_library.ad_image.save(filename, File(image_temp_file))
        
        # Save the object
        ad_library.save()
        
        # Close the temporary file
        image_temp_file.close()
        
        logger.info(f"Successfully created AdLibrary entry with image for ad ID: {meta_ad_id}")
        
        return {
            'success': True,
            'message': 'Ad created successfully with image',
            'ad_id': meta_ad_id
        }
        
    except Exception as e:
        logger.exception(f"Error creating AdLibrary entry: {str(e)}")
        
        # Send Slack notification
        context = {
            "ad_id": ad_data.get('id'),
            "page_id": ad_data.get('page_id'),
            "media_type": media_type,
            "has_snapshot_url": bool(ad_data.get('snapshot_url'))
        }
        send_slack_notification(
            error_message=str(e),
            context=context,
            title="Error Creating AdLibrary Entry"
        )
        
        return {
            'success': False,
            'error': str(e),
            'ad_id': ad_data.get('id')
        }

def extract_image_from_ad_page(snapshot_url: str, logger) -> Optional[str]:
    """
    Extracts the URL of the main image from an ad page using Playwright,
    then downloads the image and returns a file path for saving to ImageField
    
    Args:
        snapshot_url: URL of the Meta ad snapshot page
        logger: Logger instance for logging messages
        
    Returns:
        Path to downloaded image or None if not found/downloaded
    """
    try:
        # Skip if URL is invalid
        if not snapshot_url or 'facebook.com' not in snapshot_url:
            logger.error(f"Invalid snapshot URL: {snapshot_url}")
            return None
        
        # Debug URL (hiding token for security)
        debug_url = snapshot_url
        if 'access_token=' in debug_url:
            token_part = debug_url.split('access_token=')[1]
            if '&' in token_part:
                token_part = token_part.split('&')[0]
            masked_token = token_part[:5] + '...' + token_part[-5:] if len(token_part) > 10 else '...'
            debug_url = debug_url.replace(token_part, masked_token)
        logger.info(f"Accessing URL with Playwright: {debug_url}")
        
        # Initialize Playwright
        with sync_playwright() as playwright:
            # Launch browser with optimized options
            browser = playwright.chromium.launch(
                headless=True,
                args=[
                    '--disable-gpu',
                    '--disable-dev-shm-usage',
                    '--disable-setuid-sandbox',
                    '--no-sandbox',
                    '--disable-extensions',
                ]
            )
            
            try:
                # Create a new page
                page = browser.new_page()
                
                try:
                    # Navigate to the URL with appropriate timeout
                    page.goto(snapshot_url, timeout=30000)
                    
                    # Wait for content to load
                    page.wait_for_load_state('networkidle', timeout=10000)
                    
                    # Strategy 1: Look for Facebook images (scontent or fbcdn)
                    image_urls = page.evaluate("""() => {
                        const images = Array.from(document.querySelectorAll('img'));
                        return images
                            .filter(img => img.src && (img.src.includes('scontent') || img.src.includes('fbcdn')))
                            .map(img => img.src);
                    }""")
                    
                    if image_urls and len(image_urls) > 0:
                        # Sort by length (longer URLs often have more info/quality)
                        image_urls.sort(key=len, reverse=True)
                        
                        # Remove duplicates while maintaining order
                        unique_urls = []
                        for url in image_urls:
                            if url not in unique_urls:
                                unique_urls.append(url)
                        
                        if unique_urls:
                            best_image_url = unique_urls[0]
                            logger.info(f"Image found for {debug_url}: {best_image_url[:50]}...")
                            
                            # Download the image
                            return download_image(best_image_url, logger)
                    
                    # Strategy 2: Look for any image that's not an icon/logo
                    fallback_image_urls = page.evaluate("""() => {
                        const images = Array.from(document.querySelectorAll('img'));
                        return images
                            .filter(img => {
                                if (!img.src) return false;
                                const src = img.src.toLowerCase();
                                // Exclude SVGs, icons and logos
                                if (src.endsWith('.svg') || src.endsWith('.ico')) return false;
                                if (src.includes('icon') || src.includes('logo')) return false;
                                // Exclude very small images
                                if (img.width < 50 || img.height < 50) return false;
                                return true;
                            })
                            .map(img => img.src);
                    }""")
                    
                    if fallback_image_urls and len(fallback_image_urls) > 0:
                        best_fallback = fallback_image_urls[0]
                        logger.info(f"Fallback image found for {debug_url}: {best_fallback[:50]}...")
                        
                        # Download the fallback image
                        return download_image(best_fallback, logger)
                    
                    logger.warning(f"No image found for {debug_url}")
                    return None
                    
                except PlaywrightTimeoutError as e:
                    logger.error(f"Timeout loading {debug_url}: {e}")
                    return None
                except Exception as e:
                    logger.error(f"Error processing {debug_url}: {e}")
                    return None
                finally:
                    # Close the page to free resources
                    page.close()
            finally:
                # Close the browser
                browser.close()
                
    except Exception as e:
        logger.error(f"General error extracting image from {snapshot_url}: {e}")
        return None

def download_image(image_url: str, logger) -> Optional[str]:
    """
    Downloads an image from a URL and saves it to a temporary file
    
    Args:
        image_url: URL of the image to download
        logger: Logger instance for logging messages
        
    Returns:
        Path to the downloaded image or None if download failed
    """
    import requests
    import tempfile
    import os
    from django.core.files import File
    from django.core.files.temp import NamedTemporaryFile
    
    try:
        # Create a temporary file with the correct extension
        img_temp = NamedTemporaryFile(delete=True)
        
        # Download the image
        response = requests.get(image_url, stream=True)
        if response.status_code != 200:
            logger.error(f"Failed to download image from {image_url}: HTTP {response.status_code}")
            return None
        
        # Write the image to the temporary file
        for block in response.iter_content(1024 * 8):
            if not block:
                break
            img_temp.write(block)
        
        # Reset file pointer to beginning of file
        img_temp.flush()
        img_temp.seek(0)
        
        # Get the filename from the URL or generate a unique name
        if '?' in image_url:
            url_path = image_url.split('?')[0]
        else:
            url_path = image_url
            
        filename = os.path.basename(url_path)
        if not filename or '.' not in filename:
            # Generate a filename with .jpg extension if none exists
            filename = f"ad_image_{tempfile.NamedTemporaryFile().name.split('/')[-1]}.jpg"
        
        logger.info(f"Image downloaded successfully: {filename}")
        
        # Return the temporary file
        return img_temp
        
    except Exception as e:
        logger.error(f"Error downloading image from {image_url}: {e}")
        return None


@shared_task
def run_backload_queries(backload_ids):
    """
    Celery task to run queries on one or more Backload objects.
    
    This task executes the run_backload_queries management command for the given Backload IDs.
    It can be scheduled through Django Celery Beat admin interface.
    
    Args:
        backload_ids: List of Backload IDs to run queries on
        
    Returns:
        Dictionary with task execution information
    """
    from django.core.management import call_command
    
    logger.info(f"Running backload queries for IDs: {backload_ids}")
    
    try:
        # Convert to list if it's a single ID
        if not isinstance(backload_ids, list):
            backload_ids = [backload_ids]
            
        # Execute the management command
        call_command('run_backload_queries', *[str(id) for id in backload_ids])
        
        return {
            'status': 'success',
            'message': f"Successfully ran queries for Backload IDs: {backload_ids}"
        }
    except Exception as e:
        error_msg = f"Error running backload queries: {str(e)}"
        logger.error(error_msg)
        return {
            'status': 'error',
            'message': error_msg
        }
