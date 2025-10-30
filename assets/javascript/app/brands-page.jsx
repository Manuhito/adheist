import React, { useState, useMemo } from 'react';
import { createRoot } from 'react-dom/client';
import { Card, CardContent } from '@/components/ui/card.tsx';
import { Input } from '@/components/ui/input.tsx';
import { Building2, Plus, Search, Grid3x3, List } from 'lucide-react';
import { Button } from '@/components/ui/button.tsx';
import CreateBrandModal from './components/CreateBrandModal.jsx';

function BrandCard({ brand, onClick }) {
  return (
    <Card className="hover:shadow-md transition-shadow cursor-pointer rounded-xl" onClick={() => onClick(brand)}>
      <CardContent className="p-6">
        <div className="flex flex-col items-center text-center space-y-4">
          {/* Logo */}
          <div className="w-16 h-16 rounded-lg bg-gray-100 flex items-center justify-center overflow-hidden">
            {brand.logo_url ? (
              <img
                src={brand.logo_url}
                alt={`${brand.name} logo`}
                className="w-full h-full object-cover"
              />
            ) : (
              <Building2 className="w-8 h-8 text-gray-400" />
            )}
          </div>

          {/* Brand Name */}
          <div>
            <p className="text-sm text-gray-500 mt-1">
              {brand.name}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function BrandListItem({ brand, onClick }) {
  return (
    <Card className="hover:shadow-md transition-shadow cursor-pointer rounded-xl" onClick={() => onClick(brand)}>
      <CardContent className="p-4">
        <div className="flex items-center space-x-4">
          {/* Logo */}
          <div className="w-12 h-12 rounded-lg bg-gray-100 flex items-center justify-center overflow-hidden flex-shrink-0">
            {brand.logo_url ? (
              <img
                src={brand.logo_url}
                alt={`${brand.name} logo`}
                className="w-full h-full object-cover"
              />
            ) : (
              <Building2 className="w-6 h-6 text-gray-400" />
            )}
          </div>

          {/* Brand Info */}
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-900 truncate">
              {brand.name}
            </p>
            {brand.industry && (
              <p className="text-xs text-gray-500 truncate">
                {brand.industry}
              </p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function CreateBrandCard({ onClick }) {
  return (
    <Card className="hover:shadow-md transition-shadow cursor-pointer rounded-xl" onClick={onClick}>
      <CardContent className="p-6">
        <div className="flex flex-col items-center text-center space-y-4">
          {/* Plus Icon */}
          <div className="w-16 h-16 rounded-lg flex items-center justify-center">
            <Plus className="w-8 h-8 text-gray-400" />
          </div>

          {/* Text */}
          <div>
            <p className="text-sm text-gray-500 mt-1">
              Create a brand
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function CreateBrandListItem({ onClick }) {
  return (
    <Card className="hover:shadow-md transition-shadow cursor-pointer rounded-xl" onClick={onClick}>
      <CardContent className="p-4">
        <div className="flex items-center space-x-4">
          {/* Plus Icon */}
          <div className="w-12 h-12 rounded-lg bg-gray-50 flex items-center justify-center flex-shrink-0">
            <Plus className="w-6 h-6 text-gray-400" />
          </div>

          {/* Text */}
          <div className="flex-1">
            <p className="text-sm text-gray-500">
              Create a brand
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function BrandsPage() {
  // Get data from window globals
  const brandsData = window.__BRANDS_DATA__ || {};
  const user = brandsData.user || {};
  const brands = brandsData.brands || [];
  const brandAssetsCost = brandsData.brandAssetsCost || 4;

  // Modal state
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingBrand, setEditingBrand] = useState(null);
  const [brandsList, setBrandsList] = useState(brands);

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
              Brands
            </h1>
            <p className="text-sm text-gray-600">
              All your Brands will show here
            </p>
          </div>
          <Button
            onClick={() => window.location.href = '/ads/discover/'}
            className="bg-primary hover:bg-primary/90 text-white"
          >
            Generate Ad
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

  // Handle opening create brand modal
  const handleOpenCreateModal = () => {
    setIsCreateModalOpen(true);
  };

  // Handle closing create brand modal
  const handleCloseCreateModal = () => {
    setIsCreateModalOpen(false);
    setEditingBrand(null);
  };

  // Handle brand creation success
  const handleBrandCreated = (newBrand) => {
    if (editingBrand) {
      // Update existing brand in the list
      setBrandsList(prevBrands => 
        prevBrands.map(brand => 
          brand.id === editingBrand.id ? { ...brand, ...newBrand } : brand
        )
      );
    } else {
      // Add the new brand to the list
      setBrandsList(prevBrands => [...prevBrands, newBrand]);
    }
  };

  // Handle brand click for editing
  const handleBrandClick = (brand) => {
    setEditingBrand(brand);
    setIsCreateModalOpen(true);
  };

  // Handle search input change
  const handleSearchChange = (e) => {
    setSearchQuery(e.target.value);
  };

  // Filter brands based on search query
  const filteredBrands = useMemo(() => {
    if (!searchQuery.trim()) {
      return brandsList;
    }

    return brandsList.filter(brand =>
      brand.name.toLowerCase().includes(searchQuery.toLowerCase().trim())
    );
  }, [brandsList, searchQuery]);

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
        <div className="flex items-center space-x-1 bg-muted rounded-lg p-1 flex-shrink-0">
          <button
            onClick={() => setViewMode('grid')}
            className={`p-2 rounded-md transition-colors ${
              viewMode === 'grid'
                ? 'bg-background text-primary shadow-sm'
                : 'text-muted-foreground hover:text-primary'
            }`}
            title="Grid view"
          >
            <Grid3x3 className="h-4 w-4" />
          </button>
          <button
            onClick={() => setViewMode('list')}
            className={`p-2 rounded-md transition-colors ${
              viewMode === 'list'
                ? 'bg-background text-primary shadow-sm'
                : 'text-muted-foreground hover:text-primary'
            }`}
            title="List view"
          >
            <List className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Brands Container */}
      {viewMode === 'grid' ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {/* Create New Brand Card */}
          <CreateBrandCard onClick={handleOpenCreateModal} />

          {/* Existing Brands */}
          {filteredBrands.map((brand) => (
            <BrandCard key={brand.id} brand={brand} onClick={handleBrandClick} />
          ))}
        </div>
      ) : (
        <div className="space-y-3">
          {/* Create New Brand List Item */}
          <CreateBrandListItem onClick={handleOpenCreateModal} />

          {/* Existing Brands */}
          {filteredBrands.map((brand) => (
            <BrandListItem key={brand.id} brand={brand} onClick={handleBrandClick} />
          ))}
        </div>
      )}

      {/* Empty State - No brands at all */}
      {brandsList.length === 0 && (
        <div className="mt-12 text-center">
          <Building2 className="mx-auto h-12 w-12 text-gray-400 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            No brands yet
          </h3>
          <p className="text-gray-500">
            Create your first brand to get started with your ad campaigns.
          </p>
        </div>
      )}

      {/* No search results */}
      {brandsList.length > 0 && filteredBrands.length === 0 && searchQuery.trim() && (
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

      {/* Create Brand Modal */}
      <CreateBrandModal
        isOpen={isCreateModalOpen}
        onClose={handleCloseCreateModal}
        onBrandCreated={handleBrandCreated}
        editingBrand={editingBrand}
        brandAssetsCost={brandAssetsCost}
      />
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
        root.render(<BrandsPage />);
      }
    } else {
      // Wait for sidebar layout to be ready
      setTimeout(checkAndMount, 50);
    }
  }

  checkAndMount();
});

export default BrandsPage;
