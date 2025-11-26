from django.contrib import admin
from django.contrib.auth.admin import UserAdmin

from .models import CustomUser, UserOnboarding


@admin.register(UserOnboarding)
class UserOnboardingAdmin(admin.ModelAdmin):
    list_display = ("user", "website")
    search_fields = ("user__email", "user__username", "website")


@admin.register(CustomUser)
class CustomUserAdmin(UserAdmin):
    list_display = UserAdmin.list_display + ("date_joined", "subscription", "status")
    list_filter = UserAdmin.list_filter + ("date_joined", "status")
    ordering = ("-date_joined",)

    fieldsets = UserAdmin.fieldsets + (
        ("Custom Fields", {"fields": ("avatar", "subscription", "customer", "language", "timezone", "status")}),
    )
