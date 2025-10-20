from django.urls import path
from django.views.generic import TemplateView

from . import views

app_name = "web"
urlpatterns = [
    path("", views.home, name="home"),
    path("robots.txt", TemplateView.as_view(template_name="robots.txt", content_type="text/plain"), name="robots.txt"),
    # these views are just for testing error pages
    # actual error handling is handled by Django: https://docs.djangoproject.com/en/4.1/ref/views/#error-views
    path("400/", TemplateView.as_view(template_name="400.html"), name="400"),
    path("403/", TemplateView.as_view(template_name="403.html"), name="403"),
    path("404/", TemplateView.as_view(template_name="404.html"), name="404"),
    path("500/", TemplateView.as_view(template_name="500.html"), name="500"),
    path("simulate_error/", views.simulate_error),
    path(
        "ui/shadcn/",
        TemplateView.as_view(
            template_name="web/ui_demos/shadcn_demo.html", extra_context={"active_tab": "shadcn-demo"}
        ),
        name="shadcn",
    ),
    path("pricing/", views.pricing_page, name="pricing_page"),
    path("industries/", views.marketing_pages_index, name="marketing_pages_index"),
    path("create-ngo-ads/", TemplateView.as_view(template_name="marketing_pages/ngo.html"), name="ngo_page"),
    path("create-pharmacy-ads/", TemplateView.as_view(template_name="marketing_pages/pharmacy.html"), name="pharmacy_page"),
    path("create-saas-ads/", TemplateView.as_view(template_name="marketing_pages/saas.html"), name="saas_page"),
    path("create-luxury-ads/", TemplateView.as_view(template_name="marketing_pages/luxury.html"), name="luxury_page"),
    path("create-lawyers-ads/", TemplateView.as_view(template_name="marketing_pages/lawyers.html"), name="lawyers_page"),
    path("create-retailers-ads/", TemplateView.as_view(template_name="marketing_pages/retailers.html"), name="retailers_page"),
    path("create-restaurants-ads/", TemplateView.as_view(template_name="marketing_pages/restaurants.html"), name="restaurants_page"),
    path("create-real-estate-ads/", TemplateView.as_view(template_name="marketing_pages/real-estate.html"), name="real_estate_page"),
    path("create-plumber-ads/", TemplateView.as_view(template_name="marketing_pages/plumber.html"), name="plumber_page"),
    path("create-electrician-ads/", TemplateView.as_view(template_name="marketing_pages/electrician.html"), name="electrician_page"),
    path("create-hvac-contractor-ads/", TemplateView.as_view(template_name="marketing_pages/hvac-contractor.html"), name="hvac_contractor_page"),
    path("create-pest-control-ads/", TemplateView.as_view(template_name="marketing_pages/pest-control.html"), name="pest_control_page"),
    path("create-landscaper-ads/", TemplateView.as_view(template_name="marketing_pages/landscaper.html"), name="landscaper_page"),
    path("create-lawn-care-ads/", TemplateView.as_view(template_name="marketing_pages/lawn-care.html"), name="lawn_care_page"),
    path("create-house-cleaner-ads/", TemplateView.as_view(template_name="marketing_pages/house-cleaner.html"), name="house_cleaner_page"),
    path("create-carpet-cleaner-ads/", TemplateView.as_view(template_name="marketing_pages/carpet-cleaner.html"), name="carpet_cleaner_page"),
    path("create-painter-ads/", TemplateView.as_view(template_name="marketing_pages/painter.html"), name="painter_page"),
    path("create-roofer-ads/", TemplateView.as_view(template_name="marketing_pages/roofer.html"), name="roofer_page"),
    path("create-general-contractor-ads/", TemplateView.as_view(template_name="marketing_pages/general-contractor.html"), name="general_contractor_page"),
    path("create-handyman-ads/", TemplateView.as_view(template_name="marketing_pages/handyman.html"), name="handyman_page"),
    path("create-pool-service-ads/", TemplateView.as_view(template_name="marketing_pages/pool-service.html"), name="pool_service_page"),
]
