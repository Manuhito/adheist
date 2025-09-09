import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Check, Star, Trash2 } from 'lucide-react';
import { useTranslation } from '../../lib/useTranslation';
import { Switch } from '../ui/switch';

// Custom scrollbar styles
const scrollbarStyles = `
  .custom-scrollbar::-webkit-scrollbar {
    width: 8px;
  }
  .custom-scrollbar::-webkit-scrollbar-track {
    background: transparent;
  }
  .custom-scrollbar::-webkit-scrollbar-thumb {
    background-color: rgb(156 163 175);
    border-radius: 4px;
  }
  .custom-scrollbar::-webkit-scrollbar-thumb:hover {
    background-color: rgb(107 114 128);
  }
  @media (prefers-color-scheme: dark) {
    .custom-scrollbar::-webkit-scrollbar-thumb {
      background-color: rgb(75 85 99);
    }
    .custom-scrollbar::-webkit-scrollbar-thumb:hover {
      background-color: rgb(107 114 128);
    }
  }
  
  /* Global scrollbar styles for main page scroll */
  body::-webkit-scrollbar {
    width: 8px;
  }
  body::-webkit-scrollbar-track {
    background: transparent;
  }
  body::-webkit-scrollbar-thumb {
    background-color: rgb(156 163 175);
    border-radius: 4px;
  }
  body::-webkit-scrollbar-thumb:hover {
    background-color: rgb(107 114 128);
  }
  @media (prefers-color-scheme: dark) {
    body::-webkit-scrollbar-thumb {
      background-color: rgb(75 85 99);
    }
    body::-webkit-scrollbar-thumb:hover {
      background-color: rgb(107 114 128);
    }
  }
`;

// Inject styles into head
if (typeof document !== 'undefined') {
  const styleElement = document.createElement('style');
  styleElement.textContent = scrollbarStyles;
  document.head.appendChild(styleElement);
  
  // Apply Firefox scrollbar styles to body
  document.body.style.scrollbarWidth = 'thin';
  document.body.style.scrollbarColor = 'rgb(156 163 175) transparent';
}

/**
 * MediaItem component renders a card with company info, ad content, and image
 * Similar to GalleryModal but in card format without footer and close button
 */
const MediaItem = ({ item, className, onClick, isSelected, userPermissions = { isStaff: false }, onToggleFavorite, onDeactivateImage }) => {
    const { t } = useTranslation();
    const [isAdBodiesExpanded, setIsAdBodiesExpanded] = useState(false);
    
    // Determine if this item is marked as favorite
    const isFavorite = item.is_fav || false;
    // Check if user has permission to manage items
    const canManageItems = userPermissions.isStaff;

    // Handle star click to toggle favorite status
    const handleToggleFavorite = (e) => {
        e.stopPropagation(); // Prevent triggering the parent onClick
        e.preventDefault(); // Prevent default behavior
        console.log('Star icon clicked in MediaItem for item:', item);
        if (onToggleFavorite && typeof onToggleFavorite === 'function') {
            onToggleFavorite(item);
        } else {
            console.error('onToggleFavorite is not a function or is undefined');
        }
        return false; // Prevent event bubbling
    };

    // Handle trash click to deactivate image
    const handleDeactivateImage = (e) => {
        e.stopPropagation(); // Prevent triggering the parent onClick
        e.preventDefault(); // Prevent default behavior
        console.log('Trash icon clicked in MediaItem for item:', item);
        if (onDeactivateImage && typeof onDeactivateImage === 'function') {
            onDeactivateImage(item);
        } else {
            console.error('onDeactivateImage is not a function or is undefined');
        }
        return false; // Prevent event bubbling
    };

    return (
        <div className={`${className} bg-background rounded-xl overflow-hidden border border-border hover:border-primary/50 transition-colors cursor-pointer group`} onClick={onClick}>
            {/* Header */}
            <div className="p-3">
                <div className="flex items-center gap-3 flex-1 min-w-0">
                    {/* Avatar */}
                    <div className="w-8 h-8 rounded-full overflow-hidden bg-muted flex-shrink-0">
                        {item.page_url ? (
                            <img
                                src={`https://twenty-icons.com/${item.page_url.replace(/^https?:\/\//, '')}`}
                                alt={`${item.title} logo`}
                                className="w-full h-full object-cover"
                                onError={(e) => {
                                    // Fallback to a default avatar if the icon service fails
                                    e.target.style.display = 'none';
                                    e.target.parentNode.innerHTML = `<div class="w-full h-full bg-primary/10 flex items-center justify-center text-primary font-semibold text-xs">${item.title.charAt(0).toUpperCase()}</div>`;
                                }}
                            />
                        ) : (
                            <div className="w-full h-full bg-primary/10 flex items-center justify-center text-primary font-semibold text-xs">
                                {item.title.charAt(0).toUpperCase()}
                            </div>
                        )}
                    </div>
                    <h3 className="text-sm font-semibold break-words line-clamp-2 flex-1">{item.title}</h3>
                </div>

                {/* Ad Creative Bodies */}
                {item.ad_creative_bodies && (
                    <div className="mt-2">
                        <div className="relative w-0 min-w-full">
                            {!isAdBodiesExpanded && item.ad_creative_bodies.length > 80 ? (
                                <p className="text-xs text-foreground leading-relaxed break-words">
                                    {item.ad_creative_bodies.substring(0, 80)}...{' '}
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setIsAdBodiesExpanded(true);
                                        }}
                                        className="text-gray-500 hover:text-gray-700 text-xs underline inline"
                                    >
                                        {t('bento_gallery.read_more', 'read more')}
                                    </button>
                                </p>
                            ) : (
                                <div>
                                    <p className="text-xs text-foreground leading-relaxed break-words">
                                        {item.ad_creative_bodies}
                                    </p>
                                    {isAdBodiesExpanded && item.ad_creative_bodies.length > 80 && (
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setIsAdBodiesExpanded(false);
                                            }}
                                            className="text-gray-500 hover:text-gray-700 text-xs underline mt-1"
                                        >
                                            {t('bento_gallery.read_less', 'Read less')}
                                        </button>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>

            {/* Image Content */}
            <div className="relative aspect-square rounded-lg overflow-hidden mx-3">
                <img
                    src={item.url}
                    alt={item.title}
                    className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                    loading="lazy"
                    decoding="async"
                />
                
                {/* Selection indicator */}
                {isSelected && (
                    <div className="absolute inset-0 bg-primary/20 flex items-center justify-center">
                        <div className="bg-background rounded-full p-1">
                            <Check className="w-5 h-5 text-primary" />
                        </div>
                    </div>
                )}

                {/* Action icons - appear on hover only for staff users */}
                {canManageItems && (
                    <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300 z-10 flex space-x-2">
                        {/* Favorite star icon */}
                        <button
                            type="button"
                            className="cursor-pointer bg-transparent border-0 p-1 rounded-full hover:bg-gray-100/20"
                            onClick={handleToggleFavorite}
                            title={isFavorite ? "Remove from favorites" : "Add to favorites"}
                        >
                            <Star
                                className={`w-5 h-5 ${isFavorite ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300'}`}
                                strokeWidth={1.5}
                            />
                        </button>

                        {/* Delete trash icon */}
                        <button
                            type="button"
                            className="cursor-pointer bg-transparent border-0 p-1 rounded-full hover:bg-gray-100/20"
                            onClick={handleDeactivateImage}
                            title="Deactivate this image"
                        >
                            <Trash2
                                className="w-5 h-5 text-red-500 hover:text-red-600"
                                strokeWidth={1.5}
                            />
                        </button>
                    </div>
                )}

                {/* Gradient overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            </div>

            {/* Date Information */}
            <div className="p-3 pt-2">
                <div className="text-xs text-gray-500">
                    {item.ad_creation_time ? new Date(item.ad_creation_time).toLocaleDateString() : 'Unknown'} - {item.ad_delivery_stop_time ? new Date(item.ad_delivery_stop_time).toLocaleDateString() : 'Present'}
                </div>
            </div>
        </div>
    );
};

/**
 * GalleryModal component displays the selected media item in a modal
 * Includes company information and tags
 */
const GalleryModal = ({
    selectedItem,
    isOpen,
    onClose,
    onSelect,
    userPermissions = window.__USER_PERMISSIONS__ || { isStaff: false },
    onToggleFavorite,
    onDeactivateImage
}) => {
    const { t } = useTranslation();
    const [isAdBodiesExpanded, setIsAdBodiesExpanded] = useState(false);
    if (!isOpen) return null;

    // Determine if this item is marked as favorite
    const isFavorite = selectedItem?.is_fav || false;
    // Check if user has permission to manage items
    const canManageItems = userPermissions.isStaff;

    // Handle star click to toggle favorite status
    const handleToggleFavorite = (e) => {
        e.stopPropagation(); // Prevent triggering the parent onClick
        e.preventDefault(); // Prevent default behavior
        console.log('Star icon clicked in GalleryModal for item:', selectedItem);
        if (onToggleFavorite && typeof onToggleFavorite === 'function') {
            onToggleFavorite(selectedItem);
        } else {
            console.error('onToggleFavorite is not a function or is undefined');
        }
        return false; // Prevent event bubbling
    };

    // Handle trash click to deactivate image
    const handleDeactivateImage = (e) => {
        e.stopPropagation(); // Prevent triggering the parent onClick
        e.preventDefault(); // Prevent default behavior
        console.log('Trash icon clicked in GalleryModal for item:', selectedItem);
        if (onDeactivateImage && typeof onDeactivateImage === 'function') {
            onDeactivateImage(selectedItem);
            // Close the modal after deactivating the image
            onClose();
        } else {
            console.error('onDeactivateImage is not a function or is undefined');
        }
        return false; // Prevent event bubbling
    };

    const handleBackdropClick = (e) => {
        if (e.target === e.currentTarget) {
            onClose();
        }
    };

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
            onClick={handleBackdropClick}
        >
            <motion.div
                initial={{ scale: 0.95 }}
                animate={{ scale: 1 }}
                exit={{ scale: 0.95 }}
                className="bg-background rounded-xl overflow-hidden max-h-[90vh] max-w-6xl w-full shadow-2xl flex flex-col"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Simplified Header - only avatar, name and close button */}
                <div className="p-4 border-b border-border">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            {/* Avatar */}
                            <div className="w-10 h-10 rounded-full overflow-hidden bg-muted flex-shrink-0">
                                {selectedItem.page_url ? (
                                    <img
                                        src={`https://twenty-icons.com/${selectedItem.page_url.replace(/^https?:\/\//, '')}`}
                                        alt={`${selectedItem.title} logo`}
                                        className="w-full h-full object-cover"
                                        onError={(e) => {
                                            // Fallback to a default avatar if the icon service fails
                                            e.target.style.display = 'none';
                                            e.target.parentNode.innerHTML = `<div class="w-full h-full bg-primary/10 flex items-center justify-center text-primary font-semibold text-sm">${selectedItem.title.charAt(0).toUpperCase()}</div>`;
                                        }}
                                    />
                                ) : (
                                    <div className="w-full h-full bg-primary/10 flex items-center justify-center text-primary font-semibold text-sm">
                                        {selectedItem.title.charAt(0).toUpperCase()}
                                    </div>
                                )}
                            </div>
                            <h3 className="text-lg font-semibold break-words">{selectedItem.title}</h3>
                        </div>
                        <button
                            onClick={onClose}
                            className="p-1 rounded-full hover:bg-accent flex-shrink-0"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </div>
                </div>

                {/* Main Content Area */}
                <div className="flex-1 flex overflow-hidden">
                    {/* Left Side - Card with ad content */}
                    <div className="flex-1 flex">
                        {/* Background container with project color - expanded with top margin only */}
                        <div className="rounded-xl my-4 mx-16 px-6 py-6 bg-accent/10 flex-1 flex items-center justify-center">
                            {/* Card with rounded borders - width adjusts to image */}
                            <div className="bg-card rounded-xl overflow-hidden shadow-sm w-fit p-2 min-w-64">
                                {/* Card Header */}
                                <div>
                                    <div className="flex items-center gap-3 mb-2">
                                        {/* Avatar */}
                                        <div className="w-8 h-8 rounded-full overflow-hidden bg-muted flex-shrink-0">
                                            {selectedItem.page_url ? (
                                                <img
                                                    src={`https://twenty-icons.com/${selectedItem.page_url.replace(/^https?:\/\//, '')}`}
                                                    alt={`${selectedItem.title} logo`}
                                                    className="w-full h-full object-cover"
                                                    onError={(e) => {
                                                        // Fallback to a default avatar if the icon service fails
                                                        e.target.style.display = 'none';
                                                        e.target.parentNode.innerHTML = `<div class="w-full h-full bg-primary/10 flex items-center justify-center text-primary font-semibold text-xs">${selectedItem.title.charAt(0).toUpperCase()}</div>`;
                                                    }}
                                                />
                                            ) : (
                                                <div className="w-full h-full bg-primary/10 flex items-center justify-center text-primary font-semibold text-xs">
                                                    {selectedItem.title.charAt(0).toUpperCase()}
                                                </div>
                                            )}
                                        </div>
                                        <h4 className="font-medium text-sm break-words">{selectedItem.title}</h4>
                                    </div>
                                    
                                    {/* Ad Creative Bodies - separate line below */}
                                    {selectedItem.ad_creative_bodies && (
                                        <div>
                                            <div className="relative w-0 min-w-full">
                                                {!isAdBodiesExpanded && selectedItem.ad_creative_bodies.length > 100 ? (
                                                    <p className="text-xs text-foreground leading-relaxed break-words">
                                                        {selectedItem.ad_creative_bodies.substring(0, 100)}...{' '}
                                                        <button
                                                            onClick={() => setIsAdBodiesExpanded(true)}
                                                            className="text-gray-500 hover:text-gray-700 text-xs underline inline"
                                                        >
                                                            {t('bento_gallery.read_more', 'read more')}
                                                        </button>
                                                    </p>
                                                ) : (
                                                    <div>
                                                        <p className="text-xs text-foreground leading-relaxed break-words">
                                                            {selectedItem.ad_creative_bodies}
                                                        </p>
                                                        {isAdBodiesExpanded && selectedItem.ad_creative_bodies.length > 100 && (
                                                            <button
                                                                onClick={() => setIsAdBodiesExpanded(false)}
                                                                className="text-gray-500 hover:text-gray-700 text-xs underline mt-1"
                                                            >
                                                                {t('bento_gallery.read_less', 'Read less')}
                                                            </button>
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {/* Card Body - Image */}
                                <div className="py-3">
                                    <div className="h-[250px] relative w-fit mx-auto">
                                        <img
                                            src={selectedItem.url}
                                            alt={selectedItem.title}
                                            className="h-full object-contain rounded-lg"
                                        />
                                        {/* Action icons in modal - only visible for staff users */}
                                        {canManageItems && (
                                            <div className="absolute top-2 right-2 flex space-x-2">
                                                {/* Favorite star icon */}
                                                <button
                                                    type="button"
                                                    className="cursor-pointer bg-transparent border-0 p-1 rounded-full hover:bg-gray-100/20"
                                                    onClick={handleToggleFavorite}
                                                    title={isFavorite ? "Remove from favorites" : "Add to favorites"}
                                                >
                                                    <Star
                                                        className={`w-5 h-5 ${isFavorite ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300'}`}
                                                        strokeWidth={1.5}
                                                    />
                                                </button>

                                                {/* Delete trash icon */}
                                                <button
                                                    type="button"
                                                    className="cursor-pointer bg-transparent border-0 p-1 rounded-full hover:bg-gray-100/20"
                                                    onClick={handleDeactivateImage}
                                                    title="Deactivate this image"
                                                >
                                                    <Trash2
                                                        className="w-5 h-5 text-red-500 hover:text-red-600"
                                                        strokeWidth={1.5}
                                                    />
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Card Footer - expanded container */}
                                <div>
                                    <div className="bg-accent/10 px-3 py-2 rounded-lg border border-border">
                                        <a 
                                            href={selectedItem.page_url} 
                                            target="_blank" 
                                            rel="noopener noreferrer"
                                            className="text-xs text-primary hover:text-primary/80 transition-colors block uppercase"
                                        >
                                            {selectedItem.page_url?.replace(/^https?:\/\//, '') || 'Visit Page'}
                                        </a>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Right Sidebar - selectedItem data and Select button */}
                    <div className="w-80 border-l border-border p-4 bg-muted/20">
                        <div className="space-y-4">
                            <div>
                                <h4 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide mb-3">
                                    {t('bento_gallery.ad_details', 'Ad Details')}
                                </h4>
                                
                                {/* Date Information */}
                                <div className="space-y-2 text-sm">
                                    <div>
                                        <span className="font-medium">Created:</span>
                                        <span className="ml-2 text-muted-foreground">
                                            {selectedItem.ad_creation_time ? new Date(selectedItem.ad_creation_time).toLocaleDateString() : 'Unknown'}
                                        </span>
                                    </div>
                                    <div>
                                        <span className="font-medium">Ended:</span>
                                        <span className="ml-2 text-muted-foreground">
                                            {selectedItem.ad_delivery_stop_time ? new Date(selectedItem.ad_delivery_stop_time).toLocaleDateString() : 'Present'}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            {/* Additional metadata if available */}
                            {selectedItem.ad_creative_link_captions && (
                                <div>
                                    <span className="font-medium text-sm">Caption:</span>
                                    <p className="text-sm text-muted-foreground mt-1 leading-relaxed">
                                        {selectedItem.ad_creative_link_captions}
                                    </p>
                                </div>
                            )}

                            {/* Select Button */}
                            <div className="pt-4 border-t border-border">
                                <button
                                    onClick={() => onSelect(selectedItem)}
                                    className="w-full py-3 px-4 bg-primary hover:bg-primary/90 text-primary-foreground rounded-lg transition-colors font-medium"
                                >
                                    {t('bento_gallery.select_style', 'Select This Ad Style')}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </motion.div>
        </motion.div>
    );
};

/**
 * InteractiveBentoGallery component displays a grid of ad examples
 * Allows users to select the ad style that best matches their desired outcome
 */
const InteractiveBentoGallery = ({
    mediaItems,
    title = "Select Your Ideal Ad Style",
    description = "Browse and choose the ad style that best matches your desired outcome",
    onItemSelect,
    selectedItemId,
    onActiveFilterChange,
    initialActiveFilter = true,
    userPermissions = window.__USER_PERMISSIONS__ || { isStaff: false }
}) => {
    const { t } = useTranslation();
    const [selectedItem, setSelectedItem] = useState(null);
    const [selectedAdStyle, setSelectedAdStyle] = useState(null);
    const [isLoading, setIsLoading] = useState(false);
    const [updatedItems, setUpdatedItems] = useState({});
    const [showOnlyActive, setShowOnlyActive] = useState(initialActiveFilter);

    const handleSelectAdStyle = (item) => {
        setSelectedAdStyle(item);
        setSelectedItem(null);

        // Call the external onItemSelect handler if provided
        if (onItemSelect && typeof onItemSelect === 'function') {
            onItemSelect(item);
        }

        console.log('Selected ad style:', item);
    };

    // Handle toggling favorite status
    const handleToggleFavorite = async (item) => {
        console.log('Toggle favorite clicked for item:', item);

        // Check if we have the necessary data
        if (!item) {
            console.error('Item is undefined');
            return;
        }

        // Extract the real ID from the compound ID if present
        // Format could be like "3325-0" where 3325 is the real ID
        let adlibraryId;
        if (item.original_id) {
            adlibraryId = item.original_id;
        } else if (item.id && typeof item.id === 'string' && item.id.includes('-')) {
            adlibraryId = item.id.split('-')[0];
        } else {
            adlibraryId = item.id;
        }

        if (!adlibraryId) {
            console.error('No adlibrary ID found in item:', item);
            return;
        }

        setIsLoading(true);
        try {
            console.log('Sending toggle favorite request for adlibrary ID:', adlibraryId);

            const response = await fetch('/ads/api/toggle-favorite/', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRFToken': getCsrfToken()
                },
                body: JSON.stringify({
                    adlibrary_id: adlibraryId
                })
            });

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`Failed to toggle favorite status: ${errorText}`);
            }

            const data = await response.json();
            console.log('Toggled favorite status response:', data);

            // Update the item in local state
            const updatedItem = { ...item, is_fav: data.is_fav };

            // Update the selected item if it's the same one
            if (selectedItem && (selectedItem.id === item.id || selectedItem.original_id === item.original_id)) {
                setSelectedItem(updatedItem);
            }

            // Store the updated item to update the UI
            setUpdatedItems(prev => ({
                ...prev,
                [item.id]: updatedItem
            }));
        } catch (error) {
            console.error('Error toggling favorite:', error);
            alert('Error toggling favorite status. See console for details.');
        } finally {
            setIsLoading(false);
        }
    };

    // Handle deactivating an image
    const handleDeactivateImage = async (item) => {
        console.log('Deactivate image clicked for item:', item);

        // Check if we have the necessary data
        if (!item) {
            console.error('Item is undefined');
            return;
        }

        // Extract the real ID from the compound ID if present
        // Format could be like "3325-0" where 3325 is the real ID
        let adlibraryId;
        if (item.original_id) {
            adlibraryId = item.original_id;
        } else if (item.id && typeof item.id === 'string' && item.id.includes('-')) {
            adlibraryId = item.id.split('-')[0];
        } else {
            adlibraryId = item.id;
        }

        if (!adlibraryId) {
            console.error('No adlibrary ID found in item:', item);
            return;
        }

        // Get the image URL - it might be directly in ad_image or it might be in url
        const imageUrl = item.ad_image || item.url;
        if (!imageUrl) {
            console.error('No image URL found in item:', item);
            return;
        }

        setIsLoading(true);
        try {
            console.log('Sending deactivate image request for:', { adlibraryId, imageUrl });

            const response = await fetch('/ads/api/deactivate-image/', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRFToken': getCsrfToken()
                },
                body: JSON.stringify({
                    adlibrary_id: adlibraryId,
                    image_url: imageUrl
                })
            });

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`Failed to deactivate image: ${errorText}`);
            }

            const data = await response.json();
            console.log('Deactivated image response:', data);

            // Remove the item from the UI immediately
            // First, close the modal if it's open
            if (selectedItem && (selectedItem.id === item.id || selectedItem.original_id === item.original_id)) {
                setSelectedItem(null);
            }

            // Remove the item from mediaItems directly
            // Note: This is not a standard React pattern, but it's the simplest solution
            const index = mediaItems.findIndex(i => i.id === item.id);
            if (index !== -1) {
                mediaItems.splice(index, 1);
                // Force a re-render
                setIsLoading(prev => !prev);
            }

            console.log('Image has been deactivated successfully');
        } catch (error) {
            console.error('Error deactivating image:', error);
            alert('Error deactivating image. See console for details.');
        } finally {
            setIsLoading(false);
        }
    };

    // Helper function to get CSRF token
    const getCsrfToken = () => {
        const csrfCookie = document.cookie
            .split('; ')
            .find(row => row.startsWith('csrftoken='));

        return csrfCookie ? csrfCookie.split('=')[1] : '';
    };

    return (
        <div className="container mx-auto px-1 py-1 max-w-5xl"
            style={{
                scrollbarWidth: 'thin',
                scrollbarColor: 'rgb(156 163 175) transparent'
            }}>
            <div className="mb-6 relative">
                <div className="text-center">
                    <motion.h2
                        className="text-2xl sm:text-3xl font-bold text-foreground"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5 }}
                    >
                        {title}
                    </motion.h2>
                    <motion.p
                        className="mt-2 text-sm sm:text-base text-muted-foreground"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5, delay: 0.1 }}
                    >
                        {description}
                    </motion.p>
                </div>
            </div>

            {selectedAdStyle && (
                <div className="mb-6 p-4 bg-accent/20 border border-border rounded-lg flex items-center">
                    <div className="w-16 h-16 rounded-md overflow-hidden mr-4 flex-shrink-0">
                        <img
                            src={selectedAdStyle.url}
                            alt={selectedAdStyle.title}
                            className="w-full h-full object-cover"
                        />
                    </div>
                    <div className="flex-1">
                        <h3 className="font-medium">{t('bento_gallery.selected_style', 'Selected Style: {style}', { style: selectedAdStyle.title })}</h3>
                        <p className="text-sm text-muted-foreground">{selectedAdStyle.desc}</p>
                    </div>
                    <button
                        onClick={() => setSelectedAdStyle(null)}
                        className="ml-4 p-2 text-muted-foreground hover:text-foreground"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>
            )}

            <AnimatePresence mode="wait">
                {selectedItem && (
                    <GalleryModal
                        selectedItem={selectedItem}
                        isOpen={!!selectedItem}
                        onClose={() => setSelectedItem(null)}
                        onSelect={handleSelectAdStyle}
                        userPermissions={userPermissions}
                        onToggleFavorite={handleToggleFavorite}
                        onDeactivateImage={handleDeactivateImage}
                    />
                )}
            </AnimatePresence>

            <motion.div
                className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4"
                initial="hidden"
                animate="visible"
                variants={{
                    hidden: { opacity: 0 },
                    visible: {
                        opacity: 1,
                        transition: { staggerChildren: 0.05 }
                    }
                }}
            >
                {mediaItems.map((item, index) => (
                    <motion.div
                        key={item.id}
                        layoutId={`media-${item.id}`}
                        className={`${selectedItemId === item.id ? 'ring-2 ring-primary ring-offset-2 rounded-xl' : ''}`}
                        onClick={() => {
                            // Only open the modal, don't select the item yet
                            setSelectedItem(item);
                            // Selection will happen only when clicking the "Select This Ad Style" button
                        }}
                        variants={{
                            hidden: { y: 20, opacity: 0 },
                            visible: {
                                y: 0,
                                opacity: 1,
                                transition: {
                                    type: "spring",
                                    stiffness: 300,
                                    damping: 25,
                                    delay: index * 0.03
                                }
                            }
                        }}
                    >
                        <MediaItem
                            key={item.id}
                            item={updatedItems[item.id] || item} // Use updated item if available
                            className=""
                            onClick={() => setSelectedItem(updatedItems[item.id] || item)}
                            isSelected={selectedAdStyle && selectedAdStyle.id === item.id}
                            userPermissions={userPermissions}
                            onToggleFavorite={handleToggleFavorite}
                            onDeactivateImage={handleDeactivateImage}
                        />
                    </motion.div>
                ))}
            </motion.div>

            {mediaItems.length === 0 && (
                <div className="py-12 text-center text-muted-foreground">
                    <p>No ad examples available. Try different filters.</p>
                </div>
            )}
        </div>
    );
};

export default InteractiveBentoGallery;
