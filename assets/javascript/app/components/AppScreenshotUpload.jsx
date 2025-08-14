import React, { useEffect, useState } from "react";
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
  
  // State for image URLs to enable updates when initialData changes
  const [primaryImageUrl, setPrimaryImageUrl] = useState(initialData?.app_image_1_override || null);
  const [secondaryImageUrl, setSecondaryImageUrl] = useState(initialData?.app_image_2_override || null);
  
  // Update state when initialData changes (e.g., after brand change)
  useEffect(() => {
    console.log('AppScreenshotUpload: initialData changed', initialData);
    setPrimaryImageUrl(initialData?.app_image_1_override || null);
    setSecondaryImageUrl(initialData?.app_image_2_override || null);
  }, [initialData]);
  
  // Handle uploads for each screenshot separately
  const handleFirstScreenshotUpload = (url) => {
    onUpload?.({ type: 'primary', url });
  };

  const handleSecondScreenshotUpload = (url) => {
    onUpload?.({ type: 'secondary', url });
  };

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
            showFileInfo={false}
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
            showFileInfo={false}
            {...props}
          />
        </div>
      </div>
    </div>
  );
}
