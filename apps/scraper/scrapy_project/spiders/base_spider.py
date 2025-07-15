"""
Base spider class for the scraper project.
"""
import logging
from scrapy import Spider
from scrapy.http import Request
from django.utils import timezone

from apps.scraper.models import ScraperTarget, ScraperRun

logger = logging.getLogger(__name__)


class BaseSpider(Spider):
    """
    Base spider class with common functionality.
    
    This spider provides common functionality for all spiders in the project,
    including Django integration and logging.
    """
    name = 'base'
    
    def __init__(self, target_id=None, run_id=None, *args, **kwargs):
        """
        Initialize the spider.
        
        Args:
            target_id: ID of the ScraperTarget to scrape
            run_id: ID of the ScraperRun for this execution
            *args: Variable length argument list
            **kwargs: Arbitrary keyword arguments
        """
        super(BaseSpider, self).__init__(*args, **kwargs)
        self.target_id = target_id
        self.run_id = run_id
        self.start_urls = []
        
        # Load target from database if target_id is provided
        if target_id:
            try:
                target = ScraperTarget.objects.get(id=target_id)
                self.target = target
                self.start_urls = [target.url]
                logger.info(f"Initialized spider for target: {target.name} ({target.url})")
            except ScraperTarget.DoesNotExist:
                logger.error(f"Target with ID {target_id} does not exist")
    
    def start_requests(self):
        """
        Start the requests.
        
        This method is called by Scrapy when the spider is opened.
        It yields the initial requests to crawl.
        
        Yields:
            Request: The initial requests to crawl
        """
        for url in self.start_urls:
            yield Request(url=url, callback=self.parse)
    
    def parse(self, response):
        """
        Parse the response.
        
        This method should be overridden by subclasses to extract data from the response.
        
        Args:
            response: The response to parse
            
        Yields:
            dict: The scraped data
        """
        # This method should be overridden by subclasses
        self.logger.warning("BaseSpider.parse() method was called, but it should be overridden by subclasses")
        yield {
            'url': response.url,
            'status': response.status,
            'timestamp': timezone.now().isoformat(),
        }
    
    def closed(self, reason):
        """
        Called when the spider is closed.
        
        Args:
            reason: The reason why the spider was closed
        """
        logger.info(f"Spider closed: {reason}")
        
        # Update the run status if we have a run_id
        if hasattr(self, 'run_id') and self.run_id:
            try:
                run = ScraperRun.objects.get(id=self.run_id)
                
                # Only update if it's still running (might have been updated by the pipeline)
                if run.status == 'running':
                    if reason == 'finished':
                        run.status = 'completed'
                    else:
                        run.status = 'failed'
                        run.error_message = f"Spider closed: {reason}"
                    
                    run.end_time = timezone.now()
                    run.save()
                    
                    logger.info(f"Updated run {run.id} status to {run.status}")
                    
            except ScraperRun.DoesNotExist:
                logger.error(f"Run with ID {self.run_id} does not exist")
            except Exception as e:
                logger.exception(f"Error updating run status: {e}")
