'use client';

import { createRoot } from 'react-dom/client';
import BlogPost from './page';

const container = document.getElementById('blog-post-root');
if (container) {
  const root = createRoot(container);
  const blogDataElement = document.getElementById('blogPostData');
  const postData = blogDataElement ? JSON.parse(blogDataElement.textContent || '{}') : {};
    
  root.render(
    <React.StrictMode>
      <BlogPost post={postData} />
    </React.StrictMode>
  );
}
