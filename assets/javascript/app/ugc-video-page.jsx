import React, { useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import { Button } from '@/components/ui/button';

const UgcVideoPage = () => {

  useEffect(() => {
    const HeaderContent = (
      <div className="flex items-center justify-end w-full">
        <Button>Generate</Button>
      </div>
    );

    if (window.setAppHeader) {
      window.setAppHeader(HeaderContent);
    }

    return () => {
      if (window.clearAppHeader) {
        window.clearAppHeader();
      }
    };
  }, []);

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
