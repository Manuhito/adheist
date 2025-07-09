from django import template
from django.template.defaultfilters import date as date_filter
from django.templatetags.static import static
import json

register = template.Library()

@register.filter
def serialize_blog_posts(posts):
    """Serializes blog posts for React component consumption"""
    serialized_posts = []
    # Imagen por defecto para posts sin imagen
    default_image = static('images/blog/default-blog-image.png')
    
    for post in posts:
        # Get the specific blog page instance
        post = post.specific
        image_url = default_image

        # Safely try to get gallery images
        if hasattr(post, 'gallery_images'):
            gallery = post.gallery_images.all()
            if gallery.exists():
                image_url = gallery.first().image.get_rendition('original').url

        serialized_posts.append({
            'title': post.title,
            'publishedAt': date_filter(post.first_published_at, 'Y-m-d'),
            'summary': post.intro,
            'author': 'AdHeist Team',
            'slug': post.slug,
            'image': image_url
        })
    return json.dumps(serialized_posts)

@register.filter
def serialize_blog_post(post):
    """Serializes a single blog post for React component consumption"""
    # Imagen por defecto para posts sin imagen
    default_image = static('images/blog/default-blog-image.png')
    
    image_url = default_image
    if hasattr(post, 'gallery_images'):
        gallery = post.gallery_images.all()
        if gallery.exists():
            image_url = gallery.first().image.get_rendition('original').url

    return json.dumps({
        'metadata': {
            'title': post.title,
            'publishedAt': date_filter(post.first_published_at, 'Y-m-d'),
            'summary': post.intro,
            'author': 'AdHeist Team',
            'image': image_url
        },
        'slug': post.slug,
        'source': str(post.body)
    })
