import React from 'react';
import LazyImage from './LazyImage';

interface ResponsiveImageProps {
  baseUrl: string;
  alt: string;
  className?: string;
  sizes?: string;
  priority?: boolean;
  onLoad?: () => void;
  onError?: () => void;
}

interface ImageVariant {
  size: string;
  width: number;
  suffix: string;
}

const ResponsiveImage: React.FC<ResponsiveImageProps> = ({
  baseUrl,
  alt,
  className = '',
  sizes = '(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw',
  priority = false,
  onLoad,
  onError
}) => {
  // Define image variants based on CDN structure
  const variants: ImageVariant[] = [
    { size: 'small', width: 300, suffix: '_small' },
    { size: 'medium', width: 600, suffix: '_medium' },
    { size: 'large', width: 1200, suffix: '_large' },
    { size: 'original', width: 1920, suffix: '_original' }
  ];

  // Generate srcSet from base URL
  const generateSrcSet = (baseUrl: string): string => {
    const extension = baseUrl.substring(baseUrl.lastIndexOf('.'));
    const baseWithoutExt = baseUrl.substring(0, baseUrl.lastIndexOf('.'));
    
    return variants
      .map(variant => `${baseWithoutExt}${variant.suffix}${extension} ${variant.width}w`)
      .join(', ');
  };

  // Generate default src (medium size)
  const generateDefaultSrc = (baseUrl: string): string => {
    const extension = baseUrl.substring(baseUrl.lastIndexOf('.'));
    const baseWithoutExt = baseUrl.substring(0, baseUrl.lastIndexOf('.'));
    return `${baseWithoutExt}_medium${extension}`;
  };

  const srcSet = generateSrcSet(baseUrl);
  const defaultSrc = generateDefaultSrc(baseUrl);

  if (priority) {
    // For priority images, load immediately without lazy loading
    return (
      <img
        src={defaultSrc}
        srcSet={srcSet}
        sizes={sizes}
        alt={alt}
        className={className}
        onLoad={onLoad}
        onError={onError}
        loading="eager"
      />
    );
  }

  return (
    <LazyImage
      src={defaultSrc}
      srcSet={srcSet}
      sizes={sizes}
      alt={alt}
      className={className}
      onLoad={onLoad}
      onError={onError}
    />
  );
};

export default ResponsiveImage;