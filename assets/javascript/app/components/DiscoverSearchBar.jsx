import React, { useState, useEffect } from 'react';
import { ActionSearchBar } from '../../components/ui/action-search-bar.jsx';
import { Building, X, Lightbulb } from 'lucide-react';
import { Button } from '../../components/ui/button';
import DiscoverFilterModal from './DiscoverFilterModal.jsx';
import RequestBrandModal from './RequestBrandModal.jsx';

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
            pageId: company.id,
            iconUrl,
            labelInitial: typeof label === 'string' ? label.charAt(0).toUpperCase() : '',
            description: "",
            short: "",
            end: company.ad_count !== undefined ? `${company.ad_count} Ads` : "Filter",
          };
        });
        
        setCompanyActions(actions);
        setIsLoading(false);
      })
      .catch(error => {
        console.error('Error al cargar empresas:', error);
        setIsLoading(false);
      });
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
    
    // Cuando se selecciona una empresa, filtrar por su ID
    setSelectedCompany(selectedAction);
    setKeywordSearch(null); // Clear keyword search
    if (onSearch && selectedAction.pageId) {
      onSearch(selectedAction.pageId);
    }
  };

  const handleClearFilters = () => {
    // Clear both company and keyword search
    setSelectedCompany(null);
    setKeywordSearch(null);
    
    // Trigger input clearing
    setShouldClearInput(true);
    
    // Reset the clear flag after a brief delay
    setTimeout(() => setShouldClearInput(false), 100);
    
    // Make API call without company or tags (only with other filters if any)
    if (onFiltersApply) {
      onFiltersApply(''); // Empty string means no filters
    }
  };
  
  const placeholder = selectedCompany 
    ? `Filtering by: ${selectedCompany.label}`
    : keywordSearch 
    ? `Filtering by: "${keywordSearch}"`
    : "Search for a brand name or keywords....";

  return (
    <div className="w-full">
      <div className="flex items-center gap-0">
        <div className="flex-1 relative">
          <ActionSearchBar 
            actions={companyActions} 
            onSearch={handleSearch}
            onActionSelect={handleCompanySelect}
            onKeywordSearch={handleKeywordSearch}
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
        <DiscoverFilterModal 
          selectedCompany={selectedCompany}
          onFiltersApply={onFiltersApply}
        />
        {/* Request Brand Button */}
        <div className="relative group">
          <button
            onClick={() => setIsRequestModalOpen(true)}
            className="ml-2 p-2 rounded-md transition-colors"
          >
            <Lightbulb className="h-5 w-5 text-muted-foreground hover:text-primary transition-colors" />
          </button>
          <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 px-3 py-1.5 bg-gray-900 dark:bg-gray-700 text-white text-xs rounded-md whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-50 shadow-lg">
            Request a new Advertiser
            <div className="absolute bottom-full left-1/2 -translate-x-1/2 border-[6px] border-transparent border-b-gray-900 dark:border-b-gray-700"></div>
          </div>
        </div>
      </div>
      
      {/* Modal para solicitar una nueva marca */}
      <RequestBrandModal 
        isOpen={isRequestModalOpen}
        onOpenChange={setIsRequestModalOpen}
      />
    </div>
  );
}

export default DiscoverSearchBar;
