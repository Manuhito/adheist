import logging
import time
from datetime import datetime

from django.db import transaction
from django.urls import reverse
from django.utils.translation import gettext_lazy as _
from django.utils import timezone
from djstripe.enums import SubscriptionStatus
from djstripe.models import Subscription, Price, SubscriptionItem
from djstripe.settings import djstripe_settings

from stripe.api_resources.billing_portal.session import Session as BillingPortalSession
from stripe.api_resources.checkout import Session as CheckoutSession
from stripe.error import InvalidRequestError

from .exceptions import SubscriptionConfigError
from apps.users.models import CustomUser
from apps.web.meta import absolute_url
from apps.utils.billing import get_stripe_module

log = logging.getLogger("adheist.subscription")


def subscription_is_active(subscription: Subscription) -> bool:
    return subscription.status in [SubscriptionStatus.active, SubscriptionStatus.trialing, SubscriptionStatus.past_due]


def subscription_is_trialing(subscription: Subscription) -> bool:
    return subscription.status == SubscriptionStatus.trialing and subscription.trial_end > timezone.now()


def get_subscription_urls(subscription_holder):
    # get URLs for subscription helpers
    url_bases = [
        "subscription_details",
        "create_stripe_portal_session",
        "subscription_demo",
        "subscription_gated_page",
        "metered_billing_demo",
        # checkout urls
        "create_checkout_session",
        "checkout_canceled",
        # subscription update urls
        "update_subscription",
    ]

    def _construct_url(base):
        return reverse(f"subscriptions:{base}")

    return {url_base: _construct_url(url_base) for url_base in url_bases}


def create_stripe_checkout_session(
    subscription_holder: CustomUser, stripe_price_id: str, user: CustomUser
) -> CheckoutSession:
    stripe = get_stripe_module()
    success_url = absolute_url(reverse("subscriptions:subscription_confirm"))

    cancel_url = absolute_url(reverse("subscriptions:checkout_canceled"))

    customer_kwargs = {}
    if subscription_holder.customer:
        customer_kwargs["customer"] = subscription_holder.customer.id
    else:
        customer_kwargs["customer_email"] = user.email

    checkout_session = stripe.checkout.Session.create(
        success_url=success_url + "?session_id={CHECKOUT_SESSION_ID}",
        cancel_url=cancel_url,
        payment_method_types=["card"],
        mode="subscription",
        client_reference_id=subscription_holder.id,
        line_items=[
            {
                "price": stripe_price_id,
                "quantity": _get_quantity(stripe_price_id, subscription_holder),
            }
        ],
        allow_promotion_codes=True,
        subscription_data={
            "description": str(subscription_holder),
            "metadata": get_checkout_metadata(user),
        },
        metadata={
            "source": "subscriptions",
        },
        **customer_kwargs,
    )
    return checkout_session


def get_checkout_metadata(user: CustomUser) -> dict:
    return {
        f"{djstripe_settings.SUBSCRIBER_CUSTOMER_KEY}": user.id,
        "user_id": user.id,
        "user_email": user.email,
        "user_name": user.get_full_name(),
    }


def _get_quantity(stripe_price_id, subscription_holder):
    """
    Get quantity for a given Stripe price and subscription holder
    """
    price = Price.objects.get(id=stripe_price_id)
    # if it's metered billing we shouldn't pass a quantity
    if price.recurring.get("usage_type", None) == "metered":
        return None
    # otherwise we pass it from the subscription holder
    return subscription_holder.get_quantity()


def create_stripe_portal_session(subscription_holder: CustomUser) -> BillingPortalSession:
    stripe = get_stripe_module()
    if not subscription_holder.subscription or not subscription_holder.subscription.customer:
        raise SubscriptionConfigError(_("Whoops, we couldn't find a subscription associated with your account!"))

    subscription_urls = get_subscription_urls(subscription_holder)
    portal_session = stripe.billing_portal.Session.create(
        customer=subscription_holder.subscription.customer.id,
        return_url=absolute_url(subscription_urls["subscription_details"]),
    )
    return portal_session


@transaction.atomic
def provision_subscription(subscription_holder: CustomUser, subscription_id: str) -> Subscription:
    stripe = get_stripe_module()
    subscription = stripe.Subscription.retrieve(subscription_id)
    djstripe_subscription = Subscription.sync_from_stripe_data(subscription)
    subscription_holder.subscription = djstripe_subscription
    subscription_holder.save()
    # attach customer if not set
    if not subscription_holder.customer:
        subscription_holder.customer = djstripe_subscription.customer
        subscription_holder.save()
    return djstripe_subscription


def cancel_subscription(subscription_id: str, cancel_at_period_end: bool = True):
    """
    Cancel a subscription, either at the end of the billing period or immediately.
    
    Args:
        subscription_id: The Stripe ID of the subscription to cancel
        cancel_at_period_end: If True, the subscription will remain active until the end of the billing period.
                             If False, the subscription will be canceled immediately.
    
    Returns:
        The updated Subscription object or None if there was an error
    """
    try:
        # First, get the current subscription to preserve important fields
        db_subscription = Subscription.objects.filter(id=subscription_id).first()
        if not db_subscription:
            log.error(f"Subscription with ID {subscription_id} not found in database")
            return None
            
        # Store the current period end before modifying
        current_period_end = db_subscription.current_period_end
        
        stripe = get_stripe_module()
        if cancel_at_period_end:
            # Cancel at the end of the billing period
            subscription = stripe.Subscription.modify(
                subscription_id,
                cancel_at_period_end=True
            )
        else:
            # Cancel immediately
            subscription = stripe.Subscription.delete(subscription_id)
        
        # Sync the updated subscription with the local database
        updated_subscription = Subscription.sync_from_stripe_data(subscription)
        
        # If current_period_end is None after sync, restore the original value
        if updated_subscription and updated_subscription.current_period_end is None and current_period_end is not None:
            updated_subscription.current_period_end = current_period_end
            updated_subscription.save()
            log.info(f"Restored current_period_end for subscription {subscription_id}")
            
        return updated_subscription
    except InvalidRequestError as e:
        if e.code != "resource_missing":
            log.error("Error canceling Stripe subscription: %s", e.user_message)
        return None


def update_subscription(subscription_holder: CustomUser, new_price_id: str) -> Subscription:
    """
    Update an existing subscription to a new price.
    Stripe will automatically calculate prorations based on the remaining time in the billing cycle.
    
    Args:
        subscription_holder: The user whose subscription to update
        new_price_id: The Stripe ID of the new price to apply
        
    Returns:
        The updated Subscription object
        
    Raises:
        SubscriptionConfigError: If the user doesn't have an active subscription
    """
    stripe = get_stripe_module()
    
    # Check if the user has an active subscription
    if not subscription_holder.subscription or not subscription_holder.customer:
        raise SubscriptionConfigError(_("No active subscription found to update."))
    
    subscription_id = subscription_holder.subscription.id
    
    try:
        # Retrieve the full subscription from Stripe first to ensure we have all data
        stripe_subscription = stripe.Subscription.retrieve(subscription_id)
        
        # Get the subscription item to update
        subscription_items = SubscriptionItem.objects.filter(subscription__id=subscription_id)
        if not subscription_items.exists():
            raise SubscriptionConfigError(_("No subscription items found for this subscription."))
        
        if subscription_items.count() > 1:
            log.warning("Subscription has multiple items. Only updating the first one.")
        
        # Get the first subscription item ID from Stripe data to ensure it's correct
        subscription_item_id = stripe_subscription['items']['data'][0]['id']
        
        # Calculate the appropriate quantity
        quantity = _get_quantity(new_price_id, subscription_holder)
        
        # Update the subscription in Stripe with parameters for a new billing period
        updated_subscription = stripe.Subscription.modify(
            subscription_id,
            items=[{
                'id': subscription_item_id,
                'price': new_price_id,
                'quantity': quantity,
            }],
            # Configuración para eliminar el prorrateo y comenzar un nuevo período de facturación
            proration_behavior='none',  # No crear prorrateos
            billing_cycle_anchor='now',  # Comenzar un nuevo período de facturación ahora
            payment_behavior='error_if_incomplete',  # Cobrar inmediatamente y devolver error si falla
            # Expandir los items para obtener información completa
            expand=['items'],
        )
        
        # Ensure required period fields are set
        required_period_fields = ['current_period_start', 'current_period_end']
        for field in required_period_fields:
            if field not in updated_subscription or not updated_subscription[field]:
                # If it's not in the response for some reason, use the original value
                original_value = getattr(subscription_holder.subscription, field, None)
                if original_value:
                    # Convert datetime to timestamp if needed
                    if isinstance(original_value, datetime):
                        timestamp = int(original_value.timestamp())
                        updated_subscription[field] = timestamp
                    else:
                        updated_subscription[field] = original_value
                else:
                    # As a fallback for current_period_start, set it to now
                    if field == 'current_period_start':
                        updated_subscription[field] = int(time.time())
                        log.warning(f"Setting default {field} for subscription {subscription_id}")
                    # As a fallback for current_period_end, set it to 1 month from now
                    elif field == 'current_period_end':
                        updated_subscription[field] = int(time.time()) + (30 * 24 * 60 * 60)  # 30 days
                        log.warning(f"Setting default {field} for subscription {subscription_id}")
        
        # Sync the updated subscription with the local database
        try:
            with transaction.atomic():
                djstripe_subscription = Subscription.sync_from_stripe_data(updated_subscription)
        except Exception as sync_error:
            log.error(f"Error syncing subscription from Stripe: {str(sync_error)}")
            # Try a more direct approach if sync fails
            with transaction.atomic():
                djstripe_subscription = subscription_holder.subscription
                # Update subscription fields manually
                djstripe_subscription.status = updated_subscription['status']
                
                # Handle required period fields
                for field in required_period_fields:
                    if field in updated_subscription and updated_subscription[field]:
                        # Convert timestamp to datetime with timezone
                        timestamp = updated_subscription[field]
                        dt = datetime.fromtimestamp(timestamp)
                        # Make it timezone aware
                        setattr(djstripe_subscription, field, timezone.make_aware(dt))
                
                djstripe_subscription.save()
        
        # Update the subscription on the user
        subscription_holder.subscription = djstripe_subscription
        subscription_holder.save()
        
        return djstripe_subscription
        
    except InvalidRequestError as e:
        log.error(f"Error updating Stripe subscription: {e.user_message}")
        raise SubscriptionConfigError(_(f"Error updating subscription: {e.user_message}"))
    except Exception as e:
        log.error(f"Unexpected error updating subscription: {str(e)}")
        raise SubscriptionConfigError(_(f"Unexpected error updating subscription. Please try again later."))
