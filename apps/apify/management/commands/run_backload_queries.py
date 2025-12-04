"""
Django management command to run queries on Backload objects.

This command allows running queries on one or more Backload objects by their IDs,
replicating the functionality of the "Run Query" button in the admin interface.
"""

import logging
from django.core.management.base import BaseCommand, CommandError
from django.utils import timezone
from apps.apify.models import Backload
from apps.apify.tasks import fetch_apify_ads

logger = logging.getLogger(__name__)


class Command(BaseCommand):
    help = "Run queries on one or more Backload objects by their IDs"

    def add_arguments(self, parser):
        parser.add_argument(
            "backload_ids",
            nargs="+",
            type=int,
            help="IDs of the Backload objects to run queries on",
        )

    def handle(self, *args, **options):
        backload_ids = options["backload_ids"]
        self.stdout.write(f"Running queries for Backload IDs: {', '.join(map(str, backload_ids))}")

        for backload_id in backload_ids:
            try:
                self._run_backload_query(backload_id)
            except Exception as e:
                self.stderr.write(
                    self.style.ERROR(f"Error running query for Backload ID {backload_id}: {str(e)}")
                )

    def _run_backload_query(self, backload_id):
        """
        Run a query for a specific Backload object.
        
        Args:
            backload_id: ID of the Backload object to run query on
        """
        try:
            # Get the Backload object
            obj = Backload.objects.get(pk=backload_id)
        except Backload.DoesNotExist:
            raise CommandError(f"Backload with ID {backload_id} does not exist")

        # Get active pages
        active_pages = obj.pages.filter(is_active=True)
        
        if not active_pages.exists():
            self.stderr.write(
                self.style.WARNING(f"No active pages selected for Backload ID {backload_id}, skipping")
            )
            return

        # Set status to pending before starting execution
        obj.status = Backload.STATUS_PENDING
        obj.save(update_fields=['status'])
        
        # Prepare arguments for the command
        output_dir = f"meta_ads_results_{obj._meta.model_name}_{obj.pk}"
        
        # Update last_run and status
        obj.last_run = timezone.now()
        obj.save(update_fields=['last_run'])
        
        # Update execution information
        obj.output_file = output_dir
        obj.save(update_fields=['output_file'])
        
        # Launch a Celery task for each page
        tasks_launched = 0
        for page in active_pages:
            # Build the URL for this specific page
            url = obj.get_facebook_ads_url_for_page(page.page_id)
            
            # Execute the Celery task in the background for this page
            fetch_apify_ads.delay(
                output_dir=f"{output_dir}_{page.page_id}",
                urls=[{'url': url}],
                page_id=page.page_id,
                backload_id=obj.pk,
                limit_per_source=1000
            )
            tasks_launched += 1
        
        self.stdout.write(
            self.style.SUCCESS(
                f"Launched {tasks_launched} query tasks for Backload ID {backload_id}. "
                f"Results will be saved in {output_dir}_[page_id]"
            )
        )
