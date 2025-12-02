import React, { useEffect, useRef, useState } from 'react';
import { Target, RefreshCcw, Brain } from 'lucide-react';
import Mascot from './Mascot';

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
  const MASCOT_MESSAGES = [
    'Okay, let me get to work!',
    'This will just take a minute…',
    "Here’s how Ad heist works and what's happening right now",
  ];

  const [mascotMessageIndex, setMascotMessageIndex] = useState(0);

  useEffect(() => {
    const timeouts = [];

    // After 3s, show second message
    timeouts.push(
      setTimeout(() => {
        setMascotMessageIndex(1);
      }, 3000)
    );

    // After 6s, show third message and keep it
    timeouts.push(
      setTimeout(() => {
        setMascotMessageIndex(2);
      }, 6000)
    );

    return () => {
      timeouts.forEach((id) => clearTimeout(id));
    };
  }, []);

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
    <div className="relative flex flex-col items-center justify-center h-full w-full px-4 animate-in fade-in duration-500">
      <div className="flex flex-col items-center gap-8 w-full max-w-4xl text-center">
        {/* Text */}
        <div className="space-y-2">
          <h1 className="text-3xl sm:text-4xl font-semibold text-foreground">
            That&apos;s awesome!
          </h1>
          <p className="text-sm sm:text-base text-muted-foreground">
            Let us show what you can achieve with AdHeist by your side
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 w-full mt-2">
          <div className="flex flex-col items-center gap-3 rounded-xl border bg-card p-5 text-center">
            <Target className="w-7 h-7 text-primary" />
            <div className="space-y-1">
              <h3 className="font-semibold text-foreground text-center">Reverse-engineering</h3>
              <p className="text-sm text-muted-foreground text-center">
                Our AI reviews the ad’s structure, message, style, and the psychology behind them to see why it might succeed.
              </p>
            </div>
          </div>

          <div className="flex flex-col items-center gap-3 rounded-xl border bg-card p-5 text-center">
            <RefreshCcw className="w-7 h-7 text-primary" />
            <div className="space-y-1">
              <h3 className="font-semibold text-foreground text-center">Re-applying success</h3>
              <p className="text-sm text-muted-foreground text-center">
                Our system identifies the strongest elements that drive conversions and creates a structure to use these theme on your brand instead.
              </p>
            </div>
          </div>

          <div className="flex flex-col items-center gap-3 rounded-xl border bg-card p-5 text-center">
            <div className="flex items-center justify-center">
              <Brain className="w-7 h-7 text-primary" />
            </div>
            <div className="space-y-1">
              <h3 className="font-semibold text-foreground text-center">Smart variations</h3>
              <p className="text-sm text-muted-foreground text-center">
                You’ll get 3 fresh ad concepts—each with unique themes designed to outperform the original.
              </p>
            </div>
          </div>
        </div>

        {/* Loading spinner */}
        <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin mt-4"></div>
      </div>

      <Mascot message={MASCOT_MESSAGES[mascotMessageIndex]} />
    </div>
  );
};

export default OnboardingLoadingPage;
