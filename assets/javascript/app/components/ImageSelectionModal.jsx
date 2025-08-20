import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../../components/ui/dialog.tsx';
import { Button } from '../../components/ui/button.tsx';
import { useTranslation } from '../../lib/useTranslation';

/**
 * Modal component for selecting user images
 * Displays a grid of images that can be selected by the user
 */
const ImageSelectionModal = ({ isOpen, onClose, onSelect }) => {
  const { t } = useTranslation();
  const [images, setImages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedImage, setSelectedImage] = useState(null);
  const [error, setError] = useState(null);

  // Fetch user images when the modal opens
  useEffect(() => {
    if (isOpen) {
      fetchUserImages();
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

  // Fetch user images from the API
  const fetchUserImages = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch('/ads/user-images', {
        method: 'GET',
        headers: {
          'X-CSRFToken': getCsrfToken(),
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch images');
      }

      const data = await response.json();
      setImages(data.images || []);
    } catch (error) {
      console.error('Error fetching user images:', error);
      setError(t('image_selection.error_fetching', 'Error fetching images. Please try again.'));
    } finally {
      setLoading(false);
    }
  };

  // Handle image selection
  const handleImageClick = (image) => {
    setSelectedImage(image.id === selectedImage?.id ? null : image);
  };

  // Handle select button click
  const handleSelect = () => {
    if (selectedImage) {
      onSelect(selectedImage);
      onClose();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[800px]">
        <DialogHeader>
          <DialogTitle>{t('image_selection.title', 'Select Image')}</DialogTitle>
        </DialogHeader>
        
        <div className="py-4">
          {loading ? (
            <div className="flex justify-center items-center h-64">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
            </div>
          ) : error ? (
            <div className="text-center text-red-500 p-4">{error}</div>
          ) : images.length === 0 ? (
            <div className="text-center text-gray-500 p-4">
              {t('image_selection.no_images', 'No images found. Upload images to your brand first.')}
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {images.map((image) => (
                <div 
                  key={image.id} 
                  className={`relative aspect-square cursor-pointer rounded-md overflow-hidden border-2 transition-all ${
                    selectedImage?.id === image.id ? 'border-primary ring-2 ring-primary' : 'border-gray-200 hover:border-gray-300'
                  }`}
                  onClick={() => handleImageClick(image)}
                >
                  <img 
                    src={image.url} 
                    alt={`User image ${image.id}`}
                    className="object-cover w-full h-full"
                  />
                  {selectedImage?.id === image.id && (
                    <div className="absolute inset-0 bg-primary/20 flex items-center justify-center">
                      <div className="bg-primary text-white rounded-full p-1">
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="20 6 9 17 4 12"></polyline>
                        </svg>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            {t('image_selection.cancel', 'Cancel')}
          </Button>
          <Button 
            onClick={handleSelect} 
            disabled={!selectedImage || loading}
          >
            {t('image_selection.select', 'Select')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ImageSelectionModal;
