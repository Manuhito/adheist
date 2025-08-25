import React from "react";
import { Image } from "lucide-react";
import { cn } from "../../lib/utils";
import { LogoImageLibrarySelect } from "./LogoImageLibrarySelect";
import { useTranslation } from "../../lib/useTranslation";

/**
 * Component for displaying the logo image section
 * Has the same visual style as the Product Image section
 */
export function LogoImageSection({ className, onSelectImage, onDeleteImage, selectedImage }) {
  const { t } = useTranslation();

  return (
    <div className={cn("w-full bg-card p-6 rounded-xl min-w-[250px]", className)}>
      <div className="relative">
        <h3 className="text-lg font-medium">{t('company_logo.company_logo', 'Company Logo')}</h3>
        <p className="text-sm text-muted-foreground">
          {t('company_logo.logo_description', 'Upload a high-quality logo (JPG, PNG or WebP only)')}
        </p>        {/* Image Library Container */}
        <div className="flex flex-col rounded-lg border-2 border-border overflow-hidden min-w-[220px] mt-2">
          {/* Image selection section */}
          <div className="flex-grow">
            <LogoImageLibrarySelect
              onSelectImage={onSelectImage}
              onDeleteImage={onDeleteImage}
              selectedImage={selectedImage}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
