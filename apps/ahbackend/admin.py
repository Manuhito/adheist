from django.contrib import admin

from .models import (
    AdLibrary,
    IndustryList,
    TagList,
    AdRequest,
    AdRequestAssets,
    AdRequestVersion,
)


@admin.register(AdLibrary)
class AdLibraryAdmin(admin.ModelAdmin):
    list_display = ["company_name", "industry", "tag", "created_at", "updated_at"]
    search_fields = ["company_name"]
    list_filter = ["industry", "tag"]


@admin.register(IndustryList)
class IndustryListAdmin(admin.ModelAdmin):
    list_display = ["name", "created_at", "updated_at"]
    search_fields = ["name"]


@admin.register(TagList)
class TagListAdmin(admin.ModelAdmin):
    list_display = ["name", "created_at", "updated_at"]
    search_fields = ["name"]


@admin.register(AdRequest)
class AdRequestAdmin(admin.ModelAdmin):
    list_display = ["user", "ad_library", "created_at", "updated_at"]
    search_fields = ["user__email", "ad_library__company_name"]
    list_filter = ["ad_library__industry"]


@admin.register(AdRequestAssets)
class AdRequestAssetsAdmin(admin.ModelAdmin):
    list_display = ["company_website", "created_at", "updated_at"]
    search_fields = ["company_website"]


@admin.register(AdRequestVersion)
class AdRequestVersionAdmin(admin.ModelAdmin):
    list_display = ["ad_request", "status", "user_admin_assigned", "created_at", "updated_at"]
    search_fields = ["ad_request__ad_library__company_name", "status"]
    list_filter = ["status", "user_admin_assigned"]
