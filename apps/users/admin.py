from django.contrib import admin
from django.contrib.auth.admin import UserAdmin

from .models import CustomUser, UserOnboarding


@admin.register(UserOnboarding)
class UserOnboardingAdmin(admin.ModelAdmin):
    list_display = ("user", "website", "competitor_research_completed", "selected_competitor_page")
    search_fields = ("user__email", "user__username", "website")
    list_filter = ("competitor_research_completed",)
    raw_id_fields = ("selected_competitor_page",)


@admin.register(CustomUser)
class CustomUserAdmin(UserAdmin):
    list_display = UserAdmin.list_display + ("date_joined", "subscription", "status")
    list_filter = UserAdmin.list_filter + ("date_joined", "status")
    ordering = ("-date_joined",)

    fieldsets = UserAdmin.fieldsets + (
        ("Custom Fields", {"fields": ("avatar", "subscription", "customer", "language", "timezone", "status")}),
    )
