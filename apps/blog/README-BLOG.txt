# quick launch -------------

after make init, open the /cms admin site and: 
- delete the existing root page
- delete the existing 'site' (/settings/site - open site and delete)
then run the command python manage.py bootstrap_blog

# Wagtail Blog Setup Instructions

This folder contains a simple blog implementation using Wagtail CMS. It provides a blog index page and individual blog posts with support for rich text content, images, and galleries.

## Features

- Blog index page with customizable intro text
- Blog posts with:
  - Title and publication date
  - Introduction/summary
  - Rich text content (paragraphs, images, HTML)
  - Optional image gallery with captions
- Automatic ordering of posts by publication date
- Built-in search functionality

## Installation

1. Copy the `blog` folder to your Django project's apps directory

2. Add the following dependencies to your requirements.txt:
   ```
   wagtail>=5.1
   ```

3. Add the required apps to your INSTALLED_APPS in settings.py:
   ```python
   INSTALLED_APPS = [
       'wagtail.core',
       'wagtail.admin',
       'wagtail.documents',
       'wagtail.snippets',
       'wagtail.users',
       'wagtail.images',
       'wagtail.embeds',
       'wagtail.search',
       'wagtail.sites',
       'wagtail',
       'modelcluster',
       'taggit',
       
       'apps.blog',  # our blog app
   ]
   ```

4. Add Wagtail's middleware to settings.py:
   ```python
   MIDDLEWARE = [
       # ... other middleware
       'wagtail.middleware.SiteMiddleware',
   ]
   ```

5. Add Wagtail URLs to your project's urls.py:
   ```python
   from django.urls import path, include
   from wagtail.admin import urls as wagtailadmin_urls
   from wagtail import urls as wagtail_urls

   urlpatterns = [
       path('cms/', include(wagtailadmin_urls)),
       path('', include(wagtail_urls)),
   ]
   ```

6. Run migrations:
   ```bash
   python manage.py migrate
   ```

7. Create a superuser to access the admin:
   ```bash
   python manage.py createsuperuser
   ```

8. Initialize the blog structure:
   ```bash
   python manage.py bootstrap_blog
   ```

## Usage

1. Access the Wagtail admin at `/cms`
2. The blog index will be available at `/blog`
3. To create a new blog post:
   - Go to `/cms`
   - Navigate to the "Blog" page
   - Click "Add child page"
   - Select "Blog page"
   - Fill in the required fields:
     - Title
     - Publication date
     - Introduction
     - Body content
     - Optional gallery images

## Structure

- `models.py`: Defines the blog structure (BlogIndexPage, BlogPage, and gallery images)
- `management/commands/bootstrap_blog.py`: Command to initialize the blog structure
- `migrations/`: Database migrations

## Customization

You can customize the blog by:
1. Modifying the templates in your project's templates directory:
   - `blog/blog_index_page.html`
   - `blog/blog_page.html`
2. Adding new fields to the models in `models.py`
3. Customizing the StreamField blocks in `models.py` to add new content types

## Notes

- The blog index page will be created at `/blog`
- Blog posts will be accessible at `/blog/post-slug`
- Images are handled by Wagtail's image management system
- All content can be edited through the Wagtail admin interface at `/cms`

## API Access

This blog implementation includes Wagtail API v2 support, allowing you to programmatically create and manage blog posts.

### REST API Endpoints

- Blog pages: `/api/v2/pages/?type=blog.BlogPage`
- Blog index: `/api/v2/pages/?type=blog.BlogIndexPage`
- Images: `/api/v2/images/`
- Documents: `/api/v2/documents/`

### Programmatic Creation

You can create blog posts programmatically using the provided utility functions in `api_utils.py`:

```python
from apps.blog.api_utils import create_blog_post

# Create a simple blog post
create_blog_post(
    title="API Created Post",
    intro="This post was created via API",
    body_content=[
        {"type": "paragraph", "value": "<p>First paragraph content</p>"},
        {"type": "paragraph", "value": "<p>Second paragraph with <b>bold</b> text</p>"},
    ]
)
```

See `examples.py` for more detailed examples of creating posts with images and other content types.
