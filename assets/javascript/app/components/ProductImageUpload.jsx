import React, { useEffect, useState } from "react";
import { ImageUpload } from "../../components/ui/image-upload";
import { cn } from "../../lib/utils";
import { useTranslation } from "../../lib/useTranslation";

/**
 * Component for product image uploads
 * Provides two image upload fields for different views of a physical product
 * Can be preloaded with initial image data
 */
export function ProductImageUpload({ onUpload, className, initialData, ...props }) {
  const { t } = useTranslation();
  
  // State for image URLs to enable updates when initialData changes
  const [primaryImageUrl, setPrimaryImageUrl] = useState(initialData?.product_image_1_override || null);
  const [secondaryImageUrl, setSecondaryImageUrl] = useState(initialData?.product_image_2_override || null);
  
  // Update state when initialData changes (e.g., after brand change)
  useEffect(() => {
    console.log('ProductImageUpload: initialData changed', initialData);
    setPrimaryImageUrl(initialData?.product_image_1_override || null);
    setSecondaryImageUrl(initialData?.product_image_2_override || null);
  }, [initialData]);
  
  // Handle uploads for each image separately
  const handleFirstImageUpload = (url) => {
    onUpload?.({ type: 'primary', url });
  };

  const handleSecondImageUpload = (url) => {
    onUpload?.({ type: 'secondary', url });
  };

  return (
    <div className={cn("w-full h-full flex flex-col p-6", className)}>
      <div className="w-full">
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <ImageUpload 
            onUpload={handleFirstImageUpload}
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
            onUpload={handleSecondImageUpload}
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
