import React, { useState, useEffect } from "react";
import { createRoot } from "react-dom/client";
import { Card, CardContent } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { useTranslation } from "../lib/useTranslation";
import { Skeleton } from "../shadcn/components/ui/skeleton";
import { ArrowLeft } from "lucide-react";

// Debug log
console.log("Revision AdRequest script loaded");

// Component to display the generated image from the latest AdRequestVersion
const RevisionAdRequest = () => {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [adRequestData, setAdRequestData] = useState(null);
  const [latestVersion, setLatestVersion] = useState(null);

  useEffect(() => {
    const fetchAdRequestDetails = async () => {
      try {
        // Get the ad request data from the JSON script tag
        let adRequestId = null;
        const dataScript = document.getElementById("adrequest-data");
        
        if (dataScript) {
          try {
            const jsonData = JSON.parse(dataScript.textContent);
            adRequestId = jsonData.id;
            console.log("Found adRequestId from JSON script:", adRequestId);
          } catch (e) {
            console.error("Error parsing JSON data:", e);
          }
        }
        
        if (!adRequestId) {
          throw new Error("Ad request ID not found");
        }

        // Fetch the ad request details
        console.log("Fetching ad request details for ID:", adRequestId);
        const response = await fetch(`/ads/adrequest/${adRequestId}/get/`);
        
        if (!response.ok) {
          throw new Error(`Error fetching ad request: ${response.statusText}`);
        }
        
        const data = await response.json();
        console.log("Ad request data received:", data);
        setAdRequestData(data);
        
        // Find the latest version with a generated image
        if (data.versions && data.versions.length > 0) {
          // Sort versions by created_at in descending order (newest first)
          const sortedVersions = [...data.versions].sort((a, b) => 
            new Date(b.created_at) - new Date(a.created_at)
          );
          
          // Find the first version with a generated image
          const versionWithImage = sortedVersions.find(v => v.generated_image);
          console.log("Version with image found:", versionWithImage);
          
          if (versionWithImage) {
            setLatestVersion(versionWithImage);
          } else {
            setError("No generated image found for this ad request");
          }
        } else {
          setError("No versions found for this ad request");
        }
      } catch (error) {
        console.error("Error fetching ad request details:", error);
        setError(error.message || "Error loading ad request details");
      } finally {
        setLoading(false);
      }
    };

    fetchAdRequestDetails();
  }, []);

  const handleBackClick = () => {
    // Navigate back to the ad requests page
    window.location.href = "/ads/";
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
      ) : latestVersion ? (
        <Card className="w-full">
          <CardContent className="p-6">
            <div className="flex flex-col items-center">
              <img 
                src={latestVersion.generated_image} 
                alt={t("ad_requests.generated_image", "Generated Ad Image")} 
                className="max-w-full h-auto rounded-lg shadow-lg mb-6"
              />
              
              <div className="w-full mt-4">
                <h2 className="text-xl font-semibold mb-2">
                  {t("ad_requests.prompt_used", "Prompt Used")}
                </h2>
                <div className="bg-gray-100 p-4 rounded-md mb-4 whitespace-pre-wrap">
                  {latestVersion.generated_prompt || latestVersion.user_prompt || 
                   t("ad_requests.no_prompt", "No prompt information available")}
                </div>
                
                <div className="text-sm text-gray-500 mt-4">
                  {t("ad_requests.created_at", "Created")}: {new Date(latestVersion.created_at).toLocaleString()}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
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
