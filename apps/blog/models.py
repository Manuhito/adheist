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
    Configuration for the external blog API
    """
    api_endpoint = models.URLField(
        verbose_name=_("API endpoint URL"),
        help_text=_("Complete URL of the external API endpoint")
    )
    api_key = models.CharField(
        max_length=255, 
        verbose_name=_("API Key"),
        help_text=_("Authentication key for the external API")
    )
    last_import = models.DateTimeField(
        null=True, 
        blank=True,
        verbose_name=_("Last import"),
        help_text=_("Date and time of the last successful import")
    )
    
    class Meta:
        verbose_name = _("Blog API Configuration")
        verbose_name_plural = _("Blog API Configuration")
    
    def __str__(self):
        return "Blog API Configuration"
    
    def save(self, *args, **kwargs):
        # Ensure only one instance exists
        if not self.pk and BlogApiConfig.objects.exists():
            raise ValidationError(_("A configuration already exists. Only one configuration can exist at a time."))
        super().save(*args, **kwargs)
        
    @classmethod
    def get_solo(cls):
        """
        Retorna la única instancia de configuración o None si no existe
        """
        return cls.objects.first()
