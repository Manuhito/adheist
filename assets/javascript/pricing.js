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
    // Get pricing data from window object
    const pricingData = window.__PRICING_DATA__ || {
      title: "Pricing Plans",
      subtitle: "Choose the perfect plan for your needs",
      frequencies: ["monthly", "yearly"],
      tiers: [
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
      ]
    };
    
    const root = createRoot(container);
    root.render(
      <PricingSection 
        title={pricingData.title}
        subtitle={pricingData.subtitle}
        tiers={pricingData.tiers}
        frequencies={pricingData.frequencies}
        onSubscribe={handleSubscribe}
      />
    );
  }
});
