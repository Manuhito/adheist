import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '../../shadcn/components/ui/dialog';
import { Button } from '../../shadcn/components/ui/button';
import { useTranslation } from '../../lib/useTranslation';

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

  // Function to validate the brand URL
  const isValidBrandUrl = (url) => {
    if (!url.trim()) return false;
    
    try {
      const urlObj = new URL(url);
      
      // Check if base URL is facebook.com/ads/library/
      const isValidBase = (
        (urlObj.hostname === 'facebook.com' || urlObj.hostname === 'www.facebook.com') &&
        urlObj.pathname.startsWith('/ads/library/')
      );
      
      // Check if URL contains view_all_page_id parameter
      const hasPageId = urlObj.searchParams.has('view_all_page_id');
      
      return isValidBase && hasPageId;
    } catch (e) {
      return false;
    }
  };

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
        setRequestStatus({ loading: false, success: true, error: null });
        // Close modal after 2 seconds
        setTimeout(() => {
          onOpenChange(false);
          setBrandUrl('');
          setRequestStatus({ loading: false, success: false, error: null });
        }, 2000);
      } else {
        setRequestStatus({ loading: false, success: false, error: data.error || 'An error occurred' });
      }
    } catch (error) {
      console.error('Error submitting brand request:', error);
      setRequestStatus({ loading: false, success: false, error: 'Network error. Please try again.' });
    }
  };

  const handleOpenChange = (open) => {
    if (!open) {
      // Reset form state when closing
      setBrandUrl('');
      setRequestStatus({ loading: false, success: false, error: null });
    }
    onOpenChange(open);
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent>
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
              onChange={(e) => setBrandUrl(e.target.value)}
              className="w-full px-3 py-2 border border-input bg-background rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
              placeholder="https://www.facebook.com/ads/library/..."
              disabled={requestStatus.loading || requestStatus.success}
            />
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
      </DialogContent>
    </Dialog>
  );
}

export default RequestBrandModal;
