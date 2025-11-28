from django.contrib.auth.decorators import login_required
from django.views.decorators.csrf import ensure_csrf_cookie, csrf_exempt
from django.contrib import messages
from django.core.paginator import Paginator, EmptyPage, PageNotAnInteger
from django.http.response import HttpResponseRedirect, JsonResponse, HttpResponse
from django.core.cache import cache
import logging

log = logging.getLogger(__name__)

# Importar el servicio de generación de imágenes
from apps.aiinterface.services import ImageGenerationService
from django.db.models import Q, Count, Sum, F, Exists, OuterRef, Subquery
from django.db.models.functions import Coalesce
from django.shortcuts import get_object_or_404, render, redirect
from django.db.models import Count
from django.template.response import TemplateResponse
from django.views.decorators.http import require_POST
from apps.subscriptions.helpers import create_stripe_checkout_session
from django.urls import reverse
from django.views.decorators.http import require_POST, require_http_methods
import json
import requests
from django.core.serializers.json import DjangoJSONEncoder
import urllib.parse
import os
from django.conf import settings
from apps.users.decorators import onboarding_required
import posthog
from django.utils import timezone
from apps.aiinterface.tasks import send_slack_notification
from django.contrib.auth import get_user_model

from .models import AdLibrary, IndustryList, TagList, AdRequest, AdRequestAssets, AdRequestVersion, AdRequestUsage, ExtraCredit, UserBrand, UserBrandAssets, UserFolder, AppConfiguration
from .forms import AdLibraryForm
from .services import can_create_ad_request, use_credit, can_create_ad_request_version, get_ad_request_version_limit, use_general_credit, use_version_credit, can_create_ad_version
import boto3

# Initialize logger
logger = logging.getLogger(__name__)

# A reasonable value for pagination would be 10 or 20 entries per page.
# Here we use 4 (a very low value), so we can show off the pagination using fewer items
PAGINATE_BY = 4
# For pagination, we use get_elided_page_range() to give a list of pages that always has some
# pages at the beginning and end, and some on either side of current, with ellipsis where needed.


@require_POST
@login_required
def create_payment_intent(request):
    """
    Create a Stripe PaymentIntent for the selected price and return the client secret.
    Expects 'priceId' in POST data.
    """
    from apps.utils.billing import get_stripe_module, get_stripe_publishable_key
    from djstripe.models import Customer as DjStripeCustomer
    
    stripe = get_stripe_module()
    price_id = request.POST.get('priceId')
    if not price_id:
        return JsonResponse({'error': 'Missing priceId'}, status=400)
    try:
        # Retrieve the price object from Stripe
        price = stripe.Price.retrieve(price_id)
        amount = price.unit_amount
        currency = price.currency
        
        # Ensure the user has a customer before creating a payment intent
        customer_kwargs = {}
        if hasattr(request.user, 'customer') and request.user.customer:
            # User already has a customer, use the Stripe customer ID (not the local DB ID)
            customer_kwargs["customer"] = request.user.customer.id  # djstripe Customer.id is the Stripe ID
        else:
            # Create a new customer for the user
            try:
                customer = stripe.Customer.create(
                    email=request.user.email,
                    name=request.user.get_full_name() or request.user.email,
                    metadata={
                        'user_id': request.user.id
                    }
                )
                # Sync the customer to Django-Stripe
                djstripe_customer = DjStripeCustomer.sync_from_stripe_data(customer)
                # Associate the customer with the user
                request.user.customer = djstripe_customer
                request.user.save()
                
                customer_kwargs["customer"] = customer.id
            except Exception as e:
                # Log the error but continue - we'll create a payment intent without customer
                print(f"Error creating customer: {str(e)}")
        
        # Create PaymentIntent with setup_future_usage to save payment method
        payment_intent = stripe.PaymentIntent.create(
            amount=amount,
            currency=currency,
            automatic_payment_methods={"enabled": True},
            setup_future_usage="off_session",  # Save payment method for future use
            metadata={
                "user_id": request.user.id,
                "price_id": price_id,
            },
            **customer_kwargs  # Associate with customer if available
        )
        
        # Return data needed by the frontend
        return JsonResponse({
            "clientSecret": payment_intent.client_secret,
            "publishableKey": get_stripe_publishable_key(),
            "amount": amount / 100,  # Convert cents to dollars/euros
            "currency": currency
        })
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=400)

@login_required
def payment_page(request):
    """
    Render the payment page with Stripe Elements integration.
    """
    return render(request, 'ads/payment.html')


@require_http_methods(["POST"])
def track_adlibrary_click(request, adlibrary_id):
    """
    Increment click_count for an AdLibrary item when a user clicks an image in Discover.
    No authentication requirement; protected by CSRF middleware.
    """
    adlibrary = get_object_or_404(AdLibrary, pk=adlibrary_id)
    # Atomic increment to avoid race conditions
    AdLibrary.objects.filter(pk=adlibrary_id).update(click_count=F('click_count') + 1)
    adlibrary.refresh_from_db(fields=['click_count'])

    # Optional analytics
    try:
        posthog.capture(
            request.user.id if request.user.is_authenticated else 'anonymous',
            'AdLibrary Clicked',
            properties={
                'adlibrary_id': adlibrary_id,
                'click_count': adlibrary.click_count,
                'path': request.path,
            }
        )
    except Exception:
        pass

    return JsonResponse({'id': adlibrary_id, 'click_count': adlibrary.click_count})


@require_POST
@login_required
def competitor_research(request):
    """
    Trigger competitor research task.
    Expects 'website_url' in POST data.
    """
    from apps.apify.tasks import competitor_research_task
    
    website_url = request.POST.get('website_url')
    if not website_url:
        return JsonResponse({'error': 'Missing website_url'}, status=400)
        
    # Trigger task asynchronously
    task = competitor_research_task.delay(request.user.id, website_url)
    
    return JsonResponse({
        'success': True,
        'task_id': task.id,
        'message': 'Competitor research started'
    })


@login_required
def get_competitor_ads(request):
    """
    Get ads from the selected competitor found during onboarding.
    Returns status of competitor research and AdLibrary entries if completed.
    """
    from apps.users.models import UserOnboarding
    
    try:
        try:
            onboarding = UserOnboarding.objects.select_related('selected_competitor_page').get(user=request.user)
        except UserOnboarding.DoesNotExist:
            return JsonResponse({
                'success': False, 
                'completed': False,
                'ads': [], 
                'message': 'No onboarding data found'
            })
        
        # Check if research is completed
        if not onboarding.competitor_research_completed:
            return JsonResponse({
                'success': False,
                'completed': False,
                'ads': [],
                'message': 'Competitor research still in progress'
            })
        
        # Research completed but no competitor found
        if not onboarding.selected_competitor_page:
            return JsonResponse({
                'success': False,
                'completed': True,
                'ads': [],
                'message': 'No competitor with ads was found'
            })
        
        fb_page = onboarding.selected_competitor_page
        
        # Get active ads from the selected competitor page
        ads = AdLibrary.objects.filter(
            facebook_page=fb_page,
            meta_status=AdLibrary.STATUS_ACTIVE
        ).order_by('-ad_delivery_start_time')[:20]
        
        ads_data = []
        for ad in ads:
            ads_data.append({
                'id': ad.id,
                'image_url': ad.ad_image.url if ad.ad_image else None,
                'ad_copy': ad.ad_creative_bodies or '',
                'page_name': fb_page.page_name or 'Unknown',
                'page_url': fb_page.page_url or '',
                'started_running_on': ad.ad_delivery_start_time.isoformat() if ad.ad_delivery_start_time else None,
            })
        
        return JsonResponse({
            'success': True,
            'completed': True,
            'ads': ads_data,
            'competitor_page': {
                'id': fb_page.id,
                'page_id': fb_page.page_id,
                'page_name': fb_page.page_name,
                'page_url': fb_page.page_url
            }
        })
    except Exception as e:
        logger.error(f"Error in get_competitor_ads: {str(e)}", exc_info=True)
        return JsonResponse({'success': False, 'completed': False, 'ads': [], 'message': f'Server error: {str(e)}'})


@login_required
@require_http_methods(["POST"])
def select_competitor_ad(request):
    """
    Save the selected AdLibrary from competitor ads during onboarding.
    Advances user to STEP_5.
    """
    from apps.users.models import UserOnboarding
    import json
    
    try:
        data = json.loads(request.body)
        ad_library_id = data.get('ad_library_id')
        
        if not ad_library_id:
            return JsonResponse({'success': False, 'message': 'ad_library_id is required'}, status=400)
        
        # Get or create onboarding record
        onboarding, _ = UserOnboarding.objects.get_or_create(user=request.user)
        
        # Verify the AdLibrary exists
        try:
            ad_library = AdLibrary.objects.get(id=ad_library_id)
        except AdLibrary.DoesNotExist:
            return JsonResponse({'success': False, 'message': 'AdLibrary not found'}, status=404)
        
        # Save the selection
        onboarding.selected_ad_library = ad_library
        onboarding.save()
        
        # Advance user to STEP_5
        request.user.advance_onboarding()
        
        return JsonResponse({
            'success': True,
            'message': 'Ad selection saved',
            'next_step': request.user.status
        })
        
    except json.JSONDecodeError:
        return JsonResponse({'success': False, 'message': 'Invalid JSON'}, status=400)
    except Exception as e:
        logger.error(f"Error in select_competitor_ad: {str(e)}", exc_info=True)
        return JsonResponse({'success': False, 'message': f'Server error: {str(e)}'}, status=500)


@login_required
@require_http_methods(["POST"])
def save_assets_onboarding(request):
    """
    Save assets for Step 5 of onboarding.
    Handles: asset_image_1, asset_image_2, asset_image_3, canvas_size, prompt
    Each field is optional and saved independently.
    """
    from apps.users.models import UserOnboarding
    
    try:
        # Get or create onboarding record
        onboarding, _ = UserOnboarding.objects.get_or_create(user=request.user)
        
        # Handle image uploads
        if 'asset_image_1' in request.FILES:
            onboarding.asset_image_1 = request.FILES['asset_image_1']
        elif 'asset_image_1' in request.POST and request.POST['asset_image_1'] == '':
            # Empty string means delete
            onboarding.asset_image_1 = None
            
        if 'asset_image_2' in request.FILES:
            onboarding.asset_image_2 = request.FILES['asset_image_2']
        elif 'asset_image_2' in request.POST and request.POST['asset_image_2'] == '':
            # Empty string means delete
            onboarding.asset_image_2 = None
            
        if 'asset_image_3' in request.FILES:
            onboarding.asset_image_3 = request.FILES['asset_image_3']
        elif 'asset_image_3' in request.POST and request.POST['asset_image_3'] == '':
            # Empty string means delete
            onboarding.asset_image_3 = None
        
        # Handle canvas_size
        if 'canvas_size' in request.POST:
            onboarding.canvas_size = request.POST['canvas_size'] or None
        
        # Handle prompt
        if 'prompt' in request.POST:
            onboarding.prompt = request.POST['prompt'] or None
        
        onboarding.save()
        
        return JsonResponse({
            'success': True,
            'message': 'Assets saved',
            'data': {
                'asset_image_1': onboarding.asset_image_1.url if onboarding.asset_image_1 else None,
                'asset_image_2': onboarding.asset_image_2.url if onboarding.asset_image_2 else None,
                'asset_image_3': onboarding.asset_image_3.url if onboarding.asset_image_3 else None,
                'canvas_size': onboarding.canvas_size,
                'prompt': onboarding.prompt,
            }
        })
        
    except Exception as e:
        logger.error(f"Error in save_assets_onboarding: {str(e)}", exc_info=True)
        return JsonResponse({'success': False, 'message': f'Server error: {str(e)}'}, status=500)


@login_required
@require_http_methods(["GET"])
def get_assets_onboarding(request):
    """
    Get saved assets for Step 5 of onboarding.
    """
    from apps.users.models import UserOnboarding
    
    try:
        onboarding = UserOnboarding.objects.filter(user=request.user).first()
        
        if not onboarding:
            return JsonResponse({
                'success': True,
                'data': {
                    'asset_image_1': None,
                    'asset_image_2': None,
                    'asset_image_3': None,
                    'canvas_size': None,
                    'prompt': None,
                }
            })
        
        return JsonResponse({
            'success': True,
            'data': {
                'asset_image_1': onboarding.asset_image_1.url if onboarding.asset_image_1 else None,
                'asset_image_2': onboarding.asset_image_2.url if onboarding.asset_image_2 else None,
                'asset_image_3': onboarding.asset_image_3.url if onboarding.asset_image_3 else None,
                'canvas_size': onboarding.canvas_size,
                'prompt': onboarding.prompt,
            }
        })
        
    except Exception as e:
        logger.error(f"Error in get_assets_onboarding: {str(e)}", exc_info=True)
        return JsonResponse({'success': False, 'message': f'Server error: {str(e)}'}, status=500)


@login_required
def provision_credit_package(request, user_id, product):
    """
    Asigna créditos al usuario basado en el paquete comprado.
    
    Args:
        user: El usuario que compró el paquete
        product: El objeto Product de Stripe
        
    Returns:
        dict: Información sobre los créditos asignados
    """
    print(f'user_id in provision_credit_package: {user_id}')
    User = get_user_model()
    user = User.objects.get(id=user_id)
    print(f"Provisioning credit package: {product.name} for user: {user.id}")
    
    # Obtener el slug del producto de los productos activos
    slug = None
    stripe_product_id = product.id
    print(f"Looking for product with Stripe ID: {stripe_product_id}")
    
    from apps.subscriptions.metadata import get_active_products_with_metadata
    # Buscar el producto en los productos activos
    active_products = list(get_active_products_with_metadata())
    for active_product in active_products:
        if active_product.stripe_id == stripe_product_id:
            slug = active_product.metadata.slug
            print(f"Found matching product: {active_product.metadata.name} with slug: {slug}")
            break

    from apps.ads.models import AppConfiguration
    # Obtener la configuración de créditos desde AppConfiguration
    config = AppConfiguration.get_limits()
    
    # Inicializar valores por defecto
    general_credits = 0
    version_credits = 0
    package_name = "Unknown Package"
    
    # Asignar créditos según el paquete
    if slug == 'package-1' or (slug and slug.startswith('package-1-')):
        general_credits = config.get('package1', {}).get('general_credits', 15)
        version_credits = config.get('package1', {}).get('version_credits', 3)
        package_name = "Package 1"
    elif slug == 'package-2' or (slug and slug.startswith('package-2-')):
        general_credits = config.get('package2', {}).get('general_credits', 30)
        version_credits = config.get('package2', {}).get('version_credits', 7)
        package_name = "Package 2"
    else:
        # Si no coincide con ningún paquete conocido, usar el nombre del producto
        package_name = product.name
        print(f"Unknown package type, using default values for {package_name}")
        # Usar valores predeterminados conservadores
        general_credits = 5
        version_credits = 1
    
    from .models import ExtraCredit
    # Asignar créditos al usuario usando los métodos de ExtraCredit
    ExtraCredit.add_general_credits(user, general_credits)
    ExtraCredit.add_version_credits(user, version_credits)
    
    print(f"Credits assigned to user {user.id}: {general_credits} general, {version_credits} version")
    
    import posthog
    # Obtener el plan de suscripción actual del usuario
    current_plan = "No Plan"
    if hasattr(user, 'subscription') and user.subscription:
        if user.has_active_subscription():
            if user.subscription.plan and user.subscription.plan.product:
                current_plan = user.subscription.plan.product.name
    
    # Registrar la transacción en PostHog
    posthog.capture(
        user.id,
        'Credits Purchased',
        properties={
            'package': package_name,
            'general_credits': general_credits,
            'version_credits': version_credits,
            'slug': slug,
            'current_subscription_plan': current_plan
        }
    )
    
    return {
        'package_name': package_name,
        'general_credits': general_credits,
        'version_credits': version_credits
    }


def payment_success(request):
    """
    Handle successful payment and create subscription.
    Expects payment_intent in the URL query parameters.
    """
    from apps.utils.billing import get_stripe_module
    from apps.subscriptions.helpers import provision_subscription
    from django.contrib import messages
    
    # Debugging information
    print(f"Payment success view called with params: {request.GET}")
    
    # Get payment_intent_id from URL
    payment_intent_id = request.GET.get('payment_intent')
    if not payment_intent_id:
        print("No payment_intent found in URL parameters")
        messages.error(
            request,
            "No payment information found. If you think this is an error, please contact support."
        )
        return render(request, 'ads/payment_success.html', {'success': False, 'debug_info': 'No payment_intent in URL'})
    
    try:
        # Retrieve the payment intent from Stripe
        stripe = get_stripe_module()
        print(f"Retrieving payment intent: {payment_intent_id}")
        payment_intent = stripe.PaymentIntent.retrieve(payment_intent_id)
        print(f"Payment intent retrieved: {payment_intent.status}, metadata: {payment_intent.metadata}")
        
        # Verify payment status
        if payment_intent.status != 'succeeded':
            print(f"Payment not completed. Status: {payment_intent.status}")
            messages.error(
                request,
                f"Payment not completed. Status: {payment_intent.status}. Please try again or contact support."
            )
            return render(request, 'ads/payment_success.html', {
                'success': False, 
                'debug_info': f"Payment status: {payment_intent.status}"
            })
        
        # Get the price_id from the payment intent's metadata
        try:
            price_id = payment_intent.metadata.get('price_id')
            if not price_id:
                print("No price_id found in payment intent metadata")
                messages.error(request, "No subscription plan selected. Please try again or contact support.")
                return render(request, 'ads/payment_success.html', {
                    'success': False,
                    'debug_info': 'No price_id in payment intent metadata'
                })
            
            # Retrieve the price object from Stripe
            price = stripe.Price.retrieve(price_id)
            print(f"Using price from payment intent metadata: {price_id}")
            
            # Get the product
            product = stripe.Product.retrieve(price.product)
            print(f"Product retrieved: {product.name}")
            
            # Check if user has a customer ID
            if not hasattr(request.user, 'customer') or not request.user.customer:
                print("User doesn't have a customer ID, creating one")
                # Create a customer for the user if they don't have one
                customer = stripe.Customer.create(
                    email=request.user.email,
                    name=request.user.get_full_name() or request.user.email,
                    metadata={
                        'user_id': request.user.id
                    }
                )
                customer_id = customer.id
                print(f"Created customer: {customer_id}")
            else:
                customer_id = request.user.customer.id
                print(f"Using existing customer: {customer_id}")
            
            # Get payment method from the payment intent
            payment_method_id = payment_intent.payment_method
            print(f"Payment method from intent: {payment_method_id}")
            
            # Explicitly attach the payment method to the customer
            try:
                # First, retrieve the payment method to check its details
                payment_method = stripe.PaymentMethod.retrieve(payment_method_id)
                print(f"Retrieved payment method: {payment_method_id}, type: {payment_method.type}")
                
                # Check if the payment method is already attached to another customer
                if payment_method.customer:
                    print(f"Payment method is already attached to customer: {payment_method.customer}")
                    if payment_method.customer != customer_id:
                        print(f"Payment method is attached to a different customer. Updating user's customer.")
                        # Instead of creating a new payment method, use the existing customer that has the payment method
                        try:
                            # Get the existing customer that has the payment method
                            existing_customer = stripe.Customer.retrieve(payment_method.customer)
                            print(f"Found existing customer: {existing_customer.id}")
                            
                            # Update the existing customer with the user's information if needed
                            if existing_customer.email != request.user.email:
                                existing_customer = stripe.Customer.modify(
                                    existing_customer.id,
                                    email=request.user.email,
                                    name=request.user.get_full_name() or request.user.email,
                                    metadata={
                                        'user_id': request.user.id
                                    }
                                )
                                print(f"Updated existing customer with user information")
                            
                            # Sync the customer to Django-Stripe
                            from djstripe.models import Customer as DjStripeCustomer
                            djstripe_customer = DjStripeCustomer.sync_from_stripe_data(existing_customer)
                            
                            # Update the user's customer reference
                            request.user.customer = djstripe_customer
                            request.user.save()
                            
                            # Update our customer_id to use this customer
                            customer_id = existing_customer.id
                            print(f"User's customer updated to: {customer_id}")
                        except Exception as e:
                            print(f"Error updating user's customer: {str(e)}")
                else:
                    # Attach the payment method to our customer
                    print(f"Attaching payment method {payment_method_id} to customer {customer_id}")
                    stripe.PaymentMethod.attach(
                        payment_method_id,
                        customer=customer_id,
                    )
                
                # Always set the payment method as default, regardless of whether it was already attached
                # or we just attached it
                print(f"Setting payment method {payment_method_id} as default for customer {customer_id}")
                try:
                    stripe.Customer.modify(
                        customer_id,
                        invoice_settings={
                            'default_payment_method': payment_method_id,
                        }
                    )
                    print("Payment method successfully set as default")
                except Exception as e:
                    print(f"Error setting default payment method: {str(e)}")
            except Exception as e:
                print(f"Error attaching payment method: {str(e)}")
                # Continue anyway, we'll try to create the subscription
            
            # Verificar si es un paquete de créditos o una suscripción por el tipo de precio
            is_credit_package = False
            
            try:
                # Verificar el tipo de precio (one_time para paquetes, recurring para suscripciones)
                price_obj = stripe.Price.retrieve(price_id)
                print(f"Price type: {price_obj.type}, Price ID: {price_id}")
                
                if price_obj.type == 'one_time':
                    is_credit_package = True
                    print(f"Detected credit package by price type: {product.name}")
            except Exception as e:
                print(f"Error checking price type: {str(e)}")
                
            print(f"Final detection - Product: {product.name}, is_credit_package: {is_credit_package}")
            
            # aqui incluir print del request.user completo para ver su estructura
            user_id = request.user.id
            print(f"User ID: {user_id}")
            if is_credit_package:
                # Procesar como paquete de créditos
                try:
                    # Asignar créditos al usuario
                    credits_info = provision_credit_package(
                        request,
                        user_id, 
                        product
                    )
                    
                    # Mensaje de éxito
                    messages.success(
                        request,
                        f"You've successfully purchased {credits_info['package_name']} and received {credits_info['general_credits']} general credits and {credits_info['version_credits']} version credits!"
                    )
                    
                    return render(request, 'ads/payment_success.html', {
                        'success': True,
                        'is_credit_package': True,
                        'credits_info': credits_info,
                        'product_name': product.name
                    })
                    
                except Exception as e:
                    print(f"Error provisioning credit package: {str(e)}")
                    messages.error(
                        request,
                        f"Error processing credit package: {str(e)}. Please contact support."
                    )
                    return render(request, 'ads/payment_success.html', {
                        'success': False,
                        'debug_info': f"Credit package error: {str(e)}"
                    })
            else:
                # Procesar como suscripción (flujo original)
                print(f"Creating subscription with price: {price_id} for customer: {customer_id}")
                
                try:
                    # Create subscription with standard billing
                    subscription = stripe.Subscription.create(
                        customer=customer_id,
                        items=[
                            {
                                'price': price_id,
                            },
                        ],
                        metadata={
                            'user_id': request.user.id,
                            'payment_intent_id': payment_intent_id,
                        }
                    )
                    print(f"Subscription created successfully with ID: {subscription.id}")
                    
                    # Create or update AdRequestUsage record for the user
                    from apps.ads.models import AdRequestUsage
                    AdRequestUsage.get_current_usage(request.user)
                    print(f"AdRequestUsage record created/updated for user: {request.user.id}")
                    
                    # Track event in PostHog when a subscription is created
                    posthog.capture(
                        request.user.id,
                        'Sub Created',
                        properties={
                            'plan': product.name,  # Plan name from the product object
                            'subscription_id': subscription.id,
                            'price_id': price_id,
                            'customer_id': customer_id
                        }
                    )
                except Exception as e:
                    print(f"Error creating subscription with standard billing: {str(e)}")
                    print("Falling back to invoice collection method")
                    
                    # Fallback to invoice collection method if standard billing fails
                    subscription = stripe.Subscription.create(
                        customer=customer_id,
                        items=[
                            {
                                'price': price_id,
                            },
                        ],
                        collection_method='send_invoice',  # Fallback to invoice
                        days_until_due=30,
                        metadata={
                            'user_id': request.user.id,
                            'payment_intent_id': payment_intent_id,
                        }
                    )
                    print(f"Subscription created with invoice collection method: {subscription.id}")
                    
                    # Create or update AdRequestUsage record for the user
                    from apps.ads.models import AdRequestUsage
                    AdRequestUsage.get_current_usage(request.user)
                    print(f"AdRequestUsage record created/updated for user: {request.user.id}")
                    
                print(f"Subscription created: {subscription.id}, status: {subscription.status}")
                
                # Provision the subscription in your system
                print(f"Provisioning subscription: {subscription.id} for user: {request.user.id}")
                djstripe_subscription = provision_subscription(request.user, subscription.id)
                print(f"Subscription provisioned: {djstripe_subscription.id}")
                
                # Success message
                messages.success(
                    request,
                    f"You've successfully subscribed to {product.name}. Thank you for your support!"
                )
                
                return render(request, 'ads/payment_success.html', {
                    'success': True,
                    'subscription': djstripe_subscription,
                    'product_name': product.name
                })
            
        except Exception as e:
            print(f"Error creating subscription: {str(e)}")
            messages.error(
                request,
                f"Error creating subscription: {str(e)}. Please contact support."
            )
            return render(request, 'ads/payment_success.html', {
                'success': False,
                'debug_info': f"Subscription error: {str(e)}"
            })
            
    except Exception as e:
        print(f"Error processing payment: {str(e)}")
        messages.error(
            request,
            f"Error processing payment: {str(e)}. Please contact support."
        )
        return render(request, 'ads/payment_success.html', {
            'success': False,
            'debug_info': f"Payment processing error: {str(e)}"
        })

@onboarding_required
@login_required
def discover_page(request):
    """
    Render the discover page with React components.
    """
    # Get total count of AdLibrary entries
    total_ads_count = AdLibrary.objects.count()
    
    template = "ads/discover.html"
    context = {
        "active_tab": "discover",
        "total_ads_count": total_ads_count,
    }
    
    return TemplateResponse(request, template, context)

@onboarding_required
@login_required
def brands_page(request):
    """
    Render the brands library page with React components.
    """
    # Get all AdRequestAssets for the current user that have an associated active brand
    user_assets = AdRequestAssets.objects.filter(
        user=request.user,
        brand__isnull=False,
        brand__active=True
    ).select_related('brand').distinct('brand')
    
    # Prepare brands data for frontend
    brands_data = []
    for asset in user_assets:
        brand_info = {
            'id': asset.brand.id,
            'name': asset.brand.brand_name,
            'logo_url': asset.logo.url if asset.logo else None,
            'company_website': asset.company_website,
            'industry': asset.industry,
            'product_description': asset.product_description,
            'main_hex_color': asset.main_hex_color,
            'created_at': asset.created_at.isoformat() if asset.created_at else None,
        }
        brands_data.append(brand_info)
    
    # Convert to JSON for frontend
    brands_json = json.dumps(brands_data, cls=DjangoJSONEncoder)
    
    # Get brand assets generation cost from AppConfiguration
    app_config = AppConfiguration.get_config()
    brand_assets_cost = app_config.brand_assets_generation_cost if app_config else 4
    
    template = "ads/brands.html"
    context = {
        "active_tab": "brands-library",
        "brands_data": brands_json,
        "brand_assets_cost": brand_assets_cost,
    }
    
    return TemplateResponse(request, template, context)


@onboarding_required
@login_required
def home(request):
    template = "ads/ads_home.html"
    
    # Get ad requests for the current user
    ad_requests = AdRequest.objects.filter(user=request.user).order_by('-updated_at')
    
    # Prepare data for template
    requests_data = []
    for req in ad_requests:
        # Get tags and industries if ad_library exists
        tags = []
        industries = []
        if req.ad_library:
            tags = [tag.name for tag in req.ad_library.tags.all()]
            industries = [industry.name for industry in req.ad_library.facebook_page.industries.all()]
        
        # Map status to display status
        status_mapping = {
            'NEW': 'Draft',
            'DRAFT': 'Draft',
            'FILLED': 'Draft',
            'SUBMITTED': 'Generating...',
            'COMPLETED': 'Done',
            'REOPENED': 'Generating...'
        }
        display_status = status_mapping.get(req.status, req.status)
        
        # Create request data dictionary
        request_data = {
            'ad_request_id': req.id,
            'ad_library_name': req.ad_library.facebook_page.page_name if req.ad_library else None,
            'facebook_page': req.ad_library.facebook_page.page_name if req.ad_library else None,
            'brand_name': req.base_assets.brand.brand_name if req.base_assets and req.base_assets.brand else None,
            'status': req.status,
            'display_status': display_status,
            'created_at': req.created_at.isoformat() if req.created_at else None,
            'updated_at': req.updated_at.isoformat() if req.updated_at else None,
            'canvas_size': req.canvas_size,
            'tags': tags,
            'industries': industries,
        }
        requests_data.append(request_data)
    
    # Convertir a JSON para pasar al componente React
    ad_requests_json = json.dumps(requests_data)
    
    return TemplateResponse(request, template, {
        "active_tab": "ads",
        "ad_requests": requests_data,
        "ad_requests_json": ad_requests_json
    })


def get_all_industries(request):
    """
    Get all IndustryList objects from the database.
    Uses Redis caching for improved performance.
    
    Returns: JSON with list of industry names
    """
    from django.core.cache import cache
    
    # Try to get from cache first
    cache_key = 'industry_name_list'
    industry_list = cache.get(cache_key)
    
    # If not in cache, get from database and cache it
    if industry_list is None:
        industries = IndustryList.objects.all()
        industry_list = [industry.name for industry in industries]
        # Cache with no expiration - will be invalidated by signals
        cache.set(cache_key, industry_list, None)
    
    return JsonResponse({'industries': industry_list}, safe=True)


def get_all_tags(request):
    """
    Get all TagList objects from the database.
    Uses Redis caching for improved performance.
    
    Returns: JSON with list of tag names
    """
    from django.core.cache import cache
    
    # Try to get from cache first
    cache_key = 'tag_name_list'
    tag_list = cache.get(cache_key)
    
    # If not in cache, get from database and cache it
    if tag_list is None:
        tags = TagList.objects.all()
        tag_list = [tag.name for tag in tags]
        # Cache with no expiration - will be invalidated by signals
        cache.set(cache_key, tag_list, None)
    
    return JsonResponse({'tags': tag_list}, safe=True)


def _extract_url_from_text(text):
    """
    Extract the first valid URL from a text string.
    
    Args:
        text: The text to search for URLs
        
    Returns:
        str: The first valid URL found, or None if no URL is found
    """
    import re
    import logging
    logger = logging.getLogger(__name__)
    
    if not text:
        return None
    
    # More comprehensive URL pattern that handles query parameters, fragments, etc.
    # This pattern allows for most URL-safe characters including query parameters with = and &
    url_pattern = r'https?://[^\s<>"{}|\\^`\[\]]+(?:\?[^\s<>"{}|\\^`\[\]]*)?(?:#[^\s<>"{}|\\^`\[\]]*)?'
    
    logger.info(f"Searching for URLs in text: {repr(text[:200])}")  # Log first 200 chars
    
    # Find all URLs in the text
    urls = re.findall(url_pattern, text)
    
    logger.info(f"Found URLs: {urls}")
    
    if urls:
        # Return the first URL found, cleaned up
        url = urls[0]
        # Remove trailing punctuation that might not be part of the URL
        url = re.sub(r'[.,;!?]+$', '', url)
        logger.info(f"Returning cleaned URL: {url}")
        return url
    
    logger.info("No URLs found in text")
    return None


def _is_valid_url(text):
    """
    Helper function to validate if a text contains a valid URL.
    
    Args:
        text: The text to validate
        
    Returns:
        bool: True if the text contains a valid URL, False otherwise
    """
    return _extract_url_from_text(text) is not None


def _extract_cta_link(adlibrary):
    """
    Extract CTA link from AdLibrary fields in order of priority.
    
    Args:
        adlibrary: AdLibrary instance
        
    Returns:
        str: Valid URL or 'Unknown' if no valid URL found
    """
    import logging
    logger = logging.getLogger(__name__)
    
    # Fields to check in order of priority
    fields_to_check = [
        'ad_creative_link_titles',
        'ad_creative_link_captions', 
        'ad_creative_link_descriptions',
        'bylines',
        'ad_creative_bodies'
    ]
    
    logger.info(f"Extracting CTA link for AdLibrary ID: {adlibrary.id}")
    
    for field_name in fields_to_check:
        field_value = getattr(adlibrary, field_name, None)
        logger.info(f"Checking field '{field_name}': {repr(field_value)}")
        
        extracted_url = _extract_url_from_text(field_value)
        if extracted_url:
            logger.info(f"Found URL in field '{field_name}': {extracted_url}")
            return extracted_url
        else:
            logger.info(f"No URL found in field '{field_name}'")
    
    logger.info("No URL found in any field, returning 'Unknown'")
    return 'Unknown'


def get_adlibrary_by_id(request, adlibrary_id):
    """
    Get a specific AdLibrary object by its ID.
    
    Args:
        request: The HTTP request
        adlibrary_id: The primary key of the AdLibrary to retrieve
        
    Returns: JSON with the AdLibrary data
    """
    try:
        # Get the AdLibrary object by ID
        adlibrary = get_object_or_404(AdLibrary, id=adlibrary_id)
        
        # Get cached FacebookPage data to avoid repeated queries
        facebook_page_id = adlibrary.facebook_page_id
        cache_key = f'facebook_page_data_{facebook_page_id}'
        facebook_page_data = cache.get(cache_key)
        
        if facebook_page_data is None:
            # Cache miss - get FacebookPage data
            facebook_page = adlibrary.facebook_page
            industry_names = [industry.name for industry in facebook_page.industries.all()]
            facebook_page_data = {
                'page_name': facebook_page.page_name,
                'page_url': facebook_page.page_url,
                'industries': industry_names,
            }
            # Cache with no expiration - will be invalidated by signals
            cache.set(cache_key, facebook_page_data, None)
        
        # Get tags as lists of names
        tag_names = [tag.name for tag in adlibrary.tags.all()]
        
        # Extract CTA link using the new validation logic
        cta_link = _extract_cta_link(adlibrary)
        
        # Create dictionary with all fields
        adlibrary_data = {
            'id': adlibrary.id,
            'company_name': facebook_page_data['page_name'],
            'page_url': facebook_page_data['page_url'],
            'industries': facebook_page_data['industries'],
            'tags': tag_names,
            'ad_image': adlibrary.ad_image.url if adlibrary.ad_image else None,
            'is_fav': adlibrary.is_fav,
            'ad_creative_bodies': adlibrary.ad_creative_bodies,
            'ad_creation_time': adlibrary.ad_creation_time.isoformat() if adlibrary.ad_creation_time else None,
            'ad_delivery_stop_time': adlibrary.ad_delivery_stop_time.isoformat() if adlibrary.ad_delivery_stop_time else None,
            # New fields
            'meta_status': adlibrary.meta_status,
            'media_type': adlibrary.media_type,
            'publisher_platform': list(adlibrary.publisher_platform) if adlibrary.publisher_platform else [],
            'ad_creative_link_titles': adlibrary.ad_creative_link_titles,
            'cta_link': cta_link,  # New field for CTA link
        }
        
        return JsonResponse(adlibrary_data, safe=True)
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=404)


def get_adlibrary_filters(request):
    """
    Get list of AdLibrary objects with flexible filtering options.
    
    GET Parameters:
        company_name: Filter by company name (case-insensitive contains)
        page_id: Filter by Facebook page ID (takes priority over company_name)
        industries: Filter by industry names (comma-separated list)
        tags: Filter by tag names (comma-separated list)
        media_type: Filter by media type ('image', 'meme', 'image_and_meme')
        publisher_platform: Filter by platform ('FACEBOOK', 'INSTAGRAM', 'AUDIENCE_NETWORK', 'MESSENGER', 'THREADS', or comma-separated for multiple)
        meta_status: Filter by meta status ('ACTIVE', 'INACTIVE', or 'all' for both)
        is_active: Filter by active status (true/false, default: true)
        page: Page number for pagination (default: 1)
        page_size: Number of items per page (default: 20)
    
    Returns: JSON with list of AdLibrary objects including company_name, industries, tags, and ad_image,
    plus pagination metadata
    """
    
    # Get filter parameters from request
    company_name = request.GET.get('company_name', '')
    page_id = request.GET.get('page_id', '')  # New parameter for Facebook page ID
    industries = request.GET.getlist('industries', [])
    tags = request.GET.getlist('tags', [])
    media_type = request.GET.get('media_type', '')  # New parameter for media type
    publisher_platform = request.GET.get('publisher_platform', '')  # New parameter for platform
    meta_status = request.GET.get('meta_status', '')  # New parameter for meta status
    
    # DEBUG: Print all received parameters
    print(f"DEBUG: Received parameters - media_type='{media_type}', meta_status='{meta_status}', has_filters check will be: {bool(company_name or page_id or industries or tags or media_type or publisher_platform or meta_status)}")
    
    # Get is_active filter parameter (default to True if not provided)
    is_active_param = request.GET.get('is_active', 'true').lower()
    is_active = is_active_param in ['true', '1', 'yes']
    
    # Get pagination parameters
    page = request.GET.get('page', '1')
    page_size = request.GET.get('page_size', '20')
    
    try:
        page = int(page)
        page_size = int(page_size)
        # Limitar el tamaño máximo de página para evitar consultas muy grandes
        page_size = min(page_size, 100)
    except (ValueError, TypeError):
        page = 1
        page_size = 20
    
    # If single values are provided instead of lists, convert them
    if not industries and request.GET.get('industry'):
        industries = [request.GET.get('industry')]
    
    if not tags and request.GET.get('tag'):
        tags = [request.GET.get('tag')]
    
    # Check if any filter parameters are provided
    has_filters = company_name or page_id or industries or tags or media_type or publisher_platform or meta_status
    print(f"DEBUG: has_filters = {has_filters}")
    
    if has_filters:
        # Comenzar con una consulta base con filtros básicos de estado
        base_filters = Q(is_active=True)
        if is_active:
            base_filters &= Q(meta_status=AdLibrary.STATUS_ACTIVE)
        
        adlibraries = AdLibrary.objects.filter(base_filters)
        
        # Apply company filter if provided (AND logic)
        # Priority: page_id over company_name for more precise filtering
        if page_id:
            # page_id is the Facebook Page ID (string), not the DB ID
            adlibraries = adlibraries.filter(facebook_page__page_id=page_id)
        elif company_name:
            adlibraries = adlibraries.filter(facebook_page__page_name__icontains=company_name)
        
        # Create combined query for industries and tags (OR logic between them)
        combined_query = Q()
        
        # Add industry conditions to combined query
        if industries:
            # Filter by industries using a more efficient in-query
            valid_industries = [industry for industry in industries if industry]
            if valid_industries:
                combined_query |= Q(facebook_page__industries__name__in=valid_industries)
        
        # Add tag conditions to combined query - search in ad_creative_bodies
        if tags:
            valid_tags = [tag for tag in tags if tag]
            if valid_tags:
                # Crear una condición OR para buscar cualquiera de los tags en ad_creative_bodies
                tag_query = Q()
                for tag in valid_tags:
                    # Usar icontains para búsqueda insensible a mayúsculas/minúsculas
                    tag_query |= Q(ad_creative_bodies__icontains=tag)
                
                # Añadir la condición OR a la consulta combinada
                combined_query |= tag_query
        
        # Apply the combined filter if any conditions exist
        if combined_query:
            adlibraries = adlibraries.filter(combined_query).distinct()
        
        # Apply media_type filter if provided
        if media_type:
            print(f"DEBUG: Filtering by media_type='{media_type}'")
            print(f"DEBUG: Before filter count: {adlibraries.count()}")
            adlibraries = adlibraries.filter(media_type=media_type)
            print(f"DEBUG: After filter count: {adlibraries.count()}")
            print(f"DEBUG: Sample media_types in filtered results: {list(adlibraries.values_list('media_type', flat=True).distinct())}")
        
        # Apply publisher_platform filter if provided
        if publisher_platform:
            print(f"DEBUG: Filtering by publisher_platform='{publisher_platform}'")
            print(f"DEBUG: Before platform filter count: {adlibraries.count()}")
            try:
                # Handle comma-separated platforms (for "All" option)
                if ',' in publisher_platform:
                    platform_list = [p.strip() for p in publisher_platform.split(',')]
                    print(f"DEBUG: Platform list: {platform_list}")
                    adlibraries = adlibraries.filter(publisher_platform__overlap=platform_list)
                else:
                    print(f"DEBUG: Single platform: {publisher_platform}")
                    adlibraries = adlibraries.filter(publisher_platform__contains=[publisher_platform])
                print(f"DEBUG: After platform filter count: {adlibraries.count()}")
            except Exception as e:
                print(f"DEBUG: Error in publisher_platform filter: {e}")
                raise
        
        # Apply meta_status filter if provided
        if meta_status and meta_status != 'all':
            adlibraries = adlibraries.filter(meta_status=meta_status.upper())
    else:
        # Si no hay filtros específicos, mostrar solo favoritos
        print("DEBUG: No filters detected, showing favorites only")
        if is_active:
            adlibraries = AdLibrary.objects.filter(is_fav=True, meta_status=AdLibrary.STATUS_ACTIVE, is_active=True)
        else:
            adlibraries = AdLibrary.objects.filter(is_fav=True, is_active=True)
        print(f"DEBUG: Favorites query count: {adlibraries.count()}")
    
    # Apply sorting if requested (must be before pagination)
    sort_by = request.GET.get('sort_by', '').lower()
    if sort_by == 'newest':
        # Newest first -> latest delivery start time
        adlibraries = adlibraries.order_by('-ad_delivery_start_time', '-id')
    elif sort_by == 'oldest':
        # Oldest first -> earliest delivery start time
        adlibraries = adlibraries.order_by('ad_delivery_start_time', 'id')
    elif sort_by == 'popular':
        # Most popular first -> highest click_count
        adlibraries = adlibraries.order_by('-click_count', '-id')

    # Aplicar paginación a los resultados
    paginator = Paginator(adlibraries, page_size)
    
    try:
        paginated_adlibraries = paginator.page(page)
    except PageNotAnInteger:
        # Si la página no es un entero, mostrar la primera página
        paginated_adlibraries = paginator.page(1)
    except EmptyPage:
        # Si la página está fuera de rango, mostrar la última página
        paginated_adlibraries = paginator.page(paginator.num_pages)
    
    # Convert to list of dictionaries with all required fields
    adlibrary_list = []
    for adlibrary in paginated_adlibraries:
        # Get cached FacebookPage data to avoid repeated queries
        facebook_page_id = adlibrary.facebook_page_id
        cache_key = f'facebook_page_data_{facebook_page_id}'
        facebook_page_data = cache.get(cache_key)
        
        if facebook_page_data is None:
            # Cache miss - get FacebookPage data
            facebook_page = adlibrary.facebook_page
            industry_names = [industry.name for industry in facebook_page.industries.all()]
            facebook_page_data = {
                'page_name': facebook_page.page_name,
                'page_url': facebook_page.page_url,
                'industries': industry_names,
            }
            # Cache with no expiration - will be invalidated by signals
            cache.set(cache_key, facebook_page_data, None)
        
        # Get tags as lists of names
        tag_names = [tag.name for tag in adlibrary.tags.all()]
        
        # Extract CTA link using the same logic as get_adlibrary_by_id
        cta_link = _extract_cta_link(adlibrary)
        
        # Create dictionary with all fields
        adlibrary_data = {
            'id': adlibrary.id,
            'company_name': facebook_page_data['page_name'],
            'page_url': facebook_page_data['page_url'],
            'industries': facebook_page_data['industries'],
            'tags': tag_names,
            'ad_image': adlibrary.ad_image.url if adlibrary.ad_image else None,
            'is_fav': adlibrary.is_fav,
            'ad_creative_bodies': adlibrary.ad_creative_bodies,
            'ad_creation_time': adlibrary.ad_creation_time.isoformat() if adlibrary.ad_creation_time else None,
            'ad_delivery_stop_time': adlibrary.ad_delivery_stop_time.isoformat() if adlibrary.ad_delivery_stop_time else None,
            # New fields
            'meta_status': adlibrary.meta_status,
            'media_type': adlibrary.media_type,
            'publisher_platform': list(adlibrary.publisher_platform) if adlibrary.publisher_platform else [],
            'ad_creative_link_titles': adlibrary.ad_creative_link_titles,
            'cta_link': cta_link,  # New field for CTA link
            'click_count': adlibrary.click_count,
        }
        adlibrary_list.append(adlibrary_data)
    
    # Track event in PostHog for filter query
    posthog.capture(
        request.user.id if request.user.is_authenticated else 'anonymous',  # Distinct ID (user ID or anonymous)
        'Step 1 Filter query',
        properties={
            'company_name': company_name,
            'page_id': page_id,
            'industries': industries,
            'tags': tags,
            'page': page,
            'page_size': page_size
        }
    )
    
    # Incluir información de paginación en la respuesta
    return JsonResponse({
        'adlibraries': adlibrary_list,
        'pagination': {
            'total_items': paginator.count,
            'total_pages': paginator.num_pages,
            'current_page': paginated_adlibraries.number,
            'has_next': paginated_adlibraries.has_next(),
            'has_previous': paginated_adlibraries.has_previous(),
            'page_size': page_size
        }
    }, safe=True)




def get_adlibrary_company_list(request):
    """
    Get a list of all unique company names from FacebookPage with their ad counts.
    Uses Redis caching that updates when AdLibrary changes.
    
    Returns: JSON with list of companies and their ad counts
    """
    from django.core.cache import cache
    from django.db.models import Count, Q
    from apps.apify.models import FacebookPage
    from apps.ads.models import AdLibrary
    
    # Try to get from cache first
    cache_key = 'adlibrary_company_data_with_counts'
    company_data = cache.get(cache_key)
    
    # If not in cache, get from database and cache it
    if company_data is None:
        # Get FacebookPages with their ad counts (only those with active ads)
        facebook_pages = FacebookPage.objects.filter(
            is_active=True,
            page_name__isnull=False
        ).exclude(
            page_name=''
        ).annotate(
            ad_count=Count('adlibraries', filter=Q(adlibraries__is_active=True))
        ).filter(
            ad_count__gt=0
        ).values('id', 'page_id', 'page_name', 'ad_count', 'page_url').distinct().order_by('page_name')
        
        # Convert to list of dictionaries and clean page_url
        company_data = []
        for page in facebook_pages:
            page_dict = dict(page)
            # Remove https:// from page_url for twenty-icons.com compatibility
            if page_dict.get('page_url'):
                import re
                page_dict['page_url'] = re.sub(r'^https?://', '', page_dict['page_url'])
            company_data.append(page_dict)
        
        # Cache indefinitely - will be invalidated by signals
        cache.set(cache_key, company_data, None)
    
    return JsonResponse({'companies': company_data}, safe=True)


@login_required
def user_images(request):
    """
    Fetch all images associated with the current user's selected brand.
    
    Returns: JSON with a list of image data
    """
    try:
        # Get the brand_id from the request parameters
        brand_id = request.GET.get('brand_id')
        
        # Base query for user's brand assets
        query = UserBrandAssets.objects.filter(user=request.user)
        
        # If brand_id is provided, filter by that brand
        if brand_id:
            try:
                brand_id = int(brand_id)
                query = query.filter(brand_id=brand_id)
            except ValueError:
                return JsonResponse({
                    'success': False,
                    'error': 'Invalid brand ID'
                }, status=400)
        
        # Get all user brand assets
        assets = query.order_by('-created_at')
        
        # Format the assets as a list of dictionaries
        images_data = [{
            'id': asset.id,
            'url': asset.image.url,
            'category': asset.category,
            'created_at': asset.created_at.isoformat(),
            'brand_id': asset.brand_id,
            'brand_name': asset.brand.brand_name
        } for asset in assets]
        
        return JsonResponse({
            'success': True,
            'images': images_data
        })
    except Exception as e:
        logging.error(f"Error fetching user images: {str(e)}")
        return JsonResponse({
            'success': False,
            'error': str(e)
        }, status=500)
        
@login_required
@require_POST
def upload_brand_asset(request):
    """
    Upload an image to UserBrandAssets model.
    Expects 'image' file, 'category' (logo, product, app, marketing), and optional 'brand_id' or 'folder_id' in POST data.
    The asset will be associated with either a brand or a folder, but not both.
    Extracts and stores file metadata including filename, dimensions, and file size.
    """
    try:
        from PIL import Image
        import os
        
        # Get the uploaded image
        image = request.FILES.get('image')
        if not image:
            return JsonResponse({'success': False, 'error': 'No image provided'}, status=400)
        
        # Get the category
        category = request.POST.get('category', 'product')
        if category not in ['logo', 'product', 'app', 'marketing']:
            category = 'product'  # Default to product if invalid category
        
        # Get the container (brand or folder)
        brand_id = request.POST.get('brand_id')
        folder_id = request.POST.get('folder_id')
        
        brand = None
        folder = None
        
        if brand_id:
            try:
                brand = UserBrand.objects.get(id=brand_id, user=request.user)
            except UserBrand.DoesNotExist:
                return JsonResponse({'success': False, 'error': 'Brand not found'}, status=404)
        elif folder_id:
            try:
                folder = UserFolder.objects.get(id=folder_id, user=request.user)
            except UserFolder.DoesNotExist:
                return JsonResponse({'success': False, 'error': 'Folder not found'}, status=404)
        else:
            # If no container specified, get the first brand or create a default one
            brand = UserBrand.objects.filter(user=request.user).first()
            if not brand:
                brand = UserBrand.objects.create(
                    user=request.user,
                    brand_name=f"{request.user.username}'s Brand"
                )
        
        # Extract logo file metadata for storage
        original_filename = image.name  # Original logo filename with extension (e.g., "company-logo.png")
        file_size = image.size  # Logo file size in bytes
        canvas_width = None
        canvas_height = None
        
        # Extract logo dimensions using PIL (Python Imaging Library)
        try:
            # Create a copy of the file content to avoid closing the original file
            from io import BytesIO
            image_copy = BytesIO(image.read())
            
            # Open the copied image data to read its canvas dimensions
            with Image.open(image_copy) as pil_image:
                canvas_width, canvas_height = pil_image.size  # Get logo width and height in pixels
            
            # Reset file pointer to beginning for Django file handling
            image.seek(0)
        except Exception as e:
            # If we can't read the logo dimensions, log the error but continue with upload
            print(f"Could not extract logo dimensions from {original_filename}: {e}")
            # Reset file pointer in case of error
            image.seek(0)
        
        # Create the UserBrandAssets object with complete logo metadata
        asset = UserBrandAssets.objects.create(
            user=request.user,
            brand=brand,
            folder=folder,
            image=image,
            category=category,
            original_filename=original_filename,  # Store original logo filename
            canvas_width=canvas_width,           # Store logo width in pixels
            canvas_height=canvas_height,         # Store logo height in pixels
            file_size=file_size                  # Store logo file size in bytes
        )
        
        # Return success response with complete logo metadata for frontend display
        response_data = {
            'success': True,
            'image': {
                'id': asset.id,
                'url': asset.image.url,
                'category': asset.category,
                'original_filename': asset.original_filename,  # Logo filename (e.g., "company-logo.png")
                'canvas_width': asset.canvas_width,           # Logo width in pixels
                'canvas_height': asset.canvas_height,         # Logo height in pixels
                'file_size': asset.file_size,                 # Logo file size in bytes
                'canvas_size': f"{asset.canvas_width}x{asset.canvas_height}" if asset.canvas_width and asset.canvas_height else None  # Formatted dimensions (e.g., "1024x768")
            }
        }
        
        # Add container information
        if asset.brand:
            response_data['image']['brand_id'] = asset.brand.id
            response_data['image']['brand_name'] = asset.brand.brand_name
            response_data['image']['container_type'] = 'brand'
        elif asset.folder:
            response_data['image']['folder_id'] = asset.folder.id
            response_data['image']['folder_name'] = asset.folder.folder_name
            response_data['image']['container_type'] = 'folder'
        
        return JsonResponse(response_data)
    except Exception as e:
        return JsonResponse({'success': False, 'error': str(e)}, status=500)

@login_required
@require_POST
def adrequest_create(request):
    """
    Create a new AdRequest instance without requiring input parameters.
    
    Returns: JSON with the AdRequest instance ID
    """
    if request.method != "POST":
        return JsonResponse({'error': 'Only POST method is allowed'}, status=405)
    
    try:
        
        # Initialize create parameters with empty assets and overrides
        create_params = {
            'user': request.user,
            'status': AdRequest.STATUS_NEW,
            'base_assets': None,
            'asset_overrides': {}
        }
        
        # Create the AdRequest with all fields at once
        ad_request = AdRequest.objects.create(**create_params)
        
        # Track event in PostHog when AdRequest is created
        posthog.capture(
            request.user.id,  # Distinct ID (user ID)
            'Ad Request Created',
            properties={
                'ad_request_id': ad_request.id,
                'timestamp': ad_request.created_at.isoformat() if hasattr(ad_request, 'created_at') else None
            }
        )
        
        # Return the AdRequest instance ID
        return JsonResponse({'id': ad_request.id}, status=201)
        
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=500)


def _get_user_adrequest(request, pk):
    """
    Helper function to get an AdRequest and check user permissions.
    
    Args:
        request: The HTTP request
        pk: The primary key of the AdRequest
        
    Returns:
        AdRequest object if the user has permission, or JsonResponse with error
    """
    # Get the AdRequest instance
    ad_request = get_object_or_404(AdRequest, id=pk)
    
    # Check if the user has permission to access this AdRequest
    if ad_request.user != request.user:
        return JsonResponse({'error': 'You do not have permission to access this request'}, status=403)
    
    return ad_request


@login_required
@require_http_methods(["GET"])
def adrequest_get(request, pk):
    """
    Get an AdRequest instance details.
    
    Args:
        request: The HTTP request
        pk: The primary key of the AdRequest to retrieve
        
    Returns:
        JsonResponse with the AdRequest data
    """
    # Get the AdRequest and check permissions
    result = _get_user_adrequest(request, pk)
    
    # If result is a JsonResponse, it means there was an error
    if isinstance(result, JsonResponse):
        return result
    
    # Otherwise, result is the ad_request object
    ad_request = result
    
    # Return the AdRequest with minimal processing
    def safe_get(obj, attr, default=None):
        return getattr(obj, attr, default) if obj is not None else default
    
    def safe_image_url(image_field):
        """Convert an ImageFieldFile to its URL string or return None if not available."""
        if image_field and hasattr(image_field, 'url'):
            return image_field.url
        return None

    ad_library = safe_get(ad_request, 'ad_library')
    user = safe_get(ad_request, 'user')
    base_assets = safe_get(ad_request, 'base_assets')
    
    # Get brand information if available
    brand = None
    if base_assets and hasattr(base_assets, 'brand') and base_assets.brand:
        brand = {
            'id': base_assets.brand.id,
            'name': base_assets.brand.brand_name
        }

    created_at = safe_get(ad_request, 'created_at')
    updated_at = safe_get(ad_request, 'updated_at')

    return JsonResponse({
        'id': safe_get(ad_request, 'id'),
        'user_id': safe_get(user, 'id'),
        'ad_library_id': safe_get(ad_library, 'id'),
        'ad_library_name': safe_get(ad_library, 'facebook_page.page_name'),
        'canvas_size': safe_get(ad_request, 'canvas_size'),
        'status': safe_get(ad_request, 'status'),
        'created_at': created_at.isoformat() if created_at else None,
        'updated_at': updated_at.isoformat() if updated_at else None,
        'asset_overrides': safe_get(ad_request, 'asset_overrides'),
        'user_uploaded_image': safe_image_url(safe_get(ad_request, 'user_uploaded_image')),
        'logo_override': safe_image_url(safe_get(ad_request, 'logo_override')),
        'product_image_1_override': safe_image_url(safe_get(ad_request, 'product_image_1_override')),
        'product_image_2_override': safe_image_url(safe_get(ad_request, 'product_image_2_override')),
        'app_image_1_override': safe_image_url(safe_get(ad_request, 'app_image_1_override')),
        'app_image_2_override': safe_image_url(safe_get(ad_request, 'app_image_2_override')),
        'marketing_image_1_override': safe_image_url(safe_get(ad_request, 'marketing_image_1_override')),
        'marketing_image_2_override': safe_image_url(safe_get(ad_request, 'marketing_image_2_override')),
        'marketing_image_3_override': safe_image_url(safe_get(ad_request, 'marketing_image_3_override')),
        'brand': brand,
    })


@login_required
@require_POST
def adrequest_update(request, pk):
    """
    Update an AdRequest instance with parameters from the request.
    Empty or missing fields in the request will result in empty fields in the instance.
    
    Args:
        request: The HTTP request
        pk: The primary key of the AdRequest to update
        
    Returns:
        JsonResponse with the updated AdRequest data
    """
    # Get the AdRequest and check permissions
    result = _get_user_adrequest(request, pk)
    
    # If result is a JsonResponse, it means there was an error
    if isinstance(result, JsonResponse):
        return result
    
    # Otherwise, result is the ad_request object
    ad_request = result
    
    try:
        # Update basic fields
        if 'canvas_size' in request.POST:
            ad_request.canvas_size = request.POST.get('canvas_size')

        # Handle image source selection (either AdLibrary or user uploaded image)
        if 'ad_library' in request.POST and request.POST.get('ad_library'):
            # User selected an AdLibrary image
            ad_request.ad_library = get_object_or_404(AdLibrary, id=request.POST.get('ad_library'))
            # Clear any user uploaded image to ensure only one source is used
            ad_request.user_uploaded_image = None
        elif 'user_uploaded_image' in request.FILES:
            # User uploaded their own image
            ad_request.user_uploaded_image = request.FILES['user_uploaded_image']
            # Clear AdLibrary selection to ensure only one source is used
            ad_request.ad_library = None
            
        if 'status' in request.POST:
            new_status = request.POST.get('status')
            if new_status in dict(AdRequest.STATUS_CHOICES).keys():
                ad_request.status = new_status
            else:
                return JsonResponse({'error': f'Invalid status: {new_status}'}, status=400)
        
        # Update text fields in asset_overrides
        text_fields = [
            'company_website', 'main_hex_color', 'key_benefits',
            # New text fields
            'target_audience', 'tone_of_voice', 'font_direction', 'core_features',
            'emotional_lifestyle_benefits', 'proof_points', 'value_propositions',
            # User prompt field for discover clone page
            'user_prompt'
        ]
        
        # Get current overrides or initialize if needed
        current_overrides = ad_request.asset_overrides if ad_request.asset_overrides else {}
        
        # Update only the fields that are explicitly in the request
        for field in text_fields:
            if field in request.POST:
                value = request.POST.get(field)
                
                # Special handling for main_hex_color
                if field == 'main_hex_color' and value:
                    import json
                    # If it's a single hex color, convert to JSON array format
                    if isinstance(value, str) and value.startswith('#') and len(value) in [4, 7]:
                        # Convert single hex color to JSON array format for consistency
                        current_overrides[field] = json.dumps([value])
                    elif isinstance(value, str):
                        # If it's already JSON or other format, store as is
                        try:
                            # Validate it's valid JSON
                            json.loads(value)
                            current_overrides[field] = value
                        except json.JSONDecodeError:
                            # If not valid JSON, treat as single color
                            current_overrides[field] = json.dumps([value])
                    else:
                        current_overrides[field] = value
                else:
                    # For all other fields, store as is
                    current_overrides[field] = value
                
        # Asignar los overrides actualizados de vuelta al modelo
        ad_request.asset_overrides = current_overrides
                
        # Handle brand_id if provided
        if 'brand_id' in request.POST:
            brand_id = request.POST.get('brand_id')
            
            try:
                # Ensure brand_id is an integer
                brand_id = int(brand_id)
                
                # Get the UserBrand instance
                brand = get_object_or_404(UserBrand, id=brand_id, user=request.user)
                print(f"Brand ID: {brand_id}, Brand: {brand}")
                
                # Check if assets already exist for this brand
                brand_assets = AdRequestAssets.objects.filter(brand=brand).first()
                print(f"Brand assets: {brand_assets}")

                if brand_assets:
                    # Associate the existing brand assets with the AdRequest
                    ad_request.base_assets = brand_assets
                    
                    # Overwrite asset_overrides with brand assets data (including empty values)
                    ad_request.asset_overrides = brand_assets.to_dict()
                    
                    # Overwrite ALL image override fields with images from brand assets
                    # This includes setting to None if the brand asset doesn't have the image
                    image_fields = [
                        'logo', 'product_image_1', 'product_image_2', 
                        'app_image_1', 'app_image_2',
                        'marketing_image_1', 'marketing_image_2', 'marketing_image_3'
                    ]
                    
                    for field in image_fields:
                        base_image = getattr(brand_assets, field)
                        # Always set the override field, even if base_image is None/empty
                        # This ensures the adrequest reflects the current state of the brand assets
                        setattr(ad_request, f"{field}_override", base_image)
                else:
                    # If no brand assets exist for this brand, create a new one
                    print(f"Creating new AdRequestAssets for brand: {brand}")
                    new_assets = AdRequestAssets.objects.create(
                        user=request.user,
                        brand=brand
                    )
                    # Associate the new assets with the AdRequest
                    ad_request.base_assets = new_assets
                    
                    # Clear asset_overrides to prevent copying old data to new brand
                    ad_request.asset_overrides = {}
                    
                    # Clear all image override fields to prevent copying old images
                    image_fields = [
                        'logo', 'product_image_1', 'product_image_2', 
                        'app_image_1', 'app_image_2',
                        'marketing_image_1', 'marketing_image_2', 'marketing_image_3'
                    ]
                    
                    for field in image_fields:
                        override_field = f"{field}_override"
                        if hasattr(ad_request, override_field):
                            setattr(ad_request, override_field, None)
            except (ValueError, TypeError) as e:
                return JsonResponse({'error': f'Invalid brand ID format: {str(e)}'}, status=400)
            except Exception as e:
                return JsonResponse({'error': f'Error processing brand: {str(e)}'}, status=400)
                    
            # Save the updated base_assets
            ad_request.base_assets.save()
        
        # Update image override fields
        image_fields = [
            'logo', 'product_image_1', 'product_image_2', 
            'app_image_1', 'app_image_2',
            'marketing_image_1', 'marketing_image_2', 'marketing_image_3'
        ]
        
        for field in image_fields:
            override_field = f"{field}_override"
            asset_id_field = f"{field}_asset_id"
            
            # Caso 1: Reutilizar imagen existente de UserBrandAssets por ID
            if asset_id_field in request.POST:
                try:
                    # Obtener el ID de la imagen
                    asset_id = request.POST.get(asset_id_field)
                    
                    # Importar el modelo
                    from .models import UserBrandAssets
                    
                    # Buscar la imagen directamente por ID
                    asset = UserBrandAssets.objects.filter(id=asset_id).first()
                    
                    if asset:
                        # Si encontramos la imagen, la asignamos directamente sin duplicarla
                        setattr(ad_request, override_field, asset.image)
                        print(f"Reutilizando imagen existente para {field}: {asset.image} (ID: {asset_id})")
                    else:
                        print(f"No se encontró la imagen con ID: {asset_id}")
                except Exception as e:
                    print(f"Error al procesar imagen existente: {str(e)}")
            # Caso 2: Clear the field if it's mentioned in the request but no file is provided
            elif field in request.POST and field not in request.FILES:
                setattr(ad_request, override_field, None)
            # Caso 3: Update the field if a file is provided
            elif field in request.FILES:
                setattr(ad_request, override_field, request.FILES[field])
        
        # Save the updated AdRequest
        ad_request.save()
        
        # Track event in PostHog when AdRequest is updated
        posthog.capture(
            request.user.id,  # Distinct ID (user ID)
            'Ad Request Updated',
            properties={
                'ad_request_id': ad_request.id,
                'status': ad_request.status,
                'canvas_size': ad_request.canvas_size,
                'ad_library_id': ad_request.ad_library.id if ad_request.ad_library else None,
                'has_user_uploaded_image': bool(ad_request.user_uploaded_image),
                'asset_overrides': ad_request.asset_overrides,
                'timestamp': ad_request.updated_at.isoformat() if hasattr(ad_request, 'updated_at') else None
            }
        )
        
        # Helper function to get image URL safely
        def safe_image_url(image_field):
            """Convert an ImageFieldFile to its URL string or return None if not available."""
            if image_field and hasattr(image_field, 'url'):
                return image_field.url
            return None
        
        # Return success response with user_uploaded_image URL
        return JsonResponse({
            'id': ad_request.id,
            'status': ad_request.status,
            'user_uploaded_image': safe_image_url(ad_request.user_uploaded_image),
            'message': 'AdRequest updated successfully'
        })
        
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=500)


@login_required
def user_ad_requests(request):
    """
    Get all ad requests for the current user and return as JSON.
    """
    ad_requests = AdRequest.objects.filter(user=request.user).order_by('-updated_at')
    
    # Serialize the ad requests to JSON
    requests_data = [{
        'ad_request_id': req.id,
        'ad_library_name': req.ad_library.facebook_page.page_name,
        'status': req.status,
        'created_at': req.created_at.isoformat(),
        'updated_at': req.updated_at.isoformat(),
        'canvas_size': req.canvas_size,
        # Add any other fields you need
    } for req in ad_requests]
    
    return JsonResponse({
        'ad_requests': requests_data
    })


@login_required
@require_POST
def adrequest_version_create(request):
    """
    Create a new AdRequestVersion instance and generate an image using OpenAI.
    
    Required input:
    - ad_request: The primary key of the AdRequest to create a version for
    
    Optional inputs:
    - user_prompt: The user prompt for the version
    
    Returns: JSON with the AdRequestVersion instance ID and image generation status
    """
    # Usando prints en lugar de loggers
    ad_request_id = request.POST.get('ad_request')
    print("ad_request_id: ", ad_request_id)
    # Validate inputs
    if not ad_request_id:
        return JsonResponse({'error': 'Ad request ID is required'}, status=400)
    
    try:
        # Get the AdRequest instance
        ad_request = get_object_or_404(AdRequest, id=ad_request_id)
        
        # Check if the user has permission to create a version for this request
        if ad_request.user != request.user:
            return JsonResponse({'error': 'You do not have permission to create a version for this request'}, status=403)
        
        # Check if user has available general credits for creating new versions
        if not can_create_ad_request(request.user):
            return JsonResponse({'error': 'You have reached your general credit limit for your plan'}, status=403)
        print("User has available credits")
        # Get optional fields
        user_prompt = request.POST.get('user_prompt')
        print("User prompt: ", user_prompt)

        # Create three AdRequestVersion instances for this AdRequest
        print("ad_request: ", ad_request)
        print("user_prompt: ", user_prompt)
        print("status: ", AdRequestVersion.STATUS_UNASSIGNED)

        versions = []
        for _ in range(3):
            v = AdRequestVersion.objects.create(
                ad_request=ad_request,
                user_prompt=user_prompt,
                status=AdRequestVersion.STATUS_UNASSIGNED,
                is_primary=True  # Mark initial versions as primary
            )
            versions.append(v)
            print("Version created: ", v)
            
            # Track event in PostHog when a new AdRequestVersion is created
            posthog.capture(
                request.user.id,
                'Ad Version Created',
                properties={
                    'version_type': 'initial',
                    'ad_request_id': ad_request.id,
                    'version_id': v.id,
                    'has_user_prompt': bool(user_prompt),
                    'timestamp': v.created_at.isoformat() if hasattr(v, 'created_at') else None
                }
            )
        # Generate image using OpenAI if user_prompt is provided
        image_generated = False
        task_id = None
        
        try:
            # Collect image URLs from AdRequest for context
            image_urls = []
            
            # First, check if ad_library has an image and add it if present
            if ad_request.ad_library and ad_request.ad_library.ad_image and ad_request.ad_library.ad_image.url:
                # Get the full URL for the ad_library image
                image_urls.append(request.build_absolute_uri(ad_request.ad_library.ad_image.url))
            # If user uploaded an image directly, use that
            elif ad_request.user_uploaded_image and ad_request.user_uploaded_image.url:
                image_urls.append(request.build_absolute_uri(ad_request.user_uploaded_image.url))
            
            # Check each image field and add to context if it exists
            image_fields = [
                'logo_override',
                'product_image_1_override',
                'product_image_2_override',
                'app_image_1_override',
                'app_image_2_override',
                'marketing_image_1_override',
                'marketing_image_2_override',
                'marketing_image_3_override'
            ]
            
            for field_name in image_fields:
                image_field = getattr(ad_request, field_name)
                if image_field and image_field.url:
                    # Get the full URL for the image
                    image_urls.append(request.build_absolute_uri(image_field.url))
            
            # Get canvas size from AdRequest
            canvas_size = ad_request.canvas_size or "1024x1024"
            
            # Generate image using Celery task in the background
            # Using Replicate instead of OpenAI
            from apps.aiinterface.tasks import generate_image_task_replicate

            # Update all versions status to processing
            for v in versions:
                v.status = "processing"
                v.save(update_fields=['status'])

            # Launch the Celery task for the three versions
            task = generate_image_task_replicate.delay(
                image_urls=image_urls,
                canvas_size=canvas_size,
                version_ids=[v.id for v in versions],
                ad_request_id=ad_request.id,
                version_type="initial"
            )
            
            task_id = task.id
            # Usamos la primera versión como referencia para el log
            print(f"Image generation task (ID: {task_id}) started for AdRequestVersion {versions[0].id}")
            
            # Credits will be deducted in the task after successful image generation
            
        except Exception as img_error:
            print(f"Error starting image generation task: {str(img_error)}")
        
        # Return the primary AdRequestVersion instance ID and image generation status
        response_data = {
            'id': versions[0].id,
            'version_ids': [v.id for v in versions],
            'status': versions[0].status,
            'image_generated': image_generated,
            'message': '3 versions created successfully. Image generation started in background.'
        }
        
        # Add task_id to response if available
        if task_id:
            response_data['task_id'] = task_id
        
        return JsonResponse(response_data, status=201)
        
    except Exception as e:
        print(f"Error in adrequest_version_create: {str(e)}")
        return JsonResponse({'error': str(e)}, status=500)


@login_required
@require_POST
def adrequest_revision_create(request):
    """
    Create a new AdRequestVersion instance and generate an image using OpenAI with a revision image.
    
    Required inputs:
    - ad_request: The primary key of the AdRequest to create a version for
    - url_image_revision: URL of the image to use for revision
    - user_prompt: The user prompt for the version
    - parent_version_id: The ID of the parent version (the version being revised)
    
    Returns: JSON with the AdRequestVersion instance ID and image generation status
    """
    # Usando prints en lugar de loggers
    ad_request_id = request.POST.get('ad_request')
    url_image_revision = request.POST.get('url_image_revision')
    user_prompt = request.POST.get('user_prompt')
    parent_version_id = request.POST.get('parent_version_id')
    
    # Validate inputs
    if not ad_request_id:
        return JsonResponse({'error': 'Ad request ID is required'}, status=400)
    
    if not url_image_revision:
        return JsonResponse({'error': 'Revision image URL is required'}, status=400)
    
    if not user_prompt:
        return JsonResponse({'error': 'User prompt is required'}, status=400)
    
    if not parent_version_id:
        return JsonResponse({'error': 'Parent version ID is required'}, status=400)
    
    try:
        # Get the AdRequest instance
        ad_request = get_object_or_404(AdRequest, id=ad_request_id)
        
        # Check if the user has permission to create a version for this request
        if ad_request.user != request.user:
            return JsonResponse({'error': 'You do not have permission to create a version for this request'}, status=403)
        
        # Check if user has available version credits for creating revisions
        if not can_create_ad_version(request.user):
            return JsonResponse({'error': 'You have reached your version credit limit for your plan'}, status=403)
        
        # Get the parent version
        parent_version = get_object_or_404(AdRequestVersion, id=parent_version_id)
        
        # Verify the parent version belongs to the same ad_request
        if parent_version.ad_request.id != ad_request.id:
            return JsonResponse({'error': 'Parent version does not belong to this ad request'}, status=400)
        
        # Create a new AdRequestVersion instance with is_primary=False and parent set
        version = AdRequestVersion.objects.create(
            ad_request=ad_request,
            user_prompt=user_prompt,
            status=AdRequestVersion.STATUS_UNASSIGNED,
            is_primary=False,
            parent=parent_version
        )
        print("Revision created: ", version)
        
        # Track event in PostHog when a new AdRequestVersion revision is created
        posthog.capture(
            request.user.id,
            'Ad Version Created',
            properties={
                'version_type': 'revision',
                'ad_request_id': ad_request.id,
                'version_id': version.id,
                'has_user_prompt': bool(user_prompt),
                'timestamp': version.created_at.isoformat() if hasattr(version, 'created_at') else None
            }
        )
        
        # Generate image using OpenAI if user_prompt is provided
        image_generated = False
        task_id = None
        
        try:
            # For revision, we use the provided revision image URL
            image_urls = [url_image_revision]
            
            # Add logo_override if it exists
            if ad_request.logo_override and ad_request.logo_override.url:
                image_urls.append(request.build_absolute_uri(ad_request.logo_override.url))
            
            # Get canvas size from AdRequest
            canvas_size = ad_request.canvas_size or "1024x1024"
            
            # Generate image using Celery task in the background
            # Using Replicate instead of OpenAI
            from apps.aiinterface.tasks import generate_image_task_replicate
            
            # Update version status to processing
            version.status = "processing"
            version.save(update_fields=['status'])
            
            # Launch the Celery task
            task = generate_image_task_replicate.delay(
                image_urls=image_urls,
                canvas_size=canvas_size,
                version_id=version.id,
                version_type="revision"
            )
            
            task_id = task.id
            print(f"Image revision task (ID: {task_id}) started for AdRequestVersion {version.id}")
            
            # Credits will be deducted in the task after successful image generation
            
            # Create AdCopyVersion and start ad copy text generation task
            try:
                from apps.ads.models import AdCopyVersion
                from apps.aiinterface.tasks import generate_ad_copy_text_task
                
                # Create AdCopyVersion instance
                ad_copy_version = AdCopyVersion.objects.create(
                    ad_request_version=version
                )
                print(f"AdCopyVersion created with ID: {ad_copy_version.id}")
                
                # Launch the ad copy text generation task
                copy_task = generate_ad_copy_text_task.delay(ad_copy_version.id)
                print(f"Ad copy text generation task (ID: {copy_task.id}) started for AdCopyVersion {ad_copy_version.id}")
                
            except Exception as copy_error:
                print(f"Error starting ad copy text generation task: {str(copy_error)}")
            
        except Exception as img_error:
            print(f"Error starting image revision task: {str(img_error)}")
        
        # Return the AdRequestVersion instance ID and image generation status
        response_data = {
            'id': version.id,
            'status': version.status,
            'image_generated': image_generated,
            'message': 'Revision version created successfully. Image generation started in background.'
        }
        
        # Add task_id to response if available
        if task_id:
            response_data['task_id'] = task_id
        
        return JsonResponse(response_data, status=201)
        
    except Exception as e:
        print(f"Error in adrequest_revision_create: {str(e)}")
        return JsonResponse({'error': str(e)}, status=500)

@login_required
@require_http_methods(["DELETE"])
def adrequest_delete(request, pk):
    """
    Delete an AdRequest instance.
    
    Args:
        request: The HTTP request
        pk: The primary key of the AdRequest to delete
        
    Returns:
        JsonResponse with success or error message
    """
    # Get the AdRequest instance and check permissions
    result = _get_user_adrequest(request, pk)
    
    # If result is a JsonResponse, it means there was an error
    if isinstance(result, JsonResponse):
        return result
    
    ad_request = result
    
    # Check if the AdRequest status is valid for deletion
    allowed_statuses = ['NEW', 'DRAFT', 'FILLED']
    if ad_request.status not in allowed_statuses:
        return JsonResponse({
            'error': f'Cannot delete ad request with status "{ad_request.status}". Only requests with status NEW, DRAFT, or FILLED can be deleted.'
        }, status=403)
    
    try:
        # Store the ID for the response
        adrequest_id = ad_request.id
        
        # Delete the AdRequest
        ad_request.delete()
        
        # Return success response
        return JsonResponse({
            'success': True,
            'message': f'Ad request {adrequest_id} has been deleted successfully'
        })
    except Exception as e:
        # Return error response
        return JsonResponse({
            'error': f'Failed to delete ad request: {str(e)}'
        }, status=500)

def get_user_credits(user):
    """
    Suma los créditos generales de AdRequestUsage y ExtraCredit para el usuario.
    Devuelve: dict con general_credits, max_general_credits, extra_general_credits
    """
    general_credits = 0
    plan_type = None
    is_free_tier = False
    
    try:
        # Si el usuario tiene suscripción activa, usar get_current_usage que maneja toda la lógica
        if user.has_active_subscription():
            usage = AdRequestUsage.get_current_usage(user)
            general_credits += getattr(usage, 'general_credits', 0)
            plan_type = getattr(usage, 'plan_type', None)
            is_free_tier = getattr(usage, 'is_free_tier', False)
        else:
            # Para usuarios sin suscripción, buscar el registro de free tier
            usage = AdRequestUsage.objects.filter(user=user, is_free_tier=True).first()
            
            # Si no hay registro free tier, crear uno
            if not usage:
                from apps.ads.models import AppConfiguration
                limits = AppConfiguration.get_limits()
                general_credits_default = limits.get('default', {}).get('general_credits', 5)
                version_credits_default = limits.get('default', {}).get('version_credits', 2)
                
                usage = AdRequestUsage.objects.create(
                    user=user,
                    billing_period_start=None,
                    billing_period_end=None,
                    is_free_tier=True,
                    general_credits=general_credits_default,
                    version_credits=version_credits_default  # Mantener para compatibilidad
                )
            
            if usage:
                general_credits += getattr(usage, 'general_credits', 0)
                plan_type = getattr(usage, 'plan_type', None)
                is_free_tier = getattr(usage, 'is_free_tier', False)
    except Exception:
        pass
    
    extra_general_credits = 0
    try:
        extra = ExtraCredit.objects.filter(user=user).first()
        if extra:
            extra_general_credits = getattr(extra, 'general_credits', 0)
    except Exception:
        pass
    
    # Obtener los límites del plan
    from apps.ads.models import AppConfiguration
    limits = AppConfiguration.get_limits()
    
    # Si es free tier o no tiene plan_type, usar límites default
    if is_free_tier or not plan_type:
        limits_key = 'default'
    else:
        limits_key = str(plan_type).lower() if str(plan_type).lower() in limits else 'default'
    
    plan_limits = limits.get(limits_key, limits['default'])
    
    return {
        'general_credits': general_credits,
        'max_general_credits': plan_limits['general_credits'],
        'extra_general_credits': extra_general_credits,
        'is_free_tier': is_free_tier
    }


def deduct_user_credits(user, general_credits_to_deduct):
    """
    Deduct general credits from user's account.
    First deducts from regular credits, then from extra credits if needed.
    
    Args:
        user: The user to deduct credits from
        general_credits_to_deduct: Number of general credits to deduct
        
    Returns:
        bool: True if successful, False if insufficient credits
    """
    try:
        from .models import AdRequestUsage, ExtraCredit
        
        # Get current usage record
        if user.has_active_subscription():
            usage = AdRequestUsage.get_current_usage(user)
        else:
            usage = AdRequestUsage.objects.filter(user=user, is_free_tier=True).first()
            if not usage:
                return False  # No credits available
        
        # Check if user has enough credits
        current_general = getattr(usage, 'general_credits', 0)
        extra_credit_obj = ExtraCredit.objects.filter(user=user).first()
        extra_general = getattr(extra_credit_obj, 'general_credits', 0) if extra_credit_obj else 0
        
        total_available = current_general + extra_general
        
        if total_available < general_credits_to_deduct:
            return False  # Insufficient credits
        
        # Deduct from regular credits first
        remaining_to_deduct = general_credits_to_deduct
        
        if current_general >= remaining_to_deduct:
            # Can deduct entirely from regular credits
            usage.general_credits = current_general - remaining_to_deduct
            usage.save()
        else:
            # Need to use extra credits too
            usage.general_credits = 0
            usage.save()
            
            remaining_to_deduct -= current_general
            
            # Deduct remaining from extra credits
            if extra_credit_obj and remaining_to_deduct > 0:
                extra_credit_obj.general_credits = max(0, extra_general - remaining_to_deduct)
                extra_credit_obj.save()
        
        return True
        
    except Exception as e:
        print(f"Error deducting user credits: {str(e)}")
        return False


def reward_user_for_rating(user):
    """
    Reward a user with credits for submitting a rating.
    Resets the user's free tier credits to the default values from AppConfiguration.
    
    Args:
        user: The user to reward
        
    Returns:
        dict: Dictionary with the updated credits information
    """
    try:
        # Get default credits from AppConfiguration
        from .models import AppConfiguration
        config = AppConfiguration.get_config()
        default_general_credits = config.default_general_credits
        default_version_credits = config.default_version_credits  # Mantener para compatibilidad
        
        # Get or create user's free tier usage record
        from .models import AdRequestUsage
        usage, created = AdRequestUsage.objects.get_or_create(
            user=user,
            is_free_tier=True,
            defaults={
                'general_credits': default_general_credits,
                'version_credits': default_version_credits  # Mantener para compatibilidad
            }
        )
        
        # If record already existed, update only general credits
        if not created:
            usage.general_credits = default_general_credits
            usage.save(update_fields=['general_credits'])
        
        return {
            'general_credits': usage.general_credits
        }
    except Exception as e:
        print(f"Error rewarding user for rating: {str(e)}")
        return None


def adrequest_version_rate(request):
    """
    Submit a rating and review for an AdRequestVersion.
    
    Required input:
    - version_id: The primary key of the AdRequestVersion to rate
    - rating: Integer rating from 1 to 5
    - review: Text review for the generated image
    
    Returns: JSON with success or error message
    """
    version_id = request.POST.get('version_id')
    rating = request.POST.get('rating')
    review = request.POST.get('review')
    
    # Validate inputs
    if not version_id:
        return JsonResponse({'error': 'Version ID is required'}, status=400)
    
    if not rating:
        return JsonResponse({'error': 'Rating is required'}, status=400)
    
    if not review:
        return JsonResponse({'error': 'Review is required'}, status=400)
    
    try:
        # Convert rating to integer
        rating = int(rating)
        if rating < 1 or rating > 5:
            return JsonResponse({'error': 'Rating must be between 1 and 5'}, status=400)
        
        # Get the AdRequestVersion instance
        version = get_object_or_404(AdRequestVersion, id=version_id)
        
        # Check if the user has permission to rate this version
        if version.ad_request.user != request.user:
            return JsonResponse({'error': 'You do not have permission to rate this version'}, status=403)
        
        # Update the version with rating and review
        version.rating = rating
        version.review = review
        version.save(update_fields=['rating', 'review'])
        
        # Track event in PostHog when a version is rated
        posthog.capture(
            request.user.id,
            'Ad Review',
            properties={
                'version_id': version.id,
                'ad_request_id': version.ad_request.id,
                'rating': rating,
                'review': review,  # Incluir el contenido completo de la revisión
                'review_length': len(review),
                'user_id': request.user.id,
                'username': request.user.username,
                'timestamp': timezone.now().isoformat()
            }
        )
        
        # Reward the user with credits for submitting a rating
        credits_info = reward_user_for_rating(request.user)
        
        # Return success response with credits info
        response_data = {
            'success': True,
            'message': 'Rating submitted successfully. Your credits have been replenished!',
            'version_id': version.id,
            'rating': rating
        }
        
        # Add credits info to response if available
        if credits_info:
            response_data['credits'] = credits_info
            
        return JsonResponse(response_data)
        
    except ValueError:
        return JsonResponse({'error': 'Invalid rating format'}, status=400)
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=500)


@login_required
def adrequest_version_get(request, version_id):
    """
    Get details of an AdRequestVersion including ad_copy_text.
    Used for polling to check if ad copy text is ready.
    
    Returns: JSON with version details
    """
    try:
        # Get the AdRequestVersion instance
        version = get_object_or_404(AdRequestVersion, id=version_id)
        
        # Check if the user has permission to view this version
        if version.ad_request.user != request.user:
            return JsonResponse({'error': 'You do not have permission to view this version'}, status=403)
        
        # Get the first AdCopyVersion if it exists
        ad_copy_version = version.ad_copies.first()
        ad_copy_text = ad_copy_version.ad_copy_text if ad_copy_version else None
        
        # Return version data
        return JsonResponse({
            'id': version.id,
            'status': version.status,
            'ad_copy_text': ad_copy_text,
            'generated_image': version.generated_image.url if version.generated_image else None,
        })
        
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=500)

def billing_page(request):
    """
    Render the billing page with pricing information.
    """
    from apps.subscriptions.metadata import get_active_products_with_metadata, PlanInterval
    from django.conf import settings
    logger = logging.getLogger(__name__)
    
    # Check if we're in BETA pricing mode
    is_beta_pricing = settings.PRICING_MODEL == 'BETA'
    
    # Get products from the metadata system
    products_with_metadata = list(get_active_products_with_metadata())
    
    # Map product slugs to tier names and CTAs
    product_mapping = {
        'pro': {
            'display_name': 'Pro',
            'cta': 'Upgrade to Pro',
            'highlighted': True,
            'popular': True,
            "is_current_plan": False
        },
        'starter': {
            'display_name': 'Starter',
            'cta': 'Upgrade to Starter',
            'highlighted': False,
            'popular': False,
            "is_current_plan": False
        }
        # Enterprise plan will be added manually
    }
    
    # Separar los productos en planes y paquetes
    subscription_products = []
    package_products = []
    
    for product in products_with_metadata:
        # Identificar si es un paquete por el slug
        if product.metadata.slug.startswith('package-'):
            package_products.append(product)
        else:
            subscription_products.append(product)
    
    # Initialize pricing data
    pricing_data = {
        "title": "Pricing Plans",
        "subtitle": "Choose the perfect plan for your needs",
        "frequencies": [],  # Will be set after determining available products
        "tiers": [],
        "usagePackages": []
    }
    
    # Initialize tiers with empty array if in BETA mode
    if is_beta_pricing:
        # Clear any existing tiers
        pricing_data["tiers"] = []
        
        # Add Beta plan
        beta_plan = {
            "name": "Beta",
            "description": "Perfect for testing Ad Heist with your first campaigns",
            "price": {
                "monthly": 0
            },
            "features": [
                "Search 1M+ Ads Library",
                "Unlimited Ads (Providing Feedback)",
                "20 BrandKits",
                "5 GB of assets"
            ],
            "cta": "Current Plan",
            "highlighted": False,
            "popular": False,
            "is_current_plan": True,
            "is_disabled": False,
            "cancel_at_period_end": False,
            "current_period_end": None
        }
        pricing_data["tiers"].append(beta_plan)
    
    # Construir usagePackages con los package_products solo si no estamos en modo BETA
    if not is_beta_pricing:
        for product in package_products:
            # Obtener el precio para el paquete
            # Intentamos obtener un precio activo para el producto
            try:
                # Primero intentamos obtener el precio usando el método _get_price
                price = product._get_price(None, fail_hard=False)
                
                if not price:
                    # Si no hay precio con _get_price, intentamos obtener cualquier precio activo
                    from djstripe.models import Price
                    prices = Price.objects.filter(product=product.product.id, active=True)
                    if prices.exists():
                        price = prices.first()
                
                if price:
                    package = {
                        "name": product.metadata.name,
                        "description": product.metadata.description,
                        "price": int(price.unit_amount / 100),
                        "priceId": price.id,  # ID dinámico desde Stripe
                        "features": product.metadata.features,
                        "cta": "Buy Package",
                        "highlighted": product.metadata.slug == "package-2",
                        "popular": product.metadata.slug == "package-2"
                    }
                    pricing_data["usagePackages"].append(package)
            except Exception as e:
                logger.error(f"Error obteniendo precio para paquete {product.metadata.slug}: {str(e)}")
    
    # Configure frequencies based on available products
    if is_beta_pricing:
        pricing_data["frequencies"] = ["monthly"]
    else:
        # Always include monthly
        pricing_data["frequencies"] = ["monthly"]
        # Only add usage tab if there are usage packages available
        if len(pricing_data["usagePackages"]) > 0:
            pricing_data["frequencies"].append("usage")
    
    # Get current user's subscription plan ID if available
    current_plan_id = None
    current_plan_name = None
    
    # Define the hierarchy of plans (including Free for reference)
    tier_order = ["Free", "Starter", "Pro"]
    # Define the hierarchy of plans without Free for the billing page
    tier_order_without_free = ["Starter", "Pro"]
    
    if request.user.is_authenticated and request.user.has_active_subscription():
        current_plan_id = request.user.active_stripe_subscription.plan.product.id
        print("Current plan:", request.user.active_stripe_subscription)
        
        # Get all user subscriptions from Stripe to find the highest tier
        if request.user.customer:
            from djstripe.models import Subscription
            from apps.subscriptions.helpers import subscription_is_active
            
            # Get all active subscriptions for this customer
            active_subscriptions = []
            subscriptions = Subscription.objects.filter(customer=request.user.customer)
            
            for sub in subscriptions:
                if subscription_is_active(sub):
                    active_subscriptions.append(sub)
                    print(f"Active subscription found: {sub.plan.product.name}")
            
            # Find the highest tier subscription
            highest_tier_position = -1
            highest_tier_sub = None
            
            for sub in active_subscriptions:
                product_name = sub.plan.product.name
                # Try to match with our tier names
                for tier_name in tier_order:
                    if tier_name.lower() in product_name.lower():
                        tier_position = tier_order.index(tier_name)
                        if tier_position > highest_tier_position:
                            highest_tier_position = tier_position
                            highest_tier_sub = sub
                            current_plan_name = tier_name
            
            if highest_tier_sub:
                current_plan_id = highest_tier_sub.plan.product.id
                print(f"Highest tier subscription: {current_plan_name}")
    # Add tiers from metadata only if not in BETA pricing mode
    if not is_beta_pricing:
        for product in subscription_products:
            slug = product.metadata.slug
            if slug in product_mapping:
                # Get prices
                monthly_price = product._get_price(PlanInterval.month, fail_hard=False)
                # No more yearly prices
                
                # Check if this is the current plan
                is_current_plan = current_plan_id == product.product.id
                
                # Get subscription details if this is the current plan
                cancel_at_period_end = False
                current_period_end = None
                if is_current_plan and highest_tier_sub:
                    cancel_at_period_end = highest_tier_sub.cancel_at_period_end or False
                    current_period_end = highest_tier_sub.current_period_end.isoformat() if highest_tier_sub.current_period_end else None
                
                # Check if this plan should be disabled (user has a higher tier plan)
                is_disabled = False
                if current_plan_name:
                    try:
                        current_tier_position = tier_order.index(current_plan_name) if current_plan_name in tier_order else -1
                        this_tier_position = tier_order.index(product_mapping[slug]['display_name']) if product_mapping[slug]['display_name'] in tier_order else -1
                        
                        # Disable if this plan is lower tier than current plan
                        if this_tier_position < current_tier_position:
                            is_disabled = True
                    except (ValueError, IndexError):
                        # If there's an error with tier positions, don't disable the plan
                        is_disabled = False
                
                # Format price display
                price_data = {}
                if monthly_price:
                    try:
                        price_data["monthly"] = int(monthly_price.unit_amount / 100)
                    except (TypeError, ValueError):
                        price_data["monthly"] = product.get_price_display(monthly_price)
                else:
                    price_data["monthly"] = "Custom"
                    
                # No more yearly prices
                
                # Add price IDs to price data
                if monthly_price:
                    price_data["monthlyPriceId"] = monthly_price.id
                # No more yearly price IDs
                
                # Create tier data
                tier = {
                    "name": product_mapping[slug]['display_name'],
                    "description": product.metadata.description or f"For {product_mapping[slug]['display_name']} users",
                    "price": price_data,
                    "features": product.metadata.features,
                    "cta": product_mapping[slug]["cta"],
                    "highlighted": product_mapping[slug]["highlighted"],
                    "popular": product_mapping[slug]["popular"],
                    "is_current_plan": is_current_plan,
                    "is_disabled": is_disabled,
                    "cancel_at_period_end": cancel_at_period_end,
                    "current_period_end": current_period_end
                }
                
                pricing_data["tiers"].append(tier)
    
    # Enterprise plan has been removed
    
    # Sort tiers based on pricing mode
    if is_beta_pricing:
        # No need to sort with only one tier
        pass
    else:
        # Sort tiers in the correct order: Starter, Pro
        tier_order_without_free = ["Starter", "Pro"]
        pricing_data["tiers"] = sorted(
            pricing_data["tiers"], 
            key=lambda x: tier_order_without_free.index(x["name"]) if x["name"] in tier_order_without_free else 999
        )
        
    # Get payment method information if user has a subscription
    payment_method_data = {
        "has_payment_method": False,
        "payment_method": None,
        "portal_url": None
    }
    
    if request.user.is_authenticated and request.user.has_active_subscription() and request.user.customer:
        from apps.subscriptions.helpers import create_stripe_portal_session
        from apps.utils.billing import get_stripe_module
        from djstripe.models import PaymentMethod
        
        # Get the default payment method
        try:
            # Try to get the default payment method from Stripe
            stripe = get_stripe_module()
            
            # First, get the customer without expanding anything
            customer = stripe.Customer.retrieve(request.user.customer.id)
            print(f"Customer data: {customer}")
            print(f"Customer ID: {request.user.customer.id}")
            
            # Get payment method ID from invoice_settings.default_payment_method or from the first available payment method
            payment_method_id = None
            
            # First check invoice_settings.default_payment_method
            if customer.get('invoice_settings', {}).get('default_payment_method'):
                payment_method_id = customer['invoice_settings']['default_payment_method']
                print(f"Default payment method ID from invoice_settings: {payment_method_id}")
            # Then check direct default_payment_method (for backwards compatibility)
            elif customer.get('default_payment_method'):
                payment_method_id = customer['default_payment_method']
                print(f"Default payment method ID: {payment_method_id}")
            # If no default payment method, try to get the first available payment method
            else:
                print("No default payment method found, checking available payment methods")
                payment_methods = stripe.PaymentMethod.list(
                    customer=request.user.customer.id,
                    type="card",
                    limit=1
                )
                print(f"Available payment methods: {payment_methods}")
                
                if payment_methods and payment_methods.get('data') and len(payment_methods['data']) > 0:
                    payment_method_id = payment_methods['data'][0]['id']
                    print(f"Using first available payment method: {payment_method_id}")
            
            # If we found a payment method ID, get its details and format the data
            if payment_method_id:
                payment_method = stripe.PaymentMethod.retrieve(payment_method_id)
                print(f"Payment method data: {payment_method}")
                
                payment_method_data = {
                    "has_payment_method": True,
                    "payment_method": {
                        "type": payment_method.get('type', 'card'),
                        "card": {
                            "brand": payment_method.get('card', {}).get('brand', 'unknown'),
                            "last4": payment_method.get('card', {}).get('last4', '****'),
                            "exp_month": payment_method.get('card', {}).get('exp_month', 12),
                            "exp_year": payment_method.get('card', {}).get('exp_year', 2025)
                        }
                    }
                }
                print(f"Payment method data formatted: {payment_method_data}")
            else:
                print("No payment method found for customer")
                
                # Create a portal session URL
                try:
                    portal_session = create_stripe_portal_session(request.user)
                    payment_method_data["portal_url"] = portal_session.url
                except Exception as e:
                    logger.error(f"Error creating portal session: {str(e)}")
        except Exception as e:
            logger.error(f"Error retrieving payment method: {str(e)}")
    
    # Convert pricing data to JSON for the React component
    pricing_json = json.dumps(pricing_data)
    payment_method_json = json.dumps(payment_method_data)

    # Recuperar usage combinando créditos de AdRequestUsage y ExtraCredit
    usage = get_user_credits(request.user) if request.user.is_authenticated else {"general_credits": 0, "version_credits": 0}
    usage_json = json.dumps(usage)

    print(f"Pricing data: {pricing_json}")
    print(f"Payment method data: {payment_method_json}")
    print(f"Usage: {usage_json}")

    return render(request, 'ads/billing.html', {
        "active_tab": "billing",
        "pricing_data": pricing_json,
        "payment_method_data": payment_method_json,
        "usage_data": usage_json
    })


@login_required
def get_user_invoices(request):
    """
    Obtiene las facturas del usuario desde Stripe y las devuelve como JSON.
    """


@login_required
def proxy_image_download(request):
    """
    Proxy endpoint for downloading images from S3.
    This solves CORS issues by fetching the image through the backend.
    
    GET parameters:
    - url: The S3 URL to download (can be a pre-signed URL).
    - filename: Optional filename for the downloaded file.
    
    Returns:
    - HTTP response with the image content and appropriate headers for download.
    """
    url = request.GET.get('url')
    filename = request.GET.get('filename', 'image.jpg')
    
    if not url:
        return JsonResponse({'error': 'Missing URL parameter'}, status=400)
    
    try:
        # Check if this is an S3 URL
        if 'adheist-s3.s3.amazonaws.com' in url:
            # Parse the URL to extract the key
            parsed_url = urllib.parse.urlparse(url)
            path = parsed_url.path.lstrip('/')
            
            # If the URL contains /media/, it's using our standard path structure
            if path.startswith('media/'):
                # Create a boto3 client
                s3_client = boto3.client(
                    's3',
                    region_name=getattr(settings, 'AWS_S3_REGION_NAME', 'us-east-2'),
                    aws_access_key_id=settings.AWS_ACCESS_KEY_ID,
                    aws_secret_access_key=settings.AWS_SECRET_ACCESS_KEY,
                )
                
                # Get the object directly from S3
                response = s3_client.get_object(
                    Bucket=getattr(settings, 'AWS_STORAGE_BUCKET_NAME', 'adheist-s3'),
                    Key=path
                )
                
                # Get the content type from the response
                content_type = response.get('ContentType', 'application/octet-stream')
                
                # Create the HTTP response with the file content
                http_response = HttpResponse(
                    response['Body'].read(),
                    content_type=content_type
                )
            else:
                # For other S3 URLs, use requests to fetch the content
                response = requests.get(url)
                response.raise_for_status()
                
                # Create the HTTP response with the file content
                http_response = HttpResponse(
                    response.content,
                    content_type=response.headers.get('Content-Type', 'application/octet-stream')
                )
        else:
            # For non-S3 URLs, use requests to fetch the content
            response = requests.get(url)
            response.raise_for_status()
            
            # Create the HTTP response with the file content
            http_response = HttpResponse(
                response.content,
                content_type=response.headers.get('Content-Type', 'application/octet-stream')
            )
        
        # Set headers for file download
        http_response['Content-Disposition'] = f'attachment; filename="{filename}"'
        
        return http_response
        
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=500)


def get_user_invoices(request):
    """
    Obtiene las facturas del usuario desde Stripe y las devuelve como JSON.
    """
    from apps.utils.billing import get_stripe_module
    import logging
    
    logger = logging.getLogger(__name__)
    
    # Verificar si el usuario tiene un cliente en Stripe
    if not hasattr(request.user, 'customer') or not request.user.customer:
        return JsonResponse({
            'invoices': [],
            'message': 'No hay facturas disponibles.'
        })
    
    try:
        stripe = get_stripe_module()
        
        # Obtener todas las facturas del cliente desde Stripe (no solo las pagadas)
        invoices = stripe.Invoice.list(
            customer=request.user.customer.id,
            limit=25  # Limitar a las 25 facturas más recientes
        )
        
        # Formatear los datos de las facturas para el frontend de manera segura
        invoice_data = []
        for invoice in invoices.data:
            try:
                # Extraer datos básicos de la factura de manera segura
                invoice_item = {
                    'id': invoice.id,
                    'number': getattr(invoice, 'number', invoice.id),
                    'created': getattr(invoice, 'created', None),
                    'period_start': getattr(invoice, 'period_start', None),
                    'period_end': getattr(invoice, 'period_end', None),
                    'total': getattr(invoice, 'total', 0),
                    'currency': getattr(invoice, 'currency', 'eur'),
                    'status': getattr(invoice, 'status', 'unknown'),
                    'invoice_pdf': getattr(invoice, 'invoice_pdf', None),
                    'hosted_invoice_url': getattr(invoice, 'hosted_invoice_url', None),
                    'subscription_id': None  # Valor por defecto
                }
                
                # Intentar obtener el ID de suscripción si existe
                if hasattr(invoice, 'subscription'):
                    # La suscripción puede ser un string (ID) o un objeto
                    if isinstance(invoice.subscription, str):
                        invoice_item['subscription_id'] = invoice.subscription
                    else:
                        # Es un objeto, intentar obtener su ID
                        invoice_item['subscription_id'] = getattr(invoice.subscription, 'id', None)
                
                invoice_data.append(invoice_item)
            except Exception as item_error:
                # Registrar el error pero continuar con otras facturas
                logger.error(f"Error procesando factura {invoice.id}: {str(item_error)}")
                continue
        
        return JsonResponse({
            'invoices': invoice_data
        })
    except Exception as e:
        logger.error(f"Error obteniendo facturas: {str(e)}")
        return JsonResponse({
            'error': str(e),
            'invoices': []
        }, status=400)


@require_POST
@login_required
def toggle_favorite(request):
    """
    Toggle the is_fav status of an AdLibrary item.
    Only staff users can toggle favorite status.
    
    POST Parameters:
    - id: The ID of the AdLibrary item to toggle favorite status
    
    Returns: JSON with success status and updated is_fav value
    """
    try:
        if not request.user.is_staff:
            return JsonResponse({'error': 'Permission denied'}, status=403)
        
        data = json.loads(request.body)
        item_id = data.get('adlibrary_id')
        
        if not item_id:
            return JsonResponse({'error': 'Missing adlibrary_id parameter'}, status=400)
        
        # Check if the ID contains a separator (original_id format)
        if '_' in str(item_id):
            # Extract the actual ID from the format
            item_id = item_id.split('_')[0]
        
        # Get the AdLibrary item
        item = get_object_or_404(AdLibrary, pk=item_id)
        
        # Toggle the is_fav status
        item.is_fav = not item.is_fav
        item.save()
        
        return JsonResponse({
            'success': True,
            'id': item.id,
            'is_fav': item.is_fav
        })
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=500)


@csrf_exempt
@require_POST
@login_required
def request_brand(request):
    """
    Handle brand request, create FacebookPage, Backload and trigger automatic extraction.
    
    POST Parameters:
    - brand_url: URL of the brand to request
    
    Returns: JSON with success status
    """
    try:
        from apps.apify.models import FacebookPage, Backload
        from apps.apify.tasks import fetch_apify_ads
        
        data = json.loads(request.body)
        brand_url = data.get('brand_url')
        
        if not brand_url:
            return JsonResponse({'success': False, 'error': 'Brand URL is required'}, status=400)
        
        # Extract Facebook Page ID from URL
        facebook_page_id = None
        if 'view_all_page_id=' in brand_url:
            try:
                import re
                match = re.search(r'view_all_page_id=([0-9]+)', brand_url)
                if match:
                    facebook_page_id = match.group(1)
            except Exception as e:
                logging.warning(f"Failed to extract Facebook Page ID: {str(e)}")
        
        if not facebook_page_id:
            return JsonResponse({
                'success': False, 
                'error': 'Could not extract Facebook Page ID from URL'
            }, status=400)
        
        # Step 1: Create or get FacebookPage
        facebook_page, created = FacebookPage.objects.get_or_create(
            page_id=facebook_page_id,
            defaults={
                'is_active': True
            }
        )
        
        if not created:
            # Page already exists, check if there's a pending backload
            return JsonResponse({
                'success': False,
                'error': 'This advertiser is already in our system or being processed'
            }, status=400)
        
        # Step 2: Create Backload with default values
        backload = Backload.objects.create(
            status=Backload.STATUS_PENDING,
            ad_active_status=Backload.AD_ACTIVE,
            ad_reached_countries='ALL',
            content_languages='en',
            media_types=Backload.MEDIA_TYPE_IMAGE_AND_MEME,
            last_run=timezone.now()
        )
        
        # Associate the FacebookPage with the Backload
        backload.pages.add(facebook_page)
        
        # Step 3: Execute fetch command automatically
        output_dir = f"meta_ads_results_backload_{backload.pk}_{facebook_page_id}"
        backload.output_file = output_dir
        backload.save(update_fields=['output_file'])
        
        # Construct URL for the page
        url = backload.get_facebook_ads_url_for_page(facebook_page_id)
        
        # Launch Celery task in background with automated flag
        fetch_apify_ads.delay(
            output_dir=output_dir,
            urls=[{'url': url}],
            page_id=facebook_page_id,
            backload_id=backload.pk,
            is_automated=True,
            user_id=request.user.id
        )
        
        # Send Slack notification for tracking
        user_email = request.user.email
        title = "New Brand Request - Auto Processing"
        message = f"A user requested a new brand and automatic extraction has been initiated"
        
        context = {
            'user_email': user_email,
            'brand_url': brand_url,
            'facebook_page_id': facebook_page_id,
            'backload_id': backload.pk,
            'timestamp': str(timezone.now())
        }
        
        send_slack_notification(message, context, title)
        
        return JsonResponse({
            'success': True,
            'backload_id': backload.pk,
            'facebook_page_id': facebook_page_id
        })
        
    except Exception as e:
        logging.error(f"Error processing brand request: {str(e)}")
        return JsonResponse({'success': False, 'error': str(e)}, status=500)


@login_required
@require_http_methods(["GET"])
def get_user_brands(request):
    """
    Get all brands associated with the current user.
    
    Returns: JSON with list of user brands
    """
    try:
        # Get all active brands for the current user
        brands = UserBrand.objects.filter(user=request.user, active=True).order_by('brand_name')
        
        # Format the brands as a list of dictionaries
        brands_data = [{
            'id': brand.id,
            'name': brand.brand_name
        } for brand in brands]
        
        return JsonResponse({
            'success': True,
            'brands': brands_data
        })
    except Exception as e:
        logging.error(f"Error retrieving user brands: {str(e)}")
        return JsonResponse({
            'success': False,
            'error': str(e)
        })


@login_required
@require_http_methods(["GET"])
def get_user_containers(request):
    """
    Get all containers (brands + folders) associated with the current user.
    
    Returns: JSON with list of user containers (brands and root folders)
    """
    try:
        containers_data = []
        
        # Get all active brands for the current user
        # Note: This shows all user's brands, even if they don't have uploaded assets yet
        user_brands = UserBrand.objects.filter(
            user=request.user,
            active=True  # Only show active brands
        ).order_by('brand_name')
        
        # Add brands
        for brand in user_brands:
            brand_info = {
                'id': brand.id,
                'name': brand.brand_name,
                'type': 'brand',
                'created_at': brand.created_at.isoformat() if brand.created_at else None,
            }
            containers_data.append(brand_info)
        
        # Get all root folders (folders without parent and without brand) for the current user
        user_folders = UserFolder.objects.filter(
            user=request.user,
            parent_folder__isnull=True,  # Only root folders
            brand__isnull=True  # Exclude brand-specific folders
        ).order_by('folder_name')
        
        # Add root folders
        for folder in user_folders:
            folder_info = {
                'id': folder.id,
                'name': folder.folder_name,
                'type': 'folder',
                'full_path': folder.full_path,
                'created_at': folder.created_at.isoformat() if folder.created_at else None,
            }
            containers_data.append(folder_info)
        
        # Sort containers by name
        containers_data.sort(key=lambda x: x['name'].lower())
        
        return JsonResponse({
            'success': True,
            'containers': containers_data
        })
    except Exception as e:
        logging.error(f"Error retrieving user containers: {str(e)}")
        return JsonResponse({
            'success': False,
            'error': str(e)
        })


@login_required
@require_http_methods(["POST"])
def create_user_brand(request):
    """
    Create a new brand for the current user and associated AdRequestAssets.
    
    Expected POST data:
    - brand_name: Name of the brand to create
    - industry: Industry/Vertical (optional)
    - website: Brand website (optional)
    - product_description: Product/Service description (optional)
    - target_audience: Target audience description (optional)
    - functional_benefits: Functional benefits (optional)
    - brand_colors: Array of brand colors in hex format (optional)
    - tone_of_voice: Tone of voice (optional)
    - font_direction: Font direction (optional)
    - core_features: Core features (optional)
    - emotional_lifestyle_benefits: Emotional/Lifestyle benefits (optional)
    - proof_points: Proof points (optional)
    - value_propositions: Value propositions (optional)
    - logo_file: Logo image file (optional)
    
    Returns: JSON with the created brand data
    """
    try:
        # Handle multipart form data for file upload
        if request.content_type.startswith('multipart/form-data'):
            data = request.POST.dict()
            logo_file = request.FILES.get('logo_file')
            # Parse brand_colors if it's a JSON string
            brand_colors_str = data.get('brand_colors')
            if brand_colors_str:
                try:
                    data['brand_colors'] = json.loads(brand_colors_str)
                except json.JSONDecodeError:
                    data['brand_colors'] = []
        else:
            # Handle JSON data
            data = json.loads(request.body)
            logo_file = None
        
        brand_name = data.get('brand_name')
        
        if not brand_name:
            return JsonResponse({
                'success': False,
                'error': 'Brand name is required'
            }, status=400)
        
        # Check if brand with this name already exists for this user (only active brands)
        if UserBrand.objects.filter(user=request.user, brand_name=brand_name, active=True).exists():
            return JsonResponse({
                'success': False,
                'error': 'You already have an active brand with this name. Please choose a different name.'
            }, status=400)
        
        # Create the new brand (simple, just name)
        brand = UserBrand.objects.create(
            user=request.user,
            brand_name=brand_name
        )
        
        # Handle logo upload if provided
        logo_asset = None
        if logo_file:
            logo_asset = UserBrandAssets.objects.create(
                user=request.user,
                brand=brand,
                image=logo_file,
                category='logo',
                original_filename=logo_file.name,
                file_size=logo_file.size
            )
        
        # Create associated AdRequestAssets with all brand data
        ad_request_assets = AdRequestAssets.objects.create(
            user=request.user,
            brand=brand,
            company_website=data.get('website'),
            logo=logo_asset.image if logo_asset else None,
            main_hex_color=json.dumps(data.get('brand_colors', [])) if data.get('brand_colors') else None,
            industry=data.get('industry'),
            product_description=data.get('product_description'),
            target_audience=data.get('target_audience'),
            functional_benefits=data.get('functional_benefits'),
            tone_of_voice=data.get('tone_of_voice'),
            font_direction=data.get('font_direction'),
            core_features=data.get('core_features'),
            emotional_lifestyle_benefits=data.get('emotional_lifestyle_benefits'),
            proof_points=data.get('proof_points'),
            value_propositions=data.get('value_propositions')
        )
        
        return JsonResponse({
            'success': True,
            'brand': {
                'id': brand.id,
                'name': brand.brand_name,
                'industry': ad_request_assets.industry,
                'website': ad_request_assets.company_website,
                'product_description': ad_request_assets.product_description,
                'target_audience': ad_request_assets.target_audience,
                'functional_benefits': ad_request_assets.functional_benefits,
                'brand_colors': ad_request_assets.main_hex_color,
                'tone_of_voice': ad_request_assets.tone_of_voice,
                'font_direction': ad_request_assets.font_direction,
                'core_features': ad_request_assets.core_features,
                'emotional_lifestyle_benefits': ad_request_assets.emotional_lifestyle_benefits,
                'proof_points': ad_request_assets.proof_points,
                'value_propositions': ad_request_assets.value_propositions,
                'logo_url': logo_asset.image.url if logo_asset else None,
                'ad_request_assets_id': ad_request_assets.id
            }
        })
    except Exception as e:
        logging.error(f"Error creating user brand: {str(e)}")
        return JsonResponse({
            'success': False,
            'error': str(e)
        }, status=500)


@require_POST
@login_required
def deactivate_image(request):
    """
    Deactivate (soft delete) an AdLibrary item.
    Only staff users can deactivate images.
    
    POST Parameters:
    - id: The ID of the AdLibrary item to deactivate
    
    Returns: JSON with success status
    """
    try:
        if not request.user.is_staff:
            return JsonResponse({'error': 'Permission denied'}, status=403)
        
        data = json.loads(request.body)
        item_id = data.get('adlibrary_id')
        
        if not item_id:
            return JsonResponse({'error': 'Missing adlibrary_id parameter'}, status=400)
        
        # Check if the ID contains a separator (original_id format)
        if '_' in str(item_id):
            # Extract the actual ID from the format
            item_id = item_id.split('_')[0]
        
        # Get the AdLibrary item
        item = get_object_or_404(AdLibrary, pk=item_id)
        
        # Mark the item as inactive instead of deleting it
        item.is_active = False
        item.save()
        
        return JsonResponse({
            'success': True,
            'id': item_id,
            'message': 'Image deactivated successfully'
        })
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=500)

@onboarding_required
@login_required
def discover_clone_adrequest_page(request, pk):
    """
    Page for cloning an AdRequest from discover page.
    Shows the selected ad reference and allows creating a new ad based on it.
    Only accessible if the AdRequest is in DRAFT status.
    """
    try:
        # Get the AdRequest and verify user permissions
        ad_request = get_object_or_404(AdRequest, id=pk, user=request.user)
        
        # Validate that the AdRequest is in DRAFT status only
        if ad_request.status != 'DRAFT':
            # If not in DRAFT status, redirect to discover page
            return redirect('ads:discover_page')
        
        # Determine the back URL based on where the user came from
        back_url = '/ads/discover/'  # Default fallback
        referer = request.META.get('HTTP_REFERER', '')
        
        if referer:
            # Check if user came from My Ads page
            if '/ads/my-ads/' in referer:
                back_url = '/ads/my-ads/'
            # Check if user came from discover page (keep default)
            elif '/ads/discover/' in referer:
                back_url = '/ads/discover/'
            # For any other referrer, try to use it if it's from our domain
            elif request.get_host() in referer:
                # Extract the path from the referer URL
                from urllib.parse import urlparse
                parsed_referer = urlparse(referer)
                if parsed_referer.path and parsed_referer.path.startswith('/ads/'):
                    back_url = parsed_referer.path
        
        # Get brand assets generation cost from AppConfiguration
        app_config = AppConfiguration.get_config()
        brand_assets_cost = app_config.brand_assets_generation_cost if app_config else 4
        ad_generation_cost = app_config.ad_generation_credit_cost if app_config else 1
        
        context = {
            'ad_request': ad_request,
            'page_title': 'Clone Ad',
            'page_description': 'New ads follow the style & composition of the ad reference on the left.',
            'back_url': back_url,
            'brand_assets_cost': brand_assets_cost,
            'ad_generation_cost': ad_generation_cost,
        }
        
        return render(request, 'ads/discover_clone.html', context)
        
    except AdRequest.DoesNotExist:
        return redirect('ads:discover_page')

@onboarding_required
@login_required
def my_ads_page(request):
    """
    Render the My Ads page with React components.
    Shows all AdRequests created by the current user as individual cards,
    using the generated_image from the most recent AdRequestVersion as the card image.
    """
    # Get all AdRequests for the current user with their versions
    ad_requests = AdRequest.objects.filter(user=request.user).prefetch_related(
        'versions'
    ).order_by('-updated_at')
    
    # Prepare data for frontend - one card per AdRequest
    my_ads_data = []
    for ad_request in ad_requests:
        # Get brand information
        brand_name = None
        if hasattr(ad_request, 'base_assets') and ad_request.base_assets and ad_request.base_assets.brand:
            brand_name = ad_request.base_assets.brand.brand_name
        
        # Get the most recent version for this AdRequest
        latest_version = ad_request.versions.order_by('-created_at').first()
        
        # Prepare card data for this AdRequest
        ad_request_card_data = {
            # AdRequest data
            'ad_request_id': ad_request.id,
            'ad_request_status': ad_request.status,
            'canvas_size': ad_request.canvas_size,
            'ad_request_created_at': ad_request.created_at.isoformat() if ad_request.created_at else None,
            'ad_request_updated_at': ad_request.updated_at.isoformat() if ad_request.updated_at else None,
            'brand_name': brand_name,
            'ad_library_name': ad_request.ad_library.facebook_page.page_name if ad_request.ad_library else None,
            
            # Version data from most recent version (if exists)
            'version_id': latest_version.id if latest_version else None,
            'version_status': latest_version.status if latest_version else None,
            'image_url': latest_version.generated_image.url if latest_version and latest_version.generated_image else None,
            'version_created_at': latest_version.created_at.isoformat() if latest_version and latest_version.created_at else None,
            'user_prompt': latest_version.user_prompt if latest_version else None,
            'rating': latest_version.rating if latest_version else None,
            'review': latest_version.review if latest_version else None,
            
            # Card type identifier - now all are adrequest cards
            'card_type': 'adrequest',
        }
        my_ads_data.append(ad_request_card_data)
    
    # Sort by most recent activity (ad_request updated_at)
    my_ads_data.sort(key=lambda x: x['ad_request_updated_at'] or '', reverse=True)
    
    # Convert to JSON for frontend
    my_ads_json = json.dumps(my_ads_data, cls=DjangoJSONEncoder)
    
    template = "ads/my-ads.html"
    context = {
        "active_tab": "my-ads",
        "my_ads_data": my_ads_json,
    }
    
    return TemplateResponse(request, template, context)

@onboarding_required
@login_required
def assets_page(request):
    """
    Render the Assets page with React components.
    Shows all UserBrands and UserFolders for the current user as containers.
    """
    # Get all active brands for the current user
    # Note: This shows all user's brands, even if they don't have uploaded assets yet
    user_brands = UserBrand.objects.filter(
        user=request.user,
        active=True  # Only show active brands
    ).order_by('brand_name')
    
    # Get all root folders (folders without parent and without brand) for the current user
    user_folders = UserFolder.objects.filter(
        user=request.user,
        parent_folder__isnull=True,  # Only root folders
        brand__isnull=True  # Exclude brand-specific folders
    ).order_by('folder_name')
    
    # Prepare containers data for frontend (brands + folders)
    containers_data = []
    
    # Add brands
    for brand in user_brands:
        brand_info = {
            'id': brand.id,
            'name': brand.brand_name,
            'type': 'brand',
            'created_at': brand.created_at.isoformat() if brand.created_at else None,
        }
        containers_data.append(brand_info)
    
    # Add root folders
    for folder in user_folders:
        folder_info = {
            'id': folder.id,
            'name': folder.folder_name,
            'type': 'folder',
            'full_path': folder.full_path,
            'created_at': folder.created_at.isoformat() if folder.created_at else None,
        }
        containers_data.append(folder_info)
    
    # Sort containers by name
    containers_data.sort(key=lambda x: x['name'].lower())
    
    # Convert to JSON for frontend
    containers_json = json.dumps(containers_data, cls=DjangoJSONEncoder)
    
    template = "ads/assets.html"
    context = {
        "active_tab": "assets",
        "containers_data": containers_json,
    }
    
    return TemplateResponse(request, template, context)


@onboarding_required
@login_required
def folder_assets_detail(request, folder_id):
    """
    Get all UserBrandAssets for a specific folder and return as JSON.
    """
    try:
        # Verify the folder belongs to the user
        folder = get_object_or_404(UserFolder, id=folder_id, user=request.user)
        
        # Get direct assets for this folder only (not subfolders)
        assets = UserBrandAssets.objects.filter(
            user=request.user,
            folder=folder
        ).order_by('-created_at')
        
        # Get direct subfolders of this folder
        subfolders = UserFolder.objects.filter(
            user=request.user,
            parent_folder=folder
        ).order_by('folder_name')
        
        # Prepare assets data for frontend
        assets_data = []
        for asset in assets:
            asset_info = {
                'id': asset.id,
                'image_url': asset.image.url if asset.image else None,
                'category': asset.category,
                'original_filename': asset.original_filename,
                'canvas_width': asset.canvas_width,
                'canvas_height': asset.canvas_height,
                'file_size': asset.file_size,
                'folder_name': asset.folder.folder_name if asset.folder else None,
                'folder_path': asset.folder.full_path if asset.folder else None,
                'created_at': asset.created_at.isoformat() if asset.created_at else None,
            }
            assets_data.append(asset_info)
        
        # Prepare subfolders data for frontend
        subfolders_data = []
        for subfolder in subfolders:
            subfolder_info = {
                'id': subfolder.id,
                'name': subfolder.folder_name,
                'type': 'folder',
                'full_path': subfolder.full_path,
                'created_at': subfolder.created_at.isoformat() if subfolder.created_at else None,
            }
            subfolders_data.append(subfolder_info)
        
        return JsonResponse({
            'success': True,
            'folder': {
                'id': folder.id,
                'name': folder.folder_name,
                'full_path': folder.full_path,
                'assets_count': len(assets_data),
                'subfolders_count': len(subfolders_data)
            },
            'assets': assets_data,
            'subfolders': subfolders_data
        })
        
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=500)

@onboarding_required
@login_required
def folder_assets_detail_page(request, folder_id):
    """
    Render the Folder Assets Detail page with React components.
    """
    try:
        # Verify the folder belongs to the user
        folder = get_object_or_404(UserFolder, id=folder_id, user=request.user)
        
        template = "ads/folder_assets_detail.html"
        context = {
            "active_tab": "assets",
            "folder_id": folder_id,
            "folder_name": folder.folder_name,
            "folder_path": folder.full_path,
        }
        
        return TemplateResponse(request, template, context)
        
    except Exception as e:
        # Redirect to assets page if folder not found
        return redirect('assets_page')


@login_required
@require_POST
def create_folder(request):
    """
    Create a new UserFolder for the current user.
    Expects 'folder_name' and optional 'parent_folder_id' and 'brand_id' in POST data.
    """
    try:
        folder_name = request.POST.get('folder_name', '').strip()
        parent_folder_id = request.POST.get('parent_folder_id')
        brand_id = request.POST.get('brand_id')
        
        if not folder_name:
            return JsonResponse({'error': 'Folder name is required'}, status=400)
        
        # Validate parent folder if provided
        parent_folder = None
        if parent_folder_id:
            try:
                parent_folder = UserFolder.objects.get(
                    id=parent_folder_id,
                    user=request.user
                )
            except UserFolder.DoesNotExist:
                return JsonResponse({'error': 'Parent folder not found'}, status=404)
        
        # Validate brand if provided
        brand = None
        if brand_id:
            try:
                brand = UserBrand.objects.get(
                    id=brand_id,
                    user=request.user
                )
            except UserBrand.DoesNotExist:
                return JsonResponse({'error': 'Brand not found'}, status=404)
        
        # Check if folder with same name already exists in the same context
        existing_folder = UserFolder.objects.filter(
            user=request.user,
            folder_name=folder_name,
            parent_folder=parent_folder,
            brand=brand
        ).first()
        
        if existing_folder:
            return JsonResponse({'error': 'A folder with this name already exists in this location'}, status=400)
        
        # Create the folder
        folder = UserFolder.objects.create(
            user=request.user,
            folder_name=folder_name,
            parent_folder=parent_folder,
            brand=brand
        )
        
        # Return folder data
        folder_data = {
            'id': folder.id,
            'name': folder.folder_name,
            'type': 'folder',
            'full_path': folder.full_path,
            'assets_count': 0,
            'created_at': folder.created_at.isoformat(),
        }
        
        return JsonResponse({
            'success': True,
            'folder': folder_data,
            'message': f'Folder "{folder_name}" created successfully'
        })
        
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=500)

@onboarding_required
@login_required
def brand_assets_detail(request, brand_id):
    """
    Get all UserBrandAssets and UserFolders for a specific brand and return as JSON.
    """
    try:
        # Verify the brand belongs to the user
        brand = get_object_or_404(UserBrand, id=brand_id)
        
        # Get all assets for this brand and user
        assets = UserBrandAssets.objects.filter(
            user=request.user,
            brand=brand
        ).order_by('-created_at')
        
        # Get all folders for this brand and user (only direct brand folders, not subfolders)
        folders = UserFolder.objects.filter(
            user=request.user,
            brand=brand,
            parent_folder__isnull=True  # Only root-level brand folders
        ).order_by('folder_name')
        
        # Prepare assets data
        assets_data = []
        for asset in assets:
            asset_info = {
                'id': asset.id,
                'brand_name': brand.brand_name,
                'image_url': asset.image.url if asset.image else None,
                'category': asset.category,
                'original_filename': asset.original_filename,
                'created_at': asset.created_at.isoformat() if asset.created_at else None,
            }
            assets_data.append(asset_info)
        
        # Prepare folders data
        folders_data = []
        for folder in folders:
            folder_info = {
                'id': folder.id,
                'name': folder.folder_name,
                'type': 'folder',
                'full_path': folder.full_path,
                'created_at': folder.created_at.isoformat() if folder.created_at else None,
            }
            folders_data.append(folder_info)
        
        return JsonResponse({
            'brand': {
                'id': brand.id,
                'name': brand.brand_name,
                'assets_count': len(assets_data),
                'folders_count': len(folders_data)
            },
            'assets': assets_data,
            'folders': folders_data
        })
        
    except UserBrand.DoesNotExist:
        return JsonResponse({'error': 'Brand not found'}, status=404)

@onboarding_required
@login_required
def brand_assets_detail_page(request, brand_id):
    """
    Render the Brand Assets Detail page with React components.
    Shows all assets for a specific brand.
    """
    try:
        # Verify the brand belongs to the user
        brand = get_object_or_404(UserBrand, id=brand_id)
        
        template = "ads/brand-assets-detail.html"
        context = {
            "active_tab": "assets",
            "brand_id": brand_id,
            "brand_name": brand.brand_name,
        }
        
        return TemplateResponse(request, template, context)
        
    except UserBrand.DoesNotExist:
        return redirect('ads:assets_page')


@login_required
@require_http_methods(["POST"])
def upload_brand_assets(request, brand_id):
    """
    Upload multiple assets for a specific brand.
    """
    try:
        # Verify the brand belongs to the user
        brand = get_object_or_404(UserBrand, id=brand_id)
        
        uploaded_assets = []
        
        # Process each uploaded file
        for key, file in request.FILES.items():
            if key.startswith('asset_'):
                # Create new UserBrandAssets instance
                asset = UserBrandAssets.objects.create(
                    user=request.user,
                    brand=brand,
                    image=file,
                    category='assets',
                    original_filename=file.name
                )
                
                uploaded_assets.append({
                    'id': asset.id,
                    'image_url': asset.image.url,
                    'original_filename': asset.original_filename,
                    'created_at': asset.created_at.isoformat(),
                })
        
        return JsonResponse({
            'success': True,
            'message': f'{len(uploaded_assets)} assets uploaded successfully',
            'assets': uploaded_assets
        })
        
    except UserBrand.DoesNotExist:
        return JsonResponse({'error': 'Brand not found'}, status=404)
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=500)


@login_required
@require_http_methods(["POST"])
def upload_folder_assets(request, folder_id):
    """
    Upload multiple assets for a specific folder.
    """
    try:
        # Verify the folder belongs to the user
        folder = get_object_or_404(UserFolder, id=folder_id, user=request.user)
        
        uploaded_assets = []
        
        # Process each uploaded file
        for key, file in request.FILES.items():
            if key.startswith('asset_'):
                # Create new UserBrandAssets instance for folder
                asset = UserBrandAssets.objects.create(
                    user=request.user,
                    folder=folder,
                    image=file,
                    category='assets',
                    original_filename=file.name
                )
                
                uploaded_assets.append({
                    'id': asset.id,
                    'image_url': asset.image.url,
                    'original_filename': asset.original_filename,
                    'created_at': asset.created_at.isoformat(),
                })
        
        return JsonResponse({
            'success': True,
            'message': f'{len(uploaded_assets)} assets uploaded successfully',
            'assets': uploaded_assets
        })
        
    except UserFolder.DoesNotExist:
        return JsonResponse({'error': 'Folder not found'}, status=404)
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=500)

@onboarding_required
@login_required
def generated_ad_page(request, version_id):
    """
    Display the generated ad page for a specific AdRequestVersion.
    Shows the generated image with action buttons.
    """
    try:
        # Get the AdRequestVersion and verify user permissions
        version = get_object_or_404(AdRequestVersion, id=version_id, ad_request__user=request.user)
        
        # Verify that the version has a generated image
        if not version.generated_image:
            return redirect('ads:my_ads_page')
        
        # Pre-fetch and order versions to ensure correct ordering in template
        # Also prefetch ad_copies to access ad_copy_text
        version.ad_request.ordered_versions = version.ad_request.versions.prefetch_related('ad_copies').order_by('-created_at')
        
        # Determine back URL based on referrer
        referer = request.META.get('HTTP_REFERER', '')
        back_url = '/ads/discover/'  # Default
        
        if referer:
            # Parse the referrer to determine origin
            if '/ads/my-ads/' in referer:
                back_url = '/ads/my-ads/'
            elif '/ads/discover/' in referer and '/create/' not in referer:
                # If coming from discover page (not discover-clone)
                back_url = '/ads/discover/'
            elif '/ads/discover/' in referer and '/create/' in referer:
                # If coming from discover-clone (after generation), go to discover
                back_url = '/ads/discover/'
        
        # Check if user is on free tier (no active subscription)
        is_free_tier = not hasattr(request.user, 'subscription') or request.user.subscription is None or request.user.subscription.status != 'active'
        
        # Check if user has already rated this version
        has_rated = version.rating is not None and version.review
        
        context = {
            'version': version,
            'back_url': back_url,
            'is_free_tier': is_free_tier,
            'has_rated': has_rated,
        }
        
        return render(request, 'ads/generated_ad.html', context)
        
    except AdRequestVersion.DoesNotExist:
        return redirect('ads:my_ads_page')

@onboarding_required
@login_required
def ad_request_versions_page(request, ad_request_id):
    """
    Display all primary versions (is_primary=True) for a specific AdRequest.
    Shows version cards with ad copy text and images.
    """
    try:
        # Get the AdRequest and verify user permissions
        ad_request = get_object_or_404(AdRequest, id=ad_request_id, user=request.user)
        
        # Get all primary versions for this ad request with optimized query
        primary_versions = (
            ad_request
            .versions
            .filter(is_primary=True)
            .prefetch_related('ad_copies')
            .annotate(revisions_count=Count('revisions'))
            .order_by('-created_at')
        )
        
        # Determine back URL based on referrer
        referer = request.META.get('HTTP_REFERER', '')
        back_url = '/ads/my-ads/'  # Default
        
        if referer:
            # Parse the referrer to determine origin
            if '/ads/discover/' in referer:
                back_url = '/ads/discover/'
        
        # Get brand name and website url
        brand_name = None
        brand_url = None
        if ad_request.base_assets:
            if ad_request.base_assets.brand:
                brand_name = ad_request.base_assets.brand.brand_name
            # Company website can exist even if brand is None
            if ad_request.base_assets.company_website:
                brand_url = ad_request.base_assets.company_website
        
        context = {
            'ad_request': ad_request,
            'primary_versions': primary_versions,
            'back_url': back_url,
            'brand_name': brand_name or f'Ad Request #{ad_request_id}',
            'brand_url': brand_url or '',
        }
        
        return render(request, 'ads/ad_request_versions.html', context)
        
    except AdRequest.DoesNotExist:
        return redirect('ads:my_ads_page')

@onboarding_required
@login_required
def generated_versions_page(request, primary_version_id):
    """
    Display a primary version and all its child versions (revisions).
    Shows the primary version plus all versions where parent_version = primary_version_id.
    """
    try:
        # Get the primary version and verify user permissions
        primary_version = get_object_or_404(
            AdRequestVersion, 
            id=primary_version_id, 
            ad_request__user=request.user,
            is_primary=True
        )
        
        # Verify that the primary version has a generated image
        if not primary_version.generated_image:
            return redirect('ads:my_ads_page')
        
        # Get all child versions (revisions) of this primary version
        child_versions = AdRequestVersion.objects.filter(
            parent=primary_version
        ).prefetch_related('ad_copies')
        
        # Combine primary version with its children and sort by created_at (most recent first)
        all_versions = sorted(
            [primary_version] + list(child_versions),
            key=lambda v: v.created_at,
            reverse=True
        )
        
        # Determine back URL based on referrer
        referer = request.META.get('HTTP_REFERER', '')
        back_url = f'/ads/adrequest/{primary_version.ad_request.id}/versions/'  # Default to versions page
        
        if referer:
            # Parse the referrer to determine origin
            if '/ads/my-ads/' in referer:
                back_url = '/ads/my-ads/'
            elif '/ads/discover/' in referer and '/create/' not in referer:
                back_url = '/ads/discover/'
        
        # Check if user is on free tier
        is_free_tier = not hasattr(request.user, 'subscription') or request.user.subscription is None or request.user.subscription.status != 'active'
        
        # Check if user has already rated this version
        has_rated = primary_version.rating is not None and primary_version.review
        
        # Get brand name
        brand_name = None
        if primary_version.ad_request.base_assets and primary_version.ad_request.base_assets.brand:
            brand_name = primary_version.ad_request.base_assets.brand.brand_name
        
        context = {
            'version': primary_version,  # Main version for compatibility with generated_ad template
            'back_url': back_url,
            'is_free_tier': is_free_tier,
            'has_rated': has_rated,
            'brand_name': brand_name or f'Ad Request #{primary_version.ad_request.id}',
        }
        
        # Override ordered_versions with our filtered list
        primary_version.ad_request.ordered_versions = all_versions
        
        return render(request, 'ads/generated_versions.html', context)
        
    except AdRequestVersion.DoesNotExist:
        return redirect('ads:my_ads_page')


@login_required
@require_http_methods(["POST"])
def analyze_website_for_brand_assets(request):
    """
    Analyze a website to extract brand assets using OpenAI.
    
    Args:
        request: Django request object with 'website_url' in POST data
        Optional: 'is_onboarding' - if true, saves brand to UserOnboarding
        
    Returns:
        JsonResponse with extracted assets or error
    """
    try:
        website_url = request.POST.get('website_url')
        ad_request_id = request.POST.get('ad_request_id')
        is_onboarding = request.POST.get('is_onboarding', '').lower() == 'true'
        
        if not website_url:
            return JsonResponse({
                'success': False,
                'error': 'Website URL is required'
            }, status=400)
        
        from .website_analysis import extract_brand_assets_from_website
        
        result = extract_brand_assets_from_website(request.user, website_url, ad_request_id)
        
        if result.get('success'):
            # If called from onboarding, save brand to UserOnboarding and advance status
            if is_onboarding and result.get('brand'):
                try:
                    from apps.users.models import UserOnboarding
                    from apps.ads.models import UserBrand
                    
                    brand_id = result['brand'].get('id')
                    log.info(f"DEBUG: is_onboarding={is_onboarding}, brand_id={brand_id}, result['brand']={result.get('brand')}")
                    if brand_id:
                        onboarding, _ = UserOnboarding.objects.get_or_create(user=request.user)
                        onboarding.brand_id = brand_id
                        onboarding.save()
                        log.info(f"Saved brand {brand_id} to UserOnboarding for user {request.user.email}")
                    else:
                        log.warning(f"No brand_id found in result for user {request.user.email}")
                    
                    # Advance user from STEP_1 to STEP_2
                    request.user.advance_onboarding()
                except Exception as e:
                    log.error(f"Error saving brand to UserOnboarding: {str(e)}")
            
            return JsonResponse({
                'success': True,
                'extracted_assets': result.get('extracted_assets'),
                'brand_created': result.get('brand_created', False),
                'brand': result.get('brand'),
                'cost': result.get('cost')
            })
        else:
            error_message = result.get('error', 'An unknown error occurred')
            if 'insufficient credits' in error_message.lower():
                return JsonResponse({'error': error_message}, status=402)
            return JsonResponse({'error': error_message}, status=400)
            
    except Exception as e:
        error_message = str(e)
        if 'insufficient credits' in error_message.lower():
            return JsonResponse({'error': error_message}, status=402)
        return JsonResponse({
            'success': False,
            'error': f'Unexpected error: {str(e)}'
        }, status=500)

@login_required
@require_http_methods(["POST"])
def capture_website_screenshot(request):
    """
    Capture a screenshot of a website and save it to UserOnboarding.
    
    Args:
        request: Django request object with 'website_url' in POST data
        
    Returns:
        JsonResponse with base64 screenshot or error
    """
    try:
        website_url = request.POST.get('website_url')
        
        if not website_url:
            return JsonResponse({
                'success': False,
                'error': 'Website URL is required'
            }, status=400)
            
        # Ensure URL has scheme
        if not website_url.startswith(('http://', 'https://')):
            website_url = 'https://' + website_url
            
        from .website_analysis import capture_screenshot_with_playwright
        
        screenshot_base64 = capture_screenshot_with_playwright(website_url)
        
        # Save screenshot to UserOnboarding
        try:
            from apps.users.models import UserOnboarding
            from django.core.files.base import ContentFile
            import base64
            
            onboarding, _ = UserOnboarding.objects.get_or_create(user=request.user)
            
            # Decode base64 and save as image file
            screenshot_data = base64.b64decode(screenshot_base64)
            filename = f"screenshot_{request.user.id}.png"
            onboarding.website_screenshot.save(filename, ContentFile(screenshot_data), save=True)
            
        except Exception as save_error:
            logging.error(f"Error saving screenshot to UserOnboarding: {str(save_error)}")
            # Continue anyway - screenshot capture was successful
        
        return JsonResponse({
            'success': True,
            'screenshot': f"data:image/png;base64,{screenshot_base64}"
        })
            
    except Exception as e:
        logging.error(f"Error capturing screenshot: {str(e)}")
        return JsonResponse({
            'success': False,
            'error': str(e)
        }, status=500)

@login_required
@require_http_methods(["PUT", "POST"])  # Allow POST for multipart data
def update_user_brand(request, brand_id):
    """
    Update an existing user brand and its associated AdRequestAssets.
    
    Expected PUT data (JSON or FormData):
    - brand_name: Name of the brand
    - industry: Industry/Vertical
    - company_website: Website URL
    - product_description: Product/Service description
    - target_audience: Target audience description
    - functional_benefits: Functional benefits
    - tone_of_voice: Brand tone of voice
    - font_direction: Font direction preference
    - core_features: Core features
    - emotional_lifestyle_benefits: Emotional/lifestyle benefits
    - proof_points: Proof points
    - value_propositions: Value propositions
    - brand_colors: Array of brand colors in hex format
    - logo_file: Optional logo file upload
    
    Returns: JSON with updated brand information
    """
    try:
        import json  # Import json at the beginning of the function
        
        # Check if this is an update request (could be POST with multipart data)
        is_update_request = request.method == 'PUT' or request.headers.get('X-Update-Mode') == 'true'
        print(f"=== REQUEST TYPE DEBUG ===")
        print(f"Method: {request.method}")
        print(f"X-Update-Mode header: {request.headers.get('X-Update-Mode')}")
        print(f"Is update request: {is_update_request}")
        
        # Get the brand and verify ownership
        try:
            brand = UserBrand.objects.get(id=brand_id, user=request.user)
        except UserBrand.DoesNotExist:
            return JsonResponse({
                'success': False,
                'error': 'Brand not found or you do not have permission to edit it'
            }, status=404)
        
        # Get the associated AdRequestAssets
        try:
            ad_request_assets = AdRequestAssets.objects.get(brand=brand)
        except AdRequestAssets.DoesNotExist:
            return JsonResponse({
                'success': False,
                'error': 'Associated brand assets not found'
            }, status=404)
        
        # Parse data based on content type
        if request.content_type and 'multipart/form-data' in request.content_type:
            # FormData (with file upload)
            data = request.POST.dict()
            logo_file = request.FILES.get('logo_file')
            remove_logo = data.get('remove_logo') == 'true'
            
            # Debug logs
            print(f"=== BACKEND LOGO DEBUG ===")
            print(f"Content-Type: {request.content_type}")
            print(f"Request method: {request.method}")
            print(f"POST data: {dict(request.POST)}")
            print(f"POST data keys: {list(data.keys())}")
            print(f"FILES data: {dict(request.FILES)}")
            print(f"FILES keys: {list(request.FILES.keys())}")
            print(f"logo_file: {logo_file}")
            print(f"remove_logo: {remove_logo}")
        else:
            # JSON data
            print(f"=== JSON REQUEST DEBUG ===")
            print(f"Content-Type: {request.content_type}")
            print(f"Request method: {request.method}")
            data = json.loads(request.body)
            logo_file = None
            remove_logo = False
        
        # Update brand name if provided
        brand_name = data.get('brand_name', '').strip()
        if brand_name:
            # Check if another active brand with this name exists for this user (excluding current brand)
            if UserBrand.objects.filter(user=request.user, brand_name=brand_name, active=True).exclude(id=brand_id).exists():
                return JsonResponse({
                    'success': False,
                    'error': 'You already have an active brand with this name. Please choose a different name.'
                }, status=400)
            brand.brand_name = brand_name
            brand.save()
        
        # Update AdRequestAssets fields
        if data.get('industry'):
            ad_request_assets.industry = data['industry'].strip()
        if data.get('company_website'):
            ad_request_assets.company_website = data['company_website'].strip()
        if data.get('product_description'):
            ad_request_assets.product_description = data['product_description'].strip()
        if data.get('target_audience'):
            ad_request_assets.target_audience = data['target_audience'].strip()
        if data.get('functional_benefits'):
            ad_request_assets.functional_benefits = data['functional_benefits'].strip()
        if data.get('tone_of_voice'):
            ad_request_assets.tone_of_voice = data['tone_of_voice'].strip()
        if data.get('font_direction'):
            ad_request_assets.font_direction = data['font_direction'].strip()
        if data.get('core_features'):
            ad_request_assets.core_features = data['core_features'].strip()
        if data.get('emotional_lifestyle_benefits'):
            ad_request_assets.emotional_lifestyle_benefits = data['emotional_lifestyle_benefits'].strip()
        if data.get('proof_points'):
            ad_request_assets.proof_points = data['proof_points'].strip()
        if data.get('value_propositions'):
            ad_request_assets.value_propositions = data['value_propositions'].strip()
        
        # Handle brand colors
        brand_colors = data.get('brand_colors')
        if brand_colors:
            if isinstance(brand_colors, str):
                # Parse JSON string
                try:
                    brand_colors = json.loads(brand_colors)
                except json.JSONDecodeError:
                    brand_colors = []
            
            if isinstance(brand_colors, list) and brand_colors:
                # Filter valid hex colors
                valid_colors = [color for color in brand_colors if color and isinstance(color, str) and color.startswith('#')]
                if valid_colors:
                    ad_request_assets.main_hex_color = json.dumps(valid_colors)
        
        # Handle logo changes
        print(f"=== LOGO UPDATE LOGIC ===")
        print(f"logo_file exists: {bool(logo_file)}")
        print(f"remove_logo flag: {remove_logo}")
        print(f"Current logo: {ad_request_assets.logo}")
        
        if logo_file:
            # New logo file uploaded
            print(f"Updating logo with new file: {logo_file}")
            ad_request_assets.logo = logo_file
        elif remove_logo:
            # Remove existing logo
            print(f"Removing existing logo")
            ad_request_assets.logo = None
        else:
            print(f"No logo changes, preserving existing logo")
        
        ad_request_assets.save()
        
        # Prepare response data
        brand_colors_list = []
        if ad_request_assets.main_hex_color:
            try:
                brand_colors_list = json.loads(ad_request_assets.main_hex_color)
            except (json.JSONDecodeError, TypeError):
                brand_colors_list = []
        
        return JsonResponse({
            'success': True,
            'brand': {
                'id': brand.id,
                'name': brand.brand_name,
                'industry': ad_request_assets.industry,
                'website': ad_request_assets.company_website,
                'product_description': ad_request_assets.product_description,
                'target_audience': ad_request_assets.target_audience,
                'functional_benefits': ad_request_assets.functional_benefits,
                'brand_colors': brand_colors_list,
                'tone_of_voice': ad_request_assets.tone_of_voice,
                'font_direction': ad_request_assets.font_direction,
                'core_features': ad_request_assets.core_features,
                'emotional_lifestyle_benefits': ad_request_assets.emotional_lifestyle_benefits,
                'proof_points': ad_request_assets.proof_points,
                'value_propositions': ad_request_assets.value_propositions,
                'logo_url': ad_request_assets.logo.url if ad_request_assets.logo else None,
                'ad_request_assets_id': ad_request_assets.id
            }
        })
        
    except Exception as e:
        return JsonResponse({
            'success': False,
            'error': str(e)
        }, status=500)


@login_required
@require_http_methods(["GET"])
def get_brand_details(request, brand_id):
    """
    Get complete brand details including AdRequestAssets data.
    
    Returns: JSON with complete brand information for editing
    """
    try:
        # Get the brand and verify ownership
        try:
            brand = UserBrand.objects.get(id=brand_id, user=request.user)
        except UserBrand.DoesNotExist:
            return JsonResponse({
                'success': False,
                'error': 'Brand not found or you do not have permission to view it'
            }, status=404)
        
        # Get the associated AdRequestAssets
        try:
            ad_request_assets = AdRequestAssets.objects.get(brand=brand)
        except AdRequestAssets.DoesNotExist:
            return JsonResponse({
                'success': False,
                'error': 'Associated brand assets not found'
            }, status=404)
        
        # Prepare brand colors
        brand_colors_list = []
        if ad_request_assets.main_hex_color:
            try:
                import json
                brand_colors_list = json.loads(ad_request_assets.main_hex_color)
            except (json.JSONDecodeError, TypeError):
                brand_colors_list = []
        
        return JsonResponse({
            'success': True,
            'brand': {
                'id': brand.id,
                'name': brand.brand_name,
                'industry': ad_request_assets.industry,
                'website': ad_request_assets.company_website,
                'product_description': ad_request_assets.product_description,
                'target_audience': ad_request_assets.target_audience,
                'functional_benefits': ad_request_assets.functional_benefits,
                'brand_colors': brand_colors_list,
                'tone_of_voice': ad_request_assets.tone_of_voice,
                'font_direction': ad_request_assets.font_direction,
                'core_features': ad_request_assets.core_features,
                'emotional_lifestyle_benefits': ad_request_assets.emotional_lifestyle_benefits,
                'proof_points': ad_request_assets.proof_points,
                'value_propositions': ad_request_assets.value_propositions,
                'key_benefits': ad_request_assets.key_benefits,
                'logo_url': ad_request_assets.logo.url if ad_request_assets.logo else None,
                'ad_request_assets_id': ad_request_assets.id
            }
        })
        
    except Exception as e:
        return JsonResponse({
            'success': False,
            'error': str(e)
        }, status=500)


@login_required
@require_http_methods(["PATCH"])
def delete_user_brand(request, brand_id):
    """
    Soft delete a user brand by marking it as inactive.
    
    Args:
        request: HTTP request object
        brand_id: ID of the brand to delete
        
    Returns:
        JSON response indicating success or failure
    """
    try:
        # Get the brand and verify ownership
        brand = UserBrand.objects.get(id=brand_id, user=request.user)
        
        # Mark as inactive (soft delete)
        brand.active = False
        brand.save()
        
        return JsonResponse({
            'success': True,
            'message': f'Brand "{brand.brand_name}" has been deleted successfully.'
        })
        
    except UserBrand.DoesNotExist:
        return JsonResponse({
            'success': False,
            'error': 'Brand not found or you do not have permission to delete it.'
        }, status=404)
        
    except Exception as e:
        logging.error(f"Error deleting user brand {brand_id}: {str(e)}")
        return JsonResponse({
            'success': False,
            'error': 'An error occurred while deleting the brand.'
        }, status=500)
