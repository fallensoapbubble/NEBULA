/**
 * Portfolio Performance Optimization Service
 * Implements content caching, performance monitoring, and efficient bundle loading
 */

import { getGitHubCacheService } from './github-cache-service.js';
import { logger } from './logger.js';

/**
 * Portfolio Performance Service
 */
export class PortfolioPerformanceService {
  constructor(options = {}) {
    this.options = {
      // Cache settings
      portfolioCacheTTL: options.portfolioCacheTTL || 600000, // 10 minutes
      assetCacheTTL: options.assetCacheTTL || 1800000, // 30 minutes
      metadataCacheTTL: options.metadataCacheTTL || 300000, // 5 minutes
      
      // Performance settings
      enablePreloading: options.enablePreloading !== false,
      enableLazyLoading: options.enableLazyLoading !== false,
      enableImageOptimization: options.enableImageOptimization !== false,
      
      // Bundle optimization
      enableCodeSplitting: options.enableCodeSplitting !== false,
      enableAssetMinification: options.enableAssetMinification !== false,
      maxBundleSize: options.maxBundleSize || 250000, // 250KB
      
      // Monitoring
      enablePerformanceMonitoring: options.enablePerformanceMonitoring !== false,
      performanceThresholds: {
        loadTime: options.loadTimeThreshold || 2000, // 2 seconds
        renderTime: options.renderTimeThreshold || 1000, // 1 second
        bundleSize: options.bundleSizeThreshold || 500000, // 500KB
        ...options.performanceThresholds
      },
      
      ...options
    };

    this.cacheService = getGitHubCacheService();
    this.logger = logger.child({ service: 'portfolio-performance' });
    
    // Performance metrics
    this.metrics = {
      portfolioLoads: 0,
      cacheHits: 0,
      cacheMisses: 0,
      averageLoadTime: 0,
      averageRenderTime: 0,
      totalBytesServed: 0,
      errors: 0,
      startTime: Date.now()
    };

    // Performance monitoring
    this.performanceEntries = new Map();
    this.assetCache = new Map();
    
    // Preload queue
    this.preloadQueue = new Set();
    this.isPreloading = false;
  }

  /**
   * Get optimized portfolio data with caching and performance monitoring
   * @param {string} owner - Repository owner
   * @param {string} repo - Repository name
   * @param {Object} options - Request options
   * @returns {Promise<Object>} Optimized portfolio data
   */
  async getOptimizedPortfolio(owner, repo, options = {}) {
    const startTime = performance.now();
    const portfolioId = `${owner}/${repo}`;
    
    this.logger.info('Loading portfolio', { owner, repo });
    
    try {
      // Start performance monitoring
      this.startPerformanceMonitoring(portfolioId);
      
      // Check cache first
      const cacheKey = `portfolio:${portfolioId}:${options.ref || 'main'}`;
      const cached = this.cacheService.get(cacheKey);
      
      if (cached && !options.skipCache) {
        this.metrics.cacheHits++;
        this.logger.debug('Portfolio cache hit', { portfolioId });
        
        // Schedule background refresh if stale
        if (cached.age > this.options.portfolioCacheTTL * 0.8) {
          this.scheduleBackgroundRefresh(owner, repo, options);
        }
        
        return this.enhancePortfolioData(cached.data, { cached: true });
      }

      this.metrics.cacheMisses++;
      
      // Load portfolio data
      const portfolioData = await this.loadPortfolioData(owner, repo, options);
      
      // Optimize the data
      const optimizedData = await this.optimizePortfolioData(portfolioData);
      
      // Cache the result
      this.cacheService.set(cacheKey, optimizedData, {
        ttl: this.options.portfolioCacheTTL
      });
      
      // Update metrics
      const loadTime = performance.now() - startTime;
      this.updateMetrics(loadTime, optimizedData);
      
      // End performance monitoring
      this.endPerformanceMonitoring(portfolioId, loadTime);
      
      // Schedule preloading of related assets
      if (this.options.enablePreloading) {
        this.scheduleAssetPreloading(optimizedData);
      }
      
      return this.enhancePortfolioData(optimizedData, { 
        cached: false, 
        loadTime,
        optimized: true 
      });

    } catch (error) {
      this.metrics.errors++;
      this.logger.error('Portfolio loading failed', {
        owner,
        repo,
        error: error.message,
        loadTime: performance.now() - startTime
      });
      
      throw error;
    }
  }

  /**
   * Load portfolio data from GitHub
   * @private
   */
  async loadPortfolioData(owner, repo, options = {}) {
    // This would integrate with existing GitHub services
    // For now, return a mock structure
    return {
      repository: { owner, repo },
      content: {},
      metadata: {
        lastUpdated: new Date().toISOString(),
        version: '1.0.0'
      },
      assets: [],
      template: options.template || 'default'
    };
  }

  /**
   * Optimize portfolio data for performance
   * @private
   */
  async optimizePortfolioData(portfolioData) {
    const startTime = performance.now();
    
    try {
      // Optimize images
      if (this.options.enableImageOptimization) {
        portfolioData = await this.optimizeImages(portfolioData);
      }
      
      // Minify content
      if (this.options.enableAssetMinification) {
        portfolioData = await this.minifyAssets(portfolioData);
      }
      
      // Apply code splitting
      if (this.options.enableCodeSplitting) {
        portfolioData = await this.applyCodeSplitting(portfolioData);
      }
      
      // Optimize bundle size
      portfolioData = await this.optimizeBundleSize(portfolioData);
      
      const optimizationTime = performance.now() - startTime;
      
      this.logger.debug('Portfolio data optimized', {
        optimizationTime: Math.round(optimizationTime),
        originalSize: this.calculateDataSize(portfolioData),
        optimizations: {
          images: this.options.enableImageOptimization,
          minification: this.options.enableAssetMinification,
          codeSplitting: this.options.enableCodeSplitting
        }
      });
      
      return portfolioData;

    } catch (error) {
      this.logger.warn('Portfolio optimization failed', {
        error: error.message
      });
      
      // Return unoptimized data if optimization fails
      return portfolioData;
    }
  }

  /**
   * Optimize images in portfolio data
   * @private
   */
  async optimizeImages(portfolioData) {
    // Image optimization logic would go here
    // For now, just add optimization metadata
    if (portfolioData.assets) {
      portfolioData.assets = portfolioData.assets.map(asset => {
        if (asset.type === 'image') {
          return {
            ...asset,
            optimized: true,
            formats: ['webp', 'avif', asset.format],
            sizes: ['320w', '640w', '1024w', '1920w']
          };
        }
        return asset;
      });
    }
    
    return portfolioData;
  }

  /**
   * Minify assets in portfolio data
   * @private
   */
  async minifyAssets(portfolioData) {
    // Asset minification logic would go here
    // For now, just add minification metadata
    if (portfolioData.content) {
      Object.keys(portfolioData.content).forEach(key => {
        if (typeof portfolioData.content[key] === 'string') {
          // Simulate minification by removing extra whitespace
          portfolioData.content[key] = portfolioData.content[key]
            .replace(/\s+/g, ' ')
            .trim();
        }
      });
    }
    
    return portfolioData;
  }

  /**
   * Apply code splitting to portfolio data
   * @private
   */
  async applyCodeSplitting(portfolioData) {
    // Code splitting logic would go here
    // For now, just add splitting metadata
    portfolioData.bundles = {
      main: { size: 50000, critical: true },
      components: { size: 30000, lazy: true },
      assets: { size: 20000, lazy: true }
    };
    
    return portfolioData;
  }

  /**
   * Optimize bundle size
   * @private
   */
  async optimizeBundleSize(portfolioData) {
    const currentSize = this.calculateDataSize(portfolioData);
    
    if (currentSize > this.options.maxBundleSize) {
      this.logger.warn('Portfolio bundle size exceeds threshold', {
        currentSize,
        maxSize: this.options.maxBundleSize
      });
      
      // Apply aggressive optimization
      portfolioData = await this.applyAggressiveOptimization(portfolioData);
    }
    
    return portfolioData;
  }

  /**
   * Apply aggressive optimization when bundle is too large
   * @private
   */
  async applyAggressiveOptimization(portfolioData) {
    // Remove non-essential data
    if (portfolioData.metadata?.debug) {
      delete portfolioData.metadata.debug;
    }
    
    // Compress content
    if (portfolioData.content) {
      Object.keys(portfolioData.content).forEach(key => {
        if (typeof portfolioData.content[key] === 'string' && 
            portfolioData.content[key].length > 1000) {
          // Truncate very long content
          portfolioData.content[key] = portfolioData.content[key].substring(0, 1000) + '...';
        }
      });
    }
    
    return portfolioData;
  }

  /**
   * Enhance portfolio data with performance metadata
   * @private
   */
  enhancePortfolioData(portfolioData, metadata = {}) {
    return {
      ...portfolioData,
      _performance: {
        cached: metadata.cached || false,
        loadTime: metadata.loadTime || 0,
        optimized: metadata.optimized || false,
        timestamp: Date.now(),
        version: '1.0.0'
      }
    };
  }

  /**
   * Schedule background refresh of portfolio data
   * @private
   */
  scheduleBackgroundRefresh(owner, repo, options) {
    const refreshKey = `${owner}/${repo}`;
    
    if (this.preloadQueue.has(refreshKey)) {
      return; // Already scheduled
    }
    
    this.preloadQueue.add(refreshKey);
    
    // Process refresh queue
    setImmediate(async () => {
      try {
        await this.getOptimizedPortfolio(owner, repo, { 
          ...options, 
          skipCache: true 
        });
        
        this.logger.debug('Background refresh completed', { owner, repo });
      } catch (error) {
        this.logger.warn('Background refresh failed', {
          owner,
          repo,
          error: error.message
        });
      } finally {
        this.preloadQueue.delete(refreshKey);
      }
    });
  }

  /**
   * Schedule preloading of portfolio assets
   * @private
   */
  scheduleAssetPreloading(portfolioData) {
    if (!this.options.enablePreloading || this.isPreloading) {
      return;
    }
    
    this.isPreloading = true;
    
    setImmediate(async () => {
      try {
        if (portfolioData.assets) {
          for (const asset of portfolioData.assets) {
            if (asset.preload && !this.assetCache.has(asset.url)) {
              await this.preloadAsset(asset);
            }
          }
        }
      } catch (error) {
        this.logger.warn('Asset preloading failed', {
          error: error.message
        });
      } finally {
        this.isPreloading = false;
      }
    });
  }

  /**
   * Preload individual asset
   * @private
   */
  async preloadAsset(asset) {
    try {
      // Simulate asset preloading
      this.assetCache.set(asset.url, {
        data: `preloaded-${asset.url}`,
        timestamp: Date.now(),
        size: asset.size || 1000
      });
      
      this.logger.debug('Asset preloaded', {
        url: asset.url,
        type: asset.type,
        size: asset.size
      });
      
    } catch (error) {
      this.logger.warn('Asset preload failed', {
        url: asset.url,
        error: error.message
      });
    }
  }

  /**
   * Start performance monitoring for a portfolio
   * @private
   */
  startPerformanceMonitoring(portfolioId) {
    if (!this.options.enablePerformanceMonitoring) {
      return;
    }
    
    this.performanceEntries.set(portfolioId, {
      startTime: performance.now(),
      metrics: {}
    });
  }

  /**
   * End performance monitoring and log results
   * @private
   */
  endPerformanceMonitoring(portfolioId, loadTime) {
    if (!this.options.enablePerformanceMonitoring) {
      return;
    }
    
    const entry = this.performanceEntries.get(portfolioId);
    if (!entry) return;
    
    const totalTime = performance.now() - entry.startTime;
    
    // Check performance thresholds
    const thresholds = this.options.performanceThresholds;
    const warnings = [];
    
    if (loadTime > thresholds.loadTime) {
      warnings.push(`Load time ${Math.round(loadTime)}ms exceeds threshold ${thresholds.loadTime}ms`);
    }
    
    if (totalTime > thresholds.renderTime) {
      warnings.push(`Render time ${Math.round(totalTime)}ms exceeds threshold ${thresholds.renderTime}ms`);
    }
    
    if (warnings.length > 0) {
      this.logger.warn('Performance threshold exceeded', {
        portfolioId,
        loadTime: Math.round(loadTime),
        totalTime: Math.round(totalTime),
        warnings
      });
    } else {
      this.logger.debug('Performance monitoring completed', {
        portfolioId,
        loadTime: Math.round(loadTime),
        totalTime: Math.round(totalTime)
      });
    }
    
    this.performanceEntries.delete(portfolioId);
  }

  /**
   * Update performance metrics
   * @private
   */
  updateMetrics(loadTime, portfolioData) {
    this.metrics.portfolioLoads++;
    
    // Update average load time
    const totalLoadTime = this.metrics.averageLoadTime * (this.metrics.portfolioLoads - 1) + loadTime;
    this.metrics.averageLoadTime = totalLoadTime / this.metrics.portfolioLoads;
    
    // Update bytes served
    const dataSize = this.calculateDataSize(portfolioData);
    this.metrics.totalBytesServed += dataSize;
  }

  /**
   * Calculate approximate size of data
   * @private
   */
  calculateDataSize(data) {
    try {
      return JSON.stringify(data).length;
    } catch {
      return 0;
    }
  }

  /**
   * Get performance statistics
   * @returns {Object} Performance statistics
   */
  getPerformanceStats() {
    const uptime = Date.now() - this.metrics.startTime;
    const cacheHitRate = this.metrics.portfolioLoads > 0 
      ? (this.metrics.cacheHits / this.metrics.portfolioLoads) * 100 
      : 0;
    
    return {
      service: 'portfolio-performance',
      uptime,
      metrics: {
        ...this.metrics,
        cacheHitRate: Math.round(cacheHitRate * 100) / 100,
        averageLoadTime: Math.round(this.metrics.averageLoadTime * 100) / 100,
        errorRate: this.metrics.portfolioLoads > 0 
          ? (this.metrics.errors / this.metrics.portfolioLoads) * 100 
          : 0
      },
      cache: {
        portfolioEntries: this.cacheService.getStats().entries,
        assetEntries: this.assetCache.size,
        preloadQueueSize: this.preloadQueue.size
      },
      thresholds: this.options.performanceThresholds,
      optimizations: {
        preloading: this.options.enablePreloading,
        lazyLoading: this.options.enableLazyLoading,
        imageOptimization: this.options.enableImageOptimization,
        codeSplitting: this.options.enableCodeSplitting,
        minification: this.options.enableAssetMinification
      }
    };
  }

  /**
   * Clear performance caches
   */
  clearCaches() {
    this.assetCache.clear();
    this.preloadQueue.clear();
    this.performanceEntries.clear();
    
    this.logger.info('Performance caches cleared');
  }

  /**
   * Optimize portfolio for specific device/connection
   * @param {Object} portfolioData - Portfolio data to optimize
   * @param {Object} clientHints - Client hints (connection, device, etc.)
   * @returns {Object} Optimized portfolio data
   */
  async optimizeForClient(portfolioData, clientHints = {}) {
    const {
      connection = 'fast',
      deviceType = 'desktop',
      screenSize = 'large',
      supportedFormats = ['webp', 'jpeg']
    } = clientHints;
    
    let optimizedData = { ...portfolioData };
    
    // Optimize based on connection speed
    if (connection === 'slow' || connection === '2g') {
      // Aggressive optimization for slow connections
      optimizedData = await this.applyAggressiveOptimization(optimizedData);
      
      // Remove non-essential assets
      if (optimizedData.assets) {
        optimizedData.assets = optimizedData.assets.filter(asset => 
          asset.essential !== false
        );
      }
    }
    
    // Optimize based on device type
    if (deviceType === 'mobile') {
      // Mobile-specific optimizations
      if (optimizedData.assets) {
        optimizedData.assets = optimizedData.assets.map(asset => {
          if (asset.type === 'image') {
            return {
              ...asset,
              maxWidth: 768,
              quality: 80
            };
          }
          return asset;
        });
      }
    }
    
    // Optimize image formats based on support
    if (optimizedData.assets) {
      optimizedData.assets = optimizedData.assets.map(asset => {
        if (asset.type === 'image' && asset.formats) {
          // Use the best supported format
          const bestFormat = asset.formats.find(format => 
            supportedFormats.includes(format)
          ) || asset.formats[asset.formats.length - 1];
          
          return {
            ...asset,
            selectedFormat: bestFormat
          };
        }
        return asset;
      });
    }
    
    this.logger.debug('Portfolio optimized for client', {
      connection,
      deviceType,
      screenSize,
      supportedFormats,
      originalSize: this.calculateDataSize(portfolioData),
      optimizedSize: this.calculateDataSize(optimizedData)
    });
    
    return optimizedData;
  }
}

/**
 * Create portfolio performance service instance
 * @param {Object} options - Service options
 * @returns {PortfolioPerformanceService}
 */
export function createPortfolioPerformanceService(options = {}) {
  return new PortfolioPerformanceService(options);
}

// Global performance service instance
let globalPerformanceService = null;

/**
 * Get or create global performance service
 * @param {Object} options - Service options
 * @returns {PortfolioPerformanceService}
 */
export function getPortfolioPerformanceService(options = {}) {
  if (!globalPerformanceService) {
    globalPerformanceService = new PortfolioPerformanceService(options);
  }
  return globalPerformanceService;
}

/**
 * Reset global performance service (for testing)
 */
export function resetPortfolioPerformanceService() {
  if (globalPerformanceService) {
    globalPerformanceService.clearCaches();
  }
  globalPerformanceService = null;
}

export default PortfolioPerformanceService;