import React, { useState, useEffect } from 'react';
import { NextButton } from '../../components/ui/next-button.jsx';
import { BackButton } from '../../components/ui/back-button.jsx';
import { Button } from '../../components/ui/button.tsx';
import { Sparkles } from "lucide-react";
import { useTranslation } from "../../lib/useTranslation";

/**
 * Step Three Component for the Create Ad Request flow
 * Handles final submission of the ad request
 */
const StepThreeComponent = ({ onComplete, initialData = {}, refreshData }) => {
  const { t } = useTranslation();
  const [isGenerating, setIsGenerating] = useState(false);

  // Helper: get adRequestData.id if present, else fallback to initialData.id
  const adRequestId = initialData?.id;

  // ...rest of state/hooks

  // Generate version handler
  const handleGenerateVersion = async () => {
    if (!adRequestId) {
      console.error(t('step_three.no_request_id', 'No ad request ID available'));
      return;
    }
    setIsGenerating(true);
    // First, update status to SUBMITED in the backend (like StepTwoComponent)
    try {
      // Get CSRF token from cookies
      const csrfToken = document.cookie
        .split('; ')
        .find(row => row.startsWith('csrftoken='))
        ?.split('=')[1];
      if (!csrfToken) {
        console.error(t('step_three.csrf_not_found', 'CSRF token not found'));
        setIsGenerating(false);
        return;
      }
      const formData = new FormData();
      formData.append('status', 'SUBMITTED');
      const statusResponse = await fetch(`/ads/adrequest/${adRequestId}/update/`, {
        method: 'POST',
        headers: { 'X-CSRFToken': csrfToken },
        body: formData
      });
      if (!statusResponse.ok) {
        const errorData = await statusResponse.json();
        throw new Error(errorData.error || t('step_three.update_status_failed', 'Failed to update status to SUBMITED'));
      }
    } catch (err) {
      console.error(t('step_three.update_status_error', 'Error updating status to SUBMITED:'), err);
      setIsGenerating(false);
      return;
    }
    try {
      const formData = new FormData();
      formData.append('ad_request', adRequestId);
      formData.append('user_prompt', userPrompt);
      const response = await fetch('/ads/adrequest/version/create/', {
        method: 'POST',
        body: formData,
        headers: {
          'X-CSRFToken': getCsrfToken(),
        },
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || t('step_three.generate_version_error', 'Error generating version'));
      }
      // Guardar flag para mostrar alert en la home y redirigir
      sessionStorage.setItem('ads_success_alert', '1');
      window.location.href = '/ads/';
    } catch (error) {
      console.error('Error generating version:', error);
    } finally {
      setIsGenerating(false);
    }
  };

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isBackSubmitting, setIsBackSubmitting] = useState(false);

  // Prompt state (solo visual, no guardar)
  const [userPrompt, setUserPrompt] = useState("");

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
        throw new Error(data.error || t('step_three.submit_request_failed', 'Failed to submit ad request'));
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
        throw new Error(data.error || t('step_three.update_draft_failed', 'Failed to update status to DRAFT'));
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
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
        <h2 className="text-xl font-semibold mb-4">{t('step_three.summary', 'Summary')}</h2>
        
        {/* Summary of the ad request */}
        <div className="bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 p-4 rounded-md mb-6">
          <div className="flex flex-col md:flex-row gap-6 items-start">
            {/* Column 1: Ad Style */}
            <div className="flex flex-col md:w-1/3">

              <div className="group relative w-32 h-32 rounded-lg overflow-hidden shadow border bg-white dark:bg-gray-800">
                {isAdLibraryLoading ? (
                  <div className="flex items-center justify-center w-full h-full text-gray-400 animate-pulse">{t('step_three.loading', 'Loading...')}</div>
                ) : adLibraryData ? (
                  <>
                    <img
                      src={adLibraryData.ad_image || 'https://images.unsplash.com/photo-1557804506-669a67965ba0'}
                      alt={adLibraryData.company_name || initialData.ad_library_name || t('step_three.ad_preview', 'Ad Preview')}
                      className="object-cover w-full h-full transition-transform duration-300 group-hover:scale-105"
                    />
                    {/* Overlay info on hover */}
                    <div className="absolute inset-0 bg-black/70 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col justify-center items-center text-white p-2">
                      <h4 className="text-sm font-semibold mb-1">{adLibraryData.company_name || initialData.ad_library_name || t('step_three.no_name', 'No name')}</h4>
                      {adLibraryData.industries && adLibraryData.industries.length > 0 && (
                        <p className="text-xs mb-1 text-center">
                          {adLibraryData.industries.join(', ')}
                        </p>
                      )}
                      {adLibraryData.tags && adLibraryData.tags.length > 0 && (
                        <p className="text-xs text-blue-200">{adLibraryData.tags.join(', ')}</p>
                      )}
                    </div>
                  </>
                ) : (
                  <div className="flex items-center justify-center w-full h-full text-gray-400">{t('step_three.no_image', 'No image')}</div>
                )}
              </div>
            </div>
            
            {/* Column 2: Brand Details */}
            <div className="flex flex-col md:w-1/3">

              
              {/* Details Content */}
              <div className="flex-1 w-full">
                {/* Brand Color Display */}
                <div className="mb-3">

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
                    <span className="text-xs text-gray-400">{t('step_three.no_brand_color', 'No brand color')}</span>
                  )}
                </div>
                {/* Company Website Display */}
                <div className="mb-3">

                  {initialData.asset_overrides?.company_website ? (
                    <a
                    href={initialData.asset_overrides.company_website}
                    className="text-xs text-blue-600 underline break-all"
                    target="_blank" rel="noopener noreferrer"
                    >
                      {initialData.asset_overrides.company_website}
                    </a>
                  ) : (
                    <span className="text-xs text-gray-400">{t('step_three.no_company_website', 'No company website')}</span>
                  )}
                </div>
                {/* Key Benefits Display */}
                <div className="mb-3">

                  {initialData.asset_overrides?.key_benefits ? (
                    <span className="text-xs">
                      {initialData.asset_overrides.key_benefits}
                    </span>
                  ) : (
                    <span className="text-xs text-gray-400">{t('step_three.no_key_benefits', 'No key benefits')}</span>
                  )}
                </div>
                {/* Canvas Size Display (vertical) */}
                <div className="mb-2">

                  {(() => {
                    const canvasSizes = [
                      { id: '1024x1024', label: t('step_three.square', 'Square'), size: '1024x1024' },
                      { id: '1024x1792', label: t('step_three.portrait', 'Portrait'), size: '1024x1792' },
                      { id: '1792x1024', label: t('step_three.landscape', 'Landscape'), size: '1792x1024' },
                    ];
                    // Use the canvas size value directly as the ID
                    const item = canvasSizes.find(c => c.id === initialData.canvas_size);
                    if (item) {
                      return (
                        <div className="flex flex-col">
                          {/* Aspect ratio box */}
                          {item.id === "1024x1024" && (
                            <div className="w-8 h-8 border-2 border-gray-300 rounded-sm mb-2" />
                          )}
                          {item.id === "1024x1792" && (
                            <div className="w-6 h-10 border-2 border-gray-300 rounded-sm mb-2" />
                          )}
                          {item.id === "1792x1024" && (
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
                        <span className="font-semibold text-xs text-gray-400">{t('step_three.unknown', 'Unknown')}</span>
                        <span className="text-xs text-gray-400">{initialData.canvas_size || t('step_three.not_specified', 'Not specified')}</span>
                      </div>
                    );
                  })()}
                </div>
              </div>
            </div>
            
            {/* Column 3: Images */}
            <div className="flex flex-col md:w-1/3">

              
              {/* Images organized in 3 rows */}
              <div className="flex flex-col gap-4">
                {/* Row 1: Logo */}
                {initialData.logo_override && (
                  <div className="flex flex-col gap-1">

                    <div className="flex justify-center md:justify-start">
                      <div className="group relative w-24 h-24 rounded-lg overflow-hidden shadow border bg-white dark:bg-gray-800">
                        <img
                          src={initialData.logo_override}
                          alt="Logo Preview"
                          className="object-cover w-full h-full transition-transform duration-300 group-hover:scale-105"
                        />
                      </div>
                    </div>
                  </div>
                )}
                
                {/* Row 2: Product and Service Images */}
                {(() => {
                  const productServiceImages = [
                    { key: 'product_image_1_override', label: t('step_three.product_1', 'Product 1') },
                    { key: 'product_image_2_override', label: t('step_three.product_2', 'Product 2') },
                    { key: 'app_image_1_override', label: t('step_three.service_1', 'Service 1') },
                    { key: 'app_image_2_override', label: t('step_three.service_2', 'Service 2') },
                  ].filter(img => initialData[img.key]);
                  
                  if (productServiceImages.length === 0) return null;
                  
                  return (
                    <div className="flex flex-col gap-1">

                      <div className="flex flex-wrap gap-2 justify-center md:justify-start">
                        {productServiceImages.map(img => (
                          <div key={img.key} className="flex flex-col items-center">
                            <img
                              src={initialData[img.key]}
                              alt={img.label}
                              className="w-16 h-16 object-cover rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-sm"
                              loading="lazy"
                            />
                            <span className="mt-1 text-xs text-gray-500 dark:text-gray-400 truncate max-w-[4rem] text-center">
                              {img.label}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })()}
                
                {/* Row 3: Marketing Images */}
                {(() => {
                  const marketingImages = [
                    { key: 'marketing_image_1_override', label: t('step_three.marketing_1', 'Marketing 1') },
                    { key: 'marketing_image_2_override', label: t('step_three.marketing_2', 'Marketing 2') },
                    { key: 'marketing_image_3_override', label: t('step_three.marketing_3', 'Marketing 3') },
                  ].filter(img => initialData[img.key]);
                  
                  if (marketingImages.length === 0) return null;
                  
                  return (
                    <div className="flex flex-col gap-1">

                      <div className="flex flex-wrap gap-2 justify-center md:justify-start">
                        {marketingImages.map(img => (
                          <div key={img.key} className="flex flex-col items-center">
                            <img
                              src={initialData[img.key]}
                              alt={img.label}
                              className="w-16 h-16 object-cover rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-sm"
                              loading="lazy"
                            />
                            <span className="mt-1 text-xs text-gray-500 dark:text-gray-400 truncate max-w-[4rem] text-center">
                              {img.label}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })()}
              </div>
            </div>
          </div>
        </div>

        {/* We've removed the separate images section since they're now in the right column */}
      </div>

      {/* Nueva sección: Prompt del usuario (solo visual) - outside the white background container */}
      <div className="flex flex-col items-center justify-center mb-8">
        <div className="space-y-2 w-full min-w-[300px] max-w-2xl">
          <label htmlFor="user-prompt" className="block text-lg font-medium text-primary mb-2 text-center">
            {t('step_three.prompt_label', 'What message do you want to transmit or additional instructions?')}
          </label>
          <textarea
            id="user-prompt"
            value={userPrompt}
            onChange={e => setUserPrompt(e.target.value)}
            rows={5}
            className="w-full min-h-[120px] rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-4 py-3 text-base text-gray-900 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-gray-500 shadow-sm focus-visible:border-blue-500 focus-visible:ring-2 focus-visible:ring-blue-200 dark:focus-visible:ring-blue-800 transition resize-y mb-2"
            placeholder={t('step_three.prompt_placeholder', 'Write your prompt...')}
          />
          {/* Generate button moved to bottom */}
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
              {t('step_three.processing_info', 'Once submitted, your ad request will be processed. This may take a few minutes.')}
            </p>
          </div>
        </div>
      </div>
      
      <div className="flex justify-between items-center gap-4 pb-8">
        <BackButton onClick={handleBack} isLoading={isBackSubmitting} />
        <Button
          variant="outline"
          className="group h-10 px-4 py-2 text-sm font-medium"
          onClick={handleGenerateVersion}
          disabled={isGenerating}
        >
          {isGenerating ? (
            <span className="flex items-center"><Sparkles className="w-4 h-4 mr-1 animate-spin text-yellow-400 dark:text-yellow-300" strokeWidth={2.2} /> {t('step_three.generating', 'Generating...')}</span>
          ) : (
            <><Sparkles className="w-4 h-4 mr-1 text-yellow-400 dark:text-yellow-300 group-hover:text-yellow-500 transition-colors duration-200" strokeWidth={2.2} />{t('step_three.generate', 'Generate')}</>
          )}
        </Button>
      </div>
    </div>
  );
};

export default StepThreeComponent;
