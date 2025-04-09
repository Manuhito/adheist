import json
from datetime import datetime

from django.core.exceptions import ValidationError
from django.core.management.base import BaseCommand
from django.core.serializers.json import DjangoJSONEncoder
from wagtail.models import Page, Site

from apps.blog.models import BlogIndexPage


class Command(BaseCommand):
    help = "Creates the initial blog structure"

    def handle(self, **options):
        bootstrap_initial_content()


def bootstrap_initial_content():
    root_page = Page.objects.get(slug="root").specific
    print(f"Root page found: {root_page}")

    # Ensure we have a site configured
    sites = Site.objects.all()
    print(f"Current sites: {sites.count()}")
    
    if not sites.exists():
        try:
            print("Creating default Wagtail site...")
            site = Site.objects.create(
                hostname='localtest.me',
                port=8000,
                root_page=root_page,
                is_default_site=True
            )
            print(f"Default site created successfully: {site}")
        except Exception as e:
            print(f"Error creating site: {str(e)}")
    else:
        print(f"Using existing sites: {[f'{site.hostname}:{site.port}' for site in sites]}")

    if BlogIndexPage.objects.filter(slug="blog").exists():
        blog_index = BlogIndexPage.objects.filter(slug="blog")[0]
        print("Using existing blog index page...")
    else:
        print("Creating your blog index page...")
        blog_index = BlogIndexPage(
            slug="blog",
            title="Blog",
            intro="Welcome to our blog!",
        )
        root_page.add_child(instance=blog_index)
        blog_index.save()
        print("Blog index page created successfully at /blog")
