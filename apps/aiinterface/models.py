from django.db import models
from django.core.cache import cache


class OpenAIConfiguration(models.Model):
    """
    Model to store OpenAI-related configuration settings.
    Only one instance of this model should exist in the database.
    """
    # OpenAI Image Generation Configuration
    openai_image_model = models.CharField(
        max_length=50,
        default="gpt-image-1",
        help_text="OpenAI model to use for image generation"
    )
    
    # Image generation pricing (in USD)
    text_input_price = models.DecimalField(
        max_digits=6,
        decimal_places=2,
        default=0.00,
        help_text="Price per 1M tokens (in USD)"
    )
    
    image_input_price = models.DecimalField(
        max_digits=6,
        decimal_places=2,
        default=0.00,
        help_text="Price per 1M tokens (in USD)"
    )
    
    image_output_price = models.DecimalField(
        max_digits=6,
        decimal_places=2,
        default=0.00,
        help_text="Price per 1M tokens (in USD)"
    )
    
    # OpenAI Prompt Generation Configuration
    openai_prompt_model = models.CharField(
        max_length=50,
        default="gpt-5",
        help_text="OpenAI model to use for prompt generation"
    )
    
    # Prompt generation pricing (in USD)
    text_input_price_prompt = models.DecimalField(
        max_digits=6,
        decimal_places=2,
        default=1.25,
        help_text="Price per 1M input tokens for prompt generation (in USD)"
    )
    
    text_output_price_prompt = models.DecimalField(
        max_digits=6,
        decimal_places=2,
        default=10.00,
        help_text="Price per 1M output tokens for prompt generation (in USD)"
    )
    
    class Meta:
        verbose_name = "OpenAI Configuration"
        verbose_name_plural = "OpenAI Configuration"
    
    def __str__(self):
        return "OpenAI Configuration"
    
    def save(self, *args, **kwargs):
        """
        Override save method to ensure only one instance exists
        and to clear cache when configuration is updated.
        """
        # Ensure there's only one instance
        if not self.pk and OpenAIConfiguration.objects.exists():
            # If an instance already exists and we're trying to create a new one,
            # update the existing one instead
            existing = OpenAIConfiguration.objects.first()
            self.pk = existing.pk
        
        # Clear cache when configuration is updated
        cache.delete('openai_config')
        
        super().save(*args, **kwargs)
    
    @classmethod
    def get_config(cls):
        """
        Get the OpenAI configuration, using cache to improve performance.
        
        Returns:
            OpenAIConfiguration: The OpenAI configuration object
        """
        config = cache.get('openai_config')
        if not config:
            config, created = cls.objects.get_or_create(pk=1)
            cache.set('openai_config', config, 3600)  # Cache for 1 hour
        return config
    
    @classmethod
    def get_openai_config(cls):
        """
        Get the OpenAI configuration settings.
        
        Returns:
            dict: OpenAI configuration settings
        """
        config = cls.get_config()
        return {
            'openai_image_model': config.openai_image_model,
            'text_input_price': config.text_input_price,
            'image_input_price': config.image_input_price,
            'image_output_price': config.image_output_price,
            'openai_prompt_model': config.openai_prompt_model,
            'text_input_price_prompt': config.text_input_price_prompt,
            'text_output_price_prompt': config.text_output_price_prompt,
        }
