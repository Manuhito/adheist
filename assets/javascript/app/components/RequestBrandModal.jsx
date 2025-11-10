import React, { useState, useEffect, useRef } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '../../components/ui/dialog.tsx';
import { Button } from '../../components/ui/button.tsx';
import { useTranslation } from '../../lib/useTranslation';

// Bars loading component
const Bars = ({ size = 64 }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={size}
    height={size}
    viewBox="0 0 24 24"
  >
    <title>Loading...</title>
    <style>{`
      .spinner-bar {
        animation: spinner-bars-animation .8s linear infinite;
        animation-delay: -.8s;
      }
      .spinner-bars-2 {
        animation-delay: -.65s;
      }
      .spinner-bars-3 {
        animation-delay: -0.5s;
      }
      @keyframes spinner-bars-animation {
        0% {
          y: 1px;
          height: 22px;
        }
        93.75% {
          y: 5px;
          height: 14px;
          opacity: 0.2;
        }
      }
    `}</style>
    <rect
      className="spinner-bar"
      x="1"
      y="1"
      width="6"
      height="22"
      fill="currentColor"
    />
    <rect
      className="spinner-bar spinner-bars-2"
      x="9"
      y="1"
      width="6"
      height="22"
      fill="currentColor"
    />
    <rect
      className="spinner-bar spinner-bars-3"
      x="17"
      y="1"
      width="6"
      height="22"
      fill="currentColor"
    />
  </svg>
);

/**
 * Modal para solicitar agregar una nueva marca a la biblioteca
 * @param {Object} props - Propiedades del componente
 * @param {boolean} props.isOpen - Estado de apertura del modal
 * @param {Function} props.onOpenChange - Función para cambiar el estado de apertura
 */
function RequestBrandModal({ isOpen, onOpenChange }) {
  const { t } = useTranslation();
  const [brandUrl, setBrandUrl] = useState('');
  const [requestStatus, setRequestStatus] = useState({ loading: false, success: false, error: null });
  const [urlError, setUrlError] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [backloadId, setBackloadId] = useState(null);
  const [pageId, setPageId] = useState(null);
  const eventSourceRef = useRef(null);

  // Function to get CSRF token from cookie
  const getCsrfToken = () => {
    const name = 'csrftoken';
    let cookieValue = null;
    if (document.cookie && document.cookie !== '') {
      const cookies = document.cookie.split(';');
      for (let i = 0; i < cookies.length; i++) {
        const cookie = cookies[i].trim();
        if (cookie.substring(0, name.length + 1) === (name + '=')) {
          cookieValue = decodeURIComponent(cookie.substring(name.length + 1));
          break;
        }
      }
    }
    return cookieValue;
  };

  // Function to validate the brand URL and return error message if invalid
  const validateBrandUrl = (url) => {
    if (!url.trim()) return null;
    
    try {
      const urlObj = new URL(url);
      
      // Check if base URL is facebook.com/ads/library/
      const isValidBase = (
        (urlObj.hostname === 'facebook.com' || urlObj.hostname === 'www.facebook.com') &&
        urlObj.pathname.startsWith('/ads/library/')
      );
      
      // Check if URL contains view_all_page_id parameter with a valid value
      const pageId = urlObj.searchParams.get('view_all_page_id');
      const hasValidPageId = pageId && pageId.trim() !== '';
      
      // If domain is wrong or view_all_page_id is missing/empty
      if (!isValidBase || !hasValidPageId) {
        return "Seems like the url you pasted is not formatted properly, please find it in the Facebook Ad Library, and copy the URL from the address bar";
      }
      
      // Check media_type parameter only if it's present in the URL
      if (urlObj.searchParams.has('media_type')) {
        const mediaType = urlObj.searchParams.get('media_type');
        if (mediaType === 'video' || mediaType === 'none') {
          return "Quick reminder, at the moment we will be pulling all images and memes ads for all advertisers. In the future we will be adding more formats";
        }
      }
      
      return null; // No error
    } catch (e) {
      return "Seems like the url you pasted is not formatted properly, please find it in the Facebook Ad Library, and copy the URL from the address bar";
    }
  };

  // Function to check if URL is valid (no errors)
  const isValidBrandUrl = (url) => {
    return validateBrandUrl(url) === null && url.trim() !== '';
  };
  
  // Validate URL on change
  const handleUrlChange = (e) => {
    const newUrl = e.target.value;
    setBrandUrl(newUrl);
    
    // Only show error if user has typed something
    if (newUrl.trim()) {
      const error = validateBrandUrl(newUrl);
      setUrlError(error);
    } else {
      setUrlError(null);
    }
  };

  // Setup SSE listener when processing starts
  useEffect(() => {
    if (!isProcessing || !backloadId) return;

    console.log('Setting up SSE listener for backload:', backloadId);
    const eventSource = new EventSource('/ads/sse/adrequest-updates/');
    eventSourceRef.current = eventSource;
    let isComponentMounted = true;

    eventSource.addEventListener('connected', (event) => {
      console.log('SSE connected:', event.data);
    });

    eventSource.addEventListener('backload_completed', (event) => {
      console.log('SSE backload_completed:', event.data);
      const data = JSON.parse(event.data);
      
      // Check if this is our backload AND component is still mounted
      if (data.backload_id === backloadId && isComponentMounted) {
        console.log('Our backload completed!');
        
        // Close SSE connection
        eventSource.close();
        eventSourceRef.current = null;
        
        // Check if there were processed ads
        if (data.processed_count > 0) {
          console.log(`Successfully processed ${data.processed_count} ads. Redirecting to discover page...`);
          // Redirect to discover page with company filter
          setTimeout(() => {
            window.location.href = `/ads/discover/?company=${data.page_id}`;
          }, 1000);
        } else {
          console.log('No ads were processed. Showing error message.');
          // Show error message to user
          setIsProcessing(false);
          setRequestStatus({ 
            loading: false, 
            success: false, 
            error: `We couldn't extract any ads for this advertiser. This might be because they don't have active image/meme ads in English, or there was an error during extraction. Please try again or contact support at hey@adheist.ai` 
          });
        }
      }
    });

    eventSource.onerror = (error) => {
      console.error('SSE error:', error);
      // Only handle error if component is still mounted
      if (isComponentMounted) {
        setIsProcessing(false);
        setRequestStatus({ 
          loading: false, 
          success: false, 
          error: 'Connection error. Please refresh the page and try again.' 
        });
      }
    };

    // Cleanup on unmount or when modal closes
    return () => {
      console.log('Cleaning up SSE connection');
      isComponentMounted = false;
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }
    };
  }, [isProcessing, backloadId]);

  // Function to handle brand request submission
  const handleBrandRequest = async () => {
    if (!brandUrl.trim() || !isValidBrandUrl(brandUrl)) return;
    
    setIsProcessing(true);
    setRequestStatus({ loading: true, success: false, error: null });
    
    try {
      const csrfToken = getCsrfToken();
      const response = await fetch('/ads/api/request-brand/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRFToken': csrfToken
        },
        body: JSON.stringify({ brand_url: brandUrl.trim() })
      });
      
      const data = await response.json();
      
      if (response.ok) {
        // Store backload_id and page_id to listen for completion
        setBackloadId(data.backload_id);
        setPageId(data.facebook_page_id);
        setRequestStatus({ loading: false, success: true, error: null });
        // Keep processing state to show loading and listen for SSE
      } else {
        setIsProcessing(false);
        setRequestStatus({ loading: false, success: false, error: data.error || 'An error occurred' });
      }
    } catch (error) {
      console.error('Error submitting brand request:', error);
      setIsProcessing(false);
      setRequestStatus({ loading: false, success: false, error: 'Network error. Please try again.' });
    }
  };

  const handleOpenChange = (open) => {
    if (!open) {
      // Cleanup SSE connection if open
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }
      // Reset form state when closing
      setBrandUrl('');
      setUrlError(null);
      setIsProcessing(false);
      setBackloadId(null);
      setPageId(null);
      setRequestStatus({ loading: false, success: false, error: null });
    }
    onOpenChange(open);
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent>
        {isProcessing ? (
          // Processing view
          <>
            <DialogHeader>
              <DialogTitle>Processing your request</DialogTitle>
            </DialogHeader>
            
            <div className="py-8 flex flex-col items-center justify-center space-y-4">
              <div className="text-primary">
                <Bars size={64} />
              </div>
              <p className="text-center text-muted-foreground">
                We are working on pulling your preferred advertiser ads for you. This action can take a few minutes.
              </p>
            </div>
          </>
        ) : (
          // Form view
          <>
            <DialogHeader>
              <DialogTitle>Request a new Advertiser</DialogTitle>
              <DialogDescription>
                Request a new Advertiser that's not in our library. We'll add it for you.
              </DialogDescription>
            </DialogHeader>
            
            <div className="py-4 space-y-4">
          {/* Input para la URL */}
          <div className="space-y-2">
            <label htmlFor="brand-url" className="text-sm font-medium text-foreground">
              Ad URL
            </label>
            <input
              id="brand-url"
              type="text"
              value={brandUrl}
              onChange={handleUrlChange}
              className="w-full px-3 py-2 border border-input bg-background rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
              placeholder="https://www.facebook.com/ads/library/..."
              disabled={requestStatus.loading || requestStatus.success}
            />
            {urlError && (
              <p className="text-xs text-red-600 dark:text-red-400">
                {urlError}
              </p>
            )}
            <p className="text-xs text-muted-foreground">
              To get an Advertiser's Ads, find it in the{' '}
              <a 
                href="https://www.facebook.com/ads/library/?active_status=all&ad_type=all&country=ALL&is_targeted_country=false&media_type=image_and_meme"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:text-primary/80 underline"
              >
                Facebook Ad Library
              </a>
              , and copy the URL from the address bar.
            </p>
          </div>
          
          {/* Important note */}
          <div className="p-3 bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-md">
            <p className="text-xs text-primary">
              <strong>Please note:</strong> at the moment, we are only pulling automatically ads that are images or memes, in English. If you have any special request, please contact us at{' '}
              <a 
                href="mailto:hey@adheist.ai"
                className="underline hover:opacity-80"
              >
                hey@adheist.ai
              </a>
              .
            </p>
          </div>
          
          {/* Status messages */}
          {requestStatus.error && (
            <div className="p-3 bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 rounded-md text-red-600 dark:text-red-400 text-sm">
              {requestStatus.error}
            </div>
          )}
          
          {requestStatus.success && (
            <div className="p-3 bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 rounded-md text-green-600 dark:text-green-400 text-sm">
              {t('request_brand.success', 'Your request has been submitted successfully. We will add this advertiser to our library soon.')}
            </div>
          )}
        </div>
        
            <DialogFooter>
              <Button 
                variant="outline" 
                onClick={() => handleOpenChange(false)}
                disabled={requestStatus.loading}
              >
                {t('common.cancel', 'Cancel')}
              </Button>
              <Button 
                onClick={handleBrandRequest}
                disabled={!isValidBrandUrl(brandUrl) || requestStatus.loading || requestStatus.success}
                loading={requestStatus.loading}
              >
                {t('request_brand.submit', 'Submit request')}
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

export default RequestBrandModal;
