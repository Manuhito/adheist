"""
Scraper app for web scraping using Scrapy and Celery.
"""

# Import tasks to make them available to Celery
from .tasks_facebook import run_facebook_ads_scraper
