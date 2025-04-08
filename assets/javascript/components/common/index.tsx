'use client';

import React from 'react';

// Reemplazo para next/image
export function Image({ src, alt, width, height, className, ...props }: {
  src: string;
  alt: string;
  width?: number;
  height?: number;
  className?: string;
  [key: string]: any;
}) {
  return (
    <img 
      src={src} 
      alt={alt}
      width={width}
      height={height}
      className={className}
      {...props}
    />
  );
}

// Reemplazo para next/link
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
        href={href}
        className={className}
        target="_blank"
        rel="noopener noreferrer"
        {...props}
      >
        {children}
      </a>
    );
  }

  // Para URLs internas
  return (
    <a 
      href={href}
      className={className}
      {...props}
    >
      {children}
    </a>
  );
}
