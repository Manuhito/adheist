import React, { useState, useMemo } from 'react';
import { createRoot } from 'react-dom/client';
import { Input } from '@/components/ui/input.tsx';
import { Button } from '@/components/ui/button.tsx';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog.tsx';
import { 
  FolderClosed, 
  Search, 
  Plus,
  FolderPlus
} from 'lucide-react';
import { BrandsContainer } from './components/BrandFolderComponents.jsx';
import { ViewModeToggle } from './components/ViewModeToggle.jsx';
import { CreateFolderModal } from './components/CreateFolderModal.jsx';


function AssetsPage() {
  // Get data from window globals
  const assetsData = window.__ASSETS_DATA__ || {};
  const user = assetsData.user || {};
  const containers = assetsData.containers || []; // Now includes both brands and folders
  
  // Search state
  const [searchQuery, setSearchQuery] = useState('');
  
  // View mode state
  const [viewMode, setViewMode] = useState('grid'); // 'grid' or 'list'
  
  // Create folder modal state
  const [showCreateFolderModal, setShowCreateFolderModal] = useState(false);
  const [containersData, setContainersData] = useState(containers);

  // Set header content when component mounts
  React.useEffect(() => {
    if (window.setAppHeader) {
      const headerComponent = (
        <div className="flex items-center justify-between w-full">
          <div>
            <h1 className="text-xl font-bold text-primary">
              Asset Library
            </h1>
            <p className="text-sm text-gray-600 dark:text-gray-400">
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

  // Handle container click (brand or folder)
  const handleContainerClick = async (container) => {
    try {
      if (container.type === 'brand') {
        const response = await fetch(`/ads/assets/${container.id}/`);
        if (response.ok) {
          const data = await response.json();
          // Store the assets data and navigate to detail page
          sessionStorage.setItem('brandAssetsData', JSON.stringify(data));
          window.location.href = `/ads/assets/${container.id}/detail/`;
        } else {
          console.error('Failed to fetch brand assets');
        }
      } else if (container.type === 'folder') {
        const response = await fetch(`/ads/assets/folder/${container.id}/`);
        if (response.ok) {
          const data = await response.json();
          // Store the assets data and navigate to folder detail page
          sessionStorage.setItem('folderAssetsData', JSON.stringify(data));
          window.location.href = `/ads/assets/folder/${container.id}/detail/`;
        } else {
          console.error('Failed to fetch folder assets');
        }
      }
    } catch (error) {
      console.error('Error fetching container assets:', error);
    }
  };

  // Handle folder creation
  const handleFolderCreated = (newFolder) => {
    // Add the new folder to the containers list
    setContainersData(prev => [...prev, newFolder].sort((a, b) => a.name.toLowerCase().localeCompare(b.name.toLowerCase())));
  };

  // Filter containers based on search query
  const filteredContainers = useMemo(() => {
    if (!searchQuery.trim()) {
      return containersData;
    }
    
    return containersData.filter(container => {
      const searchTerm = searchQuery.toLowerCase().trim();
      return container.name.toLowerCase().includes(searchTerm);
    });
  }, [containersData, searchQuery]);

  return (
    <div className="max-w-7xl mx-auto p-6">
      {/* Search Bar, Create Folder Button and View Toggle */}
      <div className="mb-6 flex items-center justify-between gap-4">
        {/* Search Bar */}
        <div className="relative flex-1 max-w-lg">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search className="h-4 w-4 text-muted-foreground" />
          </div>
          <Input
            type="text"
            placeholder="Search brands and folders..."
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

      {/* Containers (Brands and Folders) */}
      <BrandsContainer 
        brands={filteredContainers}
        viewMode={viewMode}
        onBrandClick={handleContainerClick}
      />

      {/* Empty State - No containers at all */}
      {containersData.length === 0 && (
        <div className="mt-12 text-center">
          <FolderClosed className="mx-auto h-12 w-12 text-gray-400 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            No assets yet
          </h3>
          <p className="text-gray-500 mb-6">
            Create a brand or folder and upload assets to get started.
          </p>
          <div className="flex justify-center gap-3">
            <Button 
              onClick={() => window.location.href = '/ads/brands/'}
              className="bg-primary hover:bg-primary/90 text-white"
            >
              <Plus className="w-4 h-4 mr-2" />
              Create Brand
            </Button>
            <Button 
              onClick={() => setShowCreateFolderModal(true)}
              variant="outline"
            >
              <FolderPlus className="w-4 h-4 mr-2" />
              Create Folder
            </Button>
          </div>
        </div>
      )}

      {/* No search results */}
      {containersData.length > 0 && filteredContainers.length === 0 && searchQuery.trim() && (
        <div className="mt-12 text-center">
          <Search className="mx-auto h-12 w-12 text-gray-400 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            No results found
          </h3>
          <p className="text-gray-500">
            No brands or folders match your search for "{searchQuery}". Try a different search term.
          </p>
        </div>
      )}

      {/* Create Folder Modal */}
      <CreateFolderModal
        open={showCreateFolderModal}
        onOpenChange={setShowCreateFolderModal}
        onFolderCreated={handleFolderCreated}
        parentFolderId={null}
        parentFolderName={null}
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
