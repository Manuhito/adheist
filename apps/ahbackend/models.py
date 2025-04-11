from django.db import models
from django.urls import reverse
from django.conf import settings
from django.core.serializers.json import DjangoJSONEncoder
import json

from apps.utils.models import BaseModel


class IndustryList(BaseModel):
    name = models.CharField(max_length=100)

    def __str__(self):
        return self.name

    def get_absolute_url(self):
        return reverse("ahbackend:industrylist_detail", kwargs={"pk": self.pk})


class TagList(BaseModel):
    name = models.CharField(max_length=100)

    def __str__(self):
        return self.name

    def get_absolute_url(self):
        return reverse("ahbackend:taglist_detail", kwargs={"pk": self.pk})


class AdLibrary(BaseModel):
    company_name = models.CharField(max_length=100)
    industries = models.ManyToManyField(IndustryList, related_name="adlibraries")
    tags = models.ManyToManyField(TagList, related_name="adlibraries")
    ad_image = models.ImageField(upload_to="adlibrary/", null=True, blank=True)

    def __str__(self):
        return self.company_name

    def get_absolute_url(self):
        return reverse("ahbackend:adlibrary_detail", kwargs={"pk": self.pk})


class AdRequestAssets(BaseModel):
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="asset_collections", null=True, blank=True)
    company_website = models.URLField(null=True, blank=True)
    logo = models.ImageField(upload_to="adrequest_assets/", null=True, blank=True)
    main_hex_color = models.CharField(max_length=7, null=True, blank=True)
    key_benefits = models.TextField(null=True, blank=True)
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
            'company_website': self.company_website,
            'main_hex_color': self.main_hex_color,
            'key_benefits': self.key_benefits,
            # We don't include images in the dict as they need special handling
        }


class AdRequest(BaseModel):
    STATUS_DRAFT = 'DRAFT'
    STATUS_FILLED = 'FILLED'
    STATUS_SUBMITTED = 'SUBMITTED'
    STATUS_APPROVED = 'COMPLETED'
    STATUS_REOPENED = 'REOPENED'
    STATUS_CHOICES = [
        (STATUS_DRAFT, 'Draft'),
        (STATUS_FILLED, 'Filled'),
        (STATUS_SUBMITTED, 'Submitted'),
        (STATUS_APPROVED, 'Completed'),
        (STATUS_REOPENED, 'Reopened'),
    ]
    
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    ad_library = models.ForeignKey(AdLibrary, on_delete=models.CASCADE)
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
    
    canvas_size = models.CharField(max_length=20, default="1080x1080")
    status = models.CharField(max_length=10, choices=STATUS_CHOICES, default=STATUS_DRAFT)
    
    def save(self, *args, **kwargs):
        """Override save method to update base_assets with overrides"""
        # First save the model to ensure it has an ID
        super().save(*args, **kwargs)
        
        # Update base_assets with any overrides if base_assets exists
        if self.base_assets:
            # Update JSON fields from asset_overrides
            for field_name, value in self.asset_overrides.items():
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
                if hasattr(self, override_field) and getattr(self, override_field):
                    setattr(self.base_assets, field_name, getattr(self, override_field))
            
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
        
        # Fall back to base assets
        return getattr(self.base_assets, field_name)
    
    def get_company_website(self):
        return self.get_asset_value('company_website')
    
    def get_main_hex_color(self):
        return self.get_asset_value('main_hex_color')
    
    def get_key_benefits(self):
        return self.get_asset_value('key_benefits')
    
    def get_logo(self):
        return self.logo_override or self.base_assets.logo
    
    def get_product_image_1(self):
        return self.product_image_1_override or self.base_assets.product_image_1
    
    def get_product_image_2(self):
        return self.product_image_2_override or self.base_assets.product_image_2
    
    def get_app_image_1(self):
        return self.app_image_1_override or self.base_assets.app_image_1
    
    def get_app_image_2(self):
        return self.app_image_2_override or self.base_assets.app_image_2
    
    def get_marketing_image_1(self):
        return self.marketing_image_1_override or self.base_assets.marketing_image_1
    
    def get_marketing_image_2(self):
        return self.marketing_image_2_override or self.base_assets.marketing_image_2
    
    def get_marketing_image_3(self):
        return self.marketing_image_3_override or self.base_assets.marketing_image_3


class AdRequestVersion(BaseModel):
    STATUS_UNASSIGNED = 'UNASSIGNED'
    STATUS_ASSIGNED = 'ASSIGNED'
    STATUS_COMPLETED = 'COMPLETED'
    STATUS_CHOICES = [
        (STATUS_UNASSIGNED, 'Unassigned'),
        (STATUS_ASSIGNED, 'Assigned'),
        (STATUS_COMPLETED, 'Completed'),
    ]
    
    ad_request = models.ForeignKey(AdRequest, on_delete=models.CASCADE, related_name="versions")
    generated_prompt = models.TextField(null=True, blank=True)
    user_prompt = models.TextField(null=True, blank=True)
    generated_image = models.ImageField(upload_to="revisions/", null=True, blank=True)
    user_admin_assigned = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, null=True, blank=True, related_name="assigned_requests")
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default=STATUS_UNASSIGNED)
    
    def save(self, *args, **kwargs):
        """Override save method to update generated_prompt if needed"""
        # Check if this is a new instance or if generated_prompt is empty
        is_new = self.pk is None
        force_regenerate = kwargs.pop('regenerate_prompt', False)
        
        # First save the model to ensure it has an ID
        super().save(*args, **kwargs)
        
        # Generate prompt if it's empty, new, or forced
        if is_new or not self.generated_prompt or force_regenerate:
            from .gen_prompt import generate_prompt
            self.generated_prompt = generate_prompt(self)
            # Save again to store the generated prompt
            super().save(update_fields=['generated_prompt'])
    
    def regenerate_prompt(self):
        """Regenerate the prompt for this version"""
        self.save(regenerate_prompt=True)
