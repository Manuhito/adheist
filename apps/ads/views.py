from django.contrib.auth.decorators import login_required
from django.core.paginator import Paginator, EmptyPage, PageNotAnInteger
from django.http.response import HttpResponseRedirect, JsonResponse
from django.shortcuts import get_object_or_404, render
from django.template.response import TemplateResponse
from django.urls import reverse
from django.views.decorators.http import require_POST, require_http_methods
import json

from .models import AdLibrary, IndustryList, TagList, AdRequest, AdRequestAssets, AdRequestVersion
from .forms import AdLibraryForm

# A reasonable value for pagination would be 10 or 20 entries per page.
# Here we use 4 (a very low value), so we can show off the pagination using fewer items
PAGINATE_BY = 4
# For pagination, we use get_elided_page_range() to give a list of pages that always has some
# pages at the beginning and end, and some on either side of current, with ellipsis where needed.


@login_required
def home(request):
    template = "ads/ads_home.html"
    return TemplateResponse(request, template, {"active_tab": "ads"})


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
    
    # Start with all AdLibrary objects
    adlibraries = AdLibrary.objects.all()
    
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
    Create a new AdRequest instance.
    
    Returns: JSON with the AdRequest instance ID
    """
    ad_library_id = request.POST.get('ad_library')
    canvas_size = request.POST.get('canvas_size')
    
    # Validate inputs
    if not ad_library_id:
        return JsonResponse({'error': 'Ad library ID is required'}, status=400)
    
    try:
        # Get the AdLibrary instance
        ad_library = get_object_or_404(AdLibrary, id=ad_library_id)
        
        # Check if the user already has an AdRequestAssets instance
        user_assets = AdRequestAssets.objects.filter(user=request.user).first()
        
        # If not, create one
        if not user_assets:
            user_assets = AdRequestAssets.objects.create(user=request.user)
        
        # Prepare creation parameters
        create_params = {
            'user': request.user,
            'ad_library': ad_library,
            'base_assets': user_assets,
            'canvas_size': canvas_size if canvas_size else None,
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
    return JsonResponse({
        'id': ad_request.id,
        'user_id': ad_request.user.id,
        'ad_library_id': ad_request.ad_library.id,
        'ad_library_name': ad_request.ad_library.company_name,
        'canvas_size': ad_request.canvas_size,
        'status': ad_request.status,
        'created_at': ad_request.created_at.isoformat(),
        'updated_at': ad_request.updated_at.isoformat(),
        'asset_overrides': ad_request.asset_overrides
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
def create_adrequest_page(request):
    """
    Render the create ad request page with React components.
    """
    template = "ads/create_adrequest_page.html"
    return TemplateResponse(request, template, {"active_tab": "create_adrequest"})
