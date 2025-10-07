"""AdHeist URL Configuration

The `urlpatterns` list routes URLs to views. For more information please see:
    https://docs.djangoproject.com/en/stable/topics/http/urls/
Examples:
Function views
    1. Add an import:  from my_app import views
    2. Add a URL to urlpatterns:  path('', views.home, name='home')
Class-based views
    1. Add an import:  from other_app.views import Home
    2. Add a URL to urlpatterns:  path('', Home.as_view(), name='home')
Including another URLconf
    1. Import the include() function: from django.urls import include, path
    2. Add a URL to urlpatterns:  path('blog/', include('blog.urls'))
"""

from django.conf import settings
from django.conf.urls.static import static
from django.contrib import admin
from django.contrib.sitemaps.views import sitemap
from django.urls import path, include
from django.views.generic import RedirectView
from django.views.i18n import JavaScriptCatalog
from drf_spectacular.views import SpectacularAPIView, SpectacularSwaggerView, SpectacularRedocView

from wagtail.admin import urls as wagtailadmin_urls
from wagtail import urls as wagtail_urls
from wagtail.api.v2.views import PagesAPIViewSet
from wagtail.documents.api.v2.views import DocumentsAPIViewSet
from wagtail.images.api.v2.views import ImagesAPIViewSet
from wagtail.api.v2.router import WagtailAPIRouter
from wagtail.contrib.sitemaps import Sitemap
from wagtail.documents import urls as wagtaildocs_urls
from apps.web.sitemaps import StaticViewSitemap, MarketingPagesSitemap
from apps.termspages import views as termspages_views
from apps.ads import views as ads_views

# Create the API router
api_router = WagtailAPIRouter('wagtailapi')

# Register the API endpoints
api_router.register_endpoint('pages', PagesAPIViewSet)
api_router.register_endpoint('documents', DocumentsAPIViewSet)
api_router.register_endpoint('images', ImagesAPIViewSet)

PagesAPIViewSet.schema = None  # hacky workaround for https://github.com/wagtail/wagtail/issues/8583

sitemaps = {
    "wagtail": Sitemap(),
    "static": StaticViewSitemap(),
    "marketing_pages": MarketingPagesSitemap(),
}

urlpatterns = [
    # redirect Django admin login to main login page
    path("admin/login/", RedirectView.as_view(pattern_name="account_login")),
    path("admin/", admin.site.urls),
    path("dashboard/", include("apps.dashboard.urls")),
    path("i18n/", include("django.conf.urls.i18n")),
    path("jsi18n/", JavaScriptCatalog.as_view(), name="javascript-catalog"),
    path("sitemap.xml", sitemap, {"sitemaps": sitemaps}, name="django.contrib.sitemaps.views.sitemap"),
    path("accounts/", include("allauth.urls")),
    path("users/", include("apps.users.urls")),
    path("subscriptions/", include("apps.subscriptions.urls")),
    path("ads/", include("apps.ads.urls")),
    path("aiinterface/", include("apps.aiinterface.urls")),
    path("terms-of-service/", termspages_views.terms_of_service, name="terms"),
    path("privacy-policy/", termspages_views.privacy_policy, name="privacy"),
    path('summernote/', include('django_summernote.urls')),
    path("", include("apps.web.urls")),
    path("celery-progress/", include("celery_progress.urls")),
    # API docs
    path("api/schema/", SpectacularAPIView.as_view(), name="schema"),
    # Optional UI - you may wish to remove one of these depending on your preference
    path("api/schema/swagger-ui/", SpectacularSwaggerView.as_view(url_name="schema"), name="swagger-ui"),
    path("api/schema/redoc/", SpectacularRedocView.as_view(url_name="schema"), name="redoc"),
    # Wagtail API
    path('api/v2/', api_router.urls),
    # djstripe urls - for webhooks
    path("stripe/", include("djstripe.urls", namespace="djstripe")),
    # wagtail config
    # redirect Wagtail admin login to main login page
    path('cms/', include(wagtailadmin_urls)),  # The Wagtail admin interface
    path("cms/login/", RedirectView.as_view(pattern_name="account_login")),
    path('documents/', include(wagtaildocs_urls)),  # The Wagtail document library
    # Add Wagtail's URL patterns at the end. It will catch all URLs that weren't matched by previous patterns
    # This will automatically handle:
    # - /blog/ -> blog index page
    # - /blog/post-slug/ -> individual blog posts
    # Dynamic marketing pages URLs - MUST be before Wagtail's catch-all
    # With optional path prefix (e.g., /services/slug/, /products/slug/, or just /slug/)
    path("<slug:slug>/", ads_views.marketing_page_view, name="marketing_page_view"),
    path("<str:path_prefix>/<slug:slug>/", ads_views.marketing_page_view, name="marketing_page_view_with_prefix"),
    path('', include(wagtail_urls)),
] + static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
