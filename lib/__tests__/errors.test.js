/**
 * Tests for the centralized error handling system
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { 
  NebulaError, 
  GitHubAPIError, 
  AuthenticationError,
  ValidationError,
  NetworkError,
  RepositoryError,
  ContentError,
  ErrorHandler,
  ERROR_CATEGORIES,
  ERROR_SEVERITY
} from '../errors.js';

describe('Error Handling System', () => {
  beforeEach(() => {
    // Clear any previous console mocks
    vi.clearAllMocks();
  });

  describe('NebulaError', () => {
    it('should create a basic error with default values', () => {
      const error = new NebulaError('Test error');
      
      expect(error.message).toBe('Test error');
      expect(error.code).toBe('UNKNOWN_ERROR');
      expect(error.statusCode).toBe(500);
      expect(error.category).toBe(ERROR_CATEGORIES.SYSTEM);
      expect(error.severity).toBe(ERROR_SEVERITY.HIGH);
      expect(error.isRetryable).toBe(true); // 500 errors are retryable
      expect(error.suggestions).toBeInstanceOf(Array);
      expect(error.userMessage).toBeTruthy();
    });

    it('should create an error with custom values', () => {
      const error = new NebulaError(
        'Custom error',
        'CUSTOM_CODE',
        400,
        ERROR_CATEGORIES.VALIDATION
      );
      
      expect(error.message).toBe('Custom error');
      expect(error.code).toBe('CUSTOM_CODE');
      expect(error.statusCode).toBe(400);
      expect(error.category).toBe(ERROR_CATEGORIES.VALIDATION);
      expect(error.severity).toBe(ERROR_SEVERITY.LOW);
      expect(error.isRetryable).toBe(false); // 400 errors are not retryable
    });

    it('should provide appropriate user messages for different categories', () => {
      const authError = new NebulaError('Auth failed', 'AUTH_ERROR', 401, ERROR_CATEGORIES.AUTHENTICATION);
      const githubError = new NebulaError('GitHub failed', 'GITHUB_ERROR', 500, ERROR_CATEGORIES.GITHUB_API);
      
      expect(authError.userMessage).toContain('Authentication failed');
      expect(githubError.userMessage).toContain('GitHub service');
    });

    it('should provide recovery suggestions', () => {
      const networkError = new NebulaError('Network failed', 'NETWORK_ERROR', 503, ERROR_CATEGORIES.NETWORK);
      
      expect(networkError.suggestions).toContain('Check your internet connection');
      expect(networkError.suggestions.length).toBeGreaterThan(0);
    });

    it('should serialize to JSON correctly', () => {
      const error = new NebulaError('Test error', 'TEST_CODE', 400, ERROR_CATEGORIES.VALIDATION);
      const json = error.toJSON();
      
      expect(json).toHaveProperty('name', 'NebulaError');
      expect(json).toHaveProperty('message', 'Test error');
      expect(json).toHaveProperty('code', 'TEST_CODE');
      expect(json).toHaveProperty('statusCode', 400);
      expect(json).toHaveProperty('category', ERROR_CATEGORIES.VALIDATION);
      expect(json).toHaveProperty('severity');
      expect(json).toHaveProperty('timestamp');
      expect(json).toHaveProperty('userMessage');
      expect(json).toHaveProperty('suggestions');
      expect(json).toHaveProperty('isRetryable');
    });
  });

  describe('GitHubAPIError', () => {
    it('should categorize 401 errors as authentication', () => {
      const error = new GitHubAPIError('Unauthorized', 401, '/api/user');
      
      expect(error.code).toBe('GITHUB_UNAUTHORIZED');
      expect(error.category).toBe(ERROR_CATEGORIES.AUTHENTICATION);
      expect(error.statusCode).toBe(401);
      expect(error.endpoint).toBe('/api/user');
    });

    it('should categorize rate limit errors correctly', () => {
      const error = new GitHubAPIError('API rate limit exceeded', 403, '/api/repos');
      
      expect(error.code).toBe('GITHUB_RATE_LIMITED');
      expect(error.category).toBe(ERROR_CATEGORIES.RATE_LIMIT);
    });

    it('should categorize 404 errors as repository errors', () => {
      const error = new GitHubAPIError('Not found', 404, '/repos/user/repo');
      
      expect(error.code).toBe('GITHUB_NOT_FOUND');
      expect(error.category).toBe(ERROR_CATEGORIES.REPOSITORY);
    });
  });

  describe('ErrorHandler', () => {
    it('should handle NebulaError instances', () => {
      const originalError = new NebulaError('Test error');
      const handledError = ErrorHandler.handleError(originalError);
      
      expect(handledError).toBe(originalError);
    });

    it('should convert generic Error to NebulaError', () => {
      const originalError = new Error('Generic error');
      const handledError = ErrorHandler.handleError(originalError);
      
      expect(handledError).toBeInstanceOf(NebulaError);
      expect(handledError.message).toBe('Generic error');
      expect(handledError.code).toBe('UNKNOWN_ERROR');
    });

    it('should handle GitHub API errors with status codes', () => {
      const githubError = new Error('GitHub API failed');
      githubError.status = 403;
      githubError.message = 'API rate limit exceeded';
      
      const handledError = ErrorHandler.handleError(githubError, { source: 'github' });
      
      expect(handledError).toBeInstanceOf(GitHubAPIError);
      expect(handledError.code).toBe('GITHUB_RATE_LIMITED');
      expect(handledError.category).toBe(ERROR_CATEGORIES.RATE_LIMIT);
    });

    it('should handle network errors', () => {
      const networkError = new TypeError('Failed to fetch');
      const handledError = ErrorHandler.handleError(networkError);
      
      expect(handledError).toBeInstanceOf(NetworkError);
      expect(handledError.category).toBe(ERROR_CATEGORIES.NETWORK);
    });

    it('should format error responses correctly', () => {
      const error = new NebulaError('Test error', 'TEST_CODE', 400, ERROR_CATEGORIES.VALIDATION);
      const response = ErrorHandler.formatErrorResponse(error);
      
      expect(response).toHaveProperty('error');
      expect(response.error).toHaveProperty('message');
      expect(response.error).toHaveProperty('code', 'TEST_CODE');
      expect(response.error).toHaveProperty('category', ERROR_CATEGORIES.VALIDATION);
      expect(response.error).toHaveProperty('statusCode', 400);
      expect(response.error).toHaveProperty('suggestions');
      expect(response.error).toHaveProperty('isRetryable');
    });

    it('should calculate retry delays correctly', () => {
      const retryableError = new NebulaError('Server error', 'SERVER_ERROR', 500, ERROR_CATEGORIES.SYSTEM);
      const delay = ErrorHandler.getRetryDelay(retryableError, 0);
      
      expect(delay).toBeGreaterThan(0);
      expect(delay).toBeLessThanOrEqual(30000); // Max delay
    });

    it('should create error context from request objects', () => {
      const mockReq = {
        url: '/test',
        method: 'GET',
        headers: {
          'user-agent': 'test-agent'
        },
        ip: '127.0.0.1'
      };
      
      const context = ErrorHandler.createErrorContext(mockReq);
      
      expect(context.url).toBe('/test');
      expect(context.method).toBe('GET');
      expect(context.userAgent).toBe('test-agent');
      expect(context.ip).toBe('127.0.0.1');
      expect(context.requestId).toBeTruthy();
    });
  });

  describe('Specific Error Types', () => {
    it('should create AuthenticationError correctly', () => {
      const error = new AuthenticationError('Auth failed');
      
      expect(error.category).toBe(ERROR_CATEGORIES.AUTHENTICATION);
      expect(error.statusCode).toBe(401);
      expect(error.code).toBe('AUTHENTICATION_ERROR');
    });

    it('should create ValidationError correctly', () => {
      const error = new ValidationError('Invalid input', 'email');
      
      expect(error.category).toBe(ERROR_CATEGORIES.VALIDATION);
      expect(error.statusCode).toBe(400);
      expect(error.field).toBe('email');
    });

    it('should create NetworkError correctly', () => {
      const originalError = new Error('Connection failed');
      const error = new NetworkError('Network failed', originalError);
      
      expect(error.category).toBe(ERROR_CATEGORIES.NETWORK);
      expect(error.statusCode).toBe(503);
      expect(error.originalError).toBe(originalError);
    });

    it('should create RepositoryError correctly', () => {
      const error = new RepositoryError('Repo not found', 'user/repo');
      
      expect(error.category).toBe(ERROR_CATEGORIES.REPOSITORY);
      expect(error.statusCode).toBe(404);
      expect(error.repository).toBe('user/repo');
    });

    it('should create ContentError correctly', () => {
      const error = new ContentError('Invalid content', 'data.json');
      
      expect(error.category).toBe(ERROR_CATEGORIES.CONTENT);
      expect(error.statusCode).toBe(400);
      expect(error.filePath).toBe('data.json');
    });
  });
});