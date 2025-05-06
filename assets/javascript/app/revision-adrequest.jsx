import React, { useState, useEffect } from "react";
import { createRoot } from "react-dom/client";
import { Card, CardContent } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { useTranslation } from "../lib/useTranslation";
import { Skeleton } from "../shadcn/components/ui/skeleton";
import { ArrowLeft, Sparkles, AlertCircle } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "../shadcn/components/ui/tooltip";
import AnimatedDownloadButton from "../components/ui/animated-download-button";

// Debug log
console.log("Revision AdRequest script loaded");

// Component to display the generated image from the latest AdRequestVersion
const RevisionAdRequest = () => {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [adRequestData, setAdRequestData] = useState(null);
  const [versions, setVersions] = useState([]);
  const [currentVersionIndex, setCurrentVersionIndex] = useState(0);
  const [userPrompt, setUserPrompt] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [total_versions, setTotalVersions] = useState(2); // Default to 2 if not specified

  useEffect(() => {
    const loadAdRequestData = () => {
      try {
        // Get the ad request data from the JSON script tag
        const dataScript = document.getElementById("adrequest-data");
        
        if (!dataScript) {
          throw new Error("Ad request data script not found");
        }
        
        try {
          const jsonData = JSON.parse(dataScript.textContent);
          console.log("Ad request data from script:", jsonData);
          
          // Set the ad request data
          setAdRequestData(jsonData);
          
          // Process versions data
          if (jsonData.versions && jsonData.versions.length > 0) {
            console.log("Versions found:", jsonData.versions);
            setVersions(jsonData.versions);
            setCurrentVersionIndex(0); // Start with the first version (newest)
            
            // Get total_versions from JSON data
            if (jsonData.total_versions) {
              console.log("Total versions:", jsonData.total_versions);
              setTotalVersions(jsonData.total_versions);
            }
          } else {
            setError("No versions found for this ad request");
          }
        } catch (e) {
          console.error("Error parsing JSON data:", e);
          throw new Error("Error parsing ad request data");
        }
      } catch (error) {
        console.error("Error loading ad request data:", error);
        setError(error.message || "Error loading ad request details");
      } finally {
        setLoading(false);
      }
    };

    loadAdRequestData();
  }, []);

  const handleBackClick = () => {
    // Navigate back to the ad requests page
    window.location.href = "/ads/";
  };

  // Handle version navigation
  const handleVersionChange = (direction) => {
    if (direction === 'prev' && currentVersionIndex < versions.length - 1) {
      setCurrentVersionIndex(currentVersionIndex + 1);
    } else if (direction === 'next' && currentVersionIndex > 0) {
      setCurrentVersionIndex(currentVersionIndex - 1);
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

  // Generate version handler
  const handleGenerateVersion = async () => {
    if (!adRequestData?.id) {
      console.error(t('revision.no_request_id', 'No ad request ID available'));
      return;
    }
    
    setIsGenerating(true);
    
    try {
      // First, update status to SUBMITTED in the backend
      const statusFormData = new FormData();
      statusFormData.append('status', 'REOPENED');
      
      const statusResponse = await fetch(`/ads/adrequest/${adRequestData.id}/update/`, {
        method: 'POST',
        headers: { 'X-CSRFToken': getCsrfToken() },
        body: statusFormData
      });
      
      if (!statusResponse.ok) {
        const errorData = await statusResponse.json();
        throw new Error(errorData.error || t('revision.update_status_failed', 'Failed to update status to SUBMITTED'));
      }
      
      // Then create a new version
      const versionFormData = new FormData();
      versionFormData.append('ad_request', adRequestData.id);
      versionFormData.append('user_prompt', userPrompt);
      
      const response = await fetch('/ads/adrequest/version/create/', {
        method: 'POST',
        body: versionFormData,
        headers: {
          'X-CSRFToken': getCsrfToken(),
        },
      });
      
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || t('revision.generate_version_error', 'Error generating version'));
      }
      
      // Save flag to show alert on home page and redirect
      sessionStorage.setItem('ads_success_alert', '1');
      window.location.href = '/ads/';
    } catch (error) {
      console.error('Error generating version:', error);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="container mx-auto py-8 px-4">
      <Button 
        variant="outline" 
        className="mb-6 flex items-center gap-2"
        onClick={handleBackClick}
      >
        <ArrowLeft className="h-4 w-4" />
        {t("ad_requests.back_to_list", "Back to Ad Requests")}
      </Button>

      <h1 className="text-3xl font-bold mb-6">
        {adRequestData?.ad_library_name || t("ad_requests.ad_details", "Ad Request Details")}
      </h1>

      {loading ? (
        <Card className="w-full">
          <CardContent className="p-6">
            <Skeleton className="h-[400px] w-full rounded-lg mb-4" />
            <Skeleton className="h-8 w-1/3 mb-2" />
            <Skeleton className="h-4 w-1/2 mb-2" />
            <Skeleton className="h-4 w-2/3" />
          </CardContent>
        </Card>
      ) : error ? (
        <Card className="w-full">
          <CardContent className="p-6">
            <div className="text-center py-8">
              <p className="text-red-500 mb-4">{error}</p>
              <Button onClick={handleBackClick}>
                {t("ad_requests.back_to_list", "Back to Ad Requests")}
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : versions.length > 0 ? (
        <>
          {/* Get the current version */}
          {(() => {
            const currentVersion = versions[currentVersionIndex];
            return (
              <Card className="w-full">
                <CardContent className="p-6">
                  <div className="flex flex-col items-center">
                    {/* Version navigation buttons */}
                    <div className="w-full flex justify-between mb-4">
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => handleVersionChange('prev')}
                        disabled={currentVersionIndex >= versions.length - 1}
                        className={currentVersionIndex >= versions.length - 1 ? "invisible" : ""}
                      >
                        {t("revision.previous_version", "Previous Version")}
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => handleVersionChange('next')}
                        disabled={currentVersionIndex <= 0}
                        className={currentVersionIndex <= 0 ? "invisible" : ""}
                      >
                        {t("revision.next_version", "Next Version")}
                      </Button>
                    </div>
                    
                    <img 
                      src={currentVersion.generated_image} 
                      alt={t("ad_requests.generated_image", "Generated Ad Image")} 
                      className="max-w-full h-auto rounded-lg shadow-lg mb-2"
                    />
                    
                    {/* Download button */}
                    <AnimatedDownloadButton 
                      downloadUrl={currentVersion.generated_image}
                      fileName={`ad-image-${currentVersion.version_index}.jpg`}
                    />
                    
                    <div className="w-full flex justify-between text-sm text-gray-500 mt-2 px-2">
                      <div>
                        {new Date(currentVersion.created_at).toLocaleDateString()}
                      </div>
                      <div>
                        {currentVersion.version_index}/{total_versions} {t("revision.revision", "Revision")}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })()
          }
          
          {/* Text area and Generate button */}
          <div className="flex flex-col items-center justify-center mt-8">
            <div className="space-y-2 w-full min-w-[300px] max-w-2xl">
              <label htmlFor="user-prompt" className="block text-lg font-medium text-primary mb-2 text-center">
                {t("revision.prompt_label", "What message do you want to transmit or additional instructions?")}
              </label>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div>
                      <textarea
                        id="user-prompt"
                        value={userPrompt}
                        onChange={e => setUserPrompt(e.target.value)}
                        rows={5}
                        className={`w-full min-h-[120px] rounded-lg border ${versions.length >= total_versions ? 'bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 opacity-75 cursor-not-allowed border-gray-400 dark:border-gray-600' : 'bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 border-gray-300 dark:border-gray-700'} px-4 py-3 text-base placeholder:text-gray-400 dark:placeholder:text-gray-500 shadow-sm focus-visible:border-blue-500 focus-visible:ring-2 focus-visible:ring-blue-200 dark:focus-visible:ring-blue-800 transition resize-y mb-2`}
                        placeholder={t("revision.prompt_placeholder", "Write your prompt...")}
                        disabled={versions.length >= total_versions}
                      />
                    </div>
                  </TooltipTrigger>
                  {versions.length >= total_versions && (
                    <TooltipContent>
                      <p>{t('revision.version_limit_reached', 'Version limit reached. No more versions can be generated.')}</p>
                    </TooltipContent>
                  )}
                </Tooltip>
              </TooltipProvider>
            </div>
          </div>
          
          {/* Info message */}
          <div className="bg-blue-50 border-l-4 border-blue-400 p-4 my-6">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-blue-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <p className="text-sm text-blue-700">
                  {t("revision.processing_info", "Once submitted, your ad request will be processed. This may take a few minutes.")}
                </p>
              </div>
            </div>
          </div>
          
          {/* Generate button */}
          <div className="flex justify-center items-center pb-8">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div>
                    <Button
                      variant="outline"
                      className="group h-10 px-4 py-2 text-sm font-medium"
                      onClick={handleGenerateVersion}
                      disabled={isGenerating || versions.length >= total_versions}
                    >
                      {isGenerating ? (
                        <span className="flex items-center"><Sparkles className="w-4 h-4 mr-1 animate-spin text-yellow-400 dark:text-yellow-300" strokeWidth={2.2} /> {t("revision.generating", "Generating...")}</span>
                      ) : (
                        <><Sparkles className="w-4 h-4 mr-1 text-yellow-400 dark:text-yellow-300 group-hover:text-yellow-500 transition-colors duration-200" strokeWidth={2.2} />{t("revision.generate", "Generate")}</>
                      )}
                    </Button>
                  </div>
                </TooltipTrigger>
                {versions.length >= total_versions && (
                  <TooltipContent>
                    <p>{t('revision.version_limit_reached', 'Version limit reached. No more versions can be generated.')}</p>
                  </TooltipContent>
                )}
              </Tooltip>
            </TooltipProvider>
          </div>
        </>
      ) : (
        <Card className="w-full">
          <CardContent className="p-6">
            <div className="text-center py-8">
              <p className="text-gray-500 mb-4">
                {t("ad_requests.no_version_found", "No version with generated image found for this ad request.")}
              </p>
              <Button onClick={handleBackClick}>
                {t("ad_requests.back_to_list", "Back to Ad Requests")}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

// Function to initialize the React component
function initRevisionAdRequest() {
  console.log("Initializing Revision AdRequest");
  const container = document.getElementById("revision-adrequest-container");
  console.log("Container:", container);
  
  if (container) {
    try {
      const root = createRoot(container);
      root.render(<RevisionAdRequest />);
      console.log("Revision AdRequest rendered");
    } catch (error) {
      console.error("Error rendering Revision AdRequest:", error);
    }
  } else {
    console.error("Container not found: revision-adrequest-container");
  }
}

// Try to render immediately if the DOM is already ready
if (document.readyState === "complete" || document.readyState === "interactive") {
  console.log("DOM already ready, initializing immediately");
  setTimeout(initRevisionAdRequest, 100); // Small delay to ensure everything is loaded
} else {
  // Otherwise, wait for the DOM to be ready
  console.log("Waiting for DOMContentLoaded");
  document.addEventListener("DOMContentLoaded", initRevisionAdRequest);
}

export default RevisionAdRequest;
