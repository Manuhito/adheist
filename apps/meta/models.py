from django.conf import settings
from django.db import models
from django.contrib.postgres.fields import ArrayField
from django.urls import reverse

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


class MetaAdsQueryBase(BaseModel):
    """
    Base class for Meta Ad Library query configurations.
    """
    ad_reached_countries = ArrayField(
        models.CharField(max_length=2), 
        default=list(['US', 'GB']),
        help_text="List of country codes where ads are shown (e.g.: US, GB, ES)"
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
        related_name="%(class)s_loads"
    )
    description = models.TextField(
        blank=True,
        help_text="Description or notes about this query configuration"
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
        abstract = True


class Backload(MetaAdsQueryBase):
    """
    Configuration for historical or complete ad data loads.
    """
    
    class Meta:
        verbose_name = "Carga histórica"
        verbose_name_plural = "Cargas históricas"
    
    def __str__(self):
        return f"Carga histórica #{self.pk} ({self.created_at.strftime('%Y-%m-%d')})"
    
    def get_admin_url(self):
        return reverse('admin:meta_backload_change', args=[self.pk])


class Periodicload(MetaAdsQueryBase):
    """
    Configuration for periodic ad data loads.
    """
    
    class Meta:
        verbose_name = "Periodic load"
        verbose_name_plural = "Periodic loads"
    
    def __str__(self):
        return f"Carga periódica #{self.pk} ({self.created_at.strftime('%Y-%m-%d')})"
    
    def get_admin_url(self):
        return reverse('admin:meta_periodicload_change', args=[self.pk])
