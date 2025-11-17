import React, { useState, useMemo } from 'react';
import { createRoot } from 'react-dom/client';
import { Card, CardContent } from '@/components/ui/card.tsx';
import { Input } from '@/components/ui/input.tsx';
import { Badge } from '@/components/ui/badge.jsx';
import { Button } from '@/components/ui/button.tsx';
import {
  Zap,
  Search,
  Grid3x3,
  List,
  Calendar,
  Eye,
  Star,
  Image as ImageIcon,
  Plus,
  EllipsisVertical,
  Trash2
} from 'lucide-react';

function VersionCard({ versionData, onDeleteDraft }) {
  const [showDropdown, setShowDropdown] = useState(false);

  // Close dropdown when clicking outside
  React.useEffect(() => {
    const handleClickOutside = () => {
      if (showDropdown) {
        setShowDropdown(false);
      }
    };

    if (showDropdown) {
      document.addEventListener('click', handleClickOutside);
    }

    return () => {
      document.removeEventListener('click', handleClickOutside);
    };
  }, [showDropdown]);
  const getStatusColor = (status) => {
    switch (status) {
      case 'COMPLETED':
        return 'bg-green-100 text-green-800';
      case 'IN_PROGRESS':
        return 'bg-blue-100 text-blue-800';
      case 'DRAFT':
        return 'bg-gray-100 text-gray-800';
      case 'FAILED':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const handleCardClick = () => {
    if (versionData.version_id && versionData.version_status === 'COMPLETED') {
      // If has a completed version, go to ad request versions page
      window.location.href = `/ads/adrequest/${versionData.ad_request_id}/versions/`;
    } else if (versionData.ad_request_status === 'DRAFT') {
      // If it's a draft, go to discover clone page
      window.location.href = `/ads/discover/${versionData.ad_request_id}/create/`;
    }
    // No action for other states
  };

  // Determine the status to display and if the card is clickable
  const displayStatus = versionData.version_status || versionData.ad_request_status;
  const isClickable = (versionData.version_id && versionData.version_status === 'COMPLETED') ||
    (versionData.ad_request_status === 'DRAFT');

  return (
    <Card
      className={`transition-colors rounded-xl bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 ${isClickable
        ? 'hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer'
        : 'cursor-default'
        }`}
      onClick={isClickable ? handleCardClick : undefined}
    >
      <CardContent className="p-4">
        <div className="space-y-3">
          {/* Header - Brand name + Version Status */}
          <div className="flex items-center justify-between">
            <h3 className="text-gray-900 dark:text-gray-100 truncate">
              {versionData.brand_name || versionData.ad_library_name || `Ad Request #${versionData.ad_request_id}`}
            </h3>
            <div className="flex items-center gap-2">
              <Badge className={getStatusColor(displayStatus)}>
                {displayStatus}
              </Badge>
              {/* Dropdown menu for DRAFT cards */}
              {versionData.ad_request_status === 'DRAFT' && (
                <div className="relative">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowDropdown(!showDropdown);
                    }}
                    className="p-1 hover:bg-gray-100 dark:hover:bg-gray-600 rounded-full transition-colors"
                  >
                    <EllipsisVertical className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                  </button>
                  {showDropdown && (
                    <div className="absolute right-0 top-full mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md shadow-lg z-10 whitespace-nowrap">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setShowDropdown(false);
                          onDeleteDraft(versionData);
                        }}
                        className="flex items-center gap-2 w-full px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                        Delete Draft
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Large Centered Image */}
          <div className="aspect-square rounded-lg overflow-hidden bg-gray-100 dark:bg-gray-700 flex items-center justify-center">
            {versionData.image_url ? (
              <img
                src={versionData.image_url}
                alt="Ad version preview"
                className="w-full h-full object-cover"
              />
            ) : (
              <ImageIcon className="w-12 h-12 text-gray-400 dark:text-gray-500" />
            )}
          </div>

          {/* Footer - Creation date */}
          <div className="text-left">
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {formatDate(versionData.version_created_at || versionData.ad_request_created_at)}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function VersionListItem({ versionData, onDeleteDraft }) {
  const [showDropdown, setShowDropdown] = useState(false);

  // Close dropdown when clicking outside
  React.useEffect(() => {
    const handleClickOutside = () => {
      if (showDropdown) {
        setShowDropdown(false);
      }
    };

    if (showDropdown) {
      document.addEventListener('click', handleClickOutside);
    }

    return () => {
      document.removeEventListener('click', handleClickOutside);
    };
  }, [showDropdown]);
  const getStatusColor = (status) => {
    switch (status) {
      case 'COMPLETED':
        return 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300';
      case 'IN_PROGRESS':
        return 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300';
      case 'DRAFT':
        return 'bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-300';
      case 'FAILED':
        return 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300';
      default:
        return 'bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-300';
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const handleCardClick = () => {
    if (versionData.version_id && versionData.version_status === 'COMPLETED') {
      // If has a completed version, go to ad request versions page
      window.location.href = `/ads/adrequest/${versionData.ad_request_id}/versions/`;
    } else if (versionData.ad_request_status === 'DRAFT') {
      // If it's a draft, go to discover clone page
      window.location.href = `/ads/discover/${versionData.ad_request_id}/create/`;
    }
    // No action for other states
  };

  const handleViewDetailsClick = (e) => {
    e.stopPropagation(); // Prevent card click
    if (versionData.version_id && versionData.version_status === 'COMPLETED') {
      window.location.href = `/ads/adrequest/${versionData.ad_request_id}/versions/`;
    } else if (versionData.ad_request_status === 'DRAFT') {
      window.location.href = `/ads/discover/${versionData.ad_request_id}/create/`;
    } else {
      window.location.href = `/ads/${versionData.ad_request_id}/details/`;
    }
  };

  // Determine the status to display and if the card is clickable
  const displayStatus = versionData.version_status || versionData.ad_request_status;
  const isClickable = (versionData.version_id && versionData.version_status === 'COMPLETED') ||
    (versionData.ad_request_status === 'DRAFT');

  return (
    <Card
      className={`transition-shadow rounded-xl bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 ${isClickable
        ? 'hover:shadow-md cursor-pointer'
        : 'cursor-default'
        }`}
      onClick={isClickable ? handleCardClick : undefined}
    >
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4 flex-1">
            {/* Thumbnail */}
            <div className="w-16 h-16 rounded-lg bg-gray-100 dark:bg-gray-700 flex items-center justify-center overflow-hidden flex-shrink-0">
              {versionData.image_url ? (
                <img
                  src={versionData.image_url}
                  alt="Ad version preview"
                  className="w-full h-full object-cover"
                />
              ) : (
                <Zap className="w-6 h-6 text-gray-400 dark:text-gray-500" />
              )}
            </div>

            {/* Version Info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                  {versionData.brand_name || versionData.ad_library_name || `Ad Request #${versionData.ad_request_id}`}
                </p>
                <Badge className={getStatusColor(displayStatus)}>
                  {displayStatus}
                </Badge>
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                {versionData.canvas_size} •
                {versionData.ad_request_status === 'DRAFT' ? 'Draft' : (versionData.version_id ? `Version #${versionData.version_id}` : 'No versions')} •
                {formatDate(versionData.version_created_at || versionData.ad_request_created_at)}
              </p>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2 flex-shrink-0">
            {(displayStatus === 'COMPLETED' ||
              displayStatus === 'DRAFT' ||
              (!isClickable && displayStatus !== 'COMPLETED' && displayStatus !== 'DRAFT')) && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleViewDetailsClick}
                  className="text-primary hover:text-primary/80"
                >
                  {displayStatus === 'COMPLETED'
                    ? 'View Generated'
                    : displayStatus === 'DRAFT'
                      ? 'Edit Draft'
                      : 'View Details'}
                </Button>
              )}
            {/* Dropdown menu for DRAFT cards */}
            {versionData.ad_request_status === 'DRAFT' && (
              <div className="relative">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowDropdown(!showDropdown);
                  }}
                  className="p-1 hover:bg-gray-100 dark:hover:bg-gray-600 rounded-full transition-colors"
                >
                  <EllipsisVertical className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                </button>
                {showDropdown && (
                  <div className="absolute right-0 top-full mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md shadow-lg z-10 whitespace-nowrap">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setShowDropdown(false);
                        onDeleteDraft(versionData);
                      }}
                      className="flex items-center gap-2 w-full px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                      Delete Draft
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function MyAdsPage() {
  // Get data from window globals
  const myAdsData = window.__MY_ADS_DATA__ || {};
  const user = myAdsData.user || {};
  const [myVersions, setMyVersions] = useState(myAdsData.myAds || []); // Now this contains version data, not ad request data

  // Search state
  const [searchQuery, setSearchQuery] = useState('');

  // View mode state
  const [viewMode, setViewMode] = useState('grid'); // 'grid' or 'list'

  // Delete confirmation state
  const [showDeleteConfirmation, setShowDeleteConfirmation] = useState(false);
  const [adRequestToDelete, setAdRequestToDelete] = useState(null);

  // Set header content when component mounts
  React.useEffect(() => {
    if (window.setAppHeader) {
      const headerComponent = (
        <div className="flex items-center justify-between w-full">
          <div>
            <h1 className="text-xl font-bold text-primary">
              My Ads
            </h1>
            <p className="text-sm text-gray-600 dark:text-gray-300">
              All your ad requests and generated versions
            </p>
          </div>
          <Button
            onClick={() => window.location.href = '/ads/discover/'}
            className="bg-primary hover:bg-primary/90 text-white"
          >
            Generate Ad
          </Button>
        </div>
      );
      window.setAppHeader(headerComponent);
    }

    // Cleanup header when component unmounts
    return () => {
      if (window.clearAppHeader) {
        window.clearAppHeader();
      }
    };
  }, []);

  // Handle search input change
  const handleSearchChange = (e) => {
    setSearchQuery(e.target.value);
  };

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

  // Handle delete draft
  const handleDeleteDraft = (versionData) => {
    setAdRequestToDelete(versionData);
    setShowDeleteConfirmation(true);
  };

  // Confirm delete action
  const confirmDelete = async () => {
    if (!adRequestToDelete?.ad_request_id) {
      console.error('No ad request ID available');
      setShowDeleteConfirmation(false);
      return;
    }

    try {
      // Get CSRF token from cookies
      const csrfToken = getCsrfToken();

      // Track event in PostHog when user confirms ad request deletion
      if (window.posthog) {
        window.posthog.capture('Ad Request Deleted', {
          timestamp: new Date().toISOString(),
          ad_request_id: adRequestToDelete.ad_request_id,
          ad_request_status: adRequestToDelete.ad_request_status,
          source: 'my_ads_page'
        });
      }

      // Call the delete endpoint
      const response = await fetch(`/ads/adrequest/${adRequestToDelete.ad_request_id}/delete/`, {
        method: 'DELETE',
        headers: {
          'X-CSRFToken': csrfToken,
        }
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to delete ad request');
      }

      // Remove the deleted item from the list
      setMyVersions(prevVersions =>
        prevVersions.filter(version => version.ad_request_id !== adRequestToDelete.ad_request_id)
      );

      // Close the confirmation dialog
      setShowDeleteConfirmation(false);
      setAdRequestToDelete(null);

    } catch (error) {
      console.error('Error deleting ad request:', error);
      setShowDeleteConfirmation(false);
      setAdRequestToDelete(null);
    }
  };

  // Filter versions based on search query
  const filteredVersions = useMemo(() => {
    if (!searchQuery.trim()) {
      return myVersions;
    }

    return myVersions.filter(version => {
      const searchTerm = searchQuery.toLowerCase().trim();
      return (
        (version.brand_name && version.brand_name.toLowerCase().includes(searchTerm)) ||
        (version.ad_library_name && version.ad_library_name.toLowerCase().includes(searchTerm)) ||
        version.ad_request_id.toString().includes(searchTerm) ||
        (version.version_id && version.version_id.toString().includes(searchTerm)) ||
        (version.canvas_size && version.canvas_size.toLowerCase().includes(searchTerm)) ||
        (version.user_prompt && version.user_prompt.toLowerCase().includes(searchTerm))
      );
    });
  }, [myVersions, searchQuery]);


  return (
    <div className="max-w-7xl mx-auto p-6">
      {/* Search Bar and View Toggle */}
      <div className="mb-6 flex items-center justify-between gap-4">
        {/* Search Bar */}
        <div className="relative flex-1 max-w-lg">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search className="h-4 w-4 text-muted-foreground" />
          </div>
          <Input
            type="text"
            placeholder="Search ads..."
            value={searchQuery}
            onChange={handleSearchChange}
            className="pl-10"
          />
        </div>

        {/* View Mode Toggle */}
        <div className="flex items-center space-x-1 bg-muted rounded-lg p-1 flex-shrink-0">
          <button
            onClick={() => setViewMode('grid')}
            className={`p-2 rounded-md transition-colors ${viewMode === 'grid'
              ? 'bg-background text-primary shadow-sm'
              : 'text-muted-foreground hover:text-primary'
              }`}
            title="Grid view"
          >
            <Grid3x3 className="h-4 w-4" />
          </button>
          <button
            onClick={() => setViewMode('list')}
            className={`p-2 rounded-md transition-colors ${viewMode === 'list'
              ? 'bg-background text-primary shadow-sm'
              : 'text-muted-foreground hover:text-primary'
              }`}
            title="List view"
          >
            <List className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Versions Container */}
      {viewMode === 'grid' ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {filteredVersions.map((versionData) => (
            <VersionCard
              key={`adrequest-${versionData.ad_request_id}`}
              versionData={versionData}
              onDeleteDraft={handleDeleteDraft}
            />
          ))}
        </div>
      ) : (
        <div className="space-y-3">
          {filteredVersions.map((versionData) => (
            <VersionListItem
              key={`adrequest-${versionData.ad_request_id}`}
              versionData={versionData}
              onDeleteDraft={handleDeleteDraft}
            />
          ))}
        </div>
      )}

      {/* Empty State - No versions at all */}
      {myVersions.length === 0 && (
        <div className="mt-12 text-center">
          <Zap className="mx-auto h-12 w-12 text-gray-400 dark:text-gray-500 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
            No ads yet
          </h3>
          <p className="text-gray-500 dark:text-gray-400 mb-6">
            Create your first ad to get started with your campaigns.
          </p>
          <Button
            onClick={() => window.location.href = '/ads/discover/'}
            className="bg-primary hover:bg-primary/90 text-white"
          >
            <Plus className="w-4 h-4 mr-2" />
            Create Your First Ad
          </Button>
        </div>
      )}

      {/* No search results */}
      {myVersions.length > 0 && filteredVersions.length === 0 && searchQuery.trim() && (
        <div className="mt-12 text-center">
          <Search className="mx-auto h-12 w-12 text-gray-400 dark:text-gray-500 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
            No versions found
          </h3>
          <p className="text-gray-500 dark:text-gray-400">
            No ad versions match your search for "{searchQuery}". Try a different search term.
          </p>
        </div>
      )}

      {/* Delete confirmation modal */}
      {showDeleteConfirmation && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
          style={{ margin: 0 }}
          onClick={() => setShowDeleteConfirmation(false)} // Close on click outside
        >
          <div
            className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 max-w-md w-full mx-4"
            onClick={(e) => e.stopPropagation()} // Prevent closing when clicking inside modal
          >
            <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-gray-100">Delete Draft</h2>
            <p className="text-gray-600 dark:text-gray-300 mb-6">
              Are you sure you want to permanently delete this draft ad request? This action cannot be undone.
            </p>
            <div className="flex justify-end gap-3">
              <button
                type="button"
                className="px-4 py-2 text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-md transition-colors"
                onClick={() => setShowDeleteConfirmation(false)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="px-4 py-2 text-white bg-red-500 hover:bg-red-600 dark:bg-red-600 dark:hover:bg-red-700 rounded-md transition-colors"
                onClick={confirmDelete}
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Initialize the component when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  function checkAndMount() {
    if (window.sidebarLayoutReady) {
      const container = document.getElementById('sidebar-page-content');
      if (container) {
        const root = createRoot(container);
        root.render(<MyAdsPage />);
      }
    } else {
      // Wait for sidebar layout to be ready
      setTimeout(checkAndMount, 50);
    }
  }

  checkAndMount();
});

export default MyAdsPage;
