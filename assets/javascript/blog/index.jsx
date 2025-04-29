import React from 'react';
import { createRoot } from 'react-dom/client';
import Blog from './page';

document.addEventListener('DOMContentLoaded', () => {
  function checkAndMount() {
    if (window.baseLayoutReady) {
      // Montar en page-content-mount en lugar de blog-root
      const container = document.getElementById('page-content-mount');
      if (container) {
        console.log('Mounting Blog component with translations:', window.__TRANSLATIONS__);
        const root = createRoot(container);
        root.render(<Blog />);
      } else {
        console.error('Container #page-content-mount not found');
      }
    } else {
      // Esperar a que BaseLayout esté listo
      setTimeout(checkAndMount, 50);
    }
  }
  
  checkAndMount();
});
