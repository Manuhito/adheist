import React, { useState, useEffect } from 'react';
import * as ReactDOM from 'react-dom';
import { createRoot } from 'react-dom/client';
import InteractiveBentoGallery from '../components/ui/interactive-bento-gallery.jsx';
import { useTranslation } from '../lib/useTranslation.ts';
import { motion, AnimatePresence } from 'framer-motion';
import DiscoverSearchBar from './components/DiscoverSearchBar.jsx';

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

/**
 * DiscoverContent component displays a gallery of ad examples
 * Uses InteractiveBentoGallery for consistency with StepOneComponent
 */
function DiscoverContent() {
  const { t } = useTranslation();
  const [filteredResults, setFilteredResults] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [hasMorePages, setHasMorePages] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [selectedAdLibrary, setSelectedAdLibrary] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");

  // Function to fetch ad libraries from the API with explicit query parameter
  const fetchFilteredResultsWithQuery = (page = 1, append = false, queryOverride = null) => {
    const effectiveQuery = queryOverride !== null ? queryOverride : searchQuery;
    // Build URL with parameters
    const params = new URLSearchParams();

    // Establecer estado de carga apropiado
    if (page === 1) {
      setIsLoading(true);
      setIsLoadingMore(false);
    } else {
      setIsLoadingMore(true);
    }

    // Add pagination parameters
    params.append('page', page);
    params.append('page_size', 20); // Same page size as StepOneComponent

    // Añadir parámetro de búsqueda si existe
    if (effectiveQuery !== null && effectiveQuery !== undefined && effectiveQuery !== '') {
      // Convert to string to ensure we can work with it
      const searchStr = String(effectiveQuery);

      // Check if effectiveQuery is a number (page_id) or string (company_name)
      if (!isNaN(searchStr)) {
        params.append('page_id', searchStr);
      } else {
        params.append('company_name', searchStr.trim());
      }
    }

    // Call the API
    fetch(`/ads/adlibraries/?${params.toString()}`)
      .then(response => response.json())
      .then(data => {
        // Actualizar estado de paginación
        if (data && data.pagination) {
          console.log(`📊 Page ${data.pagination.current_page} loaded - Has next: ${data.pagination.has_next}, Total: ${data.pagination.total_count}`);
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
          setFilteredResults(prevResults => {
            const combined = [...prevResults, ...newResults];
            console.log(`📈 Total results: ${combined.length}`);
            return combined;
          });
        } else {
          setFilteredResults(newResults);
        }

        // Desactivar indicadores de carga
        setIsLoading(false);
        setIsLoadingMore(false);
      })
      .catch(error => {
        console.error('Error fetching ad libraries:', error);
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
        page_url: item.page_url || null, // Incluir page_url para el avatar
        ad_creative_bodies: item.ad_creative_bodies || null, // Incluir ad_creative_bodies para el modal
        ad_creation_time: item.ad_creation_time || null, // Incluir fecha de creación
        ad_delivery_stop_time: item.ad_delivery_stop_time || null, // Incluir fecha de finalización
        meta_status: item.meta_status || null, // Status del anuncio
        media_type: item.media_type || null, // Tipo de medio
        publisher_platform: item.publisher_platform || [], // Plataformas de publicación
        ad_creative_link_titles: item.ad_creative_link_titles || null, // Títulos de enlaces creativos
        cta_link: item.cta_link || null // CTA link extraído del backend
      };
    });
  };

  // Función para manejar la búsqueda desde el componente de búsqueda
  const handleSearch = (query) => {
    console.log(`🔎 handleSearch called with:`, query, typeof query);
    setSearchQuery(query);
    setCurrentPage(1); // Reiniciar la paginación
    fetchFilteredResultsWithQuery(1, false, query);
  };

  // Función para manejar los filtros aplicados
  const handleFiltersApply = (filterParams) => {
    console.log(`🔧 handleFiltersApply called with:`, filterParams);
    setCurrentPage(1);

    // Build URL with filter parameters
    const params = new URLSearchParams();
    params.append('page', 1);
    params.append('page_size', 20);

    // Add filter parameters
    if (filterParams) {
      const filterParamsObj = new URLSearchParams(filterParams);
      for (const [key, value] of filterParamsObj) {
        params.append(key, value);
      }
    }

    const finalUrl = `/ads/adlibraries/?${params.toString()}`;
    console.log(`🌐 Making API call to: ${finalUrl}`);

    // Call the API with filters
    setIsLoading(true);
    fetch(finalUrl)
      .then(response => response.json())
      .then(data => {
        console.log(`📊 API Response:`, data);
        if (data && data.adlibraries) {
          console.log(`✅ Setting ${data.adlibraries.length} filtered results`);
          setFilteredResults(data.adlibraries);
          setHasMorePages(data.pagination && data.pagination.has_next);
          setCurrentPage(1);
        } else {
          console.log(`❌ No results in API response, setting empty array`);
          setFilteredResults([]);
          setHasMorePages(false);
        }
        setIsLoading(false);
      })
      .catch(error => {
        console.error('Error fetching filtered results:', error);
        setFilteredResults([]);
        setHasMorePages(false);
        setIsLoading(false);
      });
  };

  // Renderizar el componente de búsqueda en el header cuando se monta el componente
  useEffect(() => {
    let searchRoot = null;

    // Buscar el contenedor en el header
    const searchContainer = document.getElementById('header-search-container');

    // Si existe el contenedor, renderizar el componente de búsqueda
    if (searchContainer) {
      // Crear root y renderizar el componente
      searchRoot = createRoot(searchContainer);
      searchRoot.render(<DiscoverSearchBar onSearch={handleSearch} onFiltersApply={handleFiltersApply} />);
    }

    // Limpiar el componente cuando se desmonte
    return () => {
      if (searchRoot) {
        searchRoot.unmount();
      }
    };
  }, []);

  // Fetch data when component mounts (only once)
  useEffect(() => {
    if (!searchQuery) {
      console.log(`🚀 Initial load: calling fetchFilteredResultsWithQuery`);
      fetchFilteredResultsWithQuery(1, false, null);
    }
  }, []);

  // Función para cargar más resultados
  const loadMoreResults = () => {
    if (!isLoading && !isLoadingMore && hasMorePages) {
      const nextPage = currentPage + 1;
      console.log(`📄 Loading page ${nextPage}`);
      fetchFilteredResultsWithQuery(nextPage, true, null);
    }
  };

  // Handle gallery item selection - create AdRequest with selected ad library
  const handleGalleryItemSelect = async (item) => {
    console.log('Selected gallery item:', item);
    setSelectedAdLibrary(item.id);
    
    try {
      // Step 1: Create a new AdRequest
      console.log('Creating new AdRequest...');
      const createResponse = await fetch('/ads/adrequest/create/', {
        method: 'POST',
        headers: {
          'X-CSRFToken': getCsrfToken(),
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      });

      if (!createResponse.ok) {
        throw new Error('Failed to create AdRequest');
      }

      const createData = await createResponse.json();
      console.log('AdRequest created with ID:', createData.id);

      // Step 2: Update the AdRequest with the selected ad_library
      console.log('Updating AdRequest with ad_library:', item.id);
      const formData = new FormData();
      formData.append('ad_library', item.id);
      formData.append('status', 'DRAFT'); // Set status to DRAFT

      const updateResponse = await fetch(`/ads/adrequest/${createData.id}/update/`, {
        method: 'POST',
        body: formData,
        headers: {
          'X-CSRFToken': getCsrfToken(),
        },
      });

      if (!updateResponse.ok) {
        throw new Error('Failed to update AdRequest with ad_library');
      }

      const updateData = await updateResponse.json();
      console.log('AdRequest updated successfully:', updateData);
      window.location.href = `/ads/discover/${createData.id}/create/`;
    } catch (error) {
      console.error('Error creating AdRequest:', error);
      // TODO: Show user-friendly error message
      alert('Error creating ad request. Please try again.');
    }
  };

  // Handle toggle favorite functionality (placeholder for now)
  const handleToggleFavorite = async (item) => {
    console.log('Toggle favorite for item:', item);
    // TODO: Implement favorite toggle API call
  };

  // Handle deactivate image functionality (placeholder for now)
  const handleDeactivateImage = async (item) => {
    console.log('Deactivate image for item:', item);
    // TODO: Implement deactivate image API call
  };

  // Prepare media items for the gallery
  const galleryItems = transformToMediaItems(filteredResults);

  // Use window scroll instead of container scroll
  useEffect(() => {
    const handleWindowScroll = () => {
      const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
      const scrollHeight = document.documentElement.scrollHeight;
      const clientHeight = window.innerHeight;
      const distanceFromBottom = scrollHeight - scrollTop - clientHeight;

      // Si estamos a 200px o menos del final, cargar más resultados
      if (distanceFromBottom <= 200) {
        console.log(`🎯 Loading more results...`);
        loadMoreResults();
      }
    };

    window.addEventListener('scroll', handleWindowScroll);
    return () => window.removeEventListener('scroll', handleWindowScroll);
  }, [isLoading, isLoadingMore, hasMorePages, currentPage]);

  return (
    <div className="flex-1">
      {isLoading ? (
        <div className="flex justify-center items-center h-full py-20">
          <div className="flex flex-col items-center">
            <div className="w-12 h-12 border-3 border-primary/30 border-t-primary rounded-full animate-spin mb-4"></div>
            <p className="text-muted-foreground">{t('discover.loading', 'Loading gallery...')}</p>
          </div>
        </div>
      ) : galleryItems.length > 0 ? (
        <>
          <InteractiveBentoGallery
            mediaItems={galleryItems}
            title=""
            description=""
            onItemSelect={handleGalleryItemSelect}
            selectedItemId={selectedAdLibrary}
            onToggleFavorite={handleToggleFavorite}
            onDeactivateImage={handleDeactivateImage}
            userPermissions={window.__USER_PERMISSIONS__ || { isStaff: false }}
          />
          {isLoadingMore && (
            <div className="py-4 flex justify-center">
              <div className="w-8 h-8 border-3 border-primary/30 border-t-primary rounded-full animate-spin"></div>
            </div>
          )}
        </>
      ) : (
        <div className="p-8 text-center text-gray-500">
          {t('discover.no_results', 'No ad examples found. Try adjusting your search.')}
        </div>
      )}
    </div>
  );
}

function DiscoverPage() {
  return <DiscoverContent />;
}

// Initialize the discover page when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  // Wait for sidebar layout to be ready
  const checkSidebarReady = () => {
    if (window.sidebarLayoutReady) {
      const container = document.getElementById('sidebar-page-content');
      if (container) {
        const root = createRoot(container);
        root.render(<DiscoverPage />);
      }
    } else {
      setTimeout(checkSidebarReady, 50);
    }
  };

  checkSidebarReady();
});

export default DiscoverPage;
