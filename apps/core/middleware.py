import time
import logging
import json
from django.urls import resolve

logger = logging.getLogger('apps.performance')

class RequestTimingMiddleware:
    """Middleware to time the full request/response cycle including all middleware and view execution."""
    
    def __init__(self, get_response):
        self.get_response = get_response
        
    def __call__(self, request):
        # Start timing
        start_time = time.time()
        
        # Process the request (including all subsequent middleware and the view)
        response = self.get_response(request)
        
        # Calculate total time
        total_time = time.time() - start_time
        
        # Only log specific URL patterns we care about
        path = request.path_info
        if '/ads/adrequest/' in path and '/get/' in path:
            # Try to extract the request ID
            try:
                resolved = resolve(path)
                request_id = resolved.kwargs.get('pk', 'unknown')
            except:
                request_id = 'unknown'
            
            # Create timing data
            timing_data = {
                'total_middleware_time': total_time,
                'path': path,
                'request_id': request_id,
                'method': request.method,
                'status_code': response.status_code,
            }
            
            # Log the timing data
            logger.info(f"request_timing: {json.dumps(timing_data)}")
            
            # Add timing header for debugging
            response['X-Request-Timing'] = f"{total_time:.6f}s"
            
        return response
