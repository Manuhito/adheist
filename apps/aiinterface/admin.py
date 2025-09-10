from django.contrib import admin
from .models import OpenAIConfiguration


@admin.register(OpenAIConfiguration)
class OpenAIConfigurationAdmin(admin.ModelAdmin):
    """
    Admin configuration for OpenAIConfiguration model.
    """
    list_display = (
        'openai_image_model',
        'openai_prompt_model',
        'text_input_price',
        'image_input_price',
        'image_output_price',
    )
    
    fieldsets = (
        ('OpenAI Image Generation', {
            'fields': ('openai_image_model', 'text_input_price', 'image_input_price', 'image_output_price'),
            'description': 'Configure OpenAI settings for image generation (in USD per 1M tokens)'
        }),
        ('OpenAI Prompt Generation', {
            'fields': ('openai_prompt_model', 'text_input_price_prompt', 'text_output_price_prompt'),
            'description': 'Configure OpenAI settings for prompt generation (in USD per 1M tokens)'
        }),
    )
    
    def has_add_permission(self, request):
        """Only allow adding if no instance exists yet."""
        return not OpenAIConfiguration.objects.exists()
    
    def has_delete_permission(self, request, obj=None):
        """Prevent deletion of the configuration."""
        return False
