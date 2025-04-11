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
    template = "ahbackend/ahbackend_home.html"
    return TemplateResponse(request, template, {"active_tab": "ahbackend"})


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
        has_image: Filter to only include entries with images (true/false)
    
    Returns: JSON with list of AdLibrary objects including company_name, industries, tags, and ad_image
    """
    from django.db.models import Q
    
    # Get filter parameters from request
    company_name = request.GET.get('company_name', '')
    industries = request.GET.getlist('industries', [])
    tags = request.GET.getlist('tags', [])
    has_image = request.GET.get('has_image', '').lower()
    
    # If single values are provided instead of lists, convert them
    if not industries and request.GET.get('industry'):
        industries = [request.GET.get('industry')]
    
    if not tags and request.GET.get('tag'):
        tags = [request.GET.get('tag')]
    
    # Start with all AdLibrary objects
    adlibraries = AdLibrary.objects.all()
    
    # Apply filters if provided
    if company_name:
        adlibraries = adlibraries.filter(company_name__icontains=company_name)
    
    # Filter by multiple industries (OR logic - must have at least one of the specified industries)
    if industries:
        industry_query = Q()
        for industry in industries:
            if industry:
                industry_query |= Q(industries__name=industry)
        if industry_query:
            adlibraries = adlibraries.filter(industry_query)
    
    # Filter by multiple tags (OR logic - must have at least one of the specified tags)
    if tags:
        tag_query = Q()
        for tag in tags:
            if tag:
                tag_query |= Q(tags__name=tag)
        if tag_query:
            adlibraries = adlibraries.filter(tag_query)
    
    if has_image == 'true':
        adlibraries = adlibraries.exclude(ad_image='')
    elif has_image == 'false':
        adlibraries = adlibraries.filter(ad_image='')
    
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
        
        # Create a new AdRequest instance with the user's assets
        ad_request = AdRequest.objects.create(
            user=request.user,
            ad_library=ad_library,
            base_assets=user_assets,
            canvas_size=canvas_size if canvas_size else None
        )
        
        # Return the AdRequest instance ID
        return JsonResponse({'id': ad_request.id}, status=201)
        
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=500)


@login_required
@require_http_methods(["GET", "POST"])
def adrequest_detail(request, pk):
    """
    Get or update an AdRequest instance.
    
    GET: Returns JSON with the AdRequest details
    POST: Updates the AdRequest and returns the updated instance
    
    Args:
        request: The HTTP request
        pk: The primary key of the AdRequest to retrieve or update
        
    Returns:
        JsonResponse with the AdRequest data or error message
    """
    # Get the AdRequest instance
    ad_request = get_object_or_404(AdRequest, id=pk)
    
    # Check if the user has permission to access this AdRequest
    if ad_request.user != request.user:
        return JsonResponse({'error': 'You do not have permission to access this request'}, status=403)
    
    if request.method == 'GET':
        # Return the AdRequest details
        response_data = {
            'id': ad_request.id,
            'user_id': ad_request.user.id,
            'ad_library_id': ad_request.ad_library.id,
            'ad_library_name': ad_request.ad_library.company_name,
            'canvas_size': ad_request.canvas_size,
            'status': ad_request.status,
            'created_at': ad_request.created_at.isoformat(),
            'updated_at': ad_request.updated_at.isoformat(),
        }
        
        # Add asset information if available
        if ad_request.base_assets:
            response_data['assets'] = {
                'company_website': ad_request.get_company_website(),
                'main_hex_color': ad_request.get_main_hex_color(),
                'key_benefits': ad_request.get_key_benefits(),
                # Include URLs for images if they exist
                'logo': ad_request.get_logo().url if ad_request.get_logo() else None,
                'product_image_1': ad_request.get_product_image_1().url if ad_request.get_product_image_1() else None,
                'product_image_2': ad_request.get_product_image_2().url if ad_request.get_product_image_2() else None,
                'app_image_1': ad_request.get_app_image_1().url if ad_request.get_app_image_1() else None,
                'app_image_2': ad_request.get_app_image_2().url if ad_request.get_app_image_2() else None,
                'marketing_image_1': ad_request.get_marketing_image_1().url if ad_request.get_marketing_image_1() else None,
                'marketing_image_2': ad_request.get_marketing_image_2().url if ad_request.get_marketing_image_2() else None,
                'marketing_image_3': ad_request.get_marketing_image_3().url if ad_request.get_marketing_image_3() else None,
            }
            
        return JsonResponse(response_data)
    
    elif request.method == 'POST':
        try:
            # Update the AdRequest fields
            if 'canvas_size' in request.POST:
                ad_request.canvas_size = request.POST.get('canvas_size')
                
            if 'status' in request.POST:
                new_status = request.POST.get('status')
                if new_status in dict(AdRequest.STATUS_CHOICES).keys():
                    ad_request.status = new_status
                else:
                    return JsonResponse({'error': f'Invalid status: {new_status}'}, status=400)
            
            # Ensure the AdRequest has base_assets
            if not ad_request.base_assets:
                # Check if the user already has an AdRequestAssets instance
                user_assets = AdRequestAssets.objects.filter(user=request.user).first()
                
                # If not, create one
                if not user_assets:
                    user_assets = AdRequestAssets.objects.create(user=request.user)
                
                # Associate the assets with the ad request
                ad_request.base_assets = user_assets
            
            # Handle asset overrides
            asset_overrides = {}
            
            # Text-based fields that can be stored in JSON
            text_fields = ['company_website', 'main_hex_color', 'key_benefits']
            for field in text_fields:
                if field in request.POST:
                    asset_overrides[field] = request.POST.get(field)
            
            # Update asset_overrides if we have any
            if asset_overrides:
                # Merge with existing overrides
                current_overrides = ad_request.asset_overrides
                current_overrides.update(asset_overrides)
                ad_request.asset_overrides = current_overrides
            
            # Handle file uploads for image overrides
            image_fields = [
                'logo', 'product_image_1', 'product_image_2', 
                'app_image_1', 'app_image_2',
                'marketing_image_1', 'marketing_image_2', 'marketing_image_3'
            ]
            
            for field in image_fields:
                if field in request.FILES:
                    # Set the override field
                    override_field = f"{field}_override"
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
    
    # This should never happen due to the @require_http_methods decorator
    return JsonResponse({'error': 'Method not allowed'}, status=405)


@login_required
@require_POST
def adrequest_version_create(request):
    """
    Create a new AdRequestVersion instance.
    
    Required input:
    - ad_request: The primary key of the AdRequest to create a version for
    
    Optional inputs:
    - generated_prompt: The generated prompt for the version
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
        generated_prompt = request.POST.get('generated_prompt')
        user_prompt = request.POST.get('user_prompt')
        
        # Create a new AdRequestVersion instance
        version = AdRequestVersion.objects.create(
            ad_request=ad_request,
            generated_prompt=generated_prompt,
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
