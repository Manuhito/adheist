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
  FolderPlus,
  Folder,
  FolderClosed
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

function FolderAssetsDetailPage() {
  // Get data from window globals and sessionStorage
  const folderData = window.__FOLDER_ASSETS_DATA__ || {};
  const user = folderData.user || {};
  const folder = folderData.folder || {};
  
  // Try to get cached data from sessionStorage first
  const cachedData = sessionStorage.getItem('folderAssetsData');
  const initialData = cachedData ? JSON.parse(cachedData) : null;
  
  // State
  const [assets, setAssets] = useState(initialData?.assets || []);
  const [subfolders, setSubfolders] = useState(initialData?.subfolders || []);
  const [loading, setLoading] = useState(!initialData);
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState('grid');
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [showCreateFolderModal, setShowCreateFolderModal] = useState(false);
  const [notification, setNotification] = useState(null);

  // Set header content when component mounts
  useEffect(() => {
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
            <h1 className="text-xl font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
              <Folder className="w-5 h-5" />
              {folder.name || 'Folder'}
            </h1>
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
  }, [folder.name]);

  // Fetch assets if not cached
  useEffect(() => {
    if (!initialData && folder.id) {
      fetchAssets();
    }
  }, [folder.id]);

  const fetchAssets = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/ads/assets/folder/${folder.id}/`);
      if (response.ok) {
        const data = await response.json();
        setAssets(data.assets || []);
        setSubfolders(data.subfolders || []);
      } else {
        console.error('Failed to fetch folder assets');
      }
    } catch (error) {
      console.error('Error fetching folder assets:', error);
    } finally {
      setLoading(false);
    }
  };

  // Handle search input change
  const handleSearchChange = (e) => {
    setSearchQuery(e.target.value);
  };

  // Handle download
  const handleDownload = (asset) => {
    if (asset.image_url) {
      const link = document.createElement('a');
      link.href = asset.image_url;
      link.download = asset.original_filename || 'asset';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  // Handle folder creation
  const handleFolderCreated = (newFolder) => {
    console.log('Subfolder created:', newFolder);
    // Add the new subfolder to the list
    setSubfolders(prev => [...prev, newFolder].sort((a, b) => a.name.toLowerCase().localeCompare(b.name.toLowerCase())));
  };

  // Handle subfolder click
  const handleSubfolderClick = async (subfolder) => {
    try {
      const response = await fetch(`/ads/assets/folder/${subfolder.id}/`);
      if (response.ok) {
        const data = await response.json();
        // Store the assets data and navigate to subfolder detail page
        sessionStorage.setItem('folderAssetsData', JSON.stringify(data));
        window.location.href = `/ads/assets/folder/${subfolder.id}/detail/`;
      } else {
        console.error('Failed to fetch subfolder assets');
      }
    } catch (error) {
      console.error('Error fetching subfolder assets:', error);
    }
  };

  // Handle file upload
  const handleUpload = async () => {
    if (selectedFiles.length === 0) return;
    
    setUploading(true);
    
    try {
      const formData = new FormData();
      
      // Add each file to FormData with asset_ prefix
      selectedFiles.forEach((file, index) => {
        formData.append(`asset_${index}`, file);
      });
      
      // Get CSRF token
      const csrfToken = getCookie('csrftoken');
      
      console.log('CSRF Token found:', csrfToken ? 'Yes' : 'No');
      
      const response = await fetch(`/ads/assets/folder/${folder.id}/upload/`, {
        method: 'POST',
        body: formData,
        headers: {
          'X-CSRFToken': csrfToken,
        },
      });
      
      if (response.ok) {
        const data = await response.json();
        console.log('Upload successful:', data);
        
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
        } catch {
          // If we can't parse the error response, use status-based messages
          if (response.status === 413) {
            errorMessage = 'Files are too large. Please try smaller images.';
          } else if (response.status === 404) {
            errorMessage = 'Folder not found.';
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

  // Filter assets based on search query
  const filteredAssets = useMemo(() => {
    if (!searchQuery.trim()) {
      return assets;
    }
    
    return assets.filter(asset => {
      const searchTerm = searchQuery.toLowerCase().trim();
      return (
        (asset.original_filename && asset.original_filename.toLowerCase().includes(searchTerm)) ||
        (asset.category && asset.category.toLowerCase().includes(searchTerm))
      );
    });
  }, [assets, searchQuery]);

  // Filter subfolders based on search query
  const filteredSubfolders = useMemo(() => {
    if (!searchQuery.trim()) {
      return subfolders;
    }
    
    return subfolders.filter(subfolder => {
      const searchTerm = searchQuery.toLowerCase().trim();
      return subfolder.name.toLowerCase().includes(searchTerm);
    });
  }, [subfolders, searchQuery]);

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

      {/* Subfolders Section */}
      {filteredSubfolders.length > 0 && (
        <div className="mb-8">
          <BrandsContainer 
            brands={filteredSubfolders}
            viewMode={viewMode}
            onBrandClick={handleSubfolderClick}
          />
        </div>
      )}

      {/* Assets Section */}
      {filteredAssets.length > 0 && (
        <div className="mb-8">
          <AssetsContainer 
            assets={filteredAssets}
            viewMode={viewMode}
            onAssetClick={handleDownload}
          />
        </div>
      )}

      {/* Empty State - No content at all */}
      {assets.length === 0 && subfolders.length === 0 && (
        <div className="mt-12 text-center">
          <FolderClosed className="mx-auto h-12 w-12 text-gray-400 dark:text-gray-500 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
            This folder is empty
          </h3>
          <p className="text-gray-500 dark:text-gray-400 mb-6">
            Create subfolders or upload assets to get started.
          </p>
          <div className="flex justify-center gap-3">
            <Button 
              onClick={() => setShowCreateFolderModal(true)}
              variant="outline"
            >
              <FolderPlus className="w-4 h-4 mr-2" />
              Create Folder
            </Button>
            <Button 
              onClick={() => setShowUploadModal(true)}
              className="bg-primary hover:bg-primary/90 text-white"
            >
              Upload Assets
            </Button>
          </div>
        </div>
      )}

      {/* No search results */}
      {(assets.length > 0 || subfolders.length > 0) && filteredAssets.length === 0 && filteredSubfolders.length === 0 && searchQuery.trim() && (
        <div className="mt-12 text-center">
          <Search className="mx-auto h-12 w-12 text-gray-400 dark:text-gray-500 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
            No results found
          </h3>
          <p className="text-gray-500 dark:text-gray-400">
            No folders or assets match your search for "{searchQuery}". Try a different search term.
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
        parentFolderId={folder.id}
        parentFolderName={folder.name}
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
        root.render(<FolderAssetsDetailPage />);
      }
    } else {
      // Wait for sidebar layout to be ready
      setTimeout(checkAndMount, 50);
    }
  }
  
  checkAndMount();
});

export default FolderAssetsDetailPage;
