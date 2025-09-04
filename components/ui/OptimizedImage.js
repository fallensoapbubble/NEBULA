/**
 * Optimized image component with Next.js Image integration
 * Provides automatic optimization, lazy loading, and responsive sizing
 */

import Image from 'next/image';
import { useState } from 'react';
import { ImageOptimizer } from '../../lib/performance-optimizer';

export default function OptimizedImage({
  src,
  alt,
  width,
  height,
  className = '',
  priority = false,
  quality = 75,
  fill = false,
  sizes,
  placeholder = 'blur',
  onLoad,
  onError,
  ...props
}) {
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  const handleLoad = (event) => {
    setIsLoading(false);
    onLoad?.(event);
  };

  const handleError = (event) => {
    setIsLoading(false);
    setHasError(true);
    onError?.(event);
  };

  // Generate optimized props
  const optimizedProps = ImageOptimizer.getOptimizedProps(src, {
    width,
    height,
    quality,
    priority,
  });

  if (hasError) {
    return (
      <div 
        className={`bg-white/5 flex items-center justify-center ${className}`}
        style={{ width, height }}
      >
        <div className="text-white/40 text-sm">Failed to load image</div>
      </div>
    );
  }

  return (
    <div className={`relative ${className}`}>
      <Image
        {...optimizedProps}
        alt={alt}
        fill={fill}
        sizes={sizes || optimizedProps.sizes}
        placeholder={placeholder}
        onLoad={handleLoad}
        onError={handleError}
        className={`transition-opacity duration-300 ${
          isLoading ? 'opacity-0' : 'opacity-100'
        }`}
        {...props}
      />
      
      {isLoading && (
        <div 
          className="absolute inset-0 bg-white/5 animate-pulse flex items-center justify-center"
          style={{ width, height }}
        >
          <div className="text-white/40 text-sm">Loading...</div>
        </div>
      )}
    </div>
  );
}

/**
 * Avatar component with optimized loading
 */
export function OptimizedAvatar({ 
  src, 
  alt, 
  size = 40, 
  className = '',
  fallback,
  ...props 
}) {
  return (
    <OptimizedImage
      src={src}
      alt={alt}
      width={size}
      height={size}
      className={`rounded-full ${className}`}
      quality={85}
      placeholder="blur"
      {...props}
    />
  );
}

/**
 * Template preview image with responsive sizing
 */
export function TemplatePreviewImage({ 
  src, 
  alt, 
  className = '',
  ...props 
}) {
  return (
    <OptimizedImage
      src={src}
      alt={alt}
      width={400}
      height={300}
      className={`rounded-lg ${className}`}
      sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 400px"
      quality={80}
      {...props}
    />
  );
}

/**
 * Portfolio hero image with priority loading
 */
export function HeroImage({ 
  src, 
  alt, 
  className = '',
  ...props 
}) {
  return (
    <OptimizedImage
      src={src}
      alt={alt}
      width={1200}
      height={600}
      className={className}
      priority={true}
      quality={90}
      sizes="100vw"
      {...props}
    />
  );
}