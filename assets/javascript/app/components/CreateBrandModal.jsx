import React, { useState, useRef } from 'react';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogFooter 
} from '../../components/ui/dialog.tsx';
import { Button } from '../../components/ui/button.tsx';
import { Input } from '../../components/ui/input.tsx';
import { Globe } from 'lucide-react';
import { useTranslation } from '../../lib/useTranslation';
import { LogoImageUploader } from './LogoImageUploader.jsx';

/**
 * Modal component for creating a new brand
 */
const CreateBrandModal = ({ isOpen, onClose, onBrandCreated }) => {
  const { t } = useTranslation();
  const fileInputRef = useRef(null);
  const [brandName, setBrandName] = useState('');
  const [selectedLogo, setSelectedLogo] = useState(null);
  const [selectedLogoData, setSelectedLogoData] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleBrandNameChange = (e) => {
    setBrandName(e.target.value);
    if (error) setError('');
  };

  // Handle logo selection - opens file explorer directly
  const handleLogoSelect = (logoData) => {
    console.log('Logo selection triggered:', logoData);
    
    // Trigger the hidden file input to open file explorer
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  // Handle logo deletion
  const handleLogoDelete = (logoData) => {
    // Clean up the temporary URL to free memory
    if (selectedLogo && selectedLogo.startsWith('blob:')) {
      URL.revokeObjectURL(selectedLogo);
    }
    
    setSelectedLogo(null);
    setSelectedLogoData(null);
    console.log('Logo deleted:', logoData);
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

  // Handle file selection when user selects a logo file (store locally, don't upload yet)
  const handleFileUpload = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    
    try {
      // Create a temporary URL for preview
      const previewUrl = URL.createObjectURL(file);
      
      // Extract file information
      const fileInfo = {
        file: file, // Store the actual file for later upload
        original_filename: file.name,
        file_size: file.size,
        canvas_width: null,
        canvas_height: null,
        canvas_size: null,
        url: previewUrl // Temporary URL for preview
      };
      
      // Try to extract image dimensions
      const img = new Image();
      img.onload = function() {
        fileInfo.canvas_width = this.width;
        fileInfo.canvas_height = this.height;
        fileInfo.canvas_size = `${this.width}x${this.height}`;
        
        // Update state with complete file info
        setSelectedLogoData(fileInfo);
        console.log('Logo file selected:', fileInfo);
      };
      img.onerror = function() {
        // If can't load image, still store the file info without dimensions
        console.warn('Could not extract logo dimensions');
        setSelectedLogoData(fileInfo);
      };
      img.src = previewUrl;
      
      // Set the preview URL immediately
      setSelectedLogo(previewUrl);
      
      console.log('Logo file prepared for upload:', file.name);
    } catch (error) {
      console.error('Error processing logo file:', error);
      setError('Error processing logo file. Please try again.');
    }
  };

  const handleSubmit = async () => {
    // Validate input
    if (!brandName.trim()) {
      setError(t('brand.name_required', 'Brand name is required'));
      return;
    }

    setIsSubmitting(true);
    setError('');

    try {
      const response = await fetch('/ads/api/create-user-brand/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRFToken': getCsrfToken(),
        },
        body: JSON.stringify({ brand_name: brandName.trim() }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || t('brand.creation_failed', 'Failed to create brand'));
      }

      // Clean up temporary URL
      if (selectedLogo && selectedLogo.startsWith('blob:')) {
        URL.revokeObjectURL(selectedLogo);
      }
      
      // Reset form and close modal
      setBrandName('');
      setSelectedLogo(null);
      setSelectedLogoData(null);
      onBrandCreated(data.brand);
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader className="border-b border-gray-200 pb-4">
          <DialogTitle>Create Brand</DialogTitle>
        </DialogHeader>
        <div className="py-4">
          <div className="space-y-4">
            {/* Website Analysis Section */}
            <div className="space-y-3">
              <p className="text-sm text-gray-600">
                Analyze your brand website to generate the fields below{' '}
                <span className="text-primary">(4 Credits)</span>
              </p>
              
              {/* Website URL Input with Generate Button */}
              <div className="flex gap-2">
                <div className="flex-1 relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Globe className="h-4 w-4 text-gray-400" />
                  </div>
                  <Input
                    placeholder="Website URL"
                    className="pl-9 bg-gray-50 border-gray-200"
                    disabled={isSubmitting}
                  />
                </div>
                <Button 
                  variant="default"
                  className="px-6"
                  disabled={isSubmitting}
                >
                  Generate
                </Button>
              </div>
            </div>

            {/* Brand Logo Section */}
            <div className="space-y-2">
              <p className="text-sm text-gray-600">
                Brand logo
              </p>
              <LogoImageUploader
                onSelectImage={handleLogoSelect}
                onDeleteImage={handleLogoDelete}
                selectedImage={selectedLogo}
                selectedImageData={selectedLogoData}
              />
            </div>

            {/* Brand Name Field */}
            <div className="space-y-2">
              <p className="text-sm text-gray-600">
                {t('brand.name', 'Brand Name')}
              </p>
              <Input
                id="brandName"
                value={brandName}
                onChange={handleBrandNameChange}
                placeholder={t('brand.name_placeholder', 'Enter brand name')}
                disabled={isSubmitting}
              />
              {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button 
            variant="outline" 
            onClick={onClose} 
            disabled={isSubmitting}
            className="hover:bg-red-50 hover:border-red-200 hover:text-red-600"
          >
            {t('common.cancel', 'Cancel')}
          </Button>
          <Button 
            onClick={handleSubmit} 
            disabled={isSubmitting}
          >
            {isSubmitting ? t('common.saving', 'Saving...') : t('common.save', 'Save')}
          </Button>
        </DialogFooter>
      </DialogContent>

      {/* Hidden file input for logo upload */}
      <input
        type="file"
        ref={fileInputRef}
        className="hidden"
        accept="image/*"
        onChange={handleFileUpload}
      />
    </Dialog>
  );
};

export default CreateBrandModal;
