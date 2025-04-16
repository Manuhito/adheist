import React, { useState } from 'react';
import { GetStartedButton } from '../../components/ui/get-started-button.jsx';

/**
 * Step Two Component for the Create Ad Request flow
 * Handles additional configuration of the ad request
 */
const StepTwoComponent = ({ onComplete, initialData = {} }) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const handleContinue = async () => {
    setIsSubmitting(true);
    
    try {
      // Here you would update the ad request with new data
      const formData = new FormData();
      formData.append('status', 'FILLED');
      
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
        throw new Error(data.error || 'Failed to update ad request');
      }
      
      // Call the onComplete callback with the updated data
      if (onComplete) {
        onComplete({
          ...initialData,
          status: 'FILLED'
        });
      }
      
    } catch (error) {
      console.error('Error updating ad request:', error);
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
        <h2 className="text-xl font-semibold mb-4">Step 2: Configure Your Ad</h2>
        <p className="text-gray-600 mb-4">
          This is a placeholder for Step 2 of the ad request creation process.
          Here you would add forms and UI for configuring additional details of the ad.
        </p>
        
        {/* Example form fields would go here */}
        <div className="space-y-4">
          <div className="grid grid-cols-1 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Company Website
              </label>
              <input
                type="text"
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                placeholder="https://example.com"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Main Brand Color
              </label>
              <input
                type="text"
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                placeholder="#000000"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Key Benefits
              </label>
              <textarea
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                rows="4"
                placeholder="Enter the key benefits of your product or service"
              ></textarea>
            </div>
          </div>
        </div>
      </div>
      
      <div className="flex justify-end">
        <GetStartedButton 
          onClick={handleContinue}
          isLoading={isSubmitting}
          text="Continue to Next Step"
        />
      </div>
    </div>
  );
};

export default StepTwoComponent;
