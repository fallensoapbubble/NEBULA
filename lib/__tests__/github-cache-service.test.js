/**
 * Tests for GitHub Cache Service
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { GitHubCacheService, GitHubCacheMiddleware, getGitHubCacheService, resetGitHubCacheService } from '../github-cache-service.js';

describe('GitHubCacheService', () => {
  let cacheService;

  beforeEach(() => {
    cacheService = new GitHubCacheService({
      defaultTTL: 1000, // 1 second for testing
      cleanupInterval: 100000 // Disable cleanup during tests
    });
  });

  afterEach(() => {
    resetGitHubCacheService();
  });

  describe('Basic Cache Operations', () => {
    it('should set and get cache entries', () => {
      const key = 'test-key';
      const data = { message: 'test data' };

      cacheService.set(key, data);
      const result = cacheService.get(key);

      expect(result).toBeTruthy();
      expect(result.data).toEqual(data);
      expect(result.cached).toBe(true);
    });

    it('should return null for non-existent keys', () => {
      const result = cacheService.get('non-existent-key');
      expect(result).toBeNull();
    });

    it('should handle cache expiration', async () => {
      const key = 'expiring-key';
      const data = { message: 'expiring data' };

      cacheService.set(key, data, { ttl: 50 }); // 50ms TTL
      
      // Should be available immediately
      let result = cacheService.get(key);
      expect(result).toBeTruthy();
      expect(result.data).toEqual(data);

      // Wait for expiration
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Should be expired
      result = cacheService.get(key);
      expect(result).toBeNull();
    });

    it('should delete cache entries', () => {
      const key = 'delete-key';
      const data = { message: 'delete data' };

      cacheService.set(key, data);
      expect(cacheService.get(key)).toBeTruthy();

      const deleted = cacheService.delete(key);
      expect(deleted).toBe(true);
      expect(cacheService.get(key)).toBeNull();
    });

    it('should clear all cache entries', () => {
      cacheService.set('key1', { data: 1 });
      cacheService.set('key2', { data: 2 });
      cacheService.set('key3', { data: 3 });

      expect(cacheService.getStats().entries).toBe(3);

      cacheService.clear();
      expect(cacheService.getStats().entries).toBe(0);
    });
  });

  describe('Cache Key Generation', () => {
    it('should generate consistent cache keys', () => {
      const endpoint = 'repos/owner/repo';
      const params = { ref: 'main', path: 'README.md' };
      const token = 'token123';

      const key1 = cacheService.generateKey(endpoint, params, token);
      const key2 = cacheService.generateKey(endpoint, params, token);

      expect(key1).toBe(key2);
    });

    it('should generate different keys for different parameters', () => {
      const endpoint = 'repos/owner/repo';
      const token = 'token123';

      const key1 = cacheService.generateKey(endpoint, { ref: 'main' }, token);
      const key2 = cacheService.generateKey(endpoint, { ref: 'develop' }, token);

      expect(key1).not.toBe(key2);
    });

    it('should handle parameter order consistently', () => {
      const endpoint = 'repos/owner/repo';
      const token = 'token123';

      const key1 = cacheService.generateKey(endpoint, { a: '1', b: '2' }, token);
      const key2 = cacheService.generateKey(endpoint, { b: '2', a: '1' }, token);

      expect(key1).toBe(key2);
    });
  });

  describe('TTL Management', () => {
    it('should use different TTLs for different key types', () => {
      const contentKey = 'github:repos/owner/repo/contents/file.md:token123';
      const repoKey = 'github:repos/owner/repo:token123';
      const userKey = 'github:users/username:token123';

      // Mock the getTTLForKey method to test different TTLs
      const contentTTL = cacheService.getTTLForKey(contentKey);
      const repoTTL = cacheService.getTTLForKey(repoKey);
      const userTTL = cacheService.getTTLForKey(userKey);

      expect(contentTTL).toBe(cacheService.options.contentTTL);
      expect(repoTTL).toBe(cacheService.options.repositoryTTL);
      expect(userTTL).toBe(cacheService.options.userTTL);
    });

    it('should use custom TTL when provided', () => {
      const key = 'custom-ttl-key';
      const customTTL = 5000;

      const ttl = cacheService.getTTLForKey(key, customTTL);
      expect(ttl).toBe(customTTL);
    });
  });

  describe('Cache Invalidation', () => {
    it('should invalidate cache entries by pattern', () => {
      cacheService.set('github:repos/owner1/repo1:token', { data: 1 });
      cacheService.set('github:repos/owner1/repo2:token', { data: 2 });
      cacheService.set('github:repos/owner2/repo1:token', { data: 3 });
      cacheService.set('github:users/user1:token', { data: 4 });

      const invalidated = cacheService.invalidate('repos/owner1');
      expect(invalidated).toBe(2);

      expect(cacheService.get('github:repos/owner1/repo1:token')).toBeNull();
      expect(cacheService.get('github:repos/owner1/repo2:token')).toBeNull();
      expect(cacheService.get('github:repos/owner2/repo1:token')).toBeTruthy();
      expect(cacheService.get('github:users/user1:token')).toBeTruthy();
    });

    it('should invalidate using regex patterns', () => {
      cacheService.set('github:repos/test/repo1:token', { data: 1 });
      cacheService.set('github:repos/test/repo2:token', { data: 2 });
      cacheService.set('github:users/test:token', { data: 3 });

      const pattern = /repos\/test/;
      const invalidated = cacheService.invalidate(pattern);
      expect(invalidated).toBe(2);

      expect(cacheService.get('github:users/test:token')).toBeTruthy();
    });
  });

  describe('Memory Management', () => {
    it('should track memory usage', () => {
      const largeData = { content: 'x'.repeat(1000) };
      
      cacheService.set('large-key', largeData);
      
      const memoryUsage = cacheService.getMemoryUsage();
      expect(memoryUsage.totalBytes).toBeGreaterThan(1000);
      expect(memoryUsage.totalMB).toBeGreaterThan(0);
    });

    it('should evict LRU entries when entry limit is reached', () => {
      const smallCacheService = new GitHubCacheService({
        maxEntries: 2,
        maxMemoryMB: 100 // Large memory limit, focus on entry limit
      });

      smallCacheService.set('key1', { data: 'small1' });
      smallCacheService.set('key2', { data: 'small2' });
      
      // Access key1 to make it more recently used
      smallCacheService.get('key1');
      
      // Add key3, should evict key2 (LRU)
      smallCacheService.set('key3', { data: 'small3' });

      // Check that we have exactly 2 entries and key2 was evicted
      expect(smallCacheService.getStats().entries).toBe(2);
      expect(smallCacheService.get('key2')).toBeNull();
      expect(smallCacheService.get('key1')).toBeTruthy();
      expect(smallCacheService.get('key3')).toBeTruthy();
    });
  });

  describe('Statistics', () => {
    it('should track cache statistics', () => {
      const key = 'stats-key';
      const data = { message: 'stats data' };

      // Initial stats
      let stats = cacheService.getStats();
      expect(stats.entries).toBe(0);
      expect(stats.hitRate).toBe(0);

      // Set and get
      cacheService.set(key, data);
      cacheService.get(key); // Hit
      cacheService.get('non-existent'); // Miss

      stats = cacheService.getStats();
      expect(stats.entries).toBe(1);
      expect(stats.stats.hits).toBe(1);
      expect(stats.stats.misses).toBe(1);
      expect(stats.hitRate).toBe(50);
    });
  });
});

describe('GitHubCacheMiddleware', () => {
  let cacheService;
  let middleware;

  beforeEach(() => {
    cacheService = new GitHubCacheService({
      defaultTTL: 1000
    });
    middleware = new GitHubCacheMiddleware(cacheService);
  });

  describe('Request Wrapping', () => {
    it('should cache successful requests', async () => {
      const mockData = { message: 'success' };
      const mockRequest = vi.fn().mockResolvedValue({
        data: mockData,
        headers: { etag: '"abc123"' }
      });

      const key = 'test-request';
      
      // First request - should call function and cache
      const result1 = await middleware.wrapRequest(mockRequest, { key });
      expect(mockRequest).toHaveBeenCalledTimes(1);
      expect(result1).toEqual({ ...mockData, _cached: false, _fresh: true });

      // Second request - should return cached data
      const result2 = await middleware.wrapRequest(mockRequest, { key });
      expect(mockRequest).toHaveBeenCalledTimes(1); // Not called again
      expect(result2).toEqual({ ...mockData, _cached: true, _cacheAge: expect.any(Number) });
    });

    it('should skip cache when skipCache is true', async () => {
      const mockData = { message: 'success' };
      const mockRequest = vi.fn().mockResolvedValue({
        data: mockData
      });

      const key = 'skip-cache-test';
      
      // First request with skipCache
      await middleware.wrapRequest(mockRequest, { key, skipCache: true });
      expect(mockRequest).toHaveBeenCalledTimes(1);

      // Second request with skipCache
      await middleware.wrapRequest(mockRequest, { key, skipCache: true });
      expect(mockRequest).toHaveBeenCalledTimes(2); // Called again
    });

    it('should handle conditional requests with 304 responses', async () => {
      const mockData = { message: 'cached data' };
      
      // First request - populate cache
      const mockRequest1 = vi.fn().mockResolvedValue({
        data: mockData,
        headers: { etag: '"abc123"' }
      });

      const key = 'conditional-test';
      await middleware.wrapRequest(mockRequest1, { key });

      // Mock a request that returns 304 with conditional headers
      const mockRequest2 = vi.fn().mockImplementation((requestOptions) => {
        // If conditional headers are present, return 304
        if (requestOptions?.headers?.['If-None-Match']) {
          return Promise.resolve({
            status: 304,
            headers: { etag: '"abc123"' }
          });
        }
        return Promise.resolve({
          data: mockData,
          headers: { etag: '"abc123"' }
        });
      });

      // Expire the cache to trigger conditional request
      await new Promise(resolve => setTimeout(resolve, 1100));

      const result = await middleware.wrapRequest(mockRequest2, { 
        key, 
        enableConditional: true 
      });

      expect(result).toEqual({ 
        ...mockData, 
        _cached: true, 
        _refreshed: true 
      });
    });

    it('should return cached data as fallback on error', async () => {
      const mockData = { message: 'cached data' };
      
      // First request - populate cache
      const mockRequest1 = vi.fn().mockResolvedValue({
        data: mockData
      });

      const key = 'fallback-test';
      await middleware.wrapRequest(mockRequest1, { key });

      // Second request - simulate error (don't expire cache, just force error)
      const mockRequest2 = vi.fn().mockRejectedValue(new Error('Network error'));

      // Manually expire the cache to force a fresh request
      cacheService.delete(key);
      cacheService.set(key, mockData, { ttl: 1 }); // Very short TTL
      await new Promise(resolve => setTimeout(resolve, 10)); // Wait for expiry

      const result = await middleware.wrapRequest(mockRequest2, { 
        key, 
        fallbackOnError: true 
      });

      expect(result).toEqual({ 
        ...mockData, 
        _cached: true, 
        _fallback: true,
        _error: 'Network error'
      });
    });
  });

  describe('Cache Key Creation', () => {
    it('should create cache keys for endpoints', () => {
      const key = middleware.createKey('repos/owner/repo', { ref: 'main' }, 'token123');
      expect(key).toMatch(/^github:repos\/owner\/repo:/);
    });
  });

  describe('Cache Invalidation', () => {
    it('should invalidate repository cache', () => {
      cacheService.set('github:repos/owner/repo/contents:token', { data: 1 });
      cacheService.set('github:repos/owner/repo:token', { data: 2 });
      cacheService.set('github:repos/other/repo:token', { data: 3 });

      const invalidated = middleware.invalidateRepository('owner', 'repo');
      expect(invalidated).toBe(2);
    });

    it('should invalidate user cache', () => {
      cacheService.set('github:users/username:token', { data: 1 });
      cacheService.set('github:users/other:token', { data: 2 });

      const invalidated = middleware.invalidateUser('username');
      expect(invalidated).toBe(1);
    });
  });
});

describe('Global Cache Service', () => {
  afterEach(() => {
    resetGitHubCacheService();
  });

  it('should return singleton instance', () => {
    const service1 = getGitHubCacheService();
    const service2 = getGitHubCacheService();
    
    expect(service1).toBe(service2);
  });

  it('should reset global instance', () => {
    const service1 = getGitHubCacheService();
    service1.set('test', { data: 'test' });
    
    resetGitHubCacheService();
    
    const service2 = getGitHubCacheService();
    expect(service2).not.toBe(service1);
    expect(service2.get('test')).toBeNull();
  });
});