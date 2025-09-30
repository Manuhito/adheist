import React from 'react';
import { createRoot } from 'react-dom/client';
import ProfilePage from './ProfilePage';

// Initialize the component when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  function checkAndMount() {
    if (window.sidebarLayoutReady) {
      const container = document.getElementById('sidebar-page-content');
      if (container) {
        const root = createRoot(container);
        root.render(<ProfilePage />);
      }
    } else {
      // Wait for sidebar layout to be ready
      setTimeout(checkAndMount, 50);
    }
  }
  
  checkAndMount();
});
