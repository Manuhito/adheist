import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog.tsx';
import { Input } from '@/components/ui/input.tsx';
import { Button } from '@/components/ui/button.tsx';
import { FolderPlus } from 'lucide-react';

/**
 * Reusable modal component for creating folders
 * @param {boolean} open - Whether the modal is open
 * @param {function} onOpenChange - Function to handle modal open/close
 * @param {function} onFolderCreated - Callback when folder is successfully created
 * @param {number|null} parentFolderId - ID of parent folder (null for root folders)
 * @param {string} parentFolderName - Name of parent folder for display
 * @param {number|null} brandId - ID of brand for brand-specific folders
 * @param {string} brandName - Name of brand for display
 */
export function CreateFolderModal({ 
  open, 
  onOpenChange, 
  onFolderCreated, 
  parentFolderId = null,
  parentFolderName = null,
  brandId = null,
  brandName = null
}) {
  const [newFolderName, setNewFolderName] = useState('');
  const [isCreatingFolder, setIsCreatingFolder] = useState(false);
  const [error, setError] = useState('');

  // Helper function to get CSRF token
  const getCsrfToken = () => {
    const cookies = document.cookie.split(';');
    for (let cookie of cookies) {
      const [name, value] = cookie.trim().split('=');
      if (name === 'csrftoken') {
        return decodeURIComponent(value);
      }
    }
    return null;
  };

  // Handle create folder
  const handleCreateFolder = async () => {
    if (!newFolderName.trim()) {
      setError('Folder name is required');
      return;
    }
    
    setIsCreatingFolder(true);
    setError('');
    
    try {
      const formData = new FormData();
      formData.append('folder_name', newFolderName.trim());
      
      // Add parent folder ID if creating a subfolder
      if (parentFolderId) {
        formData.append('parent_folder_id', parentFolderId.toString());
      }
      
      // Add brand ID if creating a brand-specific folder
      if (brandId) {
        formData.append('brand_id', brandId.toString());
      }
      
      const response = await fetch('/ads/assets/create-folder/', {
        method: 'POST',
        headers: {
          'X-CSRFToken': getCsrfToken(),
        },
        body: formData
      });
      
      const data = await response.json();
      
      if (response.ok && data.success) {
        // Reset form and close modal
        setNewFolderName('');
        setError('');
        onOpenChange(false);
        
        // Notify parent component of successful creation
        if (onFolderCreated) {
          onFolderCreated(data.folder);
        }
      } else {
        setError(data.error || 'Failed to create folder');
      }
    } catch (error) {
      console.error('Error creating folder:', error);
      setError('An error occurred while creating the folder');
    } finally {
      setIsCreatingFolder(false);
    }
  };

  // Handle modal close
  const handleClose = () => {
    setNewFolderName('');
    setError('');
    onOpenChange(false);
  };

  // Handle key press
  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !isCreatingFolder) {
      handleCreateFolder();
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FolderPlus className="h-5 w-5" />
            {parentFolderId 
              ? 'Create Subfolder' 
              : brandId 
                ? `Create Folder in ${brandName}` 
                : 'Create New Folder'
            }
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          {parentFolderName && (
            <div className="text-sm text-gray-600">
              <span className="font-medium">Parent folder:</span> {parentFolderName}
            </div>
          )}
          
          <div className="space-y-2">
            <label htmlFor="folder-name" className="text-sm font-medium">
              Folder Name
            </label>
            <Input
              id="folder-name"
              type="text"
              placeholder="Enter folder name..."
              value={newFolderName}
              onChange={(e) => {
                setNewFolderName(e.target.value);
                setError(''); // Clear error when user types
              }}
              onKeyDown={handleKeyDown}
              className={error ? 'border-red-500' : ''}
            />
            {error && (
              <p className="text-sm text-red-600">{error}</p>
            )}
          </div>
        </div>
        
        <DialogFooter>
          <Button
            variant="outline"
            onClick={handleClose}
            disabled={isCreatingFolder}
          >
            Cancel
          </Button>
          <Button
            onClick={handleCreateFolder}
            disabled={!newFolderName.trim() || isCreatingFolder}
          >
            {isCreatingFolder ? 'Creating...' : 'Create Folder'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
