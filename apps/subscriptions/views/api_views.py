import rest_framework.serializers
from drf_spectacular.types import OpenApiTypes
from drf_spectacular.utils import extend_schema, inline_serializer
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from django.http import JsonResponse
import json

from ..exceptions import SubscriptionConfigError
from ..helpers import create_stripe_checkout_session, create_stripe_portal_session
from ..metadata import get_active_products_with_metadata, ProductWithMetadata, PlanInterval
from apps.utils.billing import get_stripe_module


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
class CreatePaymentIntent(APIView):
    @extend_schema(
        operation_id="create_payment_intent",
        request=inline_serializer(
            "CreatePaymentIntent", 
            {
                "priceId": rest_framework.serializers.CharField(),
                "frequency": rest_framework.serializers.CharField(),
            }
        ),
        responses={
            200: inline_serializer(
                "PaymentIntentResponse", 
                {"clientSecret": rest_framework.serializers.CharField()}
            ),
        },
    )
    def post(self, request):
        """Create a payment intent for Stripe Elements"""
        try:
            # Use request.data instead of request.body
            # DRF will handle parsing the JSON for us
            price_id = request.data.get('priceId')
            frequency = request.data.get('frequency')
            
            if not price_id:
                return JsonResponse({"error": "Price ID is required"}, status=400)
                
            # Get the subscription holder (user)
            subscription_holder = request.user
            
            # Get Stripe instance
            stripe = get_stripe_module()
            
            try:
                # Retrieve the price from Stripe
                price = stripe.Price.retrieve(price_id)
                amount = price.unit_amount
                currency = price.currency
            except Exception as price_error:
                # Log the error
                print(f"Error retrieving price: {str(price_error)}")
                # Use default values if price retrieval fails
                amount = 1000
                currency = "usd"
            
            # Create a payment intent
            payment_intent = stripe.PaymentIntent.create(
                amount=amount,
                currency=currency,
                automatic_payment_methods={"enabled": True},
                metadata={
                    "price_id": price_id,
                    "user_id": str(subscription_holder.id),
                    "frequency": frequency,
                },
            )
            
            # Return the client secret
            return JsonResponse({"clientSecret": payment_intent.client_secret})
            
        except Exception as e:
            # Log the full error for debugging
            import traceback
            print(f"Error creating payment intent: {str(e)}")
            print(traceback.format_exc())
            return JsonResponse({"error": str(e)}, status=500)
