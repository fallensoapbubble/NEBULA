/**
 * Bundle Optimization Utility
 * Provides efficient bundle loading and asset optimization for portfolios
 */

import { logger } from './logger.js';

/**
 * Bundle Optimizer
 */
export class BundleOptimizer {
  constructor(options = {}) {
    this.options = {
      // Bundle size limits
      maxBundleSize: options.maxBundleSize || 250000, // 250KB
      maxChunkSize: options.maxChunkSize || 100000, // 100KB
      
      // Optimization settings
      enableTreeShaking: options.enableTreeShaking !== false,
      enableMinification: options.enableMinification !== false,
      enableCompression: options.enableCompression !== false,
      enableCodeSplitting: options.enableCodeSplitting !== false,
      
      // Asset optimization
      enableAssetOptimization: options.enableAssetOptimization !== false,
      imageQuality: options.imageQuality || 85,
      enableWebP: options.enableWebP !== false,
      enableAVIF: options.enableAVIF !== false,
      
      // Caching
      enableAssetCaching: options.enableAssetCaching !== false,
      cacheMaxAge: options.cacheMaxAge || 31536000, // 1 year
      
      ...options
    };

    this.logger = logger.child({ service: 'bundle-optimizer' });
    
    // Bundle cache
    this.bundleCache = new Map();
    this.assetCache = new Map();
    
    // Optimization stats
    this.stats = {
      bundlesOptimized: 0,
      totalSavings: 0,
      averageCompressionRatio: 0,
      cacheHits: 0,
      cacheMisses: 0
    };
  }

  /**
   * Optimize portfolio bundle
   * @param {Object} portfolioData - Portfolio data to optimize
   * @param {Object} options - Optimization options
   * @returns {Promise<Object>} Optimized bundle
   */
  async optimizeBundle(portfolioData, options = {}) {
    const startTime = performance.now();
    const bundleId = this.generateBundleId(portfolioData);
    
    this.logger.debug('Starting bundle optimization', { bundleId });
    
    try {
      // Check cache first
      if (this.options.enableAssetCaching) {
        const cached = this.bundleCache.get(bundleId);
        if (cached && !options.skipCache) {
          this.stats.cacheHits++;
          this.logger.debug('Bundle cache hit', { bundleId });
          return cached;
        }
        this.stats.cacheMisses++;
      }

      // Create optimization context
      const context = {
        originalSize: this.calculateSize(portfolioData),
        optimizations: [],
        assets: new Map(),
        chunks: new Map()
      };

      // Apply optimizations
      let optimizedData = { ...portfolioData };
      
      if (this.options.enableTreeShaking) {
        optimizedData = await this.applyTreeShaking(optimizedData, context);
      }
      
      if (this.options.enableCodeSplitting) {
        optimizedData = await this.applyCodeSplitting(optimizedData, context);
      }
      
      if (this.options.enableAssetOptimization) {
        optimizedData = await this.optimizeAssets(optimizedData, context);
      }
      
      if (this.options.enableMinification) {
        optimizedData = await this.minifyBundle(optimizedData, context);
      }
      
      if (this.options.enableCompression) {
        optimizedData = await this.compressBundle(optimizedData, context);
      }

      // Calculate final metrics
      const finalSize = this.calculateSize(optimizedData);
      const compressionRatio = (context.originalSize - finalSize) / context.originalSize;
      const optimizationTime = performance.now() - startTime;

      // Create optimized bundle
      const optimizedBundle = {
        data: optimizedData,
        metadata: {
          bundleId,
          originalSize: context.originalSize,
          optimizedSize: finalSize,
          compressionRatio: Math.round(compressionRatio * 10000) / 100, // Percentage
          optimizationTime: Math.round(optimizationTime),
          optimizations: context.optimizations,
          chunks: Array.from(context.chunks.values()),
          assets: Array.from(context.assets.values()),
          timestamp: Date.now()
        }
      };

      // Cache the result
      if (this.options.enableAssetCaching) {
        this.bundleCache.set(bundleId, optimizedBundle);
      }

      // Update stats
      this.updateStats(context.originalSize, finalSize, compressionRatio);

      this.logger.info('Bundle optimization completed', {
        bundleId,
        originalSize: context.originalSize,
        optimizedSize: finalSize,
        savings: context.originalSize - finalSize,
        compressionRatio: `${Math.round(compressionRatio * 100)}%`,
        optimizationTime: Math.round(optimizationTime)
      });

      return optimizedBundle;

    } catch (error) {
      this.logger.error('Bundle optimization failed', {
        bundleId,
        error: error.message,
        optimizationTime: performance.now() - startTime
      });
      
      // Return unoptimized bundle on error
      return {
        data: portfolioData,
        metadata: {
          bundleId,
          error: error.message,
          optimized: false,
          timestamp: Date.now()
        }
      };
    }
  }

  /**
   * Apply tree shaking to remove unused code
   * @private
   */
  async applyTreeShaking(portfolioData, context) {
    this.logger.debug('Applying tree shaking');
    
    // Simulate tree shaking by removing unused properties
    const optimized = { ...portfolioData };
    
    // Remove debug information
    if (optimized.debug) {
      delete optimized.debug;
      context.optimizations.push('removed-debug-info');
    }
    
    // Remove unused template data
    if (optimized.templates) {
      const usedTemplate = optimized.selectedTemplate || 'default';
      optimized.templates = {
        [usedTemplate]: optimized.templates[usedTemplate]
      };
      context.optimizations.push('tree-shook-templates');
    }
    
    // Remove empty or null values
    this.removeEmptyValues(optimized);
    context.optimizations.push('removed-empty-values');
    
    return optimized;
  }

  /**
   * Apply code splitting to create smaller chunks
   * @private
   */
  async applyCodeSplitting(portfolioData, context) {
    this.logger.debug('Applying code splitting');
    
    const optimized = { ...portfolioData };
    
    // Split content into chunks
    if (optimized.content) {
      const chunks = this.splitContent(optimized.content);
      
      // Store chunks separately
      chunks.forEach((chunk, index) => {
        const chunkId = `chunk-${index}`;
        context.chunks.set(chunkId, {
          id: chunkId,
          size: this.calculateSize(chunk),
          type: chunk.type || 'content',
          lazy: chunk.lazy !== false
        });
      });
      
      // Replace content with chunk references
      optimized.contentChunks = Array.from(context.chunks.keys());
      delete optimized.content;
      
      context.optimizations.push('code-splitting');
    }
    
    return optimized;
  }

  /**
   * Optimize assets (images, fonts, etc.)
   * @private
   */
  async optimizeAssets(portfolioData, context) {
    this.logger.debug('Optimizing assets');
    
    const optimized = { ...portfolioData };
    
    if (optimized.assets) {
      optimized.assets = await Promise.all(
        optimized.assets.map(async (asset) => {
          const optimizedAsset = await this.optimizeAsset(asset);
          
          // Track asset optimization
          context.assets.set(asset.id || asset.url, {
            id: asset.id || asset.url,
            originalSize: asset.size || 0,
            optimizedSize: optimizedAsset.size || 0,
            format: optimizedAsset.format,
            optimizations: optimizedAsset.optimizations || []
          });
          
          return optimizedAsset;
        })
      );
      
      context.optimizations.push('asset-optimization');
    }
    
    return optimized;
  }

  /**
   * Optimize individual asset
   * @private
   */
  async optimizeAsset(asset) {
    const optimized = { ...asset };
    const optimizations = [];
    
    if (asset.type === 'image') {
      // Image optimization
      if (this.options.enableWebP && !asset.format?.includes('webp')) {
        optimized.formats = [...(asset.formats || [asset.format]), 'webp'];
        optimizations.push('webp-conversion');
      }
      
      if (this.options.enableAVIF && !asset.format?.includes('avif')) {
        optimized.formats = [...(optimized.formats || []), 'avif'];
        optimizations.push('avif-conversion');
      }
      
      // Quality optimization
      if (!asset.quality || asset.quality > this.options.imageQuality) {
        optimized.quality = this.options.imageQuality;
        optimizations.push('quality-optimization');
      }
      
      // Size optimization
      if (asset.size && asset.size > 100000) { // 100KB
        optimized.sizes = ['320w', '640w', '1024w', '1920w'];
        optimizations.push('responsive-sizes');
      }
    }
    
    if (asset.type === 'font') {
      // Font optimization
      optimized.display = 'swap';
      optimized.preload = asset.critical !== false;
      optimizations.push('font-optimization');
    }
    
    optimized.optimizations = optimizations;
    return optimized;
  }

  /**
   * Minify bundle content
   * @private
   */
  async minifyBundle(portfolioData, context) {
    this.logger.debug('Minifying bundle');
    
    const optimized = JSON.parse(JSON.stringify(portfolioData));
    
    // Minify string content
    this.minifyStrings(optimized);
    
    context.optimizations.push('minification');
    return optimized;
  }

  /**
   * Compress bundle data
   * @private
   */
  async compressBundle(portfolioData, context) {
    this.logger.debug('Compressing bundle');
    
    // Simulate compression by marking as compressed
    const optimized = {
      ...portfolioData,
      _compressed: true,
      _compressionAlgorithm: 'gzip'
    };
    
    context.optimizations.push('compression');
    return optimized;
  }

  /**
   * Split content into manageable chunks
   * @private
   */
  splitContent(content) {
    const chunks = [];
    const maxChunkSize = this.options.maxChunkSize;
    
    Object.entries(content).forEach(([key, value]) => {
      const itemSize = this.calculateSize(value);
      
      if (itemSize > maxChunkSize) {
        // Split large items
        if (typeof value === 'string') {
          const parts = this.splitString(value, maxChunkSize);
          parts.forEach((part, index) => {
            chunks.push({
              type: 'content-part',
              key: `${key}-${index}`,
              data: part,
              lazy: true
            });
          });
        } else {
          chunks.push({
            type: 'content',
            key,
            data: value,
            lazy: true
          });
        }
      } else {
        chunks.push({
          type: 'content',
          key,
          data: value,
          lazy: false
        });
      }
    });
    
    return chunks;
  }

  /**
   * Split string into smaller parts
   * @private
   */
  splitString(str, maxSize) {
    const parts = [];
    const approximateCharSize = 2; // UTF-16 encoding
    const maxChars = Math.floor(maxSize / approximateCharSize);
    
    for (let i = 0; i < str.length; i += maxChars) {
      parts.push(str.substring(i, i + maxChars));
    }
    
    return parts;
  }

  /**
   * Remove empty values from object
   * @private
   */
  removeEmptyValues(obj) {
    Object.keys(obj).forEach(key => {
      const value = obj[key];
      
      if (value === null || value === undefined || value === '') {
        delete obj[key];
      } else if (Array.isArray(value) && value.length === 0) {
        delete obj[key];
      } else if (typeof value === 'object' && Object.keys(value).length === 0) {
        delete obj[key];
      } else if (typeof value === 'object' && !Array.isArray(value)) {
        this.removeEmptyValues(value);
        if (Object.keys(value).length === 0) {
          delete obj[key];
        }
      }
    });
  }

  /**
   * Minify strings in object
   * @private
   */
  minifyStrings(obj) {
    Object.keys(obj).forEach(key => {
      const value = obj[key];
      
      if (typeof value === 'string') {
        // Remove extra whitespace
        obj[key] = value.replace(/\s+/g, ' ').trim();
      } else if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
        this.minifyStrings(value);
      } else if (Array.isArray(value)) {
        value.forEach(item => {
          if (typeof item === 'object' && item !== null) {
            this.minifyStrings(item);
          }
        });
      }
    });
  }

  /**
   * Generate unique bundle ID
   * @private
   */
  generateBundleId(portfolioData) {
    // Create hash from portfolio data
    const dataString = JSON.stringify(portfolioData);
    let hash = 0;
    
    for (let i = 0; i < dataString.length; i++) {
      const char = dataString.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    
    return `bundle-${Math.abs(hash).toString(36)}`;
  }

  /**
   * Calculate size of data
   * @private
   */
  calculateSize(data) {
    try {
      return JSON.stringify(data).length * 2; // Approximate UTF-16 size
    } catch {
      return 0;
    }
  }

  /**
   * Update optimization statistics
   * @private
   */
  updateStats(originalSize, optimizedSize, compressionRatio) {
    this.stats.bundlesOptimized++;
    this.stats.totalSavings += (originalSize - optimizedSize);
    
    // Update average compression ratio
    const totalRatio = this.stats.averageCompressionRatio * (this.stats.bundlesOptimized - 1) + compressionRatio;
    this.stats.averageCompressionRatio = totalRatio / this.stats.bundlesOptimized;
  }

  /**
   * Get optimization statistics
   * @returns {Object} Optimization statistics
   */
  getStats() {
    return {
      service: 'bundle-optimizer',
      stats: {
        ...this.stats,
        averageCompressionRatio: Math.round(this.stats.averageCompressionRatio * 10000) / 100,
        cacheHitRate: this.stats.cacheHits + this.stats.cacheMisses > 0
          ? (this.stats.cacheHits / (this.stats.cacheHits + this.stats.cacheMisses)) * 100
          : 0
      },
      cache: {
        bundleEntries: this.bundleCache.size,
        assetEntries: this.assetCache.size
      },
      options: this.options
    };
  }

  /**
   * Clear optimization caches
   */
  clearCaches() {
    this.bundleCache.clear();
    this.assetCache.clear();
    
    this.logger.info('Bundle optimizer caches cleared');
  }

  /**
   * Preload critical assets
   * @param {Array} assets - Assets to preload
   * @returns {Promise<Array>} Preload results
   */
  async preloadCriticalAssets(assets) {
    const criticalAssets = assets.filter(asset => asset.critical || asset.preload);
    
    this.logger.debug('Preloading critical assets', {
      count: criticalAssets.length
    });
    
    const preloadPromises = criticalAssets.map(async (asset) => {
      try {
        // Simulate asset preloading
        await new Promise(resolve => setTimeout(resolve, 10));
        
        return {
          asset: asset.id || asset.url,
          success: true,
          loadTime: 10
        };
      } catch (error) {
        return {
          asset: asset.id || asset.url,
          success: false,
          error: error.message
        };
      }
    });
    
    const results = await Promise.allSettled(preloadPromises);
    
    const successful = results.filter(r => r.status === 'fulfilled' && r.value.success).length;
    
    this.logger.info('Critical assets preloaded', {
      total: criticalAssets.length,
      successful,
      failed: criticalAssets.length - successful
    });
    
    return results.map(r => r.status === 'fulfilled' ? r.value : { success: false, error: r.reason });
  }
}

/**
 * Create bundle optimizer instance
 * @param {Object} options - Optimizer options
 * @returns {BundleOptimizer}
 */
export function createBundleOptimizer(options = {}) {
  return new BundleOptimizer(options);
}

// Global optimizer instance
let globalOptimizer = null;

/**
 * Get or create global bundle optimizer
 * @param {Object} options - Optimizer options
 * @returns {BundleOptimizer}
 */
export function getBundleOptimizer(options = {}) {
  if (!globalOptimizer) {
    globalOptimizer = new BundleOptimizer(options);
  }
  return globalOptimizer;
}

/**
 * Reset global bundle optimizer (for testing)
 */
export function resetBundleOptimizer() {
  if (globalOptimizer) {
    globalOptimizer.clearCaches();
  }
  globalOptimizer = null;
}

export default BundleOptimizer;