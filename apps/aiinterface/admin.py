from django.contrib import admin
from .models import OpenAIConfiguration, ReplicateConfiguration


@admin.register(ReplicateConfiguration)
class ReplicateConfigurationAdmin(admin.ModelAdmin):
    """
    Admin configuration for ReplicateConfiguration model.
    """
    list_display = (
        'image_replicate_model',
        'image_replicate_model_version',
        'image_generation_price',
        'timeout_seconds',
        'polling_interval_seconds',
    )
    
    fieldsets = (
        ('Replicate Image Model Configuration', {
            'fields': ('image_replicate_model', 'image_replicate_model_version'),
            'description': 'Configure Replicate model for image generation. Format: owner/model-name. Leave version empty to use latest.'
        }),
        ('Pricing Configuration', {
            'fields': ('image_generation_price',),
            'description': 'Configure pricing for Replicate image generation (in USD per image)'
        }),
        ('Performance Configuration', {
            'fields': ('timeout_seconds', 'polling_interval_seconds'),
            'description': 'Configure timeout and polling settings for Replicate API'
        }),
    )
    
    def has_add_permission(self, request):
        """Only allow adding if no instance exists yet."""
        return not ReplicateConfiguration.objects.exists()
    
    def has_delete_permission(self, request, obj=None):
        """Prevent deletion of the configuration."""
        return False


@admin.register(OpenAIConfiguration)
class OpenAIConfigurationAdmin(admin.ModelAdmin):
    """
    Admin configuration for OpenAIConfiguration model.
    """
    list_display = (
        'openai_image_model',
        'openai_prompt_model',
        'web_parsing_model',
        'openai_text_copy_model',
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
        ('Web Parsing Configuration', {
            'fields': ('web_parsing_model', 'web_parsing_input_price', 'web_parsing_output_price', 'web_parsing_prompt'),
            'description': 'Configure OpenAI settings for website content analysis. The prompt field contains custom extraction instructions that will be combined with the website content and hardcoded response format requirements.'
        }),
        ('Ad Copy Text Generation', {
            'fields': ('openai_text_copy_model', 'copy_text_input_price', 'copy_text_output_price'),
            'description': 'Configure OpenAI settings for ad copy text generation (in USD per 1M tokens)'
        }),
    )
    
    def has_add_permission(self, request):
        """Only allow adding if no instance exists yet."""
        return not OpenAIConfiguration.objects.exists()
    
    def has_delete_permission(self, request, obj=None):
        """Prevent deletion of the configuration."""
        return False
