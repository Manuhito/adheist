import React, { useState, useEffect, useRef, useCallback } from 'react';
import * as ReactDOM from 'react-dom';
import { createRoot } from 'react-dom/client';
import InteractiveBentoGallery from '../components/ui/interactive-bento-gallery.jsx';
import { useTranslation } from '../lib/useTranslation.ts';
import { motion, AnimatePresence } from 'framer-motion';
import DiscoverSearchBar from './components/DiscoverSearchBar.jsx';
import RequestBrandModal from './components/RequestBrandModal.jsx';
import IntegratedAdGenerator from './components/IntegratedAdGenerator.jsx';
import GeneratingLoadingPage from './components/GeneratingLoadingPage.jsx';

// SSE Event Handler hook for real-time ad updates (shared endpoint, filtered by event type)
function useSSEListener(onEvent, enabled = false) {
  const eventSourceRef = useRef(null);

  useEffect(() => {
    if (!enabled) {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }
      return;
    }

    const eventSource = new EventSource('/ads/sse/adrequest-updates/');
    eventSourceRef.current = eventSource;

    // New ad created during request brand process
    eventSource.addEventListener('request_brand_ad_created', (event) => {
      try {
        const data = JSON.parse(event.data);
        onEvent('request_brand_ad_created', data);
      } catch (e) {
        console.error('Error parsing SSE request_brand_ad_created:', e);
      }
    });

    // Backload completed (no more ads expected)
    eventSource.addEventListener('backload_completed', (event) => {
      try {
        const data = JSON.parse(event.data);
        onEvent('backload_completed', data);
      } catch (e) {
        console.error('Error parsing SSE backload_completed:', e);
      }
    });

    eventSource.onerror = (error) => {
      console.error('SSE error in discover-page:', error);
    };

    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }
    };
  }, [onEvent, enabled]);

  return eventSourceRef.current;
}


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
  const [selectedAdLibraryItem, setSelectedAdLibraryItem] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [isRequestBrandOpen, setIsRequestBrandOpen] = useState(false);
  const [activeFilterParams, setActiveFilterParams] = useState("meta_status=ACTIVE&sort_by=score_desc"); // Default filters on initial load
  const [selectedAdRequestId, setSelectedAdRequestId] = useState(null);
  const [isGenerating, setIsGenerating] = useState(false);

  // Live mode state - for real-time ad updates via SSE
  const [isLiveMode, setIsLiveMode] = useState(false);
  const [livePageId, setLivePageId] = useState(null);

  const handleSSEEvent = useCallback(
    (eventType, data) => {
      if (eventType === 'request_brand_ad_created' && data.ad) {
        if (!livePageId || data.ad.page_id !== livePageId) {
          return;
        }

        const newAd = {
          id: data.ad.id,
          company_name: data.ad.page_name || 'Unknown',
          ad_image: data.ad.image_url,
          ad_creative_bodies: data.ad.ad_creative_bodies || data.ad.ad_copy || '',
          page_url: data.ad.page_url || '',
          is_fav: false,
          meta_status: 'ACTIVE',
        };

        setFilteredResults((prev) => {
          const exists = prev.some((ad) => ad.id === newAd.id);
          if (exists) return prev;
          return [newAd, ...prev];
        });
      }

      if (eventType === 'backload_completed') {
        // When backload for this page_id finishes, exit live mode (hide banner)
        if (livePageId && data.page_id === livePageId) {
          setIsLiveMode(false);
          setLivePageId(null);
        }
      }
    },
    [livePageId]
  );

  useSSEListener(handleSSEEvent, isLiveMode && !!livePageId);

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

    // Include active filters (from modal) so pagination preserves them
    if (activeFilterParams) {
      const extra = new URLSearchParams(activeFilterParams);
      for (const [key, value] of extra) {
        params.append(key, value);
      }
    }

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
        cta_link: item.cta_link || null, // CTA link extraído del backend
        runtime_score: item.runtime_score || null, // Runtime performance score
        company_ad_count: item.company_ad_count || 0 // Total ads for this company
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

    // Clear searchQuery when filters are cleared
    if (!filterParams || filterParams === '') {
      setSearchQuery('');
    }

    // Persist filters for future pagination and searches
    setActiveFilterParams(filterParams || "");

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

  // Check for URL parameters on mount (company, page_id, live)
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const companyParam = urlParams.get('company');
    const pageIdParam = urlParams.get('page_id');
    const liveParam = urlParams.get('live');

    // Live mode: page_id + live=true
    if (pageIdParam && liveParam === 'true') {
      setLivePageId(pageIdParam);
      setIsLiveMode(true);
      setSearchQuery(pageIdParam);
      fetchFilteredResultsWithQuery(1, false, pageIdParam);
      return;
    }

    // Just page_id filter (no live mode)
    if (pageIdParam) {
      setSearchQuery(pageIdParam);
      fetchFilteredResultsWithQuery(1, false, pageIdParam);
      const cleanUrl = window.location.pathname;
      window.history.replaceState({}, '', cleanUrl);
      return;
    }

    if (companyParam) {
      setSearchQuery(companyParam);
      fetchFilteredResultsWithQuery(1, false, companyParam);
      const cleanUrl = window.location.pathname;
      window.history.replaceState({}, '', cleanUrl);
    } else if (!searchQuery) {
      fetchFilteredResultsWithQuery(1, false, null);
    }

    // Check for pre-loaded AdRequest from window data
    const discoverData = window.__DISCOVER_DATA__ || {};
    if (discoverData.adRequestId) {
      setSelectedAdRequestId(discoverData.adRequestId);
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

  // Handle gallery item selection - preview only
  const handleGalleryItemSelect = (item) => {
    console.log('Selected gallery item:', item);
    setSelectedAdLibrary(item.id);
    setSelectedAdLibraryItem(item);
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

  if (isGenerating) {
    return <GeneratingLoadingPage adRequestId={selectedAdRequestId} />;
  }

  return (
    <div className="flex-1 px-4 md:px-8">
      {/* Live Mode Indicator (green) */}
      {isLiveMode && (
        <div className="mb-4 mx-auto max-w-4xl px-4 py-2 bg-emerald-50 dark:bg-emerald-950 border border-emerald-200 dark:border-emerald-800 rounded-lg flex items-center gap-2">
          <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
          <span className="text-sm text-emerald-700 dark:text-emerald-200">
            Live Mode - New ads for this advertiser will appear automatically as they are processed.
          </span>
          <button
            onClick={() => {
              setIsLiveMode(false);
              setLivePageId(null);
              const cleanUrl = window.location.pathname;
              window.history.replaceState({}, '', cleanUrl);
            }}
            className="ml-auto text-xs text-emerald-700 hover:text-emerald-900 dark:text-emerald-300 dark:hover:text-emerald-100 underline"
          >
            Exit Live Mode
          </button>
        </div>
      )}
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
        <div className="w-full flex items-center justify-center py-20 min-h-[60vh]">
          <div className="text-center max-w-md">
            <h1 className="text-xl font-semibold text-primary dark:text-primary mb-4">
              No Ads results for your query
            </h1>
            <p className="text-sm text-gray-400 dark:text-gray-500">
              Filter by Advertiser, industry, keywords or{' '}
              <button
                type="button"
                className="text-blue-500 hover:text-blue-600 underline"
                onClick={() => setIsRequestBrandOpen(true)}
              >
                Request a new Advertiser
              </button>
              .
            </p>
          </div>
        </div>
      )}
      <RequestBrandModal isOpen={isRequestBrandOpen} onOpenChange={setIsRequestBrandOpen} />

      <IntegratedAdGenerator
        adRequestId={selectedAdRequestId}
        selectedAdLibraryItem={selectedAdLibraryItem}
        onClose={() => {
          setSelectedAdLibraryItem(null);
          setSelectedAdLibrary(null);
        }}
        onGenerate={(id) => {
          setSelectedAdRequestId(id);
          setIsGenerating(true);
        }}
      />
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
