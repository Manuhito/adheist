"""
PostHog Utilities for Django

Provides helper functions for tracking events in PostHog from Django views.
"""

def track_event(request, event_name, properties=None):
    """
    Track an event in PostHog from a Django view
    
    Usage:
        from apps.web.utils.posthog_utils import track_event
        
        def my_view(request):
            # Process view logic
            track_event(request, 'Button Clicked', {'button_name': 'signup'})
    
    Args:
        request: The Django request object
        event_name: Name of the event to track
        properties: Optional dictionary of properties to include with the event
    """
    # This function returns the code to be executed in the view
    # It doesn't actually execute the PostHog tracking itself
    
    if not properties:
        properties = {}
    
    # Add common properties
    properties.update({
        '$current_url': request.build_absolute_uri(),
        'path': request.path,
    })
    
    # For authenticated users, use their email as identifier
    if request.user.is_authenticated:
        return f"""
        posthog.capture(
            '{request.user.email}',
            event='{event_name}',
            properties={properties}
        )
        """
    else:
        # For anonymous users, use distinct_id
        return f"""
        posthog.capture(
            request.session.session_key or 'anonymous_user',
            event='{event_name}',
            properties={properties}
        )
        """

# Common tracking functions
def track_page_view(request, page_name, properties=None):
    """Track page view event"""
    if not properties:
        properties = {}
    properties.update({
        'page_name': page_name,
    })
    return track_event(request, 'Page View', properties)

def track_button_click(request, button_name, properties=None):
    """Track button click event"""
    if not properties:
        properties = {}
    properties.update({
        'button_name': button_name,
    })
    return track_event(request, 'Button Clicked', properties)

def track_form_submission(request, form_name, properties=None):
    """Track form submission event"""
    if not properties:
        properties = {}
    properties.update({
        'form_name': form_name,
    })
    return track_event(request, 'Form Submitted', properties)

def track_feature_usage(request, feature_name, properties=None):
    """Track feature usage event"""
    if not properties:
        properties = {}
    properties.update({
        'feature_name': feature_name,
    })
    return track_event(request, 'Feature Used', properties)
