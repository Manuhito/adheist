import React from 'react';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';

// Header component with back button, title and description
const DiscoverCloneHeader = () => {
  const pageConfig = window.__PAGE_CONFIG__ || {};

  const handleBackClick = () => {
    window.location.href = pageConfig.backUrl || '/ads/discover/';
  };

  return (
    <div className="flex items-center gap-4">
      {/* Back Button - Circular gray background */}
      <button
        onClick={handleBackClick}
        className="flex items-center justify-center w-10 h-10 bg-gray-100 hover:bg-gray-200 rounded-full transition-colors"
      >
        <ArrowLeft className="w-5 h-5 text-gray-600" />
      </button>

      {/* Title and Description */}
      <div className="flex flex-col">
        <h1 className="text-lg font-bold text-black">
          {pageConfig.title || 'Clone Ad'}
        </h1>
        <p className="text-sm text-gray-500">
          {pageConfig.description || 'New ads follow the style & composition of the ad reference on the left.'}
        </p>
      </div>
    </div>
  );
};

// Sidebar component with ad reference
const DiscoverCloneSidebar = () => {
  const adRequestData = window.__AD_REQUEST_DATA__ || {};

  return (
    <div className="p-6 space-y-6">
      {/* Ad Reference Preview */}
      {adRequestData.ad_library && (
        <div className="bg-gray-50 rounded-lg p-4">
          <h3 className="text-sm font-medium text-gray-900 mb-3">Reference Ad</h3>
          <div className="aspect-square bg-white rounded-md overflow-hidden border border-gray-200">
            <img
              src={adRequestData.ad_library.image_url}
              alt="Reference ad"
              className="w-full h-full object-cover"
            />
          </div>
          {adRequestData.ad_library.company_name && (
            <p className="text-xs text-gray-500 mt-2">
              {adRequestData.ad_library.company_name}
            </p>
          )}
        </div>
      )}
    </div>
  );
};

// Main page content
const DiscoverClonePageContent = () => {
  return (
    <div className="p-8">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8">
          <div className="text-center py-12">
            <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
            </div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">
              Ready to Create Your Ad
            </h2>
            <p className="text-gray-600 mb-6">
              Your ad request has been set up with the selected reference. Continue to customize your ad.
            </p>
            <Button
              onClick={() => window.location.href = '/ads/create/'}
              className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3"
            >
              Continue to Ad Creator
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

// Wait for sidebar layout to be ready, then mount components
function waitForSidebarLayout() {
  if (window.sidebarLayoutReady && window.setSidebarComponent && window.setAppHeader) {
    // Set the header component
    window.setAppHeader(React.createElement(DiscoverCloneHeader));

    // Set the sidebar component
    window.setSidebarComponent(React.createElement(DiscoverCloneSidebar));

    // Mount the main content
    const contentContainer = document.getElementById('sidebar-page-content');
    if (contentContainer && window.React && window.ReactDOM) {
      const root = ReactDOM.createRoot(contentContainer);
      root.render(React.createElement(DiscoverClonePageContent));
    }
  } else {
    // Retry after a short delay
    setTimeout(waitForSidebarLayout, 100);
  }
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', waitForSidebarLayout);

export default DiscoverClonePageContent;
