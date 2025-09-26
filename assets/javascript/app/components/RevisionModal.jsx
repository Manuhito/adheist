import React, { useState } from 'react';
import { Dialog, DialogContent, DialogTitle } from '../../components/ui/dialog.tsx';
import { Button } from '../../components/ui/button.tsx';
import { WandSparkles, ArrowUp, Zap, CreditCard } from 'lucide-react';
import GeneratingLoadingPage from './GeneratingLoadingPage';
import { useTranslation } from "../../lib/useTranslation";

/**
 * RevisionModal - Modal minimalista para mostrar la imagen generada
 * @param {Object} props - Component props
 * @param {boolean} props.open - Si el modal está abierto
 * @param {function} props.onOpenChange - Función para cambiar el estado del modal
 * @param {string} props.imageUrl - URL de la imagen a mostrar
 * @param {string} props.canvasSize - Tamaño del canvas (ej: "1024x1024")
 * @param {Array} props.versions - Array de todas las versiones del AdRequest
 * @param {number} props.currentVersionId - ID de la versión actualmente seleccionada
 * @param {number} props.adRequestId - ID del AdRequest para la generación
 */
const RevisionModal = ({ open, onOpenChange, imageUrl, canvasSize, versions = [], currentVersionId, adRequestId }) => {
  const { t } = useTranslation();
  
  // State for the edit description textarea
  const [editDescription, setEditDescription] = useState('');
  
  // State for the currently selected version
  const [selectedVersion, setSelectedVersion] = useState(null);
  
  // State for generation process
  const [isGenerating, setIsGenerating] = useState(false);
  
  // State for credits modal
  const [showNoCreditsDialog, setShowNoCreditsDialog] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  
  // Initialize selected version when modal opens
  React.useEffect(() => {
    if (open && versions.length > 0) {
      const current = versions.find(v => v.id === currentVersionId) || versions[0];
      setSelectedVersion(current);
    }
  }, [open, versions, currentVersionId]);
  
  // Get the image URL and canvas size from selected version
  const displayImageUrl = selectedVersion?.generated_image || imageUrl;
  const displayCanvasSize = selectedVersion?.canvas_size || canvasSize;

  // Format canvas size for display (replace 'x' with ' x ')
  const formatCanvasSize = (size) => {
    if (!size) return '1024 x 1024';
    return size.replace('x', ' x ');
  };

  // Function to get CSRF token from cookies
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

  // Function to show the generating page by replacing the entire page content
  const showGeneratingPage = (adRequestId) => {
    // Import createRoot
    import('react-dom/client').then(({ createRoot }) => {
      // Clear the current page content
      const container = document.getElementById('sidebar-page-content') || document.body;
      
      // Create a new container for the generating page
      container.innerHTML = '<div id="generating-page-root"></div>';
      
      // Mount the GeneratingLoadingPage
      const generatingContainer = document.getElementById('generating-page-root');
      const root = createRoot(generatingContainer);
      root.render(<GeneratingLoadingPage adRequestId={adRequestId} />);
    });
  };

  // Navigate to billing page
  const handleNavigateToBilling = () => {
    window.location.href = '/ads/billing/';
  };

  // Generate version handler
  const handleGenerateVersion = async () => {
    // Validate that prompt is not empty
    if (!editDescription.trim()) {
      console.error('Please enter a prompt before generating');
      return;
    }

    if (!adRequestId) {
      console.error('No ad request ID available');
      return;
    }

    // Check if we have a selected version with an image
    if (!selectedVersion || !selectedVersion.generated_image) {
      console.error('No image available for revision');
      return;
    }

    setIsGenerating(true);

    try {
      // First, update status to REOPENED in the backend
      const statusFormData = new FormData();
      statusFormData.append('status', 'REOPENED');

      const statusResponse = await fetch(`/ads/adrequest/${adRequestId}/update/`, {
        method: 'POST',
        headers: { 'X-CSRFToken': getCsrfToken() },
        body: statusFormData
      });

      if (!statusResponse.ok) {
        const errorData = await statusResponse.json();
        throw new Error(errorData.error || 'Failed to update status to REOPENED');
      }

      // Then create a new revision using the selected image
      const revisionFormData = new FormData();
      revisionFormData.append('ad_request', adRequestId);
      revisionFormData.append('user_prompt', editDescription);
      revisionFormData.append('url_image_revision', selectedVersion.generated_image);

      const response = await fetch('/ads/adrequest/revision/create/', {
        method: 'POST',
        body: revisionFormData,
        headers: {
          'X-CSRFToken': getCsrfToken(),
        },
      });

      const data = await response.json();
      if (!response.ok) {
        // Check if this is a credits error (status 403 with specific message)
        if (response.status === 403) {
          setErrorMessage(data.error);
          setShowNoCreditsDialog(true);
          setIsGenerating(false);
          return;
        }
        throw new Error(data.error || 'Error generating version');
      }

      // Close the modal
      onOpenChange(false);
      
      // Show the generating page by replacing the entire page content
      showGeneratingPage(adRequestId);
      console.log('Generation started successfully - showing generating page');
      
    } catch (error) {
      console.error('Error generating version:', error);
      setIsGenerating(false);
    }
  };

  return (
    <>
      {/* No Credits Dialog */}
      {showNoCreditsDialog && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-[99999]"
          style={{ margin: 0, pointerEvents: 'auto' }}
          onClick={() => setShowNoCreditsDialog(false)} // Close when clicking outside
        >
          <div
            className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 max-w-md w-full mx-4 relative z-[100000]"
            style={{ pointerEvents: 'auto' }}
            onClick={(e) => e.stopPropagation()} // Prevent closing when clicking inside
          >
            <h2 className="text-xl font-semibold mb-4">{t('step_three.no_credits_title', 'No Credits Available')}</h2>
            <div className="flex items-center gap-3 mb-4 text-amber-600 dark:text-amber-400">
              <CreditCard className="h-6 w-6" />
              <p className="text-gray-600 dark:text-gray-300">
                {errorMessage || t('step_three.no_credits_message', 'You have reached out your image limit creation for your plan')}
              </p>
            </div>
            <div className="flex justify-between">
              <button
                type="button"
                className="px-4 py-2 text-gray-900 dark:text-white rounded-md hover:text-gray-700 dark:hover:text-gray-200 transition-colors cursor-pointer"
                style={{ pointerEvents: 'auto' }}
                onClick={() => setShowNoCreditsDialog(false)}
              >
                {t('step_three.cancel', 'Cancel')}
              </button>
              <button
                type="button"
                className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-600 hover:text-white rounded-md transition-all duration-200 cursor-pointer"
                style={{ pointerEvents: 'auto' }}
                onClick={handleNavigateToBilling}
              >
                {t('step_three.upgrade_plan', 'Upgrade Plan')}
              </button>
            </div>
          </div>
        </div>
      )}

      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-5xl w-full p-0 border-0 bg-transparent shadow-none">
          <DialogTitle className="sr-only">Generated Ad Revision</DialogTitle>
        <div className="bg-gray-50 dark:bg-gray-800 rounded-2xl p-6 border border-gray-200 dark:border-gray-700">
          <div className="flex gap-4">
            {/* Left sidebar with version previews */}
            {versions.length > 0 && (
              <div className="flex flex-col gap-2 w-16">
                {versions.map((version) => (
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
              {/* Image container with lighter gray background and border */}
              <div className="bg-gray-100 dark:bg-gray-600 rounded-xl p-4 border border-gray-300 dark:border-gray-500 mb-4">
                {/* Header with title and canvas size inside container */}
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                    Generated Ad
                  </h3>
                  <span className="text-sm text-gray-600 dark:text-gray-400 font-medium">
                    {formatCanvasSize(displayCanvasSize)}
                  </span>
                </div>

                {/* Image */}
                <div className="flex items-center justify-center">
                  {displayImageUrl ? (
                    <img
                      src={displayImageUrl}
                      alt="Generated Ad for Revision"
                      className="max-w-full max-h-[60vh] object-contain rounded-lg"
                    />
                  ) : (
                    <div className="w-full h-96 bg-gray-200 dark:bg-gray-500 rounded-lg flex items-center justify-center">
                      <p className="text-gray-500 dark:text-gray-400">No image available</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Edit description textarea */}
              <div className="relative">
                <div className="relative">
                  <WandSparkles className="absolute left-3 top-3 h-4 w-4 text-gray-500 dark:text-gray-400" />
                  <textarea
                    value={editDescription}
                    onChange={(e) => setEditDescription(e.target.value)}
                    placeholder="Describe your edits (e.g. Make it more vibrant and colorful)"
                    className="w-full pl-10 pr-20 min-h-[80px] resize-none rounded-2xl border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  />
                  <Button
                    disabled={!editDescription.trim() || isGenerating}
                    onClick={handleGenerateVersion}
                    className={`absolute bottom-3 right-3 h-8 px-3 text-xs rounded-full ${
                      !editDescription.trim() || isGenerating
                        ? 'bg-gray-400 hover:bg-gray-400 text-white cursor-not-allowed' 
                        : ''
                    }`}
                    size="sm"
                  >
                    <ArrowUp className={`h-3 w-3 mr-1 ${isGenerating ? 'animate-spin' : ''}`} />
                    {isGenerating ? 'Generating...' : 'Generate'}
                  </Button>
                </div>
              </div>

              {/* Tips cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 mt-4">
                <div 
                  onClick={() => setEditDescription('Make it more vibrant and colorful')}
                  className="flex items-center gap-2 px-3 py-2 border border-primary/20 rounded-lg cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                >
                  <Zap className="h-3 w-3 text-primary flex-shrink-0" />
                  <span className="text-xs text-gray-700 dark:text-gray-300 truncate">Make it more vibrant and colorful</span>
                </div>
                
                <div 
                  onClick={() => setEditDescription('Add a modern minimalist style')}
                  className="flex items-center gap-2 px-3 py-2 border border-primary/20 rounded-lg cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                >
                  <Zap className="h-3 w-3 text-primary flex-shrink-0" />
                  <span className="text-xs text-gray-700 dark:text-gray-300 truncate">Add a modern minimalist style</span>
                </div>
                
                <div 
                  onClick={() => setEditDescription('Enhance the overall quality')}
                  className="flex items-center gap-2 px-3 py-2 border border-primary/20 rounded-lg cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                >
                  <Zap className="h-3 w-3 text-primary flex-shrink-0" />
                  <span className="text-xs text-gray-700 dark:text-gray-300 truncate">Enhance the overall quality</span>
                </div>
                
                <div 
                  onClick={() => setEditDescription('Apply a professional business look')}
                  className="flex items-center gap-2 px-3 py-2 border border-primary/20 rounded-lg cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                >
                  <Zap className="h-3 w-3 text-primary flex-shrink-0" />
                  <span className="text-xs text-gray-700 dark:text-gray-300 truncate">Apply a professional business look</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
    </>
  );
};

export default RevisionModal;
