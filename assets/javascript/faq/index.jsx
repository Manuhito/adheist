import React from 'react';
import { createRoot } from 'react-dom/client';
import FAQPage from './page';

// Wait for BaseLayout to be ready and create page-content-mount
document.addEventListener('DOMContentLoaded', () => {
  function checkAndMount() {
    if (window.baseLayoutReady) {
      const container = document.getElementById('page-content-mount');
      if (container) {
        console.log('Mounting FAQPage in page-content-mount');
        const root = createRoot(container);
        root.render(<FAQPage />);
      }
    } else {
      // Wait for BaseLayout to be ready
      setTimeout(checkAndMount, 50);
    }
  }
  
  checkAndMount();
});
