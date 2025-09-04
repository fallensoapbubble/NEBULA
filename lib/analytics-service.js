/**
 * Analytics and monitoring service for the Nebula platform
 * Tracks Core Web Vitals, user interactions, and system performance
 */

/**
 * Core Web Vitals tracker
 */
export class WebVitalsTracker {
  constructor() {
    this.metrics = new Map();
    this.observers = new Map();
    this.initializeObservers();
  }

  initializeObservers() {
    if (typeof window === 'undefined') return;

    // Largest Contentful Paint (LCP)
    this.observeLCP();
    
    // First Input Delay (FID)
    this.observeFID();
    
    // Cumulative Layout Shift (CLS)
    this.observeCLS();
    
    // First Contentful Paint (FCP)
    this.observeFCP();
    
    // Time to First Byte (TTFB)
    this.observeTTFB();
  }

  observeLCP() {
    const observer = new PerformanceObserver((list) => {
      const entries = list.getEntries();
      const lastEntry = entries[entries.length - 1];
      
      this.recordMetric('LCP', lastEntry.startTime, {
        element: lastEntry.element?.tagName,
        url: lastEntry.url,
      });
    });

    try {
      observer.observe({ entryTypes: ['largest-contentful-paint'] });
      this.observers.set('LCP', observer);
    } catch (e) {
      console.warn('LCP observer not supported');
    }
  }

  observeFID() {
    const observer = new PerformanceObserver((list) => {
      const entries = list.getEntries();
      entries.forEach((entry) => {
        const delay = entry.processingStart - entry.startTime;
        
        this.recordMetric('FID', delay, {
          eventType: entry.name,
          target: entry.target?.tagName,
        });
      });
    });

    try {
      observer.observe({ entryTypes: ['first-input'] });
      this.observers.set('FID', observer);
    } catch (e) {
      console.warn('FID observer not supported');
    }
  }

  observeCLS() {
    let clsValue = 0;
    let sessionValue = 0;
    let sessionEntries = [];

    const observer = new PerformanceObserver((list) => {
      const entries = list.getEntries();
      
      entries.forEach((entry) => {
        if (!entry.hadRecentInput) {
          const firstSessionEntry = sessionEntries[0];
          const lastSessionEntry = sessionEntries[sessionEntries.length - 1];

          // If the entry occurred less than 1 second after the previous entry
          // and less than 5 seconds after the first entry in the session,
          // include the entry in the current session.
          if (sessionValue &&
              entry.startTime - lastSessionEntry.startTime < 1000 &&
              entry.startTime - firstSessionEntry.startTime < 5000) {
            sessionValue += entry.value;
            sessionEntries.push(entry);
          } else {
            sessionValue = entry.value;
            sessionEntries = [entry];
          }

          // If the current session value is larger than the current CLS value,
          // update CLS and the entries contributing to it.
          if (sessionValue > clsValue) {
            clsValue = sessionValue;
            
            this.recordMetric('CLS', clsValue, {
              entries: sessionEntries.length,
              sources: sessionEntries.map(e => e.sources?.[0]?.node?.tagName).filter(Boolean),
            });
          }
        }
      });
    });

    try {
      observer.observe({ entryTypes: ['layout-shift'] });
      this.observers.set('CLS', observer);
    } catch (e) {
      console.warn('CLS observer not supported');
    }
  }

  observeFCP() {
    const observer = new PerformanceObserver((list) => {
      const entries = list.getEntries();
      entries.forEach((entry) => {
        if (entry.name === 'first-contentful-paint') {
          this.recordMetric('FCP', entry.startTime);
        }
      });
    });

    try {
      observer.observe({ entryTypes: ['paint'] });
      this.observers.set('FCP', observer);
    } catch (e) {
      console.warn('FCP observer not supported');
    }
  }

  observeTTFB() {
    const navigationEntry = performance.getEntriesByType('navigation')[0];
    if (navigationEntry) {
      const ttfb = navigationEntry.responseStart - navigationEntry.requestStart;
      this.recordMetric('TTFB', ttfb);
    }
  }

  recordMetric(name, value, metadata = {}) {
    const metric = {
      name,
      value: Math.round(value),
      metadata,
      timestamp: Date.now(),
      url: window.location.pathname,
      userAgent: navigator.userAgent,
      connection: this.getConnectionInfo(),
    };

    this.metrics.set(name, metric);
    this.reportMetric(metric);
  }

  getConnectionInfo() {
    if ('connection' in navigator) {
      const conn = navigator.connection;
      return {
        effectiveType: conn.effectiveType,
        downlink: conn.downlink,
        rtt: conn.rtt,
        saveData: conn.saveData,
      };
    }
    return null;
  }

  reportMetric(metric) {
    // Send to analytics service
    this.sendToAnalytics(metric);
    
    // Log in development
    if (process.env.NODE_ENV === 'development') {
      console.log(`📊 ${metric.name}: ${metric.value}ms`, metric.metadata);
    }
  }

  async sendToAnalytics(metric) {
    try {
      // Send to internal analytics endpoint
      await fetch('/api/analytics/web-vitals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(metric),
      });
    } catch (error) {
      console.warn('Failed to send analytics:', error);
    }
  }

  getMetrics() {
    return Object.fromEntries(this.metrics);
  }

  disconnect() {
    this.observers.forEach(observer => observer.disconnect());
    this.observers.clear();
  }
}

/**
 * User interaction tracker
 */
export class UserInteractionTracker {
  constructor() {
    this.interactions = [];
    this.sessionStart = Date.now();
    this.initializeTracking();
  }

  initializeTracking() {
    if (typeof window === 'undefined') return;

    // Track clicks
    document.addEventListener('click', this.trackClick.bind(this));
    
    // Track form submissions
    document.addEventListener('submit', this.trackFormSubmission.bind(this));
    
    // Track page visibility changes
    document.addEventListener('visibilitychange', this.trackVisibilityChange.bind(this));
    
    // Track scroll depth
    this.trackScrollDepth();
    
    // Track time on page
    this.trackTimeOnPage();
  }

  trackClick(event) {
    const element = event.target;
    const interaction = {
      type: 'click',
      timestamp: Date.now(),
      element: {
        tagName: element.tagName,
        className: element.className,
        id: element.id,
        text: element.textContent?.slice(0, 100),
      },
      position: {
        x: event.clientX,
        y: event.clientY,
      },
      url: window.location.pathname,
    };

    this.recordInteraction(interaction);
  }

  trackFormSubmission(event) {
    const form = event.target;
    const interaction = {
      type: 'form_submit',
      timestamp: Date.now(),
      form: {
        id: form.id,
        className: form.className,
        action: form.action,
        method: form.method,
        fieldCount: form.elements.length,
      },
      url: window.location.pathname,
    };

    this.recordInteraction(interaction);
  }

  trackVisibilityChange() {
    const interaction = {
      type: 'visibility_change',
      timestamp: Date.now(),
      visible: !document.hidden,
      url: window.location.pathname,
    };

    this.recordInteraction(interaction);
  }

  trackScrollDepth() {
    let maxScroll = 0;
    let scrollTimer;

    const handleScroll = () => {
      clearTimeout(scrollTimer);
      scrollTimer = setTimeout(() => {
        const scrollPercent = Math.round(
          (window.scrollY / (document.body.scrollHeight - window.innerHeight)) * 100
        );
        
        if (scrollPercent > maxScroll) {
          maxScroll = scrollPercent;
          
          // Report at 25%, 50%, 75%, 100%
          if ([25, 50, 75, 100].includes(scrollPercent)) {
            this.recordInteraction({
              type: 'scroll_depth',
              timestamp: Date.now(),
              depth: scrollPercent,
              url: window.location.pathname,
            });
          }
        }
      }, 100);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
  }

  trackTimeOnPage() {
    const startTime = Date.now();
    
    const reportTimeOnPage = () => {
      const timeSpent = Date.now() - startTime;
      this.recordInteraction({
        type: 'time_on_page',
        timestamp: Date.now(),
        duration: timeSpent,
        url: window.location.pathname,
      });
    };

    // Report when user leaves page
    window.addEventListener('beforeunload', reportTimeOnPage);
    window.addEventListener('pagehide', reportTimeOnPage);
  }

  recordInteraction(interaction) {
    this.interactions.push(interaction);
    
    // Send to analytics (batch every 10 interactions or 30 seconds)
    if (this.interactions.length >= 10) {
      this.flushInteractions();
    }
  }

  async flushInteractions() {
    if (this.interactions.length === 0) return;

    const batch = [...this.interactions];
    this.interactions = [];

    try {
      await fetch('/api/analytics/interactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ interactions: batch }),
      });
    } catch (error) {
      console.warn('Failed to send interactions:', error);
      // Re-add to queue on failure
      this.interactions.unshift(...batch);
    }
  }
}

/**
 * GitHub API rate limit monitor
 */
export class GitHubRateLimitMonitor {
  constructor() {
    this.limits = new Map();
    this.alerts = [];
  }

  recordAPICall(endpoint, headers) {
    const rateLimitInfo = {
      limit: parseInt(headers['x-ratelimit-limit']) || 0,
      remaining: parseInt(headers['x-ratelimit-remaining']) || 0,
      reset: parseInt(headers['x-ratelimit-reset']) || 0,
      used: parseInt(headers['x-ratelimit-used']) || 0,
      resource: headers['x-ratelimit-resource'] || 'core',
      timestamp: Date.now(),
      endpoint,
    };

    this.limits.set(rateLimitInfo.resource, rateLimitInfo);
    
    // Check for rate limit warnings
    this.checkRateLimitWarnings(rateLimitInfo);
    
    // Report to analytics
    this.reportRateLimit(rateLimitInfo);
  }

  checkRateLimitWarnings(info) {
    const usagePercent = (info.used / info.limit) * 100;
    
    // Alert at 80% and 95% usage
    if (usagePercent >= 80 && !this.alerts.includes(`${info.resource}_80`)) {
      this.alerts.push(`${info.resource}_80`);
      this.sendAlert('rate_limit_warning', {
        resource: info.resource,
        usage: usagePercent,
        remaining: info.remaining,
        resetTime: new Date(info.reset * 1000),
      });
    }
    
    if (usagePercent >= 95 && !this.alerts.includes(`${info.resource}_95`)) {
      this.alerts.push(`${info.resource}_95`);
      this.sendAlert('rate_limit_critical', {
        resource: info.resource,
        usage: usagePercent,
        remaining: info.remaining,
        resetTime: new Date(info.reset * 1000),
      });
    }
  }

  async sendAlert(type, data) {
    try {
      await fetch('/api/analytics/alerts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type, data, timestamp: Date.now() }),
      });
    } catch (error) {
      console.error('Failed to send rate limit alert:', error);
    }
  }

  async reportRateLimit(info) {
    try {
      await fetch('/api/analytics/rate-limits', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(info),
      });
    } catch (error) {
      console.warn('Failed to report rate limit:', error);
    }
  }

  getRateLimitStatus() {
    return Object.fromEntries(this.limits);
  }

  getTimeUntilReset(resource = 'core') {
    const info = this.limits.get(resource);
    if (!info) return null;
    
    return Math.max(0, (info.reset * 1000) - Date.now());
  }
}

/**
 * Error tracking service
 */
export class ErrorTracker {
  constructor() {
    this.errors = [];
    this.initializeErrorTracking();
  }

  initializeErrorTracking() {
    if (typeof window === 'undefined') return;

    // Global error handler
    window.addEventListener('error', this.handleError.bind(this));
    
    // Unhandled promise rejections
    window.addEventListener('unhandledrejection', this.handlePromiseRejection.bind(this));
    
    // React error boundary integration
    window.__NEBULA_ERROR_TRACKER__ = this;
  }

  handleError(event) {
    const error = {
      type: 'javascript_error',
      message: event.message,
      filename: event.filename,
      lineno: event.lineno,
      colno: event.colno,
      stack: event.error?.stack,
      timestamp: Date.now(),
      url: window.location.pathname,
      userAgent: navigator.userAgent,
    };

    this.recordError(error);
  }

  handlePromiseRejection(event) {
    const error = {
      type: 'unhandled_promise_rejection',
      message: event.reason?.message || String(event.reason),
      stack: event.reason?.stack,
      timestamp: Date.now(),
      url: window.location.pathname,
      userAgent: navigator.userAgent,
    };

    this.recordError(error);
  }

  recordError(error) {
    this.errors.push(error);
    
    // Send immediately for errors
    this.reportError(error);
    
    // Log in development
    if (process.env.NODE_ENV === 'development') {
      console.error('🚨 Error tracked:', error);
    }
  }

  async reportError(error) {
    try {
      await fetch('/api/analytics/errors', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(error),
      });
    } catch (reportError) {
      console.error('Failed to report error:', reportError);
    }
  }

  getErrors() {
    return [...this.errors];
  }
}

/**
 * Main analytics service
 */
export class AnalyticsService {
  constructor() {
    this.webVitals = new WebVitalsTracker();
    this.interactions = new UserInteractionTracker();
    this.rateLimits = new GitHubRateLimitMonitor();
    this.errors = new ErrorTracker();
    
    // Flush interactions periodically
    setInterval(() => {
      this.interactions.flushInteractions();
    }, 30000);
  }

  // Public API methods
  trackEvent(eventName, properties = {}) {
    this.interactions.recordInteraction({
      type: 'custom_event',
      name: eventName,
      properties,
      timestamp: Date.now(),
      url: window.location.pathname,
    });
  }

  trackGitHubAPICall(endpoint, headers) {
    this.rateLimits.recordAPICall(endpoint, headers);
  }

  getMetrics() {
    return {
      webVitals: this.webVitals.getMetrics(),
      rateLimits: this.rateLimits.getRateLimitStatus(),
      errors: this.errors.getErrors(),
      interactions: this.interactions.interactions.length,
    };
  }

  disconnect() {
    this.webVitals.disconnect();
  }
}

// Global analytics instance
export const analytics = typeof window !== 'undefined' ? new AnalyticsService() : null;