import React from 'react';
import { createRoot } from 'react-dom/client';
import PricingPage from './page';

const container = document.getElementById('pricing-section-container');
if (container) {
  const root = createRoot(container);
  root.render(<PricingPage />);
}
