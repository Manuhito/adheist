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
  Trash2,
  FolderPlus
} from 'lucide-react';
import { AssetsContainer } from './components/AssetComponents.jsx';
import { ViewModeToggle } from './components/ViewModeToggle.jsx';
import { CreateFolderModal } from './components/CreateFolderModal.jsx';
import { BrandsContainer } from './components/BrandFolderComponents.jsx';
import { FileUploadArea } from './components/FileUploadArea.jsx';
import { AlertNotification } from '@/components/ui/alert-notification.tsx';

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


function BrandAssetsDetailPage() {
  // Get data from window globals
  const brandAssetsData = window.__BRAND_ASSETS_DATA__ || {};
  const user = brandAssetsData.user || {};
  const brandId = brandAssetsData.brandId;
  const brandName = brandAssetsData.brandName;
  
  // State
  const [assets, setAssets] = useState([]);
  const [folders, setFolders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState('grid');
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [showCreateFolderModal, setShowCreateFolderModal] = useState(false);
  const [notification, setNotification] = useState(null);

  // Load assets data
  useEffect(() => {
    const loadAssets = async () => {
        // First try to get data from sessionStorage
        const storedData = sessionStorage.getItem('brandAssetsData');
        if (storedData) {
          const data = JSON.parse(storedData);
          setAssets(data.assets || []);
          setFolders(data.folders || []);
          setLoading(false);
          return;
        }
        
        // If no stored data, fetch from API
        try {
          const response = await fetch(`/ads/assets/${brandId}/`);
          if (response.ok) {
            const data = await response.json();
            setAssets(data.assets || []);
            setFolders(data.folders || []);
          } else {
            console.error('Failed to load assets');
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
              <h1 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
                {brandName} Assets
              </h1>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {assets.length} assets available
              </p>
            </div>
          </div>
          <Button 
            onClick={() => setShowUploadModal(true)}
            className="text-sm"
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
        
        // Show success message
        setNotification({
          message: data.message || 'Assets uploaded successfully!',
          variant: 'success'
        });
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
        
        setNotification({
          message: errorMessage,
          variant: 'error'
        });
      }
    } catch (error) {
      console.error('Upload error:', error);
      setNotification({
        message: 'Network error. Please check your connection and try again.',
        variant: 'error'
      });
    } finally {
      setUploading(false);
    }
  };

  // Handle folder creation
  const handleFolderCreated = (newFolder) => {
    console.log('Brand folder created:', newFolder);
    // Add the new folder to the folders list
    setFolders(prev => [...prev, newFolder].sort((a, b) => a.name.toLowerCase().localeCompare(b.name.toLowerCase())));
  };

  // Handle folder click (navigate to folder detail)
  const handleFolderClick = async (folder) => {
    try {
      const response = await fetch(`/ads/assets/folder/${folder.id}/`);
      if (response.ok) {
        const data = await response.json();
        // Store the folder assets data and navigate to folder detail page
        sessionStorage.setItem('folderAssetsData', JSON.stringify(data));
        window.location.href = `/ads/assets/folder/${folder.id}/detail/`;
      } else {
        console.error('Failed to fetch folder assets');
      }
    } catch (error) {
      console.error('Error fetching folder assets:', error);
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
        (asset.original_filename && asset.original_filename.toLowerCase().includes(searchTerm)) ||
        (asset.description && asset.description.toLowerCase().includes(searchTerm))
      );
    });
  }, [assets, searchQuery]);

  // Filter folders based on search query
  const filteredFolders = useMemo(() => {
    if (!searchQuery.trim()) {
      return folders;
    }
    
    return folders.filter(folder => {
      const searchTerm = searchQuery.toLowerCase().trim();
      return folder.name.toLowerCase().includes(searchTerm);
    });
  }, [folders, searchQuery]);

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto p-6">
        <div className="text-center">
          <p className="text-gray-500 dark:text-gray-400">Loading assets...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-6">
      {/* Notification */}
      {notification && (
        <AlertNotification
          message={notification.message}
          variant={notification.variant}
          onClose={() => setNotification(null)}
        />
      )}
      {/* Search Bar, Create Folder Button and View Toggle */}
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

        {/* Create Folder Button and View Mode Toggle */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowCreateFolderModal(true)}
            className="p-2 text-gray-600 hover:text-primary dark:text-gray-400 dark:hover:text-primary transition-colors rounded-md hover:bg-gray-100 dark:hover:bg-gray-800"
            title="New Folder"
          >
            <FolderPlus className="h-5 w-5" />
          </button>
          <ViewModeToggle viewMode={viewMode} setViewMode={setViewMode} />
        </div>
      </div>

      {/* Folders Section */}
      {filteredFolders.length > 0 && (
        <div className="mb-8">
          <BrandsContainer 
            brands={filteredFolders}
            viewMode={viewMode}
            onBrandClick={handleFolderClick}
          />
        </div>
      )}

      {/* Assets Container */}
      <AssetsContainer 
        assets={filteredAssets}
        viewMode={viewMode}
        onAssetClick={handleDownload}
      />

      {/* Empty State */}
      {filteredAssets.length === 0 && filteredFolders.length === 0 && !loading && (
        <div className="mt-12 text-center">
          <ImageIcon className="mx-auto h-12 w-12 text-gray-400 dark:text-gray-500 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
            {searchQuery.trim() ? 'No results found' : 'No content yet'}
          </h3>
          <p className="text-gray-500 dark:text-gray-400">
            {searchQuery.trim() 
              ? `No folders or assets match your search for "${searchQuery}".`
              : 'Create folders or upload assets to organize your brand content.'
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

      {/* Create Folder Modal */}
      <CreateFolderModal
        open={showCreateFolderModal}
        onOpenChange={setShowCreateFolderModal}
        onFolderCreated={handleFolderCreated}
        parentFolderId={null}
        parentFolderName={null}
        brandId={brandId}
        brandName={brandName}
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
