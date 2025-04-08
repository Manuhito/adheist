import { createRoot } from 'react-dom/client';
import Blog from './page';

const container = document.getElementById('blog-root');
if (container) {
  const root = createRoot(container);
  root.render(<Blog />);
}
