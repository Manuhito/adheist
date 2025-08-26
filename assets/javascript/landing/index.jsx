"use client";

import React from 'react';
import { createRoot } from 'react-dom/client';
import Hero from "@/components/sections/hero";
import Logos from "@/components/sections/logos";
import Problem from "@/components/sections/problem";
import FeaturesSection from "@/components/sections/features-section";
import SolutionSection from "@/components/sections/solution-section";
import CTA from "@/components/sections/cta";
// Import the FAQ component that matches the dedicated FAQ page styling
import FAQ from "./faq";

const LandingPage = () => {
  return (
    <div className="space-y-16">
      <Hero />
      <Logos />
      <Problem />
      <FeaturesSection />
      <SolutionSection />
      <CTA />
      <FAQ />
    </div>
  );
};

// Wait for base layout before mounting
const init = () => {

  const waitForBaseLayout = () => {
    if (window.baseLayoutReady) {
      const mountNode = document.getElementById('page-content-mount');
      if (mountNode) {
        const root = createRoot(mountNode);
        root.render(<LandingPage />);
      } else {
        console.error("Could not find page-content-mount element");
      }
    } else {
      setTimeout(waitForBaseLayout, 50);
    }
  };

  waitForBaseLayout();
};

// Start initialization when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}