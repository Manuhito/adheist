import React, { useState, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import { SearchComponent } from './components/SearchComponent';
import { FilterFormComponent } from './components/FilterFormComponent';

/**
 * Main component for the Create Ad Request page
 * Includes search functionality and filter form for industries and tags
 * Manages all filters in one place and calls the API when any filter changes
 */
const CreateAdRequestApp = () => {
  // Estado centralizado para todos los filtros
  const [selectedCompany, setSelectedCompany] = useState(null);
  const [selectedIndustries, setSelectedIndustries] = useState([]);
  const [selectedTags, setSelectedTags] = useState([]);
  
  // Función para llamar a la API con todos los filtros
  const fetchFilteredResults = () => {
    // Construir la URL con los parámetros
    const params = new URLSearchParams();
    
    // Añadir company si hay alguna seleccionada
    if (selectedCompany) {
      params.append('company_name', selectedCompany);
    }
    
    // Añadir industrias si hay alguna seleccionada
    if (selectedIndustries && selectedIndustries.length > 0) {
      selectedIndustries.forEach(industry => params.append('industries', industry));
    }
    
    // Añadir etiquetas si hay alguna seleccionada
    if (selectedTags && selectedTags.length > 0) {
      selectedTags.forEach(tag => params.append('tags', tag));
    }
    
    // Llamar a la API siempre, incluso cuando no hay filtros seleccionados
    // Esto permite limpiar los filtros aplicados y recuperar una lista completa o vacía
    fetch(`/ahbackend/adlibraries/?${params.toString()}`)
      .then(response => response.json())
      .then(data => {
        console.log('Filtros aplicados con éxito:', data);
      })
      .catch(error => {
        console.error('Error al aplicar filtros:', error);
      });
  };
  
  // Llamar a la API cuando cambie cualquier filtro
  useEffect(() => {
    fetchFilteredResults();
  }, [selectedCompany, selectedIndustries, selectedTags]);
  
  // Manejadores para cada tipo de filtro
  const handleCompanyChange = (company) => {
    setSelectedCompany(company);
  };
  
  const handleIndustriesChange = (industries) => {
    setSelectedIndustries(industries);
  };
  
  const handleTagsChange = (tags) => {
    setSelectedTags(tags);
  };
  
  return (
    <div className="space-y-6 flex flex-col items-center w-full">
      <SearchComponent 
        selectedCompany={selectedCompany}
        onCompanyChange={handleCompanyChange}
      />
      <FilterFormComponent 
        selectedIndustries={selectedIndustries}
        selectedTags={selectedTags}
        onIndustriesChange={handleIndustriesChange}
        onTagsChange={handleTagsChange}
      />
    </div>
  );
};

/**
 * Mount the React application to the DOM when the document is loaded
 */
document.addEventListener('DOMContentLoaded', () => {
  const mountPoint = document.getElementById('create-adrequest-app');
  
  if (mountPoint) {
    const root = createRoot(mountPoint);
    root.render(<CreateAdRequestApp />);
  } else {
    console.error('Could not find mount point for Create Ad Request app');
  }
});
