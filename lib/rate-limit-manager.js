/**
 * GitHub API Rate Limit Manager
 * Handles rate limiting, monitoring, and intelligent request queuing
 */

import { GitHubRateLimitError } from './github-errors.js';

/**
 * Rate limit manager for GitHub API requests
 */
export class RateLimitManager {
  constructor(options = {}) {
    this.options = {
      // Rate limit thresholds
      warningThreshold: options.warningThreshold || 100, // Warn when remaining < 100
      pauseThreshold: options.pauseThreshold || 50,      // Pause when remaining < 50
      
      // Request queuing
      maxQueueSize: options.maxQueueSize || 100,
      queueTimeout: options.queueTimeout || 300000, // 5 minutes
      
      // Monitoring
      enableMonitoring: options.enableMonitoring !== false,
      logLevel: options.logLevel || 'info',
      
      ...options
    };

    // Rate limit state
    this.rateLimit = {
      limit: 5000,
      remaining: 5000,
      reset: Date.now() + 3600000, // 1 hour from now
      used: 0
    };

    // Request queue
    this.requestQueue = [];
    this.isProcessingQueue = false;
    
    // Monitoring
    this.stats = {
      totalRequests: 0,
      queuedRequests: 0,
      rateLimitHits: 0,
      lastReset: Date.now()
    };

    // Event listeners
    this.listeners = {
      rateLimit: [],
      warning: [],
      error: []
    };
  }

  /**
   * Update rate limit information from response headers
   * @param {object} headers - Response headers from GitHub API
   */
  updateRateLimit(headers) {
    if (!headers) return;

    const limit = parseInt(headers['x-ratelimit-limit']);
    const remaining = parseInt(headers['x-ratelimit-remaining']);
    const reset = parseInt(headers['x-ratelimit-reset']);
    const used = parseInt(headers['x-ratelimit-used']);

    if (!isNaN(limit)) this.rateLimit.limit = limit;
    if (!isNaN(remaining)) this.rateLimit.remaining = remaining;
    if (!isNaN(reset)) this.rateLimit.reset = reset * 1000; // Convert to milliseconds
    if (!isNaN(used)) this.rateLimit.used = used;

    this.stats.totalRequests++;

    // Emit warnings if approaching limits
    if (remaining <= this.options.warningThreshold && remaining > this.options.pauseThreshold) {
      this.emit('warning', {
        type: 'approaching_limit',
        remaining,
        reset: new Date(this.rateLimit.reset)
      });
    }

    // Log rate limit status
    if (this.options.enableMonitoring && this.options.logLevel === 'debug') {
      console.log(`Rate limit: ${remaining}/${limit} remaining, resets at ${new Date(this.rateLimit.reset)}`);
    }
  }

  /**
   * Check if request should be allowed immediately
   * @returns {boolean} True if request can proceed
   */
  canMakeRequest() {
    // If we're past the reset time, assume limits have reset
    if (Date.now() > this.rateLimit.reset) {
      this.rateLimit.remaining = this.rateLimit.limit;
      this.rateLimit.used = 0;
      this.stats.lastReset = Date.now();
    }

    return this.rateLimit.remaining > this.options.pauseThreshold;
  }

  /**
   * Get time until rate limit reset
   * @returns {number} Milliseconds until reset
   */
  getTimeUntilReset() {
    return Math.max(0, this.rateLimit.reset - Date.now());
  }

  /**
   * Queue a request for later execution
   * @param {Function} requestFn - Function that makes the API request
   * @param {object} options - Request options
   * @returns {Promise} Promise that resolves when request completes
   */
  async queueRequest(requestFn, options = {}) {
    return new Promise((resolve, reject) => {
      // Check queue size
      if (this.requestQueue.length >= this.options.maxQueueSize) {
        reject(new Error('Request queue is full. Please try again later.'));
        return;
      }

      // Add to queue
      const queueItem = {
        requestFn,
        options,
        resolve,
        reject,
        timestamp: Date.now(),
        timeout: setTimeout(() => {
          this.removeFromQueue(queueItem);
          reject(new Error('Request timed out in queue'));
        }, this.options.queueTimeout)
      };

      this.requestQueue.push(queueItem);
      this.stats.queuedRequests++;

      // Start processing if not already running
      if (!this.isProcessingQueue) {
        this.processQueue();
      }
    });
  }

  /**
   * Process queued requests
   */
  async processQueue() {
    if (this.isProcessingQueue || this.requestQueue.length === 0) {
      return;
    }

    this.isProcessingQueue = true;

    while (this.requestQueue.length > 0) {
      // Check if we can make requests
      if (!this.canMakeRequest()) {
        const waitTime = this.getTimeUntilReset();
        
        if (waitTime > 0) {
          this.emit('rateLimit', {
            type: 'waiting_for_reset',
            waitTime,
            queueLength: this.requestQueue.length
          });

          // Wait for rate limit reset
          await this.sleep(Math.min(waitTime + 1000, 60000)); // Max 1 minute wait
          continue;
        }
      }

      // Process next request
      const queueItem = this.requestQueue.shift();
      if (!queueItem) continue;

      // Clear timeout
      clearTimeout(queueItem.timeout);

      try {
        const result = await queueItem.requestFn();
        queueItem.resolve(result);
      } catch (error) {
        queueItem.reject(error);
      }

      // Small delay between requests to be respectful
      await this.sleep(100);
    }

    this.isProcessingQueue = false;
  }

  /**
   * Execute a request with rate limiting
   * @param {Function} requestFn - Function that makes the API request
   * @param {object} options - Request options
   * @returns {Promise} Promise that resolves with request result
   */
  async executeRequest(requestFn, options = {}) {
    // Check if we can make the request immediately
    if (this.canMakeRequest()) {
      try {
        return await requestFn();
      } catch (error) {
        // If it's a rate limit error, update our state and queue the request
        if (error.status === 403 && error.response?.headers) {
          this.updateRateLimit(error.response.headers);
          this.stats.rateLimitHits++;
          
          // Queue the request for retry
          return this.queueRequest(requestFn, options);
        }
        throw error;
      }
    } else {
      // Queue the request
      return this.queueRequest(requestFn, options);
    }
  }

  /**
   * Remove item from queue
   * @param {object} queueItem - Queue item to remove
   */
  removeFromQueue(queueItem) {
    const index = this.requestQueue.indexOf(queueItem);
    if (index > -1) {
      this.requestQueue.splice(index, 1);
      clearTimeout(queueItem.timeout);
    }
  }

  /**
   * Get current rate limit status
   * @returns {object} Rate limit status
   */
  getStatus() {
    return {
      rateLimit: { ...this.rateLimit },
      queue: {
        length: this.requestQueue.length,
        isProcessing: this.isProcessingQueue
      },
      stats: { ...this.stats },
      timeUntilReset: this.getTimeUntilReset(),
      canMakeRequest: this.canMakeRequest()
    };
  }

  /**
   * Add event listener
   * @param {string} event - Event name
   * @param {Function} listener - Event listener function
   */
  on(event, listener) {
    if (!this.listeners[event]) {
      this.listeners[event] = [];
    }
    this.listeners[event].push(listener);
  }

  /**
   * Remove event listener
   * @param {string} event - Event name
   * @param {Function} listener - Event listener function
   */
  off(event, listener) {
    if (!this.listeners[event]) return;
    
    const index = this.listeners[event].indexOf(listener);
    if (index > -1) {
      this.listeners[event].splice(index, 1);
    }
  }

  /**
   * Emit event
   * @param {string} event - Event name
   * @param {*} data - Event data
   */
  emit(event, data) {
    if (!this.listeners[event]) return;
    
    this.listeners[event].forEach(listener => {
      try {
        listener(data);
      } catch (error) {
        console.error(`Error in rate limit manager event listener:`, error);
      }
    });
  }

  /**
   * Sleep for specified milliseconds
   * @param {number} ms - Milliseconds to sleep
   * @returns {Promise} Promise that resolves after delay
   */
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Reset rate limit state (for testing)
   */
  reset() {
    this.rateLimit = {
      limit: 5000,
      remaining: 5000,
      reset: Date.now() + 3600000,
      used: 0
    };
    
    this.requestQueue = [];
    this.isProcessingQueue = false;
    
    this.stats = {
      totalRequests: 0,
      queuedRequests: 0,
      rateLimitHits: 0,
      lastReset: Date.now()
    };
  }
}

/**
 * Retry mechanism with exponential backoff
 */
export class RetryManager {
  constructor(options = {}) {
    this.options = {
      maxRetries: options.maxRetries || 3,
      baseDelay: options.baseDelay || 1000,
      maxDelay: options.maxDelay || 30000,
      backoffFactor: options.backoffFactor || 2,
      jitterFactor: options.jitterFactor || 0.1,
      retryableErrors: options.retryableErrors || [
        'GitHubRateLimitError',
        'GitHubServerError', 
        'GitHubNetworkError'
      ],
      ...options
    };
  }

  /**
   * Execute function with retry logic
   * @param {Function} fn - Function to execute
   * @param {object} context - Context for error handling
   * @returns {Promise} Promise that resolves with function result
   */
  async execute(fn, context = {}) {
    let lastError;
    
    for (let attempt = 0; attempt <= this.options.maxRetries; attempt++) {
      try {
        return await fn();
      } catch (error) {
        lastError = error;
        
        // Check if error is retryable
        if (!this.isRetryable(error) || attempt === this.options.maxRetries) {
          throw error;
        }

        // Calculate delay
        const delay = this.calculateDelay(error, attempt);
        
        // Log retry attempt
        if (context.logger) {
          context.logger(`Retrying after ${delay}ms (attempt ${attempt + 1}/${this.options.maxRetries}): ${error.message}`);
        }

        // Wait before retry
        await this.sleep(delay);
      }
    }

    throw lastError;
  }

  /**
   * Check if error is retryable
   * @param {Error} error - Error to check
   * @returns {boolean} True if error is retryable
   */
  isRetryable(error) {
    return this.options.retryableErrors.includes(error.name) ||
           this.options.retryableErrors.includes(error.constructor.name);
  }

  /**
   * Calculate retry delay with exponential backoff and jitter
   * @param {Error} error - Error that occurred
   * @param {number} attempt - Current attempt number (0-based)
   * @returns {number} Delay in milliseconds
   */
  calculateDelay(error, attempt) {
    // Special handling for rate limit errors
    if (error.name === 'GitHubRateLimitError' && error.timeUntilReset) {
      return Math.max(1000, error.timeUntilReset + 1000);
    }

    // Exponential backoff
    const exponentialDelay = this.options.baseDelay * Math.pow(this.options.backoffFactor, attempt);
    const cappedDelay = Math.min(exponentialDelay, this.options.maxDelay);
    
    // Add jitter
    const jitter = cappedDelay * this.options.jitterFactor * Math.random();
    
    return Math.floor(cappedDelay + jitter);
  }

  /**
   * Sleep for specified milliseconds
   * @param {number} ms - Milliseconds to sleep
   * @returns {Promise} Promise that resolves after delay
   */
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Global rate limit manager instance
let globalRateLimitManager = null;

/**
 * Get or create global rate limit manager
 * @param {object} options - Rate limit manager options
 * @returns {RateLimitManager} Global rate limit manager instance
 */
export function getRateLimitManager(options = {}) {
  if (!globalRateLimitManager) {
    globalRateLimitManager = new RateLimitManager(options);
  }
  return globalRateLimitManager;
}

/**
 * Reset global rate limit manager (for testing)
 */
export function resetRateLimitManager() {
  globalRateLimitManager = null;
}