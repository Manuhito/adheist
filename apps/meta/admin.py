from django.contrib import admin

from .models import ApiConfiguration, FacebookPage


@admin.register(ApiConfiguration)
class ApiConfigurationAdmin(admin.ModelAdmin):
    list_display = ["limit", "created_at", "updated_at"]
    readonly_fields = ["created_at", "updated_at"]
    fieldsets = (
        ("Parámetros de API", {
            "fields": ("ad_reached_countries", "content_languages", "media_types", "fields", "limit")
        }),
        ("Información de auditoría", {
            "fields": ("created_at", "updated_at"),
            "classes": ("collapse",)
        }),
    )
    
    def has_add_permission(self, request):
        # Prevenir la creación de múltiples configuraciones
        return not ApiConfiguration.objects.exists()
    
    def has_delete_permission(self, request, obj=None):
        # Prevenir la eliminación de la configuración
        return False


@admin.register(FacebookPage)
class FacebookPageAdmin(admin.ModelAdmin):
    list_display = ["page_id", "page_name", "industry", "country", "is_active"]
    list_filter = ["industry", "country", "is_active"]
    search_fields = ["page_id", "page_name", "industry"]
    readonly_fields = ["created_at", "updated_at"]
    fieldsets = (
        (None, {
            "fields": ("page_id", "page_name", "is_active")
        }),
        ("Información adicional", {
            "fields": ("industry", "country", "notes")
        }),
        ("Información de auditoría", {
            "fields": ("created_at", "updated_at"),
            "classes": ("collapse",)
        }),
    )
