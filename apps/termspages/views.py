from django.core.paginator import Paginator, EmptyPage, PageNotAnInteger
from django.http.response import HttpResponseRedirect
from django.shortcuts import render
from django.template.response import TemplateResponse
from .models import TermsAndConditions, PrivacyPolicy

# A reasonable value for pagination would be 10 or 20 entries per page.
# Here we use 4 (a very low value), so we can show off the pagination using fewer items
PAGINATE_BY = 4
# For pagination, we use get_elided_page_range() to give a list of pages that always has some
# pages at the beginning and end, and some on either side of current, with ellipsis where needed.


def terms_of_service(request):
    """Display the Terms and Conditions page."""
    terms = TermsAndConditions.objects.first()
    return render(request, "termspages/terms.html", {
        "content": terms.content if terms else "",
        "title": "Terms of Service"
    })

def privacy_policy(request):
    """Display the Privacy Policy page."""
    privacy = PrivacyPolicy.objects.first()
    return render(request, "termspages/privacy.html", {
        "content": privacy.content if privacy else "",
        "title": "Privacy Policy"
    })





