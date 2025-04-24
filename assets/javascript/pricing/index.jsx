import React from 'react';
import { createRoot } from 'react-dom/client';
import PricingPage from './page';

// Esperar a que BaseLayout esté listo y haya creado page-content-mount
document.addEventListener('DOMContentLoaded', () => {
  function checkAndMount() {
    if (window.baseLayoutReady) {
      const container = document.getElementById('page-content-mount');
      if (container) {
        console.log('Mounting PricingPage in page-content-mount');
        const root = createRoot(container);
        root.render(<PricingPage />);
      }
    } else {
      // Esperar a que BaseLayout esté listo
      setTimeout(checkAndMount, 50);
    }
  }
  
  checkAndMount();
});
