import React, { useState, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import { SearchComponent } from './components/SearchComponent';
import { FilterFormComponent } from './components/FilterFormComponent';
import InteractiveBentoGallery from '../components/ui/interactive-bento-gallery.jsx';
import { Building, X } from 'lucide-react';
import { GetStartedButton } from '../components/ui/get-started-button.jsx';

/**
 * Main component for the Create Ad Request page
 * Includes search functionality and filter form for industries and tags
 * Manages all filters in one place and calls the API when any filter changes
 */
const CreateAdRequestApp = () => {
  // Centralized state for all filters
  const [selectedCompany, setSelectedCompany] = useState(null);
  const [selectedIndustries, setSelectedIndustries] = useState([]);
  const [selectedTags, setSelectedTags] = useState([]);
  const [filteredResults, setFilteredResults] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedCanvasSize, setSelectedCanvasSize] = useState(null);
  const [selectedAdLibrary, setSelectedAdLibrary] = useState(null);
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

    // Create spans for different grid positions
    const spans = [
      "md:col-span-1 md:row-span-3 sm:col-span-1 sm:row-span-2",
      "md:col-span-2 md:row-span-2 col-span-1 sm:col-span-2 sm:row-span-2",
      "md:col-span-1 md:row-span-3 sm:col-span-2 sm:row-span-2",
      "md:col-span-2 md:row-span-2 sm:col-span-1 sm:row-span-2",
      "md:col-span-1 md:row-span-3 sm:col-span-1 sm:row-span-2"
    ];

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

      return {
        id: item.id || index + 1,
        type: "image",
        title: title,
        desc: desc,
        url: imageUrl,
        span: spans[index % spans.length]
      };
    });
  };

  // Call the API when any filter changes
  useEffect(() => {
    fetchFilteredResults();
  }, [selectedCompany, selectedIndustries, selectedTags]);

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

  // Handle canvas size selection
  const handleCanvasSizeChange = (size) => {
    setSelectedCanvasSize(size);
  };

  // Handle creating a new ad request
  const handleCreateAdRequest = async () => {
    // Validate required fields
    if (!selectedAdLibrary || !selectedCanvasSize) {
      setSubmitError('Please select both an ad style and canvas size');
      return;
    }

    setIsSubmitting(true);
    setSubmitError(null);

    try {
      // Log the values to ensure they're correctly set
      console.log('Creating ad request with:', { selectedAdLibrary, selectedCanvasSize });

      // Prepare form data
      const formData = new FormData();
      formData.append('ad_library', selectedAdLibrary);
      formData.append('canvas_size', selectedCanvasSize);

      // Send POST request to create ad request
      const response = await fetch('/ads/adrequest/create/', {
        method: 'POST',
        body: formData,
        headers: {
          'X-CSRFToken': getCsrfToken(),
        },
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create ad request');
      }else{
        console.log('Ad request created successfully:', data);
      }

      // Redirect to the created ad request
      //window.location.href = `/ads/adrequest/${data.id}/`;
    } catch (error) {
      console.error('Error creating ad request:', error);
      setSubmitError(error.message || 'An unexpected error occurred');
      setIsSubmitting(false);
    }
  };

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

  // Canvas size options
  const canvasSizes = [
    { id: "square", label: "Square", size: "1080 x 1080" },
    { id: "portraitTall", label: "Portrait", size: "1080 x 1920" },
    { id: "portrait", label: "Portrait", size: "1080 x 1350" },
    { id: "landscape", label: "Landscape", size: "1280 x 720" },
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

  return (
    <div className="space-y-6 flex flex-col items-center w-full">
      <div className="w-full max-w-md relative">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center">
            <Building className="h-4 w-4 mr-2" />
            <h3 className="text-base font-medium">Company</h3>
          </div>
          {hasActiveFilters && (
            <button
              onClick={handleClearFilters}
              className="group flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-gray-500 hover:text-primary transition-all duration-200 ease-in-out hover:scale-105 active:scale-95 relative overflow-hidden rounded-full"
              aria-label="Clear all filters"
            >
              <span className="relative z-10">Clear filters</span>
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
        {isLoading ? (
          <div className="flex justify-center my-12">
            <div className="w-8 h-8 border-2 border-blue-500/30 border-t-blue-500 rounded-full animate-spin"></div>
          </div>
        ) : galleryItems.length > 0 ? (
          <>
            <InteractiveBentoGallery
              mediaItems={galleryItems}
              title="Select Your Ideal Ad Style"
              description="Browse and choose the ad style that best matches your desired outcome"
              onItemSelect={(item) => setSelectedAdLibrary(item.id)}
              selectedItemId={selectedAdLibrary}
            />

            <div className="mt-12 w-full max-w-4xl mx-auto">
              <div className="space-y-4">
                <p className="text-lg font-medium text-center">Select a canvas size to proceed</p>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {canvasSizes.map((item) => (
                    <div
                      key={item.id}
                      className={`cursor-pointer border-2 rounded-md p-4 flex flex-col items-center justify-center ${selectedCanvasSize === item.id ? "border-primary" : "border-gray-200"
                        }`}
                      onClick={() => handleCanvasSizeChange(item.id)}
                    >
                      {/* Shape preview that matches the aspect ratio */}
                      {item.id === "square" && (
                        <div className="w-12 h-12 border-2 border-gray-300 rounded-sm mb-2" />
                      )}
                      {item.id === "portraitTall" && (
                        <div className="w-8 h-14 border-2 border-gray-300 rounded-sm mb-2" />
                      )}
                      {item.id === "portrait" && (
                        <div className="w-9 h-12 border-2 border-gray-300 rounded-sm mb-2" />
                      )}
                      {item.id === "landscape" && (
                        <div className="w-14 h-8 border-2 border-gray-300 rounded-sm mb-2" />
                      )}
                      <div className="font-semibold">{item.label}</div>
                      <div className="text-sm text-gray-500">{item.size}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Next button */}
              <div className="mt-8 flex justify-center">
                <GetStartedButton
                  onClick={handleCreateAdRequest}
                  disabled={!selectedAdLibrary || !selectedCanvasSize || isSubmitting}
                  className="min-w-[150px]"
                >
                  {isSubmitting ? (
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                      <span>Creating...</span>
                    </div>
                  ) : (
                    "Next"
                  )}
                </GetStartedButton>
              </div>

              {/* Error message */}
              {submitError && (
                <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-md text-red-600 text-sm">
                  {submitError}
                </div>
              )}
            </div>
          </>
        ) : (
          <div className="text-center my-12 p-8 bg-gray-50 rounded-lg">
            <p className="text-gray-500 text-lg">No ad examples found. Try adjusting your filters.</p>
          </div>
        )}
      </div>
    </div>
  );
};

/**
 * Mount the React application to the DOM when the document is loaded
 */
document.addEventListener('DOMContentLoaded', () => {
  const mountPoint = document.getElementById('create-adrequest-app');

  if (mountPoint) {
    const root = createRoot(mountPoint);
    root.render(<CreateAdRequestApp />);
  } else {
    console.error('Could not find mount point for Create Ad Request app');
  }
});
