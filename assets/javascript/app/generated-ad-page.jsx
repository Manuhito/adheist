import React, { useState, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import { Button } from '../components/ui/button.tsx';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from '../components/ui/dialog.tsx';
import { AlertNotification } from '../components/ui/alert-notification';
import { useTranslation } from '../lib/useTranslation';
import { WandSparkles, ThumbsUp, ThumbsDown, Download, Expand, Star, Info } from 'lucide-react';
import * as ReactDOM from "react-dom";
import RevisionModal from './components/RevisionModal';
import AdDetailsModal from './components/AdDetailsModal';

// Custom header component for Generated Ad page
const GeneratedAdHeader = ({ brandName }) => {
  const handleContinueToLibrary = () => {
    window.location.href = '/ads/discover/';
  };

  return (
    <div className="flex items-center justify-between w-full">
      <h1 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
        {brandName}
      </h1>
      <Button 
        onClick={handleContinueToLibrary}
        className="text-sm"
      >
        Continue to library
      </Button>
    </div>
  );
};

const GeneratedAdPage = () => {
  const { t } = useTranslation();
  const generatedAdData = window.__GENERATED_AD_DATA__ || {};
  
  // Set custom header when component mounts
  useEffect(() => {
    if (window.setAppHeader) {
      const brandName = generatedAdData.brand_name || 'Generated Ad';
      window.setAppHeader(<GeneratedAdHeader brandName={brandName} />);
    }
    
    // Cleanup header when component unmounts
    return () => {
      if (window.clearAppHeader) {
        window.clearAppHeader();
      }
    };
  }, [generatedAdData.brand_name]);
  
  // Rating states
  const [ratingOpen, setRatingOpen] = useState(false);
  const [rating, setRating] = useState(0);
  const [hoveredRating, setHoveredRating] = useState(0);
  const [ratingComment, setRatingComment] = useState('');
  const [ratingType, setRatingType] = useState('positive'); // 'positive' or 'negative'
  
  // Revision modal state
  const [revisionModalOpen, setRevisionModalOpen] = useState(false);
  
  // Ad details modal state
  const [detailsModalOpen, setDetailsModalOpen] = useState(false);

  // Version selection state
  const [selectedVersion, setSelectedVersion] = useState(null);

  // Initialize selected version when component mounts
  React.useEffect(() => {
    if (generatedAdData.versions && generatedAdData.versions.length > 0) {
      const current = generatedAdData.versions.find(v => v.id === generatedAdData.version_id) || generatedAdData.versions[0];
      setSelectedVersion(current);
    }
  }, [generatedAdData.versions, generatedAdData.version_id]);

  // Get current display data (either selected version or default)
  const currentImageUrl = selectedVersion?.generated_image || generatedAdData.generated_image;
  const currentVersionId = selectedVersion?.id || generatedAdData.version_id;

  const handleDownload = async () => {
    if (!currentImageUrl) return;
    
    try {
      // Use the same proxy endpoint as AnimatedDownloadButton
      const proxyUrl = `/ads/proxy-image/?url=${encodeURIComponent(currentImageUrl)}&filename=${encodeURIComponent(`ad-image-${currentVersionId || 1}.jpg`)}`;
      
      const link = document.createElement('a');
      link.href = proxyUrl;
      link.setAttribute('download', `ad-image-${currentVersionId || 1}.jpg`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.error('Error downloading image:', error);
    }
  };

  const handleExpand = () => {
    if (!currentImageUrl) return;
    window.open(currentImageUrl, '_blank');
  };

  const handleOpenRating = (type) => {
    setRatingType(type);
    setRating(type === 'positive' ? 5 : 1);
    setRatingComment('');
    setRatingOpen(true);
  };

  const handleSubmitRating = () => {
    function getCookie(name) {
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
    }

    // Create form data for submission
    const formData = new FormData();
    formData.append('version_id', currentVersionId);
    formData.append('rating', rating);
    formData.append('review', ratingComment);

    // Get CSRF token
    const csrftoken = getCookie('csrftoken');

    // Submit the rating to the backend
    fetch('/ads/api/version/rate/', {
      method: 'POST',
      body: formData,
      credentials: 'same-origin',
      headers: {
        'X-CSRFToken': csrftoken
      }
    })
      .then(response => response.json())
      .then(data => {
        if (data.success) {
          // Crear contenedor para la notificación
          const notificationContainer = document.createElement('div');
          notificationContainer.id = 'rating-notification-container';
          document.body.appendChild(notificationContainer);

          // Renderizar la notificación
          const notificationRoot = createRoot(notificationContainer);
          notificationRoot.render(
            <AlertNotification
              message={t("revision.rating_success_message", "Thank you for your feedback!")}
              variant="success"
              duration={5000}
              onClose={() => {
                // Eliminar el contenedor cuando se cierre
                if (notificationContainer.parentNode) {
                  notificationContainer.parentNode.removeChild(notificationContainer);
                }
              }}
            />
          );
        } else {
          // Crear contenedor para la notificación de error
          const errorContainer = document.createElement('div');
          errorContainer.id = 'rating-error-container';
          document.body.appendChild(errorContainer);

          // Renderizar la notificación de error
          const errorRoot = createRoot(errorContainer);
          errorRoot.render(
            <AlertNotification
              message={data.error || t("revision.rating_error_message", "Failed to submit rating. Please try again.")}
              variant="error"
              duration={5000}
              onClose={() => {
                // Eliminar el contenedor cuando se cierre
                if (errorContainer.parentNode) {
                  errorContainer.parentNode.removeChild(errorContainer);
                }
              }}
            />
          );
        }
      })
      .catch(error => {
        console.error('Error submitting rating:', error);

        // Crear contenedor para la notificación de error
        const errorContainer = document.createElement('div');
        errorContainer.id = 'rating-error-container';
        document.body.appendChild(errorContainer);

        // Renderizar la notificación de error
        const errorRoot = createRoot(errorContainer);
        errorRoot.render(
          <AlertNotification
            message={t("revision.rating_error_message", "Failed to submit rating. Please try again.")}
            variant="error"
            duration={5000}
            onClose={() => {
              // Eliminar el contenedor cuando se cierre
              if (errorContainer.parentNode) {
                errorContainer.parentNode.removeChild(errorContainer);
              }
            }}
          />
        );
      })
      .finally(() => {
        setRatingOpen(false);
      });
  };

  return (
    <div className="h-full flex items-center justify-center p-2">
      <div className="bg-gray-50 dark:bg-gray-800 rounded-2xl p-6 border border-gray-200 dark:border-gray-700 max-w-5xl w-full">
        <div className="flex gap-4">
          {/* Left sidebar with version previews */}
          {generatedAdData.versions && generatedAdData.versions.length > 1 && (
            <div className="flex flex-col gap-2 w-16">
              {generatedAdData.versions.map((version) => (
                <div
                  key={version.id}
                  onClick={() => setSelectedVersion(version)}
                  className={`relative cursor-pointer rounded-lg overflow-hidden border-2 transition-all ${
                    selectedVersion?.id === version.id
                      ? 'border-primary ring-2 ring-primary/20'
                      : 'border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500'
                  }`}
                >
                  {version.generated_image ? (
                    <img
                      src={version.generated_image}
                      alt="Version preview"
                      className="w-full h-16 object-cover"
                    />
                  ) : (
                    <div className="w-full h-16 bg-gray-200 dark:bg-gray-600 flex items-center justify-center">
                      <div className="w-4 h-4 bg-gray-400 dark:bg-gray-500 rounded"></div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Main content */}
          <div className="flex-1">
            {/* Image container */}
            <div className="flex items-center justify-center mb-6">
              {currentImageUrl ? (
                <img
                  src={currentImageUrl}
                  alt="Generated Ad"
                  className="max-w-full max-h-[calc(100vh-300px)] object-contain rounded-lg shadow-md"
                />
              ) : (
                <div className="w-full h-96 bg-gray-100 dark:bg-gray-700 rounded-lg flex items-center justify-center">
                  <p className="text-gray-500 dark:text-gray-400">No image available</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex items-center justify-center gap-6">
          <button
            className="flex items-center gap-2 px-4 py-3 rounded-full transition-colors hover:text-primary"
            onClick={() => setRevisionModalOpen(true)}
          >
            <WandSparkles className="h-6 w-6" />
            <span className="text-sm font-medium">Open AI Editor</span>
          </button>

          <button
            className="flex items-center gap-2 px-4 py-3 rounded-full transition-colors hover:text-primary"
            onClick={() => setDetailsModalOpen(true)}
          >
            <Info className="h-6 w-6" />
            <span className="text-sm font-medium">More Details</span>
          </button>

          <button
            className="p-3 rounded-full transition-colors hover:text-primary"
            onClick={() => handleOpenRating('positive')}
          >
            <ThumbsUp className="h-6 w-6" />
          </button>

          <button
            className="p-3 rounded-full transition-colors hover:text-primary"
            onClick={() => handleOpenRating('negative')}
          >
            <ThumbsDown className="h-6 w-6" />
          </button>

          <button
            className="p-3 rounded-full transition-colors hover:text-primary"
            onClick={handleDownload}
          >
            <Download className="h-6 w-6" />
          </button>

          <button
            className="p-3 rounded-full transition-colors hover:text-primary"
            onClick={handleExpand}
          >
            <Expand className="h-6 w-6" />
          </button>
        </div>
      </div>

      <Dialog open={ratingOpen} onOpenChange={setRatingOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("revision.rate_title", "Rate this generation")}</DialogTitle>
          </DialogHeader>
          <div className="border-t border-gray-200 pt-4 mt-4">
            <div className="flex justify-center mb-6">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  className="p-1"
                  onMouseEnter={() => setHoveredRating(star)}
                  onMouseLeave={() => setHoveredRating(0)}
                  onClick={() => setRating(star)}
                >
                  <Star
                    className={`h-8 w-8 ${(hoveredRating || rating) >= star ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'}`}
                  />
                </button>
              ))}
            </div>
            <div className="mt-4">
              <label htmlFor="rating-comment" className="block text-sm font-medium mb-2">
                {t("revision.comment_label", "Review")} <span className="text-sm text-gray-500">Minimum 50 characters</span>
              </label>
              <textarea
                id="rating-comment"
                value={ratingComment}
                onChange={(e) => setRatingComment(e.target.value)}
                rows={4}
                className="w-full rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                placeholder={t("revision.comment_placeholder", "Share your thoughts about this generation...")}
                required
              />
              <div className="text-xs text-right mt-1">
                <span className={`${ratingComment.trim().length < 50 ? 'text-red-500' : 'text-green-500'}`}>
                  {ratingComment.trim().length}
                </span>
                <span className="text-gray-500"> / 50 {t("revision.characters", "characters")}</span>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRatingOpen(false)}>
              {t("revision.cancel", "Cancel")}
            </Button>
            <Button
              onClick={handleSubmitRating}
              disabled={rating === 0 || ratingComment.trim().length < 50}
            >
              {t("revision.submit_rating", "Submit")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Revision Modal */}
      <RevisionModal
        open={revisionModalOpen}
        onOpenChange={setRevisionModalOpen}
        imageUrl={currentImageUrl}
        canvasSize={generatedAdData.canvas_size}
        versions={generatedAdData.versions || []}
        currentVersionId={currentVersionId}
        adRequestId={generatedAdData.ad_request_id}
      />

      {/* Ad Details Modal */}
      <AdDetailsModal
        isOpen={detailsModalOpen}
        onClose={() => setDetailsModalOpen(false)}
        adRequestId={generatedAdData.ad_request_id}
      />
    </div>
  );
};

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  // Wait for sidebar layout to be ready
  const checkSidebarReady = () => {
    if (window.sidebarLayoutReady) {
      const container = document.getElementById('sidebar-page-content');
      if (container) {
        const root = createRoot(container);
        root.render(<GeneratedAdPage />);
      }
    } else {
      setTimeout(checkSidebarReady, 50);
    }
  };

  checkSidebarReady();
});

export default GeneratedAdPage;
