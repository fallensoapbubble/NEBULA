import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { validateAuthToken } from '../auth.js';

// Mock fetch globally
global.fetch = vi.fn();

describe('Authentication Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('validateAuthToken', () => {
    it('should validate Bearer token successfully', async () => {
      const mockUser = {
        id: 12345,
        login: 'testuser',
        name: 'Test User',
        email: 'test@example.com',
        avatar_url: 'https://github.com/avatar.jpg'
      };

      // Mock successful GitHub API response
      fetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockUser)
      });

      const mockRequest = {
        headers: {
          get: vi.fn((header) => {
            if (header === 'authorization') return 'Bearer test-token';
            return null;
          })
        }
      };

      const result = await validateAuthToken(mockRequest);

      expect(result.valid).toBe(true);
      expect(result.accessToken).toBe('test-token');
      expect(result.user).toEqual({
        id: mockUser.id,
        login: mockUser.login,
        name: mockUser.name,
        email: mockUser.email,
        avatar_url: mockUser.avatar_url
      });

      expect(fetch).toHaveBeenCalledWith('https://api.github.com/user', {
        headers: {
          'Authorization': 'Bearer test-token',
          'Accept': 'application/vnd.github.v3+json',
          'User-Agent': 'Nebula-Portfolio-Platform'
        }
      });
    });

    it('should handle invalid Bearer token', async () => {
      // Mock failed GitHub API response
      fetch.mockResolvedValueOnce({
        ok: false,
        status: 401
      });

      const mockRequest = {
        headers: {
          get: vi.fn((header) => {
            if (header === 'authorization') return 'Bearer invalid-token';
            return null;
          })
        }
      };

      const result = await validateAuthToken(mockRequest);

      expect(result.valid).toBe(false);
      expect(result.error).toBe('No valid authentication found');
    });

    it('should handle missing authorization header', async () => {
      const mockRequest = {
        headers: {
          get: vi.fn(() => null)
        }
      };

      const result = await validateAuthToken(mockRequest);

      expect(result.valid).toBe(false);
      expect(result.error).toBe('No valid authentication found');
      expect(fetch).not.toHaveBeenCalled();
    });

    it('should handle malformed authorization header', async () => {
      const mockRequest = {
        headers: {
          get: vi.fn((header) => {
            if (header === 'authorization') return 'InvalidFormat token';
            return null;
          })
        }
      };

      const result = await validateAuthToken(mockRequest);

      expect(result.valid).toBe(false);
      expect(result.error).toBe('No valid authentication found');
    });

    it('should handle network errors', async () => {
      fetch.mockRejectedValueOnce(new Error('Network error'));

      const mockRequest = {
        headers: {
          get: vi.fn((header) => {
            if (header === 'authorization') return 'Bearer test-token';
            return null;
          })
        }
      };

      const result = await validateAuthToken(mockRequest);

      expect(result.valid).toBe(false);
      expect(result.error).toBe('No valid authentication found');
    });

    it('should check session cookie when no Bearer token', async () => {
      const mockRequest = {
        headers: {
          get: vi.fn((header) => {
            if (header === 'authorization') return null;
            if (header === 'cookie') return 'github_session=session-token; other=value';
            return null;
          })
        }
      };

      const result = await validateAuthToken(mockRequest);

      // Session-based auth is not implemented, so should return invalid
      expect(result.valid).toBe(false);
      expect(result.error).toBe('No valid authentication found');
    });
  });
});