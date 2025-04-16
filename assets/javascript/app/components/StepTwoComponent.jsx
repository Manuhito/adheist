import React, { useId, useState } from 'react';
import { NextButton } from '../../components/ui/next-button.jsx';
import { BackButton } from '../../components/ui/back-button.jsx';
import { CompanyLogoUpload } from './CompanyLogoUpload.jsx';
import { Input } from '../../components/ui/input.jsx';

/**
 * Step Two Component for the Create Ad Request flow
 * Handles image upload and navigation
 */
const StepTwoComponent = ({ onComplete, initialData = {} }) => {
  const websiteUrlId = useId();
  const [websiteUrl, setWebsiteUrl] = useState(initialData.websiteUrl || '');
  // Placeholder functions for navigation buttons
  const handleBack = () => {
    console.log('Back button clicked');
    // Navigation logic will be added later
  };

  const handleNext = () => {
    console.log('Next button clicked');
    // Pass both the image and website URL to the next step
    if (onComplete) {
      onComplete({ websiteUrl });
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

  return (
    <div className="flex flex-col min-h-[80vh] space-y-8">
      {/* Main content area with company logo upload and website URL */}
      <div className="flex-grow flex flex-col md:flex-row justify-center items-center gap-6 p-6">
        <CompanyLogoUpload 
          onUpload={handleImageUpload} 
          className="w-full max-w-xl"
        />
        
        {/* Website URL input field */}
        <div className="group relative w-full md:w-1/3 min-w-[300px]">
          <label
            htmlFor={websiteUrlId}
            className="origin-start absolute top-1/2 block -translate-y-1/2 cursor-text px-1 text-sm text-muted-foreground/70 transition-all group-focus-within:pointer-events-none group-focus-within:top-0 group-focus-within:cursor-default group-focus-within:text-xs group-focus-within:font-medium group-focus-within:text-foreground has-[+input:not(:placeholder-shown)]:pointer-events-none has-[+input:not(:placeholder-shown)]:top-0 has-[+input:not(:placeholder-shown)]:cursor-default has-[+input:not(:placeholder-shown)]:text-xs has-[+input:not(:placeholder-shown)]:font-medium has-[+input:not(:placeholder-shown)]:text-foreground"
          >
            <span className="inline-flex bg-background px-2">Website URL</span>
          </label>
          <Input 
            id={websiteUrlId} 
            type="url" 
            placeholder="" 
            value={websiteUrl}
            onChange={handleWebsiteUrlChange}
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
