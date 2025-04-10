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
    list_display = ["company_name", "created_at", "updated_at"]
    search_fields = ["company_name"]
    list_filter = ["industries", "tags"]
    filter_horizontal = ["industries", "tags"]


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
    list_display = ["user", "ad_library", "status", "canvas_size", "created_at", "updated_at"]
    search_fields = ["user__email", "ad_library__company_name"]
    list_filter = ["status", "canvas_size"]


@admin.register(AdRequestAssets)
class AdRequestAssetsAdmin(admin.ModelAdmin):
    list_display = ["user", "created_at", "updated_at"]
    search_fields = ["user__email"]


@admin.register(AdRequestVersion)
class AdRequestVersionAdmin(admin.ModelAdmin):
    list_display = ["ad_request", "status", "user_admin_assigned", "created_at", "updated_at"]
    search_fields = ["ad_request__ad_library__company_name", "status"]
    list_filter = ["status", "user_admin_assigned"]
