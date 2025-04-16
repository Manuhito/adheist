import React from 'react';
import { NextButton } from '../../components/ui/next-button.jsx';
import { BackButton } from '../../components/ui/back-button.jsx';
import { CompanyLogoUpload } from './CompanyLogoUpload.jsx';

/**
 * Step Two Component for the Create Ad Request flow
 * Handles image upload and navigation
 */
const StepTwoComponent = ({ onComplete, initialData = {} }) => {
  // Placeholder functions for navigation buttons
  const handleBack = () => {
    console.log('Back button clicked');
    // Navigation logic will be added later
  };

  const handleNext = () => {
    console.log('Next button clicked');
    // Navigation logic will be added later
  };

  // Placeholder function for image upload
  const handleImageUpload = (url) => {
    console.log('Image uploaded:', url);
    // Image processing logic will be added later
  };

  return (
    <div className="flex flex-col min-h-[80vh] space-y-8">
      {/* Main content area with company logo upload */}
      <div className="flex-grow flex justify-center items-center p-6">
        <CompanyLogoUpload 
          onUpload={handleImageUpload} 
          className="w-full max-w-xl"
        />
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
