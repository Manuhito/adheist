from django.db import models
from django.core.cache import cache


class ReplicateConfiguration(models.Model):
    """
    Model to store Replicate-related configuration settings.
    Only one instance of this model should exist in the database.
    """
    # Replicate Image Generation Configuration
    image_replicate_model = models.CharField(
        max_length=200,
        default="google/nano-banana",
        help_text="Replicate model to use for image generation (format: owner/model-name)"
    )
    
    image_replicate_model_version = models.CharField(
        max_length=100,
        blank=True,
        help_text="Specific version hash of the model (optional, uses latest if empty)"
    )
    
    # Image generation pricing (in USD)
    image_generation_price = models.DecimalField(
        max_digits=8,
        decimal_places=4,
        default=0.04,
        help_text="Price per image generation (in USD)"
    )
    
    # Timeout configuration
    timeout_seconds = models.IntegerField(
        default=300,
        help_text="Timeout for image generation in seconds"
    )
    
    # Polling configuration
    polling_interval_seconds = models.IntegerField(
        default=2,
        help_text="Interval between status checks in seconds"
    )
    
    class Meta:
        verbose_name = "Replicate Configuration"
        verbose_name_plural = "Replicate Configuration"
    
    def __str__(self):
        return "Replicate Configuration"
    
    def save(self, *args, **kwargs):
        """
        Override save method to ensure only one instance exists
        and to clear cache when configuration is updated.
        """
        # Ensure there's only one instance
        if not self.pk and ReplicateConfiguration.objects.exists():
            existing = ReplicateConfiguration.objects.first()
            self.pk = existing.pk
        
        # Clear cache when configuration is updated
        self.clear_cache()
        
        super().save(*args, **kwargs)
    
    def delete(self, *args, **kwargs):
        self.clear_cache()
        return super().delete(*args, **kwargs)
    
    @classmethod
    def clear_cache(cls):
        """Clear the Replicate configuration cache."""
        cache.delete('replicate_config')
    
    @classmethod
    def get_config(cls):
        """
        Get the Replicate configuration, using cache to improve performance.
        
        Returns:
            ReplicateConfiguration: The Replicate configuration object
        """
        config = cache.get('replicate_config')
        if not config:
            config, created = cls.objects.get_or_create(pk=1)
            cache.set('replicate_config', config, None)
        return config
    
    @classmethod
    def get_replicate_config(cls):
        """
        Get the Replicate configuration settings.
        
        Returns:
            dict: Replicate configuration settings
        """
        config = cls.get_config()
        return {
            'image_replicate_model': config.image_replicate_model,
            'image_replicate_model_version': config.image_replicate_model_version,
            'image_generation_price': config.image_generation_price,
            'timeout_seconds': config.timeout_seconds,
            'polling_interval_seconds': config.polling_interval_seconds,
        }


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
    
    # Web parsing configuration
    web_parsing_model = models.CharField(
        max_length=50,
        default="gpt-4o-mini",
        help_text="OpenAI model to use for website content analysis"
    )
    
    web_parsing_input_price = models.DecimalField(
        max_digits=6,
        decimal_places=2,
        default=0.15,
        help_text="Price per 1M input tokens for web parsing (in USD)"
    )
    
    web_parsing_output_price = models.DecimalField(
        max_digits=6,
        decimal_places=2,
        default=0.60,
        help_text="Price per 1M output tokens for web parsing (in USD)"
    )
    
    web_parsing_prompt = models.TextField(
        default="Extract brand information from the website content focusing on the company's main products/services, target market, and brand personality. Be thorough but only extract information that is clearly visible on the website.",
        help_text="Custom instructions for website analysis. This will be combined with the website content and fixed response format instructions."
    )
    
    # Ad Copy Text Generation Configuration
    openai_text_copy_model = models.CharField(
        max_length=50,
        default="gpt-4o",
        help_text="OpenAI model to use for ad copy text generation"
    )
    
    copy_text_input_price = models.DecimalField(
        max_digits=6,
        decimal_places=2,
        default=2.50,
        help_text="Price per 1M input tokens for ad copy generation (in USD)"
    )
    
    copy_text_output_price = models.DecimalField(
        max_digits=6,
        decimal_places=2,
        default=10.00,
        help_text="Price per 1M output tokens for ad copy generation (in USD)"
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
        self.clear_cache()
        
        super().save(*args, **kwargs)
    
    def delete(self, *args, **kwargs):
        # Clear cache when deleting
        self.clear_cache()
        return super().delete(*args, **kwargs)
    
    @classmethod
    def clear_cache(cls):
        """Clear the OpenAI configuration cache."""
        cache.delete('openai_config')
    
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
            # Save in cache indefinitely (will be cleared on model changes)
            cache.set('openai_config', config, None)
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
    
    @classmethod
    def get_webparsing_config(cls):
        """
        Get the web parsing configuration settings.
        
        Returns:
            dict: Web parsing configuration settings
        """
        config = cls.get_config()
        return {
            'web_parsing_model': config.web_parsing_model,
            'web_parsing_input_price': config.web_parsing_input_price,
            'web_parsing_output_price': config.web_parsing_output_price,
            'web_parsing_prompt': config.web_parsing_prompt,
        }
    
    @classmethod
    def get_copy_text_config(cls):
        """
        Get the ad copy text generation configuration settings.
        
        Returns:
            dict: Ad copy text generation configuration settings
        """
        config = cls.get_config()
        return {
            'openai_text_copy_model': config.openai_text_copy_model,
            'copy_text_input_price': config.copy_text_input_price,
            'copy_text_output_price': config.copy_text_output_price,
        }
