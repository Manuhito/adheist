"""
Utility functions for programmatically creating and managing blog posts via the Wagtail API.
"""
from datetime import date
from typing import Dict, List, Optional, Union

from django.conf import settings
from django.core.files.images import ImageFile
from wagtail.images.models import Image
from wagtail.rich_text import RichText

from apps.blog.models import BlogIndexPage, BlogPage, BlogPageGalleryImage


def get_default_image() -> Image:
    """
    Returns the default image to use for blog posts when no image is provided.
    By default, uses the site's favicon or a placeholder image.
    
    Returns:
        Wagtail Image instance
    """
    # Try to get the site favicon as default image
    try:
        # Look for an existing default image first
        default_image = Image.objects.filter(title="Default Blog Image").first()
        if default_image:
            return default_image
            
        # If no default image exists, try to use the favicon
        favicon_path = getattr(settings, 'FAVICON_PATH', None)
        if favicon_path:
            with open(favicon_path, 'rb') as f:
                image_file = ImageFile(f)
                default_image = Image(
                    title="Default Blog Image",
                    file=image_file,
                )
                default_image.save()
                return default_image
    except Exception as e:
        # If any error occurs, we'll fall back to a placeholder
        pass
        
    # If we can't find or create a default image, raise an error
    raise ValueError(
        "No default image available. Please provide at least one image for the blog post "
        "or configure a default image in settings."
    )


def create_blog_post(
    title: str,
    intro: str,
    body_content: List[Dict],
    publication_date: Optional[date] = None,
    parent_page=None,
    auto_publish: bool = True,
    gallery_images: Optional[List[Dict]] = None,
) -> BlogPage:
    """
    Create a new blog post programmatically.
    
    Args:
        title: The title of the blog post
        intro: Short introduction text
        body_content: List of StreamField blocks (paragraphs, images, HTML)
        publication_date: Publication date (defaults to today)
        parent_page: Parent page to add the blog post to (defaults to first BlogIndexPage)
        auto_publish: Whether to automatically publish the page
        gallery_images: List of dicts with 'image' and 'caption' keys
        
    Returns:
        The created BlogPage instance
    
    Example:
        ```python
        # Simple text post
        create_blog_post(
            title="API Created Post",
            intro="This post was created via API",
            body_content=[
                {"type": "paragraph", "value": "<p>First paragraph content</p>"},
                {"type": "paragraph", "value": "<p>Second paragraph with <b>bold</b> text</p>"},
            ]
        )
        
        # Post with HTML and image
        create_blog_post(
            title="Rich Content Post",
            intro="Post with various content types",
            body_content=[
                {"type": "paragraph", "value": "<p>Text content</p>"},
                {"type": "html", "value": "<div class='custom'>Custom HTML</div>"},
                {"type": "image", "value": 1}  # Image ID
            ]
        )
        ```
    """
    # Get default parent page if none provided
    if parent_page is None:
        parent_page = BlogIndexPage.objects.live().first()
        if not parent_page:
            raise ValueError("No blog index page found. Create one first.")
    
    # Use today's date if none provided
    if publication_date is None:
        publication_date = date.today()
    
    # Process body content into StreamField format
    processed_body = []
    for block in body_content:
        block_type = block.get("type")
        block_value = block.get("value")
        
        if block_type == "paragraph":
            # Convert string HTML to RichText object if needed
            if isinstance(block_value, str):
                processed_body.append(("paragraph", RichText(block_value)))
            else:
                processed_body.append(("paragraph", block_value))
        else:
            # Other block types (image, html) can be added directly
            processed_body.append((block_type, block_value))
    
    # Create the blog post
    blog_post = BlogPage(
        title=title,
        intro=intro,
        date=publication_date,
        body=processed_body,
    )
    
    # Add it as a child of the parent page
    parent_page.add_child(instance=blog_post)
    
    # Add gallery images if provided
    if gallery_images:
        for img_data in gallery_images:
            image = img_data.get("image")
            caption = img_data.get("caption", "")
            
            if image:
                BlogPageGalleryImage.objects.create(
                    page=blog_post,
                    image=image,
                    caption=caption
                )
    else:
        # If no gallery images were provided, add a default image
        try:
            default_image = get_default_image()
            BlogPageGalleryImage.objects.create(
                page=blog_post,
                image=default_image,
                caption="Default Image"
            )
        except ValueError as e:
            # If we can't get a default image and none was provided, raise an error
            raise ValueError(f"Image is mandatory for blog posts: {str(e)}")
    
    # Create a revision
    revision = blog_post.save_revision()
    
    # Publish if requested
    if auto_publish:
        revision.publish()
    
    return blog_post


def upload_image_for_blog(
    image_file: ImageFile, 
    title: str
) -> Image:
    """
    Upload an image to be used in blog posts.
    
    Args:
        image_file: Django ImageFile object
        title: Title for the image
        
    Returns:
        Wagtail Image instance
    """
    image = Image(
        title=title,
        file=image_file,
    )
    image.save()
    return image


def get_blog_post_by_slug(slug: str) -> Optional[BlogPage]:
    """
    Get a blog post by its slug.
    
    Args:
        slug: The URL slug of the blog post
        
    Returns:
        BlogPage instance or None if not found
    """
    try:
        return BlogPage.objects.get(slug=slug)
    except BlogPage.DoesNotExist:
        return None


def update_blog_post(
    blog_post: BlogPage,
    title: Optional[str] = None,
    intro: Optional[str] = None,
    body_content: Optional[List[Dict]] = None,
    publication_date: Optional[date] = None,
    auto_publish: bool = True,
) -> BlogPage:
    """
    Update an existing blog post.
    
    Args:
        blog_post: The BlogPage instance to update
        title: New title (if None, keeps existing)
        intro: New intro (if None, keeps existing)
        body_content: New body content (if None, keeps existing)
        publication_date: New publication date (if None, keeps existing)
        auto_publish: Whether to automatically publish the changes
        
    Returns:
        The updated BlogPage instance
    """
    if title is not None:
        blog_post.title = title
    
    if intro is not None:
        blog_post.intro = intro
    
    if publication_date is not None:
        blog_post.date = publication_date
    
    if body_content is not None:
        # Process body content into StreamField format
        processed_body = []
        for block in body_content:
            block_type = block.get("type")
            block_value = block.get("value")
            
            if block_type == "paragraph":
                # Convert string HTML to RichText object if needed
                if isinstance(block_value, str):
                    processed_body.append(("paragraph", RichText(block_value)))
                else:
                    processed_body.append(("paragraph", block_value))
            else:
                # Other block types (image, html) can be added directly
                processed_body.append((block_type, block_value))
        
        blog_post.body = processed_body
    
    # Create a revision
    revision = blog_post.save_revision()
    
    # Publish if requested
    if auto_publish:
        revision.publish()
    
    return blog_post
