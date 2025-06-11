from django.conf import settings
from django.db import models
from django.contrib.postgres.fields import ArrayField

from apps.utils.models import BaseModel


class ApiConfiguration(BaseModel):
    """
    Configuración para consultas a la API de Meta Ad Library.
    Almacena los parámetros de configuración para las consultas.
    """
    ad_reached_countries = ArrayField(
        models.CharField(max_length=2), 
        default=list(['US', 'GB']),
        help_text="Lista de códigos de país donde se muestran los anuncios (ej: US, GB, ES)"
    )
    content_languages = ArrayField(
        models.CharField(max_length=2), 
        default=list(['EN']),
        help_text="Lista de códigos de idioma del contenido (ej: EN, ES, FR)"
    )
    media_types = ArrayField(
        models.CharField(max_length=20), 
        default=list(['MEME', 'IMAGE']),
        help_text="Tipos de medios a incluir en la búsqueda"
    )
    fields = models.TextField(
        default="page_name,ad_creative_bodies,ad_snapshot_url,impressions,spend",
        help_text="Campos a incluir en la respuesta, separados por comas"
    )
    limit = models.PositiveIntegerField(
        default=100,
        help_text="Número máximo de anuncios por página en la respuesta"
    )
    
    class Meta:
        verbose_name = "Configuración de API"
        verbose_name_plural = "Configuración de API"
    
    def __str__(self):
        return "Configuración de Meta Ad Library API"
    
    @classmethod
    def get_solo(cls):
        """
        Retorna la única configuración o crea una por defecto si no existe.
        """
        obj, created = cls.objects.get_or_create(pk=1)
        return obj


class FacebookPage(BaseModel):
    """
    Almacena información sobre páginas de Facebook para consultar sus anuncios.
    """
    page_id = models.CharField(
        max_length=100, 
        unique=True,
        help_text="ID único de la página de Facebook"
    )
    page_name = models.CharField(
        max_length=255, 
        blank=True,
        help_text="Nombre de la página de Facebook"
    )
    industry = models.CharField(
        max_length=100, 
        blank=True,
        help_text="Industria o categoría de la página"
    )
    country = models.CharField(
        max_length=2, 
        blank=True,
        help_text="Código de país de origen de la página (ej: US, ES)"
    )
    notes = models.TextField(
        blank=True,
        help_text="Notas adicionales sobre esta página"
    )
    is_active = models.BooleanField(
        default=True,
        help_text="Indica si esta página debe incluirse en las consultas"
    )
    
    class Meta:
        verbose_name = "Página de Facebook"
        verbose_name_plural = "Páginas de Facebook"
        ordering = ['page_name', 'page_id']
    
    def __str__(self):
        if self.page_name:
            return f"{self.page_name} ({self.page_id})"
        return self.page_id
