import React, { useState, useEffect, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../../components/ui/dialog.tsx';
import { Button } from '../../components/ui/button.tsx';
import { Input } from '../../components/ui/input.tsx';
import { ArrowLeft, Search, Upload, FolderClosed, Image as ImageIcon, Plus } from 'lucide-react';
import { useTranslation } from '../../lib/useTranslation';
import { BrandsContainer } from './BrandFolderComponents.jsx';
import { AssetsContainer } from './AssetComponents.jsx';
import { ViewModeToggle } from './ViewModeToggle.jsx';

/**
 * Enhanced modal component for selecting user images with folder navigation
 * Displays brands as folders, then assets within selected brand
 */
const ImageLibraryModal = ({ isOpen, onClose, onSelect }) => {
  const { t } = useTranslation();
  
  // Navigation state
  const [currentView, setCurrentView] = useState('brands'); // 'brands' | 'assets'
  const [selectedBrand, setSelectedBrand] = useState(null);
  
  // Data state
  const [brands, setBrands] = useState([]);
  const [assets, setAssets] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  
  // UI state
  const [viewMode, setViewMode] = useState('grid'); // 'grid' | 'list'
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedAsset, setSelectedAsset] = useState(null);

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      setCurrentView('brands');
      setSelectedBrand(null);
      setSelectedAsset(null);
      setSearchQuery('');
      setError(null);
      fetchUserBrands();
    }
  }, [isOpen]);

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

  // Fetch user brands from the API
  const fetchUserBrands = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch('/ads/api/user-brands/', {
        method: 'GET',
        headers: {
          'X-CSRFToken': getCsrfToken(),
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch brands');
      }

      const data = await response.json();
      if (data.success && Array.isArray(data.brands)) {
        setBrands(data.brands);
      }
    } catch (error) {
      console.error('Error fetching user brands:', error);
      setError(t('image_selection.error_fetching', 'Error fetching brands. Please try again.'));
    } finally {
      setLoading(false);
    }
  };

  // Fetch assets for a specific brand
  const fetchBrandAssets = async (brandId) => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch(`/ads/assets/${brandId}/`, {
        method: 'GET',
        headers: {
          'X-CSRFToken': getCsrfToken(),
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch assets');
      }

      const data = await response.json();
      setAssets(data.assets || []);
    } catch (error) {
      console.error('Error fetching brand assets:', error);
      setError(t('image_selection.error_fetching_assets', 'Error fetching assets. Please try again.'));
    } finally {
      setLoading(false);
    }
  };

  // Handle brand selection
  const handleBrandSelect = (brand) => {
    setSelectedBrand(brand);
    setCurrentView('assets');
    setSearchQuery(''); // Reset search when switching views
    fetchBrandAssets(brand.id);
  };

  // Handle back to brands
  const handleBackToBrands = () => {
    setCurrentView('brands');
    setSelectedBrand(null);
    setSelectedAsset(null);
    setSearchQuery('');
    setAssets([]);
  };

  // Handle asset selection
  const handleAssetSelect = (asset) => {
    setSelectedAsset(asset.id === selectedAsset?.id ? null : asset);
  };

  // Handle select button click
  const handleSelect = () => {
    if (selectedAsset) {
      onSelect(selectedAsset);
      onClose();
    }
  };

  // Handle search input change
  const handleSearchChange = (e) => {
    setSearchQuery(e.target.value);
  };

  // Filter data based on search query
  const filteredData = useMemo(() => {
    if (!searchQuery.trim()) {
      return currentView === 'brands' ? brands : assets;
    }
    
    const searchTerm = searchQuery.toLowerCase().trim();
    
    if (currentView === 'brands') {
      return brands.filter(brand => 
        brand.name.toLowerCase().includes(searchTerm)
      );
    } else {
      return assets.filter(asset => {
        const filename = asset.original_filename || asset.filename || '';
        return filename.toLowerCase().includes(searchTerm);
      });
    }
  }, [currentView, brands, assets, searchQuery]);

  // Custom scrollbar styles
  const scrollbarStyles = `
    .custom-scrollbar::-webkit-scrollbar {
      width: 10px;
    }
    .custom-scrollbar::-webkit-scrollbar-track {
      background: hsl(var(--background));
      border-radius: 8px;
      margin: 4px;
    }
    .custom-scrollbar::-webkit-scrollbar-thumb {
      background: hsl(var(--muted-foreground) / 0.3);
      border-radius: 8px;
      border: 2px solid hsl(var(--background));
    }
    .custom-scrollbar::-webkit-scrollbar-thumb:hover {
      background: hsl(var(--muted-foreground) / 0.5);
    }
    .dark .custom-scrollbar::-webkit-scrollbar-track {
      background: hsl(var(--background) / 0.8);
    }
    .dark .custom-scrollbar::-webkit-scrollbar-thumb {
      background: hsl(var(--muted-foreground) / 0.4);
      border: 2px solid hsl(var(--background) / 0.8);
    }
    .dark .custom-scrollbar::-webkit-scrollbar-thumb:hover {
      background: hsl(var(--muted-foreground) / 0.6);
    }
  `;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <style>{scrollbarStyles}</style>
      <DialogContent className="sm:max-w-[900px] max-h-[90vh] flex flex-col">
        {/* Header with breadcrumb navigation */}
        <DialogHeader className="flex-shrink-0">
          <div className="flex items-center gap-3">
            {currentView === 'assets' && (
              <Button 
                variant="ghost" 
                size="sm"
                onClick={handleBackToBrands}
                className="p-2 h-auto"
              >
                <ArrowLeft className="w-4 h-4" />
              </Button>
            )}
            <div className="flex-1">
              <DialogTitle>
                {currentView === 'brands' 
                  ? t('image_selection.select_brand', 'Select Brand')
                  : `${selectedBrand?.name} ${t('image_selection.assets', 'Assets')}`
                }
              </DialogTitle>
              {currentView === 'assets' && (
                <p className="text-sm text-muted-foreground mt-1">
                  {filteredData.length} {t('image_selection.assets_available', 'assets available')}
                </p>
              )}
            </div>
          </div>
        </DialogHeader>
        
        {/* Controls Bar */}
        <div className="flex items-center justify-between gap-4 py-4 flex-shrink-0">
          {/* Search Bar */}
          <div className="relative flex-1 max-w-sm">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-4 w-4 text-muted-foreground" />
            </div>
            <Input
              type="text"
              placeholder={currentView === 'brands' 
                ? t('image_selection.search_brands', 'Search brands...')
                : t('image_selection.search_assets', 'Search assets...')
              }
              value={searchQuery}
              onChange={handleSearchChange}
              className="pl-10"
            />
          </div>

          {/* View Mode Toggle */}
          <ViewModeToggle viewMode={viewMode} setViewMode={setViewMode} />
        </div>
        
        {/* Content Area */}
        <div className="flex-1 overflow-y-auto custom-scrollbar">
          {loading ? (
            <div className="flex justify-center items-center h-64">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
            </div>
          ) : error ? (
            <div className="text-center text-red-500 p-4">{error}</div>
          ) : filteredData.length === 0 ? (
            <div className="text-center text-gray-500 p-8">
              {currentView === 'brands' ? (
                <>
                  <FolderClosed className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">
                    {searchQuery.trim() 
                      ? t('image_selection.no_brands_found', 'No brands found')
                      : t('image_selection.no_brands', 'No brands available')
                    }
                  </h3>
                  <p className="text-gray-500">
                    {searchQuery.trim() 
                      ? t('image_selection.no_brands_search', `No brands match your search for "${searchQuery}".`)
                      : t('image_selection.create_brand_first', 'Create a brand first to upload assets.')
                    }
                  </p>
                </>
              ) : (
                <>
                  <ImageIcon className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">
                    {searchQuery.trim() 
                      ? t('image_selection.no_assets_found', 'No assets found')
                      : t('image_selection.no_assets', 'No assets yet')
                    }
                  </h3>
                  <p className="text-gray-500">
                    {searchQuery.trim() 
                      ? t('image_selection.no_assets_search', `No assets match your search for "${searchQuery}".`)
                      : t('image_selection.upload_assets_first', 'Upload assets to this brand to see them here.')
                    }
                  </p>
                </>
              )}
            </div>
          ) : (
            <>
              {currentView === 'brands' ? (
                <BrandsContainer 
                  brands={filteredData}
                  viewMode={viewMode}
                  onBrandClick={handleBrandSelect}
                />
              ) : (
                <AssetsContainer 
                  assets={filteredData}
                  viewMode={viewMode}
                  onAssetClick={handleAssetSelect}
                  selectable={true}
                  selectedAsset={selectedAsset}
                />
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <DialogFooter className="flex-shrink-0 mt-4 flex justify-between w-full px-0">
          <div className="mr-auto">
            {/* Upload button - only show when in assets view (inside a brand folder) */}
            {currentView === 'assets' && (
              <Button 
                variant="outline" 
                disabled={true}
                className="opacity-50"
              >
                <Upload className="h-4 w-4 mr-2" />
                {t('image_selection.upload', 'Upload')}
              </Button>
            )}
          </div>
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              onClick={onClose}
              className="hover:bg-destructive/10 hover:text-destructive hover:border-destructive/30"
            >
              {t('image_selection.cancel', 'Cancel')}
            </Button>
            <Button 
              onClick={handleSelect} 
              disabled={!selectedAsset || loading}
            >
              {t('image_selection.select', 'Select')}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ImageLibraryModal;
