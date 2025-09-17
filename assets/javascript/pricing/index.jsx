import React from 'react';
import { createRoot } from 'react-dom/client';
import PricingPage from './page';

document.addEventListener('DOMContentLoaded', () => {
  // First try to mount in pricing-section-container
  const pricingContainer = document.getElementById('pricing-section-container');
  if (pricingContainer) {
    console.log('Mounting PricingPage in pricing-section-container');
    const root = createRoot(pricingContainer);
    root.render(<PricingPage />);
    return;
  }
  
  // Fallback to page-content-mount if pricing-section-container doesn't exist
  function checkAndMount() {
    if (window.baseLayoutReady) {
      const container = document.getElementById('page-content-mount');
      if (container) {
        console.log('Mounting PricingPage in page-content-mount');
        const root = createRoot(container);
        root.render(<PricingPage />);
      }
    } else {
      // Wait for BaseLayout to be ready
      setTimeout(checkAndMount, 50);
    }
  }
  
  checkAndMount();
});
