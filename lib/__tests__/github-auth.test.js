import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { 
  validateGitHubToken, 
  refreshGitHubToken, 
  getUserSession, 
  isSessionValid, 
  hasRequiredPermissions,
  createGitHubClient,
  clearUserSession
} from '../github-auth.js';

// Mock Octokit
vi.mock('@octokit/rest', () => ({
  Octokit: vi.fn().mockImplementation((config) => ({
    auth: config.auth,
    rest: {
      users: {
        getAuthenticated: vi.fn()
      }
    },
    request: vi.fn()
  }))
}));

// Mock fetch globally
global.fetch = vi.fn();

describe('GitHub Authentication Utilities', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.GITHUB_CLIENT_ID = 'test-client-id';
    process.env.GITHUB_CLIENT_SECRET = 'test-client-secret';
  });

  afterEach(() => {
    vi.restoreAllMocks();
    delete process.env.GITHUB_CLIENT_ID;
    delete process.env.GITHUB_CLIENT_SECRET;
  });

  describe('validateGitHubToken', () => {
    it('should validate token successfully', async () => {
      const { Octokit } = await import('@octokit/rest');
      const mockOctokit = new Octokit();
      
      const mockUser = {
        id: 12345,
        login: 'testuser',
        name: 'Test User',
        email: 'test@example.com'
      };

      mockOctokit.rest.users.getAuthenticated.mockResolvedValue({
        data: mockUser
      });

      mockOctokit.request.mockResolvedValue({
        headers: {
          'x-oauth-scopes': 'public_repo, repo',
          'x-ratelimit-limit': '5000',
          'x-ratelimit-remaining': '4999',
          'x-ratelimit-reset': '1640995200'
        }
      });

      const result = await validateGitHubToken('valid-token');

      expect(result.valid).toBe(true);
      expect(result.user).toEqual(mockUser);
      expect(result.scopes).toEqual(['public_repo', 'repo']);
      expect(result.rateLimit).toEqual({
        limit: 5000,
        remaining: 4999,
        reset: new Date(1640995200 * 1000)
      });
    });

    it('should handle missing token', async () => {
      const result = await validateGitHubToken();

      expect(result.valid).toBe(false);
      expect(result.error).toBe('No access token provided');
    });

    it('should handle invalid token (401)', async () => {
      const { Octokit } = await import('@octokit/rest');
      const mockOctokit = new Octokit();
      
      const error = new Error('Unauthorized');
      error.status = 401;
      mockOctokit.rest.users.getAuthenticated.mockRejectedValue(error);

      const result = await validateGitHubToken('invalid-token');

      expect(result.valid).toBe(false);
      expect(result.error).toBe('Invalid or expired token');
    });

    it('should handle insufficient permissions (403)', async () => {
      const { Octokit } = await import('@octokit/rest');
      const mockOctokit = new Octokit();
      
      const error = new Error('Forbidden');
      error.status = 403;
      mockOctokit.rest.users.getAuthenticated.mockRejectedValue(error);

      const result = await validateGitHubToken('limited-token');

      expect(result.valid).toBe(false);
      expect(result.error).toBe('Token lacks required permissions');
    });

    it('should handle other errors', async () => {
      const { Octokit } = await import('@octokit/rest');
      const mockOctokit = new Octokit();
      
      mockOctokit.rest.users.getAuthenticated.mockRejectedValue(new Error('Network error'));

      const result = await validateGitHubToken('token');

      expect(result.valid).toBe(false);
      expect(result.error).toBe('Token validation failed');
    });
  });

  describe('refreshGitHubToken', () => {
    it('should refresh token successfully', async () => {
      fetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          access_token: 'new-access-token',
          refresh_token: 'new-refresh-token',
          expires_in: 3600,
          scope: 'public_repo repo'
        })
      });

      const result = await refreshGitHubToken('refresh-token');

      expect(result.success).toBe(true);
      expect(result.tokens).toEqual({
        accessToken: 'new-access-token',
        refreshToken: 'new-refresh-token',
        expiresIn: 3600,
        scope: 'public_repo repo'
      });

      expect(fetch).toHaveBeenCalledWith('https://github.com/login/oauth/access_token', {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
          'User-Agent': 'Nebula-Portfolio-Platform'
        },
        body: JSON.stringify({
          client_id: 'test-client-id',
          client_secret: 'test-client-secret',
          refresh_token: 'refresh-token',
          grant_type: 'refresh_token'
        })
      });
    });

    it('should handle missing refresh token', async () => {
      const result = await refreshGitHubToken();

      expect(result.success).toBe(false);
      expect(result.error).toBe('No refresh token provided');
    });

    it('should handle missing OAuth credentials', async () => {
      delete process.env.GITHUB_CLIENT_ID;
      delete process.env.GITHUB_CLIENT_SECRET;

      const result = await refreshGitHubToken('refresh-token');

      expect(result.success).toBe(false);
      expect(result.error).toBe('GitHub OAuth credentials not configured');
    });

    it('should handle OAuth error response', async () => {
      fetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          error: 'invalid_grant',
          error_description: 'The refresh token is invalid'
        })
      });

      const result = await refreshGitHubToken('invalid-refresh-token');

      expect(result.success).toBe(false);
      expect(result.error).toBe('GitHub OAuth error: The refresh token is invalid');
    });

    it('should handle HTTP error response', async () => {
      fetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        text: () => Promise.resolve('Bad Request')
      });

      const result = await refreshGitHubToken('refresh-token');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Token refresh failed: 400 Bad Request');
    });

    it('should handle network errors', async () => {
      fetch.mockRejectedValueOnce(new Error('Network error'));

      const result = await refreshGitHubToken('refresh-token');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Network error');
    });
  });

  describe('getUserSession', () => {
    it('should parse valid session from cookies', () => {
      const mockRequest = {
        cookies: {
          get: vi.fn((name) => {
            const cookies = {
              'github_session_id': { value: '12345' },
              'github_username': { value: 'testuser' },
              'github_access_token': { value: 'access-token' },
              'github_refresh_token': { value: 'refresh-token' },
              'github_token_expiry': { value: '2024-12-31T23:59:59.000Z' },
              'github_permissions': { value: 'public_repo,repo' },
              'github_user_data': { value: JSON.stringify({ name: 'Test User' }) }
            };
            return cookies[name];
          })
        }
      };

      const session = getUserSession(mockRequest);

      expect(session).toEqual({
        githubId: '12345',
        username: 'testuser',
        accessToken: 'access-token',
        refreshToken: 'refresh-token',
        tokenExpiry: new Date('2024-12-31T23:59:59.000Z'),
        permissions: ['public_repo', 'repo'],
        userData: { name: 'Test User' }
      });
    });

    it('should return null for incomplete session', () => {
      const mockRequest = {
        cookies: {
          get: vi.fn((name) => {
            if (name === 'github_session_id') return { value: '12345' };
            return undefined;
          })
        }
      };

      const session = getUserSession(mockRequest);

      expect(session).toBeNull();
    });

    it('should handle malformed user data', () => {
      const mockRequest = {
        cookies: {
          get: vi.fn((name) => {
            const cookies = {
              'github_session_id': { value: '12345' },
              'github_username': { value: 'testuser' },
              'github_access_token': { value: 'access-token' },
              'github_user_data': { value: 'invalid-json' }
            };
            return cookies[name];
          })
        }
      };

      const session = getUserSession(mockRequest);

      expect(session).toBeNull();
    });
  });

  describe('isSessionValid', () => {
    it('should return true for valid session', () => {
      const session = {
        accessToken: 'valid-token',
        tokenExpiry: new Date(Date.now() + 3600 * 1000) // 1 hour from now
      };

      expect(isSessionValid(session)).toBe(true);
    });

    it('should return false for missing session', () => {
      expect(isSessionValid(null)).toBe(false);
      expect(isSessionValid({})).toBe(false);
    });

    it('should return false for expired token', () => {
      const session = {
        accessToken: 'expired-token',
        tokenExpiry: new Date(Date.now() - 1000) // 1 second ago
      };

      expect(isSessionValid(session)).toBe(false);
    });

    it('should return false for token expiring within buffer', () => {
      const session = {
        accessToken: 'expiring-token',
        tokenExpiry: new Date(Date.now() + 2 * 60 * 1000) // 2 minutes from now (within 5 minute buffer)
      };

      expect(isSessionValid(session)).toBe(false);
    });

    it('should return true for session without expiry', () => {
      const session = {
        accessToken: 'token-without-expiry'
      };

      expect(isSessionValid(session)).toBe(true);
    });
  });

  describe('hasRequiredPermissions', () => {
    it('should return true when user has required permissions', () => {
      const session = {
        permissions: ['public_repo', 'user:email']
      };

      expect(hasRequiredPermissions(session, ['public_repo'])).toBe(true);
    });

    it('should return true when user has repo permission (includes public_repo)', () => {
      const session = {
        permissions: ['repo', 'user:email']
      };

      expect(hasRequiredPermissions(session, ['public_repo'])).toBe(true);
    });

    it('should return false when user lacks required permissions', () => {
      const session = {
        permissions: ['user:email']
      };

      expect(hasRequiredPermissions(session, ['public_repo'])).toBe(false);
    });

    it('should return false for missing session', () => {
      expect(hasRequiredPermissions(null, ['public_repo'])).toBe(false);
    });

    it('should return false for session without permissions', () => {
      const session = { accessToken: 'token' };

      expect(hasRequiredPermissions(session, ['public_repo'])).toBe(false);
    });

    it('should use default required scopes', () => {
      const session = {
        permissions: ['public_repo']
      };

      expect(hasRequiredPermissions(session)).toBe(true);
    });
  });

  describe('createGitHubClient', () => {
    it('should create Octokit instance with correct configuration', () => {
      const { Octokit } = require('@octokit/rest');
      
      createGitHubClient('test-token');

      expect(Octokit).toHaveBeenCalledWith({
        auth: 'test-token',
        userAgent: 'Nebula-Portfolio-Platform',
        baseUrl: 'https://api.github.com'
      });
    });

    it('should use custom GitHub API URL from environment', () => {
      process.env.GITHUB_API_URL = 'https://api.github.enterprise.com';
      const { Octokit } = require('@octokit/rest');
      
      createGitHubClient('test-token');

      expect(Octokit).toHaveBeenCalledWith({
        auth: 'test-token',
        userAgent: 'Nebula-Portfolio-Platform',
        baseUrl: 'https://api.github.enterprise.com'
      });

      delete process.env.GITHUB_API_URL;
    });
  });

  describe('clearUserSession', () => {
    it('should clear all session cookies', () => {
      const mockResponse = {
        cookies: {
          set: vi.fn()
        }
      };

      clearUserSession(mockResponse);

      const expectedCookies = [
        'github_session_id',
        'github_username', 
        'github_access_token',
        'github_refresh_token',
        'github_token_expiry',
        'github_permissions',
        'github_user_data'
      ];

      expect(mockResponse.cookies.set).toHaveBeenCalledTimes(expectedCookies.length);

      expectedCookies.forEach(cookieName => {
        expect(mockResponse.cookies.set).toHaveBeenCalledWith(
          cookieName,
          '',
          expect.objectContaining({
            maxAge: 0,
            path: '/',
            secure: false, // NODE_ENV is not 'production' in tests
            sameSite: 'lax'
          })
        );
      });

      // Check that github_user_data is set with httpOnly: false
      expect(mockResponse.cookies.set).toHaveBeenCalledWith(
        'github_user_data',
        '',
        expect.objectContaining({
          httpOnly: false
        })
      );
    });

    it('should use secure cookies in production', () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';

      const mockResponse = {
        cookies: {
          set: vi.fn()
        }
      };

      clearUserSession(mockResponse);

      expect(mockResponse.cookies.set).toHaveBeenCalledWith(
        'github_session_id',
        '',
        expect.objectContaining({
          secure: true
        })
      );

      process.env.NODE_ENV = originalEnv;
    });
  });
});