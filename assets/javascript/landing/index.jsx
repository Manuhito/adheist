"use client";

import { ThemeProvider } from '@/lib/theme-context';
import { ThemeToggle } from '@/components/theme-toggle';
// import { TailwindIndicator } from '@/components/tailwind-indicator';
import CTA from "@/components/sections/cta";
import Footer from "@/components/sections/footer";
import Header from "@/components/sections/header";
import Hero from "@/components/sections/hero";
import HowItWorks from "@/components/sections/how-it-works";
import Logos from "@/components/sections/logos";
import Problem from "@/components/sections/problem";
import Solution from "@/components/sections/solution";
import React from 'react';
import { createRoot } from 'react-dom/client';

const LandingPage = () => {
  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="light"
      enableSystem={false}
    >
      <main>
        <Header />
        <Hero />
        <Logos />
        <Problem />
        <HowItWorks />
        <Solution />
        {/* <Blog /> */}
        <CTA />
        <Footer />
      </main>
      <ThemeToggle />
    </ThemeProvider>
  );
};

// Montar en el DOM
const mountNode = document.getElementById('root');
if (mountNode) {
  createRoot(mountNode).render(<LandingPage />);
}