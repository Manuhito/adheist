import React, { useState, useEffect } from "react";
import { createRoot } from "react-dom/client";
import { Card, CardContent } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { useTranslation } from "../lib/useTranslation";
import { Skeleton } from "../shadcn/components/ui/skeleton";
import { ArrowLeft, Sparkles, AlertCircle, Star, ThumbsUp } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "../shadcn/components/ui/tooltip";
import AnimatedDownloadButton from "../components/ui/animated-download-button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "../shadcn/components/ui/dialog";
import { useToast } from "../hooks/use-toast";

// Debug log
console.log("Revision AdRequest script loaded");

// Component to display the generated image from the latest AdRequestVersion
const RevisionAdRequest = () => {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [adRequestData, setAdRequestData] = useState(null);
  const [versions, setVersions] = useState([]);
  const [currentVersionIndex, setCurrentVersionIndex] = useState(0);
  const [userPrompt, setUserPrompt] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [availableVersionCredits, setAvailableVersionCredits] = useState(0); // Available credits for creating new versions
  
  // Rating state
  const [ratingOpen, setRatingOpen] = useState(false);
  const [rating, setRating] = useState(0);
  const [ratingComment, setRatingComment] = useState("");
  const [hoveredRating, setHoveredRating] = useState(0);

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
            
            // Get available version credits from JSON data
            if (jsonData.available_version_credits !== undefined) {
              console.log("Available version credits:", jsonData.available_version_credits);
              setAvailableVersionCredits(jsonData.available_version_credits);
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
    // Validate that prompt is not empty
    if (!userPrompt.trim()) {
      console.error(t('revision.prompt_required', 'Please enter a prompt before generating'));
      return;
    }
    
    if (!adRequestData?.id) {
      console.error(t('revision.no_request_id', 'No ad request ID available'));
      return;
    }
    
    // Check if we have a current version with an image
    const currentVersion = versions[currentVersionIndex];
    if (!currentVersion || !currentVersion.generated_image) {
      console.error(t('revision.no_image_available', 'No image available for revision'));
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
      
      // Then create a new revision using the current image
      const revisionFormData = new FormData();
      revisionFormData.append('ad_request', adRequestData.id);
      revisionFormData.append('user_prompt', userPrompt);
      revisionFormData.append('url_image_revision', currentVersion.generated_image);
      
      const response = await fetch('/ads/adrequest/revision/create/', {
        method: 'POST',
        body: revisionFormData,
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
    <div className="w-full min-h-screen flex flex-col">
      <div className="container mx-auto py-8 px-4">
        <Button
          variant="outline"
          className="mb-6 flex items-center gap-2"
          onClick={handleBackClick}
        >
          <ArrowLeft className="h-4 w-4" />
          {t("ad_requests.back_to_list", "Back to Ad Requests")}
        </Button>

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
          <div className="flex-1 w-full max-w-7xl mx-auto px-2 sm:px-4">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
              {/* Summary section lateral izquierdo */}
              <aside className="lg:col-span-4 mb-8 lg:mb-0 h-full flex flex-col">
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 flex flex-col gap-y-4 items-start h-full">
                  <h2 className="text-xl font-semibold mb-4">{t("revision.summary", "Summary")}</h2>
                  <div className="bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 p-4 rounded-md h-full w-full flex flex-col flex-1">
                    <div className="flex flex-col gap-6">
                      {/* Row 1: Ad Style */}
                      <div className="flex flex-col">
                        <h3 className="text-sm font-medium mb-2">{t("revision.ad_style", "Ad Style")}</h3>
                        <div className="group relative w-32 h-32 rounded-lg overflow-hidden shadow border bg-white dark:bg-gray-800">
                          {adRequestData?.user_uploaded_image ? (
                            <>
                              <img
                                src={adRequestData.user_uploaded_image}
                                alt={t("revision.user_uploaded_image", "User Uploaded Image")}
                                className="object-cover w-full h-full transition-transform duration-300 group-hover:scale-105"
                              />
                              <div className="absolute inset-0 bg-black/70 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col justify-center items-center text-white p-2">
                                <h4 className="text-sm font-semibold mb-1">{t("revision.custom_image", "Custom Image")}</h4>
                                <p className="text-xs mb-1 text-center">{t("revision.user_uploaded", "User uploaded")}</p>
                              </div>
                            </>
                          ) : adRequestData?.ad_library_id ? (
                            <>
                              <img
                                src={adRequestData.ad_image || "https://images.unsplash.com/photo-1557804506-669a67965ba0"}
                                alt={adRequestData.ad_library_name || t("revision.ad_preview", "Ad Preview")}
                                className="object-cover w-full h-full transition-transform duration-300 group-hover:scale-105"
                              />
                              <div className="absolute inset-0 bg-black/70 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col justify-center items-center text-white p-2">
                                <h4 className="text-sm font-semibold mb-1">{adRequestData.ad_library_name || t("revision.no_name", "No name")}</h4>
                                {adRequestData.industries && adRequestData.industries.length > 0 && (
                                  <p className="text-xs mb-1 text-center">{adRequestData.industries.join(", ")}</p>
                                )}
                                {adRequestData.tags && adRequestData.tags.length > 0 && (
                                  <p className="text-xs text-blue-200">{adRequestData.tags.join(", ")}</p>
                                )}
                              </div>
                            </>
                          ) : (
                            <div className="flex items-center justify-center w-full h-full text-gray-400">{t("revision.no_image", "No image")}</div>
                          )}
                        </div>
                      </div>

                      {/* Row 2: Brand Logo */}
                      <div className="flex flex-col">
                        <h3 className="text-sm font-medium mb-2">{t("revision.brand_logo", "Brand Logo")}</h3>
                        <div className="group relative w-32 h-32 rounded-lg overflow-hidden shadow border bg-white dark:bg-gray-800 flex items-center justify-center p-2">
                          {adRequestData?.asset_overrides?.logo_url ? (
                            <>
                              <img
                                src={adRequestData.asset_overrides.logo_url}
                                alt={t("revision.brand_logo", "Brand Logo")}
                                className="max-w-full max-h-full object-contain transition-transform duration-300 group-hover:scale-105"
                              />
                            </>
                          ) : (
                            <div className="flex items-center justify-center w-full h-full text-gray-400">{t("revision.no_logo", "No logo")}</div>
                          )}
                        </div>
                      </div>

                      {/* Row 3: Brand Details */}
                      <div className="flex flex-col">
                        <h3 className="text-sm font-medium mb-2">{t("revision.brand_details", "Brand Details")}</h3>
                        <div className="flex-1 w-full">
                          {/* Brand Color Display */}
                          <div className="mb-3">
                            {adRequestData?.asset_overrides?.main_hex_color ? (
                              <div className="flex items-center gap-2">
                                <div
                                  className="h-6 w-6 rounded-md border"
                                  style={{ backgroundColor: adRequestData.asset_overrides.main_hex_color }}
                                />
                                <span className="text-xs">
                                  {adRequestData.asset_overrides.main_hex_color}
                                </span>
                              </div>
                            ) : (
                              <span className="text-xs text-gray-400">{t("revision.no_brand_color", "No brand color")}</span>
                            )}
                          </div>
                          {/* Company Website Display */}
                          <div className="mb-3">
                            {adRequestData?.asset_overrides?.company_website ? (
                              <a
                                href={adRequestData.asset_overrides.company_website}
                                className="text-xs text-blue-600 underline break-all"
                                target="_blank" rel="noopener noreferrer"
                              >
                                {adRequestData.asset_overrides.company_website}
                              </a>
                            ) : (
                              <span className="text-xs text-gray-400">{t("revision.no_company_website", "No company website")}</span>
                            )}
                          </div>
                          {/* Key Benefits Display */}
                          <div className="mb-3">
                            {adRequestData?.asset_overrides?.key_benefits ? (
                              <span className="text-xs">
                                {adRequestData.asset_overrides.key_benefits}
                              </span>
                            ) : (
                              <span className="text-xs text-gray-400">{t("revision.no_key_benefits", "No key benefits")}</span>
                            )}
                          </div>
                          {/* Canvas Size Display */}
                          <div className="mb-2">
                            {(() => {
                              const canvasSizes = [
                                { id: '1024x1024', label: t("revision.square", "Square"), size: '1024 x 1024' },
                                { id: '1536x1024', label: t("revision.landscape", "Landscape"), size: '1536 x 1024' },
                                { id: '1024x1536', label: t("revision.portrait", "Portrait"), size: '1024 x 1536' },
                                { id: 'auto', label: t("revision.auto_desc", "Automatic"), size: t("revision.auto", "Auto") },
                              ];
                              const item = canvasSizes.find(c => c.id === adRequestData?.canvas_size);
                              if (item) {
                                return (
                                  <div className="flex flex-col">
                                    {item.id === "1024x1024" && (
                                      <div className="w-8 h-8 border-2 border-gray-300 rounded-sm mb-2" />
                                    )}
                                    {item.id === "1536x1024" && (
                                      <div className="w-12 h-8 border-2 border-gray-300 rounded-sm mb-2" />
                                    )}
                                    {item.id === "1024x1536" && (
                                      <div className="w-8 h-12 border-2 border-gray-300 rounded-sm mb-2" />
                                    )}
                                    {item.id === "auto" && (
                                      <div className="w-8 h-8 border-2 border-dashed border-gray-300 rounded-full flex items-center justify-center mb-2 text-xs text-gray-400">{t("revision.auto", "Auto")}</div>
                                    )}
                                    <span className="font-semibold text-xs">{item.label}</span>
                                    <span className="text-xs text-gray-500">{item.size}</span>
                                  </div>
                                );
                              }
                              return (
                                <div className="flex flex-col">
                                  <div className="w-8 h-8 border-2 border-dashed border-gray-200 rounded-sm mb-2 flex items-center justify-center text-xs text-gray-400">?</div>
                                  <span className="font-semibold text-xs text-gray-400">{t("revision.unknown", "Unknown")}</span>
                                  <span className="text-xs text-gray-400">{adRequestData?.canvas_size || t("revision.not_specified", "Not specified")}</span>
                                </div>
                              );
                            })()}
                          </div>
                        </div>
                        
                        {/* Product and Service Images */}
                        {(() => {
                          const productServiceImages = [
                            { key: 'product_image_1_url', label: t('revision.product_1', 'Product 1') },
                            { key: 'product_image_2_url', label: t('revision.product_2', 'Product 2') },
                            { key: 'app_image_1_url', label: t('revision.service_1', 'Service 1') },
                            { key: 'app_image_2_url', label: t('revision.service_2', 'Service 2') },
                          ].filter(img => adRequestData?.asset_overrides?.[img.key]);

                          if (productServiceImages.length === 0) return null;

                          return (
                            <div className="flex flex-col mt-4">
                              <h3 className="text-sm font-medium mb-2">{t("revision.product_service_images", "Product & Service Images")}</h3>
                              <div className="flex flex-wrap gap-2">
                                {productServiceImages.map(img => (
                                  <div key={img.key} className="flex flex-col items-center">
                                    <img
                                      src={adRequestData.asset_overrides[img.key]}
                                      alt={img.label}
                                      className="w-16 h-16 object-cover rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-sm"
                                      loading="lazy"
                                    />
                                    <span className="text-xs mt-1">{img.label}</span>
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
              </aside>

              {/* Main content area */}
              <main className="lg:col-span-8 flex flex-col">
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

                          <div className="w-full flex justify-center items-center mb-4" style={{ height: '50vh' }}>
                            <img
                              src={currentVersion.generated_image}
                              alt={t("ad_requests.generated_image", "Generated Ad Image")}
                              className="max-h-full max-w-full object-contain rounded-lg shadow-lg"
                              style={{ maxHeight: '100%' }}
                            />
                          </div>

                          {/* Download and Rating buttons */}
                          <div className="flex items-center justify-center gap-4 mb-2">
                            <AnimatedDownloadButton
                              downloadUrl={currentVersion.generated_image}
                              fileName={`ad-image-${currentVersion.version_index}.jpg`}
                            />
                            
                            <Dialog open={ratingOpen} onOpenChange={setRatingOpen}>
                              <DialogTrigger asChild>
                                <Button 
                                  variant="outline" 
                                  className="flex items-center gap-2 hover:bg-blue-100 hover:text-blue-700 dark:hover:bg-blue-900 dark:hover:text-blue-300 transition-colors"
                                >
                                  <ThumbsUp className="h-4 w-4" />
                                  {t("revision.rate_image", "Rate this image")}
                                </Button>
                              </DialogTrigger>
                              <DialogContent>
                                <DialogHeader>
                                  <DialogTitle>{t("revision.rate_title", "Rate this generation")}</DialogTitle>
                                </DialogHeader>
                                <div className="py-4">
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
                                      {t("revision.comment_label", "Review")}
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
                                  </div>
                                </div>
                                <DialogFooter>
                                  <Button variant="outline" onClick={() => setRatingOpen(false)}>
                                    {t("revision.cancel", "Cancel")}
                                  </Button>
                                  <Button 
                                    onClick={() => {
                                      // Get CSRF token from cookie
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
                                      formData.append('version_id', currentVersion.id);
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
                                          toast({
                                            title: t("revision.rating_success", "Rating submitted"),
                                            description: t("revision.rating_success_message", "Thank you for your feedback!"),
                                            variant: "success",
                                          });
                                        } else {
                                          toast({
                                            title: t("revision.rating_error", "Error"),
                                            description: data.error || t("revision.rating_error_message", "Failed to submit rating. Please try again."),
                                            variant: "destructive",
                                          });
                                        }
                                      })
                                      .catch(error => {
                                        console.error('Error submitting rating:', error);
                                        toast({
                                          title: t("revision.rating_error", "Error"),
                                          description: t("revision.rating_error_message", "Failed to submit rating. Please try again."),
                                          variant: "destructive",
                                        });
                                      })
                                      .finally(() => {
                                        setRatingOpen(false);
                                      });
                                    }}
                                    disabled={rating === 0 || !ratingComment.trim()}
                                  >
                                    {t("revision.submit_rating", "Submit")}
                                  </Button>
                                </DialogFooter>
                              </DialogContent>
                            </Dialog>
                          </div>

                          <div className="w-full flex justify-between text-sm text-gray-500 mt-2 px-2">
                            <div>
                              {new Date(currentVersion.created_at).toLocaleDateString()}
                            </div>
                            <div>
                              {currentVersion.version_index} {t("revision.revision", "Revision")} ({availableVersionCredits} {t("revision.credits_available", "credits available")})
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
                      {t("revision.prompt_label", "Additional instructions?")}
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
                              className={`w-full min-h-[120px] rounded-lg border ${availableVersionCredits <= 0 ? 'bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 opacity-75 cursor-not-allowed border-gray-400 dark:border-gray-600' : 'bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 border-gray-300 dark:border-gray-700'} px-4 py-3 text-base placeholder:text-gray-400 dark:placeholder:text-gray-500 shadow-sm focus-visible:border-blue-500 focus-visible:ring-2 focus-visible:ring-blue-200 dark:focus-visible:ring-blue-800 transition resize-y mb-2`}
                              placeholder={t("revision.prompt_placeholder", "Write your prompt...")}
                              disabled={availableVersionCredits <= 0}
                            />
                          </div>
                        </TooltipTrigger>
                        {availableVersionCredits <= 0 && (
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
                            disabled={isGenerating || availableVersionCredits <= 0 || !userPrompt.trim()}
                          >
                            {isGenerating ? (
                              <span className="flex items-center"><Sparkles className="w-4 h-4 mr-1 animate-spin text-yellow-400 dark:text-yellow-300" strokeWidth={2.2} /> {t("revision.generating", "Generating...")}</span>
                            ) : (
                              <><Sparkles className="w-4 h-4 mr-1 text-yellow-400 dark:text-yellow-300 group-hover:text-yellow-500 transition-colors duration-200" strokeWidth={2.2} />{t("revision.generate", "Generate")}</>
                            )}
                          </Button>
                        </div>
                      </TooltipTrigger>
                      {availableVersionCredits <= 0 && (
                        <TooltipContent>
                          <p>{t('revision.version_limit_reached', 'Version limit reached. No more versions can be generated.')}</p>
                        </TooltipContent>
                      )}
                      {!userPrompt.trim() && availableVersionCredits > 0 && (
                        <TooltipContent>
                          <p>{t('revision.prompt_required', 'Please enter a prompt before generating')}</p>
                        </TooltipContent>
                      )}
                    </Tooltip>
                  </TooltipProvider>
                </div>
              </main>
            </div>
          </div>
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
