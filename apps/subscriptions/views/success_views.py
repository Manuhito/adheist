from django.contrib.auth.decorators import login_required
from django.shortcuts import render
from django.conf import settings
from apps.utils.billing import get_stripe_module


@login_required
def payment_success(request):
    """
    Handle successful Stripe Elements payment.
    This page is shown after a successful payment with Stripe Elements.
    """
    # Get payment intent ID from query parameters
    payment_intent_id = request.GET.get('payment_intent')
    payment_intent_client_secret = request.GET.get('payment_intent_client_secret')
    
    # If payment intent ID is provided, retrieve payment intent and provision subscription
    if payment_intent_id and payment_intent_client_secret:
        try:
            # Get Stripe instance
            stripe = get_stripe_module()
            
            # Retrieve payment intent
            payment_intent = stripe.PaymentIntent.retrieve(payment_intent_id)
            
            # Check if payment intent is successful
            if payment_intent.status == 'succeeded':
                # Get price ID from payment intent metadata
                price_id = payment_intent.metadata.get('price_id')
                
                if price_id:
                    # Create subscription for the user
                    from apps.subscriptions.helpers import provision_subscription
                    
                    # Create subscription using the payment method from the payment intent
                    subscription = stripe.Subscription.create(
                        customer=request.user.customer.id,
                        items=[{'price': price_id}],
                        default_payment_method=payment_intent.payment_method,
                        expand=['latest_invoice.payment_intent'],
                    )
                    
                    # Provision subscription
                    provision_subscription(request.user, subscription.id)
        except Exception as e:
            # Log the error
            print(f"Error provisioning subscription: {str(e)}")
    
    return render(request, 'subscriptions/success.html')
