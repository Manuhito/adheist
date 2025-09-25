# apps/ads/services.py
from apps.subscriptions.metadata import ACTIVE_PRODUCTS_BY_ID
from apps.ads.models import AppConfiguration

def get_ad_request_limit(user):
    """Get the general credits limit for a user based on their subscription"""
    # Get all limits from configuration
    limits = AppConfiguration.get_limits()
    default_limit = limits['default']['general_credits']
    
    if not user.has_active_subscription():
        return default_limit
    
    # Get product from subscription
    product_id = user.active_stripe_subscription.plan.product.id
    product_meta = ACTIVE_PRODUCTS_BY_ID.get(product_id)
    
    if not product_meta:
        return default_limit
    
    # Get plan type (slug) and return corresponding limit
    plan_type = product_meta.slug
    if plan_type in limits:
        return limits[plan_type]['general_credits']
    
    return default_limit

def can_create_ad_request(user):
    """Check if user can create a new AdRequest (uses general_credits)"""
    from apps.ads.models import AdRequestUsage, ExtraCredit
    
    # Get current usage record
    usage = AdRequestUsage.get_current_usage(user)
    
    # First check if user has remaining general credits
    if usage.general_credits > 0:
        return True
    
    # If no regular credits, check for extra credits
    extra_credits = ExtraCredit.get_or_create(user)
    return extra_credits.general_credits > 0

def can_create_ad_version(user):
    """Check if user can create a new version of an existing AdRequest (uses version_credits)"""
    from apps.ads.models import AdRequestUsage, ExtraCredit
    
    # Get current usage record
    usage = AdRequestUsage.get_current_usage(user)
    
    # First check if user has remaining version credits
    if usage.version_credits > 0:
        return True
    
    # If no regular credits, check for extra credits
    extra_credits = ExtraCredit.get_or_create(user)
    return extra_credits.version_credits > 0

def use_general_credit(user):
    """Use one general credit from the user's available credits"""
    from apps.ads.models import AdRequestUsage, ExtraCredit
    
    usage = AdRequestUsage.get_current_usage(user)
    
    # First try to use regular general credits
    if usage.general_credits > 0:
        usage.general_credits -= 1
        usage.save()
        return usage
    
    # If no regular credits, try to use extra credits
    if ExtraCredit.use_general_credit(user):
        # Return the usage object for consistency, even though we used an extra credit
        return usage
    
    # No credits available
    return usage

def use_version_credit(user):
    """Use one version credit from the user's available credits"""
    from apps.ads.models import AdRequestUsage, ExtraCredit
    
    usage = AdRequestUsage.get_current_usage(user)
    
    # First try to use regular version credits
    if usage.version_credits > 0:
        usage.version_credits -= 1
        usage.save()
        return usage
    
    # If no regular credits, try to use extra credits
    if ExtraCredit.use_version_credit(user):
        # Return the usage object for consistency, even though we used an extra credit
        return usage
    
    # No credits available
    return usage

# Mantener la función original para compatibilidad con código existente
# pero ahora usa general_credits internamente
def use_credit(user):
    """Use one credit from the user's available credits (uses general_credits for backward compatibility)"""
    return use_general_credit(user)

# Funciones para el control de versiones de AdRequest

# Utility function to get user's total version credits (regular + extra)
def get_user_version_credits(user):
    """
    Get the available version credits for a user (regular + extra credits).
    
    Args:
        user: The User instance
        
    Returns:
        int: The total available version credits for the user
    """
    from apps.ads.models import AdRequestUsage, ExtraCredit
    
    # Get current usage record for regular credits
    usage = AdRequestUsage.get_current_usage(user)
    regular_credits = usage.version_credits
    
    # Get extra credits
    extra_credits = ExtraCredit.get_or_create(user)
    extra_version_credits = extra_credits.version_credits
    
    # Return the sum of regular and extra credits
    total_credits = regular_credits + extra_version_credits
    
    return total_credits

# Backward compatibility functions (deprecated - use can_create_ad_version directly)
def get_ad_request_version_limit(ad_request):
    """DEPRECATED: Use get_user_version_credits(user) instead"""
    return get_user_version_credits(ad_request.user)

def can_create_ad_request_version(ad_request):
    """DEPRECATED: Use can_create_ad_version(user) directly instead"""
    return can_create_ad_version(ad_request.user)