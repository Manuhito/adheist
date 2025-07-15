"""
Scrapy pipelines for the scraper project.
"""
import logging
from django.utils import timezone
from scrapy import signals
from scrapy.exceptions import DropItem

from apps.scraper.models import ScraperRun, ScrapedItem
from .items import ScrapedItemBase, DjangoScrapedItem

logger = logging.getLogger(__name__)


class DjangoPipeline:
    """
    Pipeline for saving scraped items to Django models.
    
    This pipeline saves scraped items to the database using Django models.
    It also updates the run status when the spider is closed.
    """
    
    def __init__(self):
        """Initialize the pipeline."""
        self.items_processed = 0
        self.run = None
    
    @classmethod
    def from_crawler(cls, crawler):
        """
        Create a new instance from a crawler.
        
        Args:
            crawler: The crawler
            
        Returns:
            DjangoPipeline: A new instance
        """
        pipeline = cls()
        crawler.signals.connect(pipeline.spider_opened, signal=signals.spider_opened)
        crawler.signals.connect(pipeline.spider_closed, signal=signals.spider_closed)
        return pipeline
    
    def spider_opened(self, spider):
        """
        Called when the spider is opened.
        
        Args:
            spider: The spider
        """
        logger.info(f"Spider opened: {spider.name}")
        
        # Get the run if run_id is provided
        if hasattr(spider, 'run_id') and spider.run_id:
            try:
                self.run = ScraperRun.objects.get(id=spider.run_id)
                logger.info(f"Found run {self.run.id} for spider {spider.name}")
            except ScraperRun.DoesNotExist:
                logger.error(f"Run with ID {spider.run_id} does not exist")
    
    def process_item(self, item, spider):
        """
        Process a scraped item.
        
        Args:
            item: The scraped item
            spider: The spider
            
        Returns:
            item: The processed item
            
        Raises:
            DropItem: If the item should be dropped
        """
        # Check if we have a run
        if not self.run:
            logger.warning(f"No run found for spider {spider.name}, skipping item")
            raise DropItem("No run found")
        
        # Check if the item is valid
        if not isinstance(item, (ScrapedItemBase, DjangoScrapedItem)):
            logger.warning(f"Invalid item type: {type(item)}")
            raise DropItem("Invalid item type")
        
        try:
            # Create a ScrapedItem
            scraped_item = ScrapedItem(
                run=self.run,
                url=item.get('url', ''),
                title=item.get('title', ''),
                content=item.get('content', ''),
                metadata=item.get('metadata', {})
            )
            scraped_item.save()
            
            # Increment the counter
            self.items_processed += 1
            
            # Update the run item count
            self.run.item_count = self.items_processed
            self.run.save(update_fields=['item_count'])
            
            logger.debug(f"Saved item {scraped_item.id} from {scraped_item.url}")
            
            return item
            
        except Exception as e:
            logger.exception(f"Error saving item: {e}")
            raise DropItem(f"Error saving item: {e}")
    
    def spider_closed(self, spider, reason):
        """
        Called when the spider is closed.
        
        Args:
            spider: The spider
            reason: The reason why the spider was closed
        """
        logger.info(f"Spider closed: {spider.name} - {reason}")
        
        # Update the run status if we have a run
        if self.run:
            try:
                # Only update if it's still running
                if self.run.status == 'running':
                    if reason == 'finished':
                        self.run.status = 'completed'
                    else:
                        self.run.status = 'failed'
                        self.run.error_message = f"Spider closed: {reason}"
                    
                    self.run.end_time = timezone.now()
                    self.run.save()
                    
                    logger.info(f"Updated run {self.run.id} status to {self.run.status}")
                    
            except Exception as e:
                logger.exception(f"Error updating run status: {e}")
