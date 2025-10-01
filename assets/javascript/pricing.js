import React from 'react';
import { createRoot } from 'react-dom/client';
import { PricingSection } from './components/blocks/pricing-section';

// Helper to get CSRF token from cookie
function getCookie(name) {
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) return parts.pop().split(';').shift();
}

// Handler para redireccionar a la página de billing
function handleSubscribe(priceId) {
  // Para usuarios no autenticados, redirigir a la página de billing
  window.location.href = '/ads/billing/';
}

// Wait for DOM to be ready
document.addEventListener('DOMContentLoaded', () => {
  const container = document.getElementById('pricing-section-container');
  
  if (container) {
    console.log('Container found, mounting pricing component');
    
    try {
      // Get pricing data from window object
      const rawData = window.__PRICING_DATA__ || '{}';
      console.log('Raw pricing data:', typeof rawData, rawData);
      
      // Parse the data if it's a string
      const pricingData = typeof rawData === 'string' ? JSON.parse(rawData) : rawData;
      console.log('Parsed pricing data:', pricingData);
      
      // Use default data if no tiers are available
      if (!pricingData.tiers || pricingData.tiers.length === 0) {
        console.log('No tiers found, using default data');
        pricingData.tiers = [
          {
            name: "Beta",
            description: "Basic features for individuals",
            price: {
              monthly: 0,
              yearly: 0
            },
            features: [
              "Search 1M+ Ads Library",
              "Unlimited Ads (With Feedback)",
              "Unlimited Revisions (With Feedback)",
              "20 BrandKits",
              "5 GB of assets"
            ],
            cta: "Get Started",
            highlighted: false,
            popular: false
          },
        ];
      }
      
      // Ensure frequencies is an array
      if (!Array.isArray(pricingData.frequencies)) {
        console.log('Frequencies is not an array, setting default');
        pricingData.frequencies = ["monthly", "yearly"];
      }
      
      // Format frequencies for the component
      const formattedFrequencies = pricingData.frequencies.map(freq => ({
        key: freq,
        label: freq.charAt(0).toUpperCase() + freq.slice(1)
      }));
      
      console.log('Formatted frequencies:', formattedFrequencies);
      console.log('Rendering with tiers:', pricingData.tiers);
      
      const root = createRoot(container);
      root.render(
        <PricingSection 
          title={pricingData.title}
          subtitle={pricingData.subtitle}
          tiers={pricingData.tiers}
          frequencies={formattedFrequencies}
          onSubscribe={handleSubscribe}
        />
      );
    } catch (error) {
      console.error('Error rendering pricing component:', error);
      container.innerHTML = `<div class="text-center p-8"><p>Error loading pricing data. Please try again later.</p></div>`;
    }
  }
});
