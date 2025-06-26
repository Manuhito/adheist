"""
Celery tasks for the Meta app.

This module contains Celery tasks for interacting with the Meta API in the background.
"""

import logging
from typing import Dict, List, Any, Optional

from celery import shared_task
from django.core.management import call_command
from playwright.sync_api import sync_playwright, TimeoutError as PlaywrightTimeoutError

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
