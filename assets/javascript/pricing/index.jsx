"use client";

import { ThemeProvider } from '@/lib/theme-context';
import { ThemeToggle } from '@/components/theme-toggle';
// import { TailwindIndicator } from '@/components/tailwind-indicator';
import Footer from "@/components/sections/footer";
import Header from "@/components/sections/header";
import React from 'react';
import { createRoot } from 'react-dom/client';
import Pricing from "@/components/sections/pricing";

const PricingLayout = () => {
  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="light"
      enableSystem={false}
    >
      <main>
        <Header />
        <Pricing />
        <Footer />
      </main>
      <ThemeToggle />
    </ThemeProvider>
  );
};

// Montar en el DOM
const mountNode = document.getElementById('pricing-root');
if (mountNode) {
  createRoot(mountNode).render(<PricingLayout />);
}
