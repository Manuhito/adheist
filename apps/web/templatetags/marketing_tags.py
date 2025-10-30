from django import template
from django.conf import settings
from apps.web.storage_backends import MarketingStorage, IndustriesStorage

register = template.Library()


@register.simple_tag
def marketing_image(filename):
    """
    Generate URL for marketing images stored in S3.
    
    Usage in templates:
        {% load marketing_tags %}
        <img src="{% marketing_image 'hero-banner.jpg' %}" alt="Hero">
    
    Args:
        filename: Name of the file (e.g., 'hero-banner.jpg')
        
    Returns:
        Full URL to the image in S3 (media/marketing/filename)
    """
    if settings.USE_S3_MEDIA:
        storage = MarketingStorage()
        return storage.url(filename)
    else:
        # Fallback to local static files for development
        return f"{settings.STATIC_URL}images/marketing-pages/{filename}"


@register.simple_tag
def industry_image(filename):
    """
    Generate URL for industry-specific images stored in S3.
    
    Usage in templates:
        {% load marketing_tags %}
        <img src="{% industry_image 'ecommerce-hero.jpg' %}" alt="E-commerce">
    
    Args:
        filename: Name of the file (e.g., 'ecommerce-hero.jpg')
        
    Returns:
        Full URL to the image in S3 (media/marketing/industries/filename)
    """
    if settings.USE_S3_MEDIA:
        storage = IndustriesStorage()
        return storage.url(filename)
    else:
        # Fallback to local static files for development
        return f"{settings.STATIC_URL}images/marketing-pages/industries/{filename}"


@register.simple_tag
def marketing_url():
    """
    Get the base URL for marketing images.
    
    Usage in templates:
        {% load marketing_tags %}
        <img src="{% marketing_url %}hero-banner.jpg" alt="Hero">
    
    Returns:
        Base URL for marketing images
    """
    if settings.USE_S3_MEDIA:
        bucket_name = getattr(settings, 'AWS_STORAGE_BUCKET_NAME', 'adheist-s3-prod')
        region = getattr(settings, 'AWS_S3_REGION_NAME', 'us-east-2')
        return f"https://{bucket_name}.s3.{region}.amazonaws.com/media/marketing/"
    else:
        return f"{settings.STATIC_URL}images/marketing-pages/"


@register.simple_tag
def industry_url():
    """
    Get the base URL for industry images.
    
    Usage in templates:
        {% load marketing_tags %}
        <img src="{% industry_url %}ecommerce-hero.jpg" alt="E-commerce">
    
    Returns:
        Base URL for industry images
    """
    if settings.USE_S3_MEDIA:
        bucket_name = getattr(settings, 'AWS_STORAGE_BUCKET_NAME', 'adheist-s3-prod')
        region = getattr(settings, 'AWS_S3_REGION_NAME', 'us-east-2')
        return f"https://{bucket_name}.s3.{region}.amazonaws.com/media/marketing/industries/"
    else:
        return f"{settings.STATIC_URL}images/marketing-pages/industries/"
