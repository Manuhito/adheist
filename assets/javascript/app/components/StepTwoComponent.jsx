import React, { useId, useState, useEffect, useRef } from 'react';
import { NextButton } from '../../components/ui/next-button.jsx';
import { BackButton } from '../../components/ui/back-button.jsx';
import { CompanyLogoUpload } from './CompanyLogoUpload.jsx';
import { ProductImageUpload } from './ProductImageUpload.jsx';
import { AppScreenshotUpload } from './AppScreenshotUpload.jsx';
import { ProductTypeSelect } from "./ProductTypeSelect";
import { ProductImageSection } from "./ProductImageSection"; // No necesitas el .jsx al final
import { Input } from '../../components/ui/input.tsx';
import { Button } from '../../components/ui/button.tsx';
import { useTranslation } from '../../lib/useTranslation';
import BrandDropdown from './BrandDropdown.jsx';
import ImageSelectionModal from './ImageSelectionModal.jsx';

/**
 * Step Two Component for the Create Ad Request flow
 * Handles image upload, color selection, and navigation
 */
const StepTwoComponent = ({ onComplete, initialData = {}, refreshData }) => {
  const { t } = useTranslation();
  const [isBackSubmitting, setIsBackSubmitting] = useState(false);
  const [isImageModalOpen, setIsImageModalOpen] = useState(false);
  const [productLibraryImages, setProductLibraryImages] = useState({
    primary: null,
    secondary: null
  });

  // Estado para los datos completos del adlibrary
  const [adLibraryData, setAdLibraryData] = useState(null);
  const [isAdLibraryLoading, setIsAdLibraryLoading] = useState(false);
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

  const [colorError, setColorError] = useState(false);
  const [selectedBrand, setSelectedBrand] = useState(initialData.brand || null);

  // We no longer need to track product type selection as both containers are always visible

  // Debounce timers
  const websiteUrlUpdateTimer = useRef(null);
  const keyBenefitsUpdateTimer = useRef(null);
  const colorUpdateTimer = useRef(null);
  const brandUpdateTimer = useRef(null);

  // Solo refrescar datos si es necesario (por ejemplo, al recargar la página directamente)
  // No hacemos la llamada automáticamente para evitar duplicación con handleStepComplete
  useEffect(() => {
    // Comprobamos si venimos de una recarga de página o navegación directa
    const isDirectNavigation = !document.referrer.includes(window.location.host);

    if (refreshData && initialData?.id && isDirectNavigation) {
      refreshData();
    }

    // Ensure selectedBrand is set from initialData if available
    if (initialData.brand) {
      setSelectedBrand(initialData.brand);
    }
  }, []);

  // Asegurar que el scroll esté al inicio de la página cuando el componente se monte
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  // Fetch adlibrary info cuando tengamos el ID o limpia adLibraryData cuando no lo tenemos
  useEffect(() => {
    if (!initialData.ad_library_id) {
      // Si no hay ad_library_id, limpiamos adLibraryData para que se muestre la imagen cargada por el usuario
      setAdLibraryData(null);
      return;
    }

    setIsAdLibraryLoading(true);
    // Usamos el ID específico para garantizar que obtenemos exactamente el adlibrary seleccionado
    fetch(`/ads/adlibraries/${initialData.ad_library_id}/`)
      .then(res => res.json())
      .then(data => {
        // Si la respuesta es directamente el objeto adlibrary
        if (data && data.id) {
          setAdLibraryData(data);
        }
        // Si la respuesta viene en un formato diferente, intentamos encontrar el adlibrary
        else {
          let found = null;
          if (Array.isArray(data) && data.length > 0) found = data[0];
          else if (Array.isArray(data?.results) && data.results.length > 0) found = data.results[0];
          else if (Array.isArray(data?.adlibraries) && data.adlibraries.length > 0) found = data.adlibraries[0];
          setAdLibraryData(found);
        }
      })
      .catch((error) => {
        console.error('Error fetching adlibrary:', error);
        setAdLibraryData(null);
      })
      .finally(() => setIsAdLibraryLoading(false));
  }, [initialData.ad_library_id]);

  // Precargar imágenes de producto cuando cambia initialData
  useEffect(() => {
    console.log('Precargando imágenes de producto...', initialData);
    
    // Verificar si hay imágenes de producto en initialData
    if (initialData && initialData.id) {
      // Primero intentamos obtener las imágenes desde product_image_X_override
      // que son las URLs directas a las imágenes
      const primaryImage = initialData.product_image_1_override || null;
      const secondaryImage = initialData.product_image_2_override || null;
      
      console.log('Imágenes encontradas:', { primaryImage, secondaryImage });
      
      // Actualizar el estado con las imágenes encontradas
      setProductLibraryImages({
        primary: primaryImage,
        secondary: secondaryImage
      });
    }
  }, [initialData]);
  
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

    // Track event in PostHog when user clicks Back button to return to Step One
    if (window.posthog) {
      window.posthog.capture('Back Button pressed', {
        page: 'Step 2',
      });
    }

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

    // Track event in PostHog when Next button is pressed
    if (window.posthog) {
      window.posthog.capture('Next Button pressed', {
        page: 'Step 2'
      });
    }

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
      // Track event in PostHog when user advances from Step Two
      if (window.posthog) {
        window.posthog.capture('Ad Creation Step 2 Completed', {
          timestamp: new Date().toISOString(),
          ad_request_id: initialData.id,
        });
      }

      onComplete({
        websiteUrl,
        keyBenefits,
        brandColor: selectedColor,
        productImages: {}, // Will be populated with actual image data
        appScreenshots: {} // Will be populated with actual screenshot data
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

  // Save product library image to backend
  const saveProductLibraryImage = async (fieldName, imageData) => {
    // Only proceed if we have an ID
    if (!initialData.id) return;
    
    try {
      // Get CSRF token
      const csrfToken = getCsrfToken();
      
      if (!csrfToken) {
        console.error('CSRF token not found');
        return;
      }
      
      // Create FormData
      const formData = new FormData();
      
      // If imageData is null or url is null, it means we want to delete the image
      if (imageData === null || imageData.url === null) {
        formData.append(fieldName, '');
      } 
      // Check if this is a blob URL (new upload)
      else if (imageData.url.startsWith('blob:')) {
        // Convert blob URL to file
        const blobResponse = await fetch(imageData.url);
        const blob = await blobResponse.blob();
        
        // Create file
        const filename = `${fieldName}_${Date.now()}.${blob.type.split('/')[1] || 'png'}`;
        const file = new File([blob], filename, { type: blob.type });
        
        // Add to FormData
        formData.append(fieldName, file);
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
        throw new Error(`Error updating product library image: ${response.statusText}`);
      }
      
      const data = await response.json();
      console.log('Product library image updated successfully:', data);
      
      // Refresh data if needed
      if (refreshData) {
        refreshData();
      }
    } catch (error) {
      console.error('Error saving product library image:', error);
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

  // Handle image selection from modal
  const handleImageSelect = (image) => {
    console.log('Image selected from modal:', image);
    // Get the selection source and field from window variables
    const selectionSource = window.currentImageSelectionSource;
    const fieldName = window.currentImageField;
    
    // Extraer la URL del objeto de imagen para la visualización
    const imageUrl = image?.url || null;
    
    if (selectionSource === 'product_library' && imageUrl && fieldName) {
      // Update product library images state using the field name
      // Map field name to state key (primary/secondary) for backward compatibility
      const stateKey = fieldName === 'product_image_1' ? 'primary' : 'secondary';
      
      setProductLibraryImages(prev => ({
        ...prev,
        [stateKey]: imageUrl
      }));
      
      // Save to backend if we have an ID
      if (initialData.id) {
        // Pasar el objeto completo de imagen que incluye el ID
        saveProductLibraryImage(fieldName, image);
      }
    } else {
      // Default behavior (logo)
      handleLogoUpload(imageUrl);
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
    }
  };
  
  // Handle product image library selection
  const handleProductImageLibrarySelect = async (imageData) => {
    console.log('Product library image selected:', imageData);
    
    // Open the image selection modal
    setIsImageModalOpen(true);
    
    // Store only the field name and source - we don't need type anymore
    window.currentImageSelectionSource = 'product_library';
    window.currentImageField = imageData.field;
  };
  
  // Handle product image deletion
  const handleProductImageDelete = async (imageData) => {
    console.log('Product image delete requested:', imageData);
    
    // Map field name to state key (primary/secondary) for backward compatibility
    const stateKey = imageData.field === 'product_image_1' ? 'primary' : 'secondary';
    
    // Update state to remove the image
    setProductLibraryImages(prev => ({
      ...prev,
      [stateKey]: null
    }));
    
    // Save to backend if we have an ID - pass null to indicate deletion
    if (initialData.id) {
      saveProductLibraryImage(imageData.field, null);
    }
  };

  // Function to handle brand selection change
  const handleBrandChange = (brand) => {
    setSelectedBrand(brand);

    // Only proceed if we have an ID and a brand
    if (!initialData.id || !brand) return;

    // Clear any existing timer
    if (brandUpdateTimer.current) {
      clearTimeout(brandUpdateTimer.current);
    }

    // Set a new timer to update the database after a short delay
    brandUpdateTimer.current = setTimeout(() => {
      updateBrand(brand);
    }, 500);

    console.log('Brand updated locally:', brand);
  };

  // Function to update brand in the database
  const updateBrand = async (brand) => {
    // Only proceed if we have an ID and a brand
    if (!initialData.id || !brand) return;

    try {
      const csrfToken = getCsrfToken();
      if (!csrfToken) {
        console.error('CSRF token not found');
        return;
      }

      // Create a FormData object for the request
      const formData = new FormData();

      // Add the brand_id field
      formData.append('brand_id', brand.id);

      // Make the API call to update the brand
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
      console.log('Brand updated in database:', data);

      // If we have a refreshData function, call it to update the UI
      if (refreshData) {
        console.log('Refreshing data after brand update...');
        // Fetch fresh data and update the component state with the new assets
        const freshData = await refreshData();

        if (freshData) {
          // Update local state with the new asset_overrides
          if (freshData.asset_overrides !== undefined) {
            // Update website URL (force update even if empty)
            setWebsiteUrl(freshData.asset_overrides.company_website || '');

            // Update key benefits (force update even if empty)
            setKeyBenefits(freshData.asset_overrides.key_benefits || '');

            // Update brand color (force update even if empty)
            setSelectedColor(freshData.asset_overrides.main_hex_color || '');
          }
        }
      }
    } catch (error) {
      console.error('Error saving brand:', error);
    }
  };

  return (
    <div className="w-full min-h-screen flex flex-col">
      <div className="flex-1 w-full max-w-7xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
          {/* Summary section lateral izquierdo */}
          <aside className="lg:col-span-4 mb-8 lg:mb-0 h-full flex flex-col">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 flex flex-col gap-y-4 items-start h-full">
              <h2 className="text-xl font-semibold mb-4">{t('step_two.summary', 'Summary')}</h2>
              <div className="bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 p-8 rounded-md h-full w-full flex flex-col flex-1">
                <div className="flex flex-col gap-y-8">
                  {/* Ad Style */}
                  <div className="flex flex-col items-center text-center">
                    <div className="group relative w-full max-w-[600px] aspect-square rounded-lg overflow-hidden shadow border bg-white dark:bg-gray-800 mx-auto">
                      {isAdLibraryLoading ? (
                        <div className="flex items-center justify-center w-full h-full text-gray-400 animate-pulse">{t('step_two.loading', 'Loading...')}</div>
                      ) : adLibraryData ? (
                        <>
                          <img
                            src={adLibraryData.ad_image || 'https://images.unsplash.com/photo-1557804506-669a67965ba0'}
                            alt={adLibraryData.company_name || 'Ad Preview'}
                            className="object-cover w-full h-full transition-transform duration-300 group-hover:scale-105"
                            style={{ maxWidth: '600px', width: '100%', maxHeight: '100%' }}
                          />
                          <div className="absolute inset-0 bg-black/70 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col justify-center items-center text-white p-2">
                            <h4 className="text-sm font-semibold mb-1">{adLibraryData.company_name || 'Ad Library'}</h4>
                            {adLibraryData.industries && adLibraryData.industries.length > 0 && (
                              <p className="text-xs mb-1 text-center">
                                {Array.isArray(adLibraryData.industries) ? adLibraryData.industries.join(', ') : adLibraryData.industries}
                              </p>
                            )}
                            {adLibraryData.tags && (
                              <p className="text-xs text-blue-200">
                                {Array.isArray(adLibraryData.tags) ? adLibraryData.tags.join(', ') : adLibraryData.tags}
                              </p>
                            )}
                          </div>
                        </>
                      ) : initialData.user_uploaded_image ? (
                        <>
                          <img
                            src={initialData.user_uploaded_image}
                            alt={t('step_two.user_uploaded_image', 'User Uploaded Image')}
                            className="object-cover w-full h-full transition-transform duration-300 group-hover:scale-105"
                            style={{ maxWidth: '600px', width: '100%', maxHeight: '100%' }}
                          />
                          <div className="absolute inset-0 bg-black/70 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col justify-center items-center text-white p-2">
                            <h4 className="text-sm font-semibold mb-1">{t('step_two.custom_image', 'Custom Image')}</h4>
                            <p className="text-xs mb-1 text-center">{t('step_two.user_uploaded', 'User uploaded')}</p>
                          </div>
                        </>
                      ) : (
                        <div className="flex items-center justify-center w-full h-full text-gray-400">{t('step_two.no_ad_selected', 'No ad style selected')}</div>
                      )}
                    </div>
                  </div>
                  <hr className="my-6 opacity-0" />
                  {/* Canvas Size */}
                  <div className="flex-col items-center text-center">
                    <div className="mb-2">
                      {(() => {
                        const canvasSizes = [
                          { id: '1024x1024', label: t('step_one.square', 'Square'), size: '1024 x 1024' },
                          { id: '1536x1024', label: t('step_one.landscape', 'Landscape'), size: '1536 x 1024' },
                          { id: '1024x1536', label: t('step_one.portrait', 'Portrait'), size: '1024 x 1536' },
                          { id: 'auto', label: t('step_one.auto_desc', 'Automatic'), size: t('step_one.auto', 'auto') },
                        ];
                        const item = canvasSizes.find(c => c.id === initialData.canvas_size);
                        if (item) {
                          return (
                            <div className="flex flex-col items-center">
                              {item.id === "1024x1024" && (
                                <div className="w-full max-w-[100px] aspect-square border-2 border-gray-300 rounded-sm mb-2 mx-auto" />
                              )}
                              {item.id === "1536x1024" && (
                                <div className="w-full max-w-[100px] aspect-[3/2] border-2 border-gray-300 rounded-sm mb-2 mx-auto" />
                              )}
                              {item.id === "1024x1536" && (
                                <div className="w-full max-w-[100px] aspect-[2/3] border-2 border-gray-300 rounded-sm mb-2 mx-auto" />
                              )}
                              {item.id === "auto" && (
                                <div className="w-full max-w-[100px] aspect-square border-2 border-dashed border-gray-300 rounded-full flex items-center justify-center mb-2 text-xs text-gray-400 mx-auto">{t('step_one.auto', 'Auto')}</div>
                              )}
                              <span className="font-semibold text-xs">{item.label}</span>
                              <span className="text-xs text-gray-500">{item.size}</span>
                            </div>
                          );
                        } else {
                          return (
                            <div className="flex flex-col items-center">
                              <div className="w-full max-w-[100px] aspect-square border-2 border-dashed border-gray-200 rounded-sm mb-2 flex items-center justify-center text-xs text-gray-400">?</div>
                              <span className="font-semibold text-xs text-gray-400">{t('step_two.unknown', 'Unknown')}</span>
                              <span className="text-xs text-gray-400">{initialData.canvas_size || t('step_two.not_specified', 'Not specified')}</span>
                            </div>
                          );
                        }
                      })()}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </aside>
          {/* Main column derecha: branding, details, product type */}
          <main className="lg:col-span-8 flex flex-col">
            {/* Brand Dropdown - Global selection */}
            <div className="w-full">
              <BrandDropdown
                initialBrandId={initialData.brand?.id}
                onBrandChange={handleBrandChange}
              />
              {!initialData.brand && (
                <p className="text-xs text-amber-500 mt-1">{t('step_two.select_brand_first', 'Please select a brand to add assets')}</p>
              )}
            </div>
            {/* Branding + Campaign Details en dos columnas */}
            <div className="flex flex-row gap-x-6 w-full">
              {/* Company Branding (izquierda) */}
              <div className="bg-card rounded-xl flex flex-col items-start">
                <CompanyLogoUpload
                  onUpload={handleLogoUpload}
                  initialImage={initialData.logo_override}
                />
              </div>
              {/* Campaign Details (derecha) */}
              <div className="bg-card p-6 rounded-xl overflow-hidden h-full flex-1">
                <h3 className="text-lg font-medium mb-4">{t('step_two.campaign_details', 'Campaign Details')}</h3>
                <div className="mb-6">
                  <label
                    htmlFor={websiteUrlId}
                    className="block text-sm font-medium mb-2"
                  >
                    {t('step_two.website_url', 'Website URL')}
                  </label>
                  <Input
                    id={websiteUrlId}
                    type="url"
                    placeholder={t('step_two.enter_website_url', 'Enter your website URL')}
                    value={websiteUrl}
                    onChange={handleWebsiteUrlChange}
                    className="w-full"
                    disabled={!initialData.brand}
                  />
                </div>
                <div className="w-full mb-6">
                  <h3 className="text-sm font-medium mb-2">{t('step_two.brand_color', 'Brand Color')}</h3>
                  <p className="text-xs text-muted-foreground mb-3">{t('step_two.enter_hex_color', 'Enter a hex color that represents your brand identity')}</p>
                  <div>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                        <span className="text-gray-500">#</span>
                      </div>
                      <Input
                        id={brandColorId}
                        type="text"
                        placeholder={t('step_two.enter_hex_color_example', 'Enter hex color (e.g. FF5500)')}
                        value={selectedColor.replace('#', '')}
                        onChange={handleColorChange}
                        className={`w-full pl-6 ${colorError ? 'border-red-500' : ''}`}
                        disabled={!initialData.brand}
                      />
                    </div>
                    {colorError && (
                      <p className="text-xs text-red-500 mt-1">{t('step_two.enter_valid_hex_color', 'Please enter a valid hex color code (e.g. FF5500)')}</p>
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
                <div className="w-full">
                  <h3 className="text-sm font-medium mb-2">{t('step_two.key_benefits', 'Key Benefits')}</h3>
                  <p className="text-xs text-muted-foreground mb-3">{t('step_two.add_key_benefits', 'Add the key benefits of your product or service')}</p>
                  <div>
                    <Input
                      id={keyBenefitsId}
                      type="text"
                      placeholder={t('step_two.key_benefits_example', 'E.g. Fast delivery, 24/7 support...')}
                      value={keyBenefits}
                      onChange={handleKeyBenefitsChange}
                      className="w-full"
                      disabled={!initialData.brand}
                    />
                  </div>
                </div>
              </div>
            </div>
            {/* Product Type */}
            <div>
              <ProductTypeSelect
                onProductImageUpload={handleProductImageUpload}
                onAppScreenshotUpload={handleAppScreenshotUpload}
                initialData={initialData}
              />
            </div>
            
            {/* Product Image Section */}
            <div className="mt-6">
              <ProductImageSection
                onSelectImage={handleProductImageLibrarySelect}
                onDeleteImage={handleProductImageDelete}
                selectedImages={productLibraryImages}
              />
            </div>
          </main>
        </div>
      </div>
      {/* Image Selection Modal */}
      <ImageSelectionModal 
        isOpen={isImageModalOpen} 
        onClose={toggleImageModal} 
        onSelect={handleImageSelect} 
      />

      {/* Botones de navegación */}
      <div className="w-full px-4 flex justify-between pb-8 max-w-7xl mx-auto">
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
