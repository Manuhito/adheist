import rest_framework.serializers
from drf_spectacular.types import OpenApiTypes
from drf_spectacular.utils import extend_schema, inline_serializer
from rest_framework.response import Response
from rest_framework.views import APIView

from ..exceptions import SubscriptionConfigError
from ..helpers import create_stripe_checkout_session, create_stripe_portal_session, cancel_subscription
from ..metadata import get_active_products_with_metadata, ProductWithMetadata


@extend_schema(tags=["subscriptions"], exclude=True)
class ProductWithMetadataAPI(APIView):
    @extend_schema(operation_id="active_products_list", responses={200: ProductWithMetadata.serializer()})
    def get(self, request, *args, **kw):
        products_with_metadata = get_active_products_with_metadata()
        return Response(data=[p.to_dict() for p in products_with_metadata])


@extend_schema(tags=["subscriptions"], exclude=True)
class CreateCheckoutSession(APIView):
    @extend_schema(
        operation_id="create_checkout_session",
        request=inline_serializer("CreateCheckout", {"priceid": rest_framework.serializers.CharField()}),
        responses={
            200: OpenApiTypes.URI,
        },
    )
    def post(self, request):
        subscription_holder = request.user
        price_id = request.POST["priceId"]
        checkout_session = create_stripe_checkout_session(
            subscription_holder,
            price_id,
            request.user,
        )
        return Response(checkout_session.url)


@extend_schema(tags=["subscriptions"], exclude=True)
class CreatePortalSession(APIView):
    @extend_schema(
        operation_id="create_portal_session",
        request=None,
        responses={
            200: OpenApiTypes.URI,
        },
    )
    def post(self, request):
        subscription_holder = request.user
        try:
            portal_session = create_stripe_portal_session(subscription_holder)
            return Response(portal_session.url)
        except SubscriptionConfigError as e:
            return Response(str(e), status=500)


@extend_schema(tags=["subscriptions"], exclude=True)
class CancelSubscription(APIView):
    @extend_schema(
        operation_id="cancel_subscription",
        request=inline_serializer("CancelSubscription", {
            "cancel_at_period_end": rest_framework.serializers.BooleanField(default=True)
        }),
        responses={
            200: inline_serializer("CancelSubscriptionResponse", {
                "success": rest_framework.serializers.BooleanField(),
                "message": rest_framework.serializers.CharField(),
            }),
            400: inline_serializer("CancelSubscriptionError", {
                "error": rest_framework.serializers.CharField(),
            }),
        },
    )
    def post(self, request):
        subscription_holder = request.user
        
        # Check if user has an active subscription
        if not subscription_holder.subscription:
            return Response({"error": "No active subscription found."}, status=400)
        
        # Get cancel_at_period_end parameter (default to True)
        cancel_at_period_end = request.data.get("cancel_at_period_end", True)
        
        # Get the subscription ID
        subscription_id = subscription_holder.subscription.id
        
        # Cancel the subscription
        updated_subscription = cancel_subscription(subscription_id, cancel_at_period_end)
        
        if updated_subscription:
            message = "Your subscription has been scheduled for cancellation at the end of the current billing period." \
                if cancel_at_period_end else "Your subscription has been canceled immediately."
            return Response({
                "success": True,
                "message": message,
                "cancel_at_period_end": cancel_at_period_end,
                "current_period_end": updated_subscription.current_period_end.timestamp() if updated_subscription.current_period_end else None
            })
        else:
            return Response({"error": "Failed to cancel subscription. Please try again later."}, status=400)
