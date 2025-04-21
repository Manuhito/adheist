import React, { useState, useEffect } from 'react';
import { NextButton } from '../../components/ui/next-button.jsx';
import { BackButton } from '../../components/ui/back-button.jsx';

/**
 * Step Three Component for the Create Ad Request flow
 * Handles final submission of the ad request
 */
const StepThreeComponent = ({ onComplete, initialData = {}, refreshData }) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isBackSubmitting, setIsBackSubmitting] = useState(false);

  // Estado para los datos completos del adlibrary
  const [adLibraryData, setAdLibraryData] = useState(null);
  const [isAdLibraryLoading, setIsAdLibraryLoading] = useState(false);

  // Fetch adlibrary info cuando tengamos el nombre
  useEffect(() => {
    if (!initialData.ad_library_name) return;
    setIsAdLibraryLoading(true);
    fetch(`/ads/adlibraries/?company_name=${encodeURIComponent(initialData.ad_library_name)}`)
      .then(res => res.json())
      .then(data => {
        // Puede venir como array directa, results, o adlibraries
        let found = null;
        if (Array.isArray(data) && data.length > 0) found = data[0];
        else if (Array.isArray(data?.results) && data.results.length > 0) found = data.results[0];
        else if (Array.isArray(data?.adlibraries) && data.adlibraries.length > 0) found = data.adlibraries[0];
        setAdLibraryData(found);
      })
      .catch(() => setAdLibraryData(null))
      .finally(() => setIsAdLibraryLoading(false));
  }, [initialData.ad_library_name]);
  
  // Fetch fresh data when component mounts
  useEffect(() => {
    if (refreshData && initialData?.id) {
      refreshData();
    }
  }, []);

  // Asegurar que el scroll esté al inicio de la página cuando el componente se monte
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);
  
  const handleSubmit = async () => {
    setIsSubmitting(true);
    
    try {
      // Here you would submit the ad request for processing
      const formData = new FormData();
      formData.append('status', 'SUBMITTED');
      
      // Send POST request to update ad request
      const response = await fetch(`/ads/adrequest/${initialData.id}/update/`, {
        method: 'POST',
        body: formData,
        headers: {
          'X-CSRFToken': getCsrfToken(),
        },
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to submit ad request');
      }
      
      // Call the onComplete callback with the updated data
      if (onComplete) {
        onComplete({
          ...initialData,
          status: 'SUBMITTED'
        });
      }
      
      // Redirect to the ad requests list page
      window.location.href = '/ads/';
      
    } catch (error) {
      console.error('Error submitting ad request:', error);
    } finally {
      setIsSubmitting(false);
    }
  };
  
  // Handle going back to step 2 (DRAFT)
  const handleBack = async () => {
    setIsBackSubmitting(true);
    try {
      const formData = new FormData();
      formData.append('status', 'DRAFT');

      const response = await fetch(`/ads/adrequest/${initialData.id}/update/`, {
        method: 'POST',
        body: formData,
        headers: {
          'X-CSRFToken': getCsrfToken(),
        },
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to update status to DRAFT');
      }

      if (onComplete) {
        onComplete({ ...initialData, status: 'DRAFT' });
      }
    } catch (error) {
      console.error('Error setting status to DRAFT:', error);
    } finally {
      setIsBackSubmitting(false);
    }
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

  return (
    <div className="space-y-8">
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-xl font-semibold mb-4">Step 3: Review and Submit</h2>
        <p className="text-gray-600 mb-4">
          This is the final step of the ad request creation process.
          Review your ad details before submitting.
        </p>
        
        {/* Summary of the ad request */}
        <div className="bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 p-4 rounded-md mb-6">
          <div className="flex flex-col md:flex-row gap-6 items-start">
            {/* Contenedor exclusivo para título + imagen */}
            <div className="flex flex-col items-center">
              <div className="mb-2 text-center font-semibold text-primary text-lg">Ideal Ad Style selected</div>
              <div className="group relative w-64 h-64 rounded-lg overflow-hidden shadow border bg-white dark:bg-gray-800">
                {isAdLibraryLoading ? (
                  <div className="flex items-center justify-center w-full h-full text-gray-400 animate-pulse">Loading...</div>
                ) : adLibraryData ? (
                  <>
                    <img
                      src={adLibraryData.ad_image || 'https://images.unsplash.com/photo-1557804506-669a67965ba0'}
                      alt={adLibraryData.company_name || initialData.ad_library_name || 'Ad Preview'}
                      className="object-cover w-full h-full transition-transform duration-300 group-hover:scale-105"
                    />
                    {/* Overlay info on hover */}
                    <div className="absolute inset-0 bg-black/70 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col justify-center items-center text-white p-4">
                      <h4 className="text-lg font-semibold mb-2">{adLibraryData.company_name || initialData.ad_library_name || 'No name'}</h4>
                      {adLibraryData.industries && adLibraryData.industries.length > 0 && (
                        <p className="text-sm mb-2 text-center">
                          {adLibraryData.industries.join(', ')}
                        </p>
                      )}
                      {adLibraryData.tags && adLibraryData.tags.length > 0 && (
                        <p className="text-xs text-blue-200">{adLibraryData.tags.join(', ')}</p>
                      )}
                    </div>
                  </>
                ) : (
                  <div className="flex items-center justify-center w-full h-full text-gray-400">No image</div>
                )}
              </div>
            </div>
            {/* Details */}
            <div className="flex-1 w-full">
              <div className="mt-4">
                <p className="text-sm text-gray-500 mb-1">Style Ad</p>
                <span className="text-xs">
                  {adLibraryData?.company_name || initialData.ad_library_name || '—'}
                </span>
              </div>
              <div className="mt-4">
                <p className="text-sm text-gray-500 mb-1">Industry</p>
                <span className="text-xs">
                  {adLibraryData?.industries && adLibraryData.industries.length > 0
                    ? adLibraryData.industries.join(', ')
                    : '—'}
                </span>
              </div>
              <div className="mt-4">
                <p className="text-sm text-gray-500 mb-1">Tags</p>
                <span className="text-xs">
                  {adLibraryData?.tags && adLibraryData.tags.length > 0
                    ? adLibraryData.tags.join(', ')
                    : '—'}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Brand Details Section */}
        <div className="mt-8 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg p-6 mb-8">
          <div className="mb-4 text-sm font-semibold text-primary">Brand Details</div>
          <div className="flex flex-col md:flex-row gap-8 items-center md:items-start">
            {/* Logo Column */}
            <div className="flex justify-center md:justify-start w-full md:w-64">
              <div className="group relative w-48 h-48 rounded-lg overflow-hidden shadow border bg-white dark:bg-gray-800">
                {initialData.logo_override ? (
                  <img
                    src={initialData.logo_override}
                    alt="Logo Preview"
                    className="object-cover w-full h-full transition-transform duration-300 group-hover:scale-105"
                  />
                ) : (
                  <div className="flex items-center justify-center w-full h-full text-gray-400">No logo</div>
                )}
              </div>
            </div>
            {/* Details Column */}
            <div className="flex-1 w-full">
              {/* Brand Color Display */}
              <div className="mb-4">
                <p className="text-sm text-gray-500 mb-1">Brand Color</p>
                {initialData.asset_overrides?.main_hex_color ? (
                  <div className="flex items-center gap-2">
                    <div
                      className="h-6 w-6 rounded-md border"
                      style={{ backgroundColor: initialData.asset_overrides.main_hex_color }}
                    />
                    <span className="text-xs">
                      {initialData.asset_overrides.main_hex_color}
                    </span>
                  </div>
                ) : (
                  <span className="text-xs text-gray-400">No brand color</span>
                )}
              </div>
              {/* Company Website Display */}
              <div className="mb-4">
                <p className="text-sm text-gray-500 mb-1">Company Website</p>
                {initialData.asset_overrides?.company_website ? (
                  <a
                    href={initialData.asset_overrides.company_website}
                    className="text-xs text-blue-600 underline break-all"
                    target="_blank" rel="noopener noreferrer"
                  >
                    {initialData.asset_overrides.company_website}
                  </a>
                ) : (
                  <span className="text-xs text-gray-400">No company website</span>
                )}
              </div>
              {/* Key Benefits Display */}
              <div className="mb-4">
                <p className="text-sm text-gray-500 mb-1">Key Benefits</p>
                {initialData.asset_overrides?.key_benefits ? (
                  <span className="text-xs">
                    {initialData.asset_overrides.key_benefits}
                  </span>
                ) : (
                  <span className="text-xs text-gray-400">No key benefits</span>
                )}
              </div>
              {/* Canvas Size Display (vertical) */}
              <div className="mb-2">
                <p className="text-sm text-gray-500 mb-1">Canvas Size</p>
                {(() => {
                  const canvasSizes = [
                    { id: 'square', label: 'Square', size: '1080x1080' },
                    { id: 'portraitTall', label: 'Portrait Tall', size: '1080x1920' },
                    { id: 'portrait', label: 'Portrait', size: '1080x1350' },
                    { id: 'landscape', label: 'Landscape', size: '1280x720' },
                  ];
                  const sizeIdMap = {
                    '1080x1080': 'square',
                    '1080x1920': 'portraitTall',
                    '1080x1350': 'portrait',
                    '1280x720': 'landscape',
                  };
                  const sizeId = sizeIdMap[initialData.canvas_size] || initialData.canvas_size;
                  const item = canvasSizes.find(c => c.id === sizeId);
                  if (item) {
                    return (
                      <div className="flex flex-col">
                        {/* Aspect ratio box */}
                        {item.id === "square" && (
                          <div className="w-8 h-8 border-2 border-gray-300 rounded-sm mb-2" />
                        )}
                        {item.id === "portraitTall" && (
                          <div className="w-6 h-10 border-2 border-gray-300 rounded-sm mb-2" />
                        )}
                        {item.id === "portrait" && (
                          <div className="w-7 h-9 border-2 border-gray-300 rounded-sm mb-2" />
                        )}
                        {item.id === "landscape" && (
                          <div className="w-12 h-6 border-2 border-gray-300 rounded-sm mb-2" />
                        )}
                        <span className="font-semibold text-xs">{item.label}</span>
                        <span className="text-xs text-gray-500">{item.size}</span>
                      </div>
                    );
                  }
                  // Fallback if unknown
                  return (
                    <div className="flex flex-col items-center">
                      <div className="w-8 h-8 border-2 border-dashed border-gray-200 rounded-sm mb-2 flex items-center justify-center text-xs text-gray-400">?</div>
                      <span className="font-semibold text-xs text-gray-400">Unknown</span>
                      <span className="text-xs text-gray-400">{initialData.canvas_size || 'Not specified'}</span>
                    </div>
                  );
                })()}
              </div>
            </div>
          </div>
        </div>

        <div className="bg-blue-50 border-l-4 border-blue-400 p-4 mb-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-blue-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm text-blue-700">
                Once submitted, your ad request will be processed. This may take a few minutes.
              </p>
            </div>
          </div>
        </div>
      </div>
      
      <div className="flex justify-center gap-4 pb-8">
        <BackButton onClick={handleBack} isLoading={isBackSubmitting} />
        <NextButton 
          onClick={handleSubmit}
          isLoading={isSubmitting}
          text="Submit Ad Request"
        />
      </div>
    </div>
  );
};

export default StepThreeComponent;
