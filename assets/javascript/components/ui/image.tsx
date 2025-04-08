import { cn } from '@/lib/utils';

interface ImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  src: string;
  alt: string;
  aspectRatio?: 'square' | 'video' | 'portrait' | 'wide';
}

const aspectRatioClasses = {
  square: 'aspect-square',
  video: 'aspect-video',
  portrait: 'aspect-[3/4]',
  wide: 'aspect-[16/9]'
};

export function Image({ 
  src, 
  alt, 
  aspectRatio,
  className,
  ...props 
}: ImageProps) {
  return (
    <img
      src={src}
      alt={alt}
      className={cn(
        'h-full w-full object-cover',
        aspectRatio && aspectRatioClasses[aspectRatio],
        className
      )}
      loading="lazy"
      {...props}
    />
  );
}
