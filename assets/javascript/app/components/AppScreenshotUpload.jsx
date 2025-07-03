import React from "react";
import { ImageUpload } from "../../components/ui/image-upload";
import { cn } from "../../lib/utils";
import { useTranslation } from "../../lib/useTranslation";

/**
 * Component for app screenshot uploads
 * Provides two image upload fields for different views of a software product
 * Can be preloaded with initial image data
 */
export function AppScreenshotUpload({ onUpload, className, initialData, ...props }) {
  const { t } = useTranslation();
  // Handle uploads for each screenshot separately
  const handleFirstScreenshotUpload = (url) => {
    onUpload?.({ type: 'primary', url });
  };

  const handleSecondScreenshotUpload = (url) => {
    onUpload?.({ type: 'secondary', url });
  };
  
  // Extract initial image URLs from initialData if available
  const primaryImageUrl = initialData?.app_image_1_override || null;
  const secondaryImageUrl = initialData?.app_image_2_override || null;

  return (
    <div className={cn("w-full h-full flex flex-col p-6", className)}>
      <div className="w-full">
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <ImageUpload 
            onUpload={handleFirstScreenshotUpload}
            customTitle={" "}
            customDescription={" "}
            customPlaceholderText={" "}
            customDragDropText={" "}
            className="w-full border"
            initialImage={primaryImageUrl}
            {...props}
          />
          
          <ImageUpload 
            onUpload={handleSecondScreenshotUpload}
            customTitle={" "}
            customDescription={" "}
            customPlaceholderText={" "}
            customDragDropText={" "}
            className="w-full border"
            initialImage={secondaryImageUrl}
            {...props}
          />
        </div>
      </div>
    </div>
  );
}
