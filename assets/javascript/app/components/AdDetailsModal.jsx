import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '../../components/ui/dialog.tsx';
import { Button } from '../../components/ui/button.tsx';
import { Badge } from '../../components/ui/badge.jsx';
import { Separator } from '../../components/ui/separator.jsx';
import { useTranslation } from '../../lib/useTranslation';
import { ExternalLink, Palette, Globe, Target, Lightbulb, Star, Award, Zap } from 'lucide-react';

/**
 * Modal component for displaying detailed information about an ad request
 */
const AdDetailsModal = ({ isOpen, onClose, adRequestId }) => {
  const { t } = useTranslation();
  const [adDetails, setAdDetails] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Fetch ad details when modal opens
  useEffect(() => {
    if (isOpen && adRequestId) {
      fetchAdDetails();
    }
  }, [isOpen, adRequestId]);

  const fetchAdDetails = async () => {
    setLoading(true);
    setError('');
    
    try {
      console.log('Fetching ad details for ID:', adRequestId);
      const response = await fetch(`/ads/adrequest/${adRequestId}/get/`);
      console.log('Response status:', response.status);
      
      const data = await response.json();
      console.log('Response data:', data);
      
      if (response.ok) {
        // The endpoint returns the data directly, not wrapped in {success: true, data: {...}}
        setAdDetails(data);
        console.log('Ad details set:', data);
      } else {
        console.error('API error:', data);
        setError(data.error || 'Failed to load ad details');
      }
    } catch (err) {
      console.error('Fetch error:', err);
      setError('Error loading ad details');
    } finally {
      setLoading(false);
    }
  };

  // Helper function to safely get nested values
  const getNestedValue = (obj, path, defaultValue = '') => {
    return path.split('.').reduce((current, key) => {
      return current && current[key] !== undefined ? current[key] : defaultValue;
    }, obj);
  };

  // Helper function to get asset override value or base value
  const getAssetValue = (fieldName, defaultValue = '') => {
    if (!adDetails) return defaultValue;
    
    // First check asset_overrides
    const overrideValue = getNestedValue(adDetails, `asset_overrides.${fieldName}`);
    if (overrideValue) return overrideValue;
    
    // For this endpoint, there's no base_assets, just direct fields and asset_overrides
    return defaultValue;
  };

  // Helper function to get brand colors
  const getBrandColors = () => {
    const colors = getAssetValue('main_hex_color', []);
    if (Array.isArray(colors)) return colors;
    if (typeof colors === 'string') return [colors];
    return [];
  };

  // Helper function to get image URL
  const getImageUrl = (fieldName) => {
    if (!adDetails) return null;
    
    // Check override fields first
    const overrideField = `${fieldName}_override`;
    if (adDetails[overrideField]) {
      return adDetails[overrideField];
    }
    
    // Then check base assets
    const baseValue = getNestedValue(adDetails, `base_assets.${fieldName}`);
    return baseValue || null;
  };

  if (loading) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="sm:max-w-[900px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Ad Details - Loading</DialogTitle>
          </DialogHeader>
          <div className="flex items-center justify-center py-8">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
              <p className="text-gray-600 dark:text-gray-400">Loading ad details...</p>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  if (error) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="sm:max-w-[900px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Ad Details - Error</DialogTitle>
          </DialogHeader>
          <div className="flex items-center justify-center py-8">
            <div className="text-center">
              <p className="text-red-600 dark:text-red-400 mb-4">{error}</p>
              <Button onClick={onClose} variant="outline">Close</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  if (!adDetails) return null;

  const brandName = getNestedValue(adDetails, 'brand.name', 'Unknown Brand');
  const brandColors = getBrandColors();
  const canvasSize = adDetails.canvas_size || '1024x1024';

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[900px] max-h-[90vh] overflow-y-auto">
        <DialogHeader className="border-b border-gray-200 dark:border-gray-700 pb-4">
          <DialogTitle className="text-xl font-semibold">
            Ad Details - {brandName}
          </DialogTitle>
        </DialogHeader>

        <div className="py-6 space-y-6">
          {/* Basic Information */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Globe className="h-5 w-5 text-primary" />
              <h3 className="text-lg font-medium">Basic Information</h3>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">
                  Brand Name
                </label>
                <p className="text-sm bg-gray-50 dark:bg-gray-800 p-3 rounded-md border">
                  {brandName}
                </p>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">
                  Canvas Size
                </label>
                <p className="text-sm bg-gray-50 dark:bg-gray-800 p-3 rounded-md border">
                  {canvasSize}
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">
                  Industry
                </label>
                <p className="text-sm bg-gray-50 dark:bg-gray-800 p-3 rounded-md border">
                  {getAssetValue('industry') || 'Not specified'}
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">
                  Website
                </label>
                <div className="text-sm bg-gray-50 dark:bg-gray-800 p-3 rounded-md border">
                  {getAssetValue('company_website') ? (
                    <a 
                      href={getAssetValue('company_website')} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-primary hover:underline flex items-center gap-1"
                    >
                      {getAssetValue('company_website')}
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  ) : (
                    'Not specified'
                  )}
                </div>
              </div>
            </div>
          </div>

          <Separator />

          {/* Brand Colors */}
          {brandColors.length > 0 && (
            <>
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <Palette className="h-5 w-5 text-primary" />
                  <h3 className="text-lg font-medium">Brand Colors</h3>
                </div>
                
                <div className="flex flex-wrap gap-3">
                  {brandColors.map((color, index) => (
                    <div key={index} className="flex items-center gap-2 p-2 border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 rounded-md">
                      <div
                        className="h-6 w-6 rounded-md border border-gray-300 dark:border-gray-600"
                        style={{ backgroundColor: color }}
                      />
                      <span className="text-xs text-gray-700 dark:text-gray-300 font-mono">{color}</span>
                    </div>
                  ))}
                </div>
              </div>
              <Separator />
            </>
          )}

          {/* Product Information */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Target className="h-5 w-5 text-primary" />
              <h3 className="text-lg font-medium">Product Information</h3>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">
                  Product Description
                </label>
                <p className="text-sm bg-gray-50 dark:bg-gray-800 p-3 rounded-md border whitespace-pre-wrap">
                  {getAssetValue('product_description') || 'Not specified'}
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">
                  Target Audience
                </label>
                <p className="text-sm bg-gray-50 dark:bg-gray-800 p-3 rounded-md border whitespace-pre-wrap">
                  {getAssetValue('target_audience') || 'Not specified'}
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">
                  Key Benefits
                </label>
                <p className="text-sm bg-gray-50 dark:bg-gray-800 p-3 rounded-md border whitespace-pre-wrap">
                  {getAssetValue('key_benefits') || 'Not specified'}
                </p>
              </div>
            </div>
          </div>

          <Separator />

          {/* Brand Voice & Features */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Lightbulb className="h-5 w-5 text-primary" />
              <h3 className="text-lg font-medium">Brand Voice & Features</h3>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">
                  Tone of Voice
                </label>
                <p className="text-sm bg-gray-50 dark:bg-gray-800 p-3 rounded-md border">
                  {getAssetValue('tone_of_voice') || 'Not specified'}
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">
                  Font Direction
                </label>
                <p className="text-sm bg-gray-50 dark:bg-gray-800 p-3 rounded-md border">
                  {getAssetValue('font_direction') || 'Not specified'}
                </p>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">
                Core Features
              </label>
              <p className="text-sm bg-gray-50 dark:bg-gray-800 p-3 rounded-md border whitespace-pre-wrap">
                {getAssetValue('core_features') || 'Not specified'}
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">
                Functional Benefits
              </label>
              <p className="text-sm bg-gray-50 dark:bg-gray-800 p-3 rounded-md border whitespace-pre-wrap">
                {getAssetValue('functional_benefits') || 'Not specified'}
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">
                Emotional/Lifestyle Benefits
              </label>
              <p className="text-sm bg-gray-50 dark:bg-gray-800 p-3 rounded-md border whitespace-pre-wrap">
                {getAssetValue('emotional_lifestyle_benefits') || 'Not specified'}
              </p>
            </div>
          </div>

          <Separator />

          {/* Value Propositions & Proof Points */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Star className="h-5 w-5 text-primary" />
              <h3 className="text-lg font-medium">Value Propositions & Proof Points</h3>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">
                Value Propositions
              </label>
              <p className="text-sm bg-gray-50 dark:bg-gray-800 p-3 rounded-md border whitespace-pre-wrap">
                {getAssetValue('value_propositions') || 'Not specified'}
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">
                Proof Points
              </label>
              <p className="text-sm bg-gray-50 dark:bg-gray-800 p-3 rounded-md border whitespace-pre-wrap">
                {getAssetValue('proof_points') || 'Not specified'}
              </p>
            </div>
          </div>

          <Separator />

          {/* Images */}
          <div className="space-y-6">
            <div className="flex items-center gap-2">
              <Award className="h-5 w-5 text-primary" />
              <h3 className="text-lg font-medium">Images</h3>
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
              {/* Logo Section */}
              {getImageUrl('logo') && (
                <div className="lg:col-span-1">
                  <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
                    <div className="text-center mb-3">
                      <span className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">Logo</span>
                    </div>
                    <div className="bg-white dark:bg-gray-900 rounded-md p-3 border border-gray-200 dark:border-gray-700">
                      <img 
                        src={getImageUrl('logo')} 
                        alt="Logo" 
                        className="w-full h-20 object-contain"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Product Images Section */}
              {(() => {
                // Collect all product and app images
                const allImages = [];
                
                // Add product images
                [1, 2].forEach(num => {
                  const imageUrl = getImageUrl(`product_image_${num}`);
                  if (imageUrl) {
                    allImages.push({
                      url: imageUrl,
                      alt: `Product ${num}`,
                      key: `product_${num}`
                    });
                  }
                });
                
                // Add app images
                [1, 2].forEach(num => {
                  const imageUrl = getImageUrl(`app_image_${num}`);
                  if (imageUrl) {
                    allImages.push({
                      url: imageUrl,
                      alt: `App Screenshot ${num}`,
                      key: `app_${num}`
                    });
                  }
                });
                
                // Determine column span based on number of images
                let colSpan = 'lg:col-span-1'; // Default for 1 image
                if (allImages.length === 2) colSpan = 'lg:col-span-2';
                else if (allImages.length === 3) colSpan = 'lg:col-span-3';
                else if (allImages.length === 4) colSpan = 'lg:col-span-4';
                
                // Determine grid layout for images
                let gridCols = 'grid-cols-1';
                if (allImages.length === 2) gridCols = 'grid-cols-2';
                else if (allImages.length === 3) gridCols = 'grid-cols-3';
                else if (allImages.length === 4) gridCols = 'grid-cols-2 lg:grid-cols-4';
                
                return allImages.length > 0 && (
                  <div className={colSpan}>
                    <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700 h-full">
                      <div className="text-center mb-3">
                        <span className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">Product Images</span>
                      </div>
                      <div className={`grid gap-2 ${gridCols}`}>
                        {allImages.map(image => (
                          <div key={image.key} className="bg-white dark:bg-gray-900 rounded-md p-3 border border-gray-200 dark:border-gray-700">
                            <img 
                              src={image.url} 
                              alt={image.alt} 
                              className="w-full h-20 object-contain"
                            />
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                );
              })()}
            </div>

            {/* Show message if no images */}
            {!getImageUrl('logo') && 
             ![1, 2].some(num => getImageUrl(`product_image_${num}`)) && 
             ![1, 2].some(num => getImageUrl(`app_image_${num}`)) && (
              <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                <Award className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>No images available</p>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default AdDetailsModal;
