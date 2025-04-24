import React from 'react';
import { createRoot } from 'react-dom/client';
import { PaymentPage } from './components/blocks/payment-page';

// Wait for DOM to be ready
document.addEventListener('DOMContentLoaded', () => {
  const container = document.getElementById('payment-page-container');
  
  if (container) {
    const root = createRoot(container);
    root.render(<PaymentPage />);
  }
});
