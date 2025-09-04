/**
 * Lazy loading section component with intersection observer
 * Optimizes performance by loading content only when visible
 */

import { useState, useEffect } from 'react';
import { useIntersectionObserver } from '../../lib/performance-optimizer';

export default function LazySection({ 
  children, 
  fallback = null, 
  className = '',
  threshold = 0.1,
  rootMargin = '100px',
  once = true,
}) {
  const { elementRef, hasIntersected, isIntersecting } = useIntersectionObserver({
    threshold,
    rootMargin,
  });

  const shouldRender = once ? hasIntersected : isIntersecting;

  return (
    <div ref={elementRef} className={className}>
      {shouldRender ? children : (fallback || <LazyFallback />)}
    </div>
  );
}

/**
 * Default loading fallback with glassmorphic styling
 */
function LazyFallback() {
  return (
    <div className="glass-card p-6 animate-pulse">
      <div className="space-y-4">
        <div className="h-4 bg-white/10 rounded w-3/4"></div>
        <div className="h-4 bg-white/10 rounded w-1/2"></div>
        <div className="h-32 bg-white/10 rounded"></div>
      </div>
    </div>
  );
}

/**
 * Lazy image component with optimized loading
 */
export function LazyImage({ 
  src, 
  alt, 
  className = '', 
  width, 
  height,
  priority = false,
  ...props 
}) {
  const { elementRef, hasIntersected } = useIntersectionObserver({
    threshold: 0.1,
    rootMargin: '50px',
  });

  return (
    <div ref={elementRef} className={className}>
      {hasIntersected || priority ? (
        <img
          src={src}
          alt={alt}
          width={width}
          height={height}
          loading={priority ? 'eager' : 'lazy'}
          decoding="async"
          {...props}
        />
      ) : (
        <div 
          className="bg-white/5 animate-pulse flex items-center justify-center"
          style={{ width, height }}
        >
          <div className="text-white/40 text-sm">Loading...</div>
        </div>
      )}
    </div>
  );
}

/**
 * Lazy component loader for code splitting
 */
export function LazyComponent({ 
  loader, 
  fallback = <LazyFallback />, 
  className = '' 
}) {
  const { elementRef, hasIntersected } = useIntersectionObserver();
  const [Component, setComponent] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (hasIntersected && !Component && !loading) {
      setLoading(true);
      loader()
        .then((module) => {
          setComponent(() => module.default || module);
        })
        .catch((error) => {
          console.error('Failed to load component:', error);
        })
        .finally(() => {
          setLoading(false);
        });
    }
  }, [hasIntersected, Component, loading, loader]);

  return (
    <div ref={elementRef} className={className}>
      {Component ? <Component /> : fallback}
    </div>
  );
}