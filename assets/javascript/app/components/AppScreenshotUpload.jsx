import React from "react";
import { ImageUpload } from "../../components/ui/image-upload";
import { cn } from "../../lib/utils";

/**
 * Component for app screenshot uploads
 * Provides two image upload fields for different views of a software product
 */
export function AppScreenshotUpload({ onUpload, className, ...props }) {
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
        <h3 className="text-lg font-medium mb-2">App Screenshots</h3>
        <p className="text-sm text-muted-foreground mb-4">
          Upload high-quality screenshots of your software to showcase its features
        </p>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <ImageUpload 
            onUpload={handleFirstScreenshotUpload}
            customTitle="Main Interface"
            customDescription="Main screen or dashboard view"
            customPlaceholderText="Add main screenshot"
            className="w-full border"
            {...props}
          />
          
          <ImageUpload 
            onUpload={handleSecondScreenshotUpload}
            customTitle="Feature Highlight"
            customDescription="Key feature or functionality in action"
            customPlaceholderText="Add feature screenshot"
            className="w-full border"
            {...props}
          />
        </div>
      </div>
    </div>
  );
}
