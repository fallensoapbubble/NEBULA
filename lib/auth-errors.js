/**
 * Authentication Error Handling System
 * Provides comprehensive error categorization and user-friendly messages
 */

/**
 * Authentication error types
 */
export const AUTH_ERROR_TYPES = {
  // Configuration errors
  CONFIG_MISSING: 'CONFIG_MISSING',
  CONFIG_INVALID: 'CONFIG_INVALID',
  
  // OAuth flow errors
  OAUTH_SIGNIN: 'OAuthSignin',
  OAUTH_CALLBACK: 'OAuthCallback', 
  OAUTH_CREATE_ACCOUNT: 'OAuthCreateAccount',
  OAUTH_ACCOUNT_NOT_LINKED: 'OAuthAccountNotLinked',
  
  // Token errors
  TOKEN_INVALID: 'TOKEN_INVALID',
  TOKEN_EXPIRED: 'TOKEN_EXPIRED',
  TOKEN_REFRESH_FAILED: 'RefreshAccessTokenError',
  
  // Permission errors
  INSUFFICIENT_PERMISSIONS: 'INSUFFICIENT_PERMISSIONS',
  SCOPE_MISSING: 'SCOPE_MISSING',
  
  // GitHub API errors
  GITHUB_API_ERROR: 'GITHUB_API_ERROR',
  GITHUB_RATE_LIMIT: 'GITHUB_RATE_LIMIT',
  GITHUB_UNAVAILABLE: 'GITHUB_UNAVAILABLE',
  
  // Session errors
  SESSION_REQUIRED: 'SessionRequired',
  SESSION_INVALID: 'SESSION_INVALID',
  SESSION_EXPIRED: 'SESSION_EXPIRED',
  
  // Network errors
  NETWORK_ERROR: 'NETWORK_ERROR',
  TIMEOUT_ERROR: 'TIMEOUT_ERROR',
  
  // Generic errors
  UNKNOWN_ERROR: 'UNKNOWN_ERROR',
  VALIDATION_ERROR: 'VALIDATION_ERROR'
};

/**
 * Authentication error class with enhanced information
 */
export class AuthError extends Error {
  constructor(type, message, details = {}) {
    super(message);
    this.name = 'AuthError';
    this.type = type;
    this.details = details;
    this.timestamp = new Date();
    this.userMessage = this.getUserMessage();
    this.suggestions = this.getSuggestions();
    this.isRetryable = this.getRetryability();
  }

  /**
   * Get user-friendly error message
   */
  getUserMessage() {
    switch (this.type) {
      case AUTH_ERROR_TYPES.CONFIG_MISSING:
        return 'GitHub OAuth is not properly configured. Please contact support.';
      
      case AUTH_ERROR_TYPES.CONFIG_INVALID:
        return 'GitHub OAuth configuration is invalid. Please contact support.';
      
      case AUTH_ERROR_TYPES.OAUTH_SIGNIN:
        return 'Failed to start GitHub authentication. Please try again.';
      
      case AUTH_ERROR_TYPES.OAUTH_CALLBACK:
        return 'GitHub authentication was interrupted. Please try signing in again.';
      
      case AUTH_ERROR_TYPES.OAUTH_CREATE_ACCOUNT:
        return 'Unable to create your account. Please try again or contact support.';
      
      case AUTH_ERROR_TYPES.OAUTH_ACCOUNT_NOT_LINKED:
        return 'This email is already associated with another account. Please use a different GitHub account or contact support.';
      
      case AUTH_ERROR_TYPES.TOKEN_INVALID:
        return 'Your authentication has expired. Please sign in again.';
      
      case AUTH_ERROR_TYPES.TOKEN_EXPIRED:
        return 'Your session has expired. Please sign in again.';
      
      case AUTH_ERROR_TYPES.TOKEN_REFRESH_FAILED:
        return 'Unable to refresh your session. Please sign in again.';
      
      case AUTH_ERROR_TYPES.INSUFFICIENT_PERMISSIONS:
        return 'Additional GitHub permissions are required. Please re-authorize the application.';
      
      case AUTH_ERROR_TYPES.SCOPE_MISSING:
        return 'Required GitHub permissions are missing. Please re-authorize the application.';
      
      case AUTH_ERROR_TYPES.GITHUB_API_ERROR:
        return 'GitHub is currently unavailable. Please try again in a few minutes.';
      
      case AUTH_ERROR_TYPES.GITHUB_RATE_LIMIT:
        return 'Too many requests to GitHub. Please wait a few minutes before trying again.';
      
      case AUTH_ERROR_TYPES.GITHUB_UNAVAILABLE:
        return 'GitHub services are currently unavailable. Please try again later.';
      
      case AUTH_ERROR_TYPES.SESSION_REQUIRED:
        return 'Please sign in to access this feature.';
      
      case AUTH_ERROR_TYPES.SESSION_INVALID:
        return 'Your session is invalid. Please sign in again.';
      
      case AUTH_ERROR_TYPES.SESSION_EXPIRED:
        return 'Your session has expired. Please sign in again.';
      
      case AUTH_ERROR_TYPES.NETWORK_ERROR:
        return 'Network connection failed. Please check your internet connection and try again.';
      
      case AUTH_ERROR_TYPES.TIMEOUT_ERROR:
        return 'The request timed out. Please try again.';
      
      case AUTH_ERROR_TYPES.VALIDATION_ERROR:
        return 'Invalid request. Please try again or contact support.';
      
      default:
        return 'An unexpected error occurred. Please try again or contact support.';
    }
  }

  /**
   * Get actionable suggestions for the user
   */
  getSuggestions() {
    switch (this.type) {
      case AUTH_ERROR_TYPES.CONFIG_MISSING:
      case AUTH_ERROR_TYPES.CONFIG_INVALID:
        return [
          'Contact the system administrator',
          'Check if the service is under maintenance'
        ];
      
      case AUTH_ERROR_TYPES.OAUTH_SIGNIN:
      case AUTH_ERROR_TYPES.OAUTH_CALLBACK:
        return [
          'Try signing in again',
          'Clear your browser cache and cookies',
          'Try using a different browser or incognito mode'
        ];
      
      case AUTH_ERROR_TYPES.TOKEN_INVALID:
      case AUTH_ERROR_TYPES.TOKEN_EXPIRED:
      case AUTH_ERROR_TYPES.TOKEN_REFRESH_FAILED:
        return [
          'Sign in again',
          'Clear your browser cache and cookies'
        ];
      
      case AUTH_ERROR_TYPES.INSUFFICIENT_PERMISSIONS:
      case AUTH_ERROR_TYPES.SCOPE_MISSING:
        return [
          'Re-authorize the application with GitHub',
          'Make sure you grant all requested permissions'
        ];
      
      case AUTH_ERROR_TYPES.GITHUB_API_ERROR:
      case AUTH_ERROR_TYPES.GITHUB_UNAVAILABLE:
        return [
          'Wait a few minutes and try again',
          'Check GitHub status at https://www.githubstatus.com/'
        ];
      
      case AUTH_ERROR_TYPES.GITHUB_RATE_LIMIT:
        return [
          'Wait 5-10 minutes before trying again',
          'Reduce the frequency of your requests'
        ];
      
      case AUTH_ERROR_TYPES.NETWORK_ERROR:
        return [
          'Check your internet connection',
          'Try refreshing the page',
          'Try using a different network'
        ];
      
      case AUTH_ERROR_TYPES.TIMEOUT_ERROR:
        return [
          'Try again with a stable internet connection',
          'Refresh the page and retry'
        ];
      
      default:
        return [
          'Try refreshing the page',
          'Clear your browser cache and cookies',
          'Contact support if the problem persists'
        ];
    }
  }

  /**
   * Determine if the error is retryable
   */
  getRetryability() {
    const retryableErrors = [
      AUTH_ERROR_TYPES.OAUTH_SIGNIN,
      AUTH_ERROR_TYPES.OAUTH_CALLBACK,
      AUTH_ERROR_TYPES.GITHUB_API_ERROR,
      AUTH_ERROR_TYPES.GITHUB_UNAVAILABLE,
      AUTH_ERROR_TYPES.NETWORK_ERROR,
      AUTH_ERROR_TYPES.TIMEOUT_ERROR
    ];
    
    return retryableErrors.includes(this.type);
  }

  /**
   * Convert to JSON for API responses
   */
  toJSON() {
    return {
      error: {
        type: this.type,
        message: this.message,
        userMessage: this.userMessage,
        suggestions: this.suggestions,
        isRetryable: this.isRetryable,
        details: this.details,
        timestamp: this.timestamp
      }
    };
  }
}

/**
 * Create AuthError from various error sources
 */
export function createAuthError(error, context = {}) {
  // Handle NextAuth errors
  if (typeof error === 'string') {
    switch (error) {
      case 'OAuthSignin':
        return new AuthError(AUTH_ERROR_TYPES.OAUTH_SIGNIN, 'Error in constructing an authorization URL', context);
      case 'OAuthCallback':
        return new AuthError(AUTH_ERROR_TYPES.OAUTH_CALLBACK, 'Error in handling the response from GitHub', context);
      case 'OAuthCreateAccount':
        return new AuthError(AUTH_ERROR_TYPES.OAUTH_CREATE_ACCOUNT, 'Could not create OAuth account', context);
      case 'OAuthAccountNotLinked':
        return new AuthError(AUTH_ERROR_TYPES.OAUTH_ACCOUNT_NOT_LINKED, 'Email on the account is already linked', context);
      case 'SessionRequired':
        return new AuthError(AUTH_ERROR_TYPES.SESSION_REQUIRED, 'Please sign in to access this page', context);
      case 'RefreshAccessTokenError':
        return new AuthError(AUTH_ERROR_TYPES.TOKEN_REFRESH_FAILED, 'Token refresh failed', context);
      default:
        return new AuthError(AUTH_ERROR_TYPES.UNKNOWN_ERROR, error, context);
    }
  }

  // Handle Error objects
  if (error instanceof Error) {
    // GitHub API errors
    if (error.status) {
      switch (error.status) {
        case 401:
          return new AuthError(AUTH_ERROR_TYPES.TOKEN_INVALID, 'Invalid or expired token', { status: error.status, ...context });
        case 403:
          if (error.message?.includes('rate limit')) {
            return new AuthError(AUTH_ERROR_TYPES.GITHUB_RATE_LIMIT, 'GitHub API rate limit exceeded', { status: error.status, ...context });
          }
          return new AuthError(AUTH_ERROR_TYPES.INSUFFICIENT_PERMISSIONS, 'Insufficient permissions', { status: error.status, ...context });
        case 404:
          return new AuthError(AUTH_ERROR_TYPES.GITHUB_API_ERROR, 'GitHub resource not found', { status: error.status, ...context });
        case 500:
        case 502:
        case 503:
        case 504:
          return new AuthError(AUTH_ERROR_TYPES.GITHUB_UNAVAILABLE, 'GitHub services unavailable', { status: error.status, ...context });
        default:
          return new AuthError(AUTH_ERROR_TYPES.GITHUB_API_ERROR, `GitHub API error: ${error.message}`, { status: error.status, ...context });
      }
    }
  }

  // Handle plain objects with status property (like API error responses)
  if (error && typeof error === 'object' && error.status) {
    switch (error.status) {
      case 401:
        return new AuthError(AUTH_ERROR_TYPES.TOKEN_INVALID, 'Invalid or expired token', { status: error.status, ...context });
      case 403:
        if (error.message?.includes('rate limit')) {
          return new AuthError(AUTH_ERROR_TYPES.GITHUB_RATE_LIMIT, 'GitHub API rate limit exceeded', { status: error.status, ...context });
        }
        return new AuthError(AUTH_ERROR_TYPES.INSUFFICIENT_PERMISSIONS, 'Insufficient permissions', { status: error.status, ...context });
      case 404:
        return new AuthError(AUTH_ERROR_TYPES.GITHUB_API_ERROR, 'GitHub resource not found', { status: error.status, ...context });
      case 500:
      case 502:
      case 503:
      case 504:
        return new AuthError(AUTH_ERROR_TYPES.GITHUB_UNAVAILABLE, 'GitHub services unavailable', { status: error.status, ...context });
      default:
        return new AuthError(AUTH_ERROR_TYPES.GITHUB_API_ERROR, `GitHub API error: ${error.message || 'Unknown error'}`, { status: error.status, ...context });
    }
  }

  // Continue with Error object handling
  if (error instanceof Error) {

    // Network errors
    if (error.name === 'TypeError' && error.message.includes('fetch')) {
      return new AuthError(AUTH_ERROR_TYPES.NETWORK_ERROR, 'Network request failed', { originalError: error.message, ...context });
    }

    // Timeout errors
    if (error.name === 'AbortError' || error.message.includes('timeout')) {
      return new AuthError(AUTH_ERROR_TYPES.TIMEOUT_ERROR, 'Request timed out', { originalError: error.message, ...context });
    }

    // Generic error
    return new AuthError(AUTH_ERROR_TYPES.UNKNOWN_ERROR, error.message, { originalError: error.name, ...context });
  }

  // Fallback for unknown error types
  return new AuthError(AUTH_ERROR_TYPES.UNKNOWN_ERROR, 'An unknown error occurred', { originalError: error, ...context });
}

/**
 * Error handler middleware for API routes
 */
export function handleAuthError(error, context = {}) {
  const authError = createAuthError(error, context);
  
  console.error('Authentication error:', {
    type: authError.type,
    message: authError.message,
    details: authError.details,
    timestamp: authError.timestamp,
    context
  });

  return authError;
}

/**
 * Get appropriate HTTP status code for error type
 */
export function getErrorStatusCode(errorType) {
  switch (errorType) {
    case AUTH_ERROR_TYPES.TOKEN_INVALID:
    case AUTH_ERROR_TYPES.TOKEN_EXPIRED:
    case AUTH_ERROR_TYPES.TOKEN_REFRESH_FAILED:
    case AUTH_ERROR_TYPES.SESSION_REQUIRED:
    case AUTH_ERROR_TYPES.SESSION_INVALID:
    case AUTH_ERROR_TYPES.SESSION_EXPIRED:
      return 401;
    
    case AUTH_ERROR_TYPES.INSUFFICIENT_PERMISSIONS:
    case AUTH_ERROR_TYPES.SCOPE_MISSING:
      return 403;
    
    case AUTH_ERROR_TYPES.VALIDATION_ERROR:
      return 400;
    
    case AUTH_ERROR_TYPES.CONFIG_MISSING:
    case AUTH_ERROR_TYPES.CONFIG_INVALID:
    case AUTH_ERROR_TYPES.GITHUB_API_ERROR:
    case AUTH_ERROR_TYPES.GITHUB_UNAVAILABLE:
      return 500;
    
    case AUTH_ERROR_TYPES.GITHUB_RATE_LIMIT:
      return 429;
    
    case AUTH_ERROR_TYPES.NETWORK_ERROR:
    case AUTH_ERROR_TYPES.TIMEOUT_ERROR:
      return 503;
    
    default:
      return 500;
  }
}