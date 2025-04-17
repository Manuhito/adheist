import React from 'react';
import { createRoot } from 'react-dom/client';
import Pricing from './components/sections/pricing';

// Wait for DOM to be ready
document.addEventListener('DOMContentLoaded', () => {
  const container = document.getElementById('pricing-section-container');
  
  if (container) {
    const root = createRoot(container);
    root.render(<Pricing />);
  }
});
