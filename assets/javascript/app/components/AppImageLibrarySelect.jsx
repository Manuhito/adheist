import React from "react";
import { ImagePlus, Trash2, Upload } from "lucide-react";
import { Button } from "../../components/ui/button";
import { cn } from "../../lib/utils";
import { useTranslation } from "../../lib/useTranslation";

/**
 * Component for selecting app images from the image library
 * Based on ImageLibrarySelect but configured for app_image fields
 */
export function AppImageLibrarySelect({ onSelectImage, onDeleteImage, className, selectedImages, disabled = false, ...props }) {
  const { t } = useTranslation();

  return (
    <div className={cn("w-full h-full flex flex-col", className)}>
      <div className="w-full">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* First image selection button */}
          <div className="flex flex-col items-center justify-center rounded-md aspect-square bg-background hover:bg-muted/20 transition-colors">
            {selectedImages?.primary ? (
              <div className="relative w-full h-full group">
                <img 
                  src={selectedImages.primary} 
                  alt={t('image_library.primary_image', 'Primary image')}
                  className="w-full h-full object-contain"
                />
                <div className="absolute inset-0 flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity bg-black/20">
                  <Button 
                    variant="destructive" 
                    size="icon"
                    onClick={() => !disabled && onDeleteImage?.({ type: 'primary', field: 'app_image_1' })}
                    disabled={disabled}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                  <Button 
                    variant="secondary" 
                    size="icon"
                    onClick={() => !disabled && onSelectImage?.({ type: 'primary', field: 'app_image_1' })}
                    disabled={disabled}
                  >
                    <Upload className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ) : (
              <Button 
                variant="outline" 
                className="w-full h-full flex flex-col gap-2 hover:bg-muted/40 dark:hover:bg-muted/20"
                onClick={() => !disabled && onSelectImage?.({ type: 'primary', field: 'app_image_1' })}
                disabled={disabled}
              >
                <ImagePlus className="h-8 w-8 text-muted-foreground" />
              </Button>
            )}
          </div>
          
          {/* Second image selection button */}
          <div className="flex flex-col items-center justify-center rounded-md aspect-square bg-background hover:bg-muted/20 transition-colors">
            {selectedImages?.secondary ? (
              <div className="relative w-full h-full group">
                <img 
                  src={selectedImages.secondary} 
                  alt={t('image_library.secondary_image', 'Secondary image')}
                  className="w-full h-full object-contain"
                />
                <div className="absolute inset-0 flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity bg-black/20">
                  <Button 
                    variant="destructive" 
                    size="icon"
                    onClick={() => !disabled && onDeleteImage?.({ type: 'secondary', field: 'app_image_2' })}
                    disabled={disabled}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                  <Button 
                    variant="secondary" 
                    size="icon"
                    onClick={() => !disabled && onSelectImage?.({ type: 'secondary', field: 'app_image_2' })}
                    disabled={disabled}
                  >
                    <Upload className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ) : (
              <Button 
                variant="outline" 
                className="w-full h-full flex flex-col gap-2 hover:bg-muted/40 dark:hover:bg-muted/20"
                onClick={() => !disabled && onSelectImage?.({ type: 'secondary', field: 'app_image_2' })}
                disabled={disabled}
              >
                <ImagePlus className="h-8 w-8 text-muted-foreground" />
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
