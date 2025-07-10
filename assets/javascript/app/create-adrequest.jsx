import React, { useState, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import { Trash2 } from 'lucide-react';
import StepOneComponent from './components/StepOneComponent';
import StepTwoComponent from './components/StepTwoComponent';
import StepThreeComponent from './components/StepThreeComponent';
import { useTranslation } from '../lib/useTranslation';

/**
 * Main container component for the Create Ad Request flow
 * Handles conditional rendering of different steps based on status
 * Ensures fresh data at each step by fetching from the server
 */
const CreateAdRequestApp = () => {
  const { t } = useTranslation();
  // Get initial data from the DOM as fallback
  const getInitialData = () => {
    try {
      // Check if we have adrequest data in the page
      const dataElement = document.getElementById('adrequest-data');
      if (dataElement) {
        return JSON.parse(dataElement.textContent);
      }

      // If no data element, check for data attributes
      const container = document.getElementById('create-adrequest-app');
      const adRequestId = container?.dataset?.adRequestId;
      const status = container?.dataset?.status || 'NEW';

      return { id: adRequestId, status };
    } catch (error) {
      console.error('Error parsing initial data:', error);
      return { status: 'NEW' };
    }
  };

  // Initialize state with data from the DOM
  const [adRequestData, setAdRequestData] = useState(getInitialData());
  const [isLoading, setIsLoading] = useState(false);
  const [showDeleteConfirmation, setShowDeleteConfirmation] = useState(false);

  // Function to fetch fresh data from the server
  const fetchFreshData = async (id) => {
    if (!id) return null;

    setIsLoading(true);
    try {
      const response = await fetch(`/ads/adrequest/${id}/get/`);
      if (!response.ok) {
        throw new Error(`Error fetching ad request: ${response.statusText}`);
      }

      const freshData = await response.json();
      // Solo mostrar logs en entorno de desarrollo
      if (process.env.NODE_ENV === 'development') {
        console.log('Fetched fresh data:', freshData);
      }
      setAdRequestData(freshData);
      return freshData;
    } catch (error) {
      console.error('Error fetching fresh data:', error);
    } finally {
      setIsLoading(false);
    }
    return null;
  };

  // Fetch fresh data when component mounts
  useEffect(() => {
    if (adRequestData?.id) {
      fetchFreshData(adRequestData.id);
    }
  }, []);

  // Handle completion of a step with fresh data
  const handleStepComplete = async (updatedData) => {
    // First update with the data we have
    setAdRequestData(prevData => ({
      ...prevData,
      ...updatedData
    }));

    // Then fetch fresh data if we have an ID
    if (updatedData?.id) {
      await fetchFreshData(updatedData.id);
    }
  };



  // Determine which step to show based on status
  const renderCurrentStep = () => {
    const status = adRequestData.status || 'NEW';

    // Map status to step components
    switch (status) {
      case 'NEW':
        // Track Step 1 page view
        if (window.posthog) {
          window.posthog.capture('Step 1 page viewed', {
            timestamp: new Date().toISOString()
          });
        }
        return (
          <StepOneComponent
            onComplete={handleStepComplete}
            initialData={adRequestData}
            refreshData={() => fetchFreshData(adRequestData.id)}
          />
        );
      case 'DRAFT':
        // Track Step 2 page view
        if (window.posthog) {
          window.posthog.capture('Step 2 page viewed', {
            timestamp: new Date().toISOString()
          });
        }
        return (
          <StepTwoComponent
            onComplete={handleStepComplete}
            initialData={adRequestData}
            refreshData={() => fetchFreshData(adRequestData.id)}
          />
        );
      case 'FILLED':
        // Track Step 3 page view
        if (window.posthog) {
          window.posthog.capture('Step 3 page viewed', {
            timestamp: new Date().toISOString()
          });
        }
        return (
          <StepThreeComponent
            onComplete={handleStepComplete}
            initialData={adRequestData}
            refreshData={() => fetchFreshData(adRequestData.id)}
          />
        );
      default:
        // Track Step 1 page view (default case)
        if (window.posthog) {
          window.posthog.capture('Step 1 page viewed', {
            timestamp: new Date().toISOString()
          });
        }
        return (
          <StepOneComponent
            onComplete={handleStepComplete}
            initialData={adRequestData}
            refreshData={() => fetchFreshData(adRequestData.id)}
          />
        );
    }
  };

  // Log current status for debugging (solo en desarrollo)
  useEffect(() => {
    // Solo mostrar logs en entorno de desarrollo
    if (process.env.NODE_ENV === 'development') {
      console.log('Current adRequestData:', adRequestData);
    }
  }, [adRequestData]);

  // Helper function to get CSRF token from cookies
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

  // No additional configuration needed at this level

  return (
    <>
      {/* Delete confirmation dialog - Fuera del contenedor principal para evitar problemas de espaciado */}
      {showDeleteConfirmation && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
          style={{ margin: 0 }}
          onClick={() => setShowDeleteConfirmation(false)} // Cerrar al hacer clic fuera
        >
          <div
            className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 max-w-md w-full mx-4"
            onClick={(e) => e.stopPropagation()} // Evitar que los clics dentro del modal lo cierren
          >
            <h2 className="text-xl font-semibold mb-4">{t('create_adrequest.delete_title', 'Delete Ad Request')}</h2>
            <p className="text-gray-600 dark:text-gray-300 mb-6">
              {t('create_adrequest.delete_confirm', 'Are you sure you want to permanently delete this ad request? This action cannot be undone.')}
            </p>
            <div className="flex justify-end gap-3">
              <button
                type="button"
                className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md transition-colors"
                onClick={() => setShowDeleteConfirmation(false)}
              >
                {t('create_adrequest.cancel', 'Cancel')}
              </button>
              <button
                type="button"
                className="px-4 py-2 text-white bg-red-500 hover:bg-red-600 rounded-md transition-colors"
                onClick={async () => {
                  if (!adRequestData?.id) {
                    console.error(t('create_adrequest.no_id', 'No ad request ID available'));
                    setShowDeleteConfirmation(false);
                    return;
                  }

                  try {
                    // Get CSRF token from cookies
                    const csrfToken = getCsrfToken();

                    // Track event in PostHog when user confirms ad request deletion
                    if (window.posthog) {
                      window.posthog.capture('Ad Request Deleted', {
                        timestamp: new Date().toISOString(),
                        ad_request_id: adRequestData.id,
                        ad_request_status: adRequestData.status,
                      });
                    }
                    
                    // Call the delete endpoint
                    const response = await fetch(`/ads/adrequest/${adRequestData.id}/delete/`, {
                      method: 'DELETE',
                      headers: {
                        'X-CSRFToken': csrfToken,
                      }
                    });

                    const data = await response.json();

                    if (!response.ok) {
                      throw new Error(data.error || t('create_adrequest.delete_failed', 'Failed to delete ad request'));
                    }

                    // Close the confirmation dialog
                    setShowDeleteConfirmation(false);

                    // Redirect to the ad requests list page
                    window.location.href = '/ads/';
                  } catch (error) {
                    console.error('Error deleting ad request:', error);
                    setShowDeleteConfirmation(false);
                  }
                }}
              >
                {t('create_adrequest.delete', 'Delete')}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="space-y-8">
        {/* Header row with title, progress indicator, and delete button */}
        <div className="flex items-center mb-4">
          <h1 className="text-2xl font-bold mr-4">{t('create_adrequest.title', 'Create Ad Request')}</h1>
          
          {/* Compact Progress indicator */}
          <div className="flex-1 flex items-center justify-between mx-4">
            <div className="flex items-center">
              <div className={`rounded-full h-6 w-6 flex items-center justify-center text-xs ${adRequestData.status === 'NEW' ? 'bg-primary text-white' : 'bg-green-500 text-white'}`}>
                1
              </div>
              <div className="ml-1 text-xs font-medium hidden sm:inline">
                {t('create_adrequest.step1', 'Select Ad Style')}
              </div>
            </div>
            <div className="flex-1 mx-2 h-1 bg-gray-200">
              <div className={`h-full ${adRequestData.status !== 'NEW' ? 'bg-green-500' : 'bg-gray-200'}`} style={{ width: adRequestData.status === 'NEW' ? '0%' : '100%' }}></div>
            </div>

            <div className="flex items-center">
              <div className={`rounded-full h-6 w-6 flex items-center justify-center text-xs ${adRequestData.status === 'DRAFT' ? 'bg-primary text-white' : (adRequestData.status === 'NEW' ? 'bg-gray-300 text-gray-600' : 'bg-green-500 text-white')}`}>
                2
              </div>
              <div className="ml-1 text-xs font-medium hidden sm:inline">
                {t('create_adrequest.step2', 'Configure Ad')}
              </div>
            </div>
            <div className="flex-1 mx-2 h-1 bg-gray-200">
              <div className={`h-full ${adRequestData.status === 'FILLED' ? 'bg-green-500' : 'bg-gray-200'}`} style={{ width: adRequestData.status === 'FILLED' ? '100%' : '0%' }}></div>
            </div>

            <div className="flex items-center">
              <div className={`rounded-full h-6 w-6 flex items-center justify-center text-xs ${adRequestData.status === 'FILLED' ? 'bg-primary text-white' : 'bg-gray-300 text-gray-600'}`}>
                3
              </div>
              <div className="ml-1 text-xs font-medium hidden sm:inline">
                {t('create_adrequest.step3', 'Review & Submit')}
              </div>
            </div>
          </div>
          
          <button
            type="button"
            className="p-2 text-gray-500 hover:text-red-500 transition-colors duration-200 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 ml-2"
            aria-label="Delete ad request"
            onClick={() => setShowDeleteConfirmation(true)}
          >
            <Trash2 className="w-5 h-5" />
          </button>
        </div>

        {/* Current step component */}
        {renderCurrentStep()}
      </div>
    </>
  );
};

/**
 * Mount the React application to the DOM when the document is loaded
 */
document.addEventListener('DOMContentLoaded', () => {
  const container = document.getElementById('create-adrequest-app');
  if (container) {
    // Get adrequest_id from data attribute if available
    const adRequestId = container.getAttribute('data-adrequest-id');
    const status = container.getAttribute('data-status') || 'NEW';

    // Set data attributes for the container
    if (adRequestId) {
      container.dataset.adRequestId = adRequestId;
    }
    if (status) {
      container.dataset.status = status;
    }

    const root = createRoot(container);
    root.render(<CreateAdRequestApp />);
  } else {
    console.error('Could not find mount point for Create Ad Request app');
  }
});
