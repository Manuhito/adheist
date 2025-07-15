"""
Example spider for the scraper project.
"""
import logging
from scrapy.linkextractors import LinkExtractor
from scrapy.spiders import CrawlSpider, Rule

from .base_spider import BaseSpider
from apps.scraper.scrapy_project.items import ScrapedItemBase

logger = logging.getLogger(__name__)


class ExampleSpider(BaseSpider):
    """
    Example spider that demonstrates how to implement a spider.
    
    This spider crawls a website and extracts basic information from pages.
    It can be used as a template for implementing specific spiders.
    """
    name = 'example'
    
    # Rules for following links (only if using CrawlSpider as a base)
    # rules = (
    #     Rule(LinkExtractor(allow=r'item/\d+'), callback='parse_item'),
    #     Rule(LinkExtractor(allow=r'category/\d+'), follow=True),
    # )
    
    def parse(self, response):
        """
        Parse the response and extract data.
        
        Args:
            response: The response to parse
            
        Yields:
            ScrapedItemBase: The scraped data
        """
        self.logger.info(f"Parsing: {response.url}")
        
        # Extract basic information from the page
        title = response.css('title::text').get()
        h1 = response.css('h1::text').get()
        meta_description = response.css('meta[name="description"]::attr(content)').get()
        
        # Create an item with the extracted data
        item = ScrapedItemBase()
        item['url'] = response.url
        item['title'] = title
        item['content'] = h1
        item['metadata'] = {
            'meta_description': meta_description,
            'status': response.status,
            'headers': dict(response.headers),
        }
        item['timestamp'] = self.server_time()
        
        yield item
        
        # Follow links to other pages (optional)
        # for href in response.css('a::attr(href)').getall():
        #     yield response.follow(href, self.parse)
    
    def server_time(self):
        """
        Get the current server time in ISO format.
        
        Returns:
            str: The current time in ISO format
        """
        from django.utils import timezone
        return timezone.now().isoformat()
