import json
import time
import redis
import traceback
from django.conf import settings
from django.http import StreamingHttpResponse, HttpResponse
from django.contrib.auth.decorators import login_required

# Initialize Redis client with exception handling
try:
    redis_client = redis.from_url(settings.REDIS_URL)
except Exception as e:
    redis_client = None

@login_required
def sse_adrequest_updates(request):
    """
    Server-Sent Events endpoint for AdRequest status updates.
    Subscribes to a Redis channel specific to the current user.
    """
    try:
        # Check if Redis client is available
        if redis_client is None:
            return HttpResponse("Redis connection error", status=500)
            
        user_id = request.user.id
        channel = f"user:{user_id}:adrequest_updates"
        
        def event_stream():
            try:
                # Connect to Redis
                pubsub = redis_client.pubsub()
                
                # Subscribe to the user-specific channel
                pubsub.subscribe(channel)
                
                # Send initial connection established event
                yield f"event: connected\ndata: {json.dumps({'connected': True})}\n\n"
                
                # Counter for keep-alive messages
                keep_alive_counter = 0
                
                # Listen for messages
                while True:
                    try:
                        message = pubsub.get_message(ignore_subscribe_messages=True, timeout=0.1)
                        if message and message['type'] == 'message':
                            data = message['data'].decode('utf-8')
                            # Format as SSE event
                            event_data = json.loads(data)
                            event_type = event_data.get('type', 'message')
                            yield f"event: {event_type}\ndata: {data}\n\n"
                        
                        # Increment counter and send keep-alive every ~5 seconds
                        keep_alive_counter += 1
                        if keep_alive_counter >= 50:  # 50 * 0.1s = ~5s
                            yield ": keepalive\n\n"
                            keep_alive_counter = 0
                        
                        # Small sleep to prevent CPU spinning
                        time.sleep(0.1)
                    except redis.RedisError as re:
                        yield f"event: error\ndata: {json.dumps({'error': f'Redis error: {str(re)}'})}\n\n"
                        time.sleep(1)  # Wait a bit before retrying
                    except Exception as e:
                        yield f"event: error\ndata: {json.dumps({'error': str(e)})}\n\n"
                        time.sleep(1)  # Wait a bit before retrying
            except Exception as e:
                # Handle stream error
                yield f"event: error\ndata: {json.dumps({'error': str(e)})}\n\n"
            finally:
                # Clean up subscription
                try:
                    # Clean up subscription
                    pubsub.unsubscribe(channel)
                    pubsub.close()
                except Exception as e:
                    pass  # Ignore cleanup errors
        
        # Create streaming response with appropriate headers
        response = StreamingHttpResponse(
            event_stream(),
            content_type='text/event-stream'
        )
        
        # Add headers to prevent caching
        response['Cache-Control'] = 'no-cache'
        response['X-Accel-Buffering'] = 'no'  # For Nginx
        # No podemos usar 'Connection': 'keep-alive' en WSGI
        
        return response
    except Exception as e:
        # Handle unexpected errors
        return HttpResponse(f"Server error: {str(e)}", status=500)
