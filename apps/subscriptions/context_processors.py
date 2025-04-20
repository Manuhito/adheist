from django.conf import settings

def stripe_context(request):
    """
    Context processor that adds Stripe-related variables to all templates.
    """
    # Always use test key in development to avoid HTTPS requirements
    # In production, use the appropriate key based on settings
    is_development = settings.DEBUG
    
    # Always use test key in development
    stripe_public_key = settings.STRIPE_TEST_PUBLIC_KEY
    if settings.STRIPE_LIVE_MODE and not is_development:
        stripe_public_key = settings.STRIPE_LIVE_PUBLIC_KEY
        
    return {
        'stripe_public_key': stripe_public_key,
        'stripe_mode': 'test' if is_development or not settings.STRIPE_LIVE_MODE else 'live'
    }
