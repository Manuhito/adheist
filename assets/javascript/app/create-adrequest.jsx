import React, { useState, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import StepOneComponent from './components/StepOneComponent';
import StepTwoComponent from './components/StepTwoComponent';
import StepThreeComponent from './components/StepThreeComponent';

/**
 * Main container component for the Create Ad Request flow
 * Handles conditional rendering of different steps based on status
 */
const CreateAdRequestApp = () => {
  // Get initial data from the DOM
  const getInitialData = () => {
    try {
      // Check if we have adrequest data in the page
      const dataElement = document.getElementById('adrequest-data');
      if (dataElement) {
        return JSON.parse(dataElement.textContent);
      }
      
      // If no data element, check for data attributes
      const container = document.getElementById('create-adrequest-app');
      const adRequestId = container?.dataset?.adRequestId;
      const status = container?.dataset?.status || 'NEW';
      
      return { id: adRequestId, status };
    } catch (error) {
      console.error('Error parsing initial data:', error);
      return { status: 'NEW' };
    }
  };
  
  // Initialize state with data from the DOM
  const [adRequestData, setAdRequestData] = useState(getInitialData());

  // Handle completion of a step
  const handleStepComplete = (updatedData) => {
    setAdRequestData(prevData => ({
      ...prevData,
      ...updatedData
    }));
  };

  // Determine which step to show based on status
  const renderCurrentStep = () => {
    const status = adRequestData.status || 'NEW';
    
    // Map status to step components
    switch (status) {
      case 'NEW':
        return (
          <StepOneComponent 
          onComplete={handleStepComplete} 
          initialData={adRequestData} 
          />
        );
      case 'DRAFT':
        return (
          <StepTwoComponent 
          onComplete={handleStepComplete} 
          initialData={adRequestData} 
          />
        );
      case 'FILLED':
        return (
          <StepThreeComponent 
            onComplete={handleStepComplete} 
            initialData={adRequestData} 
          />
        );
      default:
        return (
          <StepOneComponent 
            onComplete={handleStepComplete} 
            initialData={adRequestData} 
          />
        );
    }
  };

  // Log current status for debugging
  useEffect(() => {
    console.log('Current adRequestData:', adRequestData);
  }, [adRequestData]);

  // Helper function to get CSRF token from cookies
  const getCsrfToken = () => {
    const name = 'csrftoken';
    let cookieValue = null;
    if (document.cookie && document.cookie !== '') {
      const cookies = document.cookie.split(';');
      for (let i = 0; i < cookies.length; i++) {
        const cookie = cookies[i].trim();
        if (cookie.substring(0, name.length + 1) === (name + '=')) {
          cookieValue = decodeURIComponent(cookie.substring(name.length + 1));
          break;
        }
      }
    }
    return cookieValue;
  };

  // No additional configuration needed at this level

  return (
    <div className="space-y-8">
      {/* Progress indicator */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          {/* Step 1: Select Ad Style */}
          <div className="flex items-center">
            <div className={`rounded-full h-8 w-8 flex items-center justify-center ${adRequestData.status === 'NEW' ? 'bg-primary text-white' : 'bg-green-500 text-white'}`}>
              1
            </div>
            <div className="ml-2 text-sm font-medium">
              Select Ad Style
            </div>
          </div>
          <div className="flex-1 mx-4 h-1 bg-gray-200">
            <div className={`h-full ${adRequestData.status !== 'NEW' ? 'bg-green-500' : 'bg-gray-200'}`} style={{ width: adRequestData.status === 'NEW' ? '0%' : '100%' }}></div>
          </div>
          
          {/* Step 2: Configure Ad */}
          <div className="flex items-center">
            <div className={`rounded-full h-8 w-8 flex items-center justify-center ${adRequestData.status === 'DRAFT' ? 'bg-primary text-white' : (adRequestData.status === 'NEW' ? 'bg-gray-300 text-gray-600' : 'bg-green-500 text-white')}`}>
              2
            </div>
            <div className="ml-2 text-sm font-medium">
              Configure Ad
            </div>
          </div>
          <div className="flex-1 mx-4 h-1 bg-gray-200">
            <div className={`h-full ${adRequestData.status === 'FILLED' ? 'bg-green-500' : 'bg-gray-200'}`} style={{ width: adRequestData.status === 'FILLED' ? '100%' : '0%' }}></div>
          </div>
          
          {/* Step 3: Review & Submit */}
          <div className="flex items-center">
            <div className={`rounded-full h-8 w-8 flex items-center justify-center ${adRequestData.status === 'FILLED' ? 'bg-primary text-white' : 'bg-gray-300 text-gray-600'}`}>
              3
            </div>
            <div className="ml-2 text-sm font-medium">
              Review & Submit
            </div>
          </div>
        </div>
      </div>
      
      {/* Current step component */}
      {renderCurrentStep()}
    </div>
  );
};

/**
 * Mount the React application to the DOM when the document is loaded
 */
document.addEventListener('DOMContentLoaded', () => {
  const container = document.getElementById('create-adrequest-app');
  if (container) {
    // Get adrequest_id from data attribute if available
    const adRequestId = container.getAttribute('data-adrequest-id');
    const status = container.getAttribute('data-status') || 'NEW';
    
    // Set data attributes for the container
    if (adRequestId) {
      container.dataset.adRequestId = adRequestId;
    }
    if (status) {
      container.dataset.status = status;
    }
    
    const root = createRoot(container);
    root.render(<CreateAdRequestApp />);
  } else {
    console.error('Could not find mount point for Create Ad Request app');
  }
});
