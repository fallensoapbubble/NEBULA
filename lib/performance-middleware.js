/**
 * Performance Monitoring Middleware for Next.js
 * Tracks portfolio loading performance and provides optimization insights
 */

import { getPortfolioPerformanceService } from './portfolio-performance-service.js';
import { logger } from './logger.js';

/**
 * Performance monitoring middleware
 */
export class PerformanceMiddleware {
  constructor(options = {}) {
    this.options = {
      enableMetrics: options.enableMetrics !== false,
      enableTracing: options.enableTracing !== false,
      enableClientHints: options.enableClientHints !== false,
      sampleRate: options.sampleRate || 1.0, // 100% sampling by default
      ...options
    };

    this.performanceService = getPortfolioPerformanceService(options.performance);
    this.logger = logger.child({ service: 'performance-middleware' });
    
    // Request tracking
    this.activeRequests = new Map();
    this.requestCounter = 0;
  }

  /**
   * Create Next.js middleware function
   * @returns {Function} Next.js middleware function
   */
  createMiddleware() {
    return async (req, res, next) => {
      // Skip if sampling says no
      if (Math.random() > this.options.sampleRate) {
        return next ? next() : undefined;
      }

      const requestId = ++this.requestCounter;
      const startTime = performance.now();
      
      // Extract client hints
      const clientHints = this.extractClientHints(req);
      
      // Track request
      this.activeRequests.set(requestId, {
        url: req.url,
        method: req.method,
        startTime,
        clientHints,
        userAgent: req.headers['user-agent']
      });

      // Add performance headers to response
      this.addPerformanceHeaders(res);

      // Wrap res.end to capture completion time
      const originalEnd = res.end;
      res.end = (...args) => {
        const endTime = performance.now();
        const duration = endTime - startTime;
        
        // Log performance metrics
        this.logRequestPerformance(requestId, duration, res.statusCode);
        
        // Clean up tracking
        this.activeRequests.delete(requestId);
        
        // Call original end
        originalEnd.apply(res, args);
      };

      // Add performance utilities to request
      req.performance = {
        startTime,
        requestId,
        clientHints,
        mark: (name) => this.mark(`${requestId}-${name}`),
        measure: (name, startMark, endMark) => this.measure(name, startMark, endMark),
        getOptimizedPortfolio: (owner, repo, options = {}) => {
          return this.performanceService.optimizeForClient(
            this.performanceService.getOptimizedPortfolio(owner, repo, options),
            clientHints
          );
        }
      };

      if (next) {
        next();
      }
    };
  }

  /**
   * Extract client hints from request
   * @private
   */
  extractClientHints(req) {
    const hints = {
      connection: 'fast', // Default
      deviceType: 'desktop', // Default
      screenSize: 'large', // Default
      supportedFormats: ['webp', 'jpeg'] // Default
    };

    // Extract from headers
    const userAgent = req.headers['user-agent'] || '';
    const acceptHeader = req.headers['accept'] || '';
    
    // Device type detection
    if (/Mobile|Android|iPhone|iPad/.test(userAgent)) {
      hints.deviceType = 'mobile';
      hints.screenSize = 'small';
    } else if (/Tablet|iPad/.test(userAgent)) {
      hints.deviceType = 'tablet';
      hints.screenSize = 'medium';
    }

    // Connection speed hints
    const connectionHeader = req.headers['downlink'] || req.headers['rtt'];
    if (connectionHeader) {
      const downlink = parseFloat(connectionHeader);
      if (downlink < 1.5) {
        hints.connection = 'slow';
      } else if (downlink < 5) {
        hints.connection = 'medium';
      } else {
        hints.connection = 'fast';
      }
    }

    // Supported formats
    if (acceptHeader.includes('image/avif')) {
      hints.supportedFormats.unshift('avif');
    }
    if (acceptHeader.includes('image/webp')) {
      hints.supportedFormats.unshift('webp');
    }

    // Client hints headers (if available)
    if (req.headers['sec-ch-ua-mobile'] === '?1') {
      hints.deviceType = 'mobile';
    }
    
    if (req.headers['sec-ch-viewport-width']) {
      const width = parseInt(req.headers['sec-ch-viewport-width']);
      if (width < 768) {
        hints.screenSize = 'small';
      } else if (width < 1024) {
        hints.screenSize = 'medium';
      } else {
        hints.screenSize = 'large';
      }
    }

    return hints;
  }

  /**
   * Add performance-related headers to response
   * @private
   */
  addPerformanceHeaders(res) {
    // Server timing header for performance insights
    res.setHeader('Server-Timing', 'total;desc="Total Response Time"');
    
    // Cache control for performance
    if (res.req?.url?.includes('/api/')) {
      res.setHeader('Cache-Control', 'public, max-age=300, stale-while-revalidate=600');
    }
    
    // Performance hints
    res.setHeader('X-Performance-Optimized', 'true');
  }

  /**
   * Log request performance metrics
   * @private
   */
  logRequestPerformance(requestId, duration, statusCode) {
    const request = this.activeRequests.get(requestId);
    if (!request) return;

    const performanceData = {
      requestId,
      url: request.url,
      method: request.method,
      duration: Math.round(duration * 100) / 100,
      statusCode,
      clientHints: request.clientHints,
      timestamp: new Date().toISOString()
    };

    // Log based on performance
    if (duration > 2000) {
      this.logger.warn('Slow request detected', performanceData);
    } else if (duration > 1000) {
      this.logger.info('Request completed', performanceData);
    } else {
      this.logger.debug('Request completed', performanceData);
    }

    // Track metrics if enabled
    if (this.options.enableMetrics) {
      this.trackMetrics(performanceData);
    }
  }

  /**
   * Track performance metrics
   * @private
   */
  trackMetrics(performanceData) {
    // This would integrate with a metrics system
    // For now, just log aggregated data periodically
    
    if (!this.metricsBuffer) {
      this.metricsBuffer = [];
      
      // Flush metrics every 60 seconds
      setInterval(() => {
        this.flushMetrics();
      }, 60000);
    }

    this.metricsBuffer.push(performanceData);
  }

  /**
   * Flush accumulated metrics
   * @private
   */
  flushMetrics() {
    if (!this.metricsBuffer || this.metricsBuffer.length === 0) {
      return;
    }

    const metrics = this.calculateAggregatedMetrics(this.metricsBuffer);
    
    this.logger.info('Performance metrics', {
      period: '60s',
      ...metrics
    });

    // Clear buffer
    this.metricsBuffer = [];
  }

  /**
   * Calculate aggregated metrics from buffer
   * @private
   */
  calculateAggregatedMetrics(buffer) {
    const totalRequests = buffer.length;
    const durations = buffer.map(r => r.duration);
    const statusCodes = buffer.reduce((acc, r) => {
      acc[r.statusCode] = (acc[r.statusCode] || 0) + 1;
      return acc;
    }, {});

    const avgDuration = durations.reduce((a, b) => a + b, 0) / totalRequests;
    const p95Duration = this.percentile(durations, 0.95);
    const p99Duration = this.percentile(durations, 0.99);

    return {
      totalRequests,
      avgDuration: Math.round(avgDuration * 100) / 100,
      p95Duration: Math.round(p95Duration * 100) / 100,
      p99Duration: Math.round(p99Duration * 100) / 100,
      statusCodes,
      slowRequests: durations.filter(d => d > 2000).length,
      errorRate: ((statusCodes['4xx'] || 0) + (statusCodes['5xx'] || 0)) / totalRequests * 100
    };
  }

  /**
   * Calculate percentile from array of numbers
   * @private
   */
  percentile(arr, p) {
    const sorted = arr.slice().sort((a, b) => a - b);
    const index = Math.ceil(sorted.length * p) - 1;
    return sorted[index] || 0;
  }

  /**
   * Create performance mark
   * @private
   */
  mark(name) {
    if (this.options.enableTracing && typeof performance !== 'undefined') {
      try {
        performance.mark(name);
      } catch (error) {
        // Ignore marking errors
      }
    }
  }

  /**
   * Create performance measure
   * @private
   */
  measure(name, startMark, endMark) {
    if (this.options.enableTracing && typeof performance !== 'undefined') {
      try {
        performance.measure(name, startMark, endMark);
        const measure = performance.getEntriesByName(name, 'measure')[0];
        return measure ? measure.duration : 0;
      } catch (error) {
        return 0;
      }
    }
    return 0;
  }

  /**
   * Get current performance statistics
   * @returns {Object} Performance statistics
   */
  getStats() {
    const activeRequestCount = this.activeRequests.size;
    const performanceStats = this.performanceService.getPerformanceStats();
    
    return {
      middleware: {
        activeRequests: activeRequestCount,
        totalRequests: this.requestCounter,
        options: this.options
      },
      performance: performanceStats
    };
  }
}

/**
 * Create performance middleware instance
 * @param {Object} options - Middleware options
 * @returns {PerformanceMiddleware}
 */
export function createPerformanceMiddleware(options = {}) {
  return new PerformanceMiddleware(options);
}

/**
 * Create Express/Connect compatible middleware
 * @param {Object} options - Middleware options
 * @returns {Function} Express middleware function
 */
export function createExpressMiddleware(options = {}) {
  const middleware = new PerformanceMiddleware(options);
  return middleware.createMiddleware();
}

/**
 * Create Next.js API middleware
 * @param {Object} options - Middleware options
 * @returns {Function} Next.js API middleware function
 */
export function createNextApiMiddleware(options = {}) {
  const middleware = new PerformanceMiddleware(options);
  
  return (handler) => {
    return async (req, res) => {
      // Apply performance middleware
      const middlewareFn = middleware.createMiddleware();
      await new Promise((resolve) => {
        middlewareFn(req, res, resolve);
      });
      
      // Call the actual handler
      return handler(req, res);
    };
  };
}

export default PerformanceMiddleware;