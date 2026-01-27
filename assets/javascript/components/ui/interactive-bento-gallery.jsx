import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Check, Star, Trash2, ExternalLink, ChevronDown, Zap, TriangleAlert } from 'lucide-react';
import { useTranslation } from '../../lib/useTranslation';
import { Switch } from '../ui/switch';
import { useIsMobile } from '../../hooks/use-mobile';
import { Sheet, SheetContent, SheetTrigger } from '../ui/sheet';

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

// Helper function to calculate days between two dates
const calculateDaysRunning = (startDate, endDate) => {
    if (!startDate) return null;

    const start = new Date(startDate);
    const end = endDate ? new Date(endDate) : new Date();
    const diffTime = Math.abs(end - start);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    return diffDays;
};

// Platform icon components
const PlatformIcon = ({ platform }) => {
    const iconStyle = "w-4 h-4 inline-block";

    switch (platform) {
        case 'FACEBOOK':
            return (
                <svg className={iconStyle} viewBox="0 0 24 24" fill="#1877F2">
                    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                </svg>
            );
        case 'INSTAGRAM':
            return (
                <svg className={iconStyle} viewBox="0 0 24 24" fill="url(#instagram-gradient)">
                    <defs>
                        <linearGradient id="instagram-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                            <stop offset="0%" stopColor="#833AB4" />
                            <stop offset="50%" stopColor="#FD1D1D" />
                            <stop offset="100%" stopColor="#FCB045" />
                        </linearGradient>
                    </defs>
                    <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
                </svg>
            );
        case 'AUDIENCE_NETWORK':
            return (
                <svg className={iconStyle} viewBox="0 0 24 24" fill="#4267B2">
                    <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.568 8.16c-.169 1.858-.896 5.728-.896 5.728-.634 2.114-1.547 2.114-1.547 2.114-.955 0-1.557-.955-1.557-.955L12 11.19l-1.568 3.857s-.602.955-1.557.955c0 0-.913 0-1.547-2.114 0 0-.727-3.87-.896-5.728-.169-1.858.602-2.539.602-2.539.424-.511 1.135-.511 1.135-.511h5.662s.711 0 1.135.511c0 0 .771.681.602 2.539z" />
                </svg>
            );
        case 'MESSENGER':
            return (
                <svg className={iconStyle} viewBox="0 0 24 24" fill="#00B2FF">
                    <path d="M12 0C5.373 0 0 4.975 0 11.111c0 3.497 1.745 6.616 4.472 8.652V24l4.086-2.242c1.09.301 2.246.464 3.442.464 6.627 0 12-4.974 12-11.111C24 4.975 18.627 0 12 0zm1.193 14.963l-3.056-3.259-5.963 3.259L10.733 8.5l3.13 3.259L19.794 8.5l-6.601 6.463z" />
                </svg>
            );
        case 'THREADS':
            return (
                <svg className={iconStyle} viewBox="0 0 24 24" fill="#000000">
                    <path d="M12.186 24h-.007c-3.581-.024-6.334-1.205-8.184-3.509C2.35 18.44 1.5 15.586 1.472 12.01v-.017C1.5 8.417 2.35 5.563 3.995 3.512 5.845 1.205 8.598.024 12.179 0h.014c2.746.02 5.043.725 6.826 2.098 1.677 1.29 2.858 3.13 3.509 5.467l-2.04.569c-.542-1.864-1.48-3.323-2.787-4.339C16.516 2.856 14.6 2.3 12.193 2.286h-.011c-2.922.019-5.094.813-6.456 2.363-.8.91-1.312 2.066-1.515 3.43-.132.882-.145 1.776-.145 2.927v.006c0 1.15.013 2.044.145 2.927.203 1.364.715 2.52 1.515 3.43 1.362 1.55 3.534 2.344 6.456 2.364h.011c.381 0 .749-.015 1.114-.043 1.297-.099 2.318-.394 3.034-.877.715-.482 1.064-1.01 1.064-1.611 0-.384-.126-.735-.376-1.044-.25-.309-.612-.549-1.076-.713-.464-.164-1.017-.246-1.645-.246-.628 0-1.181.082-1.645.246-.464.164-.826.404-1.076.713-.25.309-.376.66-.376 1.044 0 .601.349 1.129 1.064 1.611.716.483 1.737.778 3.034.877.365.028.733.043 1.114.043h.011c2.922-.02 5.094-.814 6.456-2.364.8-.91 1.312-2.066 1.515-3.43.132-.883.145-1.777.145-2.927v-.006c0-1.15-.013-2.045-.145-2.927-.203-1.364-.715-2.52-1.515-3.43C17.287 1.099 15.115.305 12.193.286h-.011z" />
                </svg>
            );
        default:
            return <span className="text-xs bg-muted px-1 py-0.5 rounded">{platform}</span>;
    }
};

/**
 * Get score colors based on runtime_score ranges (neutral palette)
 */
const getScoreColors = (score) => {
    if (!score) return { bg: '#F5F5F5', border: '#E0E0E0', text: '#9E9E9E' }; // Gris neutro para null
    if (score >= 75) return { bg: '#E8F5E9', border: '#A5D6A7', text: '#2E7D32' }; // Verde suave
    if (score >= 50) return { bg: '#FFF9E6', border: '#FFE082', text: '#F57F17' }; // Amarillo/dorado suave
    if (score >= 25) return { bg: '#FFF3E0', border: '#FFCC80', text: '#E65100' }; // Naranja suave
    return { bg: '#FFEBEE', border: '#EF9A9A', text: '#C62828' }; // Rojo suave (no intenso)
};

/**
 * MediaItem component renders a card with company info, ad content, and image
 * Similar to GalleryModal but in card format without footer and close button
 */
const MediaItem = ({ item, className, onClick, isSelected, userPermissions = { isStaff: false }, onToggleFavorite, onDeactivateImage }) => {
    const { t } = useTranslation();
    const [isAdBodiesExpanded, setIsAdBodiesExpanded] = useState(false);
    const [showTooltip, setShowTooltip] = useState(false);
    const [tooltipPosition, setTooltipPosition] = useState({ top: 0, left: 0 });
    const badgeRef = useRef(null);

    // Calculate tooltip position when hovering
    useEffect(() => {
        if (showTooltip && badgeRef.current) {
            const rect = badgeRef.current.getBoundingClientRect();
            setTooltipPosition({
                top: rect.top - 8,
                left: rect.left + rect.width / 2
            });
        }
    }, [showTooltip]);

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

                    {/* Low Ad Count Warning */}
                    {item.company_ad_count > 0 && item.company_ad_count < 10 && (
                        <>
                            <div
                                ref={badgeRef}
                                className="inline-flex items-center gap-1 px-2 py-1 flex-shrink-0"
                                style={{
                                    borderRadius: '10.8px',
                                    border: '0.51px solid #E0E0E0',
                                    backgroundColor: '#F5F5F5'
                                }}
                                onMouseEnter={() => setShowTooltip(true)}
                                onMouseLeave={() => setShowTooltip(false)}
                            >
                                <TriangleAlert className="w-3.5 h-3.5 my-0.5" style={{ color: '#757575' }} />
                            </div>
                            {showTooltip && (
                                <div
                                    className="fixed px-3 py-1.5 bg-gray-900 dark:bg-gray-700 text-white text-xs rounded-md whitespace-nowrap pointer-events-none z-[9999] shadow-lg -translate-x-1/2 -translate-y-full"
                                    style={{
                                        top: `${tooltipPosition.top}px`,
                                        left: `${tooltipPosition.left}px`
                                    }}
                                >
                                    An advertiser needs 10 ads or more before a score can be calculated
                                    <div className="absolute top-full left-1/2 -translate-x-1/2 border-[6px] border-transparent border-t-gray-900 dark:border-t-gray-700"></div>
                                </div>
                            )}
                        </>
                    )}

                    {/* Runtime Score Badge with dynamic colors - only show if alert badge is not shown */}
                    {item.runtime_score && !(item.company_ad_count > 0 && item.company_ad_count < 10) && (() => {
                        const colors = getScoreColors(item.runtime_score);
                        return (
                            <div
                                className="inline-flex items-center gap-1 px-2 py-1 flex-shrink-0"
                                style={{
                                    borderRadius: '10.8px',
                                    border: `0.51px solid ${colors.border}`,
                                    backgroundColor: colors.bg
                                }}
                            >
                                <Zap className="w-3 h-3" style={{ color: colors.text }} />
                                <span className="text-xs font-semibold" style={{ color: colors.text }}>
                                    {item.runtime_score}
                                </span>
                            </div>
                        );
                    })()}
                </div>

                {/* Ad Creative Bodies */}
                {item.ad_creative_bodies && (
                    <div className="mt-2">
                        <div className="relative w-0 min-w-full">
                            {!isAdBodiesExpanded && item.ad_creative_bodies.length > 80 ? (
                                <p className="text-xs text-foreground leading-relaxed break-words whitespace-pre-line">
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
                                    <p className="text-xs text-foreground leading-relaxed break-words whitespace-pre-line">
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
    const isMobile = useIsMobile();
    const [isAdBodiesExpanded, setIsAdBodiesExpanded] = useState(false);
    const [sheetOpen, setSheetOpen] = useState(false);
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

    // Mobile Layout: Fullscreen image with bottom sheet
    if (isMobile) {
        return (
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-50 bg-black"
            >
                {/* Close button - top right */}
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 z-[60] p-2 rounded-full bg-black/50 hover:bg-black/70 text-white backdrop-blur-sm"
                >
                    <X className="w-5 h-5" />
                </button>

                {/* Fullscreen Image */}
                <div className="absolute inset-0 flex items-center justify-center p-4">
                    <img
                        src={selectedItem.url}
                        alt={selectedItem.title}
                        className="max-w-full max-h-full object-contain"
                    />
                    {/* Action icons - only visible for staff users */}
                    {canManageItems && (
                        <div className="absolute top-4 left-4 flex space-x-2">
                            {/* Favorite star icon */}
                            <button
                                type="button"
                                className="cursor-pointer bg-black/50 hover:bg-black/70 backdrop-blur-sm border-0 p-2 rounded-full"
                                onClick={handleToggleFavorite}
                                title={isFavorite ? "Remove from favorites" : "Add to favorites"}
                            >
                                <Star
                                    className={`w-5 h-5 ${isFavorite ? 'text-yellow-400 fill-yellow-400' : 'text-white'}`}
                                    strokeWidth={1.5}
                                />
                            </button>

                            {/* Delete trash icon */}
                            <button
                                type="button"
                                className="cursor-pointer bg-black/50 hover:bg-black/70 backdrop-blur-sm border-0 p-2 rounded-full"
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

                {/* Bottom Sheet with Details */}
                <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
                    <SheetTrigger asChild>
                        <button className="absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-black/80 to-transparent flex items-end justify-center pb-3 text-white">
                            <ChevronDown className="w-6 h-6 animate-bounce" />
                            <span className="ml-2 text-sm font-medium">View Details</span>
                        </button>
                    </SheetTrigger>
                    <SheetContent side="bottom" className="h-[70vh] rounded-t-3xl">
                        <div className="flex flex-col h-full">
                            {/* Scrollable Details */}
                            <div className="flex-1 overflow-y-auto custom-scrollbar px-4 pb-4">
                                {/* Company Header */}
                                <div className="flex items-center gap-3 mb-4 pt-2">
                                    <div className="w-10 h-10 rounded-lg overflow-hidden bg-muted flex-shrink-0">
                                        {selectedItem.page_url ? (
                                            <img
                                                src={`https://twenty-icons.com/${selectedItem.page_url.replace(/^https?:\/\//, '')}`}
                                                alt={`${selectedItem.title} logo`}
                                                className="w-full h-full object-cover"
                                                onError={(e) => {
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

                                {/* Ad Creative Bodies */}
                                {selectedItem.ad_creative_bodies && (
                                    <div className="mb-4">
                                        <div className="relative w-0 min-w-full">
                                            {!isAdBodiesExpanded && selectedItem.ad_creative_bodies.length > 100 ? (
                                                <p className="text-sm text-foreground leading-relaxed break-words whitespace-pre-line">
                                                    {selectedItem.ad_creative_bodies.substring(0, 100)}...{' '}
                                                    <button
                                                        onClick={() => setIsAdBodiesExpanded(true)}
                                                        className="text-primary hover:text-primary/80 text-sm underline inline"
                                                    >
                                                        {t('bento_gallery.read_more', 'read more')}
                                                    </button>
                                                </p>
                                            ) : (
                                                <div>
                                                    <p className="text-sm text-foreground leading-relaxed break-words whitespace-pre-line">
                                                        {selectedItem.ad_creative_bodies}
                                                    </p>
                                                    {isAdBodiesExpanded && selectedItem.ad_creative_bodies.length > 100 && (
                                                        <button
                                                            onClick={() => setIsAdBodiesExpanded(false)}
                                                            className="text-primary hover:text-primary/80 text-sm underline mt-1"
                                                        >
                                                            {t('bento_gallery.read_less', 'Read less')}
                                                        </button>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )}

                                {/* Ad Details */}
                                <div className="space-y-4">
                                    <h4 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">
                                        {t('bento_gallery.ad_details', 'Ad Details')}
                                    </h4>

                                    <div className="space-y-3 text-sm">
                                        {/* Status */}
                                        <div className="flex items-center gap-2">
                                            <span className="font-medium">Status:</span>
                                            <div className="flex items-center gap-1">
                                                <div className={`w-2 h-2 rounded-full ${selectedItem.meta_status === 'ACTIVE' ? 'bg-green-500' : 'bg-gray-400'}`}></div>
                                                <span className="text-muted-foreground capitalize">
                                                    {selectedItem.meta_status ? selectedItem.meta_status.toLowerCase() : 'unknown'}
                                                </span>
                                            </div>
                                        </div>

                                        {/* Start Date */}
                                        <div>
                                            <span className="font-medium">Start Date:</span>
                                            <span className="ml-2 text-muted-foreground">
                                                {selectedItem.ad_creation_time ? new Date(selectedItem.ad_creation_time).toLocaleDateString() : 'Unknown'}
                                            </span>
                                        </div>

                                        {/* Time Running */}
                                        {selectedItem.ad_creation_time && (
                                            <div>
                                                <span className="font-medium">Time Running:</span>
                                                <span className="ml-2 text-muted-foreground">
                                                    {(() => {
                                                        const days = calculateDaysRunning(selectedItem.ad_creation_time, selectedItem.ad_delivery_stop_time);
                                                        return days ? `${days} days` : 'Unknown';
                                                    })()}
                                                </span>
                                            </div>
                                        )}

                                        {/* Format */}
                                        <div>
                                            <span className="font-medium">Format:</span>
                                            <span className="ml-2 text-muted-foreground capitalize">
                                                {selectedItem.media_type ? selectedItem.media_type.toLowerCase() : 'unknown'}
                                            </span>
                                        </div>

                                        {/* Niche */}
                                        {selectedItem.industry && (
                                            <div>
                                                <span className="font-medium">Niche:</span>
                                                <span className="ml-2 text-muted-foreground">
                                                    {selectedItem.industry}
                                                </span>
                                            </div>
                                        )}

                                        {/* CTA Links */}
                                        <div>
                                            <span className="font-medium">CTA Links:</span>
                                            <div className="mt-1">
                                                {selectedItem.cta_link && selectedItem.cta_link !== 'Unknown' ? (
                                                    <a
                                                        href={selectedItem.cta_link}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="text-primary hover:text-primary/80 transition-colors text-xs flex items-center gap-1 truncate"
                                                        title={selectedItem.cta_link}
                                                    >
                                                        <span className="truncate">
                                                            {selectedItem.cta_link}
                                                        </span>
                                                        <ExternalLink className="w-3 h-3 flex-shrink-0" />
                                                    </a>
                                                ) : (
                                                    <span className="text-muted-foreground text-xs">Unknown</span>
                                                )}
                                            </div>
                                        </div>

                                        {/* Platforms */}
                                        <div>
                                            <span className="font-medium">Platforms:</span>
                                            <div className="flex flex-wrap gap-2 mt-1">
                                                {selectedItem.publisher_platform && selectedItem.publisher_platform.length > 0 ? (
                                                    selectedItem.publisher_platform.map((platform, index) => (
                                                        <div key={index} className="flex items-center gap-1 bg-muted/50 px-2 py-1 rounded-md">
                                                            <PlatformIcon platform={platform} />
                                                            <span className="text-xs capitalize">
                                                                {platform.toLowerCase().replace('_', ' ')}
                                                            </span>
                                                        </div>
                                                    ))
                                                ) : (
                                                    <span className="text-muted-foreground text-xs">Not available</span>
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Additional metadata */}
                                    {selectedItem.ad_creative_link_captions && (
                                        <div>
                                            <span className="font-medium text-sm">Caption:</span>
                                            <p className="text-sm text-muted-foreground mt-1 leading-relaxed">
                                                {selectedItem.ad_creative_link_captions}
                                            </p>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Sticky Button */}
                            <div className="border-t border-border p-4 bg-background">
                                <button
                                    onClick={() => onSelect(selectedItem)}
                                    className="w-full py-3 px-4 bg-primary hover:bg-primary/90 text-primary-foreground rounded-lg transition-colors font-medium"
                                >
                                    {t('bento_gallery.create_similar', 'Create similar Ad')}
                                </button>
                            </div>
                        </div>
                    </SheetContent>
                </Sheet>
            </motion.div>
        );
    }

    // Desktop Layout: Horizontal layout (original)
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
                className="bg-background rounded-xl overflow-hidden h-[calc(100vh-2rem)] max-h-screen max-w-6xl w-full shadow-2xl flex flex-col"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Simplified Header - only avatar, name and close button */}
                <div className="p-4 border-b border-border">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            {/* Avatar */}
                            <div className="w-10 h-10 rounded-lg overflow-hidden bg-muted flex-shrink-0">
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
                <div className="flex-1 flex overflow-hidden pt-2 pb-2 min-h-0">
                    {/* Left Side - Card with ad content */}
                    <div className="flex-1 flex min-h-0">
                        {/* Background container with project color */}
                        <div className="rounded-xl mx-8 md:mx-16 px-3 md:px-6 py-3 bg-accent/10 flex-1 flex items-stretch justify-center h-full min-h-0">
                            {/* Unified card as a single aspect-ratio block */}
                            <div className="relative h-full aspect-[4/5] max-w-full">
                                <div className="bg-card rounded-xl overflow-hidden shadow-sm absolute inset-0 flex flex-col p-2 min-w-0">
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
                                                        <p className="text-xs text-foreground leading-relaxed break-words whitespace-pre-line">
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
                                                            <p className="text-xs text-foreground leading-relaxed break-words whitespace-pre-line">
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
                                    <div className="py-3 flex-1 min-h-0">
                                        <div className="relative w-full h-full">
                                            <img
                                                src={selectedItem.url}
                                                alt={selectedItem.title}
                                                className="w-full h-full object-contain rounded-lg"
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

                                {/* Enhanced Ad Details */}
                                <div className="space-y-3 text-sm">
                                    {/* Status */}
                                    <div className="flex items-center gap-2">
                                        <span className="font-medium">Status:</span>
                                        <div className="flex items-center gap-1">
                                            <div className={`w-2 h-2 rounded-full ${selectedItem.meta_status === 'ACTIVE' ? 'bg-green-500' : 'bg-gray-400'}`}></div>
                                            <span className="text-muted-foreground capitalize">
                                                {selectedItem.meta_status ? selectedItem.meta_status.toLowerCase() : 'unknown'}
                                            </span>
                                        </div>
                                    </div>

                                    {/* Start Date */}
                                    <div>
                                        <span className="font-medium">Start Date:</span>
                                        <span className="ml-2 text-muted-foreground">
                                            {selectedItem.ad_creation_time ? new Date(selectedItem.ad_creation_time).toLocaleDateString() : 'Unknown'}
                                        </span>
                                    </div>

                                    {/* Time Running */}
                                    {selectedItem.ad_creation_time && (
                                        <div>
                                            <span className="font-medium">Time Running:</span>
                                            <span className="ml-2 text-muted-foreground">
                                                {(() => {
                                                    const days = calculateDaysRunning(selectedItem.ad_creation_time, selectedItem.ad_delivery_stop_time);
                                                    return days ? `${days} days` : 'Unknown';
                                                })()}
                                            </span>
                                        </div>
                                    )}

                                    {/* Format */}
                                    <div>
                                        <span className="font-medium">Format:</span>
                                        <span className="ml-2 text-muted-foreground capitalize">
                                            {selectedItem.media_type ? selectedItem.media_type.toLowerCase() : 'unknown'}
                                        </span>
                                    </div>

                                    {/* Niche */}
                                    {selectedItem.industry && (
                                        <div>
                                            <span className="font-medium">Niche:</span>
                                            <span className="ml-2 text-muted-foreground">
                                                {selectedItem.industry}
                                            </span>
                                        </div>
                                    )}

                                    {/* CTA Links */}
                                    <div>
                                        <span className="font-medium">CTA Links:</span>
                                        <div className="mt-1">
                                            {selectedItem.cta_link && selectedItem.cta_link !== 'Unknown' ? (
                                                <a
                                                    href={selectedItem.cta_link}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="text-primary hover:text-primary/80 transition-colors text-xs flex items-center gap-1 truncate"
                                                    title={selectedItem.cta_link}
                                                >
                                                    <span className="truncate">
                                                        {selectedItem.cta_link}
                                                    </span>
                                                    <ExternalLink className="w-3 h-3 flex-shrink-0" />
                                                </a>
                                            ) : (
                                                <span className="text-muted-foreground text-xs">Unknown</span>
                                            )}
                                        </div>
                                    </div>

                                    {/* Platforms */}
                                    <div>
                                        <span className="font-medium">Platforms:</span>
                                        <div className="flex flex-wrap gap-2 mt-1">
                                            {selectedItem.publisher_platform && selectedItem.publisher_platform.length > 0 ? (
                                                selectedItem.publisher_platform.map((platform, index) => (
                                                    <div key={index} className="flex items-center gap-1 bg-muted/50 px-2 py-1 rounded-md">
                                                        <PlatformIcon platform={platform} />
                                                        <span className="text-xs capitalize">
                                                            {platform.toLowerCase().replace('_', ' ')}
                                                        </span>
                                                    </div>
                                                ))
                                            ) : (
                                                <span className="text-muted-foreground text-xs">Not available</span>
                                            )}
                                        </div>
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
                            <div className="pt-4">
                                <button
                                    onClick={() => onSelect(selectedItem)}
                                    className="w-full py-3 px-4 bg-primary hover:bg-primary/90 text-primary-foreground rounded-lg transition-colors font-medium"
                                >
                                    {t('bento_gallery.create_similar', 'Create similar Ad')}
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

    // Track click when opening the modal from a card, then open it
    const handleCardOpen = async (item) => {
        try {
            // Extract the real ID from the compound ID if present
            let adlibraryId;
            if (item.original_id) {
                adlibraryId = item.original_id;
            } else if (item.id && typeof item.id === 'string' && item.id.includes('-')) {
                adlibraryId = item.id.split('-')[0];
            } else {
                adlibraryId = item.id;
            }

            if (adlibraryId) {
                await fetch(`/ads/api/adlibrary/${adlibraryId}/click/`, {
                    method: 'POST',
                    headers: {
                        'X-CSRFToken': getCsrfToken(),
                    },
                });
            }
        } catch (e) {
            // Non-blocking: ignore tracking errors
        } finally {
            setSelectedItem(item);
        }
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
                            // Open modal and track click for popularity
                            handleCardOpen(item);
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
                            onClick={undefined}
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
