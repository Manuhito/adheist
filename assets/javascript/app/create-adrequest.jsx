import React, { useState, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import { SearchComponent } from './components/SearchComponent';
import { FilterFormComponent } from './components/FilterFormComponent';
import InteractiveBentoGallery from '../components/ui/interactive-bento-gallery.jsx';

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
  const [filteredResults, setFilteredResults] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  // Función para llamar a la API con todos los filtros
  const fetchFilteredResults = () => {
    // Construir la URL con los parámetros
    const params = new URLSearchParams();
    setIsLoading(true);

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
    fetch(`/ahbackend/adlibraries/?${params.toString()}`)
      .then(response => response.json())
      .then(data => {
        // Verificar la estructura de los datos
        if (data && Array.isArray(data)) {
          // Si data es directamente un array
          setFilteredResults(data);
        } else if (data && Array.isArray(data.results)) {
          // Si data tiene una propiedad results que es un array
          setFilteredResults(data.results);
        } else if (data && Array.isArray(data.adlibraries)) {
          // Si data tiene una propiedad adlibraries que es un array
          setFilteredResults(data.adlibraries);
        } else if (data && typeof data === 'object') {
          // Si data es un objeto, intentar convertirlo a un array
          const resultsArray = Object.values(data).filter(item => typeof item === 'object');

          // Si el primer elemento es un array, usamos ese directamente
          if (resultsArray.length > 0 && Array.isArray(resultsArray[0])) {
            setFilteredResults(resultsArray[0]);
          } else {
            setFilteredResults(resultsArray);
          }
        } else {
          // Si no se puede determinar la estructura, establecer un array vacío
          setFilteredResults([]);
        }

        setIsLoading(false);
      })
      .catch(error => {
        console.error('Error al aplicar filtros:', error);
        setFilteredResults([]);
        setIsLoading(false);
      });
  };

  // Transform API results to gallery media items format
  const transformToMediaItems = (apiResults) => {
    if (!apiResults || apiResults.length === 0) {
      return [];
    }

    // Create spans for different grid positions
    const spans = [
      "md:col-span-1 md:row-span-3 sm:col-span-1 sm:row-span-2",
      "md:col-span-2 md:row-span-2 col-span-1 sm:col-span-2 sm:row-span-2",
      "md:col-span-1 md:row-span-3 sm:col-span-2 sm:row-span-2",
      "md:col-span-2 md:row-span-2 sm:col-span-1 sm:row-span-2",
      "md:col-span-1 md:row-span-3 sm:col-span-1 sm:row-span-2"
    ];

    // Extraer los campos necesarios de cada elemento
    return apiResults.map((item, index) => {
      // Intentar encontrar los campos necesarios
      const title = item.company_name || item.name || item.title || "Company " + (index + 1);

      // Manejar tags que pueden ser string o array
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

      // Buscar la URL de la imagen en diferentes propiedades posibles
      const imageUrl = item.ad_image || item.image || item.url || item.image_url ||
        "https://images.unsplash.com/photo-1557804506-669a67965ba0";

      return {
        id: item.id || index + 1,
        type: "image",
        title: title,
        desc: desc,
        url: imageUrl,
        span: spans[index % spans.length]
      };
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

  // Prepare media items for the gallery
  const galleryItems = transformToMediaItems(filteredResults);

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
      <div className="mt-8 w-full">
        {isLoading ? (
          <div className="flex justify-center my-12">
            <div className="w-8 h-8 border-2 border-blue-500/30 border-t-blue-500 rounded-full animate-spin"></div>
          </div>
        ) : galleryItems.length > 0 ? (
          <InteractiveBentoGallery
            mediaItems={galleryItems}
            title="Select Your Ideal Ad Style"
            description="Browse and choose the ad style that best matches your desired outcome"
          />
        ) : (
          <div className="text-center my-12 p-8 bg-gray-50 rounded-lg">
            <p className="text-gray-500 text-lg">No ad examples found. Try adjusting your filters.</p>
          </div>
        )}
      </div>
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
