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
        const actions = companyList.map((company, index) => ({
          id: `company-${index}`,
          label: company.page_name || company, // Soporte para ambos formatos
          icon: <Building className="h-4 w-4 text-blue-500" />,
          description: "",
          short: "",
          end: company.ad_count !== undefined ? `${company.ad_count} Ads` : "Filter",
        }));
        
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
  
  return (
    <div className="w-full">
      <ActionSearchBar 
        actions={companyActions} 
        onSearch={handleSearch} 
      />
    </div>
  );
}

export default DiscoverSearchBar;
