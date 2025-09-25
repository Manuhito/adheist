import React from 'react';
import { Grid3x3, List } from 'lucide-react';

/**
 * Toggle component for switching between grid and list view modes
 */
export function ViewModeToggle({ viewMode, setViewMode, className = "" }) {
  return (
    <div className={`flex items-center space-x-1 bg-muted rounded-lg p-1 flex-shrink-0 ${className}`}>
      <button
        onClick={() => setViewMode('grid')}
        className={`p-2 rounded-md transition-colors ${
          viewMode === 'grid'
            ? 'bg-background text-primary shadow-sm'
            : 'text-muted-foreground hover:text-primary'
        }`}
        title="Grid view"
      >
        <Grid3x3 className="h-4 w-4" />
      </button>
      <button
        onClick={() => setViewMode('list')}
        className={`p-2 rounded-md transition-colors ${
          viewMode === 'list'
            ? 'bg-background text-primary shadow-sm'
            : 'text-muted-foreground hover:text-primary'
        }`}
        title="List view"
      >
        <List className="h-4 w-4" />
      </button>
    </div>
  );
}

export default ViewModeToggle;
