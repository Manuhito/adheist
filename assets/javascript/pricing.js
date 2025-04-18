import React from 'react';
import { createRoot } from 'react-dom/client';
import { PricingSection } from './components/blocks/pricing-section';

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
          name: "Free",
          description: "Basic features for individuals",
          price: {
            monthly: 0,
            yearly: 0
          },
          features: [
            "3 ad requests per month",
            "Basic templates",
            "Standard support"
          ],
          cta: "Get Started",
          highlighted: false,
          popular: false
        },
        {
          name: "Pro",
          description: "Advanced features for professionals",
          price: {
            monthly: 29,
            yearly: 24
          },
          features: [
            "20 ad requests per month",
            "Premium templates",
            "Priority support",
            "Custom branding"
          ],
          cta: "Upgrade to Pro",
          highlighted: true,
          popular: true
        },
        {
          name: "Team",
          description: "For teams and businesses",
          price: {
            monthly: 49,
            yearly: 39
          },
          features: [
            "50 ad requests per month",
            "All premium templates",
            "24/7 support",
            "Custom branding",
            "Team collaboration"
          ],
          cta: "Upgrade to Team",
          highlighted: false,
          popular: false
        },
        {
          name: "Enterprise",
          description: "For large organizations",
          price: {
            monthly: "Custom",
            yearly: "Custom"
          },
          features: [
            "Unlimited ad requests",
            "Custom templates",
            "Dedicated support",
            "API access",
            "Advanced analytics"
          ],
          cta: "Contact Sales",
          highlighted: false,
          popular: false
        }
      ]
    };
    
    const root = createRoot(container);
    root.render(
      <PricingSection 
        title={pricingData.title}
        subtitle={pricingData.subtitle}
        tiers={pricingData.tiers}
        frequencies={pricingData.frequencies}
      />
    );
  }
});
