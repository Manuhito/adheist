import React from "react";
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
  // Handle uploads for each image separately
  const handleFirstImageUpload = (url) => {
    onUpload?.({ type: 'primary', url });
  };

  const handleSecondImageUpload = (url) => {
    onUpload?.({ type: 'secondary', url });
  };
  
  // Extract initial image URLs from initialData if available
  const primaryImageUrl = initialData?.product_image_1_override || null;
  const secondaryImageUrl = initialData?.product_image_2_override || null;

  return (
    <div className={cn("w-full h-full flex flex-col p-6", className)}>
      <div className="w-full">
        <h3 className="text-lg font-medium mb-2">{t('product_image.title', 'Product Images')}</h3>
        <p className="text-sm text-muted-foreground mb-4">
          {t('product_image.upload_description', 'Upload high-quality images of your physical product to showcase in your ad')}
        </p>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <ImageUpload 
            onUpload={handleFirstImageUpload}
            customTitle={t('product_image.primary_product', 'Primary Product')}
            customDescription={t('product_image.front_view', 'Front view or main product shot')}
            customPlaceholderText={t('product_image.add_primary', 'Add primary image')}
            className="w-full border"
            initialImage={primaryImageUrl}
            {...props}
          />
          
          <ImageUpload 
            onUpload={handleSecondImageUpload}
            customTitle={t('product_image.secondary_product', 'Secondary Product')}
            customDescription={t('product_image.side_view', 'Side view or product in use')}
            customPlaceholderText={t('product_image.add_secondary', 'Add secondary image')}
            className="w-full border"
            initialImage={secondaryImageUrl}
            {...props}
          />
        </div>
      </div>
    </div>
  );
}
