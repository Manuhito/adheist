import React from 'react';
import { createRoot } from 'react-dom/client';
import { UpdatePaymentMethodPage } from './components/blocks/update-payment-method-page';

// Wait for DOM to be ready
document.addEventListener('DOMContentLoaded', () => {
  const container = document.getElementById('update-payment-method-container');

  if (container) {
    const root = createRoot(container);
    root.render(<UpdatePaymentMethodPage />);
  }
});
