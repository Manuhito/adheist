"""
Scrapy settings for the scraper project.
"""
import os
import sys

# Configure Python path to find the Django project
project_path = os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))
if project_path not in sys.path:
    sys.path.insert(0, project_path)

# Configure Django settings
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'adheist.settings')

# Import Django and set up the environment
import django
django.setup()

# Scrapy settings
BOT_NAME = 'adheist_scraper'

SPIDER_MODULES = ['apps.scraper.scrapy_project.spiders']
NEWSPIDER_MODULE = 'apps.scraper.scrapy_project.spiders'

# Obey robots.txt rules
ROBOTSTXT_OBEY = True

# Configure maximum concurrent requests
CONCURRENT_REQUESTS = 16
CONCURRENT_REQUESTS_PER_DOMAIN = 8

# Configure a delay for requests (in seconds)
DOWNLOAD_DELAY = 1

# Disable cookies
COOKIES_ENABLED = False

# Configure user agent
USER_AGENT = 'AdHeist Scraper (+https://adheist.ai)'

# Configure item pipelines
ITEM_PIPELINES = {
    'apps.scraper.scrapy_project.pipelines.DjangoPipeline': 300,
}

# Enable and configure logging
LOG_LEVEL = 'INFO'

# Enable and configure HTTP caching
HTTPCACHE_ENABLED = True
HTTPCACHE_EXPIRATION_SECS = 86400  # 24 hours
HTTPCACHE_DIR = 'httpcache'
HTTPCACHE_IGNORE_HTTP_CODES = [404, 500, 502, 503, 504]
