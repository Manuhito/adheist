import React, { useState } from 'react';
import { NextButton } from '../../components/ui/next-button.jsx';

/**
 * Step Three Component for the Create Ad Request flow
 * Handles final submission of the ad request
 */
const StepThreeComponent = ({ onComplete, initialData = {} }) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const handleSubmit = async () => {
    setIsSubmitting(true);
    
    try {
      // Here you would submit the ad request for processing
      const formData = new FormData();
      formData.append('status', 'SUBMITTED');
      
      // Send POST request to update ad request
      const response = await fetch(`/ads/adrequest/${initialData.id}/update/`, {
        method: 'POST',
        body: formData,
        headers: {
          'X-CSRFToken': getCsrfToken(),
        },
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to submit ad request');
      }
      
      // Call the onComplete callback with the updated data
      if (onComplete) {
        onComplete({
          ...initialData,
          status: 'SUBMITTED'
        });
      }
      
      // Redirect to the ad requests list page
      window.location.href = '/ads/';
      
    } catch (error) {
      console.error('Error submitting ad request:', error);
    } finally {
      setIsSubmitting(false);
    }
  };
  
  // Function to get CSRF token from cookies
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

  return (
    <div className="space-y-8">
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-xl font-semibold mb-4">Step 3: Review and Submit</h2>
        <p className="text-gray-600 mb-4">
          This is the final step of the ad request creation process.
          Review your ad details before submitting.
        </p>
        
        {/* Summary of the ad request */}
        <div className="bg-gray-50 p-4 rounded-md mb-6">
          <h3 className="font-medium text-gray-900 mb-2">Ad Request Summary</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-gray-500">Ad Library</p>
              <p className="font-medium">{initialData.ad_library_name || 'Not specified'}</p>
            </div>
            
            <div>
              <p className="text-sm text-gray-500">Canvas Size</p>
              <p className="font-medium">{initialData.canvas_size || 'Not specified'}</p>
            </div>
            
            {/* Additional fields would be displayed here */}
            <div>
              <p className="text-sm text-gray-500">Status</p>
              <p className="font-medium">{initialData.status || 'FILLED'}</p>
            </div>
            
            <div>
              <p className="text-sm text-gray-500">Created At</p>
              <p className="font-medium">
                {initialData.created_at 
                  ? new Date(initialData.created_at).toLocaleString() 
                  : 'Not available'}
              </p>
            </div>
          </div>
        </div>
        
        <div className="bg-blue-50 border-l-4 border-blue-400 p-4 mb-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-blue-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm text-blue-700">
                Once submitted, your ad request will be processed. This may take a few minutes.
              </p>
            </div>
          </div>
        </div>
      </div>
      
      <div className="flex justify-end">
        <NextButton 
          onClick={handleSubmit}
          isLoading={isSubmitting}
          text="Submit Ad Request"
        />
      </div>
    </div>
  );
};

export default StepThreeComponent;
