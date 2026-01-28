import React, { useState, useEffect, useRef } from 'react';
import { ActionSearchBar } from '../../components/ui/action-search-bar.jsx';
import { Building, X, Lightbulb } from 'lucide-react';
import { Button } from '../../components/ui/button';
import DiscoverFilterModal from './DiscoverFilterModal.jsx';
import RequestBrandModal from './RequestBrandModal.jsx';
import { resumeRequestBrandProgressIfNeeded, setRequestBrandStateListener } from '../request-brand-progress-manager';

/**
 * Componente de búsqueda personalizado para la página Discover
 * @param {Object} props - Propiedades del componente
 * @param {Function} props.onSearch - Función a llamar cuando se realiza una búsqueda
 */
function DiscoverSearchBar({ onSearch, onFiltersApply }) {
  const [companies, setCompanies] = useState([]);
  const [companyActions, setCompanyActions] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedCompany, setSelectedCompany] = useState(null);
  const [keywordSearch, setKeywordSearch] = useState(null);
  const [shouldClearInput, setShouldClearInput] = useState(false);

  // State for the request brand modal
  const [isRequestModalOpen, setIsRequestModalOpen] = useState(false);
  const [isBrandRequestInProgress, setIsBrandRequestInProgress] = useState(false);

  // State to track if modal filters are applied
  const [modalFiltersApplied, setModalFiltersApplied] = useState(false);

  // Ref to access DiscoverFilterModal methods
  const filterModalRef = useRef(null);

  // Trigger filter modal to apply filters when selectedCompany changes
  useEffect(() => {
    if (selectedCompany && filterModalRef.current) {
      // Trigger the modal to apply filters with the new selectedCompany
      filterModalRef.current.applyFiltersWithCompany();
    }
  }, [selectedCompany]);

  // Cargar la lista de empresas al montar el componente
  useEffect(() => {
    setIsLoading(true);

    fetch('/ads/companies/')
      .then(response => response.json())
      .then(data => {
        const companyList = data.companies || [];
        setCompanies(companyList);

        // Convertir companies a formato de acciones
        const actions = companyList.map((company, index) => {
          const label = company.page_name || company;
          const iconUrl = company.page_url ? `https://twenty-icons.com/${company.page_url}` : null;

          return {
            id: `company-${index}`,
            label,
            pageId: company.page_id, // Use page_id (Facebook Page ID) instead of id (DB ID)
            iconUrl,
            labelInitial: typeof label === 'string' ? label.charAt(0).toUpperCase() : '',
            description: "",
            short: "",
            end: company.ad_count !== undefined ? `${company.ad_count} Ads` : "Filter",
          };
        });

        setCompanyActions(actions);
        setIsLoading(false);

        // Check for company parameter in URL after companies are loaded
        const urlParams = new URLSearchParams(window.location.search);
        const companyParam = urlParams.get('company');

        if (companyParam) {
          console.log(`🔗 DiscoverSearchBar: Found company parameter in URL: ${companyParam}`);
          // Find the company in the loaded list
          const matchedCompany = actions.find(action => action.pageId === companyParam);
          if (matchedCompany) {
            console.log(`✅ Found matching company:`, matchedCompany);
            setSelectedCompany(matchedCompany);
          } else {
            console.log(`⚠️ Company ${companyParam} not found in company list`);
          }
        }
      })
      .catch(error => {
        console.error('Error al cargar empresas:', error);
        setIsLoading(false);
      });
  }, []);

  useEffect(() => {
    setRequestBrandStateListener(setIsBrandRequestInProgress);

    // Asegurar que al volver a Discover reflejamos correctamente si hay una request en curso
    resumeRequestBrandProgressIfNeeded();

    return () => {
      setRequestBrandStateListener(null);
    };
  }, []);

  const handleSearch = (query) => {
    // This function should NOT trigger API calls while typing
    // It's only used for filtering the company list locally
    // API calls are only triggered by handleKeywordSearch or handleCompanySelect
  };

  const handleKeywordSearch = (keywords) => {
    // Transform spaces to commas for tags parameter
    const tags = keywords.trim().replace(/\s+/g, ',');

    // Set keyword search state for placeholder
    setKeywordSearch(keywords);
    setSelectedCompany(null); // Clear company selection

    // Call the adlibraries API with tags parameter
    if (onFiltersApply) {
      const filterParams = new URLSearchParams();
      filterParams.append('tags', tags);
      onFiltersApply(filterParams.toString());
    }
  };

  const handleCompanySelect = (selectedAction) => {
    // Check if it's the keyword search item
    if (selectedAction.isKeywordSearch) {
      // Extract the query from the label (remove quotes and " keyword search")
      const query = selectedAction.label.replace(/^"(.*)" keyword search$/, '$1');
      handleKeywordSearch(query);
      return;
    }

    // When an advertiser is selected, update selectedCompany state
    // The useEffect will trigger the filter modal to apply filters
    setSelectedCompany(selectedAction);
    setKeywordSearch(null); // Clear keyword search
  };

  const handleClearFilters = (skipApiCall = false) => {
    // Clear both company and keyword search
    setSelectedCompany(null);
    setKeywordSearch(null);

    // Trigger input clearing
    setShouldClearInput(true);

    // Reset the clear flag after a brief delay
    setTimeout(() => setShouldClearInput(false), 100);

    // Make API call only if not skipping (when clearing from X button only)
    if (!skipApiCall && onFiltersApply) {
      onFiltersApply(''); // Empty string means no filters
    }
  };

  const handleClearAllFilters = () => {
    // Clear search filters without API call (skip it)
    handleClearFilters(true);

    // Clear modal filters - this will make the single API call
    if (filterModalRef.current) {
      filterModalRef.current.clearFilters();
    }
  };

  // Placeholder adaptativo para móviles
  const getPlaceholder = () => {
    if (selectedCompany) return `Filtering by: ${selectedCompany.label}`;
    if (keywordSearch) return `Filtering by: "${keywordSearch}"`;

    // Placeholder más corto en móviles
    if (typeof window !== 'undefined' && window.innerWidth < 768) {
      return "Search brands...";
    }
    return "Search for a brand name or keywords....";
  };

  const [placeholder, setPlaceholder] = React.useState(getPlaceholder());

  // Actualizar placeholder en resize
  React.useEffect(() => {
    const handleResize = () => {
      setPlaceholder(getPlaceholder());
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [selectedCompany, keywordSearch]);

  // Obtener contador de anuncios desde window data
  const totalAdsCount = window.__DISCOVER_DATA__?.totalAdsCount || 0;

  // Formatear número con comas
  const formatNumber = (num) => {
    return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  };

  return (
    <div className="w-full">
      {/* Layout adaptativo: vertical en móviles, horizontal en desktop */}
      <div className="flex flex-col md:flex-row md:items-center gap-2 md:gap-0">
        {/* Fila 1: Barra de búsqueda a ancho completo */}
        <div className="flex-1 relative w-full">
          <ActionSearchBar
            actions={companyActions}
            onSearch={handleSearch}
            onActionSelect={handleCompanySelect}
            onKeywordSearch={handleKeywordSearch}
            onRequestAdvertiser={() => setIsRequestModalOpen(true)}
            hideIcons={keywordSearch || selectedCompany}
            clearInput={shouldClearInput}
            placeholder={placeholder}
          />
          {/* Clear button - show when keyword search or company is active */}
          {(keywordSearch || selectedCompany) && (
            <Button
              variant="ghost"
              size="sm"
              className="absolute right-2 top-1/2 -translate-y-1/2 h-6 w-6 p-0 hover:bg-gray-100 dark:hover:bg-gray-800 z-10"
              onClick={handleClearFilters}
            >
              <X className="h-4 w-4 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300" />
            </Button>
          )}
        </div>

        {/* Fila 2: Botones (en móviles aparece debajo, en desktop a la derecha) */}
        <div className="flex items-center gap-2 w-full md:w-auto">
          <DiscoverFilterModal
            ref={filterModalRef}
            onFiltersApply={onFiltersApply}
            onFiltersChange={setModalFiltersApplied}
            selectedCompany={selectedCompany}
          />
          {/* Clear All Filters Button */}
          {(keywordSearch || selectedCompany || modalFiltersApplied) && (
            <Button
              variant="outline"
              size="sm"
              className="h-9 px-3 rounded-lg text-sm text-muted-foreground hover:text-foreground"
              onClick={handleClearAllFilters}
            >
              Clear filters
            </Button>
          )}
          {/* Request Brand Button */}
          <div className="relative group">
            <Button
              variant="outline"
              size="sm"
              className="h-9 w-9 p-0 rounded-lg"
              onClick={() => setIsRequestModalOpen(true)}
              disabled={isBrandRequestInProgress}
            >
              <Lightbulb className="h-5 w-5" />
            </Button>
            <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 px-3 py-1.5 bg-gray-900 dark:bg-gray-700 text-white text-xs rounded-md whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-50 shadow-lg">
              Request a new Advertiser
              <div className="absolute bottom-full left-1/2 -translate-x-1/2 border-[6px] border-transparent border-b-gray-900 dark:border-b-gray-700"></div>
            </div>
          </div>

          {/* Total Ads Counter - Solo visible en móviles, en desktop se muestra en el header */}
          {totalAdsCount > 0 && (
            <div className="flex items-center gap-1.5 ml-auto md:hidden">
              {/* Two overlapping green circles - centered */}
              <div className="relative flex items-center justify-center" style={{ width: '18px', height: '18px' }}>
                <div className="absolute w-[18px] h-[18px] rounded-full bg-green-500/20"></div>
                <div className="absolute w-3 h-3 rounded-full bg-green-500"></div>
              </div>
              {/* Ads count text */}
              <span className="text-green-500 text-sm font-medium whitespace-nowrap">
                {formatNumber(totalAdsCount)} Ads
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Modal para solicitar una nueva marca */}
      <RequestBrandModal
        isOpen={isRequestModalOpen}
        onOpenChange={setIsRequestModalOpen}
        onRequestStateChange={setIsBrandRequestInProgress}
      />
    </div>
  );
}

export default DiscoverSearchBar;
