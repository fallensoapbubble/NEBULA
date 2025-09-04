"use client";

/**
 * Performance monitoring component
 * Tracks Core Web Vitals and reports performance metrics
 */

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { PerformanceMonitor } from '../lib/performance-optimizer';

export default function PerformanceMonitorComponent() {
  const router = useRouter();

  useEffect(() => {
    // Initialize performance monitoring
    PerformanceMonitor.measureWebVitals();
    PerformanceMonitor.monitorResourceLoading();

    // Track route changes for App Router
    const handleRouteChange = () => {
      // Report navigation timing
      const navigationStart = performance.timeOrigin;
      const now = performance.now();
      
      PerformanceMonitor.reportMetric('route_change', now - navigationStart, {
        path: window.location.pathname,
      });
    };

    // Listen for navigation events in App Router
    window.addEventListener('popstate', handleRouteChange);

    return () => {
      window.removeEventListener('popstate', handleRouteChange);
    };
  }, [router]);

  // This component doesn't render anything
  return null;
}

/**
 * Performance metrics reporter for API calls
 */
export class APIPerformanceTracker {
  static trackAPICall(endpoint, startTime, endTime, success = true) {
    const duration = endTime - startTime;
    
    PerformanceMonitor.reportMetric('api_call', duration, {
      endpoint,
      success,
      slow: duration > 2000,
    });

    // Log slow API calls
    if (duration > 2000) {
      console.warn(`Slow API call: ${endpoint} took ${duration}ms`);
    }
  }

  static async wrapAPICall(endpoint, apiCall) {
    const startTime = performance.now();
    
    try {
      const result = await apiCall();
      const endTime = performance.now();
      
      this.trackAPICall(endpoint, startTime, endTime, true);
      return result;
    } catch (error) {
      const endTime = performance.now();
      
      this.trackAPICall(endpoint, startTime, endTime, false);
      throw error;
    }
  }
}

/**
 * GitHub API performance tracker
 */
export class GitHubAPITracker extends APIPerformanceTracker {
  static async trackGitHubCall(operation, apiCall) {
    return this.wrapAPICall(`github_${operation}`, apiCall);
  }
}

/**
 * Bundle size analyzer (development only)
 */
export function BundleAnalyzer() {
  useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      // Analyze bundle size in development
      const analyzeBundle = () => {
        const scripts = document.querySelectorAll('script[src]');
        let totalSize = 0;
        
        scripts.forEach(script => {
          if (script.src.includes('/_next/static/')) {
            // Estimate size based on script content (rough approximation)
            fetch(script.src)
              .then(response => response.text())
              .then(content => {
                const size = new Blob([content]).size;
                totalSize += size;
                
                console.log(`Bundle chunk: ${script.src.split('/').pop()} - ${(size / 1024).toFixed(2)}KB`);
              })
              .catch(() => {
                // Ignore fetch errors for bundle analysis
              });
          }
        });
        
        setTimeout(() => {
          console.log(`Total estimated bundle size: ${(totalSize / 1024).toFixed(2)}KB`);
        }, 1000);
      };

      // Run analysis after page load
      if (document.readyState === 'complete') {
        analyzeBundle();
      } else {
        window.addEventListener('load', analyzeBundle);
      }
    }
  }, []);

  return null;
}