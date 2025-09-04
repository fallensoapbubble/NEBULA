/**
 * Performance optimization utilities for the Nebula platform
 * Handles lazy loading, prefetching, and performance monitoring
 */

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/router';

/**
 * Intersection Observer hook for lazy loading
 */
export function useIntersectionObserver(options = {}) {
  const [isIntersecting, setIsIntersecting] = useState(false);
  const [hasIntersected, setHasIntersected] = useState(false);
  const elementRef = useRef(null);

  useEffect(() => {
    const element = elementRef.current;
    if (!element) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsIntersecting(entry.isIntersecting);
        if (entry.isIntersecting && !hasIntersected) {
          setHasIntersected(true);
        }
      },
      {
        threshold: 0.1,
        rootMargin: '50px',
        ...options,
      }
    );

    observer.observe(element);

    return () => {
      observer.unobserve(element);
    };
  }, [hasIntersected, options]);

  return { elementRef, isIntersecting, hasIntersected };
}

/**
 * Lazy loading component wrapper
 */
export function LazySection({ children, fallback = null, className = '' }) {
  const { elementRef, hasIntersected } = useIntersectionObserver({
    threshold: 0.1,
    rootMargin: '100px',
  });

  return (
    <div ref={elementRef} className={className}>
      {hasIntersected ? children : fallback}
    </div>
  );
}

/**
 * Prefetch manager for likely-visited pages
 */
export class PrefetchManager {
  constructor() {
    this.prefetchedUrls = new Set();
    this.prefetchQueue = [];
    this.isProcessing = false;
  }

  /**
   * Add URL to prefetch queue
   */
  prefetch(url, priority = 'low') {
    if (this.prefetchedUrls.has(url)) return;

    this.prefetchQueue.push({ url, priority });
    this.processPrefetchQueue();
  }

  /**
   * Process prefetch queue with priority handling
   */
  async processPrefetchQueue() {
    if (this.isProcessing || this.prefetchQueue.length === 0) return;

    this.isProcessing = true;

    // Sort by priority (high first)
    this.prefetchQueue.sort((a, b) => {
      const priorities = { high: 3, medium: 2, low: 1 };
      return priorities[b.priority] - priorities[a.priority];
    });

    while (this.prefetchQueue.length > 0) {
      const { url } = this.prefetchQueue.shift();
      
      if (!this.prefetchedUrls.has(url)) {
        await this.prefetchUrl(url);
        this.prefetchedUrls.add(url);
        
        // Small delay to avoid overwhelming the browser
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }

    this.isProcessing = false;
  }

  /**
   * Prefetch a single URL
   */
  async prefetchUrl(url) {
    try {
      const link = document.createElement('link');
      link.rel = 'prefetch';
      link.href = url;
      document.head.appendChild(link);

      // Also prefetch the page data for Next.js
      if (typeof window !== 'undefined' && window.__NEXT_DATA__) {
        const router = require('next/router').default;
        if (router.prefetch) {
          await router.prefetch(url);
        }
      }
    } catch (error) {
      console.warn('Failed to prefetch:', url, error);
    }
  }

  /**
   * Prefetch user's likely next pages based on current context
   */
  prefetchUserJourney(currentPath, userContext = {}) {
    const prefetchRules = {
      // From home page
      '/': [
        '/templates',
        '/auth/signin',
      ],
      
      // From templates page
      '/templates': [
        '/auth/signin',
        // Template detail pages will be added dynamically
      ],
      
      // From editor
      '/editor': (context) => {
        const { username, repo } = context;
        return [
          `/${username}/${repo}`, // Live portfolio
          '/templates', // Back to templates
        ];
      },
      
      // From portfolio view
      '/portfolio': [
        '/templates',
        '/editor',
      ],
    };

    const rules = prefetchRules[currentPath];
    if (!rules) return;

    const urlsToPrefetch = typeof rules === 'function' 
      ? rules(userContext) 
      : rules;

    urlsToPrefetch.forEach(url => {
      this.prefetch(url, 'medium');
    });
  }
}

// Global prefetch manager instance
export const prefetchManager = new PrefetchManager();

/**
 * Hook for intelligent prefetching based on user behavior
 */
export function usePrefetch() {
  const router = useRouter();

  useEffect(() => {
    // Prefetch based on current route
    prefetchManager.prefetchUserJourney(router.pathname, router.query);

    // Prefetch on hover for navigation links
    const handleLinkHover = (event) => {
      const link = event.target.closest('a[href]');
      if (link && link.href.startsWith(window.location.origin)) {
        const url = new URL(link.href).pathname;
        prefetchManager.prefetch(url, 'high');
      }
    };

    document.addEventListener('mouseover', handleLinkHover);
    return () => document.removeEventListener('mouseover', handleLinkHover);
  }, [router.pathname, router.query]);

  return {
    prefetch: (url, priority) => prefetchManager.prefetch(url, priority),
    prefetchUserJourney: (context) => prefetchManager.prefetchUserJourney(router.pathname, context),
  };
}

/**
 * Image optimization utilities
 */
export const ImageOptimizer = {
  /**
   * Get optimized image props for Next.js Image component
   */
  getOptimizedProps(src, { width, height, quality = 75, priority = false } = {}) {
    return {
      src,
      width,
      height,
      quality,
      priority,
      placeholder: 'blur',
      blurDataURL: this.generateBlurDataURL(width || 400, height || 300),
      sizes: this.generateSizes(width),
    };
  },

  /**
   * Generate responsive sizes attribute
   */
  generateSizes(maxWidth) {
    if (!maxWidth) return '100vw';
    
    return `(max-width: 768px) 100vw, (max-width: 1200px) 50vw, ${maxWidth}px`;
  },

  /**
   * Generate blur placeholder data URL
   */
  generateBlurDataURL(width, height) {
    const svg = `
      <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" style="stop-color:rgb(30,30,30);stop-opacity:1" />
            <stop offset="100%" style="stop-color:rgb(60,60,60);stop-opacity:1" />
          </linearGradient>
        </defs>
        <rect width="100%" height="100%" fill="url(#grad)" />
      </svg>
    `;
    
    return `data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}`;
  },
};

/**
 * Asset compression utilities
 */
export const AssetOptimizer = {
  /**
   * Compress and optimize images before upload
   */
  async compressImage(file, options = {}) {
    const {
      maxWidth = 1920,
      maxHeight = 1080,
      quality = 0.8,
      format = 'webp',
    } = options;

    return new Promise((resolve) => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const img = new Image();

      img.onload = () => {
        // Calculate new dimensions
        let { width, height } = img;
        
        if (width > maxWidth || height > maxHeight) {
          const ratio = Math.min(maxWidth / width, maxHeight / height);
          width *= ratio;
          height *= ratio;
        }

        canvas.width = width;
        canvas.height = height;

        // Draw and compress
        ctx.drawImage(img, 0, 0, width, height);
        
        canvas.toBlob(resolve, `image/${format}`, quality);
      };

      img.src = URL.createObjectURL(file);
    });
  },

  /**
   * Generate multiple image sizes for responsive images
   */
  async generateResponsiveImages(file) {
    const sizes = [
      { width: 640, suffix: 'sm' },
      { width: 1024, suffix: 'md' },
      { width: 1920, suffix: 'lg' },
    ];

    const images = await Promise.all(
      sizes.map(async ({ width, suffix }) => {
        const compressed = await this.compressImage(file, { maxWidth: width });
        return { blob: compressed, width, suffix };
      })
    );

    return images;
  },
};

/**
 * Performance monitoring utilities
 */
export const PerformanceMonitor = {
  /**
   * Measure and report Core Web Vitals
   */
  measureWebVitals() {
    if (typeof window === 'undefined') return;

    // Largest Contentful Paint
    new PerformanceObserver((list) => {
      const entries = list.getEntries();
      const lastEntry = entries[entries.length - 1];
      
      this.reportMetric('LCP', lastEntry.startTime);
    }).observe({ entryTypes: ['largest-contentful-paint'] });

    // First Input Delay
    new PerformanceObserver((list) => {
      const entries = list.getEntries();
      entries.forEach((entry) => {
        this.reportMetric('FID', entry.processingStart - entry.startTime);
      });
    }).observe({ entryTypes: ['first-input'] });

    // Cumulative Layout Shift
    let clsValue = 0;
    new PerformanceObserver((list) => {
      const entries = list.getEntries();
      entries.forEach((entry) => {
        if (!entry.hadRecentInput) {
          clsValue += entry.value;
        }
      });
      this.reportMetric('CLS', clsValue);
    }).observe({ entryTypes: ['layout-shift'] });
  },

  /**
   * Report performance metric
   */
  reportMetric(name, value) {
    // Send to analytics service
    if (typeof gtag !== 'undefined') {
      gtag('event', 'web_vitals', {
        event_category: 'Performance',
        event_label: name,
        value: Math.round(value),
        non_interaction: true,
      });
    }

    // Log for development
    if (process.env.NODE_ENV === 'development') {
      console.log(`${name}: ${value}`);
    }
  },

  /**
   * Monitor resource loading performance
   */
  monitorResourceLoading() {
    if (typeof window === 'undefined') return;

    new PerformanceObserver((list) => {
      const entries = list.getEntries();
      entries.forEach((entry) => {
        if (entry.duration > 1000) { // Slow resource
          this.reportMetric('slow_resource', entry.duration, {
            resource: entry.name,
            type: entry.initiatorType,
          });
        }
      });
    }).observe({ entryTypes: ['resource'] });
  },
};