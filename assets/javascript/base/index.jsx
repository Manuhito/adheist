import React from 'react';
import { createRoot } from 'react-dom/client';
import Footer from "@/components/sections/footer";
import Header from "@/components/sections/header";
import { ThemeProvider } from "@/lib/theme-context";
import { ThemeToggle } from "@/components/theme-toggle";

const BaseLayout = ({ children }) => {
  return (
    <ThemeProvider>
      <main className="min-h-screen">
        <Header />
        <div className="container mx-auto px-4">
          {children}
        </div>
        <Footer />
        <ThemeToggle />
      </main>
    </ThemeProvider>
  );
};

// Componente raíz que se montará en el DOM
const BaseApp = () => {
  return (
    <BaseLayout>
      <div id="content-wrapper"></div>
    </BaseLayout>
  );
};

// Montar en el DOM
const mountNode = document.getElementById('root');
if (mountNode) {
  const root = createRoot(mountNode);
  root.render(<BaseApp />);
}

export default BaseLayout;