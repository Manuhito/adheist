import React from 'react';
import { createRoot } from 'react-dom/client';
import ProfilePage from './ProfilePage';

document.addEventListener('DOMContentLoaded', () => {
  const container = document.getElementById('profile-container');
  if (container) {
    const root = createRoot(container);
    root.render(<ProfilePage />);
  } else {
    console.error('Container #profile-container not found');
  }
});
