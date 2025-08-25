import React from "react";
import { ImagePlus, Trash2, Upload } from "lucide-react";
import { Button } from "../../components/ui/button";
import { cn } from "../../lib/utils";
import { useTranslation } from "../../lib/useTranslation";

/**
 * Component for selecting logo image from the image library
 * Based on ImageLibrarySelect but configured for logo field
 */
export function LogoImageLibrarySelect({ onSelectImage, onDeleteImage, className, selectedImage, ...props }) {
  const { t } = useTranslation();

  return (
    <div className={cn("w-full h-full flex flex-col", className)}>
      <div className="w-full">
        <div className="flex items-center justify-center">
          {/* Logo image selection button */}
          <div className="flex flex-col items-center justify-center rounded-md p-4 h-48 w-full bg-background hover:bg-muted/20 transition-colors">
            {selectedImage ? (
              <div className="relative w-full h-full group">
                <img 
                  src={selectedImage} 
                  alt={t('image_library.logo_image', 'Logo image')}
                  className="w-full h-full object-contain"
                />
                <div className="absolute inset-0 flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity bg-black/20">
                  <Button 
                    variant="destructive" 
                    size="icon"
                    onClick={() => onDeleteImage?.({ field: 'logo' })}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                  <Button 
                    variant="secondary" 
                    size="icon"
                    onClick={() => onSelectImage?.({ field: 'logo' })}
                  >
                    <Upload className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ) : (
              <Button 
                variant="outline" 
                className="w-full h-full flex flex-col gap-2 hover:bg-muted/40 dark:hover:bg-muted/20"
                onClick={() => onSelectImage?.({ field: 'logo' })}
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
