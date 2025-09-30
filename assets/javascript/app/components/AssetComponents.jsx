import React from 'react';
import { Card, CardContent } from '@/components/ui/card.tsx';
import { Image as ImageIcon } from 'lucide-react';

/**
 * Helper function to format dates consistently
 */
const formatDate = (dateString) => {
  if (!dateString) return '';
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });
};

/**
 * Asset card component for grid view
 */
export function AssetCard({ asset, onClick, selectable = false, selected = false }) {
  const imageUrl = asset.image_url || asset.url;
  const filename = asset.original_filename || asset.filename || 'asset.jpg';

  const handleClick = () => {
    if (onClick) {
      onClick(asset);
    }
  };

  return (
    <Card 
      className={`hover:bg-gray-50 transition-colors cursor-pointer rounded-xl ${
        selectable && selected ? 'ring-2 ring-primary border-primary' : ''
      }`}
      onClick={handleClick}
    >
      <CardContent className="p-2">
        <div className="space-y-2">
          {/* Image - Maximum space */}
          <div className="aspect-square rounded-lg overflow-hidden bg-gray-100 flex items-center justify-center">
            {imageUrl ? (
              <img
                src={imageUrl}
                alt="Asset"
                className="w-full h-full object-cover"
              />
            ) : (
              <ImageIcon className="w-12 h-12 text-gray-400" />
            )}
          </div>

          {/* Asset Info - Minimal */}
          <div className="px-1">
            <p className="text-xs text-gray-900 truncate">
              {filename}
            </p>
            <p className="text-xs text-gray-500">
              {formatDate(asset.created_at)}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * Asset list item component for list view
 */
export function AssetListItem({ asset, onClick, selectable = false, selected = false }) {
  const imageUrl = asset.image_url || asset.url;
  const filename = asset.original_filename || asset.filename || 'asset.jpg';

  const handleClick = () => {
    if (onClick) {
      onClick(asset);
    }
  };

  return (
    <Card 
      className={`hover:bg-gray-50 transition-colors cursor-pointer rounded-xl ${
        selectable && selected ? 'ring-2 ring-primary border-primary' : ''
      }`}
      onClick={handleClick}
    >
      <CardContent className="p-4">
        <div className="flex items-center space-x-4">
          {/* Thumbnail */}
          <div className="w-16 h-16 rounded-lg overflow-hidden bg-gray-100 flex items-center justify-center flex-shrink-0">
            {imageUrl ? (
              <img 
                src={imageUrl} 
                alt="Asset"
                className="w-full h-full object-cover"
              />
            ) : (
              <ImageIcon className="w-6 h-6 text-gray-400" />
            )}
          </div>
          
          {/* Asset Info */}
          <div className="flex-1 min-w-0">
            <p className="text-sm text-gray-900 truncate">
              {filename}
            </p>
            <p className="text-xs text-gray-500">
              {formatDate(asset.created_at)}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * Container component that renders assets in grid or list view
 */
export function AssetsContainer({ assets, viewMode, onAssetClick, selectable = false, selectedAsset = null }) {
  if (viewMode === 'grid') {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
        {assets.map((asset) => (
          <AssetCard 
            key={asset.id} 
            asset={asset} 
            onClick={onAssetClick}
            selectable={selectable}
            selected={selectable && selectedAsset?.id === asset.id}
          />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {assets.map((asset) => (
        <AssetListItem 
          key={asset.id} 
          asset={asset} 
          onClick={onAssetClick}
          selectable={selectable}
          selected={selectable && selectedAsset?.id === asset.id}
        />
      ))}
    </div>
  );
}
