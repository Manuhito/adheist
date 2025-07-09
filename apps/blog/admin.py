from django.contrib import admin
from django.contrib import messages
from django.http import HttpResponseRedirect
from django.urls import path, reverse
from django.utils import timezone
from django.utils.html import format_html

from .models import BlogApiConfig
from .api_utils import import_posts_from_api


@admin.register(BlogApiConfig)
class BlogApiConfigAdmin(admin.ModelAdmin):
    list_display = ('api_endpoint', 'last_import', 'import_button')
    readonly_fields = ('last_import', 'import_button')
    fieldsets = (
        (None, {
            'fields': ('api_endpoint', 'api_key')
        }),
        ('Information', {
            'fields': ('last_import', 'import_button')
        }),
    )
    
    def has_add_permission(self, request):
        # Only allow creating an instance if none exists
        return not BlogApiConfig.objects.exists()
    
    def has_delete_permission(self, request, obj=None):
        # Do not allow deleting the configuration
        return False
    
    def import_button(self, obj):
        if obj and obj.pk:
            url = reverse('admin:import_blog_posts', args=[obj.pk])
            return format_html(
                '<a class="button" href="{}">Import Posts</a>',
                url
            )
        return ""
    import_button.short_description = "Acciones"
    
    def get_urls(self):
        urls = super().get_urls()
        custom_urls = [
            path(
                '<int:config_id>/import/',
                self.admin_site.admin_view(self.import_posts_view),
                name='import_blog_posts',
            ),
        ]
        return custom_urls + urls
    
    def import_posts_view(self, request, config_id):
        """View to import posts from the external API"""
        config = BlogApiConfig.objects.get(pk=config_id)
        
        try:
            # Importar posts
            created_posts = import_posts_from_api()
            
            # Actualizar fecha de última importación
            config.last_import = timezone.now()
            config.save(update_fields=['last_import'])
            
            # Success message
            messages.success(
                request, 
                f'Successfully imported {len(created_posts)} posts.'
            )
        except Exception as e:
            # Error message
            messages.error(
                request, 
                f'Error importing posts: {str(e)}'
            )
        
        # Redirect back to the detail view
        return HttpResponseRedirect(
            reverse('admin:blog_blogapiconfig_change', args=[config_id])
        )
