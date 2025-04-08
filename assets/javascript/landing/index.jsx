"use client";

import { createRoot } from 'react-dom/client';
import Hero from "@/components/sections/hero";
import Logos from "@/components/sections/logos";
import Problem from "@/components/sections/problem";
import HowItWorks from "@/components/sections/how-it-works";
import Solution from "@/components/sections/solution";
import CTA from "@/components/sections/cta";

const LandingPage = () => {
  return (
    <div className="space-y-16">
      <Hero />
      <Logos />
      <Problem />
      <HowItWorks />
      <Solution />
      <CTA />
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