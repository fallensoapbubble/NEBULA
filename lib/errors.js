/**
 * Custom error classes and error handling utilities for the Nebula platform
 * Provides centralized error handling, categorization, and recovery suggestions
 */

import { createLogger } from './logger.js';

const errorLogger = createLogger('ErrorHandler');

/**
 * Enhanced base application error class with categorization and recovery suggestions
 */
export class NebulaError extends Error {
  constructor(message, code = 'UNKNOWN_ERROR', statusCode = 500, category = ERROR_CATEGORIES.SYSTEM) {
    super(message);
    this.name = 'NebulaError';
    this.code = code;
    this.statusCode = statusCode;
    this.category = category;
    this.timestamp = new Date().toISOString();
    this.severity = this.determineSeverity();
    this.userMessage = this.getUserMessage();
    this.suggestions = this.getRecoverySuggestions();
    this.isRetryable = this.determineRetryability();
  }

  /**
   * Determine error severity based on status code and category
   */
  determineSeverity() {
    if (this.statusCode >= 500) return ERROR_SEVERITY.HIGH;
    if (this.statusCode === 429) return ERROR_SEVERITY.MEDIUM;
    if (this.statusCode >= 400) return ERROR_SEVERITY.LOW;
    return ERROR_SEVERITY.MEDIUM;
  }

  /**
   * Get user-friendly error message
   */
  getUserMessage() {
    switch (this.category) {
      case ERROR_CATEGORIES.AUTHENTICATION:
        return 'Authentication failed. Please sign in again.';
      case ERROR_CATEGORIES.AUTHORIZATION:
        return 'You don\'t have permission to perform this action.';
      case ERROR_CATEGORIES.GITHUB_API:
        return 'GitHub service is temporarily unavailable.';
      case ERROR_CATEGORIES.TEMPLATE:
        return 'Template validation failed. Please check the template structure.';
      case ERROR_CATEGORIES.VALIDATION:
        return 'Invalid input provided. Please check your data and try again.';
      case ERROR_CATEGORIES.NETWORK:
        return 'Network connection failed. Please check your internet connection.';
      case ERROR_CATEGORIES.RATE_LIMIT:
        return 'Too many requests. Please wait a moment before trying again.';
      case ERROR_CATEGORIES.REPOSITORY:
        return 'Repository operation failed. The repository may not exist or be accessible.';
      case ERROR_CATEGORIES.CONTENT:
        return 'Content operation failed. Please check the file format and try again.';
      default:
        return 'An unexpected error occurred. Please try again.';
    }
  }

  /**
   * Get recovery suggestions based on error category
   */
  getRecoverySuggestions() {
    switch (this.category) {
      case ERROR_CATEGORIES.AUTHENTICATION:
        return [
          'Sign in again with your GitHub account',
          'Clear browser cookies and cache',
          'Check if your GitHub account is still active'
        ];
      case ERROR_CATEGORIES.AUTHORIZATION:
        return [
          'Re-authorize the application with GitHub',
          'Check if you have the required repository permissions',
          'Contact the repository owner for access'
        ];
      case ERROR_CATEGORIES.GITHUB_API:
        return [
          'Wait a few minutes and try again',
          'Check GitHub status at https://www.githubstatus.com/',
          'Try again with a stable internet connection'
        ];
      case ERROR_CATEGORIES.TEMPLATE:
        return [
          'Verify the template follows the required structure',
          'Check if all required files are present',
          'Try using a different template'
        ];
      case ERROR_CATEGORIES.VALIDATION:
        return [
          'Check your input data for errors',
          'Ensure all required fields are filled',
          'Verify data formats match requirements'
        ];
      case ERROR_CATEGORIES.NETWORK:
        return [
          'Check your internet connection',
          'Try refreshing the page',
          'Use a different network if available'
        ];
      case ERROR_CATEGORIES.RATE_LIMIT:
        return [
          'Wait 5-10 minutes before trying again',
          'Reduce the frequency of your requests',
          'Try again during off-peak hours'
        ];
      case ERROR_CATEGORIES.REPOSITORY:
        return [
          'Verify the repository exists and is accessible',
          'Check if you have the required permissions',
          'Ensure the repository is not private or deleted'
        ];
      case ERROR_CATEGORIES.CONTENT:
        return [
          'Check the file format and structure',
          'Verify the content meets validation requirements',
          'Try saving smaller changes incrementally'
        ];
      default:
        return [
          'Try refreshing the page',
          'Clear browser cache and cookies',
          'Contact support if the problem persists'
        ];
    }
  }

  /**
   * Determine if error is retryable
   */
  determineRetryability() {
    const retryableCategories = [
      ERROR_CATEGORIES.GITHUB_API,
      ERROR_CATEGORIES.NETWORK,
      ERROR_CATEGORIES.RATE_LIMIT
    ];
    
    const retryableStatusCodes = [429, 500, 502, 503, 504];
    
    return retryableCategories.includes(this.category) || 
           retryableStatusCodes.includes(this.statusCode);
  }

  toJSON() {
    return {
      name: this.name,
      message: this.message,
      code: this.code,
      statusCode: this.statusCode,
      category: this.category,
      severity: this.severity,
      timestamp: this.timestamp,
      userMessage: this.userMessage,
      suggestions: this.suggestions,
      isRetryable: this.isRetryable
    };
  }
}

/**
 * Enhanced GitHub API error class
 */
export class GitHubAPIError extends NebulaError {
  constructor(message, status, endpoint = null) {
    let code = 'GITHUB_API_ERROR';
    let category = ERROR_CATEGORIES.GITHUB_API;

    // Map GitHub API status codes to specific error codes and categories
    switch (status) {
      case 401:
        code = 'GITHUB_UNAUTHORIZED';
        category = ERROR_CATEGORIES.AUTHENTICATION;
        break;
      case 403:
        if (message.includes('rate limit')) {
          code = 'GITHUB_RATE_LIMITED';
          category = ERROR_CATEGORIES.RATE_LIMIT;
        } else {
          code = 'GITHUB_FORBIDDEN';
          category = ERROR_CATEGORIES.AUTHORIZATION;
        }
        break;
      case 404:
        code = 'GITHUB_NOT_FOUND';
        category = ERROR_CATEGORIES.REPOSITORY;
        break;
      case 409:
        code = 'GITHUB_CONFLICT';
        category = ERROR_CATEGORIES.CONTENT;
        break;
      case 422:
        code = 'GITHUB_VALIDATION_ERROR';
        category = ERROR_CATEGORIES.VALIDATION;
        break;
    }

    super(message, code, status || 500, category);
    this.name = 'GitHubAPIError';
    this.endpoint = endpoint;
  }
}

/**
 * Enhanced template error class
 */
export class TemplateError extends NebulaError {
  constructor(message, templatePath = null) {
    super(message, 'TEMPLATE_ERROR', 400, ERROR_CATEGORIES.TEMPLATE);
    this.name = 'TemplateError';
    this.templatePath = templatePath;
  }
}

/**
 * Enhanced authentication error class
 */
export class AuthenticationError extends NebulaError {
  constructor(message) {
    super(message, 'AUTHENTICATION_ERROR', 401, ERROR_CATEGORIES.AUTHENTICATION);
    this.name = 'AuthenticationError';
  }
}

/**
 * Enhanced validation error class
 */
export class ValidationError extends NebulaError {
  constructor(message, field = null) {
    super(message, 'VALIDATION_ERROR', 400, ERROR_CATEGORIES.VALIDATION);
    this.name = 'ValidationError';
    this.field = field;
  }
}

/**
 * Network error class
 */
export class NetworkError extends NebulaError {
  constructor(message, originalError = null) {
    super(message, 'NETWORK_ERROR', 503, ERROR_CATEGORIES.NETWORK);
    this.name = 'NetworkError';
    this.originalError = originalError;
  }
}

/**
 * Repository error class
 */
export class RepositoryError extends NebulaError {
  constructor(message, repository = null) {
    super(message, 'REPOSITORY_ERROR', 404, ERROR_CATEGORIES.REPOSITORY);
    this.name = 'RepositoryError';
    this.repository = repository;
  }
}

/**
 * Content error class
 */
export class ContentError extends NebulaError {
  constructor(message, filePath = null) {
    super(message, 'CONTENT_ERROR', 400, ERROR_CATEGORIES.CONTENT);
    this.name = 'ContentError';
    this.filePath = filePath;
  }
}

/**
 * Error categories for better organization and handling
 */
export const ERROR_CATEGORIES = {
  AUTHENTICATION: 'authentication',
  AUTHORIZATION: 'authorization',
  GITHUB_API: 'github_api',
  TEMPLATE: 'template',
  VALIDATION: 'validation',
  NETWORK: 'network',
  RATE_LIMIT: 'rate_limit',
  REPOSITORY: 'repository',
  CONTENT: 'content',
  SYSTEM: 'system'
};

/**
 * Error severity levels
 */
export const ERROR_SEVERITY = {
  LOW: 'low',
  MEDIUM: 'medium',
  HIGH: 'high',
  CRITICAL: 'critical'
};

/**
 * Centralized error handler with comprehensive logging and categorization
 */
export const ErrorHandler = {
  /**
   * Handle any error and convert to appropriate NebulaError
   * @param {Error|string|Object} error - The error to handle
   * @param {Object} context - Additional context for error handling
   * @returns {NebulaError} - Standardized error object
   */
  handleError(error, context = {}) {
    let nebulaError;

    if (error instanceof NebulaError) {
      nebulaError = error;
    } else if (error instanceof Error) {
      nebulaError = this.convertToNebulaError(error, context);
    } else if (typeof error === 'string') {
      nebulaError = new NebulaError(error, 'UNKNOWN_ERROR', 500, ERROR_CATEGORIES.SYSTEM);
    } else {
      nebulaError = new NebulaError('Unknown error occurred', 'UNKNOWN_ERROR', 500, ERROR_CATEGORIES.SYSTEM);
    }

    // Log the error with full context
    this.logError(nebulaError, context);

    return nebulaError;
  },

  /**
   * Convert generic Error to appropriate NebulaError
   * @param {Error} error - Generic error object
   * @param {Object} context - Additional context
   * @returns {NebulaError} - Converted error
   */
  convertToNebulaError(error, context = {}) {
    // GitHub API errors
    if (error.status || context.source === 'github') {
      return this.handleGitHubError(error, context);
    }

    // Network errors
    if (error.name === 'TypeError' && error.message.includes('fetch')) {
      return new NetworkError('Network request failed', error);
    }

    // Timeout errors
    if (error.name === 'AbortError' || error.message.includes('timeout')) {
      return new NetworkError('Request timed out', error);
    }

    // Template errors
    if (context.source === 'template') {
      return new TemplateError(error.message, context.templatePath);
    }

    // Authentication errors
    if (context.source === 'auth' || error.message.includes('auth')) {
      return new AuthenticationError(error.message);
    }

    // Validation errors
    if (error.name === 'ValidationError' || context.source === 'validation') {
      return new ValidationError(error.message, context.field);
    }

    // Repository errors
    if (context.source === 'repository') {
      return new RepositoryError(error.message, context.repository);
    }

    // Content errors
    if (context.source === 'content') {
      return new ContentError(error.message, context.filePath);
    }

    // Generic error
    return new NebulaError(
      error.message || 'An unexpected error occurred',
      'UNKNOWN_ERROR',
      500,
      ERROR_CATEGORIES.SYSTEM
    );
  },

  /**
   * Handle GitHub API errors specifically
   * @param {Error} error - GitHub API error
   * @param {Object} context - Additional context
   * @returns {GitHubAPIError} - GitHub-specific error
   */
  handleGitHubError(error, context = {}) {
    const status = error.status || error.response?.status;
    const endpoint = error.request?.url || context.endpoint;
    const message = error.message || 'GitHub API request failed';

    const githubError = new GitHubAPIError(message, status, endpoint);
    
    // Add GitHub-specific context
    if (error.response?.headers) {
      githubError.rateLimitRemaining = error.response.headers['x-ratelimit-remaining'];
      githubError.rateLimitReset = error.response.headers['x-ratelimit-reset'];
    }

    return githubError;
  },

  /**
   * Handle template validation errors
   * @param {Error} error - Template error
   * @param {string} templatePath - Path to the template
   * @returns {TemplateError} - Template-specific error
   */
  handleTemplateError(error, templatePath = null) {
    return new TemplateError(
      error.message || 'Template validation failed',
      templatePath
    );
  },

  /**
   * Format error for API response
   * @param {NebulaError} error - The error to format
   * @param {boolean} includeStack - Whether to include stack trace (dev only)
   * @returns {Object} - Formatted error response
   */
  formatErrorResponse(error, includeStack = false) {
    const response = {
      error: {
        message: error.userMessage || error.message,
        code: error.code,
        category: error.category,
        severity: error.severity,
        statusCode: error.statusCode,
        timestamp: error.timestamp,
        suggestions: error.suggestions,
        isRetryable: error.isRetryable
      }
    };

    // Add specific error properties
    if (error.field) response.error.field = error.field;
    if (error.endpoint) response.error.endpoint = error.endpoint;
    if (error.templatePath) response.error.templatePath = error.templatePath;
    if (error.repository) response.error.repository = error.repository;
    if (error.filePath) response.error.filePath = error.filePath;

    // Include stack trace in development
    if (includeStack && process.env.NODE_ENV === 'development') {
      response.error.stack = error.stack;
    }

    // Add retry information for retryable errors
    if (error.isRetryable) {
      response.error.retryAfter = this.getRetryDelay(error);
    }

    return response;
  },

  /**
   * Get retry delay for retryable errors
   * @param {NebulaError} error - The error to get retry delay for
   * @param {number} attempt - Current retry attempt (0-based)
   * @returns {number} - Delay in milliseconds
   */
  getRetryDelay(error, attempt = 0) {
    // Rate limit errors: use GitHub's reset time
    if (error.code === 'GITHUB_RATE_LIMITED' && error.rateLimitReset) {
      return Math.max(1000, (error.rateLimitReset * 1000) - Date.now() + 1000);
    }

    // Exponential backoff for other retryable errors
    const baseDelay = 1000; // 1 second
    const maxDelay = 30000; // 30 seconds
    const delay = Math.min(baseDelay * Math.pow(2, attempt), maxDelay);
    
    // Add jitter to prevent thundering herd
    const jitter = Math.random() * 0.1 * delay;
    
    return Math.floor(delay + jitter);
  },

  /**
   * Log error with comprehensive details
   * @param {NebulaError} error - The error to log
   * @param {Object} context - Additional context for logging
   */
  logError(error, context = {}) {
    const logData = {
      error: error.toJSON(),
      context: {
        ...context,
        userAgent: context.userAgent,
        ip: context.ip,
        userId: context.userId,
        sessionId: context.sessionId,
        requestId: context.requestId,
        url: context.url,
        method: context.method
      },
      timestamp: new Date().toISOString()
    };

    // Log at appropriate level based on severity
    switch (error.severity) {
      case ERROR_SEVERITY.CRITICAL:
        errorLogger.error(`CRITICAL: ${error.message}`, logData);
        break;
      case ERROR_SEVERITY.HIGH:
        errorLogger.error(`HIGH: ${error.message}`, logData);
        break;
      case ERROR_SEVERITY.MEDIUM:
        errorLogger.warn(`MEDIUM: ${error.message}`, logData);
        break;
      case ERROR_SEVERITY.LOW:
        errorLogger.info(`LOW: ${error.message}`, logData);
        break;
      default:
        errorLogger.error(`UNKNOWN: ${error.message}`, logData);
    }

    // Additional logging for specific error types
    if (error.category === ERROR_CATEGORIES.GITHUB_API) {
      errorLogger.info('GitHub API Error Details', {
        endpoint: error.endpoint,
        status: error.statusCode,
        rateLimitRemaining: error.rateLimitRemaining,
        rateLimitReset: error.rateLimitReset
      });
    }
  },

  /**
   * Create error context from request object
   * @param {Object} req - Request object (Next.js or Express)
   * @returns {Object} - Error context
   */
  createErrorContext(req) {
    return {
      url: req.url,
      method: req.method,
      userAgent: req.headers?.['user-agent'],
      ip: req.ip || req.connection?.remoteAddress,
      sessionId: req.session?.id,
      userId: req.session?.user?.id,
      requestId: req.headers?.['x-request-id'] || Math.random().toString(36).substr(2, 9)
    };
  },

  /**
   * Middleware for handling errors in API routes
   * @param {Function} handler - API route handler
   * @returns {Function} - Wrapped handler with error handling
   */
  withErrorHandling(handler) {
    return async (req, res) => {
      try {
        return await handler(req, res);
      } catch (error) {
        const context = this.createErrorContext(req);
        const nebulaError = this.handleError(error, context);
        const errorResponse = this.formatErrorResponse(nebulaError);
        
        res.status(nebulaError.statusCode).json(errorResponse);
      }
    };
  }
};