import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../../components/ui/dialog.tsx';
import { Button } from '../../components/ui/button.tsx';
import { Input } from '../../components/ui/input.tsx';
import { ArrowLeft, Search, Upload, FolderClosed, Image as ImageIcon, Plus, FolderPlus } from 'lucide-react';
import { useTranslation } from '../../lib/useTranslation';
import { BrandsContainer } from './BrandFolderComponents.jsx';
import { AssetsContainer } from './AssetComponents.jsx';
import { ViewModeToggle } from './ViewModeToggle.jsx';
import { CreateFolderModal } from './CreateFolderModal.jsx';

/**
 * Enhanced modal component for selecting user images with folder navigation
 * Displays brands as folders, then assets within selected brand
 */
const ImageLibraryModal = ({ isOpen, onClose, onSelect }) => {
  const { t } = useTranslation();
  const fileInputRef = useRef(null);

  // Navigation state
  const [currentView, setCurrentView] = useState('containers'); // 'containers' | 'brand_assets' | 'folder_assets'
  const [selectedContainer, setSelectedContainer] = useState(null);

  // Data state
  const [containers, setContainers] = useState([]); // Combined brands and folders
  const [assets, setAssets] = useState([]);
  const [folders, setFolders] = useState([]); // For brand/folder subfolders
  const [loading, setLoading] = useState(false);

  // UI state
  const [viewMode, setViewMode] = useState('grid'); // 'grid' | 'list'
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedAsset, setSelectedAsset] = useState(null);
  const [showCreateFolderModal, setShowCreateFolderModal] = useState(false);

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      setCurrentView('containers');
      setSelectedContainer(null);
      setSelectedAsset(null);
      setSearchQuery('');
      fetchContainers();
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

  // Fetch containers (brands + folders) from the API
  const fetchContainers = async () => {
    setLoading(true);

    try {
      const response = await fetch('/ads/api/containers/', {
        method: 'GET',
        headers: {
          'X-CSRFToken': getCsrfToken(),
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch containers');
      }

      const data = await response.json();
      if (data.success) {
        setContainers(data.containers || []);
      } else {
        throw new Error(data.error || 'Unknown error');
      }
    } catch (error) {
      console.error('Error fetching containers:', error);
    } finally {
      setLoading(false);
    }
  };

  // Fetch assets for a specific container (brand or folder)
  const fetchContainerAssets = async (container) => {
    setLoading(true);

    try {
      let url;
      if (container.type === 'brand') {
        url = `/ads/assets/${container.id}/`;
      } else if (container.type === 'folder') {
        url = `/ads/assets/folder/${container.id}/`;
      } else {
        throw new Error('Invalid container type');
      }

      const response = await fetch(url, {
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
      setFolders(data.folders || data.subfolders || []);
    } catch (error) {
      console.error('Error fetching container assets:', error);
    } finally {
      setLoading(false);
    }
  };

  // Handle container selection (brand or folder)
  const handleContainerSelect = (container) => {
    setSelectedContainer(container);
    if (container.type === 'brand') {
      setCurrentView('brand_assets');
    } else if (container.type === 'folder') {
      setCurrentView('folder_assets');
    }
    setSearchQuery(''); // Reset search when switching views
    fetchContainerAssets(container);
  };

  // Handle folder creation
  const handleFolderCreated = (newFolder) => {
    console.log('Folder created in modal:', newFolder);
    // Add the new folder to containers list if we're in the main view
    if (currentView === 'containers') {
      setContainers(prev => [...prev, { ...newFolder, type: 'folder' }].sort((a, b) => a.name.toLowerCase().localeCompare(b.name.toLowerCase())));
    } else {
      // Add to subfolders if we're inside a container
      setFolders(prev => [...prev, newFolder].sort((a, b) => a.name.toLowerCase().localeCompare(b.name.toLowerCase())));
    }
  };

  // Handle back to containers
  const handleBackToContainers = () => {
    setCurrentView('containers');
    setSelectedContainer(null);
    setSelectedAsset(null);
    setSearchQuery('');
    setAssets([]);
    setFolders([]);
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

  // Handle file upload
  const handleFileUpload = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setLoading(true);

    try {
      // Create FormData
      const formData = new FormData();
      formData.append('image', file);

      // Get the source and category from window variables
      const source = window.currentImageSelectionSource;
      let category = 'product'; // Default

      if (source === 'logo_library') {
        category = 'logo';
      } else if (source === 'app_library') {
        category = 'app';
      } else if (source === 'product_library') {
        category = 'product';
      }

      formData.append('category', category);

      // Use the selected container from the modal
      if (selectedContainer && selectedContainer.id) {
        if (selectedContainer.type === 'brand') {
          formData.append('brand_id', selectedContainer.id);
        } else if (selectedContainer.type === 'folder') {
          formData.append('folder_id', selectedContainer.id);
        }
      } else {
        console.warn('No container selected for image upload');
        return;
      }

      // Upload the image
      const response = await fetch('/ads/upload-brand-asset/', {
        method: 'POST',
        headers: {
          'X-CSRFToken': getCsrfToken(),
        },
        body: formData
      });

      if (!response.ok) {
        throw new Error('Failed to upload image');
      }

      const data = await response.json();

      if (data.success) {
        // Refresh the assets list for the current container
        await fetchContainerAssets(selectedContainer);
      } else {
        throw new Error(data.error || 'Unknown error');
      }
    } catch (error) {
      console.error('Error uploading image:', error);
    } finally {
      setLoading(false);
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  // Filter containers based on search query
  const filteredContainers = useMemo(() => {
    if (!searchQuery.trim()) {
      return containers;
    }

    const searchTerm = searchQuery.toLowerCase().trim();
    return containers.filter(container =>
      container.name.toLowerCase().includes(searchTerm)
    );
  }, [containers, searchQuery]);

  // Filter assets based on search query
  const filteredAssets = useMemo(() => {
    if (!searchQuery.trim()) {
      return assets;
    }

    const searchTerm = searchQuery.toLowerCase().trim();
    return assets.filter(asset => {
      const filename = asset.original_filename || asset.filename || '';
      return filename.toLowerCase().includes(searchTerm);
    });
  }, [assets, searchQuery]);

  // Filter folders based on search query
  const filteredFolders = useMemo(() => {
    if (!searchQuery.trim()) {
      return folders;
    }

    const searchTerm = searchQuery.toLowerCase().trim();
    return folders.filter(folder =>
      folder.name.toLowerCase().includes(searchTerm)
    );
  }, [folders, searchQuery]);

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
      <DialogContent className="sm:max-w-[900px] max-h-[90vh] flex flex-col z-[110]">
        <DialogHeader className="flex-shrink-0">
          <div className="flex items-center gap-3">
            {(currentView === 'brand_assets' || currentView === 'folder_assets') && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleBackToContainers}
                className="p-2 h-auto"
              >
                <ArrowLeft className="w-4 h-4" />
              </Button>
            )}
            <div className="flex-1">
              <DialogTitle>
                {currentView === 'containers'
                  ? t('image_selection.select_container', 'Select Brand or Folder')
                  : `${selectedContainer?.name} ${t('image_selection.assets', 'Assets')}`
                }
              </DialogTitle>
              {(currentView === 'brand_assets' || currentView === 'folder_assets') && (
                <p className="text-sm text-muted-foreground mt-1">
                  {filteredAssets.length} {t('image_selection.assets_available', 'assets available')}
                  {filteredFolders.length > 0 && `, ${filteredFolders.length} folders`}
                </p>
              )}
            </div>
          </div>
        </DialogHeader>

        <div className="flex items-center justify-between gap-4 py-4 flex-shrink-0">
          <div className="relative flex-1 max-w-sm">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-4 w-4 text-muted-foreground" />
            </div>
            <Input
              type="text"
              placeholder={currentView === 'containers'
                ? t('image_selection.search_containers', 'Search brands and folders...')
                : t('image_selection.search_assets', 'Search assets...')
              }
              value={searchQuery}
              onChange={handleSearchChange}
              className="pl-10"
            />
          </div>

          <div className="flex items-center gap-2">
            {(currentView === 'containers' || currentView === 'brand_assets' || currentView === 'folder_assets') && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowCreateFolderModal(true)}
                className="p-2 text-gray-600 hover:text-primary dark:text-gray-400 dark:hover:text-primary"
                title="New Folder"
              >
                <FolderPlus className="h-4 w-4" />
              </Button>
            )}

            <ViewModeToggle viewMode={viewMode} setViewMode={setViewMode} />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar">
          {loading ? (
            <div className="flex justify-center items-center h-64">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
            </div>
          ) : (
            <>
              {currentView === 'containers' ? (
                filteredContainers.length === 0 ? (
                  <div className="text-center text-gray-500 dark:text-gray-400 p-8">
                    <FolderClosed className="mx-auto h-12 w-12 text-gray-400 dark:text-gray-500 mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
                      {searchQuery.trim()
                        ? t('image_selection.no_containers_found', 'No containers found')
                        : t('image_selection.no_containers', 'No brands or folders available')
                      }
                    </h3>
                    <p className="text-gray-500 dark:text-gray-400">
                      {searchQuery.trim()
                        ? t('image_selection.no_containers_search', 'No brands or folders match your search for "' + searchQuery + '".')
                        : t('image_selection.create_container_first', 'Create a brand or folder first to organize your assets.')
                      }
                    </p>
                  </div>
                ) : (
                  <BrandsContainer
                    brands={filteredContainers}
                    viewMode={viewMode}
                    onBrandClick={handleContainerSelect}
                  />
                )
              ) : (
                <div className="space-y-6">
                  {filteredFolders.length > 0 && (
                    <div>
                      <h3 className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-3">
                        {t('image_selection.folders', 'Folders')}
                      </h3>
                      <BrandsContainer
                        brands={filteredFolders.map(folder => ({ ...folder, type: 'folder' }))}
                        viewMode={viewMode}
                        onBrandClick={handleContainerSelect}
                      />
                    </div>
                  )}

                  {filteredAssets.length > 0 ? (
                    <div>
                      {filteredFolders.length > 0 && (
                        <h3 className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-3">
                          {t('image_selection.assets', 'Assets')}
                        </h3>
                      )}
                      <AssetsContainer
                        assets={filteredAssets}
                        viewMode={viewMode}
                        onAssetClick={handleAssetSelect}
                        selectable={true}
                        selectedAsset={selectedAsset}
                      />
                    </div>
                  ) : filteredFolders.length === 0 && (
                    <div className="text-center text-gray-500 dark:text-gray-400 p-8">
                      <ImageIcon className="mx-auto h-12 w-12 text-gray-400 dark:text-gray-500 mb-4" />
                      <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
                        {searchQuery.trim()
                          ? t('image_selection.no_content_found', 'No content found')
                          : t('image_selection.no_content', 'No content yet')
                        }
                      </h3>
                      <p className="text-gray-500 dark:text-gray-400">
                        {searchQuery.trim()
                          ? t('image_selection.no_content_search', 'No folders or assets match your search for "' + searchQuery + '".')
                          : t('image_selection.upload_content_first', 'Upload assets or create folders to organize your content.')
                        }
                      </p>
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>

        <DialogFooter className="flex-shrink-0 mt-4 flex justify-between w-full px-0">
          <div className="mr-auto">
            {(currentView === 'brand_assets' || currentView === 'folder_assets') && (
              <>
                <input
                  type="file"
                  ref={fileInputRef}
                  className="hidden"
                  accept="image/*"
                  onChange={handleFileUpload}
                />
                <Button
                  variant="outline"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={loading}
                >
                  <Upload className="h-4 w-4 mr-2" />
                  {t('image_selection.upload', 'Upload')}
                </Button>
              </>
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

        <CreateFolderModal
          open={showCreateFolderModal}
          onOpenChange={setShowCreateFolderModal}
          onFolderCreated={handleFolderCreated}
          parentFolderId={currentView === 'containers' ? null : (selectedContainer?.type === 'folder' ? selectedContainer.id : null)}
          parentFolderName={currentView === 'containers' ? null : (selectedContainer?.type === 'folder' ? selectedContainer.name : null)}
          brandId={currentView === 'containers' ? null : (selectedContainer?.type === 'brand' ? selectedContainer.id : null)}
          brandName={currentView === 'containers' ? null : (selectedContainer?.type === 'brand' ? selectedContainer.name : null)}
        />
      </DialogContent>
    </Dialog>
  );
};

export default ImageLibraryModal;
