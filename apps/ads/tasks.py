"""
Celery tasks for the Ads app.

This module contains Celery tasks for background processing of website analysis
and screenshot capture during onboarding.
"""

import logging
from typing import Dict, Any

from celery import shared_task

logger = logging.getLogger(__name__)


@shared_task
def capture_screenshot_task(user_id: int, website_url: str) -> Dict[str, Any]:
    """
    Celery task to capture a website screenshot and save it to UserOnboarding.
    Sends SSE notification when complete.
    
    Args:
        user_id: ID of the user
        website_url: URL of the website to screenshot
        
    Returns:
        Dictionary with success status and screenshot data
    """
    from apps.users.models import UserOnboarding
    from django.core.files.base import ContentFile
    from .website_analysis import capture_screenshot_with_playwright
    import base64
    
    logger.info(f"[capture_screenshot_task] Starting for user_id={user_id}, url={website_url}")
    
    try:
        # Ensure URL has scheme
        if not website_url.startswith(("http://", "https://")):
            website_url = "https://" + website_url
        
        # Capture screenshot
        screenshot_base64 = capture_screenshot_with_playwright(website_url)
        logger.info(f"[capture_screenshot_task] Screenshot captured, base64 length={len(screenshot_base64)}")
        
        # Save to UserOnboarding
        onboarding, _ = UserOnboarding.objects.get_or_create(user_id=user_id)
        
        # Decode base64 and save as file
        image_data = base64.b64decode(screenshot_base64)
        filename = f"screenshot_{user_id}_{onboarding.id}.png"
        onboarding.website_screenshot.save(filename, ContentFile(image_data), save=False)
        
        # Also save as asset_image_1 for ad generation
        asset_filename = f"asset_screenshot_{user_id}.png"
        onboarding.asset_image_1.save(asset_filename, ContentFile(image_data), save=False)
        
        onboarding.save(update_fields=["website_screenshot", "asset_image_1"])
        
        logger.info(f"[capture_screenshot_task] Screenshot saved to UserOnboarding for user_id={user_id}")
        
        # Send SSE notification
        _send_screenshot_sse(user_id, screenshot_base64, success=True)
        
        return {
            'success': True,
            'screenshot': f"data:image/png;base64,{screenshot_base64}"
        }
        
    except Exception as e:
        logger.error(f"[capture_screenshot_task] Error for user_id={user_id}: {str(e)}", exc_info=True)
        _send_screenshot_sse(user_id, None, success=False, error=str(e))
        return {
            'success': False,
            'error': str(e)
        }


@shared_task
def analyze_website_task(user_id: int, website_url: str, is_onboarding: bool = False) -> Dict[str, Any]:
    """
    Celery task to analyze a website and extract brand assets.
    Sends SSE notification when complete.
    
    Args:
        user_id: ID of the user
        website_url: URL of the website to analyze
        is_onboarding: If True, saves brand to UserOnboarding
        
    Returns:
        Dictionary with success status and extracted assets
    """
    from django.contrib.auth import get_user_model
    from apps.users.models import UserOnboarding
    from .website_analysis import extract_brand_assets_from_website
    
    User = get_user_model()
    
    logger.info(f"[analyze_website_task] Starting for user_id={user_id}, url={website_url}")
    
    try:
        user = User.objects.get(id=user_id)
        
        # Extract brand assets
        result = extract_brand_assets_from_website(user, website_url, ad_request_id=None)
        
        if result.get('success'):
            logger.info(f"[analyze_website_task] Analysis successful for user_id={user_id}")
            
            # If onboarding, save brand to UserOnboarding
            if is_onboarding and result.get('brand'):
                try:
                    brand_data = result['brand']
                    brand_id = brand_data.get('id') if isinstance(brand_data, dict) else None
                    
                    if brand_id:
                        onboarding, _ = UserOnboarding.objects.get_or_create(user=user)
                        onboarding.brand_id = brand_id
                        onboarding.save()
                        logger.info(f"[analyze_website_task] Saved brand {brand_id} to UserOnboarding")
                        
                except Exception as e:
                    logger.error(f"[analyze_website_task] Error saving brand to UserOnboarding: {str(e)}")
            
            # Send SSE notification
            _send_analysis_sse(
                user_id=user_id,
                success=True,
                extracted_assets=result.get('extracted_assets'),
                brand=result.get('brand'),
                brand_created=result.get('brand_created', False),
                cost=result.get('cost')
            )
            
            return {
                'success': True,
                'extracted_assets': result.get('extracted_assets'),
                'brand_created': result.get('brand_created', False),
                'brand': result.get('brand'),
                'cost': result.get('cost')
            }
        else:
            error_message = result.get('error', 'Unknown error')
            logger.error(f"[analyze_website_task] Analysis failed for user_id={user_id}: {error_message}")
            _send_analysis_sse(user_id=user_id, success=False, error=error_message)
            return {
                'success': False,
                'error': error_message
            }
            
    except Exception as e:
        logger.error(f"[analyze_website_task] Error for user_id={user_id}: {str(e)}", exc_info=True)
        _send_analysis_sse(user_id=user_id, success=False, error=str(e))
        return {
            'success': False,
            'error': str(e)
        }


def _send_screenshot_sse(user_id: int, screenshot_base64: str, success: bool, error: str = None):
    """Send SSE notification when screenshot capture completes."""
    try:
        import redis
        import json
        from django.conf import settings
        from django.utils import timezone
        
        redis_client = redis.from_url(settings.REDIS_URL)
        
        notification_data = {
            'type': 'screenshot_completed',
            'success': success,
            'timestamp': timezone.now().isoformat()
        }
        
        if success and screenshot_base64:
            notification_data['screenshot'] = f"data:image/png;base64,{screenshot_base64}"
        if error:
            notification_data['error'] = error
        
        channel = f"user:{user_id}:adrequest_updates"
        redis_client.publish(channel, json.dumps(notification_data))
        logger.info(f"[_send_screenshot_sse] Sent notification to user {user_id} (success={success})")
    except Exception as e:
        logger.error(f"[_send_screenshot_sse] Error sending SSE: {str(e)}")


def _send_analysis_sse(user_id: int, success: bool, extracted_assets: dict = None, 
                       brand: dict = None, brand_created: bool = False, 
                       cost: dict = None, error: str = None):
    """Send SSE notification when website analysis completes."""
    try:
        import redis
        import json
        from django.conf import settings
        from django.utils import timezone
        
        redis_client = redis.from_url(settings.REDIS_URL)
        
        notification_data = {
            'type': 'analysis_completed',
            'success': success,
            'timestamp': timezone.now().isoformat()
        }
        
        if success:
            notification_data['extracted_assets'] = extracted_assets
            notification_data['brand'] = brand
            notification_data['brand_created'] = brand_created
            notification_data['cost'] = cost
        if error:
            notification_data['error'] = error
        
        channel = f"user:{user_id}:adrequest_updates"
        redis_client.publish(channel, json.dumps(notification_data))
        logger.info(f"[_send_analysis_sse] Sent notification to user {user_id} (success={success})")
    except Exception as e:
        logger.error(f"[_send_analysis_sse] Error sending SSE: {str(e)}")


@shared_task
def update_ad_runtime_scores():
    """
    Update runtime_days and runtime_score for all ads.
    Runs daily at midnight.
    
    Logic:
    1. Update runtime_days for ads with known delivery dates
    2. Calculate company statistics using ALL ads (active + inactive)
    3. Calculate runtime_score for ALL ads based on Z-score
    
    Returns:
        Dictionary with update statistics
    """
    from django.utils import timezone
    from django.db.models import Avg, StdDev, Count
    from apps.ads.models import AdLibrary
    
    logger.info("[update_ad_runtime_scores] Starting task")
    today = timezone.now().date()
    
    # Step 1: Update runtime_days for ads with delivery dates
    # - ACTIVE: today - start
    # - INACTIVE: stop - start (fallback to today - start if stop missing)
    ads_with_delivery_dates = AdLibrary.objects.filter(
        ad_delivery_start_time__isnull=False
    ).only('id', 'meta_status', 'ad_delivery_start_time', 'ad_delivery_stop_time', 'runtime_days')

    updated_runtime = 0
    batch = []
    batch_size = 1000
    for ad in ads_with_delivery_dates.iterator(chunk_size=batch_size):
        if ad.meta_status == AdLibrary.STATUS_INACTIVE and ad.ad_delivery_stop_time:
            new_runtime = (ad.ad_delivery_stop_time - ad.ad_delivery_start_time).days
        else:
            new_runtime = (today - ad.ad_delivery_start_time).days

        if ad.runtime_days != new_runtime:
            ad.runtime_days = new_runtime
            batch.append(ad)
            updated_runtime += 1

        if len(batch) >= batch_size:
            AdLibrary.objects.bulk_update(batch, ['runtime_days'], batch_size=batch_size)
            batch = []

    if batch:
        AdLibrary.objects.bulk_update(batch, ['runtime_days'], batch_size=batch_size)

    logger.info(f"[update_ad_runtime_scores] Updated runtime_days for {updated_runtime} ads")
    
    # Step 2 & 3: Calculate Z-scores and runtime_score by company
    # Include ALL ads (active + inactive) for statistics
    all_ads = AdLibrary.objects.filter(
        ad_delivery_start_time__isnull=False,
        runtime_days__isnull=False
    )
    
    companies = all_ads.values_list('facebook_page_id', flat=True).distinct()
    total_scored = 0
    
    for company_id in companies:
        # Get ALL ads from this company (active + inactive)
        company_ads = all_ads.filter(facebook_page_id=company_id)
        
        # Calculate μ_company and σ_company
        stats = company_ads.aggregate(
            mean=Avg('runtime_days'),
            stddev=StdDev('runtime_days'),
            count=Count('id')
        )
        
        # Need at least 2 ads to calculate standard deviation
        if not stats['stddev'] or stats['stddev'] == 0 or stats['count'] < 2:
            # Without sufficient variation, all ads get median score
            for ad in company_ads:
                ad.runtime_score = 50
            AdLibrary.objects.bulk_update(company_ads, ['runtime_score'], batch_size=500)
            continue
        
        # Calculate Z-score and runtime_score for each ad
        for ad in company_ads:
            # Z_i = (R_i − μ_company) / σ_company
            z_score = (ad.runtime_days - stats['mean']) / stats['stddev']
            
            # Convert Z-score to 5-100 scale
            # Z <= 0 → score = 5-50 (below average)
            # Z > 0 → score = 50-100 (above average)
            if z_score <= 0:
                runtime_score = max(5, int(50 + (z_score * 15)))  # From 5 to 50
            else:
                runtime_score = min(100, int(50 + (z_score * 16.67)))  # From 50 to 100
            
            ad.runtime_score = runtime_score
        
        AdLibrary.objects.bulk_update(company_ads, ['runtime_score'], batch_size=500)
        total_scored += company_ads.count()
    
    logger.info(f"[update_ad_runtime_scores] Calculated runtime_score for {total_scored} ads across {len(companies)} companies")
    
    return {
        'updated_runtime': updated_runtime,
        'total_scored': total_scored,
        'companies': len(companies)
    }
