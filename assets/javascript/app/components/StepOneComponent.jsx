import React, { useState, useEffect, createContext, useContext } from 'react';
import { SearchComponent } from './SearchComponent';
import { FilterFormComponent } from './FilterFormComponent';
import InteractiveBentoGallery from '../../components/ui/interactive-bento-gallery.jsx';
import { Building, X, Upload, ImageIcon, Plus } from 'lucide-react';
import { Switch } from '../../components/ui/switch.tsx';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../../shadcn/components/ui/tooltip';
import { NextButton } from '../../components/ui/next-button.jsx';
import { useTranslation } from '../../lib/useTranslation';
import { ImageUpload } from '../../components/ui/image-upload';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../shadcn/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '../../shadcn/components/ui/dialog';
import { Button } from '../../shadcn/components/ui/button';

// Contexto para almacenar en caché las industrias y etiquetas
const FilterCacheContext = createContext({
  industries: [],
  tags: [],
  isLoading: false,
  loadFilterData: () => { }
});

/**
 * Proveedor de caché para filtros que carga y almacena datos de industrias y etiquetas
 */
export const FilterCacheProvider = ({ children }) => {
  const [industries, setIndustries] = useState([]);
  const [tags, setTags] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);

  // Función para cargar los datos de filtros
  const loadFilterData = () => {
    // Si ya están cargados, no hacer nada
    if (isLoaded) {
      const cacheId = window._filterCacheId || 'unknown';
      console.log(`[CACHE HIT] ✅ [${cacheId}] Usando datos en caché - industries: ${industries.length}, tags: ${tags.length}`);
      return Promise.resolve({ industries, tags });
    }

    const startTime = performance.now();
    const cacheId = window._filterCacheId || 'unknown';
    console.log(`[CACHE MISS] ⏳ [${cacheId}] Cargando datos desde la API - timestamp: ${new Date().toISOString()}`);
    setIsLoading(true);

    // Cargar industrias y etiquetas en paralelo
    const fetchIndustries = fetch('/ads/industries/').then(res => res.json());
    const fetchTags = fetch('/ads/tags/').then(res => res.json());

    return Promise.all([fetchIndustries, fetchTags])
      .then(([industriesData, tagsData]) => {
        // Procesar datos de industrias
        const industryList = industriesData.industries || [];
        // Convertir a formato de opciones para MultipleSelector
        const industryOptions = industryList.map(industry => ({
          value: industry,
          label: industry
        }));
        setIndustries(industryOptions);
        console.log('Industries loaded:', industryList.length);

        // Procesar datos de etiquetas
        const tagList = tagsData.tags || [];
        // Convertir a formato de opciones para MultipleSelector
        const tagOptions = tagList.map(tag => ({
          value: tag,
          label: tag
        }));
        setTags(tagOptions);
        console.log('Tags loaded:', tagList.length);

        const endTime = performance.now();
        const loadTime = (endTime - startTime).toFixed(2);
        const cacheId = window._filterCacheId || 'unknown';
        console.log(`[CACHE LOADED] ✅ [${cacheId}] Datos cargados en ${loadTime}ms - industries: ${industryOptions.length}, tags: ${tagOptions.length}`);
        // Guardar en localStorage para diagnóstico
        try {
          const perfData = JSON.parse(localStorage.getItem('filterCachePerfData') || '[]');
          perfData.push({
            timestamp: new Date().toISOString(),
            loadTime: parseFloat(loadTime),
            industriesCount: industryOptions.length,
            tagsCount: tagOptions.length,
            cacheId
          });
          localStorage.setItem('filterCachePerfData', JSON.stringify(perfData.slice(-10))); // Guardar solo los últimos 10
        } catch (e) {
          console.error('Error guardando datos de rendimiento:', e);
        }
        setIsLoading(false);
        setIsLoaded(true);

        return { industries: industryOptions, tags: tagOptions };
      })
      .catch(error => {
        console.error('Error loading filter data:', error);
        setIsLoading(false);
        return { industries: [], tags: [] };
      });
  };

  // Cargar datos al montar el componente (una sola vez)
  useEffect(() => {
    console.log('[CACHE INIT] 🚀 Inicializando caché de filtros - timestamp:', new Date().toISOString());
    // Añadir un identificador único para esta sesión para rastrear en los logs
    window._filterCacheId = Math.random().toString(36).substring(2, 8);
    console.log(`[CACHE ID] 🔑 ID de sesión de caché: ${window._filterCacheId}`);
    loadFilterData();
  }, []);

  return (
    <FilterCacheContext.Provider value={{ industries, tags, isLoading, loadFilterData }}>
      {children}
    </FilterCacheContext.Provider>
  );
};

/**
 * Hook personalizado para acceder a los datos de caché de filtros
 */
export const useFilterCache = () => useContext(FilterCacheContext);

/**
 * Step One Component for the Create Ad Request flow
 * Handles selection of ad library and canvas size
 * Based on the original CreateAdRequestApp component
 */
const StepOneComponent = ({ onComplete, initialData = {}, refreshData }) => {
  const { t } = useTranslation();
  // Centralized state for all filters
  const [selectedCompany, setSelectedCompany] = useState('');
  const [selectedIndustries, setSelectedIndustries] = useState([]);
  const [selectedTags, setSelectedTags] = useState([]);
  const [showOnlyActive, setShowOnlyActive] = useState(true);
  const [filteredResults, setFilteredResults] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  // Estados para la paginación
  const [currentPage, setCurrentPage] = useState(1);
  const [hasMorePages, setHasMorePages] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  // Initialize selected canvas size directly with the size value from initialData
  const [selectedCanvasSize, setSelectedCanvasSize] = useState(initialData.canvas_size || null);
  const [selectedAdLibrary, setSelectedAdLibrary] = useState(initialData.ad_library_id || null);
  // State for user uploaded image (both URL preview and File object)
  const [userUploadedImage, setUserUploadedImage] = useState(null);
  const [userUploadedFile, setUserUploadedFile] = useState(null);
  const [imageSource, setImageSource] = useState('library'); // Por defecto, mostrar la pestaña 'Select from Library'
  // Key for forcing re-render of ImageUpload component
  const [imageUploadKey, setImageUploadKey] = useState(Date.now());
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState(null);
  // State for the request brand modal
  const [isRequestModalOpen, setIsRequestModalOpen] = useState(false);
  const [brandUrl, setBrandUrl] = useState('');
  const [requestStatus, setRequestStatus] = useState({ loading: false, success: false, error: null });
  
  // Function to get CSRF token from cookie
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

  // Function to handle brand request submission
  const handleBrandRequest = async () => {
    if (!brandUrl.trim()) return;
    
    setRequestStatus({ loading: true, success: false, error: null });
    
    try {
      const csrfToken = getCsrfToken();
      console.log('CSRF Token:', csrfToken); // For debugging
      
      const response = await fetch('/ads/api/request-brand/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRFToken': csrfToken
        },
        body: JSON.stringify({ brand_url: brandUrl.trim() })
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to submit brand request');
      }
      
      setRequestStatus({ loading: false, success: true, error: null });
      
      // Close modal after success (optional - can keep open to show success message)
      // setTimeout(() => setIsRequestModalOpen(false), 2000);
    } catch (error) {
      console.error('Error submitting brand request:', error);
      setRequestStatus({ loading: false, success: false, error: error.message });
    }
  };

  // Function to call the API with all filters
  const fetchFilteredResults = (page = 1, append = false) => {
    // Build URL with parameters
    const params = new URLSearchParams();
    
    // Establecer estado de carga apropiado
    if (page === 1) {
      setIsLoading(true);
      setIsLoadingMore(false);
    } else {
      setIsLoadingMore(true);
    }

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
    
    // Add active filter
    params.append('is_active', showOnlyActive);
    
    // Add pagination parameters
    params.append('page', page);
    params.append('page_size', 20); // Tamaño de página fijo

    // Always call the API, even when no filters are selected
    fetch(`/ads/adlibraries/?${params.toString()}`)
      .then(response => response.json())
      .then(data => {
        // Actualizar estado de paginación
        if (data && data.pagination) {
          setHasMorePages(data.pagination.has_next);
          setCurrentPage(data.pagination.current_page);
        } else {
          setHasMorePages(false);
        }
        
        // Procesar los resultados
        let newResults = [];
        
        // Verify data structure
        if (data && Array.isArray(data.adlibraries)) {
          // Si tenemos la estructura esperada con el nuevo endpoint paginado
          newResults = data.adlibraries;
        } else if (data && Array.isArray(data)) {
          // Si data es directamente un array
          newResults = data;
        } else if (data && Array.isArray(data.results)) {
          // Si data tiene una propiedad results que es un array
          newResults = data.results;
        } else if (data && typeof data === 'object') {
          // Si data es un objeto, intentar convertirlo a array
          const resultsArray = Object.values(data).filter(item => typeof item === 'object');
          if (resultsArray.length > 0 && Array.isArray(resultsArray[0])) {
            newResults = resultsArray[0];
          } else {
            newResults = resultsArray;
          }
        }
        
        // Si estamos añadiendo más resultados (append), concatenar con los existentes
        if (append && page > 1) {
          setFilteredResults(prevResults => [...prevResults, ...newResults]);
        } else {
          // Si es la primera página o estamos reemplazando, establecer directamente
          setFilteredResults(newResults);
        }

        // Desactivar indicadores de carga
        setIsLoading(false);
        setIsLoadingMore(false);
      })
      .catch(error => {
        console.error('Error applying filters:', error);
        if (!append) {
          setFilteredResults([]);
        }
        setIsLoading(false);
        setIsLoadingMore(false);
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
        industry: industry,
        is_fav: item.is_fav || false, // Incluir la propiedad is_fav para que funcione el icono de estrella
        page_url: item.page_url || null // Incluir page_url para el avatar
      };
    });
  };

  // Call the API when any filter changes
  useEffect(() => {
    // Resetear a la primera página cuando cambian los filtros
    setCurrentPage(1);
    setHasMorePages(true);
    fetchFilteredResults(1, false);
  }, [selectedCompany, selectedIndustries, selectedTags, showOnlyActive]);

  // Fetch fresh data when component mounts
  useEffect(() => {
    if (refreshData && initialData?.id) {
      refreshData();
    } else {
      // Cargar datos iniciales
      fetchFilteredResults(1, false);
    }
  }, []);
  
  // Función para cargar más resultados
  const loadMoreResults = () => {
    if (!isLoading && !isLoadingMore && hasMorePages) {
      const nextPage = currentPage + 1;
      fetchFilteredResults(nextPage, true);
    }
  };

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

  // Handle active filter change
  const handleActiveFilterChange = (isActive) => {
    setShowOnlyActive(isActive);
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
    
    // Auto-scroll to the bottom of the page
    setTimeout(() => {
      window.scrollTo({
        top: document.documentElement.scrollHeight,
        behavior: 'smooth'
      });
    }, 100);
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
    // Resetear a la primera página cuando se limpian los filtros
    setCurrentPage(1);
    setHasMorePages(true);
  };

  // Check if any filters are active
  const hasActiveFilters = selectedCompany || selectedIndustries.length > 0 || selectedTags.length > 0;

  // Handle next step (create or update ad request)
  const handleNextStep = async () => {
    // Track event in PostHog when Next button is pressed
    if (window.posthog) {
      window.posthog.capture('Next Button pressed', {
        page: 'Step 1'
      });
    }

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

        // Track event in PostHog when user advances to Step Two
        if (window.posthog) {
          window.posthog.capture('Ad Creation Step One Completed', {
            timestamp: new Date().toISOString(),
            ad_request_id: data.id,
            canvas_size: selectedCanvasSize,
            ad_library_id: completeData.ad_library_id || null,
            user_uploaded_img: !!completeData.has_user_uploaded_image
          });
        }

        onComplete(completeData);
      }
    } catch (error) {
      console.error('Error processing ad request:', error);
      setSubmitError(error.message || t('step_one.unexpected_error', 'An unexpected error occurred'));
      setIsSubmitting(false);
    }
  };


  // Handle gallery item selection
  const handleGalleryItemSelect = (item) => {
    console.log('Selected gallery item:', item);
    setSelectedAdLibrary(item.id);
    setImageSource('library');
    setUserUploadedImage(null);
    
    // Auto-scroll to the bottom of the page
    setTimeout(() => {
      window.scrollTo({
        top: document.documentElement.scrollHeight,
        behavior: 'smooth'
      });
    }, 100);
  };

  // Render the component
  return (
    <div className="space-y-3 flex flex-col items-center w-full">
      <div className="w-full relative">
        {/* Contenedor de filtros en línea horizontal */}
        <div className="flex flex-nowrap gap-3 w-full overflow-visible pb-2 items-center">
          {/* Toggle de 'only active ads' */}
          <div className="flex items-center space-x-2 pr-2 border-r border-gray-200">
            <Switch
              id="only-active-ads"
              checked={showOnlyActive}
              onCheckedChange={(checked) => {
                setShowOnlyActive(checked);
                handleActiveFilterChange(checked);
              }}
              className="data-[state=checked]:bg-primary"
            />
            <label htmlFor="only-active-ads" className="text-sm font-medium cursor-pointer whitespace-nowrap">
              {t('bento_gallery.only_active_ads', 'Only active Ads')}
            </label>
          </div>
          
          {/* Filtro de compañía */}
          <div className="flex-1 min-w-[180px] max-w-[30%] flex">
            <div className="w-full">
              <div>
                <SearchComponent
                  selectedCompany={selectedCompany}
                  onCompanyChange={handleCompanyChange}
                />
              </div>
            </div>
          </div>

          {/* Filtros de industrias y etiquetas */}
          <FilterFormComponent
            selectedIndustries={selectedIndustries}
            selectedTags={selectedTags}
            onIndustriesChange={handleIndustriesChange}
            onTagsChange={handleTagsChange}
          />
          
          {/* Botón de limpiar filtros en la misma fila que los filtros */}
          {hasActiveFilters && (
            <div className="ml-auto">
              <button
                onClick={handleClearFilters}
                className="group flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-gray-500 hover:text-primary transition-all duration-200 ease-in-out hover:scale-105 active:scale-95 relative overflow-hidden rounded-full"
                aria-label="Clear all filters"
              >
                <span className="relative z-10">{t('step_one.clear_filters', 'Clear filters')}</span>
                <X className="h-3.5 w-3.5 relative z-10 group-hover:rotate-90 transition-transform duration-300" />
                <span className="absolute inset-0 bg-gray-100 opacity-0 group-hover:opacity-100 group-active:opacity-80 rounded-full scale-0 group-hover:scale-100 transition-all duration-300 ease-out" />
              </button>
            </div>
          )}
        </div>
      </div>
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
              <div className="overflow-y-auto max-h-[600px] border border-gray-200 rounded-lg shadow-sm flex justify-center items-center py-20">
                <div className="flex flex-col items-center">
                  <div className="w-12 h-12 border-3 border-primary/30 border-t-primary rounded-full animate-spin mb-4"></div>
                  <p className="text-muted-foreground">{t('step_one.loading', 'Loading results...')}</p>
                </div>
              </div>
            ) : galleryItems.length > 0 ? (
              <>
                <div 
                  className="overflow-y-auto max-h-[600px] border border-gray-200 rounded-lg shadow-sm"
                  onScroll={(e) => {
                    // Detectar cuando el usuario ha llegado cerca del final del scroll
                    const { scrollTop, scrollHeight, clientHeight } = e.currentTarget;
                    // Si estamos a 200px o menos del final, cargar más resultados
                    if (scrollHeight - scrollTop - clientHeight <= 200) {
                      loadMoreResults();
                    }
                  }}
                >
                  <InteractiveBentoGallery
                    mediaItems={galleryItems}
                    title={t('step_one.gallery_title', 'Select Your Ideal Ad Style')}
                    description={
                      <>
                        {t('step_one.gallery_description_part1', "Didn't find your favourite company?")}{' '}
                        <span 
                          className="text-primary underline cursor-pointer hover:text-primary/80 transition-colors"
                          onClick={() => setIsRequestModalOpen(true)}
                        >
                          {t('step_one.gallery_description_part2', "Request a new brand")}
                        </span>
                      </>
                    }
                    onActiveFilterChange={handleActiveFilterChange}
                    initialActiveFilter={showOnlyActive}
                    onItemSelect={handleGalleryItemSelect}
                    selectedItemId={selectedAdLibrary}
                  />
                  {isLoadingMore && (
                    <div className="py-4 flex justify-center">
                      <div className="w-8 h-8 border-3 border-primary/30 border-t-primary rounded-full animate-spin"></div>
                    </div>
                  )}
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
                customDescription={" "}
                initialImage={userUploadedImage}
              />
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

      {/* Modal para solicitar una nueva marca */}
      <Dialog open={isRequestModalOpen} onOpenChange={(open) => {
        if (!open) {
          // Reset form state when closing
          setBrandUrl('');
          setRequestStatus({ loading: false, success: false, error: null });
        }
        setIsRequestModalOpen(open);
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('request_brand.title', 'Add a new brand to our library')}</DialogTitle>
            <DialogDescription>
              {t('request_brand.description', 'We will put this new brand on our library')}
            </DialogDescription>
          </DialogHeader>
          
          <div className="py-4 space-y-4">
            {/* Input para la URL */}
            <div className="space-y-2">
              <label htmlFor="brand-url" className="text-sm font-medium text-foreground">
                {t('request_brand.url_label', 'Brand URL')}
              </label>
              <input
                id="brand-url"
                type="text"
                value={brandUrl}
                onChange={(e) => setBrandUrl(e.target.value)}
                className="w-full px-3 py-2 border border-input bg-background rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                placeholder="https://www.facebook.com/ads/library/..."
                disabled={requestStatus.loading || requestStatus.success}
              />
            </div>
            
            {/* Status messages */}
            {requestStatus.error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-md text-red-600 text-sm">
                {requestStatus.error}
              </div>
            )}
            
            {requestStatus.success && (
              <div className="p-3 bg-green-50 border border-green-200 rounded-md text-green-600 text-sm">
                {t('request_brand.success', 'Your request has been submitted successfully. We will add this brand to our library soon.')}
              </div>
            )}
            
            {/* Tarjeta de ayuda */}
            <div className="mt-4 p-4 bg-primary/5 dark:bg-primary/10 border border-primary/10 dark:border-primary/20 rounded-lg">
              <h4 className="text-sm font-semibold text-primary dark:text-primary mb-2">
                {t('request_brand.help_title', 'How to get the URL?')}
              </h4>
              <ol className="text-sm text-muted-foreground space-y-2 pl-5 list-decimal">
                <li className="flex items-start flex-wrap">
                  <span className="inline whitespace-normal">
                    {t('request_brand.help_step1', 'Go to Meta ad library and search for the brand / advertiser.')}
                    <a 
                      href="https://www.facebook.com/ads/library" 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="inline-flex items-center ml-0.5 text-primary hover:text-primary/80"
                      title="Open Facebook Ad Library"
                      style={{ whiteSpace: 'nowrap' }}
                    >
                    <svg 
                      xmlns="http://www.w3.org/2000/svg" 
                      width="14" 
                      height="14" 
                      viewBox="0 0 24 24" 
                      fill="none" 
                      stroke="currentColor" 
                      strokeWidth="2" 
                      strokeLinecap="round" 
                      strokeLinejoin="round" 
                      className="lucide lucide-external-link"
                    >
                      <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
                      <polyline points="15 3 21 3 21 9"></polyline>
                      <line x1="10" y1="14" x2="21" y2="3"></line>
                    </svg>
                    </a></span>
                </li>
                <li>{t('request_brand.help_step2', 'Click on the brand in the search dropdown and copy the URL and paste it above.')}</li>
              </ol>
            </div>
          </div>
          
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setIsRequestModalOpen(false)}
              disabled={requestStatus.loading}
            >
              {t('common.cancel', 'Cancel')}
            </Button>
            <Button 
              onClick={handleBrandRequest}
              disabled={!brandUrl.trim() || requestStatus.loading || requestStatus.success}
              loading={requestStatus.loading}
            >
              {t('request_brand.submit', 'Submit request')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

// Componente envuelto con el proveedor de caché
const StepOneComponentWithCache = (props) => (
  <FilterCacheProvider>
    <StepOneComponent {...props} />
  </FilterCacheProvider>
);

export default StepOneComponentWithCache;
