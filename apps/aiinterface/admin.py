from django.contrib import admin
from .models import OpenAIConfiguration


@admin.register(OpenAIConfiguration)
class OpenAIConfigurationAdmin(admin.ModelAdmin):
    """
    Admin configuration for OpenAIConfiguration model.
    """
    list_display = (
        'openai_image_model',
        'text_input_price',
        'image_input_price',
        'image_output_price',
    )
    
    fieldsets = (
        ('Model Configuration', {
            'fields': ('openai_image_model',),
        }),
        ('Pricing Configuration', {
            'fields': ('text_input_price', 'image_input_price', 'image_output_price'),
            'description': 'Configure pricing for different types of OpenAI API requests (in USD)'
        }),
    )
    
    def has_add_permission(self, request):
        """Only allow adding if no instance exists yet."""
        return not OpenAIConfiguration.objects.exists()
    
    def has_delete_permission(self, request, obj=None):
        """Prevent deletion of the configuration."""
        return False
