import json
import os
from django.core.management.base import BaseCommand, CommandError
from django.conf import settings
from apify_client import ApifyClient
from datetime import datetime, date

class Command(BaseCommand):
    help = 'Fetch ads from Apify API and save results to a JSON file'

    def add_arguments(self, parser):
        parser.add_argument(
            '--keyword',
            default='',
            help='Keyword to search for ads'
        )
        parser.add_argument(
            '--country',
            default='ALL ',
            help='Country to filter ads'
        )
        parser.add_argument(
            '--maxitems',
            type=int,
            default=40,
            help='Maximum number of items to fetch'
        )
        parser.add_argument(
            '--start-date',
            default='2018-05-09',
            help='Start date for ads in YYYY-MM-DD format'
        )
        parser.add_argument(
            '--end-date',
            default=None,
            help='End date for ads in YYYY-MM-DD format (default: today)'
        )
        parser.add_argument(
            '--output',
            default=None,
            help='Output file path (default: apify_ads_YYYY-MM-DD.json in project root)'
        )

    def handle(self, *args, **options):
        # Get command line arguments
        keyword = options['keyword']
        country = options['country']
        maxitems = options['maxitems']
        start_date = options['start-date']
        end_date = options['end-date'] or date.today().strftime('%Y-%m-%d')
        output_path = options['output']

        # Set default output path if not provided
        if not output_path:
            timestamp = datetime.now().strftime('%Y-%m-%d_%H-%M-%S')
            
            # Create apify-files directory if it doesn't exist
            apify_dir = os.path.join(settings.BASE_DIR, 'apify-files')
            if not os.path.exists(apify_dir):
                os.makedirs(apify_dir)
                
            output_path = os.path.join(
                apify_dir,
                f'apify_ads_{keyword}_{timestamp}.json'
            )

        self.stdout.write(self.style.SUCCESS(f'Fetching ads with keyword: {keyword}'))
        self.stdout.write(self.style.SUCCESS(f'Date range: {start_date} to {end_date}'))
        self.stdout.write(self.style.SUCCESS(f'Max items: {maxitems}'))

        try:
            # Initialize the ApifyClient with your API token
            client = ApifyClient("apify_api_bkPXUknHPidJPzmgMlox4GCs5hHOGz0aCMl0")

            # Prepare the Actor input
            run_input = {
                "keyword": keyword,
                "country_name": country,
                "active_status": "all",
                "ad_type": "all",
                "media_type": "image",
                "publisher_platforms": "all",
                "start_date_min": start_date,
                "start_date_max": end_date,
                "maxitems": maxitems,
            }

            self.stdout.write(self.style.SUCCESS('Calling Apify API...'))
            
            # Run the Actor and wait for it to finish
            run = client.actor("KpvfEqrLeYfLLtgai").call(run_input=run_input)

            # Fetch Actor results from the run's dataset
            self.stdout.write(self.style.SUCCESS('Fetching results...'))
            
            results = []
            for item in client.dataset(run["defaultDatasetId"]).iterate_items():
                results.append(item)
            
            self.stdout.write(self.style.SUCCESS(f'Fetched {len(results)} ads'))

            # Process results to ensure JSON compatibility
            for item in results:
                # Handle ad_text field which often contains unescaped quotes
                if 'ad_text' in item and isinstance(item['ad_text'], str):
                    # Use json.dumps to properly escape the string
                    escaped_text = json.dumps(item['ad_text'])[1:-1]  # Remove outer quotes
                    item['ad_text'] = escaped_text

            # Save results to JSON file
            with open(output_path, 'w', encoding='utf-8') as f:
                json.dump(results, f, ensure_ascii=False, indent=2)
            
            self.stdout.write(self.style.SUCCESS(f'Results saved to {output_path}'))
            
        except Exception as e:
            raise CommandError(f'Error fetching ads from Apify: {str(e)}')
