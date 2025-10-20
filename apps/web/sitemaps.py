from django.contrib import sitemaps
from django.urls import reverse

from .meta import get_protocol
from apps.ads.models import MarketingPagesRouter, AdAgencyTemplate


class StaticViewSitemap(sitemaps.Sitemap):
    """
    Sitemap for serving any static content you want.
    """

    @property
    def protocol(self):
        return get_protocol()

    def items(self):
        # add any urls (by name) for static content you want to appear in your sitemap to this list
        return [
            "terms",
            "privacy",
            "web:pricing_page",
            "web:marketing_pages_index",
            "web:ngo_page",
            "web:pharmacy_page",
            "web:saas_page",
            "web:luxury_page",
            "web:lawyers_page",
            "web:retailers_page",
            "web:restaurants_page",
            "web:real_estate_page",
            "web:plumber_page",
            "web:electrician_page",
            "web:hvac_contractor_page",
            "web:pest_control_page",
            "web:landscaper_page",
            "web:lawn_care_page",
            "web:house_cleaner_page",
            "web:carpet_cleaner_page",
            "web:painter_page",
            "web:roofer_page",
            "web:general_contractor_page",
            "web:handyman_page",
            "web:pool_service_page",
            "web:window_cleaner_page",
            "web:pressure_washing_page",
            "web:tree_service_page",
            "web:locksmith_page",
            "web:home_inspector_page",
            "web:garage_door_repair_page",
            "web:appliance_repair_page",
            "web:flooring_contractor_page",
            "web:chiropractor_page",
            "web:massage_therapist_page",
            "web:dentist_page",
            "web:optometrist_page",
            "web:physical_therapist_page",
            "web:acupuncturist_page",
        ]

    def location(self, item):
        return reverse(item)


class MarketingPagesSitemap(sitemaps.Sitemap):
    """
    Sitemap for dynamic marketing pages created via MarketingPagesRouter.
    """
    @property
    def protocol(self):
        return get_protocol()

    def items(self):
        """
        Returns a queryset of MarketingPagesRouter objects that point to published content.
        """
        published_pages = []
        for router in MarketingPagesRouter.objects.all():
            # Check if the related content object has a 'status' attribute
            if hasattr(router.content_object, 'status') and router.content_object.status == AdAgencyTemplate.STATUS_PUBLISHED:
                published_pages.append(router)
        return published_pages

    def location(self, item):
        """
        Returns the URL for a given item.
        """
        if item.path_prefix:
            return reverse('marketing_page_view_with_prefix', kwargs={
                'path_prefix': item.path_prefix,
                'slug': item.slug
            })
        return reverse('marketing_page_view', kwargs={'slug': item.slug})
