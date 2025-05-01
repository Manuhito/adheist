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
            // Find the first version with a generated image (they should already be sorted by created_at)
            const versionWithImage = jsonData.versions[0]; // Take the first one as they're already sorted in the view
            console.log("Version with image found:", versionWithImage);
            
            if (versionWithImage) {
              setLatestVersion(versionWithImage);
            } else {
              setError("No generated image found for this ad request");
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
              
              <div className="w-full flex justify-between text-sm text-gray-500 mt-4 px-2">
                <div>
                  {new Date(latestVersion.created_at).toLocaleDateString()}
                </div>
                <div>
                      {latestVersion.version_index}/{latestVersion.total_versions} {t("ad_requests.revisions", "Revisions")}
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
