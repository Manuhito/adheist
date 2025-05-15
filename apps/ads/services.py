# apps/ads/services.py
from apps.subscriptions.metadata import ACTIVE_PRODUCTS_BY_ID
from apps.ads.models import AppConfiguration

def get_ad_request_limit(user):
    """Get the AdRequest limit for a user based on their subscription"""
    # Get the default limit from configuration
    default_limit, _ = AppConfiguration.get_limits()
    
    if not user.has_active_subscription():
        return default_limit
    
    # Get product from subscription
    product_id = user.active_stripe_subscription.plan.product.id
    product_meta = ACTIVE_PRODUCTS_BY_ID.get(product_id)
    
    if not product_meta:
        return default_limit
    
    # Get limit from product metadata
    limits = getattr(product_meta, 'limits', {})
    return limits.get('ad_requests_per_month', default_limit)

def can_create_ad_request(user):
    """Check if user can create a new AdRequest"""
    from apps.ads.models import AdRequestUsage
    
    # Get current usage
    usage = AdRequestUsage.get_current_usage(user)
    
    # Get limit based on subscription
    limit = get_ad_request_limit(user)
    
    # Check if user has reached their limit
    return usage.usage_count < limit

def increment_usage(user):
    """Increment usage count for the current billing period"""
    from apps.ads.models import AdRequestUsage
    
    usage = AdRequestUsage.get_current_usage(user)
    usage.usage_count += 1
    usage.save()
    return usage

# Funciones para el control de versiones de AdRequest

def get_ad_request_version_limit(ad_request):
    """
    Get the version limit for an AdRequest based on the owner's subscription.
    
    Args:
        ad_request: The AdRequest instance
        
    Returns:
        int: The maximum number of versions allowed for this AdRequest
    """
    # Get the default limit from configuration
    _, default_limit = AppConfiguration.get_limits()
    
    # Get the user who owns the AdRequest
    user = ad_request.user
    
    if not user.has_active_subscription():
        return default_limit
    
    # Get product from subscription
    product_id = user.active_stripe_subscription.plan.product.id
    product_meta = ACTIVE_PRODUCTS_BY_ID.get(product_id)
    
    if not product_meta:
        return default_limit
    
    # Get limit from product metadata
    limits = getattr(product_meta, 'limits', {})
    return limits.get('versions_per_ad_request', default_limit)

def can_create_ad_request_version(ad_request):
    """
    Check if a new version can be created for the given AdRequest.
    
    Args:
        ad_request: The AdRequest instance
        
    Returns:
        bool: True if a new version can be created, False otherwise
    """
    from apps.ads.models import AdRequestVersion
    
    # Get current number of versions
    current_versions_count = AdRequestVersion.objects.filter(ad_request=ad_request).count()
    
    # Get limit based on subscription
    limit = get_ad_request_version_limit(ad_request)
    
    # Check if AdRequest has reached its version limit
    return current_versions_count < limit