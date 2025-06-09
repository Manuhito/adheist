from django.db import models
from django.urls import reverse
from django.conf import settings
from django.core.serializers.json import DjangoJSONEncoder
import json

from apps.utils.models import BaseModel
from django.core.cache import cache


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
    company_name = models.CharField(max_length=100)
    industries = models.ManyToManyField(IndustryList, related_name="adlibraries")
    tags = models.ManyToManyField(TagList, related_name="adlibraries")
    ad_image = models.ImageField(upload_to="adlibrary/", null=True, blank=True)
    is_fav = models.BooleanField(default=False)

    def __str__(self):
        return self.company_name

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
        default=2,
        help_text="Default version credits for users without subscription"
    )
    
    # Starter plan credits
    starter_general_credits = models.PositiveIntegerField(
        default=20,
        help_text="General credits for users with Starter subscription"
    )
    starter_version_credits = models.PositiveIntegerField(
        default=5,
        help_text="Version credits for users with Starter subscription"
    )
    
    # Pro plan credits
    pro_general_credits = models.PositiveIntegerField(
        default=50,
        help_text="General credits for users with Pro subscription"
    )
    pro_version_credits = models.PositiveIntegerField(
        default=10,
        help_text="Version credits for users with Pro subscription"
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
        cache.delete('app_configuration')
        
        return super().save(*args, **kwargs)
    
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
            
            # Save in cache for 1 hour (3600 seconds)
            cache.set('app_configuration', config, 3600)
        
        return config


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
                
                elif current_status == self.STATUS_DRAFT and self.status not in [self.STATUS_NEW, self.STATUS_FILLED, self.STATUS_DRAFT]:
                    from django.core.exceptions import ValidationError
                    raise ValidationError(f"Cannot transition from {current_status} to {self.status}. Only transitions to NEW or FILLED are allowed.")
                
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
        return self.get_asset_value('main_hex_color')
    
    def get_key_benefits(self):
        return self.get_asset_value('key_benefits')
    
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
    openai_gpt4_prompt = models.TextField(null=True, blank=True, help_text="Enhanced prompt generated by GPT-4o")
    openai_response_metadata = models.JSONField(null=True, blank=True, help_text="Metadata from OpenAI API responses")
    error_logs = models.TextField(null=True, blank=True, help_text="Error logs when image generation fails")
    
    def save(self, *args, **kwargs):
        """Override save method to update generated_prompt if needed and send email notifications"""
        # Check if this is a new instance or if generated_prompt is empty
        is_new = self.pk is None
        force_regenerate = kwargs.pop('regenerate_prompt', False)
        
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
        
        # First save the model to ensure it has an ID
        super().save(*args, **kwargs)
        
        # Generate prompt if it's empty, new, or forced
        if is_new or not self.generated_prompt or force_regenerate:
            from .gen_prompt import generate_prompt
            prompt = generate_prompt(self)
            # Save the generated prompt only in the legacy field
            self.generated_prompt = prompt
            # Save again to store the generated prompt
            super().save(update_fields=['generated_prompt'])
        
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
