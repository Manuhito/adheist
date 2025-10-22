from django.db import models
from django.db.models import Q
from django.urls import reverse
from django.conf import settings
from django.core.serializers.json import DjangoJSONEncoder
import json

from apps.utils.models import BaseModel
from django.core.cache import cache
from django.contrib.postgres.fields import ArrayField
from django.db.models import JSONField


class IndustryList(BaseModel):
    name = models.CharField(max_length=100)

    def __str__(self):
        return self.name

    def get_absolute_url(self):
        return reverse("ads:industrylist_detail", kwargs={"pk": self.pk})


class TagList(BaseModel):
    name = models.CharField(max_length=100)

    def __str__(self):
        return self.name

    def get_absolute_url(self):
        return reverse("ads:taglist_detail", kwargs={"pk": self.pk})


class AdLibrary(BaseModel):
    STATUS_ACTIVE = 'ACTIVE'
    STATUS_INACTIVE = 'INACTIVE'
    META_STATUS_CHOICES = [
        (STATUS_ACTIVE, 'Active'),
        (STATUS_INACTIVE, 'Inactive'),
    ]
    
    facebook_page = models.ForeignKey('apify.FacebookPage', on_delete=models.CASCADE, related_name="adlibraries")
    tags = models.ManyToManyField(TagList, related_name="adlibraries", blank=True)
    ad_creative_link_titles = models.TextField(blank=True, help_text="Ad creative link titles from Meta API")
    ad_image = models.ImageField(upload_to="adlibrary/", null=True, blank=True)
    is_fav = models.BooleanField(default=False)
    is_active = models.BooleanField(default=True, help_text="Indica si el anuncio está activo o ha sido desactivado")
    language = ArrayField(
        models.CharField(max_length=2),
        blank=True,
        null=True,
        help_text="Lista de códigos de países ISO que indican el idioma del anuncio"
    )
    media_type = models.CharField(max_length=50, blank=True, help_text="Tipo de medio del anuncio (ej: imagen, video, carrusel)")
    publisher_platform = ArrayField(
        models.CharField(max_length=50),
        blank=True,
        null=True,
        help_text="Lista de plataformas donde se publicó el anuncio"
    )
    meta_ad_id = models.CharField(max_length=20, null=True, blank=True, help_text="Identificador único del anuncio en Meta")
    ad_creation_time = models.DateField(null=True, blank=True, help_text="Fecha de creación del anuncio en formato YYYY-MM-DD")
    ad_delivery_start_time = models.DateField(null=True, blank=True, help_text="Fecha de inicio de entrega del anuncio en formato YYYY-MM-DD")
    ad_delivery_stop_time = models.DateField(null=True, blank=True, help_text="Fecha de finalización de entrega del anuncio en formato YYYY-MM-DD")
    meta_status = models.CharField(
        max_length=10,
        choices=META_STATUS_CHOICES,
        default=STATUS_ACTIVE,
        help_text="Status of the ad in Meta's system"
    )
    # New fields based on Meta API data
    ad_creative_bodies = models.TextField(null=True, blank=True, help_text="Ad creative body texts")
    ad_creative_link_captions = models.TextField(null=True, blank=True, help_text="Ad creative link captions")
    ad_creative_link_descriptions = models.TextField(null=True, blank=True, help_text="Ad creative link descriptions")
    age_country_gender_reach_breakdown = JSONField(
        blank=True,
        null=True,
        help_text="Breakdown of reach by age, country, and gender"
    )
    beneficiary_payers = JSONField(
        blank=True,
        null=True,
        help_text="Information about who paid for and benefited from the ad"
    )
    br_total_reach = models.TextField(
        blank=True,
        null=True,
        help_text="Total reach in Brazil"
    )
    bylines = models.TextField(
        blank=True,
        null=True,
        help_text="Bylines for the ad"
    )
    currency = models.CharField(
        max_length=3,
        blank=True,
        null=True,
        help_text="Currency used for ad spend"
    )
    delivery_by_region = JSONField(
        blank=True,
        null=True,
        help_text="Breakdown of ad delivery by geographic region"
    )
    demographic_distribution = JSONField(
        blank=True,
        null=True,
        help_text="Distribution of demographics for the ad audience"
    )
    estimated_audience_size = JSONField(
        blank=True,
        null=True,
        help_text="Estimated size of the audience"
    )
    eu_total_reach = models.IntegerField(
        null=True,
        blank=True,
        help_text="Total reach in European Union"
    )
    impressions = JSONField(
        blank=True,
        null=True,
        help_text="Information about ad impressions"
    )
    spend = JSONField(
        blank=True,
        null=True,
        help_text="Information about ad spend"
    )
    target_ages = ArrayField(
        models.CharField(max_length=10),
        blank=True,
        null=True,
        help_text="Age ranges targeted by the ad"
    )
    target_gender = models.CharField(
        max_length=10,
        blank=True,
        null=True,
        help_text="Gender targeted by the ad"
    )
    target_locations = JSONField(
        blank=True,
        null=True,
        help_text="Locations targeted by the ad"
    )

    def __str__(self):
        return f"Ad Library for {self.facebook_page}"

    def get_absolute_url(self):
        return reverse("ads:adlibrary_detail", kwargs={"pk": self.pk})


class AppConfiguration(BaseModel):
    """
    Model to store application-wide configuration settings.
    Only one instance of this model should exist in the database.
    """
    # Default credits (for users without subscription)
    default_general_credits = models.PositiveIntegerField(
        default=5,
        help_text="Default general credits for users without subscription"
    )
    default_version_credits = models.PositiveIntegerField(
        default=0,
        help_text="Default version credits for users without subscription"
    )
    
    # Starter plan credits
    starter_general_credits = models.PositiveIntegerField(
        default=20,
        help_text="General credits for users with Starter subscription"
    )
    starter_version_credits = models.PositiveIntegerField(
        default=0,
        help_text="Version credits for users with Starter subscription"
    )
    
    # Pro plan credits
    pro_general_credits = models.PositiveIntegerField(
        default=50,
        help_text="General credits for users with Pro subscription"
    )
    pro_version_credits = models.PositiveIntegerField(
        default=0,
        help_text="Version credits for users with Pro subscription"
    )
    
    # Package 1 credits
    package1_general_credits = models.PositiveIntegerField(
        default=15,
        help_text="General credits for Package 1"
    )
    package1_version_credits = models.PositiveIntegerField(
        default=0,
        help_text="Version credits for Package 1"
    )
    
    # Package 2 credits
    package2_general_credits = models.PositiveIntegerField(
        default=30,
        help_text="General credits for Package 2"
    )
    package2_version_credits = models.PositiveIntegerField(
        default=0,
        help_text="Version credits for Package 2"
    )
    
    # Credit costs for operations
    ad_generation_credit_cost = models.PositiveIntegerField(
        default=1,
        help_text="Number of credits required to generate a new ad"
    )
    version_creation_credit_cost = models.PositiveIntegerField(
        default=0,
        help_text="Number of credits required to create a new version/revision"
    )
    brand_assets_generation_cost = models.PositiveIntegerField(
        default=4,
        help_text="Number of credits required to generate brand assets from website analysis"
    )
    
    class Meta:
        verbose_name = "Application Configuration"
        verbose_name_plural = "Application Configuration"
    
    def __str__(self):
        return f"Application Configuration (General Credits: {self.default_general_credits}, Version Credits: {self.default_version_credits})"
    
    def save(self, *args, **kwargs):
        # Ensure only one instance exists
        if not self.pk and AppConfiguration.objects.exists():
            # If an instance already exists and we're creating a new one, update the existing one
            return AppConfiguration.objects.first()
        
        # Clear cache when saving
        self.clear_cache()
        
        return super().save(*args, **kwargs)
    
    def delete(self, *args, **kwargs):
        # Clear cache when deleting
        self.clear_cache()
        return super().delete(*args, **kwargs)
    
    @classmethod
    def clear_cache(cls):
        """Clear the configuration cache."""
        cache.delete('app_configuration')
    
    @classmethod
    def get_limits(cls):
        """
        Get the configured limits, using cache to improve performance.
        
        Returns:
            dict: Dictionary with all credit configurations
        """
        # Try to get from cache first
        config = cls.get_config()
        return {
            'default': {
                'general_credits': config.default_general_credits,
                'version_credits': config.default_version_credits
            },
            'starter': {
                'general_credits': config.starter_general_credits,
                'version_credits': config.starter_version_credits
            },
            'pro': {
                'general_credits': config.pro_general_credits,
                'version_credits': config.pro_version_credits
            },
            'package1': {
                'general_credits': config.package1_general_credits,
                'version_credits': config.package1_version_credits
            },
            'package2': {
                'general_credits': config.package2_general_credits,
                'version_credits': config.package2_version_credits
            }
        }
    
    @classmethod
    def get_config(cls):
        """
        Get the application configuration, using cache to improve performance.
        
        Returns:
            AppConfiguration: The application configuration object
        """
        # Try to get from cache first
        config = cache.get('app_configuration')
        if config is None:
            # If not in cache, get from database
            config = cls.objects.first()
            if not config:
                # If no configuration exists, create one with default values
                config = cls.objects.create()
            
            # Save in cache indefinitely (will be cleared on model changes)
            cache.set('app_configuration', config, None)
        
        return config
    
    @classmethod
    def get_cost(cls):
        """
        Get the credit costs for operations, using cache to improve performance.
        
        Returns:
            dict: Dictionary with credit costs for different operations
        """
        config = cls.get_config()
        return {
            'ad_generation': config.ad_generation_credit_cost,
            'version_creation': config.version_creation_credit_cost
        }

class AdRequestAssets(BaseModel):
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="asset_collections", null=True, blank=True)
    brand = models.ForeignKey('UserBrand', on_delete=models.CASCADE, related_name="assets", null=True, blank=True, help_text="Brand associated with these assets")
    company_website = models.URLField(null=True, blank=True)
    logo = models.ImageField(upload_to="adrequest_assets/", null=True, blank=True)
    main_hex_color = models.TextField(null=True, blank=True, help_text="Brand colors in hex format (JSON string or single color)")
    key_benefits = models.TextField(null=True, blank=True)
    # Brand information fields
    industry = models.CharField(max_length=255, null=True, blank=True, help_text="Industry/Vertical")
    product_description = models.TextField(null=True, blank=True, help_text="Product/Service description")
    target_audience = models.TextField(null=True, blank=True)
    functional_benefits = models.TextField(null=True, blank=True, help_text="Functional benefits")
    tone_of_voice = models.TextField(null=True, blank=True)
    font_direction = models.TextField(null=True, blank=True)
    core_features = models.TextField(null=True, blank=True)
    emotional_lifestyle_benefits = models.TextField(null=True, blank=True)
    proof_points = models.TextField(null=True, blank=True)
    value_propositions = models.TextField(null=True, blank=True)
    # Image fields
    product_image_1 = models.ImageField(upload_to="adrequest_assets/", null=True, blank=True)
    product_image_2 = models.ImageField(upload_to="adrequest_assets/", null=True, blank=True)
    app_image_1 = models.ImageField(upload_to="adrequest_assets/", null=True, blank=True)
    app_image_2 = models.ImageField(upload_to="adrequest_assets/", null=True, blank=True)
    marketing_image_1 = models.ImageField(upload_to="adrequest_assets/", null=True, blank=True)
    marketing_image_2 = models.ImageField(upload_to="adrequest_assets/", null=True, blank=True)
    marketing_image_3 = models.ImageField(upload_to="adrequest_assets/", null=True, blank=True)

    def __str__(self):
        return f"Asset Collection {self.user}"
    
    def to_dict(self):
        """Convert asset fields to dictionary for easier override handling"""
        return {
            # Removed 'brand' field to prevent assignment issues
            'company_website': self.company_website,
            'main_hex_color': self.main_hex_color,
            # Brand information fields
            'industry': self.industry,
            'product_description': self.product_description,
            'target_audience': self.target_audience,
            'functional_benefits': self.functional_benefits,
            'tone_of_voice': self.tone_of_voice,
            'font_direction': self.font_direction,
            'core_features': self.core_features,
            'emotional_lifestyle_benefits': self.emotional_lifestyle_benefits,
            'proof_points': self.proof_points,
            'value_propositions': self.value_propositions,
            # We don't include images in the dict as they need special handling
        }


class AdRequest(BaseModel):
    STATUS_NEW = 'NEW'
    STATUS_DRAFT = 'DRAFT'
    STATUS_FILLED = 'FILLED'
    STATUS_SUBMITTED = 'SUBMITTED'
    STATUS_APPROVED = 'COMPLETED'
    STATUS_REOPENED = 'REOPENED'
    STATUS_CHOICES = [
        (STATUS_NEW, 'New'),
        (STATUS_DRAFT, 'Draft'),
        (STATUS_FILLED, 'Filled'),
        (STATUS_SUBMITTED, 'Submitted'),
        (STATUS_APPROVED, 'Completed'),
        (STATUS_REOPENED, 'Reopened'),
    ]
    
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    ad_library = models.ForeignKey(AdLibrary, on_delete=models.CASCADE, null=True, blank=True)
    user_uploaded_image = models.ImageField(upload_to="user_uploads/", null=True, blank=True, 
                                          help_text="User uploaded image as an alternative to selecting from AdLibrary")
    base_assets = models.ForeignKey(AdRequestAssets, on_delete=models.PROTECT, related_name="ad_requests", null=True, blank=True)
    asset_overrides = models.JSONField(default=dict, blank=True, encoder=DjangoJSONEncoder,
                                      help_text="Stores overrides for specific asset fields")
    # Image overrides need separate fields since they can't be stored in JSON
    logo_override = models.ImageField(upload_to="adrequest_assets/", null=True, blank=True)
    product_image_1_override = models.ImageField(upload_to="adrequest_assets/", null=True, blank=True)
    product_image_2_override = models.ImageField(upload_to="adrequest_assets/", null=True, blank=True)
    app_image_1_override = models.ImageField(upload_to="adrequest_assets/", null=True, blank=True)
    app_image_2_override = models.ImageField(upload_to="adrequest_assets/", null=True, blank=True)
    marketing_image_1_override = models.ImageField(upload_to="adrequest_assets/", null=True, blank=True)
    marketing_image_2_override = models.ImageField(upload_to="adrequest_assets/", null=True, blank=True)
    marketing_image_3_override = models.ImageField(upload_to="adrequest_assets/", null=True, blank=True)
    
    canvas_size = models.CharField(max_length=20, default="1024x1024")
    status = models.CharField(max_length=10, choices=STATUS_CHOICES, default=STATUS_NEW)
    
    def save(self, *args, **kwargs):
        """Override save method to update base_assets with overrides and validate status transitions"""
        # Check if this is an existing instance
        if self.pk:
            # Get the current status from the database
            try:
                current_instance = AdRequest.objects.get(pk=self.pk)
                current_status = current_instance.status
                
                # Validate status transitions
                if current_status == self.STATUS_NEW and self.status != self.STATUS_DRAFT and self.status != self.STATUS_NEW:
                    from django.core.exceptions import ValidationError
                    raise ValidationError(f"Cannot transition from {current_status} to {self.status}. Only transition to DRAFT is allowed.")
                
                elif current_status == self.STATUS_DRAFT and self.status not in [self.STATUS_NEW, self.STATUS_FILLED, self.STATUS_SUBMITTED, self.STATUS_DRAFT]:
                    from django.core.exceptions import ValidationError
                    raise ValidationError(f"Cannot transition from {current_status} to {self.status}. Only transitions to NEW, FILLED, or SUBMITTED are allowed.")
                
                elif current_status == self.STATUS_FILLED and self.status not in [self.STATUS_DRAFT, self.STATUS_SUBMITTED, self.STATUS_FILLED]:
                    from django.core.exceptions import ValidationError
                    raise ValidationError(f"Cannot transition from {current_status} to {self.status}. Only transitions to DRAFT or SUBMITTED are allowed.")
                
                elif current_status == self.STATUS_SUBMITTED and self.status != self.STATUS_APPROVED and self.status != self.STATUS_SUBMITTED:
                    from django.core.exceptions import ValidationError
                    raise ValidationError(f"Cannot transition from {current_status} to {self.status}. Only transition to COMPLETED is allowed.")
                
                elif current_status == self.STATUS_APPROVED and self.status != self.STATUS_REOPENED and self.status != self.STATUS_APPROVED:
                    from django.core.exceptions import ValidationError
                    raise ValidationError(f"Cannot transition from {current_status} to {self.status}. Only transition to REOPENED is allowed.")
                
                elif current_status == self.STATUS_REOPENED and self.status != self.STATUS_APPROVED and self.status != self.STATUS_REOPENED:
                    from django.core.exceptions import ValidationError
                    raise ValidationError(f"Cannot transition from {current_status} to {self.status}. Only transition to COMPLETED is allowed.")
                    
            except AdRequest.DoesNotExist:
                # This should not happen, but just in case
                pass
        
        # First save the model to ensure it has an ID
        super().save(*args, **kwargs)
        
        # Update base_assets with any overrides if base_assets exists
        if self.base_assets:
            # Update JSON fields from asset_overrides
            for field_name, value in self.asset_overrides.items():
                # Skip the 'brand' field as it requires special handling
                if field_name == 'brand':
                    continue
                    
                if hasattr(self.base_assets, field_name):
                    setattr(self.base_assets, field_name, value)
            
            # Update image fields from their respective override fields
            image_fields = [
                'logo', 'product_image_1', 'product_image_2', 
                'app_image_1', 'app_image_2',
                'marketing_image_1', 'marketing_image_2', 'marketing_image_3'
            ]
            
            for field_name in image_fields:
                override_field = f"{field_name}_override"
                if hasattr(self, override_field):
                    # Check if the field is explicitly set (even if empty)
                    if field_name + '_override' in self.__dict__:
                        # If override is empty/None, set base_assets field to None (remove image)
                        # Otherwise, update with the override value
                        override_value = getattr(self, override_field)
                        setattr(self.base_assets, field_name, override_value)
            
            # Save the updated base_assets
            self.base_assets.save()
    
    def __str__(self):
        return f"Request #{self.id} - {self.user}"
    
    def get_asset_value(self, field_name):
        """Get asset value with override if it exists"""
        # For text-based fields stored in JSON
        if field_name in self.asset_overrides:
            return self.asset_overrides[field_name]
        
        # For image fields that have separate override fields
        override_field = f"{field_name}_override"
        if hasattr(self, override_field) and getattr(self, override_field):
            return getattr(self, override_field)
        
        # No fallback to base_assets, return None
        return None
    
    def get_company_website(self):
        return self.get_asset_value('company_website')
    
    def get_main_hex_color(self):
        """Get main_hex_color and parse as JSON if needed"""
        import json
        value = self.get_asset_value('main_hex_color')
        if not value:
            return value
        
        # If it's already a list/dict, return as is
        if isinstance(value, (list, dict)):
            return value
            
        # If it's a string, try to parse as JSON
        if isinstance(value, str):
            # If it looks like a hex color (#xxxxxx), return as is for backward compatibility
            if value.startswith('#') and len(value) in [4, 7]:
                return value
            
            # Try to parse as JSON
            try:
                return json.loads(value)
            except (json.JSONDecodeError, TypeError):
                # If parsing fails, return the original string
                return value
        
        return value
    
    def get_user_prompt(self):
        return self.get_asset_value('user_prompt')
    
    def get_logo(self):
        return self.logo_override if self.logo_override else None
    
    def get_product_image_1(self):
        return self.product_image_1_override if self.product_image_1_override else None
    
    def get_product_image_2(self):
        return self.product_image_2_override if self.product_image_2_override else None
    
    def get_app_image_1(self):
        return self.app_image_1_override if self.app_image_1_override else None
    
    def get_app_image_2(self):
        return self.app_image_2_override if self.app_image_2_override else None
    
    def get_marketing_image_1(self):
        return self.marketing_image_1_override if self.marketing_image_1_override else None
    
    def get_marketing_image_2(self):
        return self.marketing_image_2_override if self.marketing_image_2_override else None
    
    def get_marketing_image_3(self):
        return self.marketing_image_3_override if self.marketing_image_3_override else None
    
    # New getter methods for brand information fields
    def get_industry(self):
        return self.get_asset_value('industry')
    
    def get_product_description(self):
        return self.get_asset_value('product_description')
    
    def get_target_audience(self):
        return self.get_asset_value('target_audience')
    
    def get_functional_benefits(self):
        return self.get_asset_value('functional_benefits')
    
    def get_tone_of_voice(self):
        return self.get_asset_value('tone_of_voice')
    
    def get_font_direction(self):
        return self.get_asset_value('font_direction')
    
    def get_core_features(self):
        return self.get_asset_value('core_features')
    
    def get_emotional_lifestyle_benefits(self):
        return self.get_asset_value('emotional_lifestyle_benefits')
    
    def get_proof_points(self):
        return self.get_asset_value('proof_points')
    
    def get_value_propositions(self):
        return self.get_asset_value('value_propositions')


class AdRequestVersion(BaseModel):
    STATUS_UNASSIGNED = 'UNASSIGNED'
    STATUS_ASSIGNED = 'ASSIGNED'
    STATUS_COMPLETED = 'COMPLETED'
    STATUS_FAILED = 'failed'
    STATUS_CHOICES = [
        (STATUS_UNASSIGNED, 'Unassigned'),
        (STATUS_ASSIGNED, 'Assigned'),
        (STATUS_COMPLETED, 'Completed'),
        (STATUS_FAILED, 'Failed'),
    ]
    
    ad_request = models.ForeignKey(AdRequest, on_delete=models.CASCADE, related_name="versions")
    # Original fields (keeping for backward compatibility)
    generated_prompt = models.TextField(null=True, blank=True)
    user_prompt = models.TextField(null=True, blank=True)
    generated_image = models.ImageField(upload_to="revisions/", null=True, blank=True)
    user_admin_assigned = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, null=True, blank=True, related_name="assigned_requests")
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default=STATUS_UNASSIGNED)
    
    # New fields for storing specific OpenAI responses
    openai_response_metadata = models.JSONField(null=True, blank=True, help_text="Metadata from OpenAI API responses")
    openai_prompt_response_metadata = models.JSONField(null=True, blank=True, help_text="Metadata from OpenAI API responses for prompt generation")
    error_logs = models.TextField(null=True, blank=True, help_text="Error logs when image generation fails")
    
    # Rating fields
    rating = models.PositiveSmallIntegerField(null=True, blank=True, help_text="User rating from 1 to 5 stars")
    review = models.TextField(null=True, blank=True, help_text="User review text for the generated image")
    
    def save(self, *args, **kwargs):
        """Override save method to handle status updates and send email notifications"""
        # Check if this is a new instance
        is_new = self.pk is None
        
        # Remove regenerate_prompt if present (for backward compatibility)
        if 'regenerate_prompt' in kwargs:
            kwargs.pop('regenerate_prompt')
        
        # Check if generated_image was just filled (for email notification)
        if not is_new and self.pk:
            # Get the current state from the database
            try:
                old_instance = AdRequestVersion.objects.get(pk=self.pk)
                had_image = bool(old_instance.generated_image)
            except AdRequestVersion.DoesNotExist:
                had_image = False
        else:
            had_image = False
        
        # Save the model
        super().save(*args, **kwargs)
        
        # Send email notification if generated_image is filled and wasn't before
        has_image_now = bool(self.generated_image)
        if has_image_now and not had_image:
            # Update status to COMPLETED
            self.status = self.STATUS_COMPLETED
            super().save(update_fields=['status'])
            
            # Update the associated AdRequest status to COMPLETED (STATUS_APPROVED)
            if self.ad_request and self.ad_request.status != AdRequest.STATUS_APPROVED:
                self.ad_request.status = AdRequest.STATUS_APPROVED
                self.ad_request.save(update_fields=['status'])
            
            # Send email notification
            self.send_completion_email()
    
    @property
    def version_index(self):
        """Calculate the version index based on creation order"""
        if not self.ad_request:
            return 1
        
        # Get all versions for this ad_request ordered by creation date
        versions = self.ad_request.versions.order_by('created_at')
        
        # Find the index of this version (1-based)
        for index, version in enumerate(versions, 1):
            if version.id == self.id:
                return index
        
        return 1  # Fallback
    
    def regenerate_prompt(self):
        """Regenerate the prompt for this version"""
        self.save(regenerate_prompt=True)
        
    def send_completion_email(self):
        """Send email notification when ad is completed"""
        from django.core.mail import send_mail
        from django.conf import settings
        
        # Get the user email
        user = self.ad_request.user
        if not user.email:
            return
        
        # Create simple email message
        subject = "[AdHeist] - Your Ad is Ready!"
        message = "Congrats! Your new Ad has been created"
        from_email = settings.DEFAULT_FROM_EMAIL
        to_email = user.email
        
        # Send email
        send_mail(subject, message, from_email, [to_email], fail_silently=False)


class AdCopyVersion(BaseModel):
    """Model to store generated ad copy text for each AdRequestVersion"""
    ad_request_version = models.ForeignKey(
        AdRequestVersion, 
        on_delete=models.CASCADE, 
        related_name="ad_copies",
        help_text="The AdRequestVersion this copy belongs to"
    )
    ad_copy_text = models.TextField(
        null=True, 
        blank=True,
        help_text="The generated ad copy text"
    )
    response_metadata = models.JSONField(
        null=True, 
        blank=True, 
        help_text="Metadata from OpenAI API responses including costs and tokens"
    )
    error_logs = models.TextField(
        null=True, 
        blank=True, 
        help_text="Error logs when ad copy generation fails"
    )
    prompt_sent = models.TextField(
        null=True, 
        blank=True,
        help_text="The prompt that was sent to OpenAI for generating this copy"
    )
    
    class Meta:
        ordering = ['-created_at']
        verbose_name = "Ad Copy Version"
        verbose_name_plural = "Ad Copy Versions"
        indexes = [
            models.Index(fields=['ad_request_version', '-created_at'], name='adcopy_version_created_idx'),
        ]
    
    def __str__(self):
        return f"Ad Copy for Version #{self.ad_request_version.id} - {self.created_at.strftime('%Y-%m-%d %H:%M')}"


# apps/ads/models.py
class AdRequestUsage(BaseModel):
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    # For paid users: tracks usage within a billing period
    billing_period_start = models.DateTimeField(null=True, blank=True)
    billing_period_end = models.DateTimeField(null=True, blank=True)
    # Credits for creating new ad requests (used in StepThreeComponent.jsx)
    general_credits = models.PositiveIntegerField(default=0)
    # Credits for creating new versions of existing ad requests (used in revision-adrequest.jsx)
    version_credits = models.PositiveIntegerField(default=0)
    # For free users: tracks lifetime usage
    is_free_tier = models.BooleanField(default=False)
    # Plan type for paid users (e.g., 'starter', 'pro')
    plan_type = models.CharField(max_length=50, null=True, blank=True)
    
    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=['user', 'billing_period_start'],
                condition=models.Q(is_free_tier=False),
                name='unique_paid_user_period'
            ),
            models.UniqueConstraint(
                fields=['user'],
                condition=models.Q(is_free_tier=True),
                name='unique_free_user'
            )
        ]
        
    @classmethod
    def get_current_usage(cls, user):
        """Get or create usage record based on subscription status"""
        from django.utils import timezone
        from datetime import datetime
        from apps.ads.models import AppConfiguration
        
        # Get all limits from configuration
        limits = AppConfiguration.get_limits()
        
        # Default credits for users without subscription
        general_credits_default = limits.get('default', {}).get('general_credits', 5)  # 5 is fallback if all else fails
        version_credits_default = limits.get('default', {}).get('version_credits', 2)  # 2 is fallback if all else fails
        
        # For users with active subscriptions, get plan-specific limit
        if user.has_active_subscription():
            sub = user.active_stripe_subscription
            
            # Get product metadata to determine plan type
            from apps.subscriptions.metadata import ACTIVE_PRODUCTS_BY_ID
            
            # Get product ID - handle both string and object cases
            if hasattr(sub.plan.product, 'id'):
                # It's an object, get the ID
                product_id = sub.plan.product.id
            else:
                # It's already an ID string
                product_id = sub.plan.product
                
            product_meta = ACTIVE_PRODUCTS_BY_ID.get(product_id)
            
            if product_meta:
                plan_type = product_meta.slug
                if plan_type in limits:
                    general_credits_default = limits[plan_type]['general_credits']
                    version_credits_default = limits[plan_type]['version_credits']
                    print(f"Setting credits to general={general_credits_default}, version={version_credits_default} for plan {plan_type}")
                else:
                    print(f"Plan type {plan_type} not found in limits: {limits.keys()}")
            else:
                print(f"Product ID {product_id} not found in ACTIVE_PRODUCTS_BY_ID")
            
            # Get current period from subscription
            # Handle both timestamp integers and datetime objects
            if isinstance(sub.current_period_start, int):
                period_start = timezone.make_aware(
                    datetime.fromtimestamp(sub.current_period_start)
                )   
            else:
                # Already a datetime object
                period_start = sub.current_period_start
                if timezone.is_naive(period_start):
                    period_start = timezone.make_aware(period_start)
            
            if isinstance(sub.current_period_end, int):
                period_end = timezone.make_aware(
                    datetime.fromtimestamp(sub.current_period_end)
                )
            else:
                # Already a datetime object
                period_end = sub.current_period_end
                if timezone.is_naive(period_end):
                    period_end = timezone.make_aware(period_end)
            
            # Try to find an existing record for this user
            try:
                # Get the first record for this user (paid tier)
                usage = cls.objects.get(user=user, is_free_tier=False)
                
                # Check if the billing period has changed OR if the plan has changed
                # ONLY reset credits if period changed or plan changed
                if usage.billing_period_start != period_start or usage.plan_type != plan_type:
                    # Save remaining credits before resetting
                    remaining_general_credits = usage.general_credits
                    remaining_version_credits = usage.version_credits
                    
                    # Transfer remaining credits to ExtraCredit
                    if remaining_general_credits > 0 or remaining_version_credits > 0:
                        print(f"Transferring remaining credits to ExtraCredit: general={remaining_general_credits}, version={remaining_version_credits}")
                        if remaining_general_credits > 0:
                            ExtraCredit.add_general_credits(user, remaining_general_credits)
                        if remaining_version_credits > 0:
                            ExtraCredit.add_version_credits(user, remaining_version_credits)
                    
                    # Update the billing period and reset credits
                    usage.billing_period_start = period_start
                    usage.billing_period_end = period_end
                    usage.general_credits = general_credits_default
                    usage.version_credits = version_credits_default
                    usage.plan_type = plan_type
                    usage.save()
                    print(f"Updated user credits: general={general_credits_default}, version={version_credits_default} (plan changed from {usage.plan_type} to {plan_type} or period changed)")
                    print(f"Transferred {remaining_general_credits} general credits and {remaining_version_credits} version credits to ExtraCredit")
            except cls.DoesNotExist:
                # Create a new record if none exists - initialize with full credits
                usage = cls.objects.create(
                    user=user,
                    billing_period_start=period_start,
                    billing_period_end=period_end,
                    is_free_tier=False,
                    general_credits=general_credits_default,
                    version_credits=version_credits_default,
                    plan_type=plan_type
                )
            
            return usage
        else:
            # For free users, use a lifetime record (no billing period)
            try:
                # Get the existing record for this free tier user
                # IMPORTANT: Do NOT reset credits if they're at 0 - removed that logic
                usage = cls.objects.get(user=user, is_free_tier=True)
            except cls.DoesNotExist:
                # Create a new record if none exists - initialize with full credits
                usage = cls.objects.create(
                    user=user,
                    billing_period_start=None,
                    billing_period_end=None,
                    is_free_tier=True,
                    general_credits=general_credits_default,
                    version_credits=version_credits_default
                )
            
            return usage

class ExtraCredit(BaseModel):
    """
    Model to store extra credits that don't expire with billing periods.
    These credits are used when a user has no remaining regular credits.
    """
    user = models.OneToOneField(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="extra_credits")
    general_credits = models.PositiveIntegerField(default=0)
    version_credits = models.PositiveIntegerField(default=0)
    
    def __str__(self):
        return f"{self.user.email} - {self.general_credits} general, {self.version_credits} version extra credits"
    
    @classmethod
    def get_or_create(cls, user):
        """Get or create extra credits record for a user"""
        extra_credits, created = cls.objects.get_or_create(user=user)
        return extra_credits
    
    @classmethod
    def add_general_credits(cls, user, amount):
        """Add extra general credits to a user"""
        if amount <= 0:
            return
            
        extra_credits = cls.get_or_create(user)
        extra_credits.general_credits += amount
        extra_credits.save()
        return extra_credits
        
    @classmethod
    def add_version_credits(cls, user, amount):
        """Add extra version credits to a user"""
        if amount <= 0:
            return
            
        extra_credits = cls.get_or_create(user)
        extra_credits.version_credits += amount
        extra_credits.save()
        return extra_credits
    
    @classmethod
    def use_general_credit(cls, user):
        """Use one extra general credit if available"""
        extra_credits = cls.get_or_create(user)
        
        if extra_credits.general_credits > 0:
            extra_credits.general_credits -= 1
            extra_credits.save()
            return True
        
        return False
        
    @classmethod
    def use_version_credit(cls, user):
        """Use one extra version credit if available"""
        extra_credits = cls.get_or_create(user)
        
        if extra_credits.version_credits > 0:
            extra_credits.version_credits -= 1
            extra_credits.save()
            return True
        
        return False
        
    @classmethod
    def use_credit(cls, user):
        """Use one extra credit if available (uses general_credits for backward compatibility)"""
        return cls.use_general_credit(user)


class UserBrand(BaseModel):
    """
    Model to store user brands information.
    """
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="brands")
    brand_name = models.CharField(max_length=255, help_text="Name of the brand", unique=True)
    
    class Meta:
        verbose_name = "User Brand"
        verbose_name_plural = "User Brands"
        ordering = ['created_at']
        constraints = [
            models.UniqueConstraint(
                fields=['user', 'brand_name'],
                name='unique_user_brand'
            )
        ]
    
    def __str__(self):
        return f"{self.user.email} - {self.brand_name}"


class UserFolder(BaseModel):
    """
    Model to store user custom folders for organizing assets.
    Supports hierarchical folder structure with parent-child relationships.
    Can be associated with a brand for brand-specific organization.
    """
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="folders")
    folder_name = models.CharField(max_length=255, help_text="Name of the folder")
    parent_folder = models.ForeignKey('self', on_delete=models.CASCADE, related_name="subfolders", blank=True, null=True, help_text="Parent folder for hierarchical organization")
    brand = models.ForeignKey('UserBrand', on_delete=models.CASCADE, related_name="folders", blank=True, null=True, help_text="Brand this folder belongs to (for brand-specific folders)")
    
    class Meta:
        verbose_name = "User Folder"
        verbose_name_plural = "User Folders"
        ordering = ['created_at']
        constraints = [
            models.UniqueConstraint(
                fields=['user', 'folder_name', 'parent_folder', 'brand'],
                name='unique_user_folder_in_context'
            ),
            # Ensure folder hierarchy logic: 
            # - Root folders: no parent, may have brand
            # - Subfolders: have parent, inherit brand context
            # - Brand folders: have brand, no parent (or parent with same brand)
            models.CheckConstraint(
                check=Q(parent_folder__isnull=True) | Q(brand__isnull=True),
                name='folder_hierarchy_constraint'
            )
        ]
    
    def clean(self):
        from django.core.exceptions import ValidationError
        
        # Prevent circular references
        if self.parent_folder:
            current = self.parent_folder
            visited = set()
            while current:
                if current.id == self.id:
                    raise ValidationError("Folder cannot be its own parent (circular reference).")
                if current.id in visited:
                    raise ValidationError("Circular reference detected in folder hierarchy.")
                visited.add(current.id)
                current = current.parent_folder
        
        # Validate brand-folder relationship
        if self.parent_folder and self.brand:
            # Subfolders inherit brand context from parent
            if self.parent_folder.brand and self.parent_folder.brand != self.brand:
                raise ValidationError("Subfolder must belong to the same brand as its parent folder.")
            # If parent has no brand, subfolder cannot have brand either
            if not self.parent_folder.brand:
                raise ValidationError("Subfolder cannot belong to a brand if parent folder is not brand-specific.")
    
    def save(self, *args, **kwargs):
        self.clean()
        super().save(*args, **kwargs)
    
    @property
    def full_path(self):
        """Returns the full path of the folder (e.g., 'Marketing/Campaigns/Q1')"""
        if self.parent_folder:
            return f"{self.parent_folder.full_path}/{self.folder_name}"
        return self.folder_name
    
    @property
    def depth(self):
        """Returns the depth level of the folder (0 for root folders)"""
        if self.parent_folder:
            return self.parent_folder.depth + 1
        return 0
    
    def get_all_children(self):
        """Returns all descendant folders (children, grandchildren, etc.)"""
        children = list(self.subfolders.all())
        for child in list(children):
            children.extend(child.get_all_children())
        return children
    
    def get_root_folder(self):
        """Returns the root folder of this folder's hierarchy"""
        if self.parent_folder:
            return self.parent_folder.get_root_folder()
        return self
    
    def is_ancestor_of(self, folder):
        """Check if this folder is an ancestor of the given folder"""
        current = folder.parent_folder
        while current:
            if current == self:
                return True
            current = current.parent_folder
        return False
    
    def __str__(self):
        return f"{self.user.email} - {self.full_path}"


class UserBrandAssets(BaseModel):
    """
    Model to centralize storage of user-uploaded images.
    Keeps track of all images uploaded by users for their ad requests.
    Assets can be organized by brand or by custom folder.
    """
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="brand_assets")
    brand = models.ForeignKey(UserBrand, on_delete=models.CASCADE, related_name="brand_assets", blank=True, null=True)
    folder = models.ForeignKey(UserFolder, on_delete=models.CASCADE, related_name="folder_assets", blank=True, null=True)
    image = models.ImageField(upload_to="brand_assets/", help_text="Image uploaded by the user")
    category = models.CharField(
        max_length=20, 
        choices=[
            ('logo', 'Logo'),
            ('product', 'Product'),
            ('app', 'App'),
            ('marketing', 'Marketing'),
            ('assets', 'Assets')
        ],
        help_text="Category of the uploaded image"
    )
    
    # New fields for file information
    original_filename = models.CharField(
        max_length=255, 
        blank=True, 
        null=True,
        help_text="Original filename with extension as uploaded by user"
    )
    canvas_width = models.PositiveIntegerField(
        blank=True, 
        null=True,
        help_text="Width of the image in pixels"
    )
    canvas_height = models.PositiveIntegerField(
        blank=True, 
        null=True,
        help_text="Height of the image in pixels"
    )
    file_size = models.PositiveIntegerField(
        blank=True, 
        null=True,
        help_text="File size in bytes"
    )
    
    class Meta:
        verbose_name = "User Brand Asset"
        verbose_name_plural = "User Brand Assets"
        ordering = ['-created_at']
        constraints = [
            models.CheckConstraint(
                check=models.Q(brand__isnull=False, folder__isnull=True) | models.Q(brand__isnull=True, folder__isnull=False),
                name='asset_must_have_brand_or_folder'
            )
        ]
    
    def clean(self):
        from django.core.exceptions import ValidationError
        
        # Ensure asset is assigned to either a brand or a folder, but not both
        if self.brand and self.folder:
            raise ValidationError("Asset cannot be assigned to both a brand and a folder.")
        
        if not self.brand and not self.folder:
            raise ValidationError("Asset must be assigned to either a brand or a folder.")
    
    def save(self, *args, **kwargs):
        self.clean()
        super().save(*args, **kwargs)
    
    def __str__(self):
        container = self.brand.brand_name if self.brand else self.folder.folder_name
        container_type = "brand" if self.brand else "folder"
        return f"{self.user.email} - {container} ({container_type}) - {self.category} asset"
    
    @property
    def container_name(self):
        """Returns the name of the container (brand or folder) this asset belongs to."""
        return self.brand.brand_name if self.brand else self.folder.folder_name
    
    @property
    def container_type(self):
        """Returns the type of container this asset belongs to ('brand' or 'folder')."""
        return 'brand' if self.brand else 'folder'


class FAQ(BaseModel):
    """
    Model to store Frequently Asked Questions and their answers for a FAQ page.
    """
    question = models.CharField(max_length=255, help_text="The question text")
    answer = models.TextField(help_text="The answer to the question")
    order = models.PositiveIntegerField(default=0, help_text="Order in which the question appears on the FAQ page")
    is_active = models.BooleanField(default=True, help_text="Whether this FAQ is currently displayed on the site")
    
    class Meta:
        verbose_name = "FAQ"
        verbose_name_plural = "FAQs"
        ordering = ['order', 'created_at']
    
    def __str__(self):
        return self.question


class BrandAssetExtraction(BaseModel):
    """
    Model to store brand asset extraction results from website analysis.
    """
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        help_text="User who requested the extraction"
    )
    brand = models.ForeignKey(
        'UserBrand',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        help_text="Brand created from this extraction (if any)"
    )
    website_url = models.URLField(
        help_text="The website URL that was analyzed"
    )
    
    # OpenAI API details
    model_used = models.CharField(
        max_length=50,
        help_text="The OpenAI model that was used for extraction"
    )
    raw_response = models.TextField(
        help_text="Raw response from OpenAI API"
    )
    
    # Extracted brand assets
    extracted_assets = JSONField(
        default=dict,
        help_text="JSON object containing the extracted brand assets"
    )
    
    # Cost tracking
    input_tokens = models.PositiveIntegerField(
        default=0,
        help_text="Number of input tokens used"
    )
    output_tokens = models.PositiveIntegerField(
        default=0,
        help_text="Number of output tokens generated"
    )
    input_cost_usd = models.DecimalField(
        max_digits=10,
        decimal_places=6,
        default=0.000000,
        help_text="Cost of input tokens in USD"
    )
    output_cost_usd = models.DecimalField(
        max_digits=10,
        decimal_places=6,
        default=0.000000,
        help_text="Cost of output tokens in USD"
    )
    total_cost_usd = models.DecimalField(
        max_digits=10,
        decimal_places=6,
        default=0.000000,
        help_text="Total cost in USD"
    )
    
    # Status and error handling
    STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('processing', 'Processing'),
        ('completed', 'Completed'),
        ('failed', 'Failed'),
    ]
    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default='pending',
        help_text="Status of the extraction process"
    )
    error_log = models.TextField(
        blank=True,
        null=True,
        help_text="Error messages if extraction failed"
    )
    
    class Meta:
        verbose_name = "Brand Asset Extraction"
        verbose_name_plural = "Brand Asset Extractions"
        ordering = ['-created_at']
    
    def __str__(self):
        return f"{self.user.email} - {self.website_url} ({self.status})"
    
    def save(self, *args, **kwargs):
        # Calculate total cost
        self.total_cost_usd = self.input_cost_usd + self.output_cost_usd
        super().save(*args, **kwargs)


# Models for dynamic marketing pages
from django.contrib.contenttypes.fields import GenericForeignKey
from django.contrib.contenttypes.models import ContentType
from django.db.utils import IntegrityError
from django.core.exceptions import ValidationError

class MarketingPagesRouter(BaseModel):
    """
    This model acts as a router for dynamic marketing pages.
    It holds a unique slug and a generic foreign key to the actual page content model.
    This allows having different page templates/models under a single URL structure.
    """
    path_prefix = models.SlugField(
        max_length=100,
        default='',
        blank=True,
        help_text="Optional path prefix for the URL (e.g., 'services', 'products'). Leave empty for root level."
    )
    slug = models.SlugField(max_length=255)
    content_type = models.ForeignKey(ContentType, on_delete=models.CASCADE)
    object_id = models.PositiveIntegerField()
    content_object = GenericForeignKey('content_type', 'object_id')

    class Meta:
        unique_together = [['path_prefix', 'slug']]
        
    def get_full_path(self):
        """Returns the complete URL path"""
        if self.path_prefix:
            return f"{self.path_prefix}/{self.slug}/"
        return f"{self.slug}/"

    def __str__(self):
        return self.get_full_path()

class AdAgencyTemplate(BaseModel):
    STATUS_DRAFT = 'DRAFT'
    STATUS_PUBLISHED = 'PUBLISHED'
    STATUS_CHOICES = [
        (STATUS_DRAFT, 'Draft'),
        (STATUS_PUBLISHED, 'Published'),
    ]

    # Meta and control fields
    path_prefix = models.SlugField(
        max_length=100,
        default='',
        blank=True,
        help_text="Optional URL path prefix (e.g., 'services' for /services/slug/). Leave empty for root level."
    )
    slug = models.SlugField(max_length=255, help_text="URL-friendly identifier. Must be unique within the same path prefix.")
    meta_title = models.CharField(max_length=255)
    meta_description = models.TextField(blank=True)
    status = models.CharField(max_length=10, choices=STATUS_CHOICES, default=STATUS_DRAFT)
    html_template = models.CharField(max_length=255, default='marketing_pages/ad_agency.html', editable=False)

    # Hero Section
    hero_title = models.CharField(max_length=255)
    hero_description = models.TextField(blank=True)
    hero_image = models.ImageField(upload_to='marketing_pages/hero_images/', blank=True, null=True, help_text="Imagen principal para la sección hero.")
    
    # Claim Section
    claim = models.CharField(max_length=255)
    claim_subheading = models.CharField(max_length=255, blank=True)

    # Problems Section
    problem_1_title = models.CharField(max_length=255)
    problem_1_subtext = models.TextField(blank=True)
    problem_1_icon = models.CharField(max_length=100, blank=True, help_text="e.g., 'icon-name' from an icon library")
    
    problem_2_title = models.CharField(max_length=255)
    problem_2_subtext = models.TextField(blank=True)
    problem_2_icon = models.CharField(max_length=100, blank=True)

    problem_3_title = models.CharField(max_length=255)
    problem_3_subtext = models.TextField(blank=True)
    problem_3_icon = models.CharField(max_length=100, blank=True)

    # Feature 1 Section
    feature_1_title = models.CharField(max_length=255, blank=True)
    feature_1_title_desc = models.TextField(blank=True)
    feature_1_image = models.ImageField(upload_to='marketing_pages/feature_images/', blank=True, null=True)
    feature_1_subtit_1_title = models.CharField(max_length=255, blank=True)
    feature_1_subtit_1_icon = models.CharField(max_length=100, blank=True, help_text="e.g., 'globe'")
    feature_1_subtit_1_desc = models.TextField(blank=True)
    feature_1_subtit_2_title = models.CharField(max_length=255, blank=True)
    feature_1_subtit_2_icon = models.CharField(max_length=100, blank=True, help_text="e.g., 'message-square'")
    feature_1_subtit_2_desc = models.TextField(blank=True)

    # Feature 2 Section
    feature_2_title = models.CharField(max_length=255, blank=True)
    feature_2_title_desc = models.TextField(blank=True)
    feature_2_image = models.ImageField(upload_to='marketing_pages/feature_images/', blank=True, null=True)
    feature_2_subtit_1_title = models.CharField(max_length=255, blank=True)
    feature_2_subtit_1_icon = models.CharField(max_length=100, blank=True, help_text="e.g., 'sparkles'")
    feature_2_subtit_1_desc = models.TextField(blank=True)
    feature_2_subtit_2_title = models.CharField(max_length=255, blank=True)
    feature_2_subtit_2_icon = models.CharField(max_length=100, blank=True, help_text="e.g., 'layout-template'")
    feature_2_subtit_2_desc = models.TextField(blank=True)

    def __str__(self):
        return self.hero_title

    def save(self, *args, **kwargs):
        # First, save the instance to get a PK
        # This is wrapped in a transaction to ensure atomicity
        from django.db import transaction
        with transaction.atomic():
            # Check for uniqueness of path_prefix + slug combination
            if self.pk is not None:
                original = AdAgencyTemplate.objects.get(pk=self.pk)
                if original.slug != self.slug or original.path_prefix != self.path_prefix:
                    if MarketingPagesRouter.objects.filter(
                        slug=self.slug, 
                        path_prefix=self.path_prefix
                    ).exclude(
                        object_id=self.pk, 
                        content_type=ContentType.objects.get_for_model(self)
                    ).exists():
                        full_path = f"{self.path_prefix}/{self.slug}" if self.path_prefix else self.slug
                        raise ValidationError(f"The path '{full_path}' is already in use. Please choose a different slug or path prefix.")
            elif MarketingPagesRouter.objects.filter(slug=self.slug, path_prefix=self.path_prefix).exists():
                full_path = f"{self.path_prefix}/{self.slug}" if self.path_prefix else self.slug
                raise ValidationError(f"The path '{full_path}' is already in use. Please choose a different slug or path prefix.")

            super().save(*args, **kwargs)

            content_type = ContentType.objects.get_for_model(self)
            router_entry, created = MarketingPagesRouter.objects.get_or_create(
                content_type=content_type,
                object_id=self.pk,
                defaults={'slug': self.slug, 'path_prefix': self.path_prefix}
            )

            if not created and (router_entry.slug != self.slug or router_entry.path_prefix != self.path_prefix):
                router_entry.slug = self.slug
                router_entry.path_prefix = self.path_prefix
                router_entry.save()

    def delete(self, *args, **kwargs):
        # Also delete the router entry when this object is deleted
        content_type = ContentType.objects.get_for_model(self)
        MarketingPagesRouter.objects.filter(content_type=content_type, object_id=self.pk).delete()
        super().delete(*args, **kwargs)

