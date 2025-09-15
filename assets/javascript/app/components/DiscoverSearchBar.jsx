import React, { useState, useEffect } from 'react';
import { ActionSearchBar } from '../../components/ui/action-search-bar.jsx';
import { Building } from 'lucide-react';

/**
 * Componente de búsqueda personalizado para la página Discover
 * @param {Object} props - Propiedades del componente
 * @param {Function} props.onSearch - Función a llamar cuando se realiza una búsqueda
 */
function DiscoverSearchBar({ onSearch }) {
  const [companies, setCompanies] = useState([]);
  const [companyActions, setCompanyActions] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

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
          const logoUrl = company.page_url ? `https://twenty-icons.com/${company.page_url}` : null;
          
          return {
            id: `company-${index}`,
            label: company.page_name || company, // Soporte para ambos formatos
            pageId: company.id, // Añadir el ID de la página de Facebook
            icon: logoUrl ? (
              <div className="w-6 h-6 rounded-sm overflow-hidden bg-muted flex-shrink-0">
                <img 
                  src={logoUrl} 
                  alt={`${company.page_name || company} logo`}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    // Fallback: mostrar primera letra del nombre
                    const firstLetter = (company.page_name || company).charAt(0).toUpperCase();
                    e.target.outerHTML = `<div class="w-full h-full bg-gray-200 flex items-center justify-center text-sm font-medium text-gray-600">${firstLetter}</div>`;
                  }}
                />
              </div>
            ) : (
              <Building className="h-6 w-6 text-blue-500" />
            ),
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
    if (onSearch) {
      onSearch(query);
    }
  };

  const handleCompanySelect = (selectedAction) => {
    // Cuando se selecciona una empresa, filtrar por su ID
    if (onSearch && selectedAction.pageId) {
      onSearch(selectedAction.pageId);
    }
  };
  
  return (
    <div className="w-full">
      <ActionSearchBar 
        actions={companyActions} 
        onSearch={handleSearch}
        onActionSelect={handleCompanySelect}
      />
    </div>
  );
}

export default DiscoverSearchBar;
