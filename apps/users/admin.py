from django.contrib import admin
from django.contrib.auth.admin import UserAdmin

from .models import CustomUser, UserOnboarding


@admin.register(UserOnboarding)
class UserOnboardingAdmin(admin.ModelAdmin):
    list_display = ("user", "website", "brand", "competitor_research_completed", "selected_competitor_page", "selected_ad_library", "canvas_size")
    search_fields = ("user__email", "user__username", "website", "brand__brand_name")
    list_filter = ("competitor_research_completed", "canvas_size")
    raw_id_fields = ("selected_competitor_page", "selected_ad_library", "brand")
    readonly_fields = ("asset_image_1", "asset_image_2", "asset_image_3", "website_screenshot")
    
    fieldsets = (
        (None, {
            'fields': ('user', 'website', 'website_screenshot', 'brand', 'competitors')
        }),
        ('Competitor Research', {
            'fields': ('competitor_research_completed', 'selected_competitor_page', 'selected_ad_library')
        }),
        ('Step 5 Assets', {
            'fields': ('asset_image_1', 'asset_image_2', 'asset_image_3', 'canvas_size', 'prompt')
        }),
    )


@admin.register(CustomUser)
class CustomUserAdmin(UserAdmin):
    list_display = UserAdmin.list_display + ("date_joined", "subscription", "status")
    list_filter = UserAdmin.list_filter + ("date_joined", "status")
    ordering = ("-date_joined",)

    fieldsets = UserAdmin.fieldsets + (
        ("Custom Fields", {"fields": ("avatar", "subscription", "customer", "language", "timezone", "status")}),
    )
