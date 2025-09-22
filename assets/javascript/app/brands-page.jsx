import React, { useState, useMemo } from 'react';
import { createRoot } from 'react-dom/client';
import { Card, CardContent } from '@/components/ui/card.tsx';
import { Input } from '@/components/ui/input.tsx';
import { Building2, Plus, Search } from 'lucide-react';
import CreateBrandModal from './components/CreateBrandModal.jsx';

function BrandCard({ brand }) {
  return (
    <Card className="hover:shadow-md transition-shadow cursor-pointer rounded-xl">
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

function BrandsPage() {
  // Get data from window globals
  const brandsData = window.__BRANDS_DATA__ || {};
  const user = brandsData.user || {};
  const brands = brandsData.brands || [];
  
  // Modal state
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [brandsList, setBrandsList] = useState(brands);
  
  // Search state
  const [searchQuery, setSearchQuery] = useState('');

  // Handle opening create brand modal
  const handleOpenCreateModal = () => {
    setIsCreateModalOpen(true);
  };

  // Handle closing create brand modal
  const handleCloseCreateModal = () => {
    setIsCreateModalOpen(false);
  };

  // Handle brand creation success
  const handleBrandCreated = (newBrand) => {
    // Add the new brand to the list
    setBrandsList(prevBrands => [...prevBrands, newBrand]);
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
      {/* Search Bar */}
      <div className="mb-6">
        <div className="relative max-w-md">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search className="h-4 w-4 text-gray-400" />
          </div>
          <Input
            type="text"
            placeholder="Search brands..."
            value={searchQuery}
            onChange={handleSearchChange}
            className="pl-10 bg-white border-gray-200 focus:border-gray-300 focus:ring-gray-200"
          />
        </div>
      </div>

      {/* Brands Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
        {/* Create New Brand Card */}
        <CreateBrandCard onClick={handleOpenCreateModal} />
        
        {/* Existing Brands */}
        {filteredBrands.map((brand) => (
          <BrandCard key={brand.id} brand={brand} />
        ))}
      </div>

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
