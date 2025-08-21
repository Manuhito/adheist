import React from "react";
import { Monitor } from "lucide-react";
import { cn } from "../../lib/utils";
import { AppImageLibrarySelect } from "./AppImageLibrarySelect";
import { useTranslation } from "../../lib/useTranslation";

/**
 * Component for displaying the app image section
 * Has the same visual style as the Software/Service section
 */
export function AppImageSection({ className, onSelectImage, onDeleteImage, selectedImages }) {
  const { t } = useTranslation();

  return (
    <div className={cn("w-full bg-card p-4 rounded-xl", className)}>
      
      <div className="mt-6 relative">
        {/* Image Library Container */}
        <div className="flex flex-col rounded-lg border-2 border-border overflow-hidden">
          {/* Header section with icon and title */}
          <div className="flex items-center p-4 border-b border-border bg-background/50">
            <div className="rounded-full bg-background p-2 shadow-sm mr-3">
              <Monitor className="h-5 w-5 text-purple-500" />
            </div>
            <div>
              <h4 className="text-base font-medium">
                {t('product_type.software_service', 'Software / Service')}
              </h4>
              <p className="text-xs text-muted-foreground">
                {t('product_type.digital_products', 'Digital products or services with screenshots')}
              </p>
            </div>
          </div>
          
          {/* Image selection section */}
          <div className="flex-grow">
            <AppImageLibrarySelect 
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

