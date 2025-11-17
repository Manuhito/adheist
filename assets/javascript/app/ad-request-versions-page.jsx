import React, { useState } from 'react';
import { createRoot } from 'react-dom/client';
import { Button } from '../components/ui/button.tsx';
import { ArrowLeft } from 'lucide-react';

// Ad Copy Text Display component with Read More/Less functionality
const AdCopyTextDisplay = ({ text }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const CHAR_LIMIT = 150;

  const shouldTruncate = text.length > CHAR_LIMIT;
  const displayText = isExpanded || !shouldTruncate
    ? text
    : text.substring(0, CHAR_LIMIT).trim();

  return (
    <div className="relative w-0 min-w-full">
      <p className="text-xs text-gray-600 dark:text-gray-400 whitespace-pre-wrap leading-relaxed break-words">
        {displayText}
        {shouldTruncate && !isExpanded && (
          <>
            ...{' '}
            <button
              onClick={(e) => {
                e.stopPropagation();
                setIsExpanded(true);
              }}
              className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 text-xs underline inline"
            >
              read more
            </button>
          </>
        )}
      </p>
      {shouldTruncate && isExpanded && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            setIsExpanded(false);
          }}
          className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 text-xs underline mt-1"
        >
          Read less
        </button>
      )}
    </div>
  );
};

// Version Card component
const VersionCard = ({ version, onClick }) => {
  return (
    <div
      onClick={() => onClick(version.id)}
      className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm cursor-pointer hover:shadow-md transition-shadow p-3"
    >
      {/* Ad Copy Text */}
      {version.ad_copy_text && (
        <div className="mb-2">
          <AdCopyTextDisplay text={version.ad_copy_text} />
        </div>
      )}

      {/* Image */}
      <div className="aspect-square rounded-lg overflow-hidden bg-gray-100 dark:bg-gray-700 flex items-center justify-center">
        {version.generated_image ? (
          <img
            src={version.generated_image}
            alt="Generated Ad"
            className="w-full h-full object-contain"
          />
        ) : (
          <div className="text-gray-400 dark:text-gray-500">No image</div>
        )}
      </div>
    </div>
  );
};

// Custom header component
const AdRequestVersionsHeader = ({ brandName, backUrl }) => {
  const handleContinueToLibrary = () => {
    window.location.href = '/ads/discover/';
  };

  const handleBack = () => {
    window.location.href = backUrl;
  };

  return (
    <div className="flex items-center justify-between w-full">
      <div className="flex items-center gap-4">
        <button
          onClick={handleBack}
          className="flex items-center justify-center w-10 h-10 bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 rounded-full transition-colors"
        >
          <ArrowLeft className="w-5 h-5 text-gray-600 dark:text-gray-400" />
        </button>
        <h1 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
          {brandName}
        </h1>
      </div>
      <Button
        onClick={handleContinueToLibrary}
        className="text-sm"
      >
        Continue to library
      </Button>
    </div>
  );
};

const AdRequestVersionsPage = () => {
  const data = window.__AD_REQUEST_VERSIONS_DATA__ || {};
  const versions = data.versions || [];

  // Debug logging
  console.log('=== AD REQUEST VERSIONS DEBUG ===');
  console.log('Full window.__AD_REQUEST_VERSIONS_DATA__:', window.__AD_REQUEST_VERSIONS_DATA__);
  console.log('data:', data);
  console.log('versions:', versions);
  console.log('versions type:', typeof versions);
  console.log('versions length:', versions.length);
  console.log('versions is array:', Array.isArray(versions));
  console.log('=================================');

  // Set custom header when component mounts
  React.useEffect(() => {
    if (window.setAppHeader) {
      const brandName = data.brand_name || 'Ad Versions';
      const backUrl = data.back_url || '/ads/my-ads/';
      window.setAppHeader(<AdRequestVersionsHeader brandName={brandName} backUrl={backUrl} />);
    }

    // Cleanup header when component unmounts
    return () => {
      if (window.clearAppHeader) {
        window.clearAppHeader();
      }
    };
  }, [data.brand_name, data.back_url]);

  const handleVersionClick = (versionId) => {
    window.location.href = `/ads/generated/${versionId}/`;
  };

  return (
    <div className="max-w-7xl mx-auto p-6">
      {/* Grid of version cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
        {versions.map((version) => (
          <VersionCard
            key={version.id}
            version={version}
            onClick={handleVersionClick}
          />
        ))}
      </div>

      {/* Empty state */}
      {versions.length === 0 && (
        <div className="mt-12 text-center">
          <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
            No versions available
          </h3>
          <p className="text-gray-500 dark:text-gray-400">
            This ad request doesn't have any primary versions yet.
          </p>
        </div>
      )}
    </div>
  );
};

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  // Wait for sidebar layout to be ready
  const checkSidebarReady = () => {
    if (window.sidebarLayoutReady) {
      const container = document.getElementById('sidebar-page-content');
      if (container) {
        const root = createRoot(container);
        root.render(<AdRequestVersionsPage />);
      }
    } else {
      setTimeout(checkSidebarReady, 50);
    }
  };

  checkSidebarReady();
});

export default AdRequestVersionsPage;
