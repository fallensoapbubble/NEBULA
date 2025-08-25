/**
 * Tests for Portfolio Performance Service
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { 
  PortfolioPerformanceService, 
  getPortfolioPerformanceService, 
  resetPortfolioPerformanceService 
} from '../portfolio-performance-service.js';

// Mock the cache service
vi.mock('../github-cache-service.js', () => ({
  getGitHubCacheService: () => ({
    get: vi.fn(),
    set: vi.fn(),
    getStats: () => ({ entries: 0, hitRate: 0, memoryUsageMB: 0 })
  })
}));

describe('PortfolioPerformanceService', () => {
  let performanceService;

  beforeEach(() => {
    performanceService = new PortfolioPerformanceService({
      portfolioCacheTTL: 1000, // 1 second for testing
      enablePerformanceMonitoring: true
    });
  });

  afterEach(() => {
    resetPortfolioPerformanceService();
  });

  describe('Portfolio Loading', () => {
    it('should load and optimize portfolio data', async () => {
      const result = await performanceService.getOptimizedPortfolio('owner', 'repo');

      expect(result).toBeDefined();
      expect(result._performance).toBeDefined();
      expect(result._performance.optimized).toBe(true);
      expect(result._performance.cached).toBe(false);
    });

    it('should return cached data when available', async () => {
      // Mock cache to return data
      const mockCacheData = {
        repository: { owner: 'owner', repo: 'repo' },
        content: { test: 'cached data' }
      };
      
      performanceService.cacheService.get = vi.fn().mockReturnValue({
        data: mockCacheData,
        age: 100
      });

      const result = await performanceService.getOptimizedPortfolio('owner', 'repo');

      expect(result._performance.cached).toBe(true);
      expect(performanceService.cacheService.get).toHaveBeenCalled();
    });

    it('should handle loading errors gracefully', async () => {
      // Mock loadPortfolioData to throw error
      performanceService.loadPortfolioData = vi.fn().mockRejectedValue(new Error('Load failed'));

      await expect(
        performanceService.getOptimizedPortfolio('owner', 'repo')
      ).rejects.toThrow('Load failed');

      expect(performanceService.metrics.errors).toBe(1);
    });
  });

  describe('Data Optimization', () => {
    it('should optimize portfolio data', async () => {
      const mockData = {
        repository: { owner: 'test', repo: 'test' },
        content: { description: 'A very long description that should be optimized' },
        assets: [
          { type: 'image', url: 'test.jpg', size: 50000 },
          { type: 'font', url: 'font.woff2' }
        ]
      };

      const optimized = await performanceService.optimizePortfolioData(mockData);

      expect(optimized).toBeDefined();
      expect(optimized.assets).toBeDefined();
      
      // Check image optimization
      const imageAsset = optimized.assets.find(a => a.type === 'image');
      expect(imageAsset.optimized).toBe(true);
      expect(imageAsset.formats).toContain('webp');
    });

    it('should handle optimization errors gracefully', async () => {
      const mockData = { invalid: 'data' };
      
      // Mock optimization method to throw error
      performanceService.optimizeImages = vi.fn().mockRejectedValue(new Error('Optimization failed'));

      const result = await performanceService.optimizePortfolioData(mockData);

      // Should return original data on optimization failure
      expect(result).toEqual(mockData);
    });
  });

  describe('Client Optimization', () => {
    it('should optimize for slow connections', async () => {
      const mockData = {
        content: { description: 'Test content' },
        assets: [
          { type: 'image', essential: true, size: 100000 },
          { type: 'image', essential: false, size: 50000 }
        ]
      };

      const clientHints = {
        connection: 'slow',
        deviceType: 'mobile'
      };

      const optimized = await performanceService.optimizeForClient(mockData, clientHints);

      // Should remove non-essential assets for slow connections
      const essentialAssets = optimized.assets.filter(a => a.essential !== false);
      expect(essentialAssets.length).toBeGreaterThan(0);
    });

    it('should optimize for mobile devices', async () => {
      const mockData = {
        assets: [
          { type: 'image', url: 'test.jpg', formats: ['jpeg', 'webp'] }
        ]
      };

      const clientHints = {
        deviceType: 'mobile',
        supportedFormats: ['webp', 'jpeg']
      };

      const optimized = await performanceService.optimizeForClient(mockData, clientHints);

      const imageAsset = optimized.assets[0];
      expect(imageAsset.maxWidth).toBe(768);
      expect(imageAsset.quality).toBe(80);
    });

    it('should select best supported image format', async () => {
      const mockData = {
        assets: [
          { 
            type: 'image', 
            formats: ['avif', 'webp', 'jpeg']
          }
        ]
      };

      const clientHints = {
        supportedFormats: ['webp', 'jpeg']
      };

      const optimized = await performanceService.optimizeForClient(mockData, clientHints);

      const imageAsset = optimized.assets[0];
      expect(imageAsset.selectedFormat).toBe('webp');
    });
  });

  describe('Performance Monitoring', () => {
    it('should track performance metrics', async () => {
      const initialMetrics = performanceService.metrics.portfolioLoads;

      await performanceService.getOptimizedPortfolio('owner', 'repo');

      expect(performanceService.metrics.portfolioLoads).toBe(initialMetrics + 1);
      expect(performanceService.metrics.averageLoadTime).toBeGreaterThan(0);
    });

    it('should provide performance statistics', () => {
      const stats = performanceService.getPerformanceStats();

      expect(stats).toBeDefined();
      expect(stats.service).toBe('portfolio-performance');
      expect(stats.metrics).toBeDefined();
      expect(stats.cache).toBeDefined();
      expect(stats.optimizations).toBeDefined();
    });

    it('should monitor performance thresholds', async () => {
      const logSpy = vi.spyOn(performanceService.logger, 'warn');
      
      // Mock slow performance
      const originalPerformance = global.performance;
      global.performance = {
        now: vi.fn()
          .mockReturnValueOnce(0)     // Start time
          .mockReturnValueOnce(3000)  // End time (3 seconds - exceeds threshold)
      };

      performanceService.startPerformanceMonitoring('test-portfolio');
      performanceService.endPerformanceMonitoring('test-portfolio', 3000);

      expect(logSpy).toHaveBeenCalledWith(
        'Performance threshold exceeded',
        expect.objectContaining({
          portfolioId: 'test-portfolio'
        })
      );

      global.performance = originalPerformance;
    });
  });

  describe('Asset Preloading', () => {
    it('should schedule asset preloading', async () => {
      const mockData = {
        assets: [
          { url: 'critical.css', preload: true, type: 'stylesheet' },
          { url: 'optional.js', preload: false, type: 'script' }
        ]
      };

      const preloadSpy = vi.spyOn(performanceService, 'preloadAsset').mockResolvedValue();

      performanceService.scheduleAssetPreloading(mockData);

      // Wait for async preloading
      await new Promise(resolve => setTimeout(resolve, 10));

      expect(preloadSpy).toHaveBeenCalledWith(
        expect.objectContaining({ url: 'critical.css' })
      );
    });

    it('should cache preloaded assets', async () => {
      const asset = { url: 'test-asset.js', size: 1000 };

      await performanceService.preloadAsset(asset);

      expect(performanceService.assetCache.has(asset.url)).toBe(true);
      
      const cached = performanceService.assetCache.get(asset.url);
      expect(cached.data).toBe(`preloaded-${asset.url}`);
    });
  });

  describe('Cache Management', () => {
    it('should clear caches', () => {
      performanceService.assetCache.set('test', 'data');
      performanceService.preloadQueue.add('test');

      performanceService.clearCaches();

      expect(performanceService.assetCache.size).toBe(0);
      expect(performanceService.preloadQueue.size).toBe(0);
    });
  });
});

describe('Global Performance Service', () => {
  afterEach(() => {
    resetPortfolioPerformanceService();
  });

  it('should return singleton instance', () => {
    const service1 = getPortfolioPerformanceService();
    const service2 = getPortfolioPerformanceService();
    
    expect(service1).toBe(service2);
  });

  it('should reset global instance', () => {
    const service1 = getPortfolioPerformanceService();
    service1.assetCache.set('test', 'data');
    
    resetPortfolioPerformanceService();
    
    const service2 = getPortfolioPerformanceService();
    expect(service2).not.toBe(service1);
    expect(service2.assetCache.size).toBe(0);
  });
});