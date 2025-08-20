import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../../components/ui/dialog.tsx';
import { Button } from '../../components/ui/button.tsx';
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from '../../components/ui/accordion.tsx';
import { useTranslation } from '../../lib/useTranslation';

/**
 * Modal component for selecting user images
 * Displays a grid of images that can be selected by the user, grouped by brand
 */
const ImageSelectionModal = ({ isOpen, onClose, onSelect }) => {
  const { t } = useTranslation();
  const [images, setImages] = useState([]);
  const [brands, setBrands] = useState([]);
  const [imagesByBrand, setImagesByBrand] = useState({});
  const [loading, setLoading] = useState(false);
  const [selectedImage, setSelectedImage] = useState(null);
  const [error, setError] = useState(null);

  // Fetch user images and brands when the modal opens
  useEffect(() => {
    if (isOpen) {
      fetchUserImages();
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
    }
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
      const fetchedImages = data.images || [];
      setImages(fetchedImages);
      
      // Group images by brand
      const groupedImages = {};
      fetchedImages.forEach(image => {
        if (!groupedImages[image.brand_id]) {
          groupedImages[image.brand_id] = [];
        }
        groupedImages[image.brand_id].push(image);
      });
      
      setImagesByBrand(groupedImages);
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
      <DialogContent className="sm:max-w-[800px] max-h-[90vh] flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle>{t('image_selection.title', 'Select Image')}</DialogTitle>
        </DialogHeader>
        
        <div className="py-4 flex-1 overflow-y-auto">
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
            <Accordion type="single" collapsible className="w-full">
              {brands.length > 0 ? (
                brands.map((brand) => {
                  const brandImages = imagesByBrand[brand.id] || [];
                  return (
                    <AccordionItem key={brand.id} value={`brand-${brand.id}`}>
                      <AccordionTrigger className="hover:no-underline">
                        <div className="flex items-center">
                          <span>{brand.name}</span>
                          <span className="ml-2 text-xs bg-gray-100 text-gray-700 px-2 py-0.5 rounded-full">
                            {brandImages.length}
                          </span>
                        </div>
                      </AccordionTrigger>
                      <AccordionContent>
                        {brandImages.length === 0 ? (
                          <div className="text-center text-gray-500 py-4">
                            {t('image_selection.no_brand_images', 'No images uploaded to this brand yet.')}
                          </div>
                        ) : (
                          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 pt-4">
                            {brandImages.map((image) => (
                              <div 
                                key={image.id} 
                                className={`relative aspect-square cursor-pointer rounded-md overflow-hidden border-2 transition-all ${
                                  selectedImage?.id === image.id ? 'border-primary ring-2 ring-primary' : 'border-gray-200 hover:border-gray-300'
                                }`}
                                onClick={() => handleImageClick(image)}
                              >
                                <img 
                                  src={image.url} 
                                  alt={`${brand.name} image`}
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
                      </AccordionContent>
                    </AccordionItem>
                  );
                })
              ) : (
                <div className="text-center text-gray-500 py-4">
                  {t('image_selection.no_brands', 'No brands found. Create a brand first.')}
                </div>
              )}
            </Accordion>
          )}
        </div>

        <DialogFooter className="flex-shrink-0 mt-2">
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
