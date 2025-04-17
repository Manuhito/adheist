import React from "react";
import { ImageUpload } from "../../components/ui/image-upload";
import { cn } from "../../lib/utils";

/**
 * Custom component for company logo uploads
 * Extends the base ImageUpload component with specific text and styling for company logos
 * Responsive design that adapts to different screen sizes
 */
export function CompanyLogoUpload({ onUpload, className, ...props }) {
  return (
    <div className={cn("w-full h-full flex flex-col p-6", className)}>
      <div className="w-full">
        <h3 className="text-lg font-medium mb-2">Company Branding</h3>
        <p className="text-sm text-muted-foreground mb-4">
          Upload your company logo to enhance your ad campaign's brand identity
        </p>
        
        <ImageUpload 
          onUpload={onUpload}
          customTitle="Company Logo"
          customDescription="Upload a high-quality logo (PNG or SVG preferred)"
          customPlaceholderText="Add your company logo"
          className="w-full border"
          {...props}
        />
      </div>
    </div>
  );
}
