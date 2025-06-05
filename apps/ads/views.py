from django.contrib.auth.decorators import login_required
from django.views.decorators.csrf import ensure_csrf_cookie
from django.contrib import messages
from django.core.paginator import Paginator, EmptyPage, PageNotAnInteger
from django.http.response import HttpResponseRedirect, JsonResponse, HttpResponse
import logging

# Importar el servicio de generación de imágenes
from apps.aiinterface.services import ImageGenerationService
from django.shortcuts import get_object_or_404, render, redirect
from django.template.response import TemplateResponse
from django.views.decorators.http import require_POST
from apps.subscriptions.helpers import create_stripe_checkout_session
from django.urls import reverse
from django.views.decorators.http import require_POST, require_http_methods
import json
import requests
import urllib.parse
import os
from django.conf import settings

from .models import AdLibrary, IndustryList, TagList, AdRequest, AdRequestAssets, AdRequestVersion
from .forms import AdLibraryForm
from .services import can_create_ad_request, use_credit, can_create_ad_request_version, get_ad_request_version_limit, use_general_credit, use_version_credit, can_create_ad_version
import boto3

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
            # User already has a customer, use it
            customer_kwargs["customer"] = request.user.customer.id
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

@login_required
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
            
            # Now create a subscription with the attached payment method
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
            industries = [industry.name for industry in req.ad_library.industries.all()]
        
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
            'ad_library_name': req.ad_library.company_name if req.ad_library else None,
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


def get_adlibrary_filters(request):
    """
    Get list of AdLibrary objects with flexible filtering options.
    
    GET Parameters:
        company_name: Filter by company name (case-insensitive contains)
        industries: Filter by industry names (comma-separated list)
        tags: Filter by tag names (comma-separated list)
    
    Returns: JSON with list of AdLibrary objects including company_name, industries, tags, and ad_image
    """
    from django.db.models import Q
    
    # Get filter parameters from request
    company_name = request.GET.get('company_name', '')
    industries = request.GET.getlist('industries', [])
    tags = request.GET.getlist('tags', [])
    
    # If single values are provided instead of lists, convert them
    if not industries and request.GET.get('industry'):
        industries = [request.GET.get('industry')]
    
    if not tags and request.GET.get('tag'):
        tags = [request.GET.get('tag')]
    
    # Check if any filter parameters are provided
    has_filters = company_name or industries or tags
    
    # Start with all AdLibrary objects or just favorites if no filters
    if has_filters:
        adlibraries = AdLibrary.objects.all()
    else:
        adlibraries = AdLibrary.objects.filter(is_fav=True)
    
    # Apply company name filter if provided (AND logic)
    if company_name:
        adlibraries = adlibraries.filter(company_name__icontains=company_name)
    
    # Create combined query for industries and tags (OR logic between them)
    combined_query = Q()
    
    # Add industry conditions to combined query
    if industries:
        for industry in industries:
            if industry:
                combined_query |= Q(industries__name=industry)
    
    # Add tag conditions to combined query
    if tags:
        for tag in tags:
            if tag:
                combined_query |= Q(tags__name=tag)
    
    # Apply the combined filter if any conditions exist
    if combined_query:
        adlibraries = adlibraries.filter(combined_query).distinct()
    
    # Convert to list of dictionaries with all required fields
    adlibrary_list = []
    for adlibrary in adlibraries:
        # Get industries and tags as lists of names
        industry_names = [industry.name for industry in adlibrary.industries.all()]
        tag_names = [tag.name for tag in adlibrary.tags.all()]
        
        # Create dictionary with all fields
        adlibrary_data = {
            'id': adlibrary.id,
            'company_name': adlibrary.company_name,
            'industries': industry_names,
            'tags': tag_names,
            'ad_image': adlibrary.ad_image.url if adlibrary.ad_image else None,
            'is_fav': adlibrary.is_fav,
        }
        adlibrary_list.append(adlibrary_data)
    
    return JsonResponse({'adlibraries': adlibrary_list}, safe=True)




def get_adlibrary_company_list(request):
    """
    Get a simple list of all company names from AdLibrary.
    Uses Redis caching for improved performance.
    
    Returns: JSON with list of all company names
    """
    from django.core.cache import cache
    
    # Try to get from cache first
    cache_key = 'adlibrary_company_names'
    company_names = cache.get(cache_key)
    
    # If not in cache, get from database and cache it
    if company_names is None:
        adlibraries = AdLibrary.objects.all()
        company_names = [adlibrary.company_name for adlibrary in adlibraries]
        # Cache for 1 hour (3600 seconds) - I will set to none for now
        cache.set(cache_key, company_names, None)
    
    return JsonResponse({'companies': company_names}, safe=True)


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
        
        # Initialize create parameters
        create_params = {
            'user': request.user,
            'status': AdRequest.STATUS_NEW
        }
        
        # Get user assets if they exist
        user_assets = AdRequestAssets.objects.filter(user=request.user).first()
        
        if user_assets:
            # Set base_assets reference
            create_params['base_assets'] = user_assets
            
            # Add text fields to asset_overrides
            create_params['asset_overrides'] = user_assets.to_dict()
            
            # Add image fields to their respective override fields
            image_fields = [
                'logo', 'product_image_1', 'product_image_2', 
                'app_image_1', 'app_image_2',
                'marketing_image_1', 'marketing_image_2', 'marketing_image_3'
            ]
            
            for field in image_fields:
                base_image = getattr(user_assets, field)
                if base_image:
                    create_params[f"{field}_override"] = base_image
        
        # Create the AdRequest with all fields at once
        ad_request = AdRequest.objects.create(**create_params)
        
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

    created_at = safe_get(ad_request, 'created_at')
    updated_at = safe_get(ad_request, 'updated_at')

    return JsonResponse({
        'id': safe_get(ad_request, 'id'),
        'user_id': safe_get(user, 'id'),
        'ad_library_id': safe_get(ad_library, 'id'),
        'ad_library_name': safe_get(ad_library, 'company_name'),
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
        text_fields = ['company_website', 'main_hex_color', 'key_benefits']
        
        # Get current overrides or initialize if needed
        current_overrides = ad_request.asset_overrides if ad_request.asset_overrides else {}
        
        # Update only the fields that are explicitly in the request
        for field in text_fields:
            if field in request.POST:
                # If the field is explicitly empty, set it to empty
                # Otherwise, update with the new value
                current_overrides[field] = request.POST.get(field)
        
        # Save the updated overrides
        ad_request.asset_overrides = current_overrides
        
        # Update image override fields
        image_fields = [
            'logo', 'product_image_1', 'product_image_2', 
            'app_image_1', 'app_image_2',
            'marketing_image_1', 'marketing_image_2', 'marketing_image_3'
        ]
        
        for field in image_fields:
            override_field = f"{field}_override"
            # Clear the field if it's mentioned in the request but no file is provided
            if field in request.POST and field not in request.FILES:
                setattr(ad_request, override_field, None)
            # Update the field if a file is provided
            elif field in request.FILES:
                setattr(ad_request, override_field, request.FILES[field])
        
        # Save the updated AdRequest
        ad_request.save()
        
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
        'ad_library_name': req.ad_library.company_name,
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
        
        # Check if the AdRequest has reached its version limit
        if not can_create_ad_request_version(ad_request):
            # Get the limit for this AdRequest
            limit = get_ad_request_version_limit(ad_request)
            return JsonResponse({
                'error': f'This ad request has reached its limit of {limit} versions. Please upgrade your plan for more versions.'
            }, status=400)
        
        # Check if user has available credits
        if not can_create_ad_request(request.user):
            return JsonResponse({'error': 'You have reached out your image limit creation for your plan'}, status=403)
        print("User has available credits")
        # Get optional fields
        user_prompt = request.POST.get('user_prompt')
        print("User prompt: ", user_prompt)
        # Create a new AdRequestVersion instance
        print("ad_request: ", ad_request)
        print("user_prompt: ", user_prompt)
        print("status: ", AdRequestVersion.STATUS_UNASSIGNED)
        version = AdRequestVersion.objects.create(
            ad_request=ad_request,
            user_prompt=user_prompt,
            status=AdRequestVersion.STATUS_UNASSIGNED
        )
        print("Version created: ", version)
        # Generate image using OpenAI if user_prompt is provided
        image_generated = False
        task_id = None
        
        try:
            # Collect image URLs from AdRequest for context
            image_urls = []
            
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
            
            # Generate the complete prompt using the generate_prompt function
            from .gen_prompt import generate_prompt
            complete_prompt = generate_prompt(version)
            
            # Generate image using Celery task in the background
            from apps.aiinterface.tasks import generate_image_task
            
            # Update version status to processing
            version.status = "processing"
            version.save(update_fields=['status'])
            
            # Launch the Celery task
            task = generate_image_task.delay(
                text_prompt=complete_prompt,
                image_urls=image_urls,
                canvas_size=canvas_size,
                version_id=version.id
            )
            
            task_id = task.id
            print(f"Image generation task (ID: {task_id}) started for AdRequestVersion {version.id}")
            
            # Use a general credit for new versions created from StepThreeComponent.jsx
            use_general_credit(request.user)
            
        except Exception as img_error:
            print(f"Error starting image generation task: {str(img_error)}")
        
        # Return the AdRequestVersion instance ID and image generation status
        response_data = {
            'id': version.id,
            'status': version.status,
            'image_generated': image_generated,
            'message': 'Version created successfully. Image generation started in background.'
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
    
    Required input:
    - ad_request: The primary key of the AdRequest to create a version for
    - url_image_revision: URL of the image to use for revision
    
    Optional inputs:
    - user_prompt: The user prompt for the version
    
    Returns: JSON with the AdRequestVersion instance ID and image generation status
    """
    # Usando prints en lugar de loggers
    ad_request_id = request.POST.get('ad_request')
    url_image_revision = request.POST.get('url_image_revision')
    user_prompt = request.POST.get('user_prompt')
    
    # Validate inputs
    if not ad_request_id:
        return JsonResponse({'error': 'Ad request ID is required'}, status=400)
    
    if not url_image_revision:
        return JsonResponse({'error': 'Revision image URL is required'}, status=400)
    
    if not user_prompt:
        return JsonResponse({'error': 'User prompt is required'}, status=400)
    
    try:
        # Get the AdRequest instance
        ad_request = get_object_or_404(AdRequest, id=ad_request_id)
        
        # Check if the user has permission to create a version for this request
        if ad_request.user != request.user:
            return JsonResponse({'error': 'You do not have permission to create a version for this request'}, status=403)
        
        # Check if the AdRequest has reached its version limit
        if not can_create_ad_request_version(ad_request):
            # Get the limit for this AdRequest
            limit = get_ad_request_version_limit(ad_request)
            return JsonResponse({
                'error': f'This ad request has reached its limit of {limit} versions. Please upgrade your plan for more versions.'
            }, status=400)
        
        # Create a new AdRequestVersion instance
        version = AdRequestVersion.objects.create(
            ad_request=ad_request,
            user_prompt=user_prompt,
            status=AdRequestVersion.STATUS_UNASSIGNED
        )
        
        # Generate image using OpenAI if user_prompt is provided
        image_generated = False
        task_id = None
        
        try:
            # For revision, we only use the provided revision image URL
            image_urls = [url_image_revision]
            
            # Get canvas size from AdRequest
            canvas_size = ad_request.canvas_size or "1024x1024"
            
            # Generate image using Celery task in the background
            from apps.aiinterface.tasks import generate_image_task
            
            # Update version status to processing
            version.status = "processing"
            version.save(update_fields=['status'])
            
            # Launch the Celery task
            task = generate_image_task.delay(
                text_prompt=user_prompt,
                image_urls=image_urls,
                canvas_size=canvas_size,
                version_id=version.id
            )
            
            task_id = task.id
            print(f"Image revision task (ID: {task_id}) started for AdRequestVersion {version.id}")
            
            # Use a version credit for revisions created from revision-adrequest.jsx
            use_version_credit(request.user)
            
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
def create_adrequest_page(request, adrequest_id=None):
    """
    Render the create ad request page with React components.
    If adrequest_id is provided, it will be passed to the template for editing.
    """
    template = "ads/create_adrequest_page.html"
    context = {
        "active_tab": "create_adrequest",
        "adrequest_id": adrequest_id
    }
    
    # If adrequest_id is provided, get the AdRequest information
    if adrequest_id:
        # Get the AdRequest and check permissions
        result = _get_user_adrequest(request, adrequest_id)

        # If result is not a JsonResponse (error), it's the ad_request object
        if not isinstance(result, JsonResponse):
            ad_request = result
            
            # Create a dictionary with the AdRequest data (similar to what adrequest_get would return)
            adrequest_data = {
                'id': ad_request.id,
                'user_id': ad_request.user.id,
                'ad_library_id': ad_request.ad_library.id if ad_request.ad_library else None,
                'ad_library_name': ad_request.ad_library.company_name if ad_request.ad_library else None,
                'canvas_size': ad_request.canvas_size,
                'status': ad_request.status,
                'created_at': ad_request.created_at.isoformat() if ad_request.created_at else None,
                'updated_at': ad_request.updated_at.isoformat() if ad_request.updated_at else None,
                'asset_overrides': ad_request.asset_overrides
            }
            
            # Add the AdRequest data to the context
            context["adrequest_data"] = adrequest_data
    
    return TemplateResponse(request, template, context)


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

@ensure_csrf_cookie
def adrequest_details_page(request, adrequest_id):
    """
    Render the adrequest details page for completed ad requests.
    This view is used for ad requests with status COMPLETE.
    """
    # Get the AdRequest and check permissions
    result = _get_user_adrequest(request, adrequest_id)
        
    # If result is a JsonResponse, it's an error
    if isinstance(result, JsonResponse):
        return result
    
    ad_request = result
    
    # Get all versions for this ad request
    versions = ad_request.versions.all().order_by('created_at')
    
    # Prepare versions data for the template
    versions_data = []
    
    # Log for debugging
    print(f"{versions=}")
    
    # Get the version limit for this AdRequest based on the user's subscription
    version_limit = get_ad_request_version_limit(ad_request)
    
    # Get all versions for display
    for i, version in enumerate(versions):
        versions_data.append({
            'id': version.id,
            'generated_image': version.generated_image.url if version.generated_image else None,
            'created_at': version.created_at.isoformat() if version.created_at else None,
            'version_index': i + 1,  # 1-based index
        })
    
    # Ordenar versions_data por version_index en orden descendente (índice más alto primero)
    versions_data = sorted(versions_data, key=lambda x: x['version_index'], reverse=True)
    
    print(f"{versions_data=}")
    
    # Convert to JSON for the template
    import json
    versions_json = json.dumps(versions_data)
        
    # Render the adlibrary_detail.html template with the ad_request as the object
    template = "ads/adlibrary_detail.html"
    context = {
        "active_tab": "my_requests",
        "object": ad_request.ad_library if ad_request.ad_library else None,
        "ad_request": ad_request,
        "versions": versions,
        "versions_json": versions_json,
        "total_versions": version_limit,
        "current_versions_count": versions.count()
    }
        
    return TemplateResponse(request, template, context)

@ensure_csrf_cookie
@login_required
def billing_page(request):
    """
    Render the billing page with pricing information.
    """
    from apps.subscriptions.metadata import get_active_products_with_metadata, PlanInterval
    logger = logging.getLogger(__name__)
    
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
    
    # Initialize pricing data without Free plan
    pricing_data = {
        "title": "Pricing Plans",
        "subtitle": "Choose the perfect plan for your needs",
        "frequencies": ["monthly", "usage"],
        "tiers": [],
        "usagePackages": [
            {
                "name": "Package 1",
                "description": "Basic usage package",
                "price": 100,
                "priceId": "price_package_1",
                "features": [
                    "100 images",
                    "200 revisions"
                ],
                "cta": "Buy Package",
                "highlighted": True,
                "popular": False
            },
            {
                "name": "Package 2",
                "description": "Advanced usage package",
                "price": 200,
                "priceId": "price_package_2",
                "features": [
                    "200 images",
                    "500 revisions"
                ],
                "cta": "Buy Package",
                "highlighted": False,
                "popular": True
            }
        ]
    }
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
    # Add tiers from metadata
    for product in products_with_metadata:
        slug = product.metadata.slug
        if slug in product_mapping:
            # Get prices
            monthly_price = product._get_price(PlanInterval.month, fail_hard=False)
            # No more yearly prices
            
            # Check if this is the current plan
            is_current_plan = current_plan_id == product.product.id
            
            # Check if this plan should be disabled (user has a higher tier plan)
            is_disabled = False
            if current_plan_name:
                current_tier_position = tier_order.index(current_plan_name) if current_plan_name in tier_order else -1
                this_tier_position = tier_order.index(product_mapping[slug]['display_name']) if product_mapping[slug]['display_name'] in tier_order else -1
                
                # Disable if this plan is lower tier than current plan
                if this_tier_position < current_tier_position:
                    is_disabled = True
            
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
                "is_disabled": is_disabled
            }
            
            pricing_data["tiers"].append(tier)
    
    # Enterprise plan has been removed
    
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
    print(f"Pricing data: {pricing_json}")
    print(f"Payment method data: {payment_method_json}")
        
    return render(request, 'ads/billing.html', {
        "active_tab": "billing",
        "pricing_data": pricing_json,
        "payment_method_data": payment_method_json
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
