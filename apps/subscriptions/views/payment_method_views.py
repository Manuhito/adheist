import json
import logging
from django.contrib.auth.decorators import login_required
from django.http import JsonResponse
from django.views.decorators.csrf import ensure_csrf_cookie
from django.views.decorators.http import require_POST
from django.shortcuts import render

from apps.utils.billing import get_stripe_module, get_stripe_publishable_key

logger = logging.getLogger("adheist.subscription")

@ensure_csrf_cookie
@login_required
def update_payment_method_page(request):
    """
    Render the page for updating payment method.
    """
    return render(request, 'subscriptions/update_payment_method.html', {
        "active_tab": "billing",
    })

@require_POST
@login_required
def create_setup_intent(request):
    """
    Create a Stripe SetupIntent for updating the default payment method.
    
    Returns:
        JSON with the SetupIntent client secret and Stripe publishable key.
    """
    try:
        stripe = get_stripe_module()
        
        # Create a SetupIntent with automatic payment methods detection
        setup_intent = stripe.SetupIntent.create(
            customer=request.user.customer.id,
            automatic_payment_methods={"enabled": True},
            usage='off_session',  # Allow using this payment method for future payments
        )
        
        # Return the client secret and publishable key
        return JsonResponse({
            'clientSecret': setup_intent.client_secret,
            'publishableKey': get_stripe_publishable_key(),
            'customerId': request.user.customer.id,
        })
    except Exception as e:
        logger.error(f"Error creating SetupIntent: {str(e)}")
        return JsonResponse({
            'error': 'Failed to create SetupIntent. Please try again later.'
        }, status=400)

@require_POST
@login_required
def set_default_payment_method(request):
    """
    Set a payment method as the default for a customer.
    
    Expects 'paymentMethodId' in POST data.
    
    Returns:
        JSON with success or error message.
    """
    try:
        payment_method_id = request.POST.get('paymentMethodId')
        
        if not payment_method_id:
            return JsonResponse({
                'error': 'Payment method ID is required.'
            }, status=400)
        
        stripe = get_stripe_module()
        
        # Update the customer's default payment method
        stripe.Customer.modify(
            request.user.customer.id,
            invoice_settings={
                'default_payment_method': payment_method_id,
            }
        )
        
        return JsonResponse({
            'success': True,
            'message': 'Default payment method updated successfully.'
        })
    except Exception as e:
        logger.error(f"Error setting default payment method: {str(e)}")
        return JsonResponse({
            'error': 'Failed to update default payment method. Please try again later.'
        }, status=400)
