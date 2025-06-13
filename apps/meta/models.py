from django.conf import settings
from django.db import models
from django.contrib.postgres.fields import ArrayField
from django.urls import reverse
from django.core.exceptions import ValidationError

from apps.utils.models import BaseModel


class FacebookPage(BaseModel):
    """
    Stores information about Facebook pages to query their ads.
    """
    page_id = models.CharField(
        max_length=100, 
        unique=True,
        help_text="Unique Facebook page ID"
    )
    page_name = models.CharField(
        max_length=255, 
        blank=True,
        help_text="Facebook page name"
    )
    industry = models.CharField(
        max_length=100, 
        blank=True,
        help_text="Industry or category of the page"
    )
    country = models.CharField(
        max_length=2, 
        blank=True,
        help_text="Country code of the page (e.g.: US, ES)"
    )
    notes = models.TextField(
        blank=True,
        help_text="Additional notes about this page"
    )
    is_active = models.BooleanField(
        default=True,
        help_text="Indicates if this page should be included in queries"
    )
    
    class Meta:
        verbose_name = "Página de Facebook"
        verbose_name_plural = "Páginas de Facebook"
        ordering = ['page_name', 'page_id']
    
    def __str__(self):
        if self.page_name:
            return f"{self.page_name} ({self.page_id})"
        return self.page_id


class Backload(BaseModel):
    """
    Configuration for Meta Ad Library data loads.
    """
    ad_reached_countries = ArrayField(
        models.CharField(max_length=3), 
        default=list(['ALL']),
        help_text="Country codes where ads are shown (default: ALL)"
    )
    content_languages = ArrayField(
        models.CharField(max_length=2), 
        default=list(['EN']),
        help_text="List of content language codes (e.g.: EN, ES, FR)"
    )
    media_types = ArrayField(
        models.CharField(max_length=20), 
        default=list(['MEME', 'IMAGE']),
        help_text="Media types to include in the search"
    )
    fields = models.TextField(
        default="page_name,ad_creative_bodies,ad_snapshot_url,impressions,spend",
        help_text="Fields to include in the response, comma-separated"
    )
    limit = models.PositiveIntegerField(
        default=100,
        help_text="Maximum number of ads per page in the response"
    )
    pages = models.ManyToManyField(
        FacebookPage,
        help_text="Facebook pages to query",
        related_name="backload_loads"
    )
    last_run = models.DateTimeField(
        null=True,
        blank=True,
        help_text="Last time this query was executed"
    )
    output_file = models.CharField(
        max_length=255,
        blank=True,
        help_text="Path to the last generated results file"
    )
    
    class Meta:
        verbose_name = "Meta Ads Query"
        verbose_name_plural = "Meta Ads Queries"
    
    def __str__(self):
        return f"Meta Ads Query #{self.pk} ({self.created_at.strftime('%Y-%m-%d')})"
    
    def get_admin_url(self):
        return reverse('admin:meta_backload_change', args=[self.pk])


class MetaApiToken(BaseModel):
    """
    Stores and manages Meta API access tokens.
    """
    name = models.CharField(
        max_length=100,
        help_text="Name for this token configuration"
    )
    token = models.CharField(
        max_length=500,
        help_text="Meta API access token"
    )
    is_active = models.BooleanField(
        default=True,
        help_text="Whether this token is currently active and should be used for API calls"
    )
    expires_at = models.DateTimeField(
        null=True,
        blank=True,
        help_text="When this token expires (if known)"
    )
    notes = models.TextField(
        blank=True,
        help_text="Additional notes about this token"
    )
    
    class Meta:
        verbose_name = "Meta API Token"
        verbose_name_plural = "Meta API Tokens"
    
    def __str__(self):
        return f"{self.name} {'(Active)' if self.is_active else ''}"
    
    def clean(self):
        # Ensure only one token is active at a time
        if self.is_active:
            active_tokens = MetaApiToken.objects.filter(is_active=True)
            if self.pk:
                active_tokens = active_tokens.exclude(pk=self.pk)
            if active_tokens.exists():
                raise ValidationError({
                    'is_active': 'Only one token can be active at a time. Please deactivate other tokens first.'
                })
    
    @classmethod
    def get_active_token(cls):
        """
        Returns the currently active token string, or None if no active token exists.
        """
        try:
            return cls.objects.get(is_active=True).token
        except cls.DoesNotExist:
            return None
