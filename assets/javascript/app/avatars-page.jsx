import React, { useState, useEffect, useRef, useCallback } from 'react';
import { createRoot } from 'react-dom/client';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { X, Download, ExternalLink, User } from "lucide-react";

const AvatarsPage = () => {
  const [photos, setPhotos] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [totalPhotos, setTotalPhotos] = useState(0);
  const [selectedPhoto, setSelectedPhoto] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  const observer = useRef();
  const lastPhotoRef = useCallback(node => {
    if (loading) return;
    if (observer.current) observer.current.disconnect();
    
    observer.current = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting && hasMore) {
        setPage(prevPage => prevPage + 1);
      }
    });
    
    if (node) observer.current.observe(node);
  }, [loading, hasMore]);

  const fetchPhotos = async (pageNum) => {
    if (loading) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch(`/ads/api/unsplash-portraits/?page=${pageNum}&per_page=30`);
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch photos');
      }
      
      setPhotos(prev => pageNum === 1 ? data.photos : [...prev, ...data.photos]);
      setTotalPhotos(data.total);
      setHasMore(pageNum < data.total_pages);
    } catch (err) {
      setError(err.message);
      console.error('Error fetching photos:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPhotos(page);
  }, [page]);

  const handlePhotoClick = (photo) => {
    setSelectedPhoto(photo);
    setIsModalOpen(true);
  };

  const handleUseAvatar = async () => {
    try {
      // Get CSRF token
      const getCookie = (name) => {
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
      
      const csrftoken = getCookie('csrftoken');
      
      // Create UGC Video with selected avatar
      const response = await fetch('/ads/api/create-ugc-video/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRFToken': csrftoken,
        },
        body: JSON.stringify({
          avatar_data: selectedPhoto
        })
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to create UGC video');
      }
      
      // Redirect to UGC video page
      window.location.href = data.redirect_url;
      
    } catch (err) {
      console.error('Error creating UGC video:', err);
      setError(err.message);
      setIsModalOpen(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4">
        <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">
          Avatar Gallery
        </h1>
        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
          {totalPhotos > 0 ? `${totalPhotos.toLocaleString()} portrait photos available` : 'Loading photos...'}
        </p>
      </div>

      {/* Content */}
      <div className="p-6">
        {error && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 mb-6">
            <p className="text-red-800 dark:text-red-200 text-sm">
              {error}
            </p>
          </div>
        )}

        {/* Photo Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
          {photos.map((photo, index) => {
            const isLastPhoto = photos.length === index + 1;
            
            return (
              <div
                key={photo.id}
                ref={isLastPhoto ? lastPhotoRef : null}
                className="group relative aspect-[3/4] bg-gray-200 dark:bg-gray-700 rounded-lg overflow-hidden cursor-pointer hover:ring-2 hover:ring-blue-500 transition-all"
                onClick={() => handlePhotoClick(photo)}
              >
                <img
                  src={photo.urls.small}
                  alt={photo.alt_description}
                  className="w-full h-full object-cover"
                  loading="lazy"
                />
                
                {/* Overlay on hover */}
                <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-40 transition-all duration-200 flex items-end p-3">
                  <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-200 w-full">
                    <p className="text-white text-xs font-medium truncate">
                      Photo by {photo.user.name}
                    </p>
                    <p className="text-white text-xs opacity-75 truncate">
                      @{photo.user.username}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Loading indicator */}
        {loading && (
          <div className="flex justify-center items-center py-8">
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
              <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
              <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
            </div>
          </div>
        )}

        {/* No more photos message */}
        {!hasMore && photos.length > 0 && (
          <div className="text-center py-8">
            <p className="text-gray-600 dark:text-gray-400 text-sm">
              You've reached the end of the gallery
            </p>
          </div>
        )}

        {/* Empty state */}
        {!loading && photos.length === 0 && !error && (
          <div className="text-center py-12">
            <p className="text-gray-600 dark:text-gray-400">
              No photos found
            </p>
          </div>
        )}
      </div>

      {/* Photo Detail Modal */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-5xl p-0 gap-0">
          {selectedPhoto && (
            <div className="flex flex-col md:flex-row max-h-[85vh]">
              {/* Image Preview - Left Side */}
              <div className="flex-1 bg-gray-100 dark:bg-gray-800 flex items-center justify-center p-4 md:p-6">
                <img
                  src={selectedPhoto.urls.regular}
                  alt={selectedPhoto.alt_description}
                  className="max-h-[75vh] w-auto object-contain rounded-lg"
                />
              </div>

              {/* Photo Information - Right Side */}
              <div className="w-full md:w-80 flex flex-col p-6 space-y-4">
                {/* Description */}
                {selectedPhoto.alt_description && (
                  <div>
                    <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Description
                    </h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {selectedPhoto.alt_description}
                    </p>
                  </div>
                )}

                {/* Dimensions */}
                <div>
                  <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Dimensions
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {selectedPhoto.width} × {selectedPhoto.height} pixels
                  </p>
                </div>

                {/* Photographer */}
                <div>
                  <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Photographer
                  </h3>
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4 text-gray-500" />
                    <a
                      href={selectedPhoto.user.profile_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
                    >
                      {selectedPhoto.user.name}
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  </div>
                </div>

                {/* Spacer to push button to bottom */}
                <div className="flex-1"></div>

                {/* Action Button */}
                <Button
                  onClick={handleUseAvatar}
                  className="w-full"
                  size="lg"
                >
                  Use this avatar
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

// Mount the component when the page loads
document.addEventListener('DOMContentLoaded', () => {
  const mountComponent = () => {
    const container = document.getElementById('sidebar-page-content');
    if (container) {
      const root = createRoot(container);
      root.render(<AvatarsPage />);
    }
  };

  // Wait for sidebar layout to be ready
  if (window.sidebarLayoutReady) {
    mountComponent();
  } else {
    // Poll for sidebar layout to be ready
    const checkInterval = setInterval(() => {
      if (window.sidebarLayoutReady) {
        clearInterval(checkInterval);
        mountComponent();
      }
    }, 50);
    
    // Timeout after 5 seconds
    setTimeout(() => {
      clearInterval(checkInterval);
      console.error('Sidebar layout did not become ready in time');
    }, 5000);
  }
});

export default AvatarsPage;
