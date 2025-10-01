import React, { useState, useCallback } from "react";
import { Plus, Trash2, Upload } from "lucide-react";
import { Button } from "../../components/ui/button";
import { cn } from "../../lib/utils";
import { useTranslation } from "../../lib/useTranslation";

/**
 * Component for uploading logo image with drag & drop functionality
 * Used by the discover-clone-page for brand logo upload
 * Based on LogoImageLibrarySelect but with different visual appearance
 */
export function LogoImageUploader({ onSelectImage, onDeleteImage, className, selectedImage, selectedImageData, onFileSelect, ...props }) {
  const { t } = useTranslation();
  const [isDragging, setIsDragging] = useState(false);

  // Drag & Drop handlers (same pattern as image-upload.jsx)
  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDragEnter = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = useCallback(
    (e) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(false);

      const file = e.dataTransfer.files?.[0];
      if (file && file.type.startsWith("image/")) {
        // Create a fake event to simulate file input change
        const fakeEvent = {
          target: {
            files: [file],
          },
        };
        // Call the file select handler if provided
        if (onFileSelect) {
          onFileSelect(fakeEvent);
        }
      }
    },
    [onFileSelect],
  );

  return (
    <div className={cn("w-full", className)}>
      <div className="w-full">
        {selectedImage ? (
          <div className="w-full h-20 border border-dashed border-gray-300 rounded-lg flex items-center justify-between gap-3 p-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 flex-shrink-0">
                <img 
                  src={selectedImage} 
                  alt={t('image_library.logo_image', 'Logo image')}
                  className="w-full h-full object-contain"
                />
              </div>
              <div className="text-left">
                <p className="text-sm font-medium text-gray-700">
                  {selectedImageData?.original_filename || 'logo-image.png'}
                </p>
                <p className="text-xs text-gray-500">
                  {selectedImageData?.canvas_size && selectedImageData?.file_size 
                    ? `${selectedImageData.canvas_size} • ${(selectedImageData.file_size / 1024).toFixed(1)} KB`
                    : selectedImageData?.canvas_size 
                      ? selectedImageData.canvas_size
                      : selectedImageData?.file_size 
                        ? `${(selectedImageData.file_size / 1024).toFixed(1)} KB`
                        : 'Brand logo'
                  }
                </p>
              </div>
            </div>
            <div className="flex flex-row gap-2">
              <Button 
                variant="secondary" 
                size="icon"
                onClick={(e) => {
                  e.stopPropagation();
                  onSelectImage?.({ field: 'logo' });
                }}
                title="Change logo"
              >
                <Upload className="h-4 w-4" />
              </Button>
              <Button 
                variant="destructive" 
                size="icon"
                onClick={(e) => {
                  e.stopPropagation();
                  onDeleteImage?.({ field: 'logo' });
                }}
                title="Delete logo"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
        ) : (
          <div 
            className={cn(
              "w-full h-20 border border-dashed rounded-lg flex items-start justify-start p-4 cursor-pointer transition-colors",
              isDragging 
                ? "border-primary/50 bg-primary/5 border-gray-400" 
                : "border-gray-300 hover:border-gray-400 hover:bg-gray-50"
            )}
            onClick={() => onSelectImage?.({ field: 'logo' })}
            onDragOver={handleDragOver}
            onDragEnter={handleDragEnter}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
          >
            <div className="flex items-center gap-3 text-gray-500">
              <div className="w-12 h-12 border border-dashed border-gray-300 rounded-lg flex items-center justify-center flex-shrink-0">
                <Plus className="h-6 w-6" />
              </div>
              <div className="text-left">
                <p className="text-sm font-medium text-gray-700">Choose images or drag & drop it here.</p>
                <p className="text-xs text-gray-500">JPG, JPEG, PNG and WEBP. Max 20 MB.</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
