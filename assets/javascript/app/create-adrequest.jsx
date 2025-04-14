import React from 'react';
import { createRoot } from 'react-dom/client';
import { SearchComponent } from './components/SearchComponent';
import { FilterFormComponent } from './components/FilterFormComponent';

/**
 * Main component for the Create Ad Request page
 * Includes search functionality and filter form for industries and tags
 */
const CreateAdRequestApp = () => {
  return (
    <div className="space-y-6 flex flex-col items-center w-full">
      <SearchComponent />
      <FilterFormComponent />
    </div>
  );
};

/**
 * Mount the React application to the DOM when the document is loaded
 */
document.addEventListener('DOMContentLoaded', () => {
  const mountPoint = document.getElementById('create-adrequest-app');
  
  if (mountPoint) {
    const root = createRoot(mountPoint);
    root.render(<CreateAdRequestApp />);
  } else {
    console.error('Could not find mount point for Create Ad Request app');
  }
});
