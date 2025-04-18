from django.contrib.auth.decorators import login_required
from django.contrib import messages
from django.core.paginator import Paginator, EmptyPage, PageNotAnInteger
from django.http.response import HttpResponseRedirect, JsonResponse
from django.shortcuts import get_object_or_404, render, redirect
from django.template.response import TemplateResponse
from django.urls import reverse
from django.views.decorators.http import require_POST, require_http_methods
import json

from .models import AdLibrary, IndustryList, TagList, AdRequest, AdRequestAssets, AdRequestVersion
from .forms import AdLibraryForm
from .services import can_create_ad_request, increment_usage

# A reasonable value for pagination would be 10 or 20 entries per page.
# Here we use 4 (a very low value), so we can show off the pagination using fewer items
PAGINATE_BY = 4
# For pagination, we use get_elided_page_range() to give a list of pages that always has some
# pages at the beginning and end, and some on either side of current, with ellipsis where needed.


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
            'ad_library_name': req.ad_library.company_name if req.ad_library else 'No library',
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
    # Check if user can create more ad requests
    if not can_create_ad_request(request.user):
        # Different message for free vs paid users
        if not request.user.has_active_subscription():
            messages.error(
                request, 
                "You've reached your lifetime limit for free ad requests. Please upgrade your plan to create more."
            )
        else:
            messages.error(
                request, 
                "You've reached your monthly limit for ad requests. Please upgrade your plan to create more."
            )
        return redirect('subscription_plans')  # Redirect to plans page

    try:
        # Check if the user already has an AdRequestAssets instance
        user_assets = AdRequestAssets.objects.filter(user=request.user).first()
        
        # If not, create one
        if not user_assets:
            user_assets = AdRequestAssets.objects.create(user=request.user)
        
        # Prepare creation parameters
        create_params = {
            'user': request.user,
            'base_assets': user_assets,
            # No ad_library_id needed
            # No canvas_size needed (will use default from model)
        }
        
        # Add override fields if user_assets exists
        if user_assets:
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
        
        # Increment usage counter
        increment_usage(request.user)
        
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
    
    # Log request information for debugging
    print("\n\n==== ADREQUEST UPDATE DEBUG ====")
    print(f"Request method: {request.method}")
    print(f"Content type: {request.content_type}")
    print(f"POST data keys: {list(request.POST.keys())}")
    print(f"FILES data keys: {list(request.FILES.keys())}")
    
    # If there's JSON data in the request body, try to parse it
    if request.content_type == 'application/json':
        import json
        try:
            body_unicode = request.body.decode('utf-8')
            body_data = json.loads(body_unicode)
            print(f"JSON body data: {body_data}")
        except Exception as e:
            print(f"Error parsing JSON body: {e}")
    
    try:
        # Update basic fields
        if 'canvas_size' in request.POST:
            ad_request.canvas_size = request.POST.get('canvas_size')

        if 'ad_library' in request.POST:
            ad_request.ad_library = get_object_or_404(AdLibrary, id=request.POST.get('ad_library'))
            
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
        
        # Check for special logo_override_url field
        print(f"Checking for logo_override_url in POST data")
        if 'logo_override_url' in request.POST:
            logo_url = request.POST.get('logo_override_url')
            print(f"Found logo_override_url: {logo_url}")
            # Directly set the logo_override field with the URL
            ad_request.logo_override = logo_url
            print(f"Set ad_request.logo_override to: {ad_request.logo_override}")
        else:
            print("logo_override_url not found in POST data")
            
        # Check if we have logo_override in JSON data
        if request.content_type == 'application/json':
            try:
                body_unicode = request.body.decode('utf-8')
                body_data = json.loads(body_unicode)
                if 'logo_override' in body_data:
                    logo_url = body_data['logo_override']
                    print(f"Found logo_override in JSON: {logo_url}")
                    ad_request.logo_override = logo_url
                    print(f"Set ad_request.logo_override from JSON to: {ad_request.logo_override}")
            except Exception as e:
                print(f"Error processing JSON for logo_override: {e}")
        
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
        
        # Log the final state before saving
        print(f"Final logo_override value: {ad_request.logo_override}")
        print(f"Final asset_overrides value: {ad_request.asset_overrides}")
        
        # Save the updated AdRequest
        ad_request.save()
        print("AdRequest saved successfully")
        
        # Return success response
        return JsonResponse({
            'id': ad_request.id,
            'status': ad_request.status,
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
    Create a new AdRequestVersion instance.
    
    Required input:
    - ad_request: The primary key of the AdRequest to create a version for
    
    Optional inputs:
    - user_prompt: The user prompt for the version
    
    Returns: JSON with the AdRequestVersion instance ID
    """
    ad_request_id = request.POST.get('ad_request')
    
    # Validate inputs
    if not ad_request_id:
        return JsonResponse({'error': 'Ad request ID is required'}, status=400)
    
    try:
        # Get the AdRequest instance
        ad_request = get_object_or_404(AdRequest, id=ad_request_id)
        
        # Check if the user has permission to create a version for this request
        if ad_request.user != request.user:
            return JsonResponse({'error': 'You do not have permission to create a version for this request'}, status=403)
        
        # Get optional fields
        user_prompt = request.POST.get('user_prompt')
        
        # Create a new AdRequestVersion instance
        version = AdRequestVersion.objects.create(
            ad_request=ad_request,
            user_prompt=user_prompt,
            status=AdRequestVersion.STATUS_UNASSIGNED
        )
        
        # Return the AdRequestVersion instance ID
        return JsonResponse({
            'id': version.id,
            'status': version.status,
            'message': 'Version created successfully'
        }, status=201)
        
    except Exception as e:
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
    
    # Render the adlibrary_detail.html template with the ad_request as the object
    template = "ads/adlibrary_detail.html"
    context = {
        "active_tab": "my_requests",
        "object": ad_request.ad_library if ad_request.ad_library else None,
        "ad_request": ad_request
    }
    
    return TemplateResponse(request, template, context)
