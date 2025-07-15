"""
Scrapy items for the scraper project.
"""
import scrapy
from scrapy_djangoitem import DjangoItem

from apps.scraper.models import ScrapedItem


class ScrapedItemBase(scrapy.Item):
    """
    Base item for scraped data.
    
    This item defines the fields for scraped data.
    """
    
    url = scrapy.Field()
    title = scrapy.Field()
    content = scrapy.Field()
    metadata = scrapy.Field()
    timestamp = scrapy.Field()


class DjangoScrapedItem(DjangoItem):
    """
    Django item for scraped data.
    
    This item is linked to the ScrapedItem model.
    """
    
    django_model = ScrapedItem
