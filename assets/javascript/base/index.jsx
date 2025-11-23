import React, { useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import Footer from "@/components/sections/footer";
import Header from "@/components/sections/header";
import { ThemeProvider } from "@/components/theme-provider";
import { ThemeToggle } from "@/components/theme-toggle";
import { useTranslation } from "@/lib/useTranslation";

const BaseLayout = () => {
  // Inicializar el hook de traducción para que esté disponible en los componentes hijos
  const { t } = useTranslation();
  useEffect(() => {
    // Si hay contenido Django, moverlo al mount point
    const djangoContent = document.getElementById('page-content');
    const mountPoint = document.getElementById('page-content-mount');

    if (djangoContent && mountPoint && djangoContent.innerHTML.trim()) {
      // Solo mover si es contenido Django (no React)
      if (!window.isReactPage) {
        mountPoint.innerHTML = djangoContent.innerHTML;
        // Clear original content so crawlers only see one set of headings
        djangoContent.innerHTML = '';
        djangoContent.style.display = 'none';
      }
    }

    // Señalar que el layout está listo
    window.baseLayoutReady = true;
  }, []);

  return (
    <ThemeProvider defaultTheme="light" storageKey="theme">
      <main className="min-h-screen flex flex-col">
        <Header />
        <div className="flex-grow container mx-auto px-4">
          <div id="page-content-mount" />
        </div>
        <Footer />
      </main>
    </ThemeProvider>
  );
};

const init = () => {
  const mountNode = document.getElementById('root');
  if (mountNode) {
    const root = createRoot(mountNode);
    root.render(<BaseLayout />);
  }
};

// Esperar a que el DOM esté listo
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}