import React, { useId, useState, useEffect } from 'react';
import { NextButton } from '../../components/ui/next-button.jsx';
import { BackButton } from '../../components/ui/back-button.jsx';
import { CompanyLogoUpload } from './CompanyLogoUpload.jsx';
import { ProductImageUpload } from './ProductImageUpload.jsx';
import { AppScreenshotUpload } from './AppScreenshotUpload.jsx';
import { ProductTypeSelect } from './ProductTypeSelect.jsx';
import { MarketingMaterialUpload } from './MarketingMaterialUpload.jsx';
import { Input } from '../../components/ui/input.jsx';
import {
  ColorPicker,
  ColorPickerSelection,
  ColorPickerHue,
  ColorPickerAlpha,
  ColorPickerOutput,
  ColorPickerEyeDropper,
  ColorPickerFormat
} from '../../components/ui/color-picker.jsx';
import { InputWithTags } from '@/components/ui/input-with-tags';

/**
 * Step Two Component for the Create Ad Request flow
 * Handles image upload, color selection, and navigation
 */
const StepTwoComponent = ({ onComplete, initialData = {}, refreshData }) => {
  const websiteUrlId = useId();
  const [websiteUrl, setWebsiteUrl] = useState(initialData.websiteUrl || '');
  const [selectedColor, setSelectedColor] = useState(initialData.brandColor || '#3B82F6');
  const [productType, setProductType] = useState(initialData.productType || '');
  
  // Solo refrescar datos si es necesario (por ejemplo, al recargar la página directamente)
  // No hacemos la llamada automáticamente para evitar duplicación con handleStepComplete
  useEffect(() => {
    // Comprobamos si venimos de una recarga de página o navegación directa
    const isDirectNavigation = !document.referrer.includes(window.location.host);
    
    if (refreshData && initialData?.id && isDirectNavigation) {
      refreshData();
    }
  }, []);
  
  // Asegurar que el scroll esté al inicio de la página cuando el componente se monte
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);
  
  // Placeholder functions for navigation buttons
  const handleBack = () => {
    console.log('Back button clicked');
    // Navigation logic will be added later
  };

  const handleNext = () => {
    console.log('Next button clicked');
    
    // Ya no validamos que se haya seleccionado un tipo de producto, ya que no es obligatorio
    
    // Pass the data to the next step
    if (onComplete) {
      onComplete({ 
        websiteUrl, 
        brandColor: selectedColor,
        productType,
        // Add product images or app screenshots based on product type
        productImages: productType === 'physical' ? {} : undefined, // Will be populated with actual image data
        appScreenshots: productType === 'software' ? {} : undefined, // Will be populated with actual screenshot data
        marketingMaterials: {} // Will be populated with additional marketing images
      });
    }
  };

  // Handle logo image upload
  const handleLogoUpload = (url) => {
    console.log('Logo uploaded:', url);
    // Image processing logic will be added later
  };

  // Handle product image upload
  const handleProductImageUpload = (imageData) => {
    console.log('Product image uploaded:', imageData);
    // Store both primary and secondary product images
  };

  // Handle app screenshot upload
  const handleAppScreenshotUpload = (imageData) => {
    console.log('App screenshot uploaded:', imageData);
    // Store both primary and secondary screenshots
  };
  
  // Handle product type selection
  const handleProductTypeChange = (type) => {
    console.log('Product type selected:', type);
    setProductType(type);
  };
  
  // Handle marketing material uploads
  const handleMarketingMaterialUpload = (imageData) => {
    console.log('Marketing material uploaded:', imageData);
    // Store marketing materials images
  };

  // Handle website URL input change
  const handleWebsiteUrlChange = (e) => {
    setWebsiteUrl(e.target.value);
    console.log('Website URL updated:', e.target.value);
  };

  // Handle color change
  const handleColorChange = (rgbaArray) => {
    // Convert RGBA array to hex string
    const r = Math.round(rgbaArray[0]);
    const g = Math.round(rgbaArray[1]);
    const b = Math.round(rgbaArray[2]);
    const hexColor = `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
    
    // Solo actualizar y loguear si el color realmente cambió
    if (hexColor !== selectedColor) {
      setSelectedColor(hexColor);
      // Solo en entorno de desarrollo para evitar logs innecesarios
      if (process.env.NODE_ENV === 'development') {
        console.log('Brand color updated:', hexColor);
      }
    }
  };

  return (
    <div className="flex flex-col min-h-[80vh] space-y-8">
      {/* Main content area with company logo upload, website URL, and color picker */}
      <div className="flex-grow container mx-auto px-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Company Logo Upload - Takes 6/12 columns on large screens */}
          <div className="lg:col-span-6 flex flex-col gap-6">
            <div className="bg-card rounded-xl overflow-hidden">
              <CompanyLogoUpload 
                onUpload={handleLogoUpload} 
                className="h-full"
              />
            </div>
            {/* Key Benefits Input Section */}
            <div className="bg-card rounded-xl overflow-hidden p-6">
              <h3 className="text-sm font-medium mb-2">Key Benefits</h3>
              <p className="text-xs text-muted-foreground mb-3">Add up to 5 key benefits of your product or service</p>
              <InputWithTags limit={5} placeholder="E.g. Fast delivery, 24/7 support..." />
            </div>
          </div>
          {/* Form Fields Container - Takes 6/12 columns on large screens */}
          <div className="lg:col-span-6 space-y-6">
            <div className="bg-card p-6 rounded-xl overflow-hidden h-full">
              {/* Section Title */}
              <h3 className="text-lg font-medium mb-4">Campaign Details</h3>
              {/* Website URL input field */}
              <div className="group relative w-full mb-6">
                <label
                  htmlFor={websiteUrlId}
                  className="origin-start absolute top-1/2 block -translate-y-1/2 cursor-text px-1 text-sm text-muted-foreground/70 transition-all group-focus-within:pointer-events-none group-focus-within:top-0 group-focus-within:cursor-default group-focus-within:text-xs group-focus-within:font-medium group-focus-within:text-foreground has-[+input:not(:placeholder-shown)]:pointer-events-none has-[+input:not(:placeholder-shown)]:top-0 has-[+input:not(:placeholder-shown)]:cursor-default has-[+input:not(:placeholder-shown)]:text-xs has-[+input:not(:placeholder-shown)]:font-medium has-[+input:not(:placeholder-shown)]:text-foreground"
                >
                  <span className="inline-flex bg-card px-2">Website URL</span>
                </label>
                <Input 
                  id={websiteUrlId} 
                  type="url" 
                  placeholder="" 
                  value={websiteUrl}
                  onChange={handleWebsiteUrlChange}
                />
              </div>
                            {/* Color Picker */}
              <div className="w-full">
                <h3 className="text-sm font-medium mb-2">Brand Color</h3>
                <p className="text-xs text-muted-foreground mb-3">Choose a color that represents your brand identity</p>
                <ColorPicker 
                  className="w-full rounded-md border bg-card p-4 shadow-sm" 
                  defaultValue={selectedColor}
                  onChange={handleColorChange}
                >
                  <ColorPickerSelection />
                  <div className="flex items-center gap-4 mt-4">
                    <ColorPickerEyeDropper />
                    <div className="w-full grid gap-1">
                      <ColorPickerHue />
                      <ColorPickerAlpha />
                    </div>
                  </div>
                  <div className="flex items-center gap-2 mt-4">
                    <ColorPickerOutput />
                    <ColorPickerFormat />
                  </div>
                </ColorPicker>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Navigation buttons at the bottom */}
      {/* Product Type Selection */}
      <div className="container mx-auto px-4 mb-8">
        <ProductTypeSelect 
          value={productType}
          onChange={handleProductTypeChange}
        />
      </div>
      
      {/* Conditional rendering based on product type */}
      {productType === 'physical' && (
        <div className="container mx-auto px-4 mb-8">
          <div className="bg-card rounded-xl overflow-hidden">
            <ProductImageUpload 
              onUpload={handleProductImageUpload}
            />
          </div>
        </div>
      )}
      
      {productType === 'software' && (
        <div className="container mx-auto px-4">
          <div className="bg-card rounded-xl overflow-hidden">
            <AppScreenshotUpload 
              onUpload={handleAppScreenshotUpload}
            />
          </div>
        </div>
      )}
      
      {/* Marketing Materials Section - Always visible */}
      <div className="container mx-auto px-4 my-8">
        <div className="bg-card rounded-xl overflow-hidden">
          <MarketingMaterialUpload 
            onUpload={handleMarketingMaterialUpload}
          />
        </div>
      </div>
      
      {/* Navigation buttons at the bottom */}
      <div className="flex justify-center gap-4 pb-8">
        <BackButton 
          onClick={handleBack}
        />
        <NextButton 
          onClick={handleNext}
        />
      </div>
    </div>
  );
};

export default StepTwoComponent;
