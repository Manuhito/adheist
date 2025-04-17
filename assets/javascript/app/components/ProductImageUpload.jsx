import React from "react";
import { ImageUpload } from "../../components/ui/image-upload";
import { cn } from "../../lib/utils";

/**
 * Component for product image uploads
 * Provides two image upload fields for different views of a physical product
 */
export function ProductImageUpload({ onUpload, className, ...props }) {
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
        <h3 className="text-lg font-medium mb-2">Product Images</h3>
        <p className="text-sm text-muted-foreground mb-4">
          Upload high-quality images of your physical product to showcase in your ad
        </p>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <ImageUpload 
            onUpload={handleFirstImageUpload}
            customTitle="Primary Product Image"
            customDescription="Front view or main product shot"
            customPlaceholderText="Add primary image"
            className="w-full border"
            {...props}
          />
          
          <ImageUpload 
            onUpload={handleSecondImageUpload}
            customTitle="Secondary Product Image"
            customDescription="Side view or product in use"
            customPlaceholderText="Add secondary image"
            className="w-full border"
            {...props}
          />
        </div>
      </div>
    </div>
  );
}
