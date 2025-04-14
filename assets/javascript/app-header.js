import React from 'react';
import { createRoot } from 'react-dom/client';
import AppHeader from './components/sections/app-header';

document.addEventListener('DOMContentLoaded', () => {
  const appHeaderContainer = document.getElementById('app-header-container');
  
  if (appHeaderContainer) {
    const root = createRoot(appHeaderContainer);
    root.render(React.createElement(AppHeader));
  }
});
