/**
 * GitHub API Error Logging Service
 * Provides detailed logging and monitoring for GitHub API operations
 */

import { createLogger } from './logger.js';
import { ErrorHandler, ERROR_CATEGORIES } from './errors.js';

const githubLogger = createLogger('GitHubAPI');

/**
 * GitHub API operation types for logging
 */
export const GITHUB_OPERATIONS = {
  AUTHENTICATION: 'authentication',
  REPOSITORY_ACCESS: 'repository_access',
  REPOSITORY_FORK: 'repository_fork',
  CONTENT_READ: 'content_read',
  CONTENT_WRITE: 'content_write',
  COMMIT_CREATE: 'commit_create',
  BRANCH_CREATE: 'branch_create',
  USER_INFO: 'user_info',
  RATE_LIMIT_CHECK: 'rate_limit_check'
};

/**
 * GitHub API Error Logger class
 */
export class GitHubErrorLogger {
  constructor() {
    this.requestCount = 0;
    this.errorCount = 0;
    this.rateLimitWarnings = 0;
  }

  /**
   * Log GitHub API request start
   * @param {string} operation - Operation type
   * @param {string} endpoint - API endpoint
   * @param {Object} params - Request parameters
   * @returns {Object} - Request context for completion logging
   */
  logRequestStart(operation, endpoint, params = {}) {
    const requestId = `gh_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const startTime = Date.now();
    
    this.requestCount++;
    
    githubLogger.info('GitHub API Request Started', {
      requestId,
      operation,
      endpoint,
      params: this.sanitizeParams(params),
      startTime,
      requestCount: this.requestCount
    });

    return {
      requestId,
      operation,
      endpoint,
      startTime
    };
  }

  /**
   * Log successful GitHub API request completion
   * @param {Object} context - Request context from logRequestStart
   * @param {Object} response - API response
   */
  logRequestSuccess(context, response = {}) {
    const duration = Date.now() - context.startTime;
    const rateLimitInfo = this.extractRateLimitInfo(response);

    githubLogger.info('GitHub API Request Completed', {
      requestId: context.requestId,
      operation: context.operation,
      endpoint: context.endpoint,
      duration: `${duration}ms`,
      status: response.status || 200,
      rateLimitInfo,
      success: true
    });

    // Log rate limit warnings
    if (rateLimitInfo.remaining < 100) {
      this.logRateLimitWarning(rateLimitInfo);
    }
  }

  /**
   * Log GitHub API request error
   * @param {Object} context - Request context from logRequestStart
   * @param {Error} error - Error that occurred
   * @param {Object} additionalContext - Additional error context
   */
  logRequestError(context, error, additionalContext = {}) {
    const duration = Date.now() - context.startTime;
    this.errorCount++;

    // Create standardized error using centralized handler
    const nebulaError = ErrorHandler.handleError(error, {
      source: 'github',
      operation: context.operation,
      endpoint: context.endpoint,
      ...additionalContext
    });

    const rateLimitInfo = this.extractRateLimitInfo(error.response);

    githubLogger.error('GitHub API Request Failed', {
      requestId: context.requestId,
      operation: context.operation,
      endpoint: context.endpoint,
      duration: `${duration}ms`,
      error: nebulaError.toJSON(),
      rateLimitInfo,
      errorCount: this.errorCount,
      success: false
    });

    // Log specific error patterns
    this.logErrorPatterns(nebulaError, context);

    return nebulaError;
  }

  /**
   * Log rate limit warning
   * @param {Object} rateLimitInfo - Rate limit information
   */
  logRateLimitWarning(rateLimitInfo) {
    this.rateLimitWarnings++;
    
    githubLogger.warn('GitHub API Rate Limit Warning', {
      remaining: rateLimitInfo.remaining,
      limit: rateLimitInfo.limit,
      resetTime: rateLimitInfo.resetTime,
      resetDate: new Date(rateLimitInfo.resetTime * 1000).toISOString(),
      warningCount: this.rateLimitWarnings,
      category: ERROR_CATEGORIES.RATE_LIMIT
    });
  }

  /**
   * Log error patterns for monitoring and alerting
   * @param {NebulaError} error - Standardized error
   * @param {Object} context - Request context
   */
  logErrorPatterns(error, context) {
    // Authentication failures
    if (error.category === ERROR_CATEGORIES.AUTHENTICATION) {
      githubLogger.error('GitHub Authentication Pattern', {
        pattern: 'auth_failure',
        operation: context.operation,
        endpoint: context.endpoint,
        errorCode: error.code,
        suggestions: error.suggestions
      });
    }

    // Rate limit exceeded
    if (error.category === ERROR_CATEGORIES.RATE_LIMIT) {
      githubLogger.error('GitHub Rate Limit Pattern', {
        pattern: 'rate_limit_exceeded',
        operation: context.operation,
        endpoint: context.endpoint,
        resetTime: error.rateLimitReset,
        suggestions: error.suggestions
      });
    }

    // Repository access issues
    if (error.category === ERROR_CATEGORIES.REPOSITORY) {
      githubLogger.error('GitHub Repository Pattern', {
        pattern: 'repository_access',
        operation: context.operation,
        endpoint: context.endpoint,
        errorCode: error.code,
        suggestions: error.suggestions
      });
    }

    // Content conflicts
    if (error.category === ERROR_CATEGORIES.CONTENT && error.code === 'GITHUB_CONFLICT') {
      githubLogger.error('GitHub Content Conflict Pattern', {
        pattern: 'content_conflict',
        operation: context.operation,
        endpoint: context.endpoint,
        suggestions: error.suggestions
      });
    }
  }

  /**
   * Extract rate limit information from response headers
   * @param {Object} response - API response object
   * @returns {Object} - Rate limit information
   */
  extractRateLimitInfo(response) {
    if (!response?.headers) {
      return { remaining: null, limit: null, resetTime: null };
    }

    return {
      remaining: parseInt(response.headers['x-ratelimit-remaining']) || null,
      limit: parseInt(response.headers['x-ratelimit-limit']) || null,
      resetTime: parseInt(response.headers['x-ratelimit-reset']) || null,
      used: parseInt(response.headers['x-ratelimit-used']) || null,
      resource: response.headers['x-ratelimit-resource'] || null
    };
  }

  /**
   * Sanitize request parameters for logging (remove sensitive data)
   * @param {Object} params - Request parameters
   * @returns {Object} - Sanitized parameters
   */
  sanitizeParams(params) {
    const sanitized = { ...params };
    
    // Remove sensitive fields
    const sensitiveFields = ['token', 'password', 'secret', 'key', 'authorization'];
    
    for (const field of sensitiveFields) {
      if (sanitized[field]) {
        sanitized[field] = '[REDACTED]';
      }
    }

    // Truncate large content
    if (sanitized.content && sanitized.content.length > 1000) {
      sanitized.content = sanitized.content.substring(0, 1000) + '... [TRUNCATED]';
    }

    return sanitized;
  }

  /**
   * Get error statistics for monitoring
   * @returns {Object} - Error statistics
   */
  getErrorStats() {
    return {
      totalRequests: this.requestCount,
      totalErrors: this.errorCount,
      errorRate: this.requestCount > 0 ? (this.errorCount / this.requestCount) * 100 : 0,
      rateLimitWarnings: this.rateLimitWarnings,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Log periodic statistics
   */
  logStats() {
    const stats = this.getErrorStats();
    
    githubLogger.info('GitHub API Statistics', {
      ...stats,
      type: 'periodic_stats'
    });
  }

  /**
   * Reset statistics (useful for testing or periodic resets)
   */
  resetStats() {
    this.requestCount = 0;
    this.errorCount = 0;
    this.rateLimitWarnings = 0;
    
    githubLogger.info('GitHub API Statistics Reset', {
      timestamp: new Date().toISOString()
    });
  }
}

/**
 * Singleton instance for global use
 */
export const githubErrorLogger = new GitHubErrorLogger();

/**
 * Wrapper function for GitHub API calls with automatic error logging
 * @param {string} operation - Operation type
 * @param {string} endpoint - API endpoint
 * @param {Function} apiCall - Function that makes the API call
 * @param {Object} params - Request parameters
 * @returns {Promise} - API call result
 */
export async function withGitHubErrorLogging(operation, endpoint, apiCall, params = {}) {
  const context = githubErrorLogger.logRequestStart(operation, endpoint, params);
  
  try {
    const result = await apiCall();
    githubErrorLogger.logRequestSuccess(context, result);
    return result;
  } catch (error) {
    const nebulaError = githubErrorLogger.logRequestError(context, error, params);
    throw nebulaError;
  }
}

/**
 * Create operation-specific logging functions
 */
export const GitHubOperationLogger = {
  /**
   * Log authentication operations
   */
  auth: (endpoint, apiCall, params = {}) => 
    withGitHubErrorLogging(GITHUB_OPERATIONS.AUTHENTICATION, endpoint, apiCall, params),

  /**
   * Log repository access operations
   */
  repoAccess: (endpoint, apiCall, params = {}) => 
    withGitHubErrorLogging(GITHUB_OPERATIONS.REPOSITORY_ACCESS, endpoint, apiCall, params),

  /**
   * Log repository fork operations
   */
  repoFork: (endpoint, apiCall, params = {}) => 
    withGitHubErrorLogging(GITHUB_OPERATIONS.REPOSITORY_FORK, endpoint, apiCall, params),

  /**
   * Log content read operations
   */
  contentRead: (endpoint, apiCall, params = {}) => 
    withGitHubErrorLogging(GITHUB_OPERATIONS.CONTENT_READ, endpoint, apiCall, params),

  /**
   * Log content write operations
   */
  contentWrite: (endpoint, apiCall, params = {}) => 
    withGitHubErrorLogging(GITHUB_OPERATIONS.CONTENT_WRITE, endpoint, apiCall, params),

  /**
   * Log commit creation operations
   */
  commitCreate: (endpoint, apiCall, params = {}) => 
    withGitHubErrorLogging(GITHUB_OPERATIONS.COMMIT_CREATE, endpoint, apiCall, params),

  /**
   * Log user info operations
   */
  userInfo: (endpoint, apiCall, params = {}) => 
    withGitHubErrorLogging(GITHUB_OPERATIONS.USER_INFO, endpoint, apiCall, params)
};