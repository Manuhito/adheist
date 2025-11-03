import React, { useState, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { SimpleSelect, SimpleSelectItem } from '@/components/ui/simple-select';
import { User, ArrowLeft, Sparkles } from 'lucide-react';

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
 * Renders the header for the UGC Video page with back button, title, and Generate button.
 */
const UgcVideoHeader = () => {
  const handleBackClick = () => {
    window.location.href = '/ads/avatars/';
  };

  const handleGenerateClick = () => {
    if (window.handleUgcGenerate) {
      window.handleUgcGenerate();
    }
  };

  return (
    <div className="flex items-center gap-4">
      {/* Back Button - Circular gray background */}
      <button
        onClick={handleBackClick}
        className="flex items-center justify-center w-10 h-10 bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 rounded-full transition-colors"
      >
        <ArrowLeft className="w-5 h-5 text-gray-600 dark:text-gray-400" />
      </button>

      {/* Title and Description */}
      <div className="flex-1">
        <h1 className="text-xl font-semibold text-gray-900 dark:text-gray-100">UGC Video generate</h1>
        <p className="text-sm text-gray-600 dark:text-gray-400">Select the voice gender and avatar dialog</p>
      </div>

      {/* Generate Button */}
      <Button
        onClick={handleGenerateClick}
        className="bg-primary hover:bg-primary/90 text-white px-4 py-2 rounded-lg flex items-center gap-2"
      >
        <Sparkles className="w-4 h-4" />
        Generate
      </Button>
    </div>
  );
};

/**
 * Renders the main content for the UGC Video page, including avatar preview, text area, and gender selection.
 */
const UgcVideoPageContent = () => {
  // Load initial data from window
  const videoData = window.__UGC_VIDEO_DATA__ || null;
  
  const [textDialog, setTextDialog] = useState(videoData?.text_dialog || '');
  const [audioGender, setAudioGender] = useState(videoData?.audio_gender || '');
  const [avatarData, setAvatarData] = useState(videoData?.avatar_data || null);

  // Debounce timer for auto-save
  const debounceTimerRef = React.useRef(null);

  // Function to update UGC Video in backend
  const updateUgcVideo = async (updates) => {
    if (!videoData?.id) return;

    const csrftoken = getCookie('csrftoken');
    try {
      const response = await fetch(`/ads/api/update-ugc-video/${videoData.id}/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRFToken': csrftoken,
        },
        body: JSON.stringify(updates),
      });
      
      const data = await response.json();
      if (response.ok) {
        console.log('UGC Video updated:', data.updated_fields);
      } else {
        console.error('Error updating UGC video:', data.error);
      }
    } catch (error) {
      console.error('Failed to update UGC video:', error);
    }
  };

  // Auto-save text_dialog with debounce (500ms after user stops typing)
  useEffect(() => {
    if (!videoData?.id) return;

    // Clear existing timer
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    // Set new timer
    debounceTimerRef.current = setTimeout(() => {
      updateUgcVideo({ text_dialog: textDialog });
    }, 500);

    // Cleanup
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [textDialog]);

  // Auto-save audio_gender immediately when changed
  useEffect(() => {
    if (!videoData?.id) return;
    
    // Only update if audioGender has actually changed from initial value
    if (audioGender !== (videoData?.audio_gender || '')) {
      updateUgcVideo({ audio_gender: audioGender });
    }
  }, [audioGender]);

  // This effect exposes the `handleGenerate` function to the global scope.
  useEffect(() => {
    window.handleUgcGenerate = async () => {
      if (!videoData?.id) {
        console.error('No video ID available');
        return;
      }

      const csrftoken = getCookie('csrftoken');
      try {
        const response = await fetch('/ads/api/generate-ugc-video/', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-CSRFToken': csrftoken,
          },
          body: JSON.stringify({ 
            video_id: videoData.id
          }),
        });
        const data = await response.json();
        if (response.ok) {
          console.log('UGC Video generation task started:', data);
          console.log('Task ID:', data.task_id);
        } else {
          console.error('Error starting task:', data.error);
        }
      } catch (error) {
        console.error('Failed to call generate API:', error);
      }
    };

    return () => {
      delete window.handleUgcGenerate;
    };
  }, [videoData]);

  return (
    <div className="max-w-6xl mx-auto p-6">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Content Form - Left Column */}
        <div className="lg:col-span-2 space-y-6">
          {/* Text Dialog */}
          <div className="space-y-3">
            <Label htmlFor="text-dialog" className="text-base font-semibold text-primary">
              Avatar Dialog
            </Label>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Enter the text that the avatar will speak in the video
            </p>
            <Textarea
              id="text-dialog"
              value={textDialog}
              onChange={(e) => setTextDialog(e.target.value)}
              placeholder="Enter the script for your avatar to speak..."
              className="min-h-[200px] resize-none"
            />
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {textDialog.length} characters
            </p>
          </div>
          
          {/* Voice Gender Selection */}
          <div className="space-y-3">
            <Label className="text-base font-semibold text-primary">
              Voice Gender
            </Label>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Select the gender for the voice that will narrate the text
            </p>
            <SimpleSelect 
              value={audioGender} 
              onValueChange={setAudioGender}
              placeholder="Select voice gender"
            >
              <SimpleSelectItem value="MALE">Male Voice</SimpleSelectItem>
              <SimpleSelectItem value="FEMALE">Female Voice</SimpleSelectItem>
            </SimpleSelect>
          </div>
        </div>
        
        {/* Avatar Preview - Right Column */}
        <div className="lg:col-span-1">
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
            <h2 className="text-lg font-semibold mb-4 text-primary">
              Selected Avatar
            </h2>
            
            {avatarData ? (
              <div className="space-y-4">
                {/* Avatar Image */}
                <div className="aspect-[3/4] bg-gray-100 dark:bg-gray-800 rounded-lg overflow-hidden">
                  <img
                    src={avatarData.urls?.regular || avatarData.urls?.small}
                    alt={avatarData.alt_description || 'Avatar'}
                    className="w-full h-full object-cover"
                  />
                </div>
                
                {/* Avatar Info */}
                <div className="space-y-2">
                  {avatarData.alt_description && (
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {avatarData.alt_description}
                    </p>
                  )}
                  
                  {avatarData.user && (
                    <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
                      <User className="h-4 w-4" />
                      <span>Photo by {avatarData.user.name}</span>
                    </div>
                  )}
                  
                  {avatarData.width && avatarData.height && (
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {avatarData.width} × {avatarData.height} px
                    </p>
                  )}
                </div>
              </div>
            ) : (
              <div className="aspect-[3/4] bg-gray-100 dark:bg-gray-800 rounded-lg flex items-center justify-center">
                <p className="text-gray-500 dark:text-gray-400 text-sm">
                  No avatar selected
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
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
