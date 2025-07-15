"""
Models for the scraper app.
"""
from django.db import models
from django.utils import timezone
from django.utils.translation import gettext_lazy as _

from apps.meta.models import FacebookPage


class FacebookAdsScraper(models.Model):
    """
    Facebook Ads Library scraper configuration and execution.
    """
    # Configuration fields
    name = models.CharField(
        _("Name"),
        max_length=255,
        help_text=_("Name of this scraper configuration")
    )
    active = models.BooleanField(
        _("Active"),
        default=True,
        help_text=_("Whether this configuration is active")
    )
    pages = models.ManyToManyField(
        FacebookPage,
        related_name='scrapers',
        verbose_name=_("Facebook Pages"),
        help_text=_("Facebook pages to scrape ads from")
    )
    ad_type = models.CharField(
        _("Ad Type"),
        max_length=25,
        default="all",
        choices=[
            ("all", "All"),
            ("political_and_issue_ads", "Political & Issue Ads"),
        ],
        help_text=_("Type of ads to scrape")
    )
    active_status = models.CharField(
        _("Active Status"),
        max_length=20,
        default="active",
        choices=[
            ("active", "Active"),
            ("inactive", "Inactive"),
            ("all", "All"),
        ],
        help_text=_("Status of ads to scrape")
    )
    
    # Execution fields
    last_run_status = models.CharField(
        _("Last Run Status"),
        max_length=20,
        choices=[
            ('never', _('Never Run')),
            ('pending', _('Pending')),
            ('running', _('Running')),
            ('completed', _('Completed')),
            ('failed', _('Failed')),
        ],
        default='never',
        help_text=_("Status of the last execution")
    )
    last_run_time = models.DateTimeField(
        _("Last Run Time"),
        null=True,
        blank=True,
        help_text=_("When this scraper was last run")
    )
    last_run_error = models.TextField(
        _("Last Run Error"),
        blank=True,
        null=True,
        help_text=_("Error message from the last run, if any")
    )

    class Meta:
        verbose_name = _("Facebook Ads Scraper")
        verbose_name_plural = _("Facebook Ads Scrapers")

    def __str__(self):
        return self.name
    
    def run(self):
        """
        Run this scraper.
        
        Updates the status and schedules the Celery task.
        """
        from .tasks_facebook import run_facebook_ads_scraper
        
        # Update status
        self.last_run_status = 'pending'
        self.last_run_time = timezone.now()
        self.last_run_error = None
        self.save()
        
        # Run the task asynchronously
        run_facebook_ads_scraper.delay(scraper_id=self.id)
        
        return True
