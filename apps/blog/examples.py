"""
Example scripts for creating blog posts programmatically.

Usage:
    python manage.py shell
    >>> from apps.blog.examples import create_example_blog_post
    >>> create_example_blog_post()
"""
from datetime import date

from django.core.files.base import ContentFile
from wagtail.images.models import Image

from apps.blog.api_utils import create_blog_post, upload_image_for_blog


def create_example_blog_post():
    """Create a simple example blog post programmatically."""
    post = create_blog_post(
        title="Programmatically Created Post",
        intro="This blog post was created via the Python API",
        body_content=[
            {
                "type": "paragraph", 
                "value": "<p>This is an example of creating a blog post programmatically using the Wagtail API.</p>"
            },
            {
                "type": "paragraph", 
                "value": "<p>You can include <b>formatted text</b>, <i>styles</i>, and other HTML elements.</p>"
            },
            {
                "type": "html", 
                "value": "<div class='custom-block'>Custom HTML blocks are also supported!</div>"
            },
        ],
        publication_date=date.today(),
        auto_publish=True
    )
    
    print(f"Created blog post: {post.title}")
    print(f"URL: /blog/{post.slug}/")
    return post


def create_blog_post_with_image():
    """Create a blog post with an embedded image."""
    # First, create a sample image (in production, you'd use a real image file)
    # This is just for demonstration purposes
    try:
        # Check if we already have the example image
        image = Image.objects.filter(title="Example API Image").first()
        
        if not image:
            # Create a simple image for demonstration
            # In real usage, you'd load an actual image file
            image_content = ContentFile(b"Example image content")
            image = upload_image_for_blog(
                image_file=image_content, 
                title="Example API Image"
            )
    except Exception as e:
        print(f"Error creating image: {e}")
        return None
    
    # Now create a post with this image
    post = create_blog_post(
        title="Blog Post with Image",
        intro="This post includes an image added programmatically",
        body_content=[
            {
                "type": "paragraph", 
                "value": "<p>This post demonstrates adding images to blog posts.</p>"
            },
            {
                "type": "image", 
                "value": image.id  # Use the image ID in the StreamField
            },
            {
                "type": "paragraph", 
                "value": "<p>Text after the image.</p>"
            },
        ],
        gallery_images=[
            {
                "image": image,
                "caption": "Gallery image added programmatically"
            }
        ]
    )
    
    print(f"Created blog post with image: {post.title}")
    print(f"URL: /blog/{post.slug}/")
    return post
