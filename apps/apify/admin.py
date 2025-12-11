from django.contrib import admin
from django.http import HttpResponseRedirect
from django.urls import path, reverse
from django.utils import timezone
from django.contrib import messages
from django.core.management import call_command
from django.utils.safestring import mark_safe

from .models import FacebookPage, Backload
from .tasks import fetch_apify_ads


@admin.register(Backload)
class BackloadAdmin(admin.ModelAdmin):
    list_display = ["get_page_names","ad_delivery_date_min", "content_languages", "media_types", "ad_active_status", "status", "last_run", "created_at"]
    list_filter = ["status", "ad_active_status", "created_at", "last_run"]
    search_fields = []
    readonly_fields = ["created_at", "updated_at", "last_run", "output_file", "error_log", "run_query_button", "status"]
    filter_horizontal = ["pages"]
    
    fieldsets = (
        ("Pages to query", {
            "fields": ("pages",)
        }),
        ("API Parameters", {
            "fields": ("ad_reached_countries", "content_languages", "media_types", "ad_delivery_date_min", "ad_active_status")
        }),
        ("Execution Information", {
            "fields": ("status", "last_run", "output_file", "error_log", "run_query_button")
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
    
    
    def get_page_names(self, obj):
        pages = obj.pages.all()
        if not pages:
            return "-"
        page_names = ", ".join([page.page_name for page in pages[:3]])
        if pages.count() > 3:
            page_names += f" and {pages.count() - 3} more"
        return page_names
    get_page_names.short_description = "Pages"
    
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
            # Obtener páginas activas
            active_pages = obj.pages.filter(is_active=True)
            
            if not active_pages.exists():
                messages.error(request, "No active pages selected for query.")
                return HttpResponseRedirect(reverse(
                    f'admin:{self.model._meta.app_label}_{self.model._meta.model_name}_change', 
                    args=[object_id]
                ))
            
            # Set status to pending before starting execution
            obj.status = Backload.STATUS_PENDING
            obj.save(update_fields=['status'])
            
            # Preparar argumentos para el comando
            output_dir = f"meta_ads_results_{obj._meta.model_name}_{obj.pk}"
            
            # No longer need to check for Meta API token in apify app
            
            # Actualizar last_run y status
            obj.last_run = timezone.now()
            obj.status = Backload.STATUS_PENDING
            obj.save(update_fields=['last_run', 'status'])
            
            # Actualizar información de ejecución
            obj.output_file = output_dir
            obj.save(update_fields=['output_file'])
            
            # Lanzar una tarea de Celery por cada página
            tasks_launched = 0
            for page in active_pages:
                # Construir la URL para esta página específica
                url = obj.get_facebook_ads_url_for_page(page.page_id)
                
                # Ejecutar la tarea de Celery en segundo plano para esta página
                fetch_apify_ads.delay(
                    output_dir=f"{output_dir}_{page.page_id}",
                    urls=[{'url': url}],
                    page_id=page.page_id,
                    backload_id=obj.pk
                )
                tasks_launched += 1
            
            messages.success(request, f"Se han iniciado {tasks_launched} tareas de consulta a la API de Apify en segundo plano, una por cada página. Los resultados se guardarán en {output_dir}_[page_id]. El estado se actualizará automáticamente cuando finalicen.")
        except Exception as e:
            messages.error(request, f"Error executing command: {str(e)}")

        
        return HttpResponseRedirect(reverse(
            f'admin:{self.model._meta.app_label}_{self.model._meta.model_name}_change', 
            args=[object_id]
        ))


# MetaApiToken admin has been removed as it's not needed in the apify app


@admin.register(FacebookPage)
class FacebookPageAdmin(admin.ModelAdmin):
    list_display = ["page_id", "page_name", "page_url", "country", "is_active"]
    list_filter = ["country", "is_active", "industries"]
    search_fields = ["page_id", "page_name"]
    readonly_fields = ["created_at", "updated_at"]
    filter_horizontal = ["industries"]
    fieldsets = (
        (None, {
            "fields": ("page_id", "page_name", "page_url", "is_active")
        }),
        ("Additional Information", {
            "fields": ("industries", "country", "notes")
        }),
        ("Apify Settings", {
            "fields": ("apify_api_key",)
        }),
        ("Audit Information", {
            "fields": ("created_at", "updated_at"),
            "classes": ("collapse",)
        }),
    )
