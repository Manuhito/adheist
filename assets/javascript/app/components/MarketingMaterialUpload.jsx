import React from "react";
import { ImageUpload } from "../../components/ui/image-upload";
import { cn } from "../../lib/utils";

/**
 * Component for uploading additional marketing materials
 * Provides three image upload fields in a row for supplementary content
 * Can be preloaded with initial image data
 */
export function MarketingMaterialUpload({ onUpload, className, initialData, ...props }) {
  // Handle uploads for each image separately
  const handleFirstImageUpload = (url) => {
    onUpload?.({ position: 1, url });
  };

  const handleSecondImageUpload = (url) => {
    onUpload?.({ position: 2, url });
  };

  const handleThirdImageUpload = (url) => {
    onUpload?.({ position: 3, url });
  };
  
  // Extract initial image URLs from initialData if available
  const firstImageUrl = initialData?.marketing_image_1_override || null;
  const secondImageUrl = initialData?.marketing_image_2_override || null;
  const thirdImageUrl = initialData?.marketing_image_3_override || null;

  return (
    <div className={cn("w-full h-full flex flex-col p-6", className)}>
      <div className="w-full">
        <h3 className="text-lg font-medium mb-2">Additional Marketing Materials</h3>
        <p className="text-sm text-muted-foreground mb-4">
          Upload supplementary images to enhance your ad campaign (optional)
        </p>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <ImageUpload 
            onUpload={handleFirstImageUpload}
            customTitle="Testimonial"
            customDescription="Customer review or testimonial"
            customPlaceholderText="Add image"
            className="w-full border"
            initialImage={firstImageUrl}
            {...props}
          />
          
          <ImageUpload 
            onUpload={handleSecondImageUpload}
            customTitle="Product in Use"
            customDescription="Show your product in action"
            customPlaceholderText="Add image"
            className="w-full border"
            initialImage={secondImageUrl}
            {...props}
          />
          
          <ImageUpload 
            onUpload={handleThirdImageUpload}
            customTitle="Additional View"
            customDescription="Any other relevant image"
            customPlaceholderText="Add image"
            className="w-full border"
            initialImage={thirdImageUrl}
            {...props}
          />
        </div>
      </div>
    </div>
  );
}
