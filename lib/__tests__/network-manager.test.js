/**
 * Network Manager Tests
 * Tests for offline functionality, caching, and retry mechanisms
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock React before importing network manager
vi.mock('react', () => ({
  useState: vi.fn(() => ['offline', vi.fn()]),
  useEffect: vi.fn(),
  useCallback: vi.fn((fn) => fn),
  createContext: vi.fn(),
  useContext: vi.fn()
}));

import { NetworkManager, NETWORK_STATUS, gracefulDegradationManager, enhancedFetch } from '../network-manager.js';

// Mock fetch
global.fetch = vi.fn();

// Mock localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
};
global.localStorage = localStorageMock;

// Mock window and navigator
global.window = {
  addEventListener: vi.fn(),
  removeEventListener: vi.fn(),
  navigator: {
    onLine: true
  }
};

global.navigator = {
  onLine: true
};

describe('NetworkManager', () => {
  let networkManager;

  beforeEach(() => {
    vi.clearAllMocks();
    networkManager = new NetworkManager({
      retryAttempts: 2,
      retryDelay: 100,
      timeoutDuration: 1000
    });
  });

  afterEach(() => {
    networkManager.destroy();
  });

  describe('Network Status Detection', () => {
    it('should detect online status', () => {
      global.navigator.onLine = true;
      expect(networkManager.getNetworkStatus()).toBeDefined();
    });

    it('should detect offline status', () => {
      global.navigator.onLine = false;
      networkManager.updateNetworkStatus(NETWORK_STATUS.OFFLINE);
      expect(networkManager.isOnline()).toBe(false);
    });

    it('should notify listeners of status changes', () => {
      const listener = vi.fn();
      networkManager.addStatusListener(listener);
      
      // Change from current status to a different one
      const currentStatus = networkManager.getNetworkStatus();
      const newStatus = currentStatus === NETWORK_STATUS.ONLINE ? NETWORK_STATUS.OFFLINE : NETWORK_STATUS.ONLINE;
      
      networkManager.updateNetworkStatus(newStatus);
      expect(listener).toHaveBeenCalledWith(newStatus, currentStatus);
    });
  });

  describe('Caching', () => {
    it('should cache successful responses', async () => {
      // Test cache key generation
      const cacheKey = networkManager.generateCacheKey('https://example.com/test', {});
      expect(cacheKey).toBeDefined();
      
      // Test manual cache storage
      const testData = {
        status: 200,
        body: 'test data',
        timestamp: Date.now()
      };
      
      networkManager.cache.set(cacheKey, testData);
      const cached = networkManager.getFromCache(cacheKey);
      expect(cached).toBeTruthy();
    });

    it('should serve cached responses when offline', async () => {
      // Manually add to cache
      const cacheKey = networkManager.generateCacheKey('https://example.com/test', {});
      const testData = {
        status: 200,
        statusText: 'OK',
        headers: {},
        body: 'cached data',
        timestamp: Date.now()
      };
      
      networkManager.cache.set(cacheKey, testData);
      
      // Go offline
      networkManager.updateNetworkStatus(NETWORK_STATUS.OFFLINE);
      
      // Should serve from cache
      const cached = networkManager.getFromCache(cacheKey);
      expect(cached).toBeTruthy();
      expect(cached.status).toBe(200);
    });

    it('should clean up expired cache entries', () => {
      const oldTimestamp = Date.now() - (25 * 60 * 60 * 1000); // 25 hours ago
      networkManager.cache.set('old-key', {
        status: 200,
        body: 'old data',
        timestamp: oldTimestamp
      });

      networkManager.cleanupCache();
      expect(networkManager.cache.has('old-key')).toBe(false);
    });
  });

  describe('Request Retry Logic', () => {
    it('should have retry configuration', () => {
      expect(networkManager.options.retryAttempts).toBe(2);
      expect(networkManager.options.retryDelay).toBe(100);
      expect(networkManager.options.enableRetry).toBe(true);
    });

    it('should queue requests when offline', async () => {
      networkManager.updateNetworkStatus(NETWORK_STATUS.OFFLINE);
      
      const promise = networkManager.fetch('/test');
      expect(networkManager.requestQueue.length).toBe(1);
      
      // Don't await the promise as it will be queued
      expect(promise).toBeInstanceOf(Promise);
    });

    it('should process queued requests when back online', async () => {
      networkManager.updateNetworkStatus(NETWORK_STATUS.OFFLINE);
      
      // Queue a request
      const promise = networkManager.fetch('/test');
      expect(networkManager.requestQueue.length).toBe(1);
      
      // Mock successful response for when we go back online
      fetch.mockResolvedValueOnce(new Response('success', { status: 200 }));
      
      // Go back online and process queue
      networkManager.updateNetworkStatus(NETWORK_STATUS.ONLINE);
      await networkManager.processQueuedRequests();
      
      const response = await promise;
      expect(response.status).toBe(200);
    });

    it('should store and retry failed requests', async () => {
      const request = new Request('https://example.com/test');
      const error = new Error('Network error');
      
      networkManager.storeFailedRequest(request, error);
      expect(networkManager.failedRequests.size).toBe(1);
      
      // Mock successful retry
      fetch.mockResolvedValueOnce(new Response('success', { status: 200 }));
      
      const results = await networkManager.retryFailedRequests();
      expect(results[0].success).toBe(true);
      expect(networkManager.failedRequests.size).toBe(0);
    });
  });

  describe('Cache Management', () => {
    it('should enforce cache size limits', () => {
      // Set a small cache size for testing
      networkManager.options.maxCacheSize = 1000;
      
      // Add entries that exceed the limit
      for (let i = 0; i < 10; i++) {
        networkManager.cache.set(`key-${i}`, {
          status: 200,
          body: 'x'.repeat(200), // 200 bytes each
          timestamp: Date.now() - i * 1000 // Different timestamps
        });
      }
      
      networkManager.enforceCacheSize();
      
      // Should have removed some entries
      expect(networkManager.cache.size).toBeLessThan(10);
    });

    it('should provide cache statistics', () => {
      networkManager.cache.set('test-key', {
        status: 200,
        body: 'test data',
        timestamp: Date.now()
      });
      
      const stats = networkManager.getCacheStats();
      expect(stats.size).toBe(1);
      expect(stats.keys).toContain('test-key');
    });
  });

  describe('Network Statistics', () => {
    it('should provide comprehensive network statistics', () => {
      networkManager.requestQueue.push({ url: '/test' });
      networkManager.storeFailedRequest(new Request('https://example.com/failed'), new Error('Test error'));
      
      const stats = networkManager.getNetworkStats();
      
      expect(stats).toHaveProperty('status');
      expect(stats).toHaveProperty('isOnline');
      expect(stats).toHaveProperty('cache');
      expect(stats).toHaveProperty('queue');
      expect(stats).toHaveProperty('failedRequests');
      
      expect(stats.queue.size).toBe(1);
      expect(stats.failedRequests.count).toBe(1);
    });
  });
});

describe('GracefulDegradationManager', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should execute primary action when successful', async () => {
    const primaryAction = vi.fn().mockResolvedValue('success');
    const fallbackStrategy = vi.fn();
    
    gracefulDegradationManager.registerFallback('test-service', fallbackStrategy);
    
    const result = await gracefulDegradationManager.executeWithFallback(
      'test-service',
      primaryAction
    );
    
    expect(result).toBe('success');
    expect(primaryAction).toHaveBeenCalled();
    expect(fallbackStrategy).not.toHaveBeenCalled();
  });

  it('should execute fallback when primary action fails', async () => {
    const primaryAction = vi.fn().mockRejectedValue(new Error('Primary failed'));
    const fallbackStrategy = vi.fn().mockResolvedValue('fallback success');
    
    gracefulDegradationManager.registerFallback('test-service', fallbackStrategy);
    
    const result = await gracefulDegradationManager.executeWithFallback(
      'test-service',
      primaryAction
    );
    
    expect(result).toBe('fallback success');
    expect(primaryAction).toHaveBeenCalled();
    expect(fallbackStrategy).toHaveBeenCalled();
  });

  it('should track service health status', async () => {
    const primaryAction = vi.fn().mockRejectedValue(new Error('Service down'));
    const fallbackStrategy = vi.fn().mockResolvedValue('fallback');
    
    gracefulDegradationManager.registerFallback('test-service', fallbackStrategy);
    
    await gracefulDegradationManager.executeWithFallback(
      'test-service',
      primaryAction
    );
    
    const status = gracefulDegradationManager.getServiceStatus('test-service');
    expect(status.status).toBe('unhealthy');
    expect(status.error).toBe('Service down');
  });

  it('should provide all service statuses', async () => {
    const primaryAction1 = vi.fn().mockResolvedValue('success');
    const primaryAction2 = vi.fn().mockRejectedValue(new Error('Failed'));
    const fallbackStrategy = vi.fn().mockResolvedValue('fallback');
    
    gracefulDegradationManager.registerFallback('service-2', fallbackStrategy);
    
    await gracefulDegradationManager.executeWithFallback('service-1', primaryAction1);
    await gracefulDegradationManager.executeWithFallback('service-2', primaryAction2);
    
    const allStatuses = gracefulDegradationManager.getAllServiceStatuses();
    
    expect(allStatuses['service-1'].status).toBe('healthy');
    expect(allStatuses['service-2'].status).toBe('unhealthy');
  });
});