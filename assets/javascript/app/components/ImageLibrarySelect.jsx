import React from "react";
import { Image } from "lucide-react";
import { Button } from "../../components/ui/button";
import { cn } from "../../lib/utils";
import { useTranslation } from "../../lib/useTranslation";

/**
 * Component for selecting images from the image library
 * Provides two buttons for selecting different views of a product from the library
 */
export function ImageLibrarySelect({ onSelectImage, className, selectedImages, ...props }) {
  const { t } = useTranslation();

  return (
    <div className={cn("w-full h-full flex flex-col p-6", className)}>
      <div className="w-full">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* First image selection button */}
          <div className="flex flex-col items-center justify-center border rounded-md p-4 h-48 bg-background hover:bg-muted/20 transition-colors">
            {selectedImages?.primary ? (
              <div className="relative w-full h-full">
                <img 
                  src={selectedImages.primary} 
                  alt={t('image_library.primary_image', 'Primary image')}
                  className="w-full h-full object-contain"
                />
                <Button 
                  variant="secondary" 
                  size="sm" 
                  className="absolute bottom-2 right-2"
                  onClick={() => onSelectImage?.({ type: 'primary', field: 'product_image_1' })}
                >
                  {t('image_library.change', 'Change')}
                </Button>
              </div>
            ) : (
              <Button 
                variant="outline" 
                className="w-full h-full flex flex-col gap-2"
                onClick={() => onSelectImage?.({ type: 'primary', field: 'product_image_1' })}
              >
                <Image className="h-8 w-8 text-muted-foreground" />
                <span>{t('image_library.select_primary', 'Select from Image Library')}</span>
              </Button>
            )}
          </div>
          
          {/* Second image selection button */}
          <div className="flex flex-col items-center justify-center border rounded-md p-4 h-48 bg-background hover:bg-muted/20 transition-colors">
            {selectedImages?.secondary ? (
              <div className="relative w-full h-full">
                <img 
                  src={selectedImages.secondary} 
                  alt={t('image_library.secondary_image', 'Secondary image')}
                  className="w-full h-full object-contain"
                />
                <Button 
                  variant="secondary" 
                  size="sm" 
                  className="absolute bottom-2 right-2"
                  onClick={() => onSelectImage?.({ type: 'secondary', field: 'product_image_2' })}
                >
                  {t('image_library.change', 'Change')}
                </Button>
              </div>
            ) : (
              <Button 
                variant="outline" 
                className="w-full h-full flex flex-col gap-2"
                onClick={() => onSelectImage?.({ type: 'secondary', field: 'product_image_2' })}
              >
                <Image className="h-8 w-8 text-muted-foreground" />
                <span>{t('image_library.select_secondary', 'Select from Image Library')}</span>
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
