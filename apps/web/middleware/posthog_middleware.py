"""
PostHog Tracking Middleware

This middleware automatically tracks page views for all Django views.
"""
import re
from django.conf import settings

class PostHogTrackingMiddleware:
    """
    Middleware that automatically tracks page views in PostHog.
    
    Add this to your MIDDLEWARE setting in settings.py:
    
    MIDDLEWARE = [
        # ... other middleware
        'apps.web.middleware.posthog_middleware.PostHogTrackingMiddleware',
    ]
    """
    
    def __init__(self, get_response):
        self.get_response = get_response
        # Paths to exclude from automatic tracking
        self.exclude_paths = [
            r'^/static/',
            r'^/media/',
            r'^/admin/',
            r'^/api/',
            r'^/favicon\.ico$',
            r'^/robots\.txt$',
        ]
        
    def __call__(self, request):
        # Process the request
        response = self.get_response(request)
        
        # Only track successful page views (status code 200)
        if response.status_code == 200 and not self._should_exclude(request.path):
            self._track_page_view(request)
            
        return response
    
    def _should_exclude(self, path):
        """Check if the path should be excluded from tracking"""
        for pattern in self.exclude_paths:
            if re.match(pattern, path):
                return True
        return False
    
    def _track_page_view(self, request):
        """Track page view in PostHog"""
        # Only execute this code if PostHog is available in the template context
        # This code will be injected into the template via context processor
        request.posthog_tracking = {
            'event': 'page_view',
            'properties': {
                'path': request.path,
                'url': request.build_absolute_uri(),
                'referrer': request.META.get('HTTP_REFERER', ''),
            }
        }
