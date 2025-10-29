import React from 'react';
import { createRoot } from 'react-dom/client';

const UgcVideoPage = () => {
  return (
    <div>
      <h1>UGC Video Page</h1>
      <p>This is the UGC Video page.</p>
    </div>
  );
};

document.addEventListener('DOMContentLoaded', () => {
  const container = document.getElementById('ugc-video-page-container');
  if (container) {
    const root = createRoot(container);
    root.render(<UgcVideoPage />);
  }
});
