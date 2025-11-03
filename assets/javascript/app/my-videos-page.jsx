import React, { useState, useMemo } from 'react';
import { createRoot } from 'react-dom/client';
import { Card, CardContent } from '@/components/ui/card.tsx';
import { Input } from '@/components/ui/input.tsx';
import { Badge } from '@/components/ui/badge.jsx';
import { Button } from '@/components/ui/button.tsx';
import {
  Sparkles,
  Search,
  Image as ImageIcon,
  Plus
} from 'lucide-react';

function VideoCard({ videoData }) {
  const getStatusColor = (status) => {
    switch (status) {
      case 'COMPLETE':
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
    // Navigate to UGC Video edit page
    window.location.href = `/ads/ugc-video/${videoData.id}/`;
  };

  return (
    <Card
      className="transition-colors rounded-xl bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer"
      onClick={handleCardClick}
    >
      <CardContent className="p-4">
        <div className="space-y-3">
          {/* Header - Status */}
          <div className="flex items-center justify-end">
            <Badge className={getStatusColor(videoData.status)}>
              {videoData.status}
            </Badge>
          </div>

          {/* Avatar Image Preview */}
          <div className="aspect-[3/4] rounded-lg overflow-hidden bg-gray-100 dark:bg-gray-700 flex items-center justify-center">
            {videoData.avatar_image_url ? (
              <img
                src={videoData.avatar_image_url}
                alt={videoData.alt_description || 'Avatar'}
                className="w-full h-full object-cover"
              />
            ) : (
              <ImageIcon className="w-12 h-12 text-gray-400 dark:text-gray-500" />
            )}
          </div>

          {/* Footer - Creation date */}
          <div className="text-left">
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {formatDate(videoData.created_at)}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function MyVideosHeader({ onCreateNew }) {
  return (
    <div className="flex items-center gap-4">
      {/* Title */}
      <div className="flex-1">
        <h1 className="text-xl font-semibold text-gray-900 dark:text-gray-100">My Videos</h1>
        <p className="text-sm text-gray-600 dark:text-gray-400">Manage your UGC videos</p>
      </div>

      {/* Create New Button */}
      <Button
        onClick={onCreateNew}
        className="bg-primary hover:bg-primary/90 text-white px-4 py-2 rounded-lg flex items-center gap-2"
      >
        UGC Video
      </Button>
    </div>
  );
}

function MyVideosPageContent() {
  const [searchQuery, setSearchQuery] = useState('');
  const myVideosData = window.__MY_VIDEOS_DATA__ || { myVideos: [] };
  const videos = myVideosData.myVideos || [];

  // Filter videos based on search query (searches in alt_description)
  const filteredVideos = useMemo(() => {
    if (!searchQuery.trim()) {
      return videos;
    }

    const query = searchQuery.toLowerCase();
    return videos.filter(video => {
      const altDescription = (video.alt_description || '').toLowerCase();
      return altDescription.includes(query);
    });
  }, [videos, searchQuery]);

  const handleCreateNew = () => {
    window.location.href = '/ads/avatars/';
  };

  return (
    <div className="max-w-7xl mx-auto p-6">
      {/* Search Bar */}
      <div className="mb-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
          <Input
            type="text"
            placeholder="Search by avatar description..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 w-full"
          />
        </div>
      </div>

      {/* Videos Grid */}
      {filteredVideos.length === 0 ? (
        <div className="text-center py-12">
          <Sparkles className="w-16 h-16 text-gray-400 dark:text-gray-500 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
            {searchQuery ? 'No videos found' : 'No videos yet'}
          </h3>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            {searchQuery
              ? 'Try adjusting your search query'
              : 'Create your first UGC video to get started'}
          </p>
          {!searchQuery && (
            <Button
              onClick={handleCreateNew}
              className="bg-primary hover:bg-primary/90 text-white"
            >
              <Plus className="w-4 h-4 mr-2" />
              Generate UGC Video
            </Button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredVideos.map((video) => (
            <VideoCard key={video.id} videoData={video} />
          ))}
        </div>
      )}
    </div>
  );
}

function mountPage() {
  if (window.sidebarLayoutReady) {
    window.setAppHeader(<MyVideosHeader onCreateNew={() => window.location.href = '/ads/avatars/'} />);
    const contentContainer = document.getElementById('sidebar-page-content');
    if (contentContainer) {
      createRoot(contentContainer).render(<MyVideosPageContent />);
    }
  } else {
    setTimeout(mountPage, 100);
  }
}

document.addEventListener('DOMContentLoaded', mountPage);
