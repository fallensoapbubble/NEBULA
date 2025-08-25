/**
 * GitHub API Caching Service
 * Implements intelligent caching for GitHub API requests with TTL, ETags, and conditional requests
 */

import { logger } from './logger.js';

/**
 * Cache entry structure
 */
class CacheEntry {
  constructor(data, options = {}) {
    this.data = data;
    this.timestamp = Date.now();
    this.ttl = options.ttl || 300000; // 5 minutes default
    this.etag = options.etag || null;
    this.lastModified = options.lastModified || null;
    this.size = this.calculateSize(data);
    this.accessCount = 0;
    this.lastAccessed = Date.now();
  }

  /**
   * Check if cache entry is expired
   */
  isExpired() {
    return Date.now() - this.timestamp > this.ttl;
  }

  /**
   * Check if cache entry is stale (needs refresh)
   */
  isStale() {
    const staleThreshold = this.ttl * 0.8; // 80% of TTL
    return Date.now() - this.timestamp > staleThreshold;
  }

  /**
   * Update access statistics
   */
  accessed() {
    this.accessCount++;
    this.lastAccessed = Date.now();
  }

  /**
   * Calculate approximate size of cached data
   */
  calculateSize(data) {
    try {
      return JSON.stringify(data).length * 2; // Approximate UTF-16 encoding
    } catch {
      return 1000; // Default size if calculation fails
    }
  }

  /**
   * Update cache entry with new data
   */
  update(data, options = {}) {
    this.data = data;
    this.timestamp = Date.now();
    this.etag = options.etag || this.etag;
    this.lastModified = options.lastModified || this.lastModified;
    this.size = this.calculateSize(data);
  }
}

/**
 * GitHub API Cache Service
 */
export class GitHubCacheService {
  constructor(options = {}) {
    this.options = {
      // Cache size limits
      maxEntries: options.maxEntries || 1000,
      maxMemoryMB: options.maxMemoryMB || 50,
      
      // TTL settings (in milliseconds)
      defaultTTL: options.defaultTTL || 300000, // 5 minutes
      repositoryTTL: options.repositoryTTL || 600000, // 10 minutes
      contentTTL: options.contentTTL || 180000, // 3 minutes
      userTTL: options.userTTL || 900000, // 15 minutes
      
      // Cache behavior
      enableConditionalRequests: options.enableConditionalRequests !== false,
      enableBackgroundRefresh: options.enableBackgroundRefresh !== false,
      enableCompression: options.enableCompression !== false,
      
      // Cleanup settings
      cleanupInterval: options.cleanupInterval || 300000, // 5 minutes
      maxAge: options.maxAge || 3600000, // 1 hour
      
      ...options
    };

    this.cache = new Map();
    this.logger = logger.child({ service: 'github-cache' });
    
    // Statistics
    this.stats = {
      hits: 0,
      misses: 0,
      sets: 0,
      deletes: 0,
      evictions: 0,
      backgroundRefreshes: 0,
      conditionalRequests: 0,
      startTime: Date.now()
    };

    // Background refresh queue
    this.refreshQueue = new Set();
    this.isRefreshing = false;

    // Start cleanup interval
    this.startCleanupInterval();
  }

  /**
   * Get cached data with conditional request support
   * @param {string} key - Cache key
   * @param {Object} options - Request options
   * @returns {Object|null} Cached data or null if not found/expired
   */
  get(key, options = {}) {
    const entry = this.cache.get(key);
    
    if (!entry) {
      this.stats.misses++;
      return null;
    }

    // Check if expired
    if (entry.isExpired()) {
      this.cache.delete(key);
      this.stats.misses++;
      this.stats.deletes++;
      return null;
    }

    // Update access statistics
    entry.accessed();
    this.stats.hits++;

    // Schedule background refresh if stale
    if (this.options.enableBackgroundRefresh && entry.isStale() && options.refreshFn) {
      this.scheduleBackgroundRefresh(key, options.refreshFn);
    }

    // Return conditional request headers if available
    const result = {
      data: entry.data,
      cached: true,
      timestamp: entry.timestamp,
      age: Date.now() - entry.timestamp
    };

    if (this.options.enableConditionalRequests) {
      if (entry.etag) {
        result.etag = entry.etag;
      }
      if (entry.lastModified) {
        result.lastModified = entry.lastModified;
      }
    }

    return result;
  }

  /**
   * Set cached data
   * @param {string} key - Cache key
   * @param {*} data - Data to cache
   * @param {Object} options - Cache options
   */
  set(key, data, options = {}) {
    // Determine TTL based on key type
    const ttl = this.getTTLForKey(key, options.ttl);
    
    // Create cache entry
    const entry = new CacheEntry(data, {
      ttl,
      etag: options.etag,
      lastModified: options.lastModified
    });

    // Check memory limits before adding
    while (this.shouldEvict(entry) && this.cache.size > 0) {
      this.evictLRU();
    }

    this.cache.set(key, entry);
    this.stats.sets++;

    this.logger.debug('Cache set', {
      key,
      ttl,
      size: entry.size,
      totalEntries: this.cache.size
    });
  }

  /**
   * Update existing cache entry with conditional request result
   * @param {string} key - Cache key
   * @param {Object} response - GitHub API response
   * @returns {Object} Updated cache result
   */
  updateConditional(key, response) {
    const entry = this.cache.get(key);
    
    if (!entry) {
      return null;
    }

    // If response is 304 Not Modified, update timestamp but keep data
    if (response.status === 304) {
      entry.timestamp = Date.now();
      entry.accessed();
      this.stats.conditionalRequests++;
      
      this.logger.debug('Cache refreshed via 304', { key });
      
      return {
        data: entry.data,
        cached: true,
        refreshed: true,
        timestamp: entry.timestamp
      };
    }

    // If response has new data, update the entry
    if (response.data) {
      entry.update(response.data, {
        etag: response.headers?.etag,
        lastModified: response.headers?.['last-modified']
      });
      
      this.logger.debug('Cache updated with new data', { key });
      
      return {
        data: entry.data,
        cached: false,
        updated: true,
        timestamp: entry.timestamp
      };
    }

    return null;
  }

  /**
   * Delete cached entry
   * @param {string} key - Cache key
   */
  delete(key) {
    const deleted = this.cache.delete(key);
    if (deleted) {
      this.stats.deletes++;
    }
    return deleted;
  }

  /**
   * Clear all cached entries
   */
  clear() {
    const size = this.cache.size;
    this.cache.clear();
    this.stats.deletes += size;
    this.logger.info('Cache cleared', { entriesRemoved: size });
  }

  /**
   * Invalidate cache entries by pattern
   * @param {string|RegExp} pattern - Pattern to match keys
   */
  invalidate(pattern) {
    const regex = typeof pattern === 'string' ? new RegExp(pattern) : pattern;
    const keysToDelete = [];

    for (const key of this.cache.keys()) {
      if (regex.test(key)) {
        keysToDelete.push(key);
      }
    }

    keysToDelete.forEach(key => this.delete(key));
    
    this.logger.info('Cache invalidated', {
      pattern: pattern.toString(),
      entriesRemoved: keysToDelete.length
    });

    return keysToDelete.length;
  }

  /**
   * Get cache statistics
   * @returns {Object} Cache statistics
   */
  getStats() {
    const memoryUsage = this.getMemoryUsage();
    const hitRate = this.stats.hits + this.stats.misses > 0 
      ? (this.stats.hits / (this.stats.hits + this.stats.misses)) * 100 
      : 0;

    return {
      entries: this.cache.size,
      memoryUsageMB: memoryUsage.totalMB,
      hitRate: Math.round(hitRate * 100) / 100,
      stats: { ...this.stats },
      uptime: Date.now() - this.stats.startTime,
      refreshQueueSize: this.refreshQueue.size
    };
  }

  /**
   * Get memory usage information
   * @returns {Object} Memory usage details
   */
  getMemoryUsage() {
    let totalSize = 0;
    let largestEntry = 0;
    let oldestEntry = Date.now();

    for (const entry of this.cache.values()) {
      totalSize += entry.size;
      largestEntry = Math.max(largestEntry, entry.size);
      oldestEntry = Math.min(oldestEntry, entry.timestamp);
    }

    return {
      totalBytes: totalSize,
      totalMB: Math.round((totalSize / 1024 / 1024) * 100) / 100,
      averageEntrySize: this.cache.size > 0 ? Math.round(totalSize / this.cache.size) : 0,
      largestEntrySize: largestEntry,
      oldestEntryAge: Date.now() - oldestEntry
    };
  }

  /**
   * Generate cache key for GitHub API requests
   * @param {string} endpoint - API endpoint
   * @param {Object} params - Request parameters
   * @param {string} token - Access token (hashed)
   * @returns {string} Cache key
   */
  generateKey(endpoint, params = {}, token = '') {
    // Create a stable key from endpoint and parameters
    const paramString = Object.keys(params)
      .sort()
      .map(key => `${key}=${params[key]}`)
      .join('&');
    
    // Hash token for privacy (use first 8 chars)
    const tokenHash = token ? token.substring(0, 8) : 'anonymous';
    
    return `github:${endpoint}:${paramString}:${tokenHash}`;
  }

  /**
   * Determine TTL based on cache key type
   * @private
   */
  getTTLForKey(key, customTTL) {
    if (customTTL) return customTTL;

    if (key.includes('repos/') && key.includes('/contents/')) {
      return this.options.contentTTL;
    }
    if (key.includes('repos/')) {
      return this.options.repositoryTTL;
    }
    if (key.includes('user') || key.includes('users/')) {
      return this.options.userTTL;
    }

    return this.options.defaultTTL;
  }

  /**
   * Check if cache should evict entries
   * @private
   */
  shouldEvict(newEntry) {
    if (this.cache.size >= this.options.maxEntries) {
      return true;
    }

    const memoryUsage = this.getMemoryUsage();
    const newMemoryUsage = memoryUsage.totalMB + (newEntry.size / 1024 / 1024);
    
    return newMemoryUsage > this.options.maxMemoryMB;
  }

  /**
   * Evict least recently used entries
   * @private
   */
  evictLRU() {
    if (this.cache.size === 0) return;

    // Find LRU entry
    let lruKey = null;
    let lruTime = Date.now();

    for (const [key, entry] of this.cache.entries()) {
      if (entry.lastAccessed < lruTime) {
        lruTime = entry.lastAccessed;
        lruKey = key;
      }
    }

    if (lruKey) {
      this.cache.delete(lruKey);
      this.stats.evictions++;
      
      this.logger.debug('Cache entry evicted (LRU)', {
        key: lruKey,
        age: Date.now() - lruTime
      });
    }
  }

  /**
   * Schedule background refresh for stale entries
   * @private
   */
  scheduleBackgroundRefresh(key, refreshFn) {
    if (this.refreshQueue.has(key)) {
      return; // Already scheduled
    }

    this.refreshQueue.add(key);
    
    // Process refresh queue if not already processing
    if (!this.isRefreshing) {
      setImmediate(() => this.processRefreshQueue());
    }
  }

  /**
   * Process background refresh queue
   * @private
   */
  async processRefreshQueue() {
    if (this.isRefreshing || this.refreshQueue.size === 0) {
      return;
    }

    this.isRefreshing = true;

    try {
      // Process up to 5 refreshes at a time
      const keysToRefresh = Array.from(this.refreshQueue).slice(0, 5);
      
      for (const key of keysToRefresh) {
        this.refreshQueue.delete(key);
        
        try {
          // Background refresh would be handled by the calling service
          this.stats.backgroundRefreshes++;
          
          this.logger.debug('Background refresh scheduled', { key });
        } catch (error) {
          this.logger.warn('Background refresh failed', {
            key,
            error: error.message
          });
        }
      }
    } finally {
      this.isRefreshing = false;
      
      // Continue processing if more items in queue
      if (this.refreshQueue.size > 0) {
        setTimeout(() => this.processRefreshQueue(), 1000);
      }
    }
  }

  /**
   * Start cleanup interval
   * @private
   */
  startCleanupInterval() {
    setInterval(() => {
      this.cleanup();
    }, this.options.cleanupInterval);
  }

  /**
   * Clean up expired entries
   * @private
   */
  cleanup() {
    const beforeSize = this.cache.size;
    const expiredKeys = [];

    for (const [key, entry] of this.cache.entries()) {
      if (entry.isExpired() || (Date.now() - entry.timestamp > this.options.maxAge)) {
        expiredKeys.push(key);
      }
    }

    expiredKeys.forEach(key => this.cache.delete(key));
    
    if (expiredKeys.length > 0) {
      this.stats.deletes += expiredKeys.length;
      
      this.logger.debug('Cache cleanup completed', {
        entriesRemoved: expiredKeys.length,
        entriesBefore: beforeSize,
        entriesAfter: this.cache.size
      });
    }
  }
}

/**
 * GitHub API Cache Middleware
 * Integrates caching with GitHub API requests
 */
export class GitHubCacheMiddleware {
  constructor(cacheService, options = {}) {
    this.cache = cacheService;
    this.options = {
      enableConditionalRequests: options.enableConditionalRequests !== false,
      enableBackgroundRefresh: options.enableBackgroundRefresh !== false,
      ...options
    };
    this.logger = logger.child({ service: 'github-cache-middleware' });
  }

  /**
   * Wrap GitHub API request with caching
   * @param {Function} requestFn - Function that makes the GitHub API request
   * @param {Object} cacheOptions - Caching options
   * @returns {Promise} Promise that resolves with cached or fresh data
   */
  async wrapRequest(requestFn, cacheOptions = {}) {
    const {
      key,
      ttl,
      skipCache = false,
      enableConditional = this.options.enableConditionalRequests,
      fallbackOnError = false
    } = cacheOptions;

    if (!key || skipCache) {
      const response = await requestFn();
      return response.data || response;
    }

    // Try to get from cache first
    const cached = this.cache.get(key, {
      refreshFn: enableConditional ? requestFn : null
    });

    if (cached && !cached.stale) {
      this.logger.debug('Cache hit', { key, age: cached.age });
      return {
        ...cached.data,
        _cached: true,
        _cacheAge: cached.age
      };
    }

    // Prepare conditional request headers
    const requestOptions = {};
    if (enableConditional && cached) {
      if (cached.etag) {
        requestOptions.headers = {
          ...requestOptions.headers,
          'If-None-Match': cached.etag
        };
      }
      if (cached.lastModified) {
        requestOptions.headers = {
          ...requestOptions.headers,
          'If-Modified-Since': cached.lastModified
        };
      }
    }

    try {
      // Make the API request
      const response = await requestFn(requestOptions);

      // Handle conditional request response
      if (enableConditional && cached && response.status === 304) {
        const updated = this.cache.updateConditional(key, response);
        if (updated) {
          this.logger.debug('Cache refreshed via conditional request', { key });
          return {
            ...updated.data,
            _cached: true,
            _refreshed: true
          };
        }
      }

      // Cache the new response
      if (response.data) {
        this.cache.set(key, response.data, {
          ttl,
          etag: response.headers?.etag,
          lastModified: response.headers?.['last-modified']
        });

        this.logger.debug('Fresh data cached', { key });
        
        return {
          ...response.data,
          _cached: false,
          _fresh: true
        };
      }

      return response;

    } catch (error) {
      // If request fails and we have cached data, return it as fallback
      if (cached && fallbackOnError) {
        this.logger.warn('Request failed, returning cached data as fallback', {
          key,
          error: error.message
        });
        
        return {
          ...cached.data,
          _cached: true,
          _fallback: true,
          _error: error.message
        };
      }

      throw error;
    }
  }

  /**
   * Create cache key for GitHub API endpoint
   * @param {string} endpoint - API endpoint
   * @param {Object} params - Request parameters
   * @param {string} token - Access token
   * @returns {string} Cache key
   */
  createKey(endpoint, params = {}, token = '') {
    return this.cache.generateKey(endpoint, params, token);
  }

  /**
   * Invalidate cache entries for a repository
   * @param {string} owner - Repository owner
   * @param {string} repo - Repository name
   */
  invalidateRepository(owner, repo) {
    const pattern = `github:repos/${owner}/${repo}`;
    return this.cache.invalidate(pattern);
  }

  /**
   * Invalidate cache entries for a user
   * @param {string} username - GitHub username
   */
  invalidateUser(username) {
    const pattern = `github:users/${username}`;
    return this.cache.invalidate(pattern);
  }
}

// Global cache service instance
let globalCacheService = null;

/**
 * Get or create global cache service
 * @param {Object} options - Cache service options
 * @returns {GitHubCacheService} Global cache service instance
 */
export function getGitHubCacheService(options = {}) {
  if (!globalCacheService) {
    globalCacheService = new GitHubCacheService(options);
  }
  return globalCacheService;
}

/**
 * Reset global cache service (for testing)
 */
export function resetGitHubCacheService() {
  if (globalCacheService) {
    globalCacheService.clear();
  }
  globalCacheService = null;
}

export default GitHubCacheService;