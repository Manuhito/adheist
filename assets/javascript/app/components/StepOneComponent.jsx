import React, { useState, useEffect } from 'react';
import { SearchComponent } from './SearchComponent';
import { FilterFormComponent } from './FilterFormComponent';
import InteractiveBentoGallery from '../../components/ui/interactive-bento-gallery.jsx';
import { Building, X, Upload, ImageIcon } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../../shadcn/components/ui/tooltip';
import { NextButton } from '../../components/ui/next-button.jsx';
import { useTranslation } from '../../lib/useTranslation';
import { ImageUpload } from '../../components/ui/image-upload';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../shadcn/components/ui/tabs';

/**
 * Step One Component for the Create Ad Request flow
 * Handles selection of ad library and canvas size
 * Based on the original CreateAdRequestApp component
 */
const StepOneComponent = ({ onComplete, initialData = {}, refreshData }) => {
  const { t } = useTranslation();
  // Centralized state for all filters
  const [selectedCompany, setSelectedCompany] = useState(null);
  const [selectedIndustries, setSelectedIndustries] = useState([]);
  const [selectedTags, setSelectedTags] = useState([]);
  const [filteredResults, setFilteredResults] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  // Initialize selected canvas size directly with the size value from initialData
  const [selectedCanvasSize, setSelectedCanvasSize] = useState(initialData.canvas_size || null);
  const [selectedAdLibrary, setSelectedAdLibrary] = useState(initialData.ad_library_id || null);
  // State for user uploaded image (both URL preview and File object)
  const [userUploadedImage, setUserUploadedImage] = useState(null);
  const [userUploadedFile, setUserUploadedFile] = useState(null);
  const [imageSource, setImageSource] = useState(initialData.ad_library_id ? 'library' : 'upload');
  // Key for forcing re-render of ImageUpload component
  const [imageUploadKey, setImageUploadKey] = useState(Date.now());
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState(null);

  // Function to call the API with all filters
  const fetchFilteredResults = () => {
    // Build URL with parameters
    const params = new URLSearchParams();
    setIsLoading(true);

    // Add company if one is selected
    if (selectedCompany) {
      params.append('company_name', selectedCompany);
    }

    // Add industries if any are selected
    if (selectedIndustries && selectedIndustries.length > 0) {
      selectedIndustries.forEach(industry => params.append('industries', industry));
    }

    // Add tags if any are selected
    if (selectedTags && selectedTags.length > 0) {
      selectedTags.forEach(tag => params.append('tags', tag));
    }

    // Always call the API, even when no filters are selected
    fetch(`/ads/adlibraries/?${params.toString()}`)
      .then(response => response.json())
      .then(data => {
        // Verify data structure
        if (data && Array.isArray(data)) {
          // If data is directly an array
          setFilteredResults(data);
        } else if (data && Array.isArray(data.results)) {
          // If data has a results property that is an array
          setFilteredResults(data.results);
        } else if (data && Array.isArray(data.adlibraries)) {
          // If data has an adlibraries property that is an array
          setFilteredResults(data.adlibraries);
        } else if (data && typeof data === 'object') {
          // If data is an object, try to convert it to an array
          const resultsArray = Object.values(data).filter(item => typeof item === 'object');

          // If the first element is an array, use it directly
          if (resultsArray.length > 0 && Array.isArray(resultsArray[0])) {
            setFilteredResults(resultsArray[0]);
          } else {
            setFilteredResults(resultsArray);
          }
        } else {
          // If structure cannot be determined, set an empty array
          setFilteredResults([]);
        }

        setIsLoading(false);
      })
      .catch(error => {
        console.error('Error applying filters:', error);
        setFilteredResults([]);
        setIsLoading(false);
      });
  };

  // Transform API results to gallery media items format
  const transformToMediaItems = (apiResults) => {
    if (!apiResults || apiResults.length === 0) {
      return [];
    }

    // Extract required fields from each item
    return apiResults.map((item, index) => {
      // Try to find the necessary fields
      const title = item.company_name || item.name || item.title || "Company " + (index + 1);

      // Handle tags that can be string or array
      let desc = "";
      if (item.tags) {
        if (Array.isArray(item.tags)) {
          desc = item.tags.join(", ");
        } else if (typeof item.tags === 'string') {
          desc = item.tags;
        }
      } else if (item.description) {
        desc = item.description;
      }

      // Look for image URL in different possible properties
      const imageUrl = item.ad_image || item.image || item.url || item.image_url ||
        "https://images.unsplash.com/photo-1557804506-669a67965ba0";

      // Get industry information if available
      let industry = "";
      if (item.industry) {
        industry = item.industry;
      } else if (item.industries && Array.isArray(item.industries) && item.industries.length > 0) {
        industry = item.industries.join(", ");
      } else if (item.facebook_page && item.facebook_page.industries && Array.isArray(item.facebook_page.industries) && item.facebook_page.industries.length > 0) {
        industry = item.facebook_page.industries.join(", ");
      }

      return {
        id: item.id || index + 1,
        type: "image",
        title: title,
        desc: desc,
        url: imageUrl,
        industry: industry
      };
    });
  };

  // Call the API when any filter changes
  useEffect(() => {
    fetchFilteredResults();
  }, [selectedCompany, selectedIndustries, selectedTags]);

  // Fetch fresh data when component mounts
  useEffect(() => {
    if (refreshData && initialData?.id) {
      refreshData();
    }
  }, []);

  // Handlers for each filter type
  const handleCompanyChange = (company) => {
    setSelectedCompany(company);
  };

  const handleIndustriesChange = (industries) => {
    setSelectedIndustries(industries);
  };

  const handleTagsChange = (tags) => {
    setSelectedTags(tags);
  };

  // Prepare media items for the gallery
  const galleryItems = transformToMediaItems(filteredResults);

  // Handle canvas size change
  const handleCanvasSizeChange = (sizeId) => {
    setSelectedCanvasSize(sizeId);
  };

  // Handle image upload
  const handleImageUpload = async (imageUrl, imageFile) => {
    console.log('Image upload handler called with:', { imageUrl, imageFile });
    
    // If we're removing the image
    if (!imageUrl) {
      setUserUploadedImage(null);
      setUserUploadedFile(null);
      return;
    }
    
    // Process the image URL - similar to StepTwoComponent
    if (imageUrl.startsWith('blob:')) {
      try {
        console.log('Processing blob URL...');
        // Fetch the blob data
        const blobResponse = await fetch(imageUrl);
        const blob = await blobResponse.blob();
        
        // Create a File object from the blob
        const filename = `user_uploaded_image_${Date.now()}.${blob.type.split('/')[1] || 'png'}`;
        const file = new File([blob], filename, { type: blob.type });
        
        console.log('Created file:', file.name, 'type:', file.type, 'size:', file.size);
        
        // Store both the URL and the File
        setUserUploadedImage(imageUrl);
        setUserUploadedFile(file);
      } catch (error) {
        console.error('Error processing blob URL:', error);
        // If there's an error, use the file provided by the hook if available
        if (imageFile) {
          console.log('Using file provided by hook:', imageFile.name);
          setUserUploadedImage(imageUrl);
          setUserUploadedFile(imageFile);
        }
      }
    } else {
      // For non-blob URLs (e.g., server URLs)
      console.log('Using non-blob URL:', imageUrl);
      setUserUploadedImage(imageUrl);
      setUserUploadedFile(imageFile);
    }
    
    // Update UI state
    setImageSource('upload');
    setSelectedAdLibrary(null);
  };

  // Handle image source change
  const handleImageSourceChange = (value) => {
    setImageSource(value);
    if (value === 'library') {
      setUserUploadedImage(null);
      setUserUploadedFile(null);
    } else if (value === 'upload') {
      setSelectedAdLibrary(null);
      // Force re-render of ImageUpload component when switching to upload tab
      setImageUploadKey(Date.now());
    }
  };

  // Canvas size options - using actual size values as IDs
  const canvasSizes = [
    { id: "1024x1024", label: t('step_one.square', 'Square'), size: "1024 x 1024" },
    { id: "1536x1024", label: t('step_one.landscape', 'Landscape'), size: "1536 x 1024" },
    { id: "1024x1536", label: t('step_one.portrait', 'Portrait'), size: "1024 x 1536" },
    { id: "auto", label: t('step_one.auto_desc', 'Automatic'), size: t('step_one.auto', 'auto') },
  ];

  // Function to clear all filters
  const handleClearFilters = () => {
    setSelectedCompany(null);
    setSelectedIndustries([]);
    setSelectedTags([]);
    setSelectedCanvasSize(null);
  };

  // Check if any filters are active
  const hasActiveFilters = selectedCompany || selectedIndustries.length > 0 || selectedTags.length > 0;

  // Handle next step (create or update ad request)
  const handleNextStep = async () => {
    // Validate required fields
    if ((!selectedAdLibrary && !userUploadedImage) || !selectedCanvasSize) {
      setSubmitError(t('step_one.validation_error', 'Please select both an image source (gallery or upload) and canvas size'));
      return;
    }
    
    // Additional validation for upload mode
    if (imageSource === 'upload' && !userUploadedFile) {
      setSubmitError(t('step_one.upload_error', 'There was a problem with your uploaded image. Please try again.'));
      return;
    }

    setIsSubmitting(true);
    setSubmitError(null);

    try {
      // Prepare form data
      const formData = new FormData();
      formData.append('canvas_size', selectedCanvasSize);
      formData.append('status', 'DRAFT'); // Set status to DRAFT to advance to next step
      
      // Add either ad_library or user_uploaded_image, but not both
      if (imageSource === 'library' && selectedAdLibrary) {
        formData.append('ad_library', selectedAdLibrary);
      } else if (imageSource === 'upload' && userUploadedFile) {
        // Append the File object directly
        formData.append('user_uploaded_image', userUploadedFile);
        console.log('Appending user uploaded file:', userUploadedFile.name, userUploadedFile.type, userUploadedFile.size);
      }

      let response;
      let data;

      // Check if we're updating an existing AdRequest or creating a new one
      if (initialData && initialData.id) {
        // Update existing AdRequest
        console.log('Updating ad request with ID:', initialData.id);

        response = await fetch(`/ads/adrequest/${initialData.id}/update/`, {
          method: 'POST',
          body: formData,
          headers: {
            'X-CSRFToken': getCsrfToken(),
          },
        });

        data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || t('step_one.update_failed', 'Failed to update ad request'));
        } else {
          console.log('Ad request updated successfully:', data);
        }
      } else {
        // Create new AdRequest
        console.log('Creating new ad request with:', { selectedAdLibrary, selectedCanvasSize });

        response = await fetch('/ads/adrequest/create/', {
          method: 'POST',
          body: formData,
          headers: {
            'X-CSRFToken': getCsrfToken(),
          },
        });

        data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || t('step_one.create_failed', 'Failed to create ad request'));
        } else {
          console.log('Ad request created successfully:', data);
        }
      }

      // Call the onComplete callback with the updated ad request data
      if (onComplete) {
        const completeData = {
          id: data.id,
          status: 'DRAFT', // Force status to DRAFT to ensure we move to step 2
          canvas_size: selectedCanvasSize
        };
        
        // Add the appropriate image source data
        if (imageSource === 'library') {
          completeData.ad_library_id = selectedAdLibrary;
        } else if (imageSource === 'upload') {
          completeData.has_user_uploaded_image = true;
          
          // Include the user_uploaded_image URL in the data passed to StepTwoComponent
          // If we have a response from the server with the URL, use that
          if (data.user_uploaded_image) {
            completeData.user_uploaded_image = data.user_uploaded_image;
          } 
          // Otherwise, if we have a local blob URL, use that
          else if (userUploadedImage && userUploadedImage.startsWith('blob:')) {
            completeData.user_uploaded_image = userUploadedImage;
            console.log('Passing blob URL to StepTwoComponent:', userUploadedImage);
          }
        }
        
        onComplete(completeData);
      }
    } catch (error) {
      console.error('Error processing ad request:', error);
      setSubmitError(error.message || t('step_one.unexpected_error', 'An unexpected error occurred'));
      setIsSubmitting(false);
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

  // Handle gallery item selection
  const handleGalleryItemSelect = (item) => {
    console.log('Selected gallery item:', item);
    setSelectedAdLibrary(item.id);
    setImageSource('library');
    setUserUploadedImage(null);
  };

  // Render the component
  return (
    <div className="space-y-6 flex flex-col items-center w-full">
      <div className="w-full max-w-md relative">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center">
            <Building className="h-4 w-4 mr-2" />
            <h3 className="text-base font-medium">{t('step_one.company', 'Company')}</h3>
          </div>
          {hasActiveFilters && (
            <button
              onClick={handleClearFilters}
              className="group flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-gray-500 hover:text-primary transition-all duration-200 ease-in-out hover:scale-105 active:scale-95 relative overflow-hidden rounded-full"
              aria-label="Clear all filters"
            >
              <span className="relative z-10">{t('step_one.clear_filters', 'Clear filters')}</span>
              <X className="h-3.5 w-3.5 relative z-10 group-hover:rotate-90 transition-transform duration-300" />
              <span className="absolute inset-0 bg-gray-100 opacity-0 group-hover:opacity-100 group-active:opacity-80 rounded-full scale-0 group-hover:scale-100 transition-all duration-300 ease-out" />
            </button>
          )}
        </div>
        <SearchComponent
          selectedCompany={selectedCompany}
          onCompanyChange={handleCompanyChange}
        />
      </div>
      <FilterFormComponent
        selectedIndustries={selectedIndustries}
        selectedTags={selectedTags}
        onIndustriesChange={handleIndustriesChange}
        onTagsChange={handleTagsChange}
      />
      <div className="mt-8 w-full">
        <Tabs value={imageSource} onValueChange={handleImageSourceChange} className="w-full mb-6">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="library" className="flex items-center gap-2">
              <ImageIcon className="h-4 w-4" />
              {t('step_one.library_tab', 'Select from Library')}
            </TabsTrigger>
            <TabsTrigger value="upload" className="flex items-center gap-2">
              <Upload className="h-4 w-4" />
              {t('step_one.upload_tab', 'Upload Your Own')}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="library" className="mt-4">
            {isLoading ? (
              <div className="flex justify-center my-12">
                <div className="w-8 h-8 border-2 border-blue-500/30 border-t-blue-500 rounded-full animate-spin"></div>
              </div>
            ) : galleryItems.length > 0 ? (
              <>
                <div className="overflow-y-auto max-h-[600px] border border-gray-200 rounded-lg shadow-sm">
                  <InteractiveBentoGallery
                    mediaItems={galleryItems}
                    title={t('step_one.gallery_title', 'Select Your Ideal Ad Style')}
                    description={t('step_one.gallery_description', 'Browse and choose the ad style that best matches your desired outcome')}
                    onItemSelect={handleGalleryItemSelect}
                    selectedItemId={selectedAdLibrary}
                  />
                </div>
              </>
            ) : (
              <div className="p-8 text-center text-gray-500">
                {t('step_one.no_results', 'No results found. Try adjusting your filters.')}
              </div>
            )}
          </TabsContent>

          <TabsContent value="upload" className="mt-4">
            <div className="flex flex-col items-center justify-center p-8 border border-gray-200 rounded-lg shadow-sm">
              <ImageUpload 
                key={imageUploadKey}
                onUpload={handleImageUpload}
                customTitle={t('step_one.upload_title', 'Upload Your Image')}
                customDescription={t('step_one.upload_description', 'Upload an image to use as inspiration for your ad')}
                initialImage={userUploadedImage}
              />
              <p className="mt-4 text-sm text-muted-foreground text-center max-w-md">
                {t('step_one.upload_help', 'Your uploaded image will be used as inspiration for generating your ad creative')}
              </p>
            </div>
          </TabsContent>
        </Tabs>

        {/* Canvas size selection */}
        <div className="mt-12 w-full max-w-4xl mx-auto">
          <div className="space-y-4">
            <p className="text-lg font-medium text-center">{t('step_one.select_canvas', 'Select a canvas size to proceed')}</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
              {canvasSizes.map((item) => (
                <div
                  key={item.id}
                  className={`cursor-pointer border-2 rounded-md p-4 flex flex-col items-center justify-center ${selectedCanvasSize === item.id ? "border-primary" : "border-gray-200"}`}
                  onClick={() => handleCanvasSizeChange(item.id)}
                >
                  {/* Shape preview that matches the aspect ratio */}
                  {item.id === "1024x1024" && (
                    <div className="w-12 h-12 border-2 border-gray-300 rounded-sm mb-2" />
                  )}
                  {item.id === "1536x1024" && (
                    <div className="w-16 h-10 border-2 border-gray-300 rounded-sm mb-2" />
                  )}
                  {item.id === "1024x1536" && (
                    <div className="w-10 h-16 border-2 border-gray-300 rounded-sm mb-2" />
                  )}
                  {item.id === "auto" && (
                    <div className="w-12 h-12 border-2 border-dashed border-gray-300 rounded-full flex items-center justify-center mb-2 text-xs text-gray-400">{t('step_one.auto', 'Auto')}</div>
                  )}
                  <div className="font-semibold">{item.label}</div>
                  <div className="text-sm text-gray-500">{item.size}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Next button - in its own container */}
        <div className="mt-8 w-full px-4 flex justify-end">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <div>
                  <NextButton
                    onClick={handleNextStep}
                    disabled={(!selectedAdLibrary && !userUploadedImage) || !selectedCanvasSize || isSubmitting}
                    isLoading={isSubmitting}
                  />
                </div>
              </TooltipTrigger>
              {((!selectedAdLibrary && !userUploadedImage) || !selectedCanvasSize) && (
                <TooltipContent>
                  <p>{t('step_one.tooltip_validation', 'Please select an image source and canvas size')}</p>
                </TooltipContent>
              )}
            </Tooltip>
          </TooltipProvider>
        </div>

        {/* Error message */}
        {submitError && (
          <div className="mt-4 w-full max-w-4xl mx-auto p-3 bg-red-50 border border-red-200 rounded-md text-red-600 text-sm">
            {submitError}
          </div>
        )}
      </div>
    </div>
  );
};

export default StepOneComponent;
