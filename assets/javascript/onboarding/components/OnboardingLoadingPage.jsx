import React, { useEffect, useRef } from 'react';
import { Sparkles } from 'lucide-react';

// SSE Event Handler hook - similar to GeneratingLoadingPage
function useSSEListener(onEvent) {
  const eventSourceRef = useRef(null);

  useEffect(() => {
    // Create EventSource connection to the SSE endpoint
    const eventSource = new EventSource('/ads/sse/adrequest-updates/');
    eventSourceRef.current = eventSource;

    // Connection opened
    eventSource.addEventListener('connected', (event) => {
      console.log('SSE connected:', event.data);
      onEvent('connected', JSON.parse(event.data));
    });

    // Status change events
    eventSource.addEventListener('status_change', (event) => {
      console.log('SSE status_change:', event.data);
      onEvent('status_change', JSON.parse(event.data));
    });

    // Completion events
    eventSource.addEventListener('completion', (event) => {
      console.log('SSE completion:', event.data);
      onEvent('completion', JSON.parse(event.data));
    });

    // Error handling
    eventSource.onerror = (error) => {
      console.error('SSE error:', error);
      setTimeout(() => {
        if (eventSourceRef.current) {
          eventSourceRef.current.close();
          eventSourceRef.current = null;
        }
      }, 5000);
    };

    // Cleanup on component unmount
    return () => {
      console.log('Cleaning up SSE connection');
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }
    };
  }, [onEvent]);

  return eventSourceRef.current;
}

const OnboardingLoadingPage = ({ adRequestId }) => {
  // Handle SSE events
  const handleSSEEvent = (eventType, data) => {
    console.log('Received SSE event:', eventType, data);

    // Only process events for our specific AdRequest
    if (data.ad_request_id && adRequestId && data.ad_request_id === parseInt(adRequestId)) {
      console.log('Event matches our AdRequest ID:', adRequestId);

      if (eventType === 'status_change') {
        console.log('Status changed to:', data.new_status);

        // If status changed to COMPLETED, redirect to versions page
        if (data.new_status === 'COMPLETED') {
          console.log('AdRequest completed! Redirecting to versions page...');
          setTimeout(() => {
            window.location.href = `/ads/adrequest/${data.ad_request_id}/versions/`;
          }, 1500);
        }
      } else if (eventType === 'completion') {
        console.log('Completion event received! Redirecting to versions page...');
        setTimeout(() => {
          window.location.href = `/ads/adrequest/${data.ad_request_id}/versions/`;
        }, 1500);
      }
    }
  };

  // Set up SSE listener
  useSSEListener(handleSSEEvent);

  return (
    <div className="flex flex-col items-center justify-center h-full w-full animate-in fade-in duration-500">
      <div className="flex flex-col items-center gap-8">
        {/* Sparkles Animation */}
        <div className="relative">
          <Sparkles className="w-16 h-16 text-primary animate-pulse" />
        </div>

        {/* Text */}
        <div className="text-center max-w-md">
          <h1 className="text-xl font-semibold text-primary mb-3">
            Generating your first ad...
          </h1>
          <p className="text-sm text-muted-foreground">
            Our AI is crafting high-performing ads tailored to your brand.
          </p>
        </div>

        {/* Loading spinner */}
        <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin"></div>
      </div>
    </div>
  );
};

export default OnboardingLoadingPage;
