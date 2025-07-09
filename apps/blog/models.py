from django.db import models
from django.utils.translation import gettext_lazy as _
from modelcluster.fields import ParentalKey
from wagtail import blocks
from wagtail.admin.panels import FieldPanel, InlinePanel
from wagtail.fields import RichTextField, StreamField
from wagtail.images.blocks import ImageChooserBlock
from wagtail.models import Orderable, Page
from wagtail.search import index
from django.core.exceptions import ValidationError


def _get_default_block_types():
    return [
        ("paragraph", blocks.RichTextBlock(features=[
            # Encabezados
            'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
            
            # Formato básico
            'bold', 'italic', 'underline', 'strikethrough',
            'superscript', 'subscript',
            
            # Listas y estructura
            'ol', 'ul', 'hr',
            
            # Enlaces y media
            'link', 'document-link', 'image', 'embed',
            
            # Código y citas
            'code', 'blockquote',
            
            # Alineación
            'center', 'left', 'right',
            
            # Tablas
            'table',
        ])),
        ("image", ImageChooserBlock()),
        ("html", blocks.RawHTMLBlock()),
    ]


class BlogIndexPage(Page):
    """
    Index page for the blog
    """
    intro = RichTextField(blank=True)
    content_panels = Page.content_panels + [FieldPanel("intro", classname="full")]

    def get_ordered_blog_posts(self):
        return self.get_children().live().specific().order_by("-first_published_at")


class BlogPage(Page):
    """
    A single blog post
    """
    date = models.DateField("Post date")
    intro = models.CharField(max_length=250)
    body = StreamField(_get_default_block_types())

    search_fields = Page.search_fields + [
        index.SearchField("intro"),
        index.SearchField("body"),
    ]

    content_panels = Page.content_panels + [
        FieldPanel("date"),
        FieldPanel("intro"),
        FieldPanel("body", classname="full"),
        InlinePanel("gallery_images", label="Gallery images"),
    ]

    @property
    def main_image(self):
        gallery_item = self.gallery_images.first()
        if gallery_item:
            return gallery_item.image
        return None


class BlogPageGalleryImage(Orderable):
    page = ParentalKey(BlogPage, on_delete=models.CASCADE, related_name="gallery_images")
    image = models.ForeignKey("wagtailimages.Image", on_delete=models.CASCADE, related_name="+")
    caption = models.CharField(blank=True, max_length=250)

    panels = [
        FieldPanel("image"),
        FieldPanel("caption"),
    ]


class BlogApiConfig(models.Model):
    """
    Configuración para la API externa de blog
    """
    api_endpoint = models.URLField(
        verbose_name=_("URL del endpoint de la API"),
        help_text=_("URL completa del endpoint de la API externa")
    )
    api_key = models.CharField(
        max_length=255, 
        verbose_name=_("Clave de API"),
        help_text=_("Clave de autenticación para la API externa")
    )
    last_import = models.DateTimeField(
        null=True, 
        blank=True,
        verbose_name=_("Última importación"),
        help_text=_("Fecha y hora de la última importación exitosa")
    )
    
    class Meta:
        verbose_name = _("Configuración de API de Blog")
        verbose_name_plural = _("Configuración de API de Blog")
    
    def __str__(self):
        return "Configuración de API de Blog"
    
    def save(self, *args, **kwargs):
        # Asegurar que solo exista una instancia
        if not self.pk and BlogApiConfig.objects.exists():
            raise ValidationError(_("Ya existe una configuración. Solo puede haber una configuración a la vez."))
        super().save(*args, **kwargs)
        
    @classmethod
    def get_solo(cls):
        """
        Retorna la única instancia de configuración o None si no existe
        """
        return cls.objects.first()
