'use client';

import React from 'react';
import { createRoot } from 'react-dom/client';
import BlogPost from './page';

document.addEventListener('DOMContentLoaded', () => {
  function checkAndMount() {
    if (window.baseLayoutReady) {
      // Montar en page-content-mount en lugar de blog-post-root
      const container = document.getElementById('page-content-mount');
      if (container) {
        // Acceder a los datos a través de window.__BLOG_POST_DATA__
        const postData = window.__BLOG_POST_DATA__ || {};
        
        console.log('Mounting BlogPost component with translations:', window.__TRANSLATIONS__);
        const root = createRoot(container);
        root.render(
          <React.StrictMode>
            <BlogPost post={postData} />
          </React.StrictMode>
        );
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
