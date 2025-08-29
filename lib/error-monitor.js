/**
 * Error Monitoring and Reporting System
 * Provides comprehensive error tracking, reporting, and analytics
 */

import { createLogger } from './logger.js';
import { ErrorHandler } from './errors.js';

const monitorLogger = createLogger('ErrorMonitor');

/**
 * Error monitoring configuration
 */
const MONITOR_CONFIG = {
  // Error sampling rate (0.0 to 1.0)
  sampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
  
  // Maximum errors to store in memory
  maxErrorsInMemory: 100,
  
  // Error reporting endpoints
  reportingEndpoints: {
    internal: '/api/errors/report',
    external: process.env.ERROR_REPORTING_URL
  },
  
  // Error categories to always report
  alwaysReport: ['authentication', 'github_api', 'system'],
  
  // Error categories to never report
  neverReport: ['validation'],
  
  // Rate limiting for error reporting
  rateLimits: {
    perMinute: 10,
    perHour: 100,
    perDay: 1000
  }
};

/**
 * In-memory error storage for analytics
 */
class ErrorStorage {
  constructor() {
    this.errors = [];
    this.errorCounts = new Map();
    this.rateLimitCounters = {
      minute: { count: 0, resetTime: Date.now() + 60000 },
      hour: { count: 0, resetTime: Date.now() + 3600000 },
      day: { count: 0, resetTime: Date.now() + 86400000 }
    };
  }

  addError(error) {
    // Add to errors array
    this.errors.push({
      ...error,
      id: this.generateErrorId(),
      timestamp: new Date().toISOString()
    });

    // Maintain max size
    if (this.errors.length > MONITOR_CONFIG.maxErrorsInMemory) {
      this.errors.shift();
    }

    // Update error counts
    const key = `${error.category}:${error.code}`;
    this.errorCounts.set(key, (this.errorCounts.get(key) || 0) + 1);
  }

  generateErrorId() {
    return `err_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  getErrors(filters = {}) {
    let filteredErrors = [...this.errors];

    if (filters.category) {
      filteredErrors = filteredErrors.filter(e => e.category === filters.category);
    }

    if (filters.severity) {
      filteredErrors = filteredErrors.filter(e => e.severity === filters.severity);
    }

    if (filters.timeRange) {
      const cutoff = Date.now() - filters.timeRange;
      filteredErrors = filteredErrors.filter(e => new Date(e.timestamp).getTime() > cutoff);
    }

    return filteredErrors;
  }

  getErrorStats() {
    const now = Date.now();
    const oneHour = 60 * 60 * 1000;
    const oneDay = 24 * oneHour;

    const recentErrors = this.errors.filter(e => 
      now - new Date(e.timestamp).getTime() < oneHour
    );

    const dailyErrors = this.errors.filter(e => 
      now - new Date(e.timestamp).getTime() < oneDay
    );

    return {
      total: this.errors.length,
      lastHour: recentErrors.length,
      lastDay: dailyErrors.length,
      byCategory: this.getErrorsByCategory(),
      bySeverity: this.getErrorsBySeverity(),
      topErrors: this.getTopErrors()
    };
  }

  getErrorsByCategory() {
    const categories = {};
    this.errors.forEach(error => {
      categories[error.category] = (categories[error.category] || 0) + 1;
    });
    return categories;
  }

  getErrorsBySeverity() {
    const severities = {};
    this.errors.forEach(error => {
      severities[error.severity] = (severities[error.severity] || 0) + 1;
    });
    return severities;
  }

  getTopErrors(limit = 10) {
    const errorCounts = Array.from(this.errorCounts.entries())
      .map(([key, count]) => ({ key, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, limit);

    return errorCounts;
  }

  checkRateLimit() {
    const now = Date.now();

    // Reset counters if needed
    Object.keys(this.rateLimitCounters).forEach(period => {
      const counter = this.rateLimitCounters[period];
      if (now > counter.resetTime) {
        counter.count = 0;
        const resetTimes = {
          minute: 60000,
          hour: 3600000,
          day: 86400000
        };
        counter.resetTime = now + resetTimes[period];
      }
    });

    // Check limits
    const limits = MONITOR_CONFIG.rateLimits;
    return {
      allowed: (
        this.rateLimitCounters.minute.count < limits.perMinute &&
        this.rateLimitCounters.hour.count < limits.perHour &&
        this.rateLimitCounters.day.count < limits.perDay
      ),
      counters: { ...this.rateLimitCounters }
    };
  }

  incrementRateLimit() {
    Object.values(this.rateLimitCounters).forEach(counter => {
      counter.count++;
    });
  }
}

/**
 * Global error storage instance
 */
const errorStorage = new ErrorStorage();

/**
 * Error Monitor class
 */
export class ErrorMonitor {
  constructor() {
    this.isEnabled = true;
    this.setupGlobalErrorHandlers();
  }

  /**
   * Setup global error handlers for unhandled errors
   */
  setupGlobalErrorHandlers() {
    // Handle unhandled promise rejections
    if (typeof window !== 'undefined') {
      window.addEventListener('unhandledrejection', (event) => {
        this.captureError(event.reason, {
          source: 'unhandled_promise_rejection',
          url: window.location.href,
          userAgent: navigator.userAgent
        });
      });

      // Handle JavaScript errors
      window.addEventListener('error', (event) => {
        this.captureError(event.error, {
          source: 'javascript_error',
          filename: event.filename,
          lineno: event.lineno,
          colno: event.colno,
          url: window.location.href,
          userAgent: navigator.userAgent
        });
      });
    }

    // Handle Node.js unhandled rejections (server-side)
    if (typeof process !== 'undefined') {
      process.on('unhandledRejection', (reason, promise) => {
        this.captureError(reason, {
          source: 'unhandled_promise_rejection_server',
          promise: promise.toString()
        });
      });

      process.on('uncaughtException', (error) => {
        this.captureError(error, {
          source: 'uncaught_exception_server'
        });
      });
    }
  }

  /**
   * Capture and process an error
   * @param {Error|string|Object} error - The error to capture
   * @param {Object} context - Additional context information
   */
  captureError(error, context = {}) {
    if (!this.isEnabled) return;

    try {
      // Convert to standardized error format
      const nebulaError = ErrorHandler.handleError(error, context);

      // Check if we should report this error
      if (!this.shouldReportError(nebulaError)) {
        return;
      }

      // Check rate limits
      const rateLimitCheck = errorStorage.checkRateLimit();
      if (!rateLimitCheck.allowed) {
        monitorLogger.warn('Error reporting rate limit exceeded', rateLimitCheck.counters);
        return;
      }

      // Apply sampling
      if (Math.random() > MONITOR_CONFIG.sampleRate) {
        return;
      }

      // Store error
      errorStorage.addError(nebulaError.toJSON());
      errorStorage.incrementRateLimit();

      // Report error
      this.reportError(nebulaError, context);

      monitorLogger.info('Error captured and reported', {
        errorId: nebulaError.id,
        category: nebulaError.category,
        severity: nebulaError.severity
      });

    } catch (monitorError) {
      // Don't let error monitoring break the app
      monitorLogger.error('Error in error monitoring', monitorError);
    }
  }

  /**
   * Determine if an error should be reported
   * @param {Object} error - Standardized error object
   * @returns {boolean} - Whether to report the error
   */
  shouldReportError(error) {
    // Never report certain categories
    if (MONITOR_CONFIG.neverReport.includes(error.category)) {
      return false;
    }

    // Always report certain categories
    if (MONITOR_CONFIG.alwaysReport.includes(error.category)) {
      return true;
    }

    // Report based on severity
    if (error.severity === 'critical' || error.severity === 'high') {
      return true;
    }

    // Report retryable errors less frequently
    if (error.isRetryable && Math.random() > 0.3) {
      return false;
    }

    return true;
  }

  /**
   * Report error to configured endpoints
   * @param {Object} error - Standardized error object
   * @param {Object} context - Additional context
   */
  async reportError(error, context = {}) {
    const errorReport = {
      error: error.toJSON(),
      context: {
        ...context,
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV,
        version: process.env.npm_package_version,
        platform: typeof window !== 'undefined' ? 'browser' : 'server'
      },
      metadata: {
        userAgent: typeof window !== 'undefined' ? navigator.userAgent : null,
        url: typeof window !== 'undefined' ? window.location.href : null,
        referrer: typeof window !== 'undefined' ? document.referrer : null
      }
    };

    // Report to internal endpoint
    try {
      if (typeof fetch !== 'undefined') {
        await fetch(MONITOR_CONFIG.reportingEndpoints.internal, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(errorReport)
        });
      }
    } catch (reportError) {
      monitorLogger.error('Failed to report error to internal endpoint', reportError);
    }

    // Report to external service if configured
    if (MONITOR_CONFIG.reportingEndpoints.external) {
      try {
        if (typeof fetch !== 'undefined') {
          await fetch(MONITOR_CONFIG.reportingEndpoints.external, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify(errorReport)
          });
        }
      } catch (reportError) {
        monitorLogger.error('Failed to report error to external endpoint', reportError);
      }
    }
  }

  /**
   * Get error statistics
   * @returns {Object} - Error statistics
   */
  getStats() {
    return errorStorage.getErrorStats();
  }

  /**
   * Get filtered errors
   * @param {Object} filters - Filter criteria
   * @returns {Array} - Filtered errors
   */
  getErrors(filters = {}) {
    return errorStorage.getErrors(filters);
  }

  /**
   * Clear error storage
   */
  clearErrors() {
    errorStorage.errors = [];
    errorStorage.errorCounts.clear();
  }

  /**
   * Enable/disable error monitoring
   * @param {boolean} enabled - Whether to enable monitoring
   */
  setEnabled(enabled) {
    this.isEnabled = enabled;
  }

  /**
   * Add custom context to all future errors
   * @param {Object} context - Context to add
   */
  setGlobalContext(context) {
    this.globalContext = { ...this.globalContext, ...context };
  }

  /**
   * Manually report an error with custom context
   * @param {Error|string} error - Error to report
   * @param {Object} context - Additional context
   */
  reportError(error, context = {}) {
    this.captureError(error, { ...this.globalContext, ...context });
  }
}

/**
 * Global error monitor instance
 */
export const errorMonitor = new ErrorMonitor();

/**
 * Utility functions for error monitoring
 */
export const ErrorMonitorUtils = {
  /**
   * Wrap an async function with error monitoring
   * @param {Function} fn - Function to wrap
   * @param {Object} context - Context for errors
   * @returns {Function} - Wrapped function
   */
  wrapAsync(fn, context = {}) {
    return async (...args) => {
      try {
        return await fn(...args);
      } catch (error) {
        errorMonitor.captureError(error, {
          ...context,
          functionName: fn.name,
          arguments: args.length
        });
        throw error;
      }
    };
  },

  /**
   * Wrap a regular function with error monitoring
   * @param {Function} fn - Function to wrap
   * @param {Object} context - Context for errors
   * @returns {Function} - Wrapped function
   */
  wrap(fn, context = {}) {
    return (...args) => {
      try {
        return fn(...args);
      } catch (error) {
        errorMonitor.captureError(error, {
          ...context,
          functionName: fn.name,
          arguments: args.length
        });
        throw error;
      }
    };
  },

  /**
   * Create a performance-aware error wrapper
   * @param {Function} fn - Function to wrap
   * @param {Object} context - Context for errors
   * @returns {Function} - Wrapped function with performance monitoring
   */
  wrapWithPerformance(fn, context = {}) {
    return async (...args) => {
      const startTime = performance.now();
      try {
        const result = await fn(...args);
        const duration = performance.now() - startTime;
        
        // Log slow operations
        if (duration > 1000) {
          monitorLogger.warn('Slow operation detected', {
            functionName: fn.name,
            duration,
            ...context
          });
        }
        
        return result;
      } catch (error) {
        const duration = performance.now() - startTime;
        errorMonitor.captureError(error, {
          ...context,
          functionName: fn.name,
          duration,
          arguments: args.length
        });
        throw error;
      }
    };
  }
};

/**
 * React hook for error monitoring
 */
export function useErrorMonitor() {
  const reportError = React.useCallback((error, context = {}) => {
    errorMonitor.captureError(error, {
      source: 'react_hook',
      ...context
    });
  }, []);

  const getStats = React.useCallback(() => {
    return errorMonitor.getStats();
  }, []);

  return {
    reportError,
    getStats,
    monitor: errorMonitor
  };
}

// Initialize error monitoring
if (typeof window !== 'undefined') {
  // Browser-specific initialization
  errorMonitor.setGlobalContext({
    platform: 'browser',
    userAgent: navigator.userAgent,
    language: navigator.language,
    cookieEnabled: navigator.cookieEnabled
  });
} else {
  // Server-specific initialization
  errorMonitor.setGlobalContext({
    platform: 'server',
    nodeVersion: process.version,
    environment: process.env.NODE_ENV
  });
}