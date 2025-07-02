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
      <div className="flex flex-col items-start gap-2">
        <h3 className="text-lg font-medium mb-2">{t('company_logo.title', 'Company Branding')}</h3>
        <ImageUpload 
          onUpload={onUpload}
          customTitle={t('company_logo.company_logo', 'Company Logo')}
          customDescription={t('company_logo.logo_description', 'Upload a high-quality logo (JPG, PNG or WebP only)')}
          customPlaceholderText={t('company_logo.add_logo', 'Add your company logo')}
          className="border"
          initialImage={initialImage}
          style={{ maxWidth: "250px", margin: 0 }}
          {...props}
        />
      </div>
    </div>
  );
}
