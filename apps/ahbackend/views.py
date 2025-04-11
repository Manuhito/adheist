from django.contrib.auth.decorators import login_required
from django.core.paginator import Paginator, EmptyPage, PageNotAnInteger
from django.http.response import HttpResponseRedirect, JsonResponse
from django.shortcuts import get_object_or_404, render
from django.template.response import TemplateResponse
from django.urls import reverse
from django.views.decorators.http import require_POST

from .models import AdLibrary, IndustryList, TagList, AdRequest, AdRequestAssets
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
        
        # Create a new AdRequest instance
        ad_request = AdRequest.objects.create(
            user=request.user,
            ad_library=ad_library,
            canvas_size=canvas_size if canvas_size else None
        )
        
        # Return the AdRequest instance ID
        return JsonResponse({'id': ad_request.id}, status=201)
        
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=500)


