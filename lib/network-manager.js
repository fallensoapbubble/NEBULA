/**
 * Network Manager
 * Handles network connectivity detection, offline caching, and request retry logic
 */

'use client';

import React, { useState, useEffect } from 'react';
import { createLogger } from './logger.js';
import { ErrorHandler, NetworkError } from './errors.js';

const logger = createLogger('NetworkManager');

/**
 * Network status types
 */
export const NETWORK_STATUS = {
  ONLINE: 'online',
  OFFLINE: 'offline',
  SLOW: 'slow',
  UNKNOWN: 'unknown'
};

/**
 * Cache storage types
 */
export const CACHE_TYPES = {
  MEMORY: 'memory',
  LOCAL_STORAGE: 'localStorage',
  SESSION_STORAGE: 'sessionStorage',
  INDEXED_DB: 'indexedDB'
};

/**
 * Network Manager Class
 */
export class NetworkManager {
  constructor(options = {}) {
    this.options = {
      retryAttempts: 3,
      retryDelay: 1000,
      timeoutDuration: 10000,
      slowConnectionThreshold: 2000,
      cacheType: CACHE_TYPES.LOCAL_STORAGE,
      enableOfflineCache: true,
      enableRetry: true,
      maxCacheSize: 50 * 1024 * 1024, // 50MB
      maxCacheAge: 24 * 60 * 60 * 1000, // 24 hours
      ...options
    };

    this.networkStatus = NETWORK_STATUS.UNKNOWN;
    this.listeners = new Set();
    this.cache = new Map();
    this.requestQueue = [];
    this.isProcessingQueue = false;
    this.failedRequests = new Map();

    this.initializeNetworkDetection();
    this.initializeCache();
    this.startCacheCleanup();
  }

  /**
   * Initialize network connectivity detection
   */
  initializeNetworkDetection() {
    if (typeof window === 'undefined') return;

    // Initial status
    this.networkStatus = navigator.onLine ? NETWORK_STATUS.ONLINE : NETWORK_STATUS.OFFLINE;

    // Listen for online/offline events
    window.addEventListener('online', () => {
      this.updateNetworkStatus(NETWORK_STATUS.ONLINE);
      this.processQueuedRequests();
    });

    window.addEventListener('offline', () => {
      this.updateNetworkStatus(NETWORK_STATUS.OFFLINE);
    });

    // Periodic connectivity check
    this.startConnectivityCheck();
  }

  /**
   * Initialize cache system
   */
  initializeCache() {
    if (!this.options.enableOfflineCache) return;

    try {
      // Load existing cache from storage
      if (typeof window !== 'undefined' && this.options.cacheType === CACHE_TYPES.LOCAL_STORAGE) {
        const cachedData = localStorage.getItem('nebula_network_cache');
        if (cachedData) {
          const parsed = JSON.parse(cachedData);
          this.cache = new Map(parsed);
        }
      }
    } catch (error) {
      logger.warn('Failed to load cache from storage', error);
    }
  }

  /**
   * Start periodic connectivity check
   */
  startConnectivityCheck() {
    if (typeof window === 'undefined') return;

    setInterval(async () => {
      try {
        const startTime = Date.now();
        
        // Try to fetch a small resource to test connectivity
        const response = await fetch('/api/health', {
          method: 'HEAD',
          cache: 'no-cache',
          signal: AbortSignal.timeout(5000)
        });

        const responseTime = Date.now() - startTime;
        
        if (response.ok) {
          const newStatus = responseTime > this.options.slowConnectionThreshold 
            ? NETWORK_STATUS.SLOW 
            : NETWORK_STATUS.ONLINE;
          
          this.updateNetworkStatus(newStatus);
        } else {
          this.updateNetworkStatus(NETWORK_STATUS.OFFLINE);
        }
      } catch (error) {
        this.updateNetworkStatus(NETWORK_STATUS.OFFLINE);
      }
    }, 30000); // Check every 30 seconds
  }

  /**
   * Update network status and notify listeners
   */
  updateNetworkStatus(status) {
    if (this.networkStatus !== status) {
      const previousStatus = this.networkStatus;
      this.networkStatus = status;
      
      logger.info(`Network status changed: ${previousStatus} -> ${status}`);
      
      // Notify listeners
      this.listeners.forEach(listener => {
        try {
          listener(status, previousStatus);
        } catch (error) {
          logger.error('Error in network status listener', error);
        }
      });
    }
  }

  /**
   * Add network status listener
   */
  addStatusListener(listener) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  /**
   * Get current network status
   */
  getNetworkStatus() {
    return this.networkStatus;
  }

  /**
   * Check if currently online
   */
  isOnline() {
    return this.networkStatus === NETWORK_STATUS.ONLINE || this.networkStatus === NETWORK_STATUS.SLOW;
  }

  /**
   * Enhanced fetch with retry logic and caching
   */
  async fetch(url, options = {}) {
    const requestConfig = {
      timeout: this.options.timeoutDuration,
      retryAttempts: this.options.retryAttempts,
      retryDelay: this.options.retryDelay,
      useCache: true,
      cacheKey: null,
      ...options
    };

    const cacheKey = requestConfig.cacheKey || this.generateCacheKey(url, options);

    // Try cache first if offline or cache is requested
    if (requestConfig.useCache && (!this.isOnline() || options.preferCache)) {
      const cachedResponse = this.getFromCache(cacheKey);
      if (cachedResponse) {
        logger.info(`Serving cached response for ${url}`);
        return cachedResponse;
      }
    }

    // If offline and no cache, queue the request
    if (!this.isOnline()) {
      return this.queueRequest(url, options, cacheKey);
    }

    // Attempt the request with retry logic
    return this.attemptRequest(url, options, requestConfig, cacheKey);
  }

  /**
   * Attempt request with retry logic
   */
  async attemptRequest(url, options, config, cacheKey) {
    let lastError;

    for (let attempt = 0; attempt <= config.retryAttempts; attempt++) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), config.timeout);

        const response = await fetch(url, {
          ...options,
          signal: controller.signal
        });

        clearTimeout(timeoutId);

        // Cache successful responses
        if (response.ok && config.useCache) {
          this.saveToCache(cacheKey, response.clone());
        }

        return response;

      } catch (error) {
        lastError = error;
        
        // Don't retry on certain errors
        if (error.name === 'AbortError') {
          throw new NetworkError('Request timed out', error);
        }

        if (attempt < config.retryAttempts) {
          const delay = config.retryDelay * Math.pow(2, attempt); // Exponential backoff
          logger.warn(`Request failed, retrying in ${delay}ms (attempt ${attempt + 1}/${config.retryAttempts + 1})`, error);
          await this.delay(delay);
        }
      }
    }

    // All attempts failed
    const networkError = new NetworkError(
      `Request failed after ${config.retryAttempts + 1} attempts: ${lastError.message}`,
      lastError
    );

    throw ErrorHandler.handleError(networkError, {
      source: 'network_manager',
      url,
      attempts: config.retryAttempts + 1
    });
  }

  /**
   * Queue request for when network comes back online
   */
  async queueRequest(url, options, cacheKey) {
    return new Promise((resolve, reject) => {
      this.requestQueue.push({
        url,
        options,
        cacheKey,
        resolve,
        reject,
        timestamp: Date.now()
      });

      logger.info(`Queued request for ${url} (queue size: ${this.requestQueue.length})`);
    });
  }

  /**
   * Process queued requests when network comes back online
   */
  async processQueuedRequests() {
    if (this.isProcessingQueue || this.requestQueue.length === 0) return;

    this.isProcessingQueue = true;
    logger.info(`Processing ${this.requestQueue.length} queued requests`);

    const queue = [...this.requestQueue];
    this.requestQueue = [];

    for (const request of queue) {
      try {
        const response = await this.attemptRequest(
          request.url,
          request.options,
          {
            timeout: this.options.timeoutDuration,
            retryAttempts: this.options.retryAttempts,
            retryDelay: this.options.retryDelay,
            useCache: true
          },
          request.cacheKey
        );
        request.resolve(response);
      } catch (error) {
        request.reject(error);
      }
    }

    this.isProcessingQueue = false;
  }

  /**
   * Generate cache key for request
   */
  generateCacheKey(url, options = {}) {
    const method = options.method || 'GET';
    const body = options.body ? JSON.stringify(options.body) : '';
    return `${method}:${url}:${btoa(body).slice(0, 10)}`;
  }

  /**
   * Save response to cache
   */
  async saveToCache(key, response) {
    if (!this.options.enableOfflineCache) return;

    try {
      const data = {
        status: response.status,
        statusText: response.statusText,
        headers: Object.fromEntries(response.headers.entries()),
        body: await response.text(),
        timestamp: Date.now()
      };

      this.cache.set(key, data);
      this.persistCache();
      
      logger.debug(`Cached response for key: ${key}`);
    } catch (error) {
      logger.warn('Failed to cache response', error);
    }
  }

  /**
   * Get response from cache
   */
  getFromCache(key) {
    if (!this.options.enableOfflineCache) return null;

    const cached = this.cache.get(key);
    if (!cached) return null;

    // Check if cache is expired (24 hours)
    const maxAge = 24 * 60 * 60 * 1000;
    if (Date.now() - cached.timestamp > maxAge) {
      this.cache.delete(key);
      return null;
    }

    // Create a Response object from cached data
    return new Response(cached.body, {
      status: cached.status,
      statusText: cached.statusText,
      headers: cached.headers
    });
  }

  /**
   * Persist cache to storage
   */
  persistCache() {
    if (typeof window === 'undefined' || this.options.cacheType !== CACHE_TYPES.LOCAL_STORAGE) return;

    try {
      const cacheArray = Array.from(this.cache.entries());
      localStorage.setItem('nebula_network_cache', JSON.stringify(cacheArray));
    } catch (error) {
      logger.warn('Failed to persist cache', error);
    }
  }

  /**
   * Clear cache
   */
  clearCache() {
    this.cache.clear();
    
    if (typeof window !== 'undefined' && this.options.cacheType === CACHE_TYPES.LOCAL_STORAGE) {
      localStorage.removeItem('nebula_network_cache');
    }
    
    logger.info('Cache cleared');
  }

  /**
   * Get cache statistics
   */
  getCacheStats() {
    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys()),
      totalSize: JSON.stringify(Array.from(this.cache.entries())).length
    };
  }

  /**
   * Utility delay function
   */
  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Start periodic cache cleanup
   */
  startCacheCleanup() {
    if (typeof window === 'undefined') return;

    // Clean up cache every hour
    setInterval(() => {
      this.cleanupCache();
    }, 60 * 60 * 1000);
  }

  /**
   * Clean up expired cache entries
   */
  cleanupCache() {
    const now = Date.now();
    let removedCount = 0;

    for (const [key, data] of this.cache.entries()) {
      if (now - data.timestamp > this.options.maxCacheAge) {
        this.cache.delete(key);
        removedCount++;
      }
    }

    if (removedCount > 0) {
      logger.info(`Cleaned up ${removedCount} expired cache entries`);
      this.persistCache();
    }

    // Check cache size and remove oldest entries if needed
    this.enforceCacheSize();
  }

  /**
   * Enforce maximum cache size
   */
  enforceCacheSize() {
    const cacheSize = JSON.stringify(Array.from(this.cache.entries())).length;
    
    if (cacheSize > this.options.maxCacheSize) {
      // Sort by timestamp and remove oldest entries
      const entries = Array.from(this.cache.entries())
        .sort((a, b) => a[1].timestamp - b[1].timestamp);
      
      let currentSize = cacheSize;
      let removedCount = 0;
      
      while (currentSize > this.options.maxCacheSize * 0.8 && entries.length > 0) {
        const [key] = entries.shift();
        this.cache.delete(key);
        removedCount++;
        currentSize = JSON.stringify(Array.from(this.cache.entries())).length;
      }
      
      if (removedCount > 0) {
        logger.info(`Removed ${removedCount} cache entries to enforce size limit`);
        this.persistCache();
      }
    }
  }

  /**
   * Store failed request for retry
   */
  storeFailedRequest(request, error) {
    const id = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    this.failedRequests.set(id, {
      id,
      url: request.url,
      options: {
        method: request.method,
        headers: Object.fromEntries(request.headers.entries()),
        body: request.body
      },
      error: error.message,
      timestamp: Date.now(),
      retryCount: 0
    });
    
    logger.info(`Stored failed request for retry: ${request.url}`);
  }

  /**
   * Get failed requests
   */
  getFailedRequests() {
    return Array.from(this.failedRequests.values());
  }

  /**
   * Remove failed request
   */
  removeFailedRequest(id) {
    return this.failedRequests.delete(id);
  }

  /**
   * Retry all failed requests
   */
  async retryFailedRequests() {
    const failedRequests = this.getFailedRequests();
    const results = [];

    for (const request of failedRequests) {
      try {
        const response = await this.attemptRequest(
          request.url,
          request.options,
          {
            timeout: this.options.timeoutDuration,
            retryAttempts: 1, // Only one retry attempt for failed requests
            retryDelay: this.options.retryDelay,
            useCache: true
          },
          this.generateCacheKey(request.url, request.options)
        );

        this.removeFailedRequest(request.id);
        results.push({ success: true, request, response });
        
        logger.info(`Successfully retried failed request: ${request.url}`);
      } catch (error) {
        request.retryCount++;
        results.push({ success: false, request, error });
        
        // Remove request if it has been retried too many times
        if (request.retryCount >= 3) {
          this.removeFailedRequest(request.id);
          logger.warn(`Giving up on failed request after 3 retries: ${request.url}`);
        }
      }
    }

    return results;
  }

  /**
   * Get network statistics
   */
  getNetworkStats() {
    return {
      status: this.networkStatus,
      isOnline: this.isOnline(),
      cache: {
        size: this.cache.size,
        totalSize: JSON.stringify(Array.from(this.cache.entries())).length,
        maxSize: this.options.maxCacheSize
      },
      queue: {
        size: this.requestQueue.length,
        isProcessing: this.isProcessingQueue
      },
      failedRequests: {
        count: this.failedRequests.size,
        requests: this.getFailedRequests()
      }
    };
  }

  /**
   * Cleanup resources
   */
  destroy() {
    this.listeners.clear();
    this.requestQueue = [];
    this.failedRequests.clear();
    this.clearCache();
  }
}

/**
 * Global network manager instance
 */
export const networkManager = new NetworkManager();

/**
 * Enhanced fetch function with network management
 */
export async function enhancedFetch(url, options = {}) {
  return networkManager.fetch(url, options);
}

/**
 * Graceful degradation handler for service unavailability
 */
export class GracefulDegradationManager {
  constructor() {
    this.fallbackStrategies = new Map();
    this.serviceStatus = new Map();
  }

  /**
   * Register fallback strategy for a service
   */
  registerFallback(serviceName, strategy) {
    this.fallbackStrategies.set(serviceName, strategy);
  }

  /**
   * Execute request with graceful degradation
   */
  async executeWithFallback(serviceName, primaryAction, fallbackData = null) {
    try {
      // Try primary action first
      const result = await primaryAction();
      this.serviceStatus.set(serviceName, { status: 'healthy', lastCheck: Date.now() });
      return result;
    } catch (error) {
      logger.warn(`Service ${serviceName} failed, attempting graceful degradation`, error);
      
      // Mark service as unhealthy
      this.serviceStatus.set(serviceName, { 
        status: 'unhealthy', 
        lastCheck: Date.now(),
        error: error.message 
      });

      // Try fallback strategy
      const fallbackStrategy = this.fallbackStrategies.get(serviceName);
      if (fallbackStrategy) {
        try {
          return await fallbackStrategy(error, fallbackData);
        } catch (fallbackError) {
          logger.error(`Fallback strategy failed for ${serviceName}`, fallbackError);
          throw fallbackError;
        }
      }

      // No fallback available
      throw error;
    }
  }

  /**
   * Get service health status
   */
  getServiceStatus(serviceName) {
    return this.serviceStatus.get(serviceName) || { status: 'unknown' };
  }

  /**
   * Get all service statuses
   */
  getAllServiceStatuses() {
    return Object.fromEntries(this.serviceStatus.entries());
  }
}

// Global graceful degradation manager
export const gracefulDegradationManager = new GracefulDegradationManager();

// Register common fallback strategies
gracefulDegradationManager.registerFallback('github-api', async (error, fallbackData) => {
  // Try to serve cached data for GitHub API failures
  const cachedResponse = await networkManager.getFromCache(`github-api:${fallbackData?.url || 'unknown'}`);
  if (cachedResponse) {
    logger.info('Serving cached GitHub API response');
    return cachedResponse;
  }
  
  // Return minimal fallback data
  return {
    error: 'GitHub API unavailable',
    message: 'Service temporarily unavailable. Please try again later.',
    cached: false,
    fallback: true
  };
});

gracefulDegradationManager.registerFallback('template-gallery', async (error, fallbackData) => {
  // Return cached templates or basic template list
  return {
    templates: fallbackData?.cachedTemplates || [],
    error: 'Template gallery temporarily unavailable',
    fallback: true
  };
});

gracefulDegradationManager.registerFallback('portfolio-rendering', async (error, fallbackData) => {
  // Return cached portfolio or offline message
  return {
    content: fallbackData?.cachedContent || null,
    error: 'Portfolio temporarily unavailable',
    offline: true,
    fallback: true
  };
});

/**
 * React hook for network status
 */
export function useNetworkStatus() {
  const [status, setStatus] = useState(networkManager.getNetworkStatus());
  const [isOnline, setIsOnline] = useState(networkManager.isOnline());

  useEffect(() => {
    const unsubscribe = networkManager.addStatusListener((newStatus) => {
      setStatus(newStatus);
      setIsOnline(networkManager.isOnline());
    });

    return unsubscribe;
  }, []);

  return {
    status,
    isOnline,
    isOffline: !isOnline,
    isSlow: status === NETWORK_STATUS.SLOW
  };
}

// Initialize network manager on import
if (typeof window !== 'undefined') {
  // Browser-specific initialization
  logger.info('Network manager initialized for browser environment');
}