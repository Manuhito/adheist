import React, { useState, useEffect, useMemo } from 'react';
import { createRoot } from 'react-dom/client';
import { Input } from '@/components/ui/input.tsx';
import { Button } from '@/components/ui/button.tsx';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog.tsx';
import { 
  ArrowLeft,
  Search, 
  Image as ImageIcon,
  Download,
  Upload,
  X,
  Plus,
  Trash2
} from 'lucide-react';
import { AssetsContainer } from './components/AssetComponents.jsx';
import { ViewModeToggle } from './components/ViewModeToggle.jsx';

// Helper function to get CSRF token from cookies
function getCookie(name) {
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
}

function FileUploadArea({ selectedFiles, setSelectedFiles }) {
  const [isDragOver, setIsDragOver] = useState(false);

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragOver(false);
    
    const files = Array.from(e.dataTransfer.files).filter(file => 
      file.type.startsWith('image/')
    );
    
    setSelectedFiles(prev => [...prev, ...files]);
  };

  const handleFileSelect = (e) => {
    const files = Array.from(e.target.files).filter(file => 
      file.type.startsWith('image/')
    );
    
    setSelectedFiles(prev => [...prev, ...files]);
  };

  const removeFile = (index) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
  };

  return (
    <div className="space-y-4">
      {/* Drop Zone */}
      <div
        className={`border border-dashed rounded-lg p-6 transition-colors ${
          isDragOver 
            ? 'border-primary bg-primary/5 dark:bg-primary/10' 
            : 'border-gray-200 hover:border-gray-300 bg-gray-50 dark:bg-gray-800 dark:border-gray-700 dark:hover:border-gray-600'
        } ${selectedFiles.length > 0 ? '' : 'text-center'}`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        {selectedFiles.length === 0 ? (
          // Vertical layout when no files selected
          <>
            {/* Plus Icon in Container */}
            <div 
              className="mx-auto w-16 h-16 bg-gray-100 dark:bg-gray-600 border border-dashed border-gray-300 dark:border-gray-500 rounded-lg flex items-center justify-center mb-4 cursor-pointer hover:bg-gray-200 dark:hover:bg-gray-500 transition-colors"
              onClick={() => document.getElementById('file-upload').click()}
            >
              <Plus className="w-8 h-8 text-gray-500 dark:text-gray-400" />
            </div>
            
            <p className="text-lg text-gray-900 dark:text-gray-100 mb-2">
              Choose images or drag & drop it here.
            </p>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              JPG, JPEG, PNG and WEBP. Max 20 MB.
            </p>
          </>
        ) : (
          // Horizontal layout when files are selected
          <div className="flex items-center gap-4">
            {/* Plus Icon in Container */}
            <div 
              className="w-12 h-12 bg-gray-100 dark:bg-gray-600 border border-dashed border-gray-300 dark:border-gray-500 rounded-lg flex items-center justify-center cursor-pointer hover:bg-gray-200 dark:hover:bg-gray-500 transition-colors flex-shrink-0"
              onClick={() => document.getElementById('file-upload').click()}
            >
              <Plus className="w-6 h-6 text-gray-500 dark:text-gray-400" />
            </div>
            
            <div className="flex-1">
              <p className="text-base text-gray-900 dark:text-gray-100 mb-1">
                Choose images or drag & drop it here.
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                JPG, JPEG, PNG and WEBP. Max 20 MB.
              </p>
            </div>
          </div>
        )}
        
        <input
          type="file"
          multiple
          accept="image/*"
          onChange={handleFileSelect}
          className="hidden"
          id="file-upload"
        />
      </div>

      {/* File Previews */}
      {selectedFiles.length > 0 && (
        <div className="space-y-3">
          <h4 className="font-medium text-gray-900 dark:text-gray-100">
            Selected Files ({selectedFiles.length})
          </h4>
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-3">
            {selectedFiles.map((file, index) => (
              <div key={index} className="relative group">
                <div className="aspect-square rounded-lg overflow-hidden bg-gray-100 dark:bg-gray-800">
                  <img
                    src={URL.createObjectURL(file)}
                    alt={file.name}
                    className="w-full h-full object-cover"
                  />
                  {/* Overlay with trash icon */}
                  <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <button
                      onClick={() => removeFile(index)}
                      className="w-8 h-8 bg-red-500 text-white rounded-full flex items-center justify-center hover:bg-red-600 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 truncate">
                  {file.name}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
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
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [uploading, setUploading] = useState(false);

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
            onClick={() => setShowUploadModal(true)}
            className="bg-primary hover:bg-primary/90 text-white"
          >
            Upload Assets
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

  // Handle file upload
  const handleUpload = async () => {
    if (selectedFiles.length === 0) return;
    
    setUploading(true);
    
    try {
      const formData = new FormData();
      
      selectedFiles.forEach((file, index) => {
        formData.append(`asset_${index}`, file);
      });
      
      // Get CSRF token from multiple possible sources
      const csrfToken = document.querySelector('[name=csrfmiddlewaretoken]')?.value || 
                       document.querySelector('meta[name=csrf-token]')?.getAttribute('content') ||
                       getCookie('csrftoken');
      
      console.log('CSRF Token found:', csrfToken ? 'Yes' : 'No');
      
      const response = await fetch(`/ads/assets/${brandId}/upload/`, {
        method: 'POST',
        body: formData,
        headers: {
          'X-CSRFToken': csrfToken,
        },
      });
      
      if (response.ok) {
        const data = await response.json();
        
        // Add new assets to the current list
        setAssets(prev => [...data.assets, ...prev]);
        
        // Reset modal state
        setSelectedFiles([]);
        setShowUploadModal(false);
        
        // Show success message (you can implement a toast here)
        alert(data.message);
      } else {
        console.error('Upload failed with status:', response.status);
        
        // Try to parse error response
        let errorMessage = 'Upload failed';
        try {
          const errorData = await response.json();
          errorMessage = errorData.error || errorMessage;
        } catch (parseError) {
          // If response is not JSON (like HTML error page), show generic message
          if (response.status === 403) {
            errorMessage = 'Permission denied. Please refresh the page and try again.';
          } else if (response.status === 404) {
            errorMessage = 'Brand not found.';
          } else {
            errorMessage = `Upload failed (${response.status}). Please try again.`;
          }
        }
        
        alert(errorMessage);
      }
    } catch (error) {
      console.error('Upload error:', error);
      alert('Network error. Please check your connection and try again.');
    } finally {
      setUploading(false);
    }
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
        <ViewModeToggle viewMode={viewMode} setViewMode={setViewMode} />
      </div>

      {/* Assets Container */}
      <AssetsContainer 
        assets={filteredAssets}
        viewMode={viewMode}
        onAssetClick={handleDownload}
      />

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

      {/* Upload Modal */}
      <Dialog open={showUploadModal} onOpenChange={setShowUploadModal}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Upload Assets</DialogTitle>
            <div className="border-b border-gray-200 mt-2"></div>
          </DialogHeader>
          
          <div className="py-4">
            <FileUploadArea 
              selectedFiles={selectedFiles} 
              setSelectedFiles={setSelectedFiles} 
            />
          </div>
          
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowUploadModal(false);
                setSelectedFiles([]);
              }}
              disabled={uploading}
            >
              Cancel
            </Button>
            <Button
              onClick={handleUpload}
              disabled={selectedFiles.length === 0 || uploading}
              className="bg-primary hover:bg-primary/90 text-white"
            >
              {uploading ? 'Uploading...' : `Upload Files (${selectedFiles.length})`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
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
