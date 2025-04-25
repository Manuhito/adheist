import React from 'react';
import { createRoot } from 'react-dom/client';
import AppHeader from './components/sections/app-header';

// Simple wrapper similar to BaseLayout in base/index.jsx
const AppHeaderLayout = () => {
  return (
    <div className="app-header-layout">
      <AppHeader />
    </div>
  );
};

document.addEventListener('DOMContentLoaded', () => {
  const appHeaderContainer = document.getElementById('app-header-container');
  
  if (appHeaderContainer) {
    // Ensure the container has the right styles for sticky positioning
    appHeaderContainer.style.position = 'sticky';
    appHeaderContainer.style.top = '0';
    appHeaderContainer.style.zIndex = '50';
    
    const root = createRoot(appHeaderContainer);
    root.render(<AppHeaderLayout />);
  }
});
