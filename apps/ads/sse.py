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
    print(f"[SSE] Redis connection established to {settings.REDIS_URL}")
except Exception as e:
    print(f"[SSE] Failed to connect to Redis: {str(e)}")
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
            print("[SSE] Redis client is not available")
            return HttpResponse("Redis connection error", status=500)
            
        user_id = request.user.id
        channel = f"user:{user_id}:adrequest_updates"
        print(f"[SSE] SSE request received for user {user_id}, channel: {channel}")
        
        def event_stream():
            try:
                # Connect to Redis
                print(f"[SSE] Creating pubsub connection for channel {channel}")
                pubsub = redis_client.pubsub()
                
                # Subscribe to the user-specific channel
                pubsub.subscribe(channel)
                print(f"[SSE] Subscribed to channel {channel}")
                
                # Send initial connection established event
                print("[SSE] Sending initial connection event")
                yield f"event: connected\ndata: {json.dumps({'connected': True})}\n\n"
                
                # Counter for keep-alive messages
                keep_alive_counter = 0
                
                # Listen for messages
                while True:
                    try:
                        message = pubsub.get_message(ignore_subscribe_messages=True, timeout=0.1)
                        if message and message['type'] == 'message':
                            data = message['data'].decode('utf-8')
                            print(f"[SSE] Received message: {data[:100]}...")
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
                        print(f"[SSE] Redis error during message retrieval: {str(re)}")
                        yield f"event: error\ndata: {json.dumps({'error': f'Redis error: {str(re)}'})}\n\n"
                        time.sleep(1)  # Wait a bit before retrying
                    except Exception as e:
                        print(f"[SSE] Error during message processing: {str(e)}\n{traceback.format_exc()}")
                        yield f"event: error\ndata: {json.dumps({'error': str(e)})}\n\n"
                        time.sleep(1)  # Wait a bit before retrying
            except Exception as e:
                # Log the error with traceback
                print(f"[SSE] SSE stream error: {str(e)}\n{traceback.format_exc()}")
                yield f"event: error\ndata: {json.dumps({'error': str(e)})}\n\n"
            finally:
                # Clean up subscription
                try:
                    print(f"[SSE] Cleaning up subscription for channel {channel}")
                    pubsub.unsubscribe(channel)
                    pubsub.close()
                except Exception as e:
                    print(f"[SSE] Error during cleanup: {str(e)}")
        
        # Create streaming response with appropriate headers
        print("[SSE] Creating StreamingHttpResponse")
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
        # Log any unexpected errors
        print(f"[SSE] Unexpected error in SSE view: {str(e)}\n{traceback.format_exc()}")
        return HttpResponse(f"Server error: {str(e)}", status=500)
