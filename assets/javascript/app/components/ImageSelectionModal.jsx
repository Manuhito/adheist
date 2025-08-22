import React, { useState, useEffect, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../../components/ui/dialog.tsx';
import { Button } from '../../components/ui/button.tsx';
import { Upload } from 'lucide-react';
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from '../../components/ui/accordion.tsx';
import { useTranslation } from '../../lib/useTranslation';

/**
 * Modal component for selecting user images
 * Displays a grid of images that can be selected by the user, grouped by brand
 */
const ImageSelectionModal = ({ isOpen, onClose, onSelect }) => {
  const fileInputRef = useRef(null);
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

  // Handle file upload
  const handleFileUpload = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    
    setLoading(true);
    setError(null);
    
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
      console.log('Image upload category:', category);
      
      // Get selected brand from StepTwoComponent
      if (window.selectedBrandId) {
        formData.append('brand_id', window.selectedBrandId);
        console.log('Using brand ID for upload:', window.selectedBrandId);
      } else {
        console.warn('No brand ID available for image upload');
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
        // Refresh the image list
        fetchUserImages();
        // Show success message
        console.log('Image uploaded successfully');
      } else {
        throw new Error(data.error || 'Unknown error');
      }
    } catch (error) {
      console.error('Error uploading image:', error);
      setError(t('image_selection.upload_error', 'Error uploading image. Please try again.'));
    } finally {
      setLoading(false);
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  // Estilos personalizados para el scroll
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
      <DialogContent className="sm:max-w-[800px] max-h-[90vh] flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle>{t('image_selection.title', 'Select Image')}</DialogTitle>
        </DialogHeader>
        
        <div className="py-4 px-3 flex-1 overflow-y-auto custom-scrollbar">
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
            <Accordion type="single" collapsible className="w-full space-y-3">
              {brands && brands.length > 0 ? (
                brands.map((brand) => (
                  <AccordionItem key={brand.id} value={`brand-${brand.id}`} className="border rounded-lg px-2 shadow-sm">
                    <AccordionTrigger className="hover:no-underline py-3 px-3">
                      <div className="flex items-center justify-between w-full pr-4">
                        <span className="font-medium">{brand.name}</span>
                        <span className="text-sm text-muted-foreground bg-muted/30 px-2 py-1 rounded-full">
                          {(imagesByBrand[brand.id] || []).length} {t('image_selection.images', 'images')}
                        </span>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent className="px-3 pb-4 pt-2">
                      {imagesByBrand[brand.id] && imagesByBrand[brand.id].length > 0 ? (
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 place-items-center">
                          {imagesByBrand[brand.id].map((image) => (
                            <div
                              key={image.id}
                              className={`relative cursor-pointer rounded-md overflow-hidden border-2 transition-all hover:shadow-md ${selectedImage?.id === image.id ? 'border-primary ring-2 ring-primary/20' : 'border-transparent hover:border-muted-foreground/30'}`}
                              onClick={() => handleImageClick(image)}
                            >
                              <img
                                src={image.url}
                                alt=""
                                className="w-full h-full object-cover"
                              />
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-center text-muted-foreground py-4 bg-muted/20 rounded-md">
                          {t('image_selection.no_brand_images', 'No images uploaded to this brand yet.')}
                        </div>
                      )}
                    </AccordionContent>
                  </AccordionItem>
                ))
              ) : (
                <div className="text-center text-gray-500 py-4 bg-muted/10 rounded-md">
                  {t('image_selection.no_brands', 'No brands found. Create a brand first.')}
                </div>
              )}
            </Accordion>
          )}
        </div>

        <DialogFooter className="flex-shrink-0 mt-2 flex justify-between w-full px-0">
          <div className="mr-auto">
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
              disabled={!selectedImage || loading}
            >
              {t('image_selection.select', 'Select')}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ImageSelectionModal;
