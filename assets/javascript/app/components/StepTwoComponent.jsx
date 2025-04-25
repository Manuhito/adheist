import React, { useId, useState, useEffect, useRef } from 'react';
import { NextButton } from '../../components/ui/next-button.jsx';
import { BackButton } from '../../components/ui/back-button.jsx';
import { CompanyLogoUpload } from './CompanyLogoUpload.jsx';
import { ProductImageUpload } from './ProductImageUpload.jsx';
import { AppScreenshotUpload } from './AppScreenshotUpload.jsx';
import { ProductTypeSelect } from './ProductTypeSelect.jsx';
import { MarketingMaterialUpload } from './MarketingMaterialUpload.jsx';
import { Input } from '../../components/ui/input.jsx';

/**
 * Step Two Component for the Create Ad Request flow
 * Handles image upload, color selection, and navigation
 */
const StepTwoComponent = ({ onComplete, initialData = {}, refreshData }) => {
  const [isBackSubmitting, setIsBackSubmitting] = useState(false);
  const websiteUrlId = useId();
  const keyBenefitsId = useId();
  const brandColorId = useId();
  
  const [websiteUrl, setWebsiteUrl] = useState(
    // Check for company_website in asset_overrides first
    (initialData.asset_overrides?.company_website) ||
    // Then fallback to websiteUrl if it exists
    initialData.websiteUrl ||
    // Finally default to empty string
    ''
  );
  
  const [keyBenefits, setKeyBenefits] = useState(
    // Check for key_benefits in asset_overrides first
    (initialData.asset_overrides?.key_benefits) ||
    // Then fallback to keyBenefits if it exists
    initialData.keyBenefits ||
    // Finally default to empty string
    ''
  );
  
  const [selectedColor, setSelectedColor] = useState(
    // Check for main_hex_color in asset_overrides first
    (initialData.asset_overrides?.main_hex_color) ||
    // Then fallback to brandColor if it exists
    initialData.brandColor ||
    ''
  );
  
  // We no longer need to track product type selection as both containers are always visible

  // Debounce timers
  const websiteUrlUpdateTimer = useRef(null);
  const keyBenefitsUpdateTimer = useRef(null);
  const colorUpdateTimer = useRef(null);

  // Solo refrescar datos si es necesario (por ejemplo, al recargar la página directamente)
  // No hacemos la llamada automáticamente para evitar duplicación con handleStepComplete
  useEffect(() => {
    // Comprobamos si venimos de una recarga de página o navegación directa
    const isDirectNavigation = !document.referrer.includes(window.location.host);

    if (refreshData && initialData?.id && isDirectNavigation) {
      refreshData();
    }
  }, []);

  // Asegurar que el scroll esté al inicio de la página cuando el componente se monte
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  // Clean up debounce timers when component unmounts
  useEffect(() => {
    return () => {
      // Clear any pending debounce timers
      if (websiteUrlUpdateTimer.current) {
        clearTimeout(websiteUrlUpdateTimer.current);
      }
      if (keyBenefitsUpdateTimer.current) {
        clearTimeout(keyBenefitsUpdateTimer.current);
      }
      if (colorUpdateTimer.current) {
        clearTimeout(colorUpdateTimer.current);
      }
    };
  }, []);

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

  // Handle going back to step 1 (NEW)
  const handleBack = async () => {
    setIsBackSubmitting(true);
    try {
      const formData = new FormData();
      formData.append('status', 'NEW');
      const response = await fetch(`/ads/adrequest/${initialData.id}/update/`, {
        method: 'POST',
        body: formData,
        headers: {
          'X-CSRFToken': getCsrfToken(),
        },
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to update status to NEW');
      }
      if (onComplete) {
        onComplete({ ...initialData, status: 'NEW' });
      }
    } catch (error) {
      console.error('Error setting status to NEW:', error);
    } finally {
      setIsBackSubmitting(false);
    }
  };

  const handleNext = async () => {
    console.log('Next button clicked');

    // Ya no validamos que se haya seleccionado un tipo de producto, ya que no es obligatorio

    // First update the status to 'filled' in the backend
    if (initialData.id) {
      try {
        // Get CSRF token from cookies
        const csrfToken = document.cookie
          .split('; ')
          .find(row => row.startsWith('csrftoken='))
          ?.split('=')[1];

        if (!csrfToken) {
          console.error('CSRF token not found');
          return;
        }

        // Create a FormData object for the request
        const formData = new FormData();

        // Add the status field to update to 'filled'
        formData.append('status', 'FILLED');

        // Make the API call to update the status
        const response = await fetch(`/ads/adrequest/${initialData.id}/update/`, {
          method: 'POST',
          headers: {
            'X-CSRFToken': csrfToken
            // Don't set Content-Type header for FormData
            // The browser will set it automatically with the correct boundary
          },
          body: formData
        });

        if (!response.ok) {
          throw new Error(`Error updating status: ${response.statusText}`);
        }

        const data = await response.json();
        console.log('Status updated to filled successfully:', data);

        // If we have a refreshData function, call it to update the UI
        if (refreshData) {
          refreshData();
        }
      } catch (error) {
        console.error('Error updating status to filled:', error);
      }
    }

    // Pass the data to the next step
    if (onComplete) {
      onComplete({
        websiteUrl,
        keyBenefits,
        brandColor: selectedColor,
        productImages: {}, // Will be populated with actual image data
        appScreenshots: {}, // Will be populated with actual screenshot data
        marketingMaterials: {} // Will be populated with additional marketing images
      });
    }
  };

  // Handle logo image upload
  const handleLogoUpload = async (url) => {
    console.log('Logo uploaded or deleted:', url);

    // Only proceed if we have an ID
    if (!initialData.id) return;
    
    // If url is explicitly null, it means the image should be deleted
    // If url is undefined, it means no action should be taken
    if (url === undefined) return;

    try {
      // Get CSRF token from cookies
      const csrfToken = document.cookie
        .split('; ')
        .find(row => row.startsWith('csrftoken='))
        ?.split('=')[1];

      if (!csrfToken) {
        console.error('CSRF token not found');
        return;
      }

      // Create a FormData object
      const formData = new FormData();
      
      // If url is null, it means we want to delete the image
      if (url === null) {
        console.log('Deleting logo image...');
        // The backend expects the field name to be in POST data but not in FILES data
        // to trigger deletion of the corresponding override field
        formData.append('logo', ''); // Send empty value for the logo field
      }
      // Check if this is a blob URL (from a new upload) or a server URL (from initialData)
      else if (url.startsWith('blob:')) {
        console.log('Processing blob URL...');
        
        // Convert the blob URL to an actual file
        const blobResponse = await fetch(url);
        const blob = await blobResponse.blob();
        
        // Create a file from the blob
        // Use a descriptive filename with timestamp to avoid caching issues
        const filename = `company_logo_${Date.now()}.${blob.type.split('/')[1] || 'png'}`;
        const file = new File([blob], filename, { type: blob.type });
        
        console.log('Created file:', file.name, 'type:', file.type, 'size:', file.size);
        
        // Add the file to the FormData with the field name 'logo'
        // This matches what the Django view expects in request.FILES
        formData.append('logo', file);
        console.log('Added logo file to FormData');
      } else {
        // This is a server URL (from initialData)
        console.log('Processing server URL...');
        
        // For server URLs, we'll send the URL directly
        // The server already has this image, so we don't need to upload it again
        formData.append('logo_override_url', url);
        console.log('Added logo_override_url to FormData');
      }
      
      // Log all form data entries
      console.log('FormData entries:');
      for (let pair of formData.entries()) {
        console.log(pair[0] + ':', pair[1] instanceof File ? 
          `File: ${pair[1].name}, type: ${pair[1].type}, size: ${pair[1].size}` : 
          pair[1]);
      }
      
      // Make the API call to update the logo
      const response = await fetch(`/ads/adrequest/${initialData.id}/update/`, {
        method: 'POST',
        headers: {
          'X-CSRFToken': csrfToken
          // Don't set Content-Type header for FormData
        },
        body: formData
      });

      if (!response.ok) {
        throw new Error(`Error updating logo: ${response.statusText}`);
      }

      const data = await response.json();
      console.log('Logo updated successfully:', data);

      // If we have a refreshData function, call it to update the UI
      if (refreshData) {
        refreshData();
      }
    } catch (error) {
      console.error('Error saving logo:', error);
    }
  };

  // Handle product image upload
  const handleProductImageUpload = async (imageData) => {
    console.log('Product image uploaded or deleted:', imageData);
    
    // Only proceed if we have an ID
    if (!initialData.id) return;
    
    // If imageData is undefined, it means no action should be taken
    if (imageData === undefined) return;
    
    // If imageData.url is null, it means the image should be deleted
    const isDeleteOperation = imageData?.url === null;
    
    try {
      // Get CSRF token from cookies
      const csrfToken = document.cookie
        .split('; ')
        .find(row => row.startsWith('csrftoken='))
        ?.split('=')[1];

      if (!csrfToken) {
        console.error('CSRF token not found');
        return;
      }

      // Create a FormData object
      const formData = new FormData();
      
      // Handle image deletion
      if (isDeleteOperation) {
        console.log('Deleting product image:', imageData.type);
        // The backend expects the field name to be in POST data but not in FILES data
        // to trigger deletion of the corresponding override field
        if (imageData.type === 'primary') {
          formData.append('product_image_1', ''); // Send empty value for the field
        } else if (imageData.type === 'secondary') {
          formData.append('product_image_2', ''); // Send empty value for the field
        }
      }
      // Check if this is a blob URL (from a new upload) or a server URL (from initialData)
      else if (imageData.url.startsWith('blob:')) {
        console.log('Processing blob URL for product image...');
        
        // Convert the blob URL to an actual file
        const blobResponse = await fetch(imageData.url);
        const blob = await blobResponse.blob();
        
        // Create a file from the blob with a descriptive filename
        const filename = `product_image_${imageData.type}_${Date.now()}.${blob.type.split('/')[1] || 'png'}`;
        const file = new File([blob], filename, { type: blob.type });
        
        console.log('Created file:', file.name, 'type:', file.type, 'size:', file.size);
        
        // Add the file to the FormData with the field name based on image type
        if (imageData.type === 'primary') {
          formData.append('product_image_1', file);
        } else if (imageData.type === 'secondary') {
          formData.append('product_image_2', file);
        }
      } else {
        // This is a server URL (from initialData)
        console.log('Processing server URL for product image...');
        
        // For server URLs, we'll send the URL directly
        if (imageData.type === 'primary') {
          formData.append('product_image_1_override_url', imageData.url);
        } else if (imageData.type === 'secondary') {
          formData.append('product_image_2_override_url', imageData.url);
        }
      }
      
      // Make the API call to update the product image
      const response = await fetch(`/ads/adrequest/${initialData.id}/update/`, {
        method: 'POST',
        headers: {
          'X-CSRFToken': csrfToken
        },
        body: formData
      });

      if (!response.ok) {
        throw new Error(`Error updating product image: ${response.statusText}`);
      }

      const data = await response.json();
      console.log('Product image updated successfully:', data);

      // If we have a refreshData function, call it to update the UI
      if (refreshData) {
        refreshData();
      }
    } catch (error) {
      console.error('Error saving product image:', error);
    }
  };

  // Handle app screenshot upload
  const handleAppScreenshotUpload = async (imageData) => {
    console.log('App screenshot uploaded or deleted:', imageData);
    
    // Only proceed if we have an ID
    if (!initialData.id) return;
    
    // If imageData is undefined, it means no action should be taken
    if (imageData === undefined) return;
    
    // If imageData.url is null, it means the image should be deleted
    const isDeleteOperation = imageData?.url === null;
    
    try {
      // Get CSRF token from cookies
      const csrfToken = document.cookie
        .split('; ')
        .find(row => row.startsWith('csrftoken='))
        ?.split('=')[1];

      if (!csrfToken) {
        console.error('CSRF token not found');
        return;
      }

      // Create a FormData object
      const formData = new FormData();
      
      // Handle image deletion
      if (isDeleteOperation) {
        console.log('Deleting app screenshot:', imageData.type);
        // The backend expects the field name to be in POST data but not in FILES data
        // to trigger deletion of the corresponding override field
        if (imageData.type === 'primary') {
          formData.append('app_image_1', ''); // Send empty value for the field
        } else if (imageData.type === 'secondary') {
          formData.append('app_image_2', ''); // Send empty value for the field
        }
      }
      // Check if this is a blob URL (from a new upload) or a server URL (from initialData)
      else if (imageData.url.startsWith('blob:')) {
        console.log('Processing blob URL for app screenshot...');
        
        // Convert the blob URL to an actual file
        const blobResponse = await fetch(imageData.url);
        const blob = await blobResponse.blob();
        
        // Create a file from the blob with a descriptive filename
        const filename = `app_image_${imageData.type}_${Date.now()}.${blob.type.split('/')[1] || 'png'}`;
        const file = new File([blob], filename, { type: blob.type });
        
        console.log('Created file:', file.name, 'type:', file.type, 'size:', file.size);
        
        // Add the file to the FormData with the field name based on image type
        if (imageData.type === 'primary') {
          formData.append('app_image_1', file);
        } else if (imageData.type === 'secondary') {
          formData.append('app_image_2', file);
        }
      } else {
        // This is a server URL (from initialData)
        console.log('Processing server URL for app screenshot...');
        
        // For server URLs, we'll send the URL directly
        if (imageData.type === 'primary') {
          formData.append('app_image_1_override_url', imageData.url);
        } else if (imageData.type === 'secondary') {
          formData.append('app_image_2_override_url', imageData.url);
        }
      }
      
      // Make the API call to update the app screenshot
      const response = await fetch(`/ads/adrequest/${initialData.id}/update/`, {
        method: 'POST',
        headers: {
          'X-CSRFToken': csrfToken
        },
        body: formData
      });

      if (!response.ok) {
        throw new Error(`Error updating app screenshot: ${response.statusText}`);
      }

      const data = await response.json();
      console.log('App screenshot updated successfully:', data);

      // If we have a refreshData function, call it to update the UI
      if (refreshData) {
        refreshData();
      }
    } catch (error) {
      console.error('Error saving app screenshot:', error);
    }
  };

  // Handle marketing material uploads
  const handleMarketingMaterialUpload = async (imageData) => {
    console.log('Marketing material uploaded or deleted:', imageData);
    
    // Only proceed if we have an ID
    if (!initialData.id) return;
    
    // If imageData is undefined, it means no action should be taken
    if (imageData === undefined) return;
    
    // If imageData.url is null, it means the image should be deleted
    const isDeleteOperation = imageData?.url === null;
    
    try {
      // Get CSRF token from cookies
      const csrfToken = document.cookie
        .split('; ')
        .find(row => row.startsWith('csrftoken='))
        ?.split('=')[1];

      if (!csrfToken) {
        console.error('CSRF token not found');
        return;
      }

      // Create a FormData object
      const formData = new FormData();
      
      // Handle image deletion
      if (isDeleteOperation) {
        console.log('Deleting marketing material:', imageData.position);
        // The backend expects the field name to be in POST data but not in FILES data
        formData.append(`marketing_image_${imageData.position}`, ''); // Send empty value for the field
      }
      // Check if this is a blob URL (from a new upload) or a server URL (from initialData)
      else if (imageData.url.startsWith('blob:')) {
        console.log('Processing blob URL for marketing material...');
        
        // Convert the blob URL to an actual file
        const blobResponse = await fetch(imageData.url);
        const blob = await blobResponse.blob();
        
        // Create a file from the blob with a descriptive filename
        const filename = `marketing_image_${imageData.position}_${Date.now()}.${blob.type.split('/')[1] || 'png'}`;
        const file = new File([blob], filename, { type: blob.type });
        
        console.log('Created file:', file.name, 'type:', file.type, 'size:', file.size);
        
        // Add the file to the FormData with the field name based on position
        formData.append(`marketing_image_${imageData.position}`, file);
      } else {
        // This is a server URL (from initialData)
        console.log('Processing server URL for marketing material...');
        
        // For server URLs, we'll send the URL directly
        formData.append(`marketing_image_${imageData.position}_override_url`, imageData.url);
      }
      
      // Make the API call to update the marketing material
      const response = await fetch(`/ads/adrequest/${initialData.id}/update/`, {
        method: 'POST',
        headers: {
          'X-CSRFToken': csrfToken
        },
        body: formData
      });

      if (!response.ok) {
        throw new Error(`Error updating marketing material: ${response.statusText}`);
      }

      const data = await response.json();
      console.log('Marketing material updated successfully:', data);

      // If we have a refreshData function, call it to update the UI
      if (refreshData) {
        refreshData();
      }
    } catch (error) {
      console.error('Error saving marketing material:', error);
    }
  };

  // Product type selection is no longer needed as both containers are always visible

  // Handle website URL input change with debouncing
  const handleWebsiteUrlChange = (e) => {
    const newValue = e.target.value;
    setWebsiteUrl(newValue);

    // Clear any existing timer
    if (websiteUrlUpdateTimer.current) {
      clearTimeout(websiteUrlUpdateTimer.current);
    }

    // Set a new timer to update the database after 2 seconds of inactivity
    websiteUrlUpdateTimer.current = setTimeout(() => {
      updateWebsiteUrl(newValue);
    }, 2000);

    console.log('Website URL updated locally:', newValue);
  };
  
  // Handle key benefits input change with debouncing
  const handleKeyBenefitsChange = (e) => {
    const newValue = e.target.value;
    setKeyBenefits(newValue);

    // Clear any existing timer
    if (keyBenefitsUpdateTimer.current) {
      clearTimeout(keyBenefitsUpdateTimer.current);
    }

    // Set a new timer to update the database after 2 seconds of inactivity
    keyBenefitsUpdateTimer.current = setTimeout(() => {
      updateKeyBenefits(newValue);
    }, 2000);

    console.log('Key Benefits updated locally:', newValue);
  };

  // Function to update website URL in the database
  const updateWebsiteUrl = async (url) => {
    // Only proceed if we have an ID
    if (!initialData.id) return;

    try {
      // Get CSRF token from cookies
      const csrfToken = document.cookie
        .split('; ')
        .find(row => row.startsWith('csrftoken='))
        ?.split('=')[1];

      if (!csrfToken) {
        console.error('CSRF token not found');
        return;
      }

      // Create a FormData object for the request
      const formData = new FormData();

      // Add the company_website field directly
      // The Django view expects fields directly in request.POST
      formData.append('company_website', url);

      // Make the API call to update the website URL
      const response = await fetch(`/ads/adrequest/${initialData.id}/update/`, {
        method: 'POST',
        headers: {
          'X-CSRFToken': csrfToken
          // Don't set Content-Type header for FormData
          // The browser will set it automatically with the correct boundary
        },
        body: formData
      });

      if (!response.ok) {
        throw new Error(`Error updating website URL: ${response.statusText}`);
      }

      const data = await response.json();
      console.log('Website URL updated in database:', data);

      // If we have a refreshData function, call it to update the UI
      if (refreshData) {
        // We don't need to refresh data here as it would reset the input field
        // and potentially disrupt the user's typing
        // refreshData();
      }
    } catch (error) {
      console.error('Error saving website URL:', error);
    }
  };
  
  // Function to update key benefits in the database
  const updateKeyBenefits = async (benefits) => {
    // Only proceed if we have an ID
    if (!initialData.id) return;

    try {
      // Get CSRF token from cookies
      const csrfToken = document.cookie
        .split('; ')
        .find(row => row.startsWith('csrftoken='))
        ?.split('=')[1];

      if (!csrfToken) {
        console.error('CSRF token not found');
        return;
      }

      // Create a FormData object for the request
      const formData = new FormData();

      // Add the key_benefits field directly
      formData.append('key_benefits', benefits);

      // Make the API call to update the key benefits
      const response = await fetch(`/ads/adrequest/${initialData.id}/update/`, {
        method: 'POST',
        headers: {
          'X-CSRFToken': csrfToken
        },
        body: formData
      });

      if (!response.ok) {
        throw new Error(`Error updating key benefits: ${response.statusText}`);
      }

      const data = await response.json();
      console.log('Key benefits updated in database:', data);

      // If we have a refreshData function, call it to update the UI
      if (refreshData) {
        // We don't need to refresh data here as it would reset the input field
        // and potentially disrupt the user's typing
        // refreshData();
      }
    } catch (error) {
      console.error('Error saving key benefits:', error);
    }
  };

  // Function to determine if a color is light or dark
  const isLightColor = (hexColor) => {
    // Default to dark if invalid color
    if (!hexColor || hexColor === '#') return false;
    
    // Remove the # if present
    const hex = hexColor.replace('#', '');
    
    // Convert hex to RGB
    let r, g, b;
    if (hex.length === 3) {
      // For 3-digit hex codes like #FFF
      r = parseInt(hex.charAt(0) + hex.charAt(0), 16);
      g = parseInt(hex.charAt(1) + hex.charAt(1), 16);
      b = parseInt(hex.charAt(2) + hex.charAt(2), 16);
    } else if (hex.length === 6) {
      // For 6-digit hex codes like #FFFFFF
      r = parseInt(hex.substring(0, 2), 16);
      g = parseInt(hex.substring(2, 4), 16);
      b = parseInt(hex.substring(4, 6), 16);
    } else {
      // Invalid hex, default to dark
      return false;
    }
    
    // Calculate perceived brightness using the formula
    // (0.299*R + 0.587*G + 0.114*B)
    const brightness = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
    
    // If brightness is greater than 0.5, color is considered light
    return brightness > 0.5;
  };
  
  // State for color validation
  const [colorError, setColorError] = useState(false);
  
  // Handle color change with debouncing
  const handleColorChange = (e) => {
    let newValue = e.target.value;
    
    // Allow editing without the # prefix in the input
    if (newValue) {
      // Add the # for internal state
      newValue = newValue.startsWith('#') ? newValue : `#${newValue}`;
    }
    
    // Always update the state to allow editing
    setSelectedColor(newValue);
    
    // Basic validation for hex color format
    const hexColorRegex = /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/;
    const isValidHex = hexColorRegex.test(newValue) || newValue === '#' || newValue === '';
    
    // Update error state
    setColorError(!isValidHex);
    
    // Clear any existing timer
    if (colorUpdateTimer.current) {
      clearTimeout(colorUpdateTimer.current);
    }
    
    // Only update if we have a valid hex color or empty string
    if (isValidHex && newValue !== '#') {
      // Set a new timer to update the database after 2 seconds of inactivity
      colorUpdateTimer.current = setTimeout(() => {
        updateBrandColor(newValue);
      }, 2000);
      
      console.log('Brand color updated locally:', newValue);
    }
  };
  
  // Function to update brand color in the database
  const updateBrandColor = async (color) => {
    // Only proceed if we have an ID
    if (!initialData.id) return;
    
    try {
      // Get CSRF token from cookies
      const csrfToken = document.cookie
        .split('; ')
        .find(row => row.startsWith('csrftoken='))
        ?.split('=')[1];
        
      if (!csrfToken) {
        console.error('CSRF token not found');
        return;
      }

      // Create a FormData object for the request
      const formData = new FormData();
      
      // Add the main_hex_color field directly
      formData.append('main_hex_color', color);
      
      // Make the API call to update the color
      const response = await fetch(`/ads/adrequest/${initialData.id}/update/`, {
        method: 'POST',
        headers: {
          'X-CSRFToken': csrfToken
        },
        body: formData
      });
      
      if (!response.ok) {
        throw new Error(`Error updating brand color: ${response.statusText}`);
      }
      
      const data = await response.json();
      console.log('Brand color updated in database:', data);
      
    } catch (error) {
      console.error('Error saving brand color:', error);
    }
  };

  return (
    <div className="flex flex-col min-h-[80vh] space-y-8">
      {/* Main content area with company logo upload, website URL, and color picker */}
      <div className="flex-grow container mx-auto px-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Company Logo Upload - Takes 6/12 columns on large screens */}
          <div className="lg:col-span-6 flex flex-col gap-6">
            <div className="bg-card rounded-xl overflow-hidden">
              <CompanyLogoUpload
                onUpload={handleLogoUpload}
                className="h-full"
                initialImage={initialData.logo_override}
              />
            </div>
          </div>
          {/* Form Fields Container - Takes 6/12 columns on large screens */}
          <div className="lg:col-span-6 space-y-6">
            <div className="bg-card p-6 rounded-xl overflow-hidden h-full">
              {/* Section Title */}
              <h3 className="text-lg font-medium mb-4">Campaign Details</h3>
              {/* Website URL input field */}
              <div className="mb-6">
                <label
                  htmlFor={websiteUrlId}
                  className="block text-sm font-medium mb-2"
                >
                  Website URL
                </label>
                <Input
                  id={websiteUrlId}
                  type="url"
                  placeholder="Enter your website URL"
                  value={websiteUrl}
                  onChange={handleWebsiteUrlChange}
                />
              </div>
              {/* Brand Color Input */}
              <div className="w-full mb-6">
                <h3 className="text-sm font-medium mb-2">Brand Color</h3>
                <p className="text-xs text-muted-foreground mb-3">Enter a hex color that represents your brand identity</p>
                <div>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                      <span className="text-gray-500">#</span>
                    </div>
                    <Input
                      id={brandColorId}
                      type="text"
                      placeholder="Enter hex color (e.g. FF5500)"
                      value={selectedColor.replace('#', '')}
                      onChange={handleColorChange}
                      className={`pl-6 ${colorError ? 'border-red-500' : ''}`}
                    />
                  </div>
                  {colorError && (
                    <p className="text-xs text-red-500 mt-1">Please enter a valid hex color code (e.g. FF5500)</p>
                  )}
                  {selectedColor && !colorError && (
                    <div className="mt-2 flex items-center gap-2">
                      <div 
                        className="h-6 w-6 rounded-md border" 
                        style={{ backgroundColor: selectedColor }}
                      />
                      <span className="text-xs">{selectedColor}</span>
                    </div>
                  )}
                </div>
              </div>
              {/* Key Benefits Input Section */}
              <div className="w-full">
                <h3 className="text-sm font-medium mb-2">Key Benefits</h3>
                <p className="text-xs text-muted-foreground mb-3">Add the key benefits of your product or service</p>
                <div>
                  <Input
                    id={keyBenefitsId}
                    type="text"
                    placeholder="E.g. Fast delivery, 24/7 support..."
                    value={keyBenefits}
                    onChange={handleKeyBenefitsChange}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation buttons at the bottom */}
      {/* Product Type Containers with Image Uploads */}
      <div className="container mx-auto px-4 mb-8">
        <ProductTypeSelect
          onProductImageUpload={handleProductImageUpload}
          onAppScreenshotUpload={handleAppScreenshotUpload}
          initialData={initialData}
        />
      </div>

      {/* Marketing Materials Section - Always visible */}
      <div className="container mx-auto px-4 my-8">
        <div className="bg-card rounded-xl overflow-hidden">
          <MarketingMaterialUpload
            onUpload={handleMarketingMaterialUpload}
            initialData={initialData}
          />
        </div>
      </div>

      {/* Navigation buttons at the bottom */}
      <div className="w-full px-4 flex justify-between pb-8">
        <BackButton
          onClick={handleBack}
          isLoading={isBackSubmitting}
        />
        <NextButton
          onClick={handleNext}
        />
      </div>
    </div>
  );
};

export default StepTwoComponent;
