import React from "react";
import { ImageUpload } from "../../components/ui/image-upload";
import { cn } from "@/lib/utils";

/**
 * Custom component for company logo uploads
 * Extends the base ImageUpload component with specific text and styling for company logos
 */
export function CompanyLogoUpload({ onUpload, className, ...props }) {
  return (
    <div className={cn("space-y-4", className)}>
      
      <ImageUpload 
        onUpload={onUpload}
        customTitle="Company Logo"
        customDescription="Upload a high-quality logo (PNG or SVG preferred)"
        customPlaceholderText="Add your company logo"
        className="border-primary/20"
        {...props}
      />
    </div>
  );
}
