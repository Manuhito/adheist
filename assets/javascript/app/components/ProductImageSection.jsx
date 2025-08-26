import React from "react";
import { Package } from "lucide-react";
import { cn } from "../../lib/utils";
import { ImageLibrarySelect } from "./ImageLibrarySelect";
import { useTranslation } from "../../lib/useTranslation";

/**
 * Component for displaying the product image section
 * Has the same visual style as the Physical Product section
 */
export function ProductImageSection({ className, onSelectImage, onDeleteImage, selectedImages }) {
  const { t } = useTranslation();

  return (
    <div className={cn("w-full bg-card p-4 rounded-xl", className)}>

      <div className="relative">
        {/* Image Library Container */}
        <div className="flex flex-col rounded-lg border-2 border-border overflow-hidden">
          {/* Header section with icon and title */}
          <div className="flex items-center p-4 border-b border-border bg-background/50">
            <div className="rounded-full bg-background p-2 shadow-sm mr-3">
              <Package className="h-5 w-5 text-blue-500" />
            </div>
            <div>
              <h4 className="text-base font-medium">
                {t('image_library.physical_product', 'Physical Product')}
              </h4>
              <p className="text-xs text-muted-foreground">
                {t('image_library.tangible_items', 'Tangible items that can be photographed')}
              </p>
            </div>
          </div>

          {/* Image selection section */}
          <div className="flex-grow">
            <ImageLibrarySelect
              onSelectImage={onSelectImage}
              onDeleteImage={onDeleteImage}
              selectedImages={selectedImages}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
