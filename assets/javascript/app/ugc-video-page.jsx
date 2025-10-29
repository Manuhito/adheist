import React, { useState, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import { Button } from '@/components/ui/button';

/**
 * Gets a cookie value by name. Essential for Django CSRF protection.
 * @param {string} name The name of the cookie to retrieve.
 * @returns {string|null} The cookie value or null if not found.
 */
function getCookie(name) {
  if (document.cookie && document.cookie !== '') {
    const cookies = document.cookie.split(';');
    for (let i = 0; i < cookies.length; i++) {
      const cookie = cookies[i].trim();
      if (cookie.substring(0, name.length + 1) === `${name}=`) {
        return decodeURIComponent(cookie.substring(name.length + 1));
      }
    }
  }
  return null;
}

/**
 * Renders the header for the UGC Video page, containing the 'Generate' button.
 */
const UgcVideoHeader = () => (
  <div className="flex items-center justify-end w-full">
    <Button onClick={() => window.handleUgcGenerate?.()}>Generate</Button>
  </div>
);

/**
 * Renders the main content for the UGC Video page, including the text area.
 */
const UgcVideoPageContent = () => {
  const [promptText, setPromptText] = useState('');

  // This effect exposes the `handleGenerate` function to the global scope.
  // It's a pattern used in this app to allow communication between the
  // dynamically injected header and the page content.
  useEffect(() => {
    window.handleUgcGenerate = async () => {
      const csrftoken = getCookie('csrftoken');
      try {
        const response = await fetch('/ads/api/generate-ugc-video/', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-CSRFToken': csrftoken,
          },
          body: JSON.stringify({ text: promptText }),
        });
        const data = await response.json();
        if (response.ok) {
          console.log('Task started:', data);
        } else {
          console.error('Error starting task:', data);
        }
      } catch (error) {
        console.error('Failed to call generate API:', error);
      }
    };

    // Cleanup function to remove the global function on unmount.
    return () => {
      delete window.handleUgcGenerate;
    };
  }, [promptText]); // The dependency on `promptText` is crucial to ensure the function always has the latest state.

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">UGC Video Idea</h1>
      <textarea
        value={promptText}
        onChange={(e) => setPromptText(e.target.value)}
        placeholder="Enter your idea for the UGC video..."
        className="w-full p-2 border rounded-md min-h-[200px] bg-background text-foreground"
      />
    </div>
  );
};

/**
 * This function waits for the main application layout to signal it's ready,
 * then injects the page-specific header and content.
 */
function mountPage() {
  if (window.sidebarLayoutReady) {
    window.setAppHeader(<UgcVideoHeader />);
    const contentContainer = document.getElementById('sidebar-page-content');
    if (contentContainer) {
      createRoot(contentContainer).render(<UgcVideoPageContent />);
    }
  } else {
    // If the layout isn't ready, wait and try again.
    setTimeout(mountPage, 100);
  }
}

document.addEventListener('DOMContentLoaded', mountPage);
