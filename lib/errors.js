/**
 * Custom error classes and error handling utilities for the Nebula platform
 */

/**
 * Base application error class
 */
export class NebulaError extends Error {
  constructor(message, code = 'UNKNOWN_ERROR', statusCode = 500) {
    super(message);
    this.name = 'NebulaError';
    this.code = code;
    this.statusCode = statusCode;
    this.timestamp = new Date().toISOString();
  }

  toJSON() {
    return {
      name: this.name,
      message: this.message,
      code: this.code,
      statusCode: this.statusCode,
      timestamp: this.timestamp
    };
  }
}

/**
 * GitHub API specific error class
 */
export class GitHubAPIError extends NebulaError {
  constructor(message, status, endpoint = null) {
    let code = 'GITHUB_API_ERROR';
    let statusCode = status || 500;

    // Map GitHub API status codes to specific error codes
    switch (status) {
      case 401:
        code = 'GITHUB_UNAUTHORIZED';
        break;
      case 403:
        code = status === 403 && message.includes('rate limit') 
          ? 'GITHUB_RATE_LIMITED' 
          : 'GITHUB_FORBIDDEN';
        break;
      case 404:
        code = 'GITHUB_NOT_FOUND';
        break;
      case 409:
        code = 'GITHUB_CONFLICT';
        break;
      case 422:
        code = 'GITHUB_VALIDATION_ERROR';
        break;
    }

    super(message, code, statusCode);
    this.name = 'GitHubAPIError';
    this.endpoint = endpoint;
  }
}

/**
 * Template validation error class
 */
export class TemplateError extends NebulaError {
  constructor(message, templatePath = null) {
    super(message, 'TEMPLATE_ERROR', 400);
    this.name = 'TemplateError';
    this.templatePath = templatePath;
  }
}

/**
 * Authentication error class
 */
export class AuthenticationError extends NebulaError {
  constructor(message) {
    super(message, 'AUTHENTICATION_ERROR', 401);
    this.name = 'AuthenticationError';
  }
}

/**
 * Validation error class
 */
export class ValidationError extends NebulaError {
  constructor(message, field = null) {
    super(message, 'VALIDATION_ERROR', 400);
    this.name = 'ValidationError';
    this.field = field;
  }
}

/**
 * Error handler utility functions
 */
export const ErrorHandler = {
  /**
   * Handles GitHub API errors and returns appropriate error response
   * @param {Error} error - The error to handle
   * @returns {Object} - Formatted error response
   */
  handleGitHubError(error) {
    if (error.status) {
      return new GitHubAPIError(
        error.message || 'GitHub API request failed',
        error.status,
        error.request?.url
      );
    }
    
    return new GitHubAPIError(
      'Failed to connect to GitHub API',
      500
    );
  },

  /**
   * Handles template validation errors
   * @param {Error} error - The error to handle
   * @param {string} templatePath - Path to the template
   * @returns {TemplateError} - Formatted template error
   */
  handleTemplateError(error, templatePath = null) {
    return new TemplateError(
      error.message || 'Template validation failed',
      templatePath
    );
  },

  /**
   * Formats error for API response
   * @param {Error} error - The error to format
   * @returns {Object} - Formatted error response
   */
  formatErrorResponse(error) {
    if (error instanceof NebulaError) {
      return {
        error: {
          message: error.message,
          code: error.code,
          statusCode: error.statusCode,
          timestamp: error.timestamp,
          ...(error.field && { field: error.field }),
          ...(error.endpoint && { endpoint: error.endpoint }),
          ...(error.templatePath && { templatePath: error.templatePath })
        }
      };
    }

    // Handle unknown errors
    return {
      error: {
        message: 'An unexpected error occurred',
        code: 'INTERNAL_SERVER_ERROR',
        statusCode: 500,
        timestamp: new Date().toISOString()
      }
    };
  },

  /**
   * Logs error with appropriate level
   * @param {Error} error - The error to log
   * @param {Object} context - Additional context for logging
   */
  logError(error, context = {}) {
    const logData = {
      error: error instanceof NebulaError ? error.toJSON() : {
        name: error.name,
        message: error.message,
        stack: error.stack
      },
      context,
      timestamp: new Date().toISOString()
    };

    if (error instanceof NebulaError && error.statusCode < 500) {
      console.warn('Client Error:', JSON.stringify(logData, null, 2));
    } else {
      console.error('Server Error:', JSON.stringify(logData, null, 2));
    }
  }
};