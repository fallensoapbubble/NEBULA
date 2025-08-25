import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock environment variables before importing
vi.stubEnv('GITHUB_CLIENT_ID', 'test-client-id');
vi.stubEnv('GITHUB_CLIENT_SECRET', 'test-client-secret');
vi.stubEnv('NEXTAUTH_SECRET', 'test-secret');

import { authOptions } from '../auth-config.js';

describe('Auth Configuration', () => {
  beforeEach(() => {
    // Mock fetch for token refresh
    global.fetch = vi.fn();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('authOptions configuration', () => {
    it('should have correct GitHub provider configuration', () => {
      expect(authOptions.providers).toHaveLength(1);
      
      const githubProvider = authOptions.providers[0];
      expect(githubProvider.id).toBe('github');
      expect(githubProvider.name).toBe('GitHub');
      expect(githubProvider.type).toBe('oauth');
      expect(githubProvider.clientId).toBeDefined();
      expect(githubProvider.clientSecret).toBeDefined();
      
      expect(githubProvider.authorization.url).toBe('https://github.com/login/oauth/authorize');
      expect(githubProvider.authorization.params.scope).toBe('public_repo repo user:email');
      expect(githubProvider.token).toBe('https://github.com/login/oauth/access_token');
      expect(githubProvider.userinfo).toBe('https://api.github.com/user');
    });

    it('should transform GitHub profile correctly', () => {
      const githubProvider = authOptions.providers[0];
      const mockProfile = {
        id: 12345,
        login: 'testuser',
        name: 'Test User',
        email: 'test@example.com',
        avatar_url: 'https://github.com/avatar.jpg',
        html_url: 'https://github.com/testuser'
      };

      const transformedProfile = githubProvider.profile(mockProfile);

      expect(transformedProfile).toEqual({
        id: '12345',
        name: 'Test User',
        email: 'test@example.com',
        image: 'https://github.com/avatar.jpg',
        login: 'testuser',
        html_url: 'https://github.com/testuser'
      });
    });

    it('should handle profile without name', () => {
      const githubProvider = authOptions.providers[0];
      const mockProfile = {
        id: 12345,
        login: 'testuser',
        email: 'test@example.com',
        avatar_url: 'https://github.com/avatar.jpg',
        html_url: 'https://github.com/testuser'
      };

      const transformedProfile = githubProvider.profile(mockProfile);

      expect(transformedProfile.name).toBe('testuser');
    });

    it('should have correct session configuration', () => {
      expect(authOptions.session.strategy).toBe('jwt');
      expect(authOptions.session.maxAge).toBe(30 * 24 * 60 * 60); // 30 days
    });

    it('should have correct page configuration', () => {
      expect(authOptions.pages.error).toBe('/auth/error');
      expect(authOptions.pages.signIn).toBe('/auth/signin');
    });

    it('should use environment secret', () => {
      expect(authOptions.secret).toBeDefined();
    });
  });

  describe('JWT callback', () => {
    it('should persist tokens on initial signin', async () => {
      const mockToken = { sub: 'user-id' };
      const mockAccount = {
        access_token: 'access-token',
        refresh_token: 'refresh-token',
        expires_at: Math.floor(Date.now() / 1000) + 3600
      };
      const mockUser = {
        id: '12345',
        login: 'testuser',
        name: 'Test User'
      };

      const result = await authOptions.callbacks.jwt({
        token: mockToken,
        account: mockAccount,
        user: mockUser
      });

      expect(result.accessToken).toBe('access-token');
      expect(result.refreshToken).toBe('refresh-token');
      expect(result.accessTokenExpires).toBe(mockAccount.expires_at * 1000);
      expect(result.user).toBe(mockUser);
    });

    it('should return existing token if not expired', async () => {
      const mockToken = {
        sub: 'user-id',
        accessToken: 'existing-token',
        accessTokenExpires: Date.now() + 3600 * 1000 // 1 hour from now
      };

      const result = await authOptions.callbacks.jwt({
        token: mockToken
      });

      expect(result).toBe(mockToken);
    });

    it('should attempt token refresh if expired', async () => {
      const mockToken = {
        sub: 'user-id',
        accessToken: 'expired-token',
        refreshToken: 'refresh-token',
        accessTokenExpires: Date.now() - 1000 // 1 second ago
      };

      // Mock successful token refresh
      fetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          access_token: 'new-access-token',
          expires_in: 3600,
          refresh_token: 'new-refresh-token'
        })
      });

      const result = await authOptions.callbacks.jwt({
        token: mockToken
      });

      expect(result.accessToken).toBe('new-access-token');
      expect(result.refreshToken).toBe('new-refresh-token');
      expect(result.accessTokenExpires).toBeGreaterThan(Date.now());

      expect(fetch).toHaveBeenCalledWith('https://github.com/login/oauth/access_token', {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Accept': 'application/json',
        },
        method: 'POST',
        body: expect.any(URLSearchParams)
      });
    });

    it('should handle token refresh failure', async () => {
      const mockToken = {
        sub: 'user-id',
        accessToken: 'expired-token',
        refreshToken: 'refresh-token',
        accessTokenExpires: Date.now() - 1000
      };

      // Mock failed token refresh
      fetch.mockResolvedValueOnce({
        ok: false,
        json: () => Promise.resolve({ error: 'invalid_grant' })
      });

      const result = await authOptions.callbacks.jwt({
        token: mockToken
      });

      expect(result.error).toBe('RefreshAccessTokenError');
    });
  });

  describe('Session callback', () => {
    it('should include tokens and user data in session', async () => {
      const mockSession = {
        user: {
          name: 'Test User',
          email: 'test@example.com'
        }
      };
      const mockToken = {
        accessToken: 'access-token',
        refreshToken: 'refresh-token',
        error: null,
        user: {
          id: '12345',
          login: 'testuser'
        }
      };

      const result = await authOptions.callbacks.session({
        session: mockSession,
        token: mockToken
      });

      expect(result.accessToken).toBe('access-token');
      expect(result.refreshToken).toBe('refresh-token');
      expect(result.error).toBe(null);
      expect(result.user).toEqual({
        name: 'Test User',
        email: 'test@example.com',
        id: '12345',
        login: 'testuser'
      });
    });

    it('should handle token errors in session', async () => {
      const mockSession = { user: { name: 'Test User' } };
      const mockToken = {
        accessToken: 'access-token',
        error: 'RefreshAccessTokenError'
      };

      const result = await authOptions.callbacks.session({
        session: mockSession,
        token: mockToken
      });

      expect(result.error).toBe('RefreshAccessTokenError');
    });
  });
});