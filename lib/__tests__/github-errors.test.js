import { describe, it, expect } from 'vitest';
import {
  GitHubAPIError,
  GitHubAuthError,
  GitHubNotFoundError,
  GitHubRateLimitError,
  GitHubConflictError,
  GitHubValidationError,
  GitHubNetworkError,
  GitHubServerError,
  parseGitHubError,
  isRetryableError,
  getRetryDelay,
  getUserFriendlyMessage
} from '../github-errors.js';

describe('GitHub Error Classes', () => {
  describe('GitHubAPIError', () => {
    it('should create base error with all properties', () => {
      const error = new GitHubAPIError('Test error', 400, '/test', { data: 'test' });
      
      expect(error.name).toBe('GitHubAPIError');
      expect(error.message).toBe('Test error');
      expect(error.status).toBe(400);
      expect(error.endpoint).toBe('/test');
      expect(error.response).toEqual({ data: 'test' });
      expect(error.timestamp).toBeDefined();
    });

    it('should serialize to JSON correctly', () => {
      const error = new GitHubAPIError('Test error', 400, '/test');
      const json = error.toJSON();
      
      expect(json.name).toBe('GitHubAPIError');
      expect(json.message).toBe('Test error');
      expect(json.status).toBe(400);
      expect(json.endpoint).toBe('/test');
      expect(json.timestamp).toBeDefined();
    });
  });

  describe('GitHubRateLimitError', () => {
    it('should create rate limit error with reset time', () => {
      const resetTime = Math.floor(Date.now() / 1000) + 3600; // 1 hour from now
      const error = new GitHubRateLimitError('Rate limit exceeded', resetTime, 0, 5000);
      
      expect(error.name).toBe('GitHubRateLimitError');
      expect(error.resetTime).toBe(resetTime);
      expect(error.remaining).toBe(0);
      expect(error.limit).toBe(5000);
      expect(error.resetDate).toBeInstanceOf(Date);
      expect(error.timeUntilReset).toBeGreaterThan(0);
    });

    it('should serialize rate limit info to JSON', () => {
      const resetTime = Math.floor(Date.now() / 1000) + 3600;
      const error = new GitHubRateLimitError('Rate limit exceeded', resetTime, 0, 5000);
      const json = error.toJSON();
      
      expect(json.resetTime).toBe(resetTime);
      expect(json.resetDate).toBeDefined();
      expect(json.remaining).toBe(0);
      expect(json.limit).toBe(5000);
      expect(json.timeUntilReset).toBeGreaterThan(0);
    });
  });

  describe('GitHubValidationError', () => {
    it('should create validation error with errors array', () => {
      const errors = [{ field: 'name', message: 'is required' }];
      const error = new GitHubValidationError('Validation failed', errors);
      
      expect(error.name).toBe('GitHubValidationError');
      expect(error.errors).toEqual(errors);
      expect(error.status).toBe(422);
    });
  });
});

describe('parseGitHubError', () => {
  it('should parse 401 authentication error', () => {
    const originalError = { status: 401, message: 'Bad credentials' };
    const parsed = parseGitHubError(originalError, '/test');
    
    expect(parsed).toBeInstanceOf(GitHubAuthError);
    expect(parsed.status).toBe(401);
    expect(parsed.endpoint).toBe('/test');
  });

  it('should parse 403 authorization error', () => {
    const originalError = { status: 403, message: 'Forbidden' };
    const parsed = parseGitHubError(originalError, '/test');
    
    expect(parsed).toBeInstanceOf(GitHubAuthError);
    expect(parsed.status).toBe(403);
  });

  it('should parse 403 rate limit error', () => {
    const originalError = {
      status: 403,
      message: 'Rate limit exceeded',
      response: {
        headers: {
          'x-ratelimit-remaining': '0',
          'x-ratelimit-reset': String(Math.floor(Date.now() / 1000) + 3600),
          'x-ratelimit-limit': '5000'
        }
      }
    };
    const parsed = parseGitHubError(originalError);
    
    expect(parsed).toBeInstanceOf(GitHubRateLimitError);
    expect(parsed.remaining).toBe(0);
    expect(parsed.limit).toBe(5000);
  });

  it('should parse 404 not found error', () => {
    const originalError = { status: 404, message: 'Not Found' };
    const parsed = parseGitHubError(originalError);
    
    expect(parsed).toBeInstanceOf(GitHubNotFoundError);
    expect(parsed.status).toBe(404);
  });

  it('should parse 409 conflict error', () => {
    const originalError = { status: 409, message: 'Conflict' };
    const parsed = parseGitHubError(originalError);
    
    expect(parsed).toBeInstanceOf(GitHubConflictError);
    expect(parsed.status).toBe(409);
  });

  it('should parse 422 validation error', () => {
    const originalError = {
      status: 422,
      message: 'Validation Failed',
      response: {
        data: {
          errors: [{ field: 'name', message: 'is required' }]
        }
      }
    };
    const parsed = parseGitHubError(originalError);
    
    expect(parsed).toBeInstanceOf(GitHubValidationError);
    expect(parsed.status).toBe(422);
    expect(parsed.errors).toHaveLength(1);
  });

  it('should parse 500 server error', () => {
    const originalError = { status: 500, message: 'Internal Server Error' };
    const parsed = parseGitHubError(originalError);
    
    expect(parsed).toBeInstanceOf(GitHubServerError);
    expect(parsed.status).toBe(500);
  });

  it('should parse network error without status', () => {
    const originalError = { message: 'Network Error' };
    const parsed = parseGitHubError(originalError);
    
    expect(parsed).toBeInstanceOf(GitHubNetworkError);
    expect(parsed.status).toBeNull();
  });

  it('should parse generic error for unknown status', () => {
    const originalError = { status: 418, message: "I'm a teapot" };
    const parsed = parseGitHubError(originalError);
    
    expect(parsed).toBeInstanceOf(GitHubAPIError);
    expect(parsed.status).toBe(418);
  });
});

describe('isRetryableError', () => {
  it('should identify retryable errors', () => {
    const rateLimitError = new GitHubRateLimitError('Rate limit', Date.now() + 3600);
    const serverError = new GitHubServerError('Server error', 500);
    const networkError = new GitHubNetworkError('Network error');
    
    expect(isRetryableError(rateLimitError)).toBe(true);
    expect(isRetryableError(serverError)).toBe(true);
    expect(isRetryableError(networkError)).toBe(true);
  });

  it('should identify non-retryable errors', () => {
    const authError = new GitHubAuthError('Auth error', 401);
    const notFoundError = new GitHubNotFoundError('Not found');
    const validationError = new GitHubValidationError('Validation error');
    
    expect(isRetryableError(authError)).toBe(false);
    expect(isRetryableError(notFoundError)).toBe(false);
    expect(isRetryableError(validationError)).toBe(false);
  });

  it('should identify retryable status codes', () => {
    const error502 = new GitHubAPIError('Bad Gateway', 502);
    const error503 = new GitHubAPIError('Service Unavailable', 503);
    const error504 = new GitHubAPIError('Gateway Timeout', 504);
    
    expect(isRetryableError(error502)).toBe(true);
    expect(isRetryableError(error503)).toBe(true);
    expect(isRetryableError(error504)).toBe(true);
  });
});

describe('getRetryDelay', () => {
  it('should return rate limit reset time for rate limit errors', () => {
    const resetTime = Math.floor(Date.now() / 1000) + 60; // 1 minute from now
    const error = new GitHubRateLimitError('Rate limit', resetTime);
    
    const delay = getRetryDelay(error, 0);
    expect(delay).toBeGreaterThan(60000); // Should be at least 1 minute
  });

  it('should return exponential backoff for other errors', () => {
    const error = new GitHubServerError('Server error', 500);
    
    const delay0 = getRetryDelay(error, 0);
    const delay1 = getRetryDelay(error, 1);
    const delay2 = getRetryDelay(error, 2);
    
    expect(delay1).toBeGreaterThan(delay0);
    expect(delay2).toBeGreaterThan(delay1);
    expect(delay2).toBeLessThanOrEqual(30000); // Should not exceed max delay
  });
});

describe('getUserFriendlyMessage', () => {
  it('should return friendly message for auth errors', () => {
    const authError = new GitHubAuthError('Unauthorized', 401);
    const message = getUserFriendlyMessage(authError);
    
    expect(message).toContain('authentication has expired');
  });

  it('should return friendly message for not found errors', () => {
    const notFoundError = new GitHubNotFoundError('Not found');
    const message = getUserFriendlyMessage(notFoundError);
    
    expect(message).toContain('not found');
  });

  it('should return friendly message for rate limit errors', () => {
    const resetTime = Math.floor(Date.now() / 1000) + 3600;
    const rateLimitError = new GitHubRateLimitError('Rate limit', resetTime);
    const message = getUserFriendlyMessage(rateLimitError);
    
    expect(message).toContain('rate limit exceeded');
  });

  it('should return friendly message for conflict errors', () => {
    const conflictError = new GitHubConflictError('Conflict', 409);
    const message = getUserFriendlyMessage(conflictError);
    
    expect(message).toContain('modified by someone else');
  });

  it('should return friendly message for validation errors', () => {
    const validationError = new GitHubValidationError('Validation failed');
    const message = getUserFriendlyMessage(validationError);
    
    expect(message).toContain('data you submitted is invalid');
  });

  it('should return friendly message for server errors', () => {
    const serverError = new GitHubServerError('Server error', 500);
    const message = getUserFriendlyMessage(serverError);
    
    expect(message).toContain('technical difficulties');
  });

  it('should return friendly message for network errors', () => {
    const networkError = new GitHubNetworkError('Network error');
    const message = getUserFriendlyMessage(networkError);
    
    expect(message).toContain('Unable to connect');
  });

  it('should return generic message for unknown errors', () => {
    const genericError = new GitHubAPIError('Unknown error');
    const message = getUserFriendlyMessage(genericError);
    
    expect(message).toContain('unexpected error');
  });
});