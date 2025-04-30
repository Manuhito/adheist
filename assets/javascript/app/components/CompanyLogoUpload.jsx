import React from "react";
import { ImageUpload } from "../../components/ui/image-upload";
import { cn } from "../../lib/utils";
import { useTranslation } from "../../lib/useTranslation";

/**
 * Custom component for company logo uploads
 * Extends the base ImageUpload component with specific text and styling for company logos
 * Responsive design that adapts to different screen sizes
 */
export function CompanyLogoUpload({ onUpload, className, initialImage, ...props }) {
  const { t } = useTranslation();
  return (
    <div className={cn("w-full h-full flex flex-col p-6", className)}>
      <div className="w-full">
        <h3 className="text-lg font-medium mb-2">{t('company_logo.title', 'Company Branding')}</h3>
        <p className="text-sm text-muted-foreground mb-4">
          {t('company_logo.upload_description', "Upload your company logo to enhance your ad campaign's brand identity")}
        </p>
        
        <ImageUpload 
          onUpload={onUpload}
          customTitle={t('company_logo.company_logo', 'Company Logo')}
          customDescription={t('company_logo.logo_description', 'Upload a high-quality logo (PNG or SVG preferred)')}
          customPlaceholderText={t('company_logo.add_logo', 'Add your company logo')}
          className="w-full border"
          initialImage={initialImage}
          {...props}
        />
      </div>
    </div>
  );
}
