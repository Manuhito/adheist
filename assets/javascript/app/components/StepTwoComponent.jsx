import React, { useId, useState } from 'react';
import { NextButton } from '../../components/ui/next-button.jsx';
import { BackButton } from '../../components/ui/back-button.jsx';
import { CompanyLogoUpload } from './CompanyLogoUpload.jsx';
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

/**
 * Step Two Component for the Create Ad Request flow
 * Handles image upload, color selection, and navigation
 */
const StepTwoComponent = ({ onComplete, initialData = {} }) => {
  const websiteUrlId = useId();
  const [websiteUrl, setWebsiteUrl] = useState(initialData.websiteUrl || '');
  const [selectedColor, setSelectedColor] = useState(initialData.brandColor || '#3B82F6');
  
  // Placeholder functions for navigation buttons
  const handleBack = () => {
    console.log('Back button clicked');
    // Navigation logic will be added later
  };

  const handleNext = () => {
    console.log('Next button clicked');
    // Pass the image, website URL, and selected color to the next step
    if (onComplete) {
      onComplete({ 
        websiteUrl, 
        brandColor: selectedColor 
      });
    }
  };

  // Placeholder function for image upload
  const handleImageUpload = (url) => {
    console.log('Image uploaded:', url);
    // Image processing logic will be added later
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
    setSelectedColor(hexColor);
    console.log('Brand color updated:', hexColor);
  };

  return (
    <div className="flex flex-col min-h-[80vh] space-y-8">
      {/* Main content area with company logo upload, website URL, and color picker */}
      <div className="flex-grow container mx-auto px-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Company Logo Upload - Takes 7/12 columns on large screens */}
          <div className="lg:col-span-7 bg-card rounded-xl overflow-hidden">
            <CompanyLogoUpload 
              onUpload={handleImageUpload} 
              className="h-full"
            />
          </div>
          
          {/* Form Fields Container - Takes 5/12 columns on large screens */}
          <div className="lg:col-span-5 space-y-6">
            <div className="bg-card p-6">
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
