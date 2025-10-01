import React from 'react';
import { createRoot } from 'react-dom/client';
import { BillingPage } from './page';

// Helper to get CSRF token from cookie
function getCookie(name) {
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) return parts.pop().split(';').shift();
}

// Handler to create a Stripe PaymentIntent for a priceId
async function handleCreatePaymentIntent(priceId) {
  try {
    const response = await fetch('/ads/create-payment-intent/', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'X-CSRFToken': getCookie('csrftoken'),
      },
      body: `priceId=${encodeURIComponent(priceId)}`,
      credentials: 'include',
    });
    const data = await response.json();

    if (response.ok && data.clientSecret) {
      console.log('Payment intent created successfully:', {
        clientSecret: data.clientSecret,
        publishableKey: data.publishableKey,
        amount: data.amount,
        currency: data.currency
      });

      // Store payment data in sessionStorage for the payment page
      sessionStorage.setItem('stripePaymentData', JSON.stringify({
        clientSecret: data.clientSecret,
        publishableKey: data.publishableKey,
        amount: data.amount,
        currency: data.currency
      }));

      // Navigate to payment page
      window.location.href = '/ads/payment/';
    } else {
      alert('Error creating payment intent: ' + (data.error || 'Unknown error'));
    }
  } catch (err) {
    alert('Network error: ' + err);
  }
}

// Initialize the component when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  function checkAndMount() {
    if (window.sidebarLayoutReady) {
      const container = document.getElementById('sidebar-page-content');
      if (container) {
        // Get pricing data from window object
        const pricingData = window.__PRICING_DATA__;

        // Create root and render component
        const root = createRoot(container);
        root.render(
          <BillingPage
            pricingData={pricingData}
            onSubscribe={handleCreatePaymentIntent}
          />
        );
      }
    } else {
      // Wait for sidebar layout to be ready
      setTimeout(checkAndMount, 50);
    }
  }
  
  checkAndMount();
});
