from django.contrib import admin
from django.http import HttpResponseRedirect
from django.urls import path, reverse
from django.utils import timezone
from django.contrib import messages
from django.core.management import call_command
from django.utils.safestring import mark_safe

from .models import FacebookPage, Backload, MetaApiToken


@admin.register(Backload)
class BackloadAdmin(admin.ModelAdmin):
    list_display = ["__str__", "last_run", "created_at"]
    list_filter = ["created_at", "last_run"]
    search_fields = []
    readonly_fields = ["created_at", "updated_at", "last_run", "output_file", "run_query_button", "ad_reached_countries"]
    filter_horizontal = ["pages"]
    
    fieldsets = (
        ("Pages to query", {
            "fields": ("pages",)
        }),
        ("API Parameters", {
            "fields": ("ad_reached_countries", "content_languages", "media_types", "fields", "limit")
        }),
        ("Execution Information", {
            "fields": ("last_run", "output_file", "run_query_button")
        }),
        ("Audit Information", {
            "fields": ("created_at", "updated_at"),
            "classes": ("collapse",)
        }),
    )
    
    def get_urls(self):
        urls = super().get_urls()
        custom_urls = [
            path(
                '<path:object_id>/run/',
                self.admin_site.admin_view(self.run_fetch_command),
                name=f'{self.model._meta.app_label}_{self.model._meta.model_name}_run',
            ),
        ]
        return custom_urls + urls
    
    
    def run_query_button(self, obj):
        if obj.pk:
            url = reverse(
                f'admin:{self.model._meta.app_label}_{self.model._meta.model_name}_run',
                args=[obj.pk]
            )
            return mark_safe(f'''
            <a class="button" href="{url}">
                Run Query
            </a>
            ''')
        return "-"
    run_query_button.short_description = "Run Query"
    
    def run_fetch_command(self, request, object_id):
        # Obtener el objeto
        obj = self.get_object(request, object_id)
        if obj is None:
            return HttpResponseRedirect(reverse(f'admin:{self.model._meta.app_label}_{self.model._meta.model_name}_changelist'))
        
        try:
            # Obtener IDs de página
            page_ids = list(obj.pages.filter(is_active=True).values_list('page_id', flat=True))
            
            if not page_ids:
                messages.error(request, "No active pages selected for query.")
                return HttpResponseRedirect(reverse(
                    f'admin:{self.model._meta.app_label}_{self.model._meta.model_name}_change', 
                    args=[object_id]
                ))
            
            # Preparar argumentos para el comando
            output_dir = f"meta_ads_results_{obj._meta.model_name}_{obj.pk}"
            
            # Obtener el token activo del modelo MetaApiToken
            token = MetaApiToken.get_active_token()
            
            if not token:
                messages.error(request, "No active API token found. Please add a token in the Meta API Tokens section.")
                return HttpResponseRedirect(reverse(
                    f'admin:{self.model._meta.app_label}_{self.model._meta.model_name}_change', 
                    args=[object_id]
                ))
            
            # Llamar al comando de Django
            call_command(
                'fetch_meta_ads',
                token=token,
                output_dir=output_dir,
                page_ids=page_ids,
                ad_reached_countries=obj.ad_reached_countries,
                content_languages=obj.content_languages,
                media_types=obj.media_types,
                fields=obj.fields,
                limit=obj.limit
            )
            
            # Actualizar información de ejecución
            obj.last_run = timezone.now()
            obj.output_file = output_dir
            obj.save(update_fields=['last_run', 'output_file'])
            
            messages.success(request, f"Command executed successfully. Results saved in {output_dir}")
        except Exception as e:
            messages.error(request, f"Error executing command: {str(e)}")
        
        return HttpResponseRedirect(reverse(
            f'admin:{self.model._meta.app_label}_{self.model._meta.model_name}_change', 
            args=[object_id]
        ))


@admin.register(MetaApiToken)
class MetaApiTokenAdmin(admin.ModelAdmin):
    list_display = ["name", "is_active", "expires_at", "created_at"]
    list_filter = ["is_active", "created_at", "expires_at"]
    search_fields = ["name", "notes"]
    readonly_fields = ["created_at", "updated_at"]
    
    fieldsets = (
        (None, {
            "fields": ("name", "token", "is_active")
        }),
        ("Additional Information", {
            "fields": ("expires_at", "notes")
        }),
        ("Audit Information", {
            "fields": ("created_at", "updated_at"),
            "classes": ("collapse",)
        }),
    )


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
        ("Additional Information", {
            "fields": ("industry", "country", "notes")
        }),
        ("Audit Information", {
            "fields": ("created_at", "updated_at"),
            "classes": ("collapse",)
        }),
    )
