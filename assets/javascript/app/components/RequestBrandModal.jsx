import React, { useState, useEffect, useRef } from 'react';
import { createRoot } from 'react-dom/client';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '../../components/ui/dialog.tsx';
import { Button } from '../../components/ui/button.tsx';
import { Alert } from '../../components/ui/alert.tsx';
import { AlertCircle, X } from 'lucide-react';
import { useTranslation } from '../../lib/useTranslation';

const SEARCH_DURATION_MS = 5 * 60 * 1000; // 5 minutes
const SAVE_DURATION_MS = 5 * 60 * 1000;   // 5 minutes

const RequestBrandProgressAlert = ({ phase, progress, canClose, onClose, pageId, hasAds }) => {
  let message = '';

  if (phase === 'searching') {
    message = 'Searching ads for the requested advertiser';
  } else if (phase === 'saving') {
    message = 'Saving the ads we found';
  } else if (phase === 'done') {
    if (hasAds) {
      message = 'The ads are now available';
    } else {
      message = "We couldn't extract any ads for this advertiser.";
    }
  }

  if (!message) return null;

  return (
    <div className="fixed bottom-6 right-6 z-50 w-[380px] animate-in fade-in slide-in-from-bottom-5">
      <Alert
        layout="row"
        isNotification
        variant="info"
        icon={
          <AlertCircle
            className="text-blue-500"
            size={16}
            strokeWidth={2}
          />
        }
        action={
          canClose ? (
            <button
              className="group -my-1.5 -me-2 size-8 p-0 hover:bg-transparent"
              aria-label="Close notification"
              onClick={onClose}
            >
              <X
                size={16}
                strokeWidth={2}
                className="opacity-60 transition-opacity group-hover:opacity-100"
              />
            </button>
          ) : null
        }
      >
        <div className="flex flex-col w-full">
          <p className="text-sm mb-2">{message}</p>
          {phase === 'done' && hasAds && pageId && (
            <div className="mt-1 flex justify-end">
              <button
                type="button"
                className="text-xs font-medium text-blue-600 hover:text-blue-700 underline"
                onClick={() => {
                  window.location.href = `/ads/discover/?company=${pageId}`;
                }}
              >
                Go to discover
              </button>
            </div>
          )}
          <div className="mt-2 h-1 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
            <div
              className="h-full bg-blue-500 transition-all ease-linear"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      </Alert>
    </div>
  );
};

/**
 * Modal para solicitar agregar una nueva marca a la biblioteca
 * @param {Object} props - Propiedades del componente
 * @param {boolean} props.isOpen - Estado de apertura del modal
 * @param {Function} props.onOpenChange - Función para cambiar el estado de apertura
 * @param {Function} [props.onRequestStateChange] - Callback opcional para indicar si hay una request en progreso
 */
function RequestBrandModal({ isOpen, onOpenChange, onRequestStateChange }) {
  const { t } = useTranslation();
  const [brandUrl, setBrandUrl] = useState('');
  const [requestStatus, setRequestStatus] = useState({ loading: false, success: false, error: null });
  const [urlError, setUrlError] = useState(null);
  const [pageId, setPageId] = useState(null);
  const [backloadId, setBackloadId] = useState(null);
  const [hasProcessedAds, setHasProcessedAds] = useState(false);

  const [progressPhase, setProgressPhase] = useState('idle'); // 'idle' | 'searching' | 'saving' | 'done'
  const [progressValue, setProgressValue] = useState(0);
  const [isProgressVisible, setIsProgressVisible] = useState(false);
  const [canCloseProgress, setCanCloseProgress] = useState(false);
  const eventSourceRef = useRef(null);
  const progressContainerRef = useRef(null);
  const progressRootRef = useRef(null);

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

  // Progress handling via SSE events from Apify / Backload
  useEffect(() => {
    if (!isProgressVisible || !backloadId) {
      return;
    }

    const eventSource = new EventSource('/ads/sse/adrequest-updates/');
    eventSourceRef.current = eventSource;
    let isComponentMounted = true;

    eventSource.addEventListener('backload_fetch_completed', (event) => {
      if (!isComponentMounted) return;
      try {
        const data = JSON.parse(event.data);
        if (data.backload_id === backloadId) {
          setProgressPhase('saving');
          setProgressValue(50);
        }
      } catch (e) {
        // Ignore parse errors for unrelated events
      }
    });

    eventSource.addEventListener('backload_completed', (event) => {
      if (!isComponentMounted) return;
      try {
        const data = JSON.parse(event.data);
        if (data.backload_id === backloadId) {
          eventSource.close();
          eventSourceRef.current = null;

          if (data.processed_count && data.processed_count > 0) {
            setHasProcessedAds(true);
            if (data.page_id) {
              setPageId(data.page_id);
            }
            setProgressPhase('done');
            setProgressValue(100);
            setCanCloseProgress(true);
            if (onRequestStateChange) {
              onRequestStateChange(false);
            }
          } else {
            setHasProcessedAds(false);
            setProgressPhase('done');
            setProgressValue(100);
            setCanCloseProgress(true);
            setRequestStatus({
              loading: false,
              success: false,
              error: "We couldn't extract any ads for this advertiser. This might be because they don't have active image/meme ads in English, or there was an error during extraction. Please try again or contact support at hey@adheist.ai"
            });
            if (onRequestStateChange) {
              onRequestStateChange(false);
            }
          }
        }
      } catch (e) {
        // Ignore parse errors for unrelated events
      }
    });

    eventSource.onerror = () => {
      if (!isComponentMounted) return;
      eventSource.close();
      eventSourceRef.current = null;
      setIsProgressVisible(false);
      setProgressPhase('idle');
      setProgressValue(0);
      setCanCloseProgress(false);
      setRequestStatus({
        loading: false,
        success: false,
        error: 'Connection error. Please refresh the page and try again.'
      });
      if (onRequestStateChange) {
        onRequestStateChange(false);
      }
    };

    return () => {
      isComponentMounted = false;
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }
    };
  }, [isProgressVisible, backloadId, onRequestStateChange]);

  // Render the progress alert globally so it is not tied to the modal lifecycle
  useEffect(() => {
    if (!isProgressVisible) {
      if (progressRootRef.current && progressContainerRef.current) {
        progressRootRef.current.unmount();
        if (progressContainerRef.current.parentNode) {
          progressContainerRef.current.parentNode.removeChild(progressContainerRef.current);
        }
      }
      progressRootRef.current = null;
      progressContainerRef.current = null;
      return;
    }

    if (!progressContainerRef.current) {
      const container = document.createElement('div');
      container.id = 'request-brand-progress-container';
      document.body.appendChild(container);
      progressContainerRef.current = container;
      progressRootRef.current = createRoot(container);
    }

    if (progressRootRef.current && progressContainerRef.current) {
      progressRootRef.current.render(
        <RequestBrandProgressAlert
          phase={progressPhase}
          progress={progressValue}
          canClose={canCloseProgress}
          onClose={handleProgressClose}
          pageId={pageId}
          hasAds={hasProcessedAds}
        />
      );
    }
  }, [isProgressVisible, progressPhase, progressValue, canCloseProgress, pageId, hasProcessedAds]);

  // Smooth progress animation within each phase so the bar keeps moving while waiting for SSE events
  useEffect(() => {
    if (!isProgressVisible) {
      return;
    }

    if (progressPhase !== 'searching' && progressPhase !== 'saving') {
      return;
    }

    const duration = progressPhase === 'searching' ? SEARCH_DURATION_MS : SAVE_DURATION_MS;
    const minValue = progressPhase === 'searching' ? 0 : 50;
    const maxValue = progressPhase === 'searching' ? 45 : 95;
    const startTime = Date.now();

    const intervalId = window.setInterval(() => {
      setProgressValue((prev) => {
        if (prev >= maxValue) {
          return prev;
        }
        const elapsed = Date.now() - startTime;
        const fraction = Math.min(1, elapsed / duration);
        const next = minValue + (maxValue - minValue) * fraction;
        const rounded = Math.round(next);
        return rounded > prev ? rounded : prev;
      });
    }, 1000);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [isProgressVisible, progressPhase]);

  // Function to handle brand request submission
  const handleBrandRequest = async () => {
    if (!brandUrl.trim() || !isValidBrandUrl(brandUrl)) return;

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
        setPageId(data.facebook_page_id);
        setBackloadId(data.backload_id);
        setRequestStatus({ loading: false, success: true, error: null });

        // Start progress tracking and notify parent that a request is in progress
        setIsProgressVisible(true);
        setProgressPhase('searching');
        if (onRequestStateChange) {
          onRequestStateChange(true);
        }
        onOpenChange(false);
      } else {
        setRequestStatus({ loading: false, success: false, error: data.error || 'An error occurred' });
      }
    } catch (error) {
      console.error('Error submitting brand request:', error);
      setRequestStatus({ loading: false, success: false, error: 'Network error. Please try again.' });
    }
  };

  const handleProgressClose = () => {
    setIsProgressVisible(false);
    setProgressPhase('idle');
    setProgressValue(0);
    setCanCloseProgress(false);
  };

  const handleOpenChange = (open) => {
    if (!open) {
      // Reset form state when closing
      setBrandUrl('');
      setUrlError(null);
      setPageId(null);
      setRequestStatus({ loading: false, success: false, error: null });
    }
    onOpenChange(open);
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent>
        {/* Form view */}
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
                disabled={requestStatus.loading || progressPhase !== 'idle'}
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
              disabled={!isValidBrandUrl(brandUrl) || requestStatus.loading || progressPhase !== 'idle'}
              loading={requestStatus.loading}
            >
              {t('request_brand.submit', 'Submit request')}
            </Button>
          </DialogFooter>
        </>
      </DialogContent>
    </Dialog>
  );
}

export default RequestBrandModal;
