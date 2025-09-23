import React, { useEffect, useRef } from 'react';
import { Sparkles } from 'lucide-react';

// SSE Event Handler hook - similar to ad-requests.tsx
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
      // Try to reconnect after a delay
      setTimeout(() => {
        if (eventSourceRef.current) {
          eventSourceRef.current.close();
          eventSourceRef.current = null;
        }
        // The browser will automatically attempt to reconnect
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

const GeneratingLoadingPage = ({ adRequestId }) => {
  // Handle SSE events
  const handleSSEEvent = (eventType, data) => {
    console.log('Received SSE event:', eventType, data);
    
    // Only process events for our specific AdRequest
    if (data.ad_request_id && adRequestId && data.ad_request_id === parseInt(adRequestId)) {
      console.log('Event matches our AdRequest ID:', adRequestId);
      
      if (eventType === 'status_change') {
        console.log('Status changed to:', data.new_status);
        
        // If status changed to COMPLETED, redirect to generated ad page
        if (data.new_status === 'COMPLETED') {
          console.log('AdRequest completed! Redirecting to generated ad page...');
          // Small delay to let user see the completion
          setTimeout(() => {
            // Get the latest version ID from the data if available, otherwise construct URL with adRequestId
            if (data.version_id) {
              window.location.href = `/ads/generated/${data.version_id}/`;
            } else {
              // Fallback: redirect to my ads page if we don't have version_id
              window.location.href = '/ads/my-ads/';
            }
          }, 1500);
        }
      } else if (eventType === 'completion') {
        console.log('Completion event received! Redirecting to generated ad page...');
        // Small delay to let user see the completion
        setTimeout(() => {
          // Get the latest version ID from the data if available, otherwise fallback
          if (data.version_id) {
            window.location.href = `/ads/generated/${data.version_id}/`;
          } else {
            // Fallback: redirect to my ads page if we don't have version_id
            window.location.href = '/ads/my-ads/';
          }
        }, 1500);
      }
    }
  };
  
  // Set up SSE listener
  useSSEListener(handleSSEEvent);

  return (
    <div className="flex flex-col items-center justify-between min-h-[calc(100vh-4rem)] bg-white py-16">
      {/* Sparkles Animation */}
      <div className="relative">
        <div className="flex items-center justify-center w-24 h-16">
          {/* Main sparkle - center-left */}
          <Sparkles className="w-20 h-20 text-blue-500 animate-pulse" />
        </div>
      </div>

      {/* Text Container */}
      <div className="text-center max-w-md">
        {/* Main text */}
        <h1 className="text-xl font-semibold text-primary mb-4">
          Generating scroll-stopping ads...
        </h1>
        
        {/* Subtitle */}
        <p className="text-sm text-gray-400">
          Our AI is crafting high-performing ads tailored to your brand and optimized for results.
        </p>
      </div>

      {/* Loading spinner */}
      <div className="w-8 h-8 border-4 border-blue-200 border-t-blue-500 rounded-full animate-spin"></div>
    </div>
  );
};

export default GeneratingLoadingPage;
