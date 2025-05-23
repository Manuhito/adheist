from django.contrib import messages
from django.contrib.auth.decorators import login_required
from django.http import HttpResponseRedirect, JsonResponse
from django.template.response import TemplateResponse
from django.views.decorators.http import require_POST

from apps.subscriptions.helpers import (
    create_stripe_checkout_session,
    get_subscription_urls,
    provision_subscription,
    update_subscription,
)
from apps.subscriptions.exceptions import SubscriptionConfigError
from apps.subscriptions.wrappers import SubscriptionWrapper
from apps.utils.billing import get_stripe_module


@require_POST
@login_required
def create_checkout_session(request):
    subscription_holder = request.user
    price_id = request.POST["priceId"]
    checkout_session = create_stripe_checkout_session(subscription_holder, price_id, request.user)
    return HttpResponseRedirect(checkout_session.url)


@login_required
def subscription_confirm(request):
    session_id = request.GET.get("session_id")
    if not session_id:
        messages.error(
            request,
            "Couldn't find a Stripe session for your payment. If you think this is an error, please get in touch.",
        )
        return TemplateResponse(request, "400.html", status=400)

    session = get_stripe_module().checkout.Session.retrieve(session_id)
    payment_status = session["payment_status"]
    if payment_status != "paid":
        messages.error(
            request,
            "Sorry, it looks like your payment didn't go through. If you think this is an error, please get in touch.",
        )
        return TemplateResponse(request, "400.html", status=400)
    assert int(session.client_reference_id) == request.user.id
    subscription_holder = request.user
    if not subscription_holder.subscription or subscription_holder.subscription.id != session.subscription:
        # provision subscription
        djstripe_subscription = provision_subscription(subscription_holder, session.subscription)
    else:
        # already provisioned (likely by webhook)
        djstripe_subscription = subscription_holder.subscription

    subscription_name = SubscriptionWrapper(djstripe_subscription).display_name
    messages.success(request, f"You've successfully signed up for {subscription_name}. Thanks for the support!")
    return HttpResponseRedirect(get_subscription_urls(subscription_holder)["subscription_details"])


@login_required
def checkout_canceled(request):
    subscription_holder = request.user
    messages.info(request, "Your upgrade was canceled.")
    return HttpResponseRedirect(get_subscription_urls(subscription_holder)["subscription_details"])


@require_POST
@login_required
def update_subscription_view(request):
    """
    View to handle subscription updates.
    Updates an existing subscription to a new price plan.
    """
    subscription_holder = request.user
    
    # Get the new price ID from the request
    new_price_id = request.POST.get("priceId")
    if not new_price_id:
        messages.error(request, "No price ID provided for subscription update.")
        return HttpResponseRedirect(get_subscription_urls(subscription_holder)["subscription_details"])
    
    try:
        # Update the subscription
        djstripe_subscription = update_subscription(subscription_holder, new_price_id)
        
        # Get the subscription name for the success message
        subscription_name = SubscriptionWrapper(djstripe_subscription).display_name
        
        # Add a success message
        messages.success(
            request, 
            f"Your subscription has been updated to {subscription_name}. "
            "The price adjustment will be reflected in your next invoice."
        )
        
    except SubscriptionConfigError as e:
        # Handle subscription configuration errors
        messages.error(request, str(e))
    except Exception as e:
        # Handle unexpected errors
        messages.error(request, f"An unexpected error occurred: {str(e)}")
    
    # Redirect back to the subscription details page
    return HttpResponseRedirect(get_subscription_urls(subscription_holder)["subscription_details"])


@require_POST
@login_required
def update_subscription_api(request):
    """
    API endpoint to handle subscription updates.
    Returns JSON response instead of redirecting.
    """
    subscription_holder = request.user
    
    # Get the new price ID from the request
    new_price_id = request.POST.get("priceId")
    if not new_price_id:
        return JsonResponse({"success": False, "error": "No price ID provided"}, status=400)
    
    try:
        # Update the subscription
        djstripe_subscription = update_subscription(subscription_holder, new_price_id)
        
        # Get the subscription name for the response
        subscription_name = SubscriptionWrapper(djstripe_subscription).display_name
        
        # Return success response
        return JsonResponse({
            "success": True, 
            "message": f"Your subscription has been updated to {subscription_name}",
            "redirect_url": "/ads/billing/"
        })
        
    except SubscriptionConfigError as e:
        # Handle subscription configuration errors
        return JsonResponse({"success": False, "error": str(e)}, status=400)
    except Exception as e:
        # Handle unexpected errors
        return JsonResponse({"success": False, "error": f"An unexpected error occurred: {str(e)}"}, status=500)
