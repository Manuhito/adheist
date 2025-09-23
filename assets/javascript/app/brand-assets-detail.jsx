import React, { useState, useEffect, useMemo } from 'react';
import { createRoot } from 'react-dom/client';
import { Card, CardContent } from '@/components/ui/card.tsx';
import { Input } from '@/components/ui/input.tsx';
import { Button } from '@/components/ui/button.tsx';
import { 
  ArrowLeft,
  Search, 
  Grid3x3, 
  List,
  Image as ImageIcon,
  Download
} from 'lucide-react';

function AssetCard({ asset, onDownload }) {
  const imageUrl = asset.image_url;
  const filename = asset.original_filename || 'asset.jpg';

  const formatDate = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  return (
    <Card 
      className="hover:bg-gray-50 transition-colors rounded-xl cursor-pointer"
      onClick={() => onDownload(imageUrl, filename)}
    >
      <CardContent className="p-2">
        <div className="space-y-2">
          {/* Image - Maximum space */}
          <div className="aspect-square rounded-lg overflow-hidden bg-gray-100 flex items-center justify-center">
            {imageUrl ? (
              <img
                src={imageUrl}
                alt="Asset"
                className="w-full h-full object-cover"
              />
            ) : (
              <ImageIcon className="w-12 h-12 text-gray-400" />
            )}
          </div>

          {/* Asset Info - Minimal */}
          <div className="px-1">
            <p className="text-xs text-gray-900 truncate">
              {filename}
            </p>
            <p className="text-xs text-gray-500">
              {formatDate(asset.created_at)}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function AssetListItem({ asset, onDownload }) {
  const imageUrl = asset.image_url;
  const filename = asset.original_filename || 'asset.jpg';

  const formatDate = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  return (
    <Card 
      className="hover:bg-gray-50 transition-colors rounded-xl cursor-pointer"
      onClick={() => onDownload(imageUrl, filename)}
    >
      <CardContent className="p-4">
        <div className="flex items-center space-x-4">
          {/* Thumbnail */}
          <div className="w-16 h-16 rounded-lg overflow-hidden bg-gray-100 flex items-center justify-center flex-shrink-0">
            {imageUrl ? (
              <img 
                src={imageUrl} 
                alt="Asset"
                className="w-full h-full object-cover"
              />
            ) : (
              <ImageIcon className="w-6 h-6 text-gray-400" />
            )}
          </div>
          
          {/* Asset Info */}
          <div className="flex-1 min-w-0">
            <p className="text-sm text-gray-900 truncate">
              {filename}
            </p>
            <p className="text-xs text-gray-500">
              {formatDate(asset.created_at)}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function BrandAssetsDetailPage() {
  // Get data from window globals
  const brandAssetsData = window.__BRAND_ASSETS_DATA__ || {};
  const user = brandAssetsData.user || {};
  const brandId = brandAssetsData.brandId;
  const brandName = brandAssetsData.brandName;
  
  // State
  const [assets, setAssets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState('grid');

  // Load assets data
  useEffect(() => {
    const loadAssets = async () => {
      try {
        // First try to get data from sessionStorage
        const storedData = sessionStorage.getItem('brandAssetsData');
        if (storedData) {
          const data = JSON.parse(storedData);
          setAssets(data.assets || []);
          sessionStorage.removeItem('brandAssetsData'); // Clean up
        } else {
          // Fallback: fetch from API
          const response = await fetch(`/ads/assets/${brandId}/`);
          if (response.ok) {
            const data = await response.json();
            setAssets(data.assets || []);
          }
        }
      } catch (error) {
        console.error('Error loading assets:', error);
      } finally {
        setLoading(false);
      }
    };

    if (brandId) {
      loadAssets();
    }
  }, [brandId]);

  // Set header content when component mounts
  React.useEffect(() => {
    if (window.setAppHeader) {
      const headerComponent = (
        <div className="flex items-center justify-between w-full">
          <div className="flex items-center gap-4">
            <button
              onClick={() => window.location.href = '/ads/assets/'}
              className="flex items-center justify-center w-10 h-10 bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 rounded-full transition-colors"
            >
              <ArrowLeft className="w-5 h-5 text-gray-600 dark:text-gray-400" />
            </button>
            <div>
              <h1 className="text-xl font-bold text-primary">
                {brandName} Assets
              </h1>
              <p className="text-sm text-gray-600">
                {assets.length} assets available
              </p>
            </div>
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
  }, [brandName, assets.length]);

  // Handle search input change
  const handleSearchChange = (e) => {
    setSearchQuery(e.target.value);
  };

  // Handle download
  const handleDownload = (imageUrl, filename) => {
    if (!imageUrl) return;
    
    const link = document.createElement('a');
    link.href = imageUrl;
    link.download = filename || `${brandName}-asset.jpg`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Filter assets based on search query
  const filteredAssets = useMemo(() => {
    if (!searchQuery.trim()) {
      return assets;
    }
    
    return assets.filter(asset => {
      const searchTerm = searchQuery.toLowerCase().trim();
      return (
        asset.brand_name.toLowerCase().includes(searchTerm) ||
        asset.id.toString().includes(searchTerm)
      );
    });
  }, [assets, searchQuery]);

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto p-6">
        <div className="text-center">
          <p className="text-gray-500">Loading assets...</p>
        </div>
      </div>
    );
  }

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
            placeholder="Search assets..."
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

      {/* Assets Container */}
      {viewMode === 'grid' ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {filteredAssets.map((asset) => (
            <AssetCard 
              key={asset.id} 
              asset={asset} 
              onDownload={handleDownload}
            />
          ))}
        </div>
      ) : (
        <div className="space-y-3">
          {filteredAssets.map((asset) => (
            <AssetListItem 
              key={asset.id} 
              asset={asset} 
              onDownload={handleDownload}
            />
          ))}
        </div>
      )}

      {/* Empty State */}
      {filteredAssets.length === 0 && !loading && (
        <div className="mt-12 text-center">
          <ImageIcon className="mx-auto h-12 w-12 text-gray-400 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            {searchQuery.trim() ? 'No assets found' : 'No assets yet'}
          </h3>
          <p className="text-gray-500">
            {searchQuery.trim() 
              ? `No assets match your search for "${searchQuery}".`
              : 'Upload assets to this brand to see them here.'
            }
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
        root.render(<BrandAssetsDetailPage />);
      }
    } else {
      // Wait for sidebar layout to be ready
      setTimeout(checkAndMount, 50);
    }
  }
  
  checkAndMount();
});

export default BrandAssetsDetailPage;
