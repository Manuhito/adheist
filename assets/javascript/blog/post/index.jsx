'use client';

import React from 'react';
import { createRoot } from 'react-dom/client';
import BlogPost from './page';

const container = document.getElementById('blog-post-root');
if (container) {
  const root = createRoot(container);
  const blogDataElement = document.getElementById('blogPostData');
  const postData = blogDataElement ? JSON.parse(blogDataElement.textContent || '{}') : {};
  
  console.log('Post data:', postData); // Para debug
  
  root.render(
    <React.StrictMode>
      <BlogPost post={postData} />
    </React.StrictMode>
  );
}
