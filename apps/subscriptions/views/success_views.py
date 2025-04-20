from django.contrib.auth.decorators import login_required
from django.shortcuts import render
from django.conf import settings
from apps.utils.billing import get_stripe_module


from django.contrib import messages
from django.conf import settings

@login_required
def payment_success(request):
    """
    Handle successful Stripe Elements payment.
    This page is shown after a successful payment with Stripe Elements.
    """
    # Check for development mode simulation
    dev_mode = request.GET.get('dev_mode') == 'true'
    price_id = request.GET.get('price_id')
    
    if dev_mode and settings.DEBUG:
        try:
            # Get Stripe instance
            stripe = get_stripe_module()
            
            # In development mode, create a subscription directly
            from apps.subscriptions.helpers import provision_subscription
            
            # Create a customer if the user doesn't have one
            if not hasattr(request.user, 'customer') or not request.user.customer:
                customer = stripe.Customer.create(
                    email=request.user.email,
                    name=request.user.get_full_name() or request.user.email,
                    metadata={'user_id': request.user.id}
                )
                # Save customer ID to user
                from djstripe.models import Customer
                Customer.sync_from_stripe_data(customer)
            
            # Create subscription directly (development mode)
            if price_id:
                subscription = stripe.Subscription.create(
                    customer=request.user.customer.id,
                    items=[{'price': price_id}],
                    expand=['latest_invoice.payment_intent'],
                )
                
                # Provision subscription
                provision_subscription(request.user, subscription.id)
                
                messages.success(request, "Development mode: Subscription created successfully!")
            else:
                messages.warning(request, "Development mode: No price ID provided.")
                
        except Exception as e:
            # Log the error
            print(f"Error in development mode subscription: {str(e)}")
            messages.error(request, f"Development mode error: {str(e)}")
    
    # Normal Stripe payment flow
    else:
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
                        messages.success(request, "Subscription created successfully!")
            except Exception as e:
                # Log the error
                print(f"Error provisioning subscription: {str(e)}")
                messages.error(request, f"Error: {str(e)}")
    
    return render(request, 'subscriptions/success.html')
