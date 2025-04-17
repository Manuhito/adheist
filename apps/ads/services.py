# apps/ads/services.py
from apps.subscriptions.metadata import ACTIVE_PRODUCTS_BY_ID

def get_ad_request_limit(user):
    """Get the AdRequest limit for a user based on their subscription"""
    # Default limit for free users
    default_limit = 1
    
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