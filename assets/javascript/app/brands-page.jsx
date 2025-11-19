import React, { useState, useMemo } from 'react';
import { createRoot } from 'react-dom/client';
import { Card, CardContent } from '@/components/ui/card.tsx';
import { Input } from '@/components/ui/input.tsx';
import { Building2, Plus, Search, Grid3x3, List, MoreVertical, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button.tsx';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu.tsx';
import CreateBrandModal from './components/CreateBrandModal.jsx';

function BrandCard({ brand, onClick, onDelete }) {
  return (
    <Card className="hover:shadow-md transition-shadow cursor-pointer rounded-xl group relative" onClick={() => onClick(brand)}>
      <CardContent className="p-6">
        {/* Delete Button */}
        <div className="absolute top-2 right-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0 hover:bg-gray-100"
                onClick={(e) => e.stopPropagation()}
              >
                <MoreVertical className="h-4 w-4 text-gray-500" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete(brand);
                }}
                className="text-red-600 hover:text-red-700 hover:bg-red-50"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

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

function BrandListItem({ brand, onClick, onDelete }) {
  return (
    <Card className="hover:shadow-md transition-shadow cursor-pointer rounded-xl group" onClick={() => onClick(brand)}>
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

          {/* Delete Button */}
          <div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0 hover:bg-gray-100"
                  onClick={(e) => e.stopPropagation()}
                >
                  <MoreVertical className="h-4 w-4 text-gray-900" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem
                  onClick={(e) => {
                    e.stopPropagation();
                    onDelete(brand);
                  }}
                  className="text-red-600 hover:text-red-700 hover:bg-red-50"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
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

  // Delete confirmation modal state
  const [showDeleteConfirmation, setShowDeleteConfirmation] = useState(false);
  const [brandToDelete, setBrandToDelete] = useState(null);

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

  // Function to get CSRF token from cookies
  const getCsrfToken = () => {
    const name = 'csrftoken';
    let cookieValue = null;
    if (document.cookie && document.cookie !== '') {
      const cookies = document.cookie.split(';');
      for (let i = 0; i < cookies.length; i++) {
        const cookie = cookies[i].trim();
        if (cookie.substring(0, name.length + 1) === (name + '=')) {
          cookieValue = decodeURIComponent(cookie.substring(name.length + 1));
          break;
        }
      }
    }
    return cookieValue;
  };

  // Handle delete brand
  const handleDeleteBrand = (brand) => {
    setBrandToDelete(brand);
    setShowDeleteConfirmation(true);
  };

  // Confirm delete brand
  const confirmDeleteBrand = async () => {
    if (!brandToDelete) return;

    try {
      const response = await fetch(`/ads/api/brands/${brandToDelete.id}/delete/`, {
        method: 'PATCH',
        headers: {
          'X-CSRFToken': getCsrfToken(),
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        // Remove the brand from the local state
        setBrandsList(prevBrands =>
          prevBrands.filter(brand => brand.id !== brandToDelete.id)
        );

        // Close the confirmation modal
        setShowDeleteConfirmation(false);
        setBrandToDelete(null);
      } else {
        console.error('Failed to delete brand');
        // You could add error handling here
      }
    } catch (error) {
      console.error('Error deleting brand:', error);
      // You could add error handling here
    }
  };

  // Cancel delete brand
  const cancelDeleteBrand = () => {
    setShowDeleteConfirmation(false);
    setBrandToDelete(null);
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
            className={`p-2 rounded-md transition-colors ${viewMode === 'grid'
              ? 'bg-background text-primary shadow-sm'
              : 'text-muted-foreground hover:text-primary'
              }`}
            title="Grid view"
          >
            <Grid3x3 className="h-4 w-4" />
          </button>
          <button
            onClick={() => setViewMode('list')}
            className={`p-2 rounded-md transition-colors ${viewMode === 'list'
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
            <BrandCard key={brand.id} brand={brand} onClick={handleBrandClick} onDelete={handleDeleteBrand} />
          ))}
        </div>
      ) : (
        <div className="space-y-3">
          {/* Create New Brand List Item */}
          <CreateBrandListItem onClick={handleOpenCreateModal} />

          {/* Existing Brands */}
          {filteredBrands.map((brand) => (
            <BrandListItem key={brand.id} brand={brand} onClick={handleBrandClick} onDelete={handleDeleteBrand} />
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

      {/* Delete Confirmation Modal */}
      {showDeleteConfirmation && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
          style={{ margin: 0 }}
          onClick={cancelDeleteBrand} // Close on click outside
        >
          <div
            className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 max-w-md w-full mx-4"
            onClick={(e) => e.stopPropagation()} // Prevent closing when clicking inside modal
          >
            <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-gray-100">Delete Brand</h2>
            <p className="text-gray-600 dark:text-gray-300 mb-6">
              Are you sure you want to delete "{brandToDelete?.name}"? This action cannot be undone.
            </p>
            <div className="flex justify-end gap-3">
              <button
                type="button"
                className="px-4 py-2 text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-md transition-colors"
                onClick={cancelDeleteBrand}
              >
                Cancel
              </button>
              <button
                type="button"
                className="px-4 py-2 text-white bg-red-500 hover:bg-red-600 dark:bg-red-600 dark:hover:bg-red-700 rounded-md transition-colors"
                onClick={confirmDeleteBrand}
              >
                Delete
              </button>
            </div>
          </div>
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
