import React, { useState, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import { Button } from '@/components/ui/button';
import BrandDropdown from './components/BrandDropdown.jsx';
import { ImageLibrarySelect } from './components/ImageLibrarySelect.jsx';
import { AppImageLibrarySelect } from './components/AppImageLibrarySelect.jsx';
import ImageSelectionModal from './components/ImageSelectionModal.jsx';
import { ArrowLeft, Check } from 'lucide-react';

// Header component with back button, title and description
const DiscoverCloneHeader = () => {
  const pageConfig = window.__PAGE_CONFIG__ || {};

  const handleBackClick = () => {
    window.location.href = pageConfig.backUrl || '/ads/discover/';
  };

  return (
    <div className="flex items-center gap-4">
      {/* Back Button - Circular gray background */}
      <button
        onClick={handleBackClick}
        className="flex items-center justify-center w-10 h-10 bg-gray-100 hover:bg-gray-200 rounded-full transition-colors"
      >
        <ArrowLeft className="w-5 h-5 text-gray-600" />
      </button>

      {/* Title and Description */}
      <div className="flex flex-col">
        <h1 className="text-lg font-bold text-black">
          {pageConfig.title || 'Clone Ad'}
        </h1>
        <p className="text-sm text-gray-500">
          {pageConfig.description || 'New ads follow the style & composition of the ad reference on the left.'}
        </p>
      </div>
    </div>
  );
};

// Sidebar component with ad reference only
const DiscoverCloneSidebar = () => {
  const adRequestData = window.__AD_REQUEST_DATA__ || {};

  return (
    <div className="p-6 space-y-6">
      {/* Ad Reference Preview */}
      {adRequestData.ad_library && (
        <div className="bg-gray-50 rounded-lg p-4">
          <h3 className="text-sm font-medium text-gray-900 mb-3">Reference Ad</h3>
          <div className="aspect-square bg-white rounded-md overflow-hidden border border-gray-200">
            <img
              src={adRequestData.ad_library.image_url}
              alt="Reference ad"
              className="w-full h-full object-cover"
            />
          </div>
          {adRequestData.ad_library.company_name && (
            <p className="text-xs text-gray-500 mt-2">
              {adRequestData.ad_library.company_name}
            </p>
          )}
        </div>
      )}
    </div>
  );
};

// Main page content
const DiscoverClonePageContent = () => {
  // Get ad request data from window
  const adRequestData = window.__AD_REQUEST_DATA__ || {};
  const adRequestId = adRequestData.id;

  // Initialize states - will be updated by fetchFreshData
  const [selectedBrand, setSelectedBrand] = useState(null);
  const [productImages, setProductImages] = useState({
    primary: null,
    secondary: null
  });
  const [appImages, setAppImages] = useState({
    primary: null,
    secondary: null
  });
  const [isImageModalOpen, setIsImageModalOpen] = useState(false);
  const [freshData, setFreshData] = useState(null);
  const [selectedCanvasSize, setSelectedCanvasSize] = useState(null);

  // Function to fetch fresh data from the server - same as StepTwo
  const fetchFreshData = async (id) => {
    if (!id) return null;

    try {
      const response = await fetch(`/ads/adrequest/${id}/get/`);
      if (!response.ok) {
        throw new Error(`Error fetching ad request: ${response.statusText}`);
      }

      const freshData = await response.json();
      
      // Update states with fresh data
      if (freshData.brand) {
        setSelectedBrand(freshData.brand);
      }
      
      // Update canvas size
      if (freshData.canvas_size) {
        setSelectedCanvasSize(freshData.canvas_size);
      }
      
      // Update product images
      setProductImages({
        primary: freshData.product_image_1_override || null,
        secondary: freshData.product_image_2_override || null
      });
      
      // Update app images
      setAppImages({
        primary: freshData.app_image_1_override || null,
        secondary: freshData.app_image_2_override || null
      });
      
      setFreshData(freshData);
      return freshData;
    } catch (error) {
      console.error('Error fetching fresh data:', error);
    }
    return null;
  };

  // Canvas size options - same as StepOneComponent (excluding auto)
  const canvasSizes = [
    { id: "1024x1024", label: "Instagram / LinkedIn", size: "1024 x 1024" },
    { id: "1536x1024", label: "Facebook / Twitter", size: "1536 x 1024" },
    { id: "1024x1536", label: "Instagram Story", size: "1024 x 1536" },
  ];

  // initialData with actual ad request ID from URL and current brand
  const initialData = {
    id: adRequestId,
    brand: selectedBrand,
    canvas_size: selectedCanvasSize,
    ...adRequestData, // Include all ad request data for reference
    ...(freshData || {}) // Include fresh data if available
  };

  // useEffect hooks for initial load functionality
  
  // Fetch fresh data when component mounts and scroll to top
  useEffect(() => {
    window.scrollTo(0, 0);
    
    if (adRequestId) {
      fetchFreshData(adRequestId);
    }
  }, [adRequestId]);

  // Function to process refreshed data - uses fetchFreshData like StepTwo
  const processRefreshedData = async () => {
    if (adRequestId) {
      return await fetchFreshData(adRequestId);
    }
    return null;
  };

  // Function to update brand in the database - similar to StepTwoComponent
  const updateBrand = async (brand) => {
    if (!initialData.id || !brand) return;

    try {
      const csrfToken = getCsrfToken();
      if (!csrfToken) {
        console.error('CSRF token not found');
        return;
      }

      const formData = new FormData();
      formData.append('brand_id', brand.id);

      const response = await fetch(`/ads/adrequest/${initialData.id}/update/`, {
        method: 'POST',
        headers: {
          'X-CSRFToken': csrfToken
        },
        body: formData
      });

      if (!response.ok) {
        throw new Error(`Error updating brand: ${response.statusText}`);
      }

      const data = await response.json();

    } catch (error) {
      console.error('Error saving brand:', error);
    }
  };

  const handleBrandChange = (brand) => {
    setSelectedBrand(brand);
    
    // Update brand in backend if we have an ID
    if (initialData.id && brand) {
      updateBrand(brand);
    }
  };

  // Handle canvas size change - same as StepOneComponent
  const handleCanvasSizeChange = async (sizeId) => {
    setSelectedCanvasSize(sizeId);
    
    // Update canvas size in backend if we have an ID
    if (initialData.id) {
      try {
        const csrfToken = getCsrfToken();
        if (!csrfToken) {
          console.error('CSRF token not found');
          return;
        }

        const formData = new FormData();
        formData.append('canvas_size', sizeId);

        const response = await fetch(`/ads/adrequest/${initialData.id}/update/`, {
          method: 'POST',
          headers: {
            'X-CSRFToken': csrfToken
          },
          body: formData
        });

        if (!response.ok) {
          throw new Error(`Error updating canvas size: ${response.statusText}`);
        }

        const data = await response.json();
      } catch (error) {
        console.error('Error saving canvas size:', error);
      }
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

  // Handle product image library selection
  const handleProductImageSelect = (imageData) => {
    // Open the image selection modal
    setIsImageModalOpen(true);

    // Store the field name and source
    window.currentImageSelectionSource = 'product_library';
    window.currentImageField = imageData.field;
    
    // Store the brand ID from selected brand
    if (selectedBrand && selectedBrand.id) {
      window.selectedBrandId = selectedBrand.id;
    }
  };

  // Handle app image library selection
  const handleAppImageSelect = (imageData) => {
    // Open the image selection modal
    setIsImageModalOpen(true);

    // Store the field name and source
    window.currentImageSelectionSource = 'app_library';
    window.currentImageField = imageData.field;
    
    // Store the brand ID from selected brand
    if (selectedBrand && selectedBrand.id) {
      window.selectedBrandId = selectedBrand.id;
    }
  };

  // Function to save product library image to backend
  const saveProductLibraryImage = async (fieldName, imageData) => {
    if (!initialData.id) return;

    try {
      const csrfToken = getCsrfToken();
      if (!csrfToken) {
        console.error('CSRF token not found in cookies');
        return;
      }
      
      const formData = new FormData();

      // If we have image data with URL and ID (from image library)
      if (imageData && imageData.url && imageData.id) {
        // Send the asset_id to avoid re-uploading
        formData.append(`${fieldName}_asset_id`, imageData.id);
        // Include the field name with empty value to indicate we want to update this field
        formData.append(fieldName, '');
      } 
      // If we have a null value, we're deleting the image
      else if (imageData === null) {
        // Include the field name with empty value to indicate deletion
        formData.append(fieldName, '');
      }

      // Make the API call
      const response = await fetch(`/ads/adrequest/${initialData.id}/update/`, {
        method: 'POST',
        headers: {
          'X-CSRFToken': csrfToken
        },
        body: formData
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();

    } catch (error) {
      console.error('Error saving product library image:', error);
    }
  };

  // Handle app screenshot upload
  const handleAppScreenshotUpload = async (imageData) => {
    if (!initialData.id) return;
    if (imageData === undefined) return;

    try {
      const csrfToken = getCsrfToken();
      if (!csrfToken) {
        console.error('CSRF token not found');
        return;
      }

      const formData = new FormData();
      const fieldName = imageData.type === 'primary' ? 'app_image_1' : 'app_image_2';

      // If imageData is null or url is null, it means we want to delete the image
      if (imageData === null || imageData.url === null) {
        formData.append(fieldName, '');
      }
      // Es una imagen existente de UserBrandAssets
      else if (imageData.id) {
        // Enviamos el ID de la imagen directamente
        formData.append(`${fieldName}_asset_id`, imageData.id);
        // También enviamos el campo vacío para indicar que queremos actualizar este campo
        formData.append(fieldName, '');
      }

      // Make API call
      const response = await fetch(`/ads/adrequest/${initialData.id}/update/`, {
        method: 'POST',
        headers: {
          'X-CSRFToken': csrfToken
        },
        body: formData
      });

      if (!response.ok) {
        throw new Error(`Error updating app image: ${response.statusText}`);
      }

      const data = await response.json();

    } catch (error) {
      console.error('Error saving app image:', error);
    }
  };

  // Handle image selection from modal
  const handleImageSelect = (image) => {
    const selectionSource = window.currentImageSelectionSource;
    const fieldName = window.currentImageField;
    const imageUrl = image?.url || null;

    if (selectionSource === 'product_library' && imageUrl && fieldName) {
      // Update product library images state using the field name
      const stateKey = fieldName === 'product_image_1' ? 'primary' : 'secondary';

      setProductImages(prev => ({
        ...prev,
        [stateKey]: imageUrl
      }));

      // Save to backend if we have an ID
      if (initialData.id) {
        saveProductLibraryImage(fieldName, image);
      }
    } else if (selectionSource === 'app_library' && imageUrl && fieldName) {
      // Update app library images state using the field name
      const stateKey = fieldName === 'app_image_1' ? 'primary' : 'secondary';

      setAppImages(prev => ({
        ...prev,
        [stateKey]: imageUrl
      }));

      // Save to backend if we have an ID
      if (initialData.id) {
        handleAppScreenshotUpload({
          type: stateKey,
          url: imageUrl,
          ...image
        });
      }
    }

    // Clear all selection variables
    window.currentImageSelectionType = null;
    window.currentImageSelectionSource = null;
    window.currentImageField = null;
  };

  // Toggle image selection modal
  const toggleImageModal = () => {
    const newState = !isImageModalOpen;
    setIsImageModalOpen(newState);

    // Si estamos cerrando el modal, limpiar las variables globales
    if (!newState) {
      window.currentImageSelectionSource = null;
      window.currentImageField = null;
      window.currentImageSelectionType = null;
      window.selectedBrandId = null;
    }
  };

  // Handle product image deletion
  const handleProductImageDelete = async (imageData) => {
    // Update state to remove the image
    if (imageData.type === 'primary') {
      setProductImages(prev => ({ ...prev, primary: null }));
    } else if (imageData.type === 'secondary') {
      setProductImages(prev => ({ ...prev, secondary: null }));
    }

    // Save to backend if we have an ID - pass null to indicate deletion
    if (initialData.id) {
      const fieldName = imageData.type === 'primary' ? 'product_image_1' : 'product_image_2';
      saveProductLibraryImage(fieldName, null);
    }
  };

  // Handle app image deletion
  const handleAppImageDelete = async (imageData) => {
    // Update state to remove the image
    if (imageData.type === 'primary') {
      setAppImages(prev => ({ ...prev, primary: null }));
    } else if (imageData.type === 'secondary') {
      setAppImages(prev => ({ ...prev, secondary: null }));
    }

    // Save to backend if we have an ID - pass null to indicate deletion
    if (initialData.id) {
      const stateKey = imageData.type;
      handleAppScreenshotUpload({
        type: stateKey,
        url: null
      });
    }
  };


  return (
    <div className="p-8">
      <div className="max-w-4xl mx-auto">
        {/* Brand Selection Section */}
        <div className="space-y-4">
          <h2 className="text-lg text-primary">Brand</h2>
          <p className="text-sm text-gray-600">
            Which brand do you want to create ads for?
          </p>
          <div className="space-y-2">
            <BrandDropdown 
              initialBrandId={selectedBrand?.id}
              onBrandChange={handleBrandChange}
            />
            {!selectedBrand && (
              <p className="text-xs text-amber-500 mt-1">Please select a brand to add assets</p>
            )}
            <p className="text-xs text-gray-500">
              Brand changes not allowed after concept creation.
            </p>
          </div>
          <p className="text-sm text-gray-600">
            Product image
          </p>
          <p className="text-xs text-gray-500">
            Pick an image for your ad — upload one or choose from suggestions. We'll clean up the background for you!
          </p>
          {/* Image Upload Section - 4 images in a row using original components */}
          <div className="grid grid-cols-2 gap-4 mt-0">
            {/* Product Image 1 */}
            <div>
              <div className="h-48">
                <ImageLibrarySelect
                  onSelectImage={handleProductImageSelect}
                  onDeleteImage={handleProductImageDelete}
                  selectedImages={{ primary: productImages.primary, secondary: productImages.secondary }}
                  className="h-full"
                  disabled={!selectedBrand}
                />
              </div>
            </div>
            
            {/* App Image 1 */}
            <div>
              <div className="h-48">
                <AppImageLibrarySelect
                  onSelectImage={handleAppImageSelect}
                  onDeleteImage={handleAppImageDelete}
                  selectedImages={{ primary: appImages.primary, secondary: appImages.secondary }}
                  className="h-full"
                  disabled={!selectedBrand}
                />
              </div>
            </div>
          </div>
          <h2 className="text-lg text-primary">Context</h2>
          <p className="text-sm text-gray-600">
            Platform Presets
          </p>
          
          {/* Canvas Size Selection - same as StepOneComponent */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 mt-4">
            {canvasSizes.map((item) => (
              <div
                key={item.id}
                className={`relative cursor-pointer rounded-xl p-6 flex flex-col items-center justify-center transition-all ${
                  selectedCanvasSize === item.id 
                    ? "bg-primary/10 border-2 border-primary" 
                    : "bg-gray-100 border-2 border-transparent hover:bg-gray-200"
                }`}
                onClick={() => handleCanvasSizeChange(item.id)}
              >
                {/* Check icon in top-right corner when selected */}
                {selectedCanvasSize === item.id && (
                  <div className="absolute top-2 right-2 w-6 h-6 bg-primary rounded-full flex items-center justify-center">
                    <Check className="w-4 h-4 text-white" />
                  </div>
                )}
                
                {/* Shape preview that matches the aspect ratio */}
                {item.id === "1024x1024" && (
                  <div className="w-16 h-16 bg-primary rounded-lg mb-3"></div>
                )}
                {item.id === "1536x1024" && (
                  <div className="w-20 h-12 bg-primary rounded-lg mb-3"></div>
                )}
                {item.id === "1024x1536" && (
                  <div className="w-12 h-20 bg-primary rounded-lg mb-3"></div>
                )}
                
                <div className="text-center">
                  <div className="font-medium text-sm text-gray-900">{item.label}</div>
                  <div className="text-xs text-gray-500 mt-1">{item.size}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
      
      {/* Image Selection Modal */}
      {/* Temporarily commented out to debug
      <ImageSelectionModal
        isOpen={isImageModalOpen}
        onClose={toggleImageModal}
        onSelect={handleImageSelect}
      />
      */}
    </div>
  );
};

// Wait for sidebar layout to be ready, then mount components
function waitForSidebarLayout() {
  if (window.sidebarLayoutReady && window.setSidebarComponent && window.setAppHeader) {
    // Set the header component
    window.setAppHeader(React.createElement(DiscoverCloneHeader));

    // Set the sidebar component
    window.setSidebarComponent(React.createElement(DiscoverCloneSidebar));

    // Mount the main content
    const contentContainer = document.getElementById('sidebar-page-content');
    if (contentContainer) {
      const root = createRoot(contentContainer);
      root.render(React.createElement(DiscoverClonePageContent));
    }
  } else {
    // Retry after a short delay
    setTimeout(waitForSidebarLayout, 100);
  }
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', waitForSidebarLayout);

export default DiscoverClonePageContent;
