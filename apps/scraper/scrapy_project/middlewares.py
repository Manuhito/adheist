"""
Scrapy middlewares for the scraper project.
"""
import logging
from scrapy import signals
from scrapy.exceptions import IgnoreRequest
from scrapy.http import Response
from django.utils import timezone

logger = logging.getLogger(__name__)


class ScraperSpiderMiddleware:
    """Spider middleware for the scraper project."""
    
    @classmethod
    def from_crawler(cls, crawler):
        """
        Create a new instance from a crawler.
        
        Args:
            crawler: The crawler
            
        Returns:
            ScraperSpiderMiddleware: A new instance
        """
        middleware = cls()
        crawler.signals.connect(middleware.spider_opened, signal=signals.spider_opened)
        crawler.signals.connect(middleware.spider_closed, signal=signals.spider_closed)
        return middleware
    
    def process_spider_input(self, response, spider):
        """
        Process spider input.
        
        Args:
            response: The response
            spider: The spider
            
        Returns:
            None: Continue processing this response
            or raise an exception to stop processing
        """
        return None
    
    def process_spider_output(self, response, result, spider):
        """
        Process spider output.
        
        Args:
            response: The response
            result: The result
            spider: The spider
            
        Returns:
            Generator: The processed result
        """
        for item in result:
            yield item
    
    def process_spider_exception(self, response, exception, spider):
        """
        Process spider exception.
        
        Args:
            response: The response
            exception: The exception
            spider: The spider
            
        Returns:
            None: Continue processing this exception
            or an iterable with Response or Item objects
        """
        logger.error(f"Spider exception in {spider.name}: {exception}")
        return None
    
    def spider_opened(self, spider):
        """
        Called when the spider is opened.
        
        Args:
            spider: The spider
        """
        logger.info(f"Spider opened: {spider.name}")
    
    def spider_closed(self, spider, reason):
        """
        Called when the spider is closed.
        
        Args:
            spider: The spider
            reason: The reason
        """
        logger.info(f"Spider closed: {spider.name} - {reason}")


class ScraperDownloaderMiddleware:
    """Downloader middleware for the scraper project."""
    
    @classmethod
    def from_crawler(cls, crawler):
        """
        Create a new instance from a crawler.
        
        Args:
            crawler: The crawler
            
        Returns:
            ScraperDownloaderMiddleware: A new instance
        """
        middleware = cls()
        crawler.signals.connect(middleware.spider_opened, signal=signals.spider_opened)
        return middleware
    
    def process_request(self, request, spider):
        """
        Process a request.
        
        Args:
            request: The request
            spider: The spider
            
        Returns:
            None: Continue processing this request
            or Response object: Stop process_request and process_response chain
            or IgnoreRequest: Stop process_request chain
        """
        # Add a timestamp to the request
        request.meta['timestamp'] = timezone.now().isoformat()
        return None
    
    def process_response(self, request, response, spider):
        """
        Process a response.
        
        Args:
            request: The request
            response: The response
            spider: The spider
            
        Returns:
            Response: The response
            or Request object: Restart process_request chain
            or IgnoreRequest: Stop process_response chain
        """
        # Log response status
        if response.status >= 400:
            logger.warning(f"Error response {response.status} for {request.url}")
        
        return response
    
    def process_exception(self, request, exception, spider):
        """
        Process an exception.
        
        Args:
            request: The request
            exception: The exception
            spider: The spider
            
        Returns:
            None: Continue processing this exception
            or Response object: Stop process_exception chain
            or Request object: Restart process_request chain
        """
        logger.error(f"Download exception for {request.url}: {exception}")
        return None
    
    def spider_opened(self, spider):
        """
        Called when the spider is opened.
        
        Args:
            spider: The spider
        """
        logger.info(f"Spider opened: {spider.name}")
