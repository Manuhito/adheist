import React, { useState, useMemo } from 'react';
import { createRoot } from 'react-dom/client';
import { Input } from '@/components/ui/input.tsx';
import { Button } from '@/components/ui/button.tsx';
import { 
  FolderClosed, 
  Search, 
  Plus
} from 'lucide-react';
import { BrandsContainer } from './components/BrandFolderComponents.jsx';
import { ViewModeToggle } from './components/ViewModeToggle.jsx';


function AssetsPage() {
  // Get data from window globals
  const assetsData = window.__ASSETS_DATA__ || {};
  const user = assetsData.user || {};
  const brands = assetsData.brands || [];
  
  // Search state
  const [searchQuery, setSearchQuery] = useState('');
  
  // View mode state
  const [viewMode, setViewMode] = useState('grid'); // 'grid' or 'list'

  // Set header content when component mounts
  React.useEffect(() => {
    if (window.setAppHeader) {
      const headerComponent = (
        <div className="flex items-center justify-between w-full">
          <div>
            <h1 className="text-xl font-bold text-primary">
              Asset Library
            </h1>
            <p className="text-sm text-gray-600">
              Manage all your uploaded media files
            </p>
          </div>
          <Button 
            onClick={() => window.location.href = '/ads/brands/'}
            className="bg-primary hover:bg-primary/90 text-white"
          >
            Manage Brands
          </Button>
        </div>
      );
      window.setAppHeader(headerComponent);
    }

    // Cleanup header when component unmounts
    return () => {
      if (window.clearAppHeader) {
        window.clearAppHeader();
      }
    };
  }, []);

  // Handle search input change
  const handleSearchChange = (e) => {
    setSearchQuery(e.target.value);
  };

  // Handle folder click
  const handleFolderClick = async (brand) => {
    try {
      const response = await fetch(`/ads/assets/${brand.id}/`);
      if (response.ok) {
        const data = await response.json();
        // Store the assets data and navigate to detail page
        sessionStorage.setItem('brandAssetsData', JSON.stringify(data));
        window.location.href = `/ads/assets/${brand.id}/detail/`;
      } else {
        console.error('Failed to fetch brand assets');
      }
    } catch (error) {
      console.error('Error fetching brand assets:', error);
    }
  };

  // Filter brands based on search query
  const filteredBrands = useMemo(() => {
    if (!searchQuery.trim()) {
      return brands;
    }
    
    return brands.filter(brand => {
      const searchTerm = searchQuery.toLowerCase().trim();
      return brand.name.toLowerCase().includes(searchTerm);
    });
  }, [brands, searchQuery]);

  return (
    <div className="max-w-7xl mx-auto p-6">
      {/* Search Bar and View Toggle */}
      <div className="mb-6 flex items-center justify-between gap-4">
        {/* Search Bar */}
        <div className="relative flex-1 max-w-lg">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search className="h-4 w-4 text-muted-foreground" />
          </div>
          <Input
            type="text"
            placeholder="Search brands..."
            value={searchQuery}
            onChange={handleSearchChange}
            className="pl-10"
          />
        </div>

        {/* View Mode Toggle */}
        <ViewModeToggle viewMode={viewMode} setViewMode={setViewMode} />
      </div>

      {/* Brands Container */}
      <BrandsContainer 
        brands={filteredBrands}
        viewMode={viewMode}
        onBrandClick={handleFolderClick}
      />

      {/* Empty State - No brands at all */}
      {brands.length === 0 && (
        <div className="mt-12 text-center">
          <FolderClosed className="mx-auto h-12 w-12 text-gray-400 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            No assets yet
          </h3>
          <p className="text-gray-500 mb-6">
            Create a brand and upload assets to get started.
          </p>
          <Button 
            onClick={() => window.location.href = '/ads/brands/'}
            className="bg-primary hover:bg-primary/90 text-white"
          >
            <Plus className="w-4 h-4 mr-2" />
            Create Your First Brand
          </Button>
        </div>
      )}

      {/* No search results */}
      {brands.length > 0 && filteredBrands.length === 0 && searchQuery.trim() && (
        <div className="mt-12 text-center">
          <Search className="mx-auto h-12 w-12 text-gray-400 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            No brands found
          </h3>
          <p className="text-gray-500">
            No brands match your search for "{searchQuery}". Try a different search term.
          </p>
        </div>
      )}
    </div>
  );
}

// Initialize the component when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  function checkAndMount() {
    if (window.sidebarLayoutReady) {
      const container = document.getElementById('sidebar-page-content');
      if (container) {
        const root = createRoot(container);
        root.render(<AssetsPage />);
      }
    } else {
      // Wait for sidebar layout to be ready
      setTimeout(checkAndMount, 50);
    }
  }
  
  checkAndMount();
});

export default AssetsPage;
