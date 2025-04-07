import React from 'react';
import { createRoot } from 'react-dom/client';
import Footer from "@/components/sections/footer";
import Header from "@/components/sections/header";
import { ThemeProvider } from "@/lib/theme-context";
import { ThemeToggle } from "@/components/theme-toggle";

const BaseLayout = () => {
  console.log("BaseLayout renderizado");
  return (
    <ThemeProvider>
      <main className="min-h-screen flex flex-col">
        <Header />
        <div className="flex-grow container mx-auto px-4">
          <div id="page-content-mount" />
        </div>
        <Footer />
        <ThemeToggle />
      </main>
    </ThemeProvider>
  );
};

// Initialize base layout
const init = () => {
  console.log("Initializing base layout...");
  const mountNode = document.getElementById('root');
  if (mountNode) {
    const root = createRoot(mountNode);
    root.render(<BaseLayout />);
    
    // Signal that base layout is ready
    window.baseLayoutReady = true;
    console.log("Base layout ready for page content");
  }
};

init();