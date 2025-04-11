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


@login_required
def adlibrary_list(request):
    """Display a list of AdLibrarys."""
    context = {}
    adlibrary_list = AdLibrary.objects.all().order_by("-created_at")

    paginator = Paginator(adlibrary_list, PAGINATE_BY)
    page = request.GET.get("page", 1)
    try:
        page = paginator.page(page)
    except PageNotAnInteger:
        page = paginator.page(1)
    except EmptyPage:
        page = paginator.page(paginator.num_pages)

    template = "ahbackend/adlibrary_list.html"

    context["active_tab"] = "ahbackend"
    context["page_obj"] = page
    context["object_list"] = page.object_list
    context["is_paginated"] = page.has_other_pages
    context["elided_page_range"] = list(paginator.get_elided_page_range(page.number, on_each_side=2, on_ends=1))
    return render(request, template, context)


@login_required
def adlibrary_detail(request, pk):
    """Display AdLibrary details."""
    context = {}
    context["active_tab"] = "ahbackend"
    context["object"] = get_object_or_404(AdLibrary, id=pk)

    template = "ahbackend/adlibrary_detail.html"

    return render(request, template, context)


@login_required
def adlibrary_create(request):
    """Create a new AdLibrary."""
    context = {}
    form = AdLibraryForm(request.POST or None, request.FILES or None)
    if form.is_valid():
        form.save()
        return HttpResponseRedirect(reverse("ahbackend:adlibrary_list"))

    template = "ahbackend/adlibrary_form.html"

    # Get all industries and tags for the form context
    context["industries"] = IndustryList.objects.all()
    context["tags"] = TagList.objects.all()
    context["active_tab"] = "ahbackend"
    context["form"] = form
    return render(request, template, context)


@login_required
def adlibrary_update(request, pk):
    """Edit / update a AdLibrary."""
    context = {}
    obj = get_object_or_404(AdLibrary, id=pk)
    form = AdLibraryForm(request.POST or None, request.FILES or None, instance=obj)
    if form.is_valid():
        form.save()
        return HttpResponseRedirect(reverse("ahbackend:adlibrary_detail", kwargs={"pk": pk}))

    template = "ahbackend/adlibrary_form.html"
    
    # Get all industries and tags for the form context
    context["industries"] = IndustryList.objects.all()
    context["tags"] = TagList.objects.all()
    context["active_tab"] = "ahbackend"
    context["form"] = form
    context["object"] = obj
    return render(request, template, context)


@login_required
@require_POST
def adlibrary_delete(request, pk):
    """Delete a AdLibrary."""
    obj = get_object_or_404(AdLibrary, id=pk)
    obj.delete()
    return HttpResponseRedirect(reverse("ahbackend:adlibrary_list"))


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
