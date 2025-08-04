/**
 * GitHub API Error Classes
 * Provides specific error types for different GitHub API failure scenarios
 */

/**
 * Base GitHub API Error class
 */
export class GitHubAPIError extends Error {
  constructor(message, status = null, endpoint = null, response = null) {
    super(message);
    this.name = 'GitHubAPIError';
    this.status = status;
    this.endpoint = endpoint;
    this.response = response;
    this.timestamp = new Date().toISOString();
  }

  toJSON() {
    return {
      name: this.name,
      message: this.message,
      status: this.status,
      endpoint: this.endpoint,
      timestamp: this.timestamp
    };
  }
}

/**
 * Authentication/Authorization errors (401, 403)
 */
export class GitHubAuthError extends GitHubAPIError {
  constructor(message, status, endpoint, response) {
    super(message, status, endpoint, response);
    this.name = 'GitHubAuthError';
  }
}

/**
 * Resource not found errors (404)
 */
export class GitHubNotFoundError extends GitHubAPIError {
  constructor(message, endpoint, response) {
    super(message, 404, endpoint, response);
    this.name = 'GitHubNotFoundError';
  }
}

/**
 * Rate limiting errors (403 with rate limit headers)
 */
export class GitHubRateLimitError extends GitHubAPIError {
  constructor(message, resetTime, remaining = 0, limit = 0) {
    super(message, 403, null, null);
    this.name = 'GitHubRateLimitError';
    this.resetTime = resetTime;
    this.remaining = remaining;
    this.limit = limit;
  }

  get resetDate() {
    return new Date(this.resetTime * 1000);
  }

  get timeUntilReset() {
    return Math.max(0, this.resetTime * 1000 - Date.now());
  }

  toJSON() {
    return {
      ...super.toJSON(),
      resetTime: this.resetTime,
      resetDate: this.resetDate.toISOString(),
      remaining: this.remaining,
      limit: this.limit,
      timeUntilReset: this.timeUntilReset
    };
  }
}

/**
 * Conflict errors (409, 422)
 */
export class GitHubConflictError extends GitHubAPIError {
  constructor(message, status, endpoint, response) {
    super(message, status, endpoint, response);
    this.name = 'GitHubConflictError';
  }
}

/**
 * Validation errors (422)
 */
export class GitHubValidationError extends GitHubAPIError {
  constructor(message, errors = [], endpoint = null, response = null) {
    super(message, 422, endpoint, response);
    this.name = 'GitHubValidationError';
    this.errors = errors;
  }

  toJSON() {
    return {
      ...super.toJSON(),
      errors: this.errors
    };
  }
}

/**
 * Network/connectivity errors
 */
export class GitHubNetworkError extends GitHubAPIError {
  constructor(message, originalError = null) {
    super(message, null, null, null);
    this.name = 'GitHubNetworkError';
    this.originalError = originalError;
  }
}

/**
 * Server errors (5xx)
 */
export class GitHubServerError extends GitHubAPIError {
  constructor(message, status, endpoint, response) {
    super(message, status, endpoint, response);
    this.name = 'GitHubServerError';
  }
}

/**
 * Parse GitHub API error response and create appropriate error instance
 * @param {Error} error - Original error from Octokit
 * @param {string} endpoint - API endpoint that failed
 * @returns {GitHubAPIError} Specific error instance
 */
export function parseGitHubError(error, endpoint = null) {
  const status = error.status || error.response?.status;
  const message = error.message || 'Unknown GitHub API error';
  const response = error.response;

  // Rate limiting
  if (status === 403 && error.response?.headers) {
    const rateLimitRemaining = parseInt(error.response.headers['x-ratelimit-remaining']) || 0;
    const rateLimitReset = parseInt(error.response.headers['x-ratelimit-reset']) || 0;
    const rateLimitLimit = parseInt(error.response.headers['x-ratelimit-limit']) || 0;

    if (rateLimitRemaining === 0 && rateLimitReset > 0) {
      return new GitHubRateLimitError(
        'GitHub API rate limit exceeded',
        rateLimitReset,
        rateLimitRemaining,
        rateLimitLimit
      );
    }
  }

  // Authentication/Authorization
  if (status === 401) {
    return new GitHubAuthError(
      'GitHub authentication failed - invalid or expired token',
      status,
      endpoint,
      response
    );
  }

  if (status === 403) {
    return new GitHubAuthError(
      'GitHub authorization failed - insufficient permissions',
      status,
      endpoint,
      response
    );
  }

  // Not found
  if (status === 404) {
    return new GitHubNotFoundError(
      'GitHub resource not found',
      endpoint,
      response
    );
  }

  // Conflicts
  if (status === 409) {
    return new GitHubConflictError(
      'GitHub resource conflict - resource may have been modified',
      status,
      endpoint,
      response
    );
  }

  // Validation errors
  if (status === 422) {
    const errors = response?.data?.errors || [];
    return new GitHubValidationError(
      'GitHub validation failed',
      errors,
      endpoint,
      response
    );
  }

  // Server errors
  if (status >= 500) {
    return new GitHubServerError(
      'GitHub server error',
      status,
      endpoint,
      response
    );
  }

  // Network errors (no status code)
  if (!status) {
    return new GitHubNetworkError(
      'Network error connecting to GitHub',
      error
    );
  }

  // Generic API error
  return new GitHubAPIError(message, status, endpoint, response);
}

/**
 * Check if error is retryable
 * @param {GitHubAPIError} error - GitHub error instance
 * @returns {boolean} True if error is retryable
 */
export function isRetryableError(error) {
  // Rate limit errors are retryable after reset time
  if (error instanceof GitHubRateLimitError) {
    return true;
  }

  // Server errors are retryable
  if (error instanceof GitHubServerError) {
    return true;
  }

  // Network errors are retryable
  if (error instanceof GitHubNetworkError) {
    return true;
  }

  // Temporary GitHub issues (502, 503, 504)
  if (error.status === 502 || error.status === 503 || error.status === 504) {
    return true;
  }

  return false;
}

/**
 * Get retry delay for retryable errors
 * @param {GitHubAPIError} error - GitHub error instance
 * @param {number} attempt - Current retry attempt (0-based)
 * @returns {number} Delay in milliseconds
 */
export function getRetryDelay(error, attempt = 0) {
  // Rate limit errors: wait until reset time
  if (error instanceof GitHubRateLimitError) {
    return Math.max(1000, error.timeUntilReset + 1000); // Add 1 second buffer
  }

  // Exponential backoff for other retryable errors
  const baseDelay = 1000; // 1 second
  const maxDelay = 30000; // 30 seconds
  const delay = Math.min(baseDelay * Math.pow(2, attempt), maxDelay);
  
  // Add jitter to prevent thundering herd
  const jitter = Math.random() * 0.1 * delay;
  
  return Math.floor(delay + jitter);
}

/**
 * Create user-friendly error message
 * @param {GitHubAPIError} error - GitHub error instance
 * @returns {string} User-friendly error message
 */
export function getUserFriendlyMessage(error) {
  if (error instanceof GitHubAuthError) {
    if (error.status === 401) {
      return 'Your GitHub authentication has expired. Please sign in again.';
    }
    return 'You don\'t have permission to perform this action. Please check your GitHub token permissions.';
  }

  if (error instanceof GitHubNotFoundError) {
    return 'The requested repository or file was not found. It may have been deleted or made private.';
  }

  if (error instanceof GitHubRateLimitError) {
    const resetTime = error.resetDate.toLocaleTimeString();
    return `GitHub API rate limit exceeded. Please try again after ${resetTime}.`;
  }

  if (error instanceof GitHubConflictError) {
    return 'The file has been modified by someone else. Please refresh and try again.';
  }

  if (error instanceof GitHubValidationError) {
    return 'The data you submitted is invalid. Please check your input and try again.';
  }

  if (error instanceof GitHubServerError) {
    return 'GitHub is experiencing technical difficulties. Please try again in a few minutes.';
  }

  if (error instanceof GitHubNetworkError) {
    return 'Unable to connect to GitHub. Please check your internet connection and try again.';
  }

  return 'An unexpected error occurred. Please try again.';
}