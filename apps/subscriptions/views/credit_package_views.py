from django.contrib.auth.decorators import login_required
from django.http import JsonResponse
from django.views.decorators.http import require_POST
import logging

from apps.utils.billing import get_stripe_module
from apps.ads.views import provision_credit_package

logger = logging.getLogger(__name__)

@require_POST
@login_required
def purchase_credit_package_api(request):
    """
    API endpoint to handle credit package purchases using the default payment method.
    Returns JSON response with success status and redirect URL.
    """
    subscription_holder = request.user
    
    # Get the price ID from the request
    price_id = request.POST.get("priceId")
    if not price_id:
        return JsonResponse({"success": False, "error": "No price ID provided"}, status=400)
    
    # Check if the user has a default payment method
    if not hasattr(subscription_holder, 'customer') or not subscription_holder.customer:
        return JsonResponse({"success": False, "error": "No customer record found"}, status=400)
    
    # Get the customer's default payment method
    stripe = get_stripe_module()
    customer = stripe.Customer.retrieve(
        subscription_holder.customer.id,
        expand=['default_source']
    )
    
    # Check if the customer has a default payment method
    default_payment_method_id = None
    
    # First check if there's a default_payment_method (newer Stripe API)
    if hasattr(customer, 'invoice_settings') and customer.invoice_settings.get('default_payment_method'):
        default_payment_method_id = customer.invoice_settings.default_payment_method
    # Then check for default_source (older Stripe API)
    elif customer.default_source:
        default_payment_method_id = customer.default_source
    
    if not default_payment_method_id:
        return JsonResponse({"success": False, "error": "No default payment method found"}, status=400)
    
    try:
        # Get the price details
        price = stripe.Price.retrieve(price_id)
        product = stripe.Product.retrieve(price.product)
        
        # Create a PaymentIntent with the customer's default payment method
        payment_intent = stripe.PaymentIntent.create(
            amount=price.unit_amount,
            currency=price.currency,
            customer=subscription_holder.customer.id,
            payment_method=default_payment_method_id,  # Explicitly specify the payment method
            description=f"Purchase of {product.name}",
            metadata={
                'user_id': subscription_holder.id,
                'price_id': price_id,
                'product_id': price.product,
                'product_name': product.name
            },
            off_session=True,  # Indicates this is a merchant-initiated payment
            confirm=True,      # Confirm the payment immediately
        )
        
        # Check if payment was successful
        if payment_intent.status == 'succeeded':
            # Provision the credit package
            try:
                provision_result = provision_credit_package(
                    request, 
                    user_id=subscription_holder.id, 
                    product=product
                )
                
                # Return success response
                return JsonResponse({
                    "success": True, 
                    "message": f"Successfully purchased {product.name}. Credits have been added to your account.",
                    "redirect_url": "/ads/billing/",
                    "credits_added": provision_result.get('credits_added', 0) if isinstance(provision_result, dict) else 0
                })
                
            except Exception as e:
                logger.error(f"Error provisioning credit package: {str(e)}")
                # Even if provisioning fails, the payment was successful, so we need to handle this case
                return JsonResponse({
                    "success": True, 
                    "message": f"Payment successful, but there was an issue adding credits to your account. Our team has been notified.",
                    "redirect_url": "/ads/billing/",
                    "error_details": str(e)
                })
                
        else:
            # Payment requires additional action or failed
            return JsonResponse({
                "success": False, 
                "error": f"Payment could not be completed. Status: {payment_intent.status}",
                "payment_intent_status": payment_intent.status
            }, status=400)
            
    except Exception as e:
        logger.error(f"Error processing credit package purchase: {str(e)}")
        return JsonResponse({"success": False, "error": str(e)}, status=500)
