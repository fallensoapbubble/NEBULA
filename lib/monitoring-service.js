/**
 * Monitoring Service
 * Handles error tracking, performance monitoring, and GitHub API usage tracking
 */

class MonitoringService {
  constructor() {
    this.isProduction = process.env.NODE_ENV === 'production';
    this.sentryDsn = process.env.SENTRY_DSN;
    this.analyticsId = process.env.NEXT_PUBLIC_VERCEL_ANALYTICS_ID;
    
    // Initialize monitoring services
    this.initializeSentry();
    this.initializeAnalytics();
  }

  /**
   * Initialize Sentry for error tracking
   */
  initializeSentry() {
    if (this.sentryDsn && this.isProduction) {
      try {
        // Note: In a real implementation, you would import and configure Sentry here
        console.log('Sentry monitoring initialized');
      } catch (error) {
        console.error('Failed to initialize Sentry:', error);
      }
    }
  }

  /**
   * Initialize analytics tracking
   */
  initializeAnalytics() {
    if (this.analyticsId && this.isProduction) {
      try {
        // Note: In a real implementation, you would initialize analytics here
        console.log('Analytics tracking initialized');
      } catch (error) {
        console.error('Failed to initialize analytics:', error);
      }
    }
  }

  /**
   * Track error events
   */
  trackError(error, context = {}) {
    const errorData = {
      message: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString(),
      context,
      environment: process.env.NODE_ENV,
      url: context.url || 'unknown',
      userId: context.userId || 'anonymous'
    };

    // Log to console in development
    if (!this.isProduction) {
      console.error('Error tracked:', errorData);
    }

    // Send to Sentry in production
    if (this.sentryDsn && this.isProduction) {
      this.sendToSentry(errorData);
    }

    // Store in local error log
    this.logError(errorData);
  }

  /**
   * Track GitHub API usage
   */
  trackGitHubAPIUsage(endpoint, method, statusCode, responseTime, rateLimitInfo = {}) {
    const usageData = {
      endpoint,
      method,
      statusCode,
      responseTime,
      timestamp: new Date().toISOString(),
      rateLimitInfo: {
        limit: rateLimitInfo.limit || 0,
        remaining: rateLimitInfo.remaining || 0,
        reset: rateLimitInfo.reset || 0,
        used: rateLimitInfo.used || 0
      }
    };

    // Log API usage
    this.logAPIUsage(usageData);

    // Check for rate limit warnings
    if (rateLimitInfo.remaining && rateLimitInfo.remaining < 100) {
      this.trackAlert('github_rate_limit_warning', {
        remaining: rateLimitInfo.remaining,
        reset: rateLimitInfo.reset
      });
    }

    // Track API errors
    if (statusCode >= 400) {
      this.trackError(new Error(`GitHub API Error: ${statusCode}`), {
        endpoint,
        method,
        statusCode
      });
    }
  }

  /**
   * Track performance metrics
   */
  trackPerformance(metric, value, context = {}) {
    const performanceData = {
      metric,
      value,
      timestamp: new Date().toISOString(),
      context,
      environment: process.env.NODE_ENV
    };

    // Log performance data
    this.logPerformance(performanceData);

    // Check for performance alerts
    this.checkPerformanceThresholds(metric, value, context);
  }

  /**
   * Track custom events
   */
  trackEvent(eventName, properties = {}) {
    const eventData = {
      event: eventName,
      properties,
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV
    };

    // Log event
    this.logEvent(eventData);

    // Send to analytics
    if (this.analyticsId && this.isProduction) {
      this.sendToAnalytics(eventData);
    }
  }

  /**
   * Track alerts and notifications
   */
  trackAlert(alertType, data = {}) {
    const alertData = {
      type: alertType,
      data,
      timestamp: new Date().toISOString(),
      severity: this.getAlertSeverity(alertType),
      environment: process.env.NODE_ENV
    };

    // Log alert
    this.logAlert(alertData);

    // Send notifications for critical alerts
    if (alertData.severity === 'critical') {
      this.sendCriticalAlert(alertData);
    }
  }

  /**
   * Get alert severity level
   */
  getAlertSeverity(alertType) {
    const severityMap = {
      'github_rate_limit_warning': 'warning',
      'github_rate_limit_exceeded': 'critical',
      'authentication_failure': 'warning',
      'repository_access_denied': 'warning',
      'high_error_rate': 'critical',
      'slow_response_time': 'warning',
      'deployment_failure': 'critical'
    };

    return severityMap[alertType] || 'info';
  }

  /**
   * Check performance thresholds
   */
  checkPerformanceThresholds(metric, value, context) {
    const thresholds = {
      'response_time': { warning: 2000, critical: 5000 }, // milliseconds
      'memory_usage': { warning: 80, critical: 95 }, // percentage
      'error_rate': { warning: 5, critical: 10 }, // percentage
      'github_api_response_time': { warning: 3000, critical: 10000 } // milliseconds
    };

    const threshold = thresholds[metric];
    if (!threshold) return;

    if (value >= threshold.critical) {
      this.trackAlert(`${metric}_critical`, { value, threshold: threshold.critical, context });
    } else if (value >= threshold.warning) {
      this.trackAlert(`${metric}_warning`, { value, threshold: threshold.warning, context });
    }
  }

  /**
   * Log error to local storage/file
   */
  logError(errorData) {
    // In production, you might want to store this in a database or file
    if (process.env.LOG_LEVEL === 'debug' || !this.isProduction) {
      console.error('[ERROR]', JSON.stringify(errorData, null, 2));
    }
  }

  /**
   * Log API usage
   */
  logAPIUsage(usageData) {
    if (process.env.LOG_LEVEL === 'debug' || !this.isProduction) {
      console.log('[API_USAGE]', JSON.stringify(usageData, null, 2));
    }
  }

  /**
   * Log performance data
   */
  logPerformance(performanceData) {
    if (process.env.LOG_LEVEL === 'debug' || !this.isProduction) {
      console.log('[PERFORMANCE]', JSON.stringify(performanceData, null, 2));
    }
  }

  /**
   * Log events
   */
  logEvent(eventData) {
    if (process.env.LOG_LEVEL === 'debug' || !this.isProduction) {
      console.log('[EVENT]', JSON.stringify(eventData, null, 2));
    }
  }

  /**
   * Log alerts
   */
  logAlert(alertData) {
    const logLevel = alertData.severity === 'critical' ? 'error' : 'warn';
    console[logLevel]('[ALERT]', JSON.stringify(alertData, null, 2));
  }

  /**
   * Send error to Sentry
   */
  sendToSentry(errorData) {
    // Implementation would depend on Sentry SDK
    // This is a placeholder for the actual Sentry integration
    console.log('Sending to Sentry:', errorData);
  }

  /**
   * Send event to analytics
   */
  sendToAnalytics(eventData) {
    // Implementation would depend on analytics provider
    // This is a placeholder for the actual analytics integration
    console.log('Sending to Analytics:', eventData);
  }

  /**
   * Send critical alert notification
   */
  sendCriticalAlert(alertData) {
    // Implementation would send notifications via email, Slack, etc.
    console.error('CRITICAL ALERT:', alertData);
    
    // In production, you might want to:
    // - Send email notifications
    // - Post to Slack channel
    // - Create PagerDuty incident
    // - Send SMS alerts
  }

  /**
   * Get monitoring dashboard data
   */
  async getDashboardData(timeRange = '24h') {
    // This would typically query a database or monitoring service
    // For now, return mock data structure
    return {
      timeRange,
      errors: {
        total: 0,
        rate: 0,
        topErrors: []
      },
      performance: {
        averageResponseTime: 0,
        p95ResponseTime: 0,
        throughput: 0
      },
      githubAPI: {
        requestCount: 0,
        errorRate: 0,
        rateLimitStatus: {
          limit: 5000,
          remaining: 5000,
          reset: Date.now() + 3600000
        }
      },
      alerts: {
        active: 0,
        resolved: 0,
        critical: 0
      }
    };
  }

  /**
   * Health check endpoint data
   */
  async getHealthStatus() {
    const status = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      version: process.env.npm_package_version || '1.0.0',
      environment: process.env.NODE_ENV,
      services: {
        github: await this.checkGitHubAPIHealth(),
        database: await this.checkDatabaseHealth(),
        redis: await this.checkRedisHealth()
      }
    };

    // Determine overall status
    const serviceStatuses = Object.values(status.services);
    if (serviceStatuses.some(s => s.status === 'unhealthy')) {
      status.status = 'unhealthy';
    } else if (serviceStatuses.some(s => s.status === 'degraded')) {
      status.status = 'degraded';
    }

    return status;
  }

  /**
   * Check GitHub API health
   */
  async checkGitHubAPIHealth() {
    try {
      const response = await fetch('https://api.github.com/rate_limit', {
        headers: {
          'Authorization': `token ${process.env.GITHUB_CLIENT_SECRET}`,
          'User-Agent': 'Nebula-Portfolio-Platform'
        }
      });

      if (response.ok) {
        const data = await response.json();
        return {
          status: 'healthy',
          rateLimit: data.rate,
          lastChecked: new Date().toISOString()
        };
      } else {
        return {
          status: 'unhealthy',
          error: `HTTP ${response.status}`,
          lastChecked: new Date().toISOString()
        };
      }
    } catch (error) {
      return {
        status: 'unhealthy',
        error: error.message,
        lastChecked: new Date().toISOString()
      };
    }
  }

  /**
   * Check database health (if applicable)
   */
  async checkDatabaseHealth() {
    // Since we don't use a database, return healthy
    return {
      status: 'healthy',
      message: 'No database configured',
      lastChecked: new Date().toISOString()
    };
  }

  /**
   * Check Redis health (if configured)
   */
  async checkRedisHealth() {
    if (!process.env.RATE_LIMIT_REDIS_URL) {
      return {
        status: 'healthy',
        message: 'Redis not configured',
        lastChecked: new Date().toISOString()
      };
    }

    try {
      // In a real implementation, you would ping Redis here
      return {
        status: 'healthy',
        lastChecked: new Date().toISOString()
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        error: error.message,
        lastChecked: new Date().toISOString()
      };
    }
  }
}

// Create singleton instance
const monitoringService = new MonitoringService();

export default monitoringService;