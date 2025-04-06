from django.contrib import admin

from .models import AdLibrary


@admin.register(AdLibrary)
class AdLibraryAdmin(admin.ModelAdmin):
    list_display = ["name", "user", "created_at", "updated_at"]
    search_fields = ["name", "user__email"]
