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
  Plus
} from 'lucide-react';

function AdRequestCard({ adRequest }) {
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

  const getCompletedVersions = () => {
    return adRequest.versions.filter(v => v.status === 'COMPLETED');
  };

  const completedVersions = getCompletedVersions();
  const firstCompletedVersion = completedVersions.length > 0 ? completedVersions[0] : null;

  return (
    <Card 
      className="hover:shadow-md transition-shadow cursor-pointer rounded-xl"
      onClick={() => window.location.href = `/ads/${adRequest.id}/details/`}
    >
      <CardContent className="p-4">
        <div className="space-y-3">
          {/* Header - Brand name + Status */}
          <div className="flex items-center justify-between">
            <h3 className="font-medium text-gray-900 truncate">
              {adRequest.brand_name || adRequest.ad_library_name || `Ad Request #${adRequest.id}`}
            </h3>
            <Badge className={getStatusColor(adRequest.status)}>
              {adRequest.status}
            </Badge>
          </div>

          {/* Large Centered Image */}
          <div className="aspect-square rounded-lg overflow-hidden bg-gray-100 flex items-center justify-center">
            {firstCompletedVersion && firstCompletedVersion.image_url ? (
              <img
                src={firstCompletedVersion.image_url}
                alt="Ad preview"
                className="w-full h-full object-cover"
              />
            ) : (
              <ImageIcon className="w-12 h-12 text-gray-400" />
            )}
          </div>

          {/* Footer - Creation date */}
          <div className="text-center">
            <p className="text-sm text-gray-500">
              Created {formatDate(adRequest.created_at)}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function AdRequestListItem({ adRequest }) {
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

  const completedVersions = adRequest.versions.filter(v => v.status === 'COMPLETED');

  return (
    <Card className="hover:shadow-md transition-shadow cursor-pointer rounded-xl">
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4 flex-1">
            {/* Thumbnail */}
            <div className="w-16 h-16 rounded-lg bg-gray-100 flex items-center justify-center overflow-hidden flex-shrink-0">
              {completedVersions.length > 0 && completedVersions[0].image_url ? (
                <img 
                  src={completedVersions[0].image_url} 
                  alt="Ad preview"
                  className="w-full h-full object-cover"
                />
              ) : (
                <Zap className="w-6 h-6 text-gray-400" />
              )}
            </div>
            
            {/* Ad Info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <p className="text-sm font-medium text-gray-900 truncate">
                  {adRequest.brand_name || adRequest.ad_library_name || `Ad Request #${adRequest.id}`}
                </p>
                <Badge className={getStatusColor(adRequest.status)}>
                  {adRequest.status}
                </Badge>
              </div>
              <p className="text-xs text-gray-500 truncate">
                {adRequest.canvas_size} • {adRequest.versions_count} versions • {formatDate(adRequest.created_at)}
              </p>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2 flex-shrink-0">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => window.location.href = `/ads/${adRequest.id}/details/`}
              className="text-primary hover:text-primary/80"
            >
              View Details
            </Button>
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
  const myAds = myAdsData.myAds || [];
  
  // Search state
  const [searchQuery, setSearchQuery] = useState('');
  
  // View mode state
  const [viewMode, setViewMode] = useState('grid'); // 'grid' or 'list'

  // Set header content when component mounts
  React.useEffect(() => {
    if (window.setAppHeader) {
      const headerComponent = (
        <div className="flex items-center justify-between w-full">
          <div>
            <h1 className="text-xl font-bold text-primary">
              My Ads
            </h1>
            <p className="text-sm text-gray-600">
              All your ad requests and generated versions
            </p>
          </div>
          <Button 
            onClick={() => window.location.href = '/ads/discover/'}
            className="bg-primary hover:bg-primary/90 text-white"
          >
            <Plus className="w-4 h-4 mr-2" />
            Create New Ad
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

  // Filter ads based on search query
  const filteredAds = useMemo(() => {
    if (!searchQuery.trim()) {
      return myAds;
    }
    
    return myAds.filter(ad => {
      const searchTerm = searchQuery.toLowerCase().trim();
      return (
        (ad.brand_name && ad.brand_name.toLowerCase().includes(searchTerm)) ||
        (ad.ad_library_name && ad.ad_library_name.toLowerCase().includes(searchTerm)) ||
        ad.id.toString().includes(searchTerm) ||
        ad.canvas_size.toLowerCase().includes(searchTerm)
      );
    });
  }, [myAds, searchQuery]);


  return (
    <div className="max-w-7xl mx-auto p-6">
      {/* Search Bar and View Toggle */}
      <div className="mb-6 flex items-center justify-between gap-4">
        {/* Search Bar */}
        <div className="relative flex-1 max-w-lg">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search className="h-4 w-4 text-gray-400" />
          </div>
          <Input
            type="text"
            placeholder="Search ads..."
            value={searchQuery}
            onChange={handleSearchChange}
            className="pl-10 bg-white border-gray-200 focus:border-gray-300 focus:ring-gray-200"
          />
        </div>

        {/* View Mode Toggle */}
        <div className="flex items-center space-x-1 bg-gray-100 rounded-lg p-1 flex-shrink-0">
          <button
            onClick={() => setViewMode('grid')}
            className={`p-2 rounded-md transition-colors ${
              viewMode === 'grid'
                ? 'bg-white text-primary shadow-sm'
                : 'text-gray-500 hover:text-primary'
            }`}
            title="Grid view"
          >
            <Grid3x3 className="h-4 w-4" />
          </button>
          <button
            onClick={() => setViewMode('list')}
            className={`p-2 rounded-md transition-colors ${
              viewMode === 'list'
                ? 'bg-white text-primary shadow-sm'
                : 'text-gray-500 hover:text-primary'
            }`}
            title="List view"
          >
            <List className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Ads Container */}
      {viewMode === 'grid' ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {filteredAds.map((adRequest) => (
            <AdRequestCard key={adRequest.id} adRequest={adRequest} />
          ))}
        </div>
      ) : (
        <div className="space-y-3">
          {filteredAds.map((adRequest) => (
            <AdRequestListItem key={adRequest.id} adRequest={adRequest} />
          ))}
        </div>
      )}

      {/* Empty State - No ads at all */}
      {myAds.length === 0 && (
        <div className="mt-12 text-center">
          <Zap className="mx-auto h-12 w-12 text-gray-400 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            No ads yet
          </h3>
          <p className="text-gray-500 mb-6">
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
      {myAds.length > 0 && filteredAds.length === 0 && searchQuery.trim() && (
        <div className="mt-12 text-center">
          <Search className="mx-auto h-12 w-12 text-gray-400 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            No ads found
          </h3>
          <p className="text-gray-500">
            No ads match your search for "{searchQuery}". Try a different search term.
          </p>
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
