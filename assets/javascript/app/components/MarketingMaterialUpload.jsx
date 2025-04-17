import React from "react";
import { ImageUpload } from "../../components/ui/image-upload";
import { cn } from "../../lib/utils";

/**
 * Component for uploading additional marketing materials
 * Provides three image upload fields in a row for supplementary content
 */
export function MarketingMaterialUpload({ onUpload, className, ...props }) {
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
            {...props}
          />
          
          <ImageUpload 
            onUpload={handleSecondImageUpload}
            customTitle="Product in Use"
            customDescription="Show your product in action"
            customPlaceholderText="Add image"
            className="w-full border"
            {...props}
          />
          
          <ImageUpload 
            onUpload={handleThirdImageUpload}
            customTitle="Additional View"
            customDescription="Any other relevant image"
            customPlaceholderText="Add image"
            className="w-full border"
            {...props}
          />
        </div>
      </div>
    </div>
  );
}
