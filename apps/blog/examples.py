"""
Example scripts for creating blog posts programmatically.

Usage:
    python manage.py shell
    >>> from apps.blog.examples import create_example_blog_post
    >>> create_example_blog_post()
    
    # To test API integration:
    >>> from apps.blog.examples import test_api_integration
    >>> test_api_integration(max_posts=2)  # Limit to 2 posts for testing
"""
from datetime import date

from django.core.files.base import ContentFile
from django.core.files.images import ImageFile
from wagtail.images.models import Image

from apps.blog.api_utils import create_blog_post, upload_image_for_blog, import_posts_from_api, fetch_posts_from_api


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
    # First, check if we already have the example image or use the app's logo
    try:
        # Check if we already have the example image
        image = Image.objects.filter(title="Example API Image").first()
        
        if not image:
            # Use the app's logo as the image
            logo_path = "static/images/web/logo-adheist.png"
            
            try:
                with open(logo_path, "rb") as f:
                    image = upload_image_for_blog(
                        image_file=ImageFile(f), 
                        title="Example API Image"
                    )
            except FileNotFoundError:
                print(f"Logo file not found at {logo_path}. Using fallback.")
                # Fallback to a simple content file if logo not found
                image_content = ContentFile(b"Example image content", name="example_image.jpg")
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
                "value": image  # Use the image object in the StreamField
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


def test_api_integration(max_posts: int = None):
    """Test fetching and importing blog posts from the external CMS API.
    
    Args:
        max_posts: Maximum number of posts to import (None for all)
    
    Returns:
        List of created blog posts
    """
    print("Testing API integration...")
    
    try:
        # First, just try to fetch the data to verify API connectivity
        print("Fetching posts from API...")
        posts_data = fetch_posts_from_api()
        print(f"Successfully fetched {len(posts_data)} posts from API")
        
        # Print the first post's title for verification
        if posts_data:
            first_post = posts_data[0]
            print(f"First post title: {first_post.get('title')}")
            print(f"First post excerpt: {first_post.get('excerpt', '')[:100]}...")
        
        # Now import the posts
        print("\nImporting posts to the blog...")
        created_posts = import_posts_from_api(max_posts=max_posts)
        
        print(f"\nSuccessfully imported {len(created_posts)} posts")
        for post in created_posts:
            print(f"- {post.title} (URL: /blog/{post.slug}/)")
        
        return created_posts
        
    except Exception as e:
        print(f"Error during API integration test: {str(e)}")
        return []
