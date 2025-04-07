import React from 'react';

interface LinkProps extends React.AnchorHTMLAttributes<HTMLAnchorElement> {
  href: string;
  children: React.ReactNode;
}

export type Metadata = {
  title?: string;
  description?: string;
  image?: string;
  [key: string]: any;
};

export function Link({ href, className, children, ...props }: {
  href: string;
  className?: string;
  children: React.ReactNode;
  [key: string]: any;
}) {
  // Si es una URL externa, usar <a> directamente
  if (href.startsWith('http') || href.startsWith('mailto:')) {
    return (
      <a 
        href= { href }
    className = { className }
    target = "_blank"
    rel = "noopener noreferrer"
    {...props }
      >
      { children }
      </a>
    );
  }

  // Para URLs internas
  return (
    <a 
      href= { href }
  className = { className }
  {...props }
    >
    { children }
    </a>
  );
}