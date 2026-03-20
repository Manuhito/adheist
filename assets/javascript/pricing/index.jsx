import React from 'react';
import { createRoot } from 'react-dom/client';
import PricingPage from './page';

document.addEventListener('DOMContentLoaded', () => {
  function checkAndMount() {
    if (window.baseLayoutReady) {
      const container = document.getElementById('page-content-mount');
      if (container) {
        console.log('Mounting PricingPage in page-content-mount');
        const root = createRoot(container);
        root.render(<PricingPage />);
      } else {
        console.error('Container #page-content-mount not found');
      }
    } else {
      setTimeout(checkAndMount, 50);
    }
  }

  checkAndMount();
});
