import React, { useState } from 'react';
import { createRoot } from 'react-dom/client';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import BrandDropdown from './components/BrandDropdown.jsx';
import { ImageLibrarySelect } from './components/ImageLibrarySelect.jsx';
import { AppImageLibrarySelect } from './components/AppImageLibrarySelect.jsx';
import ImageSelectionModal from './components/ImageSelectionModal.jsx';

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

  // Get ad request ID from window data
  const adRequestData = window.__AD_REQUEST_DATA__ || {};
  const adRequestId = adRequestData.id;

  // initialData with actual ad request ID from URL
  const initialData = {
    id: adRequestId,
    brand: selectedBrand
  };

  const handleBrandChange = (brand) => {
    setSelectedBrand(brand);
    console.log('Selected brand:', brand);
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

  // Handle product image library selection - same as StepTwo
  const handleProductImageSelect = (imageData) => {
    console.log('Product library image selected:', imageData);

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

  // Handle app image library selection - same as StepTwo
  const handleAppImageSelect = (imageData) => {
    console.log('App library image selected:', imageData);

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

  // Function to save product library image to backend - same as StepTwo
  const saveProductLibraryImage = async (fieldName, imageData) => {
    if (!initialData.id) return;

    try {
      console.log(`Saving product library image for field ${fieldName}:`, imageData);
      
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
      console.log('Product library image updated in database:', data);

    } catch (error) {
      console.error('Error saving product library image:', error);
    }
  };

  // Handle app screenshot upload - same as StepTwo
  const handleAppScreenshotUpload = async (imageData) => {
    console.log('App screenshot uploaded or deleted:', imageData);

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
        console.log(`Added image reference to FormData: ${fieldName}_asset_id=${imageData.id}`);
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
      console.log('App image updated successfully:', data);

    } catch (error) {
      console.error('Error saving app image:', error);
    }
  };

  // Handle image selection from modal - same as StepTwo
  const handleImageSelect = (image) => {
    console.log('Image selected from modal:', image);
    
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

  const handleProductImageDelete = (imageData) => {
    console.log('Product image delete:', imageData);
    if (imageData.type === 'primary') {
      setProductImages(prev => ({ ...prev, primary: null }));
    } else if (imageData.type === 'secondary') {
      setProductImages(prev => ({ ...prev, secondary: null }));
    }
  };

  const handleAppImageDelete = (imageData) => {
    console.log('App image delete:', imageData);
    if (imageData.type === 'primary') {
      setAppImages(prev => ({ ...prev, primary: null }));
    } else if (imageData.type === 'secondary') {
      setAppImages(prev => ({ ...prev, secondary: null }));
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
          <div className="grid grid-cols-2 gap-4 mt-4">
            {/* Product Image 1 */}
            <div className="space-y-2">
              <div className="h-48">
                <ImageLibrarySelect
                  onSelectImage={handleProductImageSelect}
                  onDeleteImage={handleProductImageDelete}
                  selectedImages={{ primary: productImages.primary, secondary: null }}
                  className="h-full"
                />
              </div>
            </div>
            
            {/* App Image 1 */}
            <div className="space-y-2">
              <div className="h-48">
                <AppImageLibrarySelect
                  onSelectImage={handleAppImageSelect}
                  onDeleteImage={handleAppImageDelete}
                  selectedImages={{ primary: appImages.primary, secondary: null }}
                  className="h-full"
                />
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Image Selection Modal */}
      <ImageSelectionModal
        isOpen={isImageModalOpen}
        onClose={toggleImageModal}
        onSelect={handleImageSelect}
      />
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
