import json

from django.conf import settings
from django.db import models
from django.contrib.postgres.fields import ArrayField
from django.urls import reverse
from django.core.exceptions import ValidationError

from apps.utils.models import BaseModel


def default_ad_reached_countries():
    return ["BR","IN","GB","US","CA","AR","AU","AT","BE","CL","CN","CO","HR","DK","DO","EG","FI","FR","DE","GR","HK","ID","IE","IL","IT","JP","JO","KW","LB","MY","MX","NL","NZ","NG","NO","PK","PA","PE","PH","PL","RU","SA","RS","SG","ZA","KR","ES","SE","CH","TW","TH","TR","AE","VE","PT","LU","BG","CZ","SI","IS","SK","LT","TT","BD","LK","KE","HU","MA","CY","JM","EC","RO","BO","GT","CR","QA","SV","HN","NI","PY","UY","PR","BA","PS","TN","BH","VN","GH","MU","UA","MT","BS","MV","OM","MK","LV","EE","IQ","DZ","AL","NP","MO","ME","SN","GE","BN","UG","GP","BB","AZ","TZ","LY","MQ","CM","BW","ET","KZ","NA","MG","NC","MD","FJ","BY","JE","GU","YE","ZM","IM","HT","KH","AW","PF","AF","BM","GY","AM","MW","AG","RW","GG","GM","FO","LC","KY","BJ","AD","GD","VI","BZ","VC","MN","MZ","ML","AO","GF","UZ","DJ","BF","MC","TG","GL","GA","GI","CD","KG","PG","BT","KN","SZ","LS","LA","LI","MP","SR","SC","VG","TC","DM","MR","AX","SM","SL","NE","CG","AI","YT","CV","GN","TM","BI","TJ","VU","SB","ER","WS","AS","FK","GQ","TO","KM","PW","FM","CF","SO","MH","VA","TD","KI","ST","TV","NR","RE","LR","ZW","CI","MM","AN","AQ","BQ","BV","IO","CX","CC","CK","CW","TF","GW","HM","XK","MS","NU","NF","PN","BL","SH","MF","PM","SX","GS","SS","SJ","TL","TK","UM","WF","EH"]


def default_content_languages():
    return ['en']


def default_media_types():
    return ['MEME']


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
    industries = models.ManyToManyField('ads.IndustryList', related_name="facebook_pages", blank=True)
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
    STATUS_PENDING = 'pending'
    STATUS_SUCCESS = 'success'
    STATUS_FAILED = 'failed'
    
    STATUS_CHOICES = [
        (STATUS_PENDING, 'Pending'),
        (STATUS_SUCCESS, 'Success'),
        (STATUS_FAILED, 'Failed'),
    ]
    
    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default=STATUS_PENDING,
        help_text="Current status of the API execution"
    )
    
    ad_delivery_date_min = models.CharField(
        max_length=10,
        default="2024-01-01",
        blank=True,
        help_text="Minimum ad delivery date in YYYY-MM-DD format. If empty, no date filter will be applied."
    )
    
    ad_reached_countries = models.TextField(
        default=json.dumps(["BR","IN","GB","US","CA","AR","AU","AT","BE","CL","CN","CO","HR","DK","DO","EG","FI","FR","DE","GR","HK","ID","IE","IL","IT","JP","JO","KW","LB","MY","MX","NL","NZ","NG","NO","PK","PA","PE","PH","PL","RU","SA","RS","SG","ZA","KR","ES","SE","CH","TW","TH","TR","AE","VE","PT","LU","BG","CZ","SI","IS","SK","LT","TT","BD","LK","KE","HU","MA","CY","JM","EC","RO","BO","GT","CR","QA","SV","HN","NI","PY","UY","PR","BA","PS","TN","BH","VN","GH","MU","UA","MT","BS","MV","OM","MK","LV","EE","IQ","DZ","AL","NP","MO","ME","SN","GE","BN","UG","GP","BB","AZ","TZ","LY","MQ","CM","BW","ET","KZ","NA","MG","NC","MD","FJ","BY","JE","GU","YE","ZM","IM","HT","KH","AW","PF","AF","BM","GY","AM","MW","AG","RW","GG","GM","FO","LC","KY","BJ","AD","GD","VI","BZ","VC","MN","MZ","ML","AO","GF","UZ","DJ","BF","MC","TG","GL","GA","GI","CD","KG","PG","BT","KN","SZ","LS","LA","LI","MP","SR","SC","VG","TC","DM","MR","AX","SM","SL","NE","CG","AI","YT","CV","GN","TM","BI","TJ","VU","SB","ER","WS","AS","FK","GQ","TO","KM","PW","FM","CF","SO","MH","VA","TD","KI","ST","TV","NR","RE","LR","ZW","CI","MM","AN","AQ","BQ","BV","IO","CX","CC","CK","CW","TF","GW","HM","XK","MS","NU","NF","PN","BL","SH","MF","PM","SX","GS","SS","SJ","TL","TK","UM","WF","EH"]),
        help_text="JSON array of country codes where ads are shown (default: All countries)"
    )
    content_languages = ArrayField(
        models.CharField(max_length=2), 
        default=default_content_languages,
        help_text="List of content language codes (e.g.: en, es, fr)"
    )
    media_types = ArrayField(
        models.CharField(max_length=20), 
        default=default_media_types,
        help_text="MEME or IMAGE"
    )
    fields = models.CharField(
        max_length=1000,
        default="id,ad_creation_time,ad_creative_bodies,ad_creative_link_captions,ad_creative_link_descriptions,ad_creative_link_titles,ad_delivery_start_time,ad_delivery_stop_time,ad_snapshot_url,age_country_gender_reach_breakdown,beneficiary_payers,br_total_reach,bylines,currency,delivery_by_region,demographic_distribution,estimated_audience_size,eu_total_reach,impressions,languages,page_id,page_name,publisher_platforms,spend,target_ages,target_gender,target_locations",
        help_text="Fields to include in the response, comma-separated"
    )
    error_log = models.TextField(
        blank=True,
        null=True,
        help_text="Log of errors encountered during API calls"
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
