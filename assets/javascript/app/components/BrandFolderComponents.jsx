import React from 'react';
import { Card, CardContent } from '@/components/ui/card.tsx';
import { FolderClosed } from 'lucide-react';

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
 * Brand folder card component for grid view
 */
export function BrandFolderCard({ brand, onClick }) {
  return (
    <Card 
      className="hover:bg-gray-50 transition-colors cursor-pointer rounded-xl"
      onClick={() => onClick(brand)}
    >
      <CardContent className="p-4">
        <div className="flex items-start space-x-3">
          {/* Folder Icon */}
          <div className="flex-shrink-0">
            <FolderClosed className="w-12 h-12 text-primary" />
          </div>

          {/* Brand Info */}
          <div className="flex-1 min-w-0">
            <p className="text-xs text-gray-500 mb-1">
              {formatDate(brand.created_at)}
            </p>
            <h3 className="text-gray-900 truncate">
              {brand.name}
            </h3>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * Brand folder list item component for list view
 */
export function BrandFolderListItem({ brand, onClick }) {
  return (
    <Card 
      className="hover:bg-gray-50 transition-colors cursor-pointer rounded-xl"
      onClick={() => onClick(brand)}
    >
      <CardContent className="p-4">
        <div className="flex items-center space-x-3">
          {/* Folder Icon */}
          <div className="flex-shrink-0">
            <FolderClosed className="w-8 h-8 text-primary" />
          </div>
          
          {/* Brand Info */}
          <div className="flex-1 min-w-0">
            <p className="text-xs text-gray-500 mb-1">
              {formatDate(brand.created_at)}
            </p>
            <p className="text-gray-900 truncate">
              {brand.name}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * Container component that renders brands in grid or list view
 */
export function BrandsContainer({ brands, viewMode, onBrandClick }) {
  if (viewMode === 'grid') {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
        {brands.map((brand) => (
          <BrandFolderCard 
            key={brand.id} 
            brand={brand} 
            onClick={onBrandClick}
          />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {brands.map((brand) => (
        <BrandFolderListItem 
          key={brand.id} 
          brand={brand} 
          onClick={onBrandClick}
        />
      ))}
    </div>
  );
}
