import json

from django.conf import settings
from django.db import models
from django.contrib.postgres.fields import ArrayField
from django.urls import reverse
from django.core.exceptions import ValidationError

from apps.utils.models import BaseModel


# DEPRECATED: Mantenemos estas funciones para compatibilidad con migraciones existentes
def default_ad_reached_countries():
    """DEPRECATED: Mantenida solo para compatibilidad con migraciones existentes"""
    return ["BR","IN","GB","US","CA","AR","AU","AT","BE","CL","CN","CO","HR","DK","DO","EG","FI","FR","DE","GR","HK","ID","IE","IL","IT","JP","JO","KW","LB","MY","MX","NL","NZ","NG","NO","PK","PA","PE","PH","PL","RU","SA","RS","SG","ZA","KR","ES","SE","CH","TW","TH","TR","AE","VE","PT","LU","BG","CZ","SI","IS","SK","LT","TT","BD","LK","KE","HU","MA","CY","JM","EC","RO","BO","GT","CR","QA","SV","HN","NI","PY","UY","PR","BA","PS","TN","BH","VN","GH","MU","UA","MT","BS","MV","OM","MK","LV","EE","IQ","DZ","AL","NP","MO","ME","SN","GE","BN","UG","GP","BB","AZ","TZ","LY","MQ","CM","BW","ET","KZ","NA","MG","NC","MD","FJ","BY","JE","GU","YE","ZM","IM","HT","KH","AW","PF","AF","BM","GY","AM","MW","AG","RW","GG","GM","FO","LC","KY","BJ","AD","GD","VI","BZ","VC","MN","MZ","ML","AO","GF","UZ","DJ","BF","MC","TG","GL","GA","GI","CD","KG","PG","BT","KN","SZ","LS","LA","LI","MP","SR","SC","VG","TC","DM","MR","AX","SM","SL","NE","CG","AI","YT","CV","GN","TM","BI","TJ","VU","SB","ER","WS","AS","FK","GQ","TO","KM","PW","FM","CF","SO","MH","VA","TD","KI","ST","TV","NR","RE","LR","ZW","CI","MM","AN","AQ","BQ","BV","IO","CX","CC","CK","CW","TF","GW","HM","XK","MS","NU","NF","PN","BL","SH","MF","PM","SX","GS","SS","SJ","TL","TK","UM","WF","EH"]


def default_content_languages():
    """DEPRECATED: Mantenida solo para compatibilidad con migraciones existentes"""
    return ['en']


def default_media_types():
    """DEPRECATED: Mantenida solo para compatibilidad con migraciones existentes"""
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
    page_url = models.URLField(
        blank=True,
        help_text="Facebook page URL"
    )
    industries = models.ManyToManyField('ads.IndustryList', related_name="apify_facebook_pages", blank=True)
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
    
    AD_ACTIVE = 'active'
    AD_INACTIVE = 'inactive'
    AD_ALL = 'all'
    
    AD_ACTIVE_STATUS_CHOICES = [
        (AD_ACTIVE, 'Active'),
        (AD_INACTIVE, 'Inactive'),
        (AD_ALL, 'All'),
    ]
    
    MEDIA_TYPE_ALL = 'all'
    MEDIA_TYPE_IMAGE = 'image'
    MEDIA_TYPE_MEME = 'meme'
    MEDIA_TYPE_IMAGE_AND_MEME = 'image_and_meme'
    
    MEDIA_TYPE_CHOICES = [
        (MEDIA_TYPE_ALL, 'All Media Types'),
        (MEDIA_TYPE_IMAGE, 'Images'),
        (MEDIA_TYPE_MEME, 'Memes'),
        (MEDIA_TYPE_IMAGE_AND_MEME, 'Images and Memes'),
    ]
    
    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default=STATUS_PENDING,
        help_text="Current status of the API execution"
    )
    
    ad_active_status = models.CharField(
        max_length=10,
        choices=AD_ACTIVE_STATUS_CHOICES,
        default=AD_ACTIVE,
        help_text="Status of the ad (active, inactive, or all)"
    )
    
    ad_delivery_date_min = models.CharField(
        max_length=10,
        default="",
        blank=True,
        help_text="Minimum ad delivery date in YYYY-MM-DD format. If empty, no date filter will be applied."
    )
    
    ad_reached_countries = models.CharField(
        max_length=10,
        default="ALL",
        help_text="Country code where ads are shown (e.g.: US) or ALL for all countries"
    )
    content_languages = models.CharField(
        max_length=10,
        default="en",
        blank=True,
        help_text="Content language code (e.g.: en). Leave blank for all languages."
    )
    media_types = models.CharField(
        max_length=20,
        choices=MEDIA_TYPE_CHOICES,
        default=MEDIA_TYPE_IMAGE_AND_MEME,
        help_text="Type of media to filter ads by"
    )
    error_log = models.TextField(
        blank=True,
        null=True,
        help_text="Log of errors encountered during API calls"
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
        return reverse('admin:apify_backload_change', args=[self.pk])
        
    def get_facebook_ads_url_for_page(self, page_id):
        """
        Construye la URL para la API de Facebook Ads Library para una página específica.
        
        Formato de URL:
        https://www.facebook.com/ads/library/?active_status=active&ad_type=all&country=ALL&view_all_page_id=PAGE_ID
        
        Parámetros opcionales:
        - content_languages[0]=en (si está definido)
        - media_type=image_and_meme (según el valor seleccionado)
        - start_date[min]=2020-08-20 (si hay fecha mínima)
        
        Args:
            page_id: ID de la página de Facebook
            
        Returns:
            str: URL para la API de Facebook Ads Library
        """
        # Construir la URL base
        url = f"https://www.facebook.com/ads/library/?active_status={self.ad_active_status}&ad_type=all&country={self.ad_reached_countries}&view_all_page_id={page_id}"
        
        # Añadir parámetros opcionales
        if self.content_languages:
            url += f"&content_languages[0]={self.content_languages}"
            
        if self.media_types != self.MEDIA_TYPE_ALL:
            url += f"&media_type={self.media_types}"
            
        if self.ad_delivery_date_min:
            url += f"&start_date[min]={self.ad_delivery_date_min}"
            
        return url
    
    def get_facebook_ads_urls(self):
        """
        Construye las URLs para la API de Facebook Ads Library según los parámetros del Backload.
        
        Formato de URL:
        https://www.facebook.com/ads/library/?active_status=active&ad_type=all&country=ALL&view_all_page_id=PAGE_ID
        
        Parámetros opcionales:
        - content_languages[0]=en (si está definido)
        - media_type=image_and_meme (según el valor seleccionado)
        - start_date[min]=2020-08-20 (si hay fecha mínima)
        
        Returns:
            list: Lista de diccionarios con las URLs para cada página seleccionada
        """
        urls = []
        page_ids = list(self.pages.filter(is_active=True).values_list('page_id', flat=True))
        
        for page_id in page_ids:
            url = self.get_facebook_ads_url_for_page(page_id)
            urls.append({'url': url})
            
        return urls
