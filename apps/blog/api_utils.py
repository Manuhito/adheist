"""
Utility functions for programmatically creating and managing blog posts via the Wagtail API.
"""
import json
import os
import requests
from datetime import date
from typing import Dict, List, Optional, Union, Any

from django.conf import settings
from django.core.files.images import ImageFile
from wagtail.images.models import Image
from wagtail.rich_text import RichText

from apps.blog.models import BlogIndexPage, BlogPage, BlogPageGalleryImage


# Función get_default_image eliminada - Ya no se utiliza
# La UI ahora muestra una imagen por defecto para posts sin imágenes


def create_blog_post(
    title: str,
    intro: str,
    body_content: List[Dict],
    publication_date: Optional[date] = None,
    parent_page=None,
    auto_publish: bool = True,
    gallery_images: Optional[List[Dict]] = None,
    post_id: Optional[str] = None,
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
        post_id: Optional ID from the external API to store for reference
        
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
        post_id=post_id,
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
    # No añadir imagen por defecto, la UI se encargará de mostrar una imagen por defecto cuando sea necesario
    # else:
    #     # If no gallery images were provided, add a default image
    #     try:
    #         default_image = get_default_image()
    #         BlogPageGalleryImage.objects.create(
    #             page=blog_post,
    #             image=default_image,
    #             caption="Default Image"
    #         )
    #     except ValueError as e:
    #         # If we can't get a default image and none was provided, raise an error
    #         raise ValueError(f"Image is mandatory for blog posts: {str(e)}")
    
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


def fetch_posts_from_api() -> List[Dict[str, Any]]:
    """
    Fetch blog posts from the external CMS API.
    
    Returns:
        List of blog post data dictionaries from the API
    
    Raises:
        Exception: If API request fails or response is invalid
    """
    import logging
    logger = logging.getLogger(__name__)
    
    # Importamos aquí para evitar importaciones circulares
    try:
        from apps.blog.models import BlogApiConfig
        
        # Intentar obtener la configuración
        config = BlogApiConfig.get_solo()
        logger.info(f"Found BlogApiConfig: {config is not None}")
        
        # Si hay configuración, usar esos valores
        if config:
            endpoint = config.api_endpoint
            api_key = config.api_key
            logger.info(f"Using API endpoint from config: {endpoint}")
        else:
            # Como fallback, intentar usar variables de entorno
            endpoint = os.environ.get('CMS_BLOG_ENDPOINT')
            api_key = os.environ.get('CMS_BLOG_KEY')
            logger.info(f"Using API endpoint from environment: {endpoint}")
            
            if not endpoint or not api_key:
                error_msg = "No hay configuración de API y las variables de entorno CMS_BLOG_ENDPOINT y CMS_BLOG_KEY no están configuradas"
                logger.error(error_msg)
                raise ValueError(error_msg)
    except Exception as e:
        logger.error(f"Error al obtener la configuración de la API: {str(e)}")
        raise
    
    headers = {
        'x-api-key': api_key
    }
    
    try:
        response = requests.get(endpoint, headers=headers)
        response.raise_for_status()  # Raise exception for 4XX/5XX responses
        
        # Parse JSON response
        posts_data = response.json()
        
        # Validate response is a list
        if not isinstance(posts_data, list):
            raise ValueError(f"Expected a list of posts, got {type(posts_data)}")
            
        return posts_data
    
    except requests.RequestException as e:
        raise Exception(f"API request failed: {str(e)}")
    except json.JSONDecodeError:
        raise Exception("Invalid JSON response from API")


def import_posts_from_api(max_posts: int = None) -> List[BlogPage]:
    """
    Import blog posts from the external CMS API and create them in the system.
    
    Args:
        max_posts: Maximum number of posts to import (None for all)
        
    Returns:
        List of created BlogPage instances
    """
    # Fetch posts from API
    posts_data = fetch_posts_from_api()
    
    # Limit number of posts if specified
    if max_posts is not None:
        posts_data = posts_data[:max_posts]
    
    created_posts = []
    
    # Find the blog index page to add posts to
    blog_index = None
    try:
        from apps.blog.models import BlogIndexPage
        blog_index = BlogIndexPage.objects.live().first()
        if not blog_index:
            print("No blog index page found. Cannot import posts.")
            return []
    except Exception as e:
        print(f"Error finding blog index page: {e}")
        return []
    
    # Process each post
    for post_data in posts_data:
        try:
            # Extract required fields from the API response
            title = post_data.get('title')
            if not title:
                print("Skipping post: missing title")
                continue
                
            # Extract post_id from API
            post_id = post_data.get('id')
            if post_id:
                print(f"Processing post with ID: {post_id}")
            else:
                print(f"Warning: Post '{title}' has no ID in API response")
                
            # Get intro/excerpt (limited to 250 chars)
            intro = post_data.get('excerpt', '')
            
            # If excerpt is empty, generate one from the content
            if not intro:
                content_text = post_data.get('content', '')
                if content_text:
                    # Remove basic HTML tags to get plain text
                    import re
                    clean_content = re.sub(r'<[^>]+>', '', content_text)
                    # Use the first 250 characters as intro
                    intro = clean_content[:250].strip()
                    print(f"Generating intro from content for '{title}': {intro[:50]}...")
                
            # If we still don't have an intro, use the title as fallback
            if not intro:
                intro = f"Article about {title}"
                print(f"Using title as intro for '{title}'")
            
            # Limit to 250 characters
            intro = intro[:250]
            
            # Get content
            content = post_data.get('content', '')
            if not content:
                print(f"Skipping post '{title}': missing content")
                continue
            
            # Create a simple slug if not provided
            slug = post_data.get('slug')
            if not slug:
                slug = title.lower().replace(' ', '-')[:30]
            
            # Parse publication date if available
            publication_date = None
            date_str = post_data.get('date')
            if date_str:
                try:
                    from datetime import datetime
                    # Try common date formats
                    for fmt in ['%Y-%m-%d', '%Y-%m-%dT%H:%M:%S', '%Y-%m-%d %H:%M:%S']:
                        try:
                            dt = datetime.strptime(date_str, fmt)
                            publication_date = dt.date()
                            break
                        except ValueError:
                            continue
                except Exception as e:
                    print(f"Error parsing date '{date_str}': {e}")
            
            # Create body content with intro as paragraph and content as raw HTML
            body_content = [
                {
                    "type": "paragraph",
                    "value": f"<p>{intro}</p>"
                },
                {
                    "type": "html",
                    "value": content  # Usar el HTML tal cual, sin envolverlo en <p>
                },
            ]
            
            # Check if the post has a cover image in the API response
            post_image = None
            cover_image_url = post_data.get('coverImage')
            
            if cover_image_url:
                # If we have a cover image URL, try to download it
                try:
                    print(f"Downloading cover image from {cover_image_url}")
                    response = requests.get(cover_image_url, stream=True)
                    if response.status_code == 200:
                        # Create a unique name based on the post title
                        image_name = f"{slug}.jpg"
                        image_title = f"Cover for {title[:30]}"
                        
                        # Create and save the image
                        from django.core.files.base import ContentFile
                        image_content = ContentFile(response.content, name=image_name)
                        post_image = upload_image_for_blog(image_content, image_title)
                        print(f"Successfully downloaded cover image for '{title}'")
                except Exception as e:
                    print(f"Failed to download cover image: {e}")
                    post_image = None
            
            # If no cover image or download failed, use the app logo
            if not post_image:
                try:
                    print(f"Using app logo for post '{title}'")
                    logo_path = "static/images/web/logo-adheist.png"
                    
                    # Create a unique title for this instance of the logo
                    image_title = f"Logo for {title[:30]}"
                    
                    # Open and upload the logo file
                    from django.core.files.images import ImageFile
                    with open(logo_path, "rb") as f:
                        post_image = upload_image_for_blog(ImageFile(f), image_title)
                    print(f"Successfully used app logo for '{title}'")
                except Exception as e:
                    print(f"Error using app logo: {e}")
                    # If we can't use the app logo, we can't create the post
                    raise e
            
            # Debug the image object
            print(f"Image object type: {type(post_image)}")
            print(f"Image object ID: {post_image.id if post_image else 'None'}")
            
            # We do not add the image to the body content directly, as it will be included in the gallery images.
            
            # Check if a post with this post_id already exists
            existing_post = None
            if post_id:
                from apps.blog.models import BlogPage
                try:
                    existing_post = BlogPage.objects.filter(post_id=post_id).first()
                    if existing_post:
                        print(f"Post with ID {post_id} already exists. Updating instead of creating new.")
                except Exception as e:
                    print(f"Error searching for existing post: {e}")
            
            # Update or create the post
            try:
                if existing_post:
                    # Update existing post
                    post = update_blog_post(
                        blog_post=existing_post,
                        title=title,
                        intro=intro,
                        body_content=body_content,
                        publication_date=publication_date,
                        auto_publish=True
                    )
                    
                    # Update gallery image if it exists
                    from apps.blog.models import BlogPageGalleryImage
                    # Delete existing images
                    BlogPageGalleryImage.objects.filter(page=post).delete()
                    # Add new image
                    if post_image:
                        BlogPageGalleryImage.objects.create(
                            page=post,
                            image=post_image,
                            caption=f"Featured image for {title}"
                        )
                else:
                    # Create new post
                    post = create_blog_post(
                        title=title,
                        intro=intro,
                        body_content=body_content,
                        publication_date=publication_date,
                        parent_page=blog_index,
                        auto_publish=True,
                        post_id=post_id,
                        # No gallery_images parameter
                    )
                    
                    # Add gallery image
                    from apps.blog.models import BlogPageGalleryImage
                    if post_image:
                        BlogPageGalleryImage.objects.create(
                            page=post,
                            image=post_image,
                            caption=f"Featured image for {title}"
                        )
                
                action = "Updated" if existing_post else "Created"
                print(f"{action} blog post '{title}' with ID {post_id}")
            except Exception as e:
                print(f"Error creating blog post: {e}")
                # Try alternative approach
                print("Trying alternative approach...")
                
                # Create the blog post with gallery images parameter
                post = create_blog_post(
                    title=title,
                    intro=intro,
                    body_content=body_content,
                    publication_date=publication_date,
                    parent_page=blog_index,
                    auto_publish=True,
                    post_id=post_id,
                    gallery_images=[{
                        "image": post_image,
                        "caption": f"Featured image for {title}"
                    }]
                )
            
            created_posts.append(post)
            print(f"Created blog post: {post.title} (ID: {post.id})")
            
        except Exception as e:
            print(f"Error processing post: {e}")
    
    return created_posts
