import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Check, Star, Trash2 } from 'lucide-react';
import { useTranslation } from '../../lib/useTranslation';
import { Switch } from '../ui/switch';

/**
 * MediaItem component renders an image with optional selection indicator
 * Includes a star icon that indicates if the image is marked as favorite
 */
const MediaItem = ({ item, className, onClick, isSelected, userPermissions = { isStaff: false }, onToggleFavorite, onDeactivateImage }) => {
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
        <div className={`${className} relative overflow-hidden group`}>
            <img
                src={item.url}
                alt={item.title}
                className={`w-full h-full object-cover cursor-pointer transition-transform duration-300 group-hover:scale-105`}
                onClick={onClick}
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
                            className={`w-6 h-6 ${isFavorite ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300'}`}
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
                            className="w-6 h-6 text-red-500 hover:text-red-600"
                            strokeWidth={1.5}
                        />
                    </button>
                </div>
            )}

            {/* Gradient overlay */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
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
                className="bg-background rounded-xl overflow-hidden max-w-4xl w-full max-h-[90vh] shadow-2xl flex flex-col"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="p-4 border-b border-border flex items-center justify-between">
                    <h3 className="text-lg font-semibold">{selectedItem.title}</h3>
                    <button
                        onClick={onClose}
                        className="p-1 rounded-full hover:bg-accent"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Content */}
                <div className="flex flex-col md:flex-row flex-1 overflow-hidden">
                    {/* Image */}
                    <div className="md:w-2/3 h-[300px] md:h-auto relative">
                        <img
                            src={selectedItem.url}
                            alt={selectedItem.title}
                            className="w-full h-full object-cover"
                        />
                        {/* Action icons in modal - only visible for staff users */}
                        {canManageItems && (
                            <div className="absolute top-3 right-3 flex space-x-3">
                                {/* Favorite star icon */}
                                <button
                                    type="button"
                                    className="cursor-pointer bg-transparent border-0 p-1 rounded-full hover:bg-gray-100/20"
                                    onClick={handleToggleFavorite}
                                    title={isFavorite ? "Remove from favorites" : "Add to favorites"}
                                >
                                    <Star
                                        className={`w-7 h-7 ${isFavorite ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300'}`}
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
                                        className="w-7 h-7 text-red-500 hover:text-red-600"
                                        strokeWidth={1.5}
                                    />
                                </button>
                            </div>
                        )}
                    </div>

                    {/* Details */}
                    <div className="md:w-1/3 p-4 overflow-y-auto">
                        <div className="mb-4">
                            <h4 className="font-medium text-muted-foreground">{t('bento_gallery.company', 'Company')}</h4>
                            <p className="text-lg font-semibold">{selectedItem.title}</p>
                        </div>

                        {selectedItem.industry && (
                            <div className="mb-4">
                                <h4 className="font-medium text-muted-foreground">{t('bento_gallery.industry', 'Industry')}</h4>
                                <div className="flex flex-wrap gap-2 mt-1">
                                    {selectedItem.industry.split(', ').map((ind, i) => (
                                        <span
                                            key={i}
                                            className="px-2 py-1 bg-muted rounded-full text-sm"
                                        >
                                            {ind}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        )}

                        {selectedItem.desc && (
                            <div className="mb-4">
                                <h4 className="font-medium text-muted-foreground">{t('bento_gallery.tags', 'Tags')}</h4>
                                <div className="flex flex-wrap gap-2 mt-1">
                                    {selectedItem.desc.split(', ').map((tag, i) => (
                                        <span
                                            key={i}
                                            className="px-2 py-1 bg-muted rounded-full text-sm"
                                        >
                                            {tag}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        )}

                        <button
                            onClick={() => onSelect(selectedItem)}
                            className="w-full mt-4 py-2 px-4 bg-primary hover:bg-primary/90 text-primary-foreground rounded-lg transition-colors"
                        >
                            {t('bento_gallery.select_style', 'Select This Ad Style')}
                        </button>
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
        <div className="container mx-auto px-4 py-6 max-w-5xl">
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
                className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4"
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
                        className={`relative overflow-hidden rounded-xl shadow-md hover:shadow-lg transition-shadow aspect-square ${selectedItemId === item.id ? 'ring-2 ring-primary ring-offset-2' : ''}`}
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
                            className="absolute inset-0 w-full h-full"
                            onClick={() => setSelectedItem(updatedItems[item.id] || item)}
                            isSelected={selectedAdStyle && selectedAdStyle.id === item.id}
                            userPermissions={userPermissions}
                            onToggleFavorite={handleToggleFavorite}
                            onDeactivateImage={handleDeactivateImage}
                        />
                        <div className="absolute inset-x-0 bottom-0 p-3">
                            <div className="relative z-10">
                                <h3 className="text-primary-foreground text-sm font-medium truncate">
                                    {item.title}
                                </h3>
                                {item.desc && (
                                    <p className="text-primary-foreground/80 text-xs mt-0.5 line-clamp-1">
                                        {item.desc}
                                    </p>
                                )}
                            </div>
                        </div>
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
