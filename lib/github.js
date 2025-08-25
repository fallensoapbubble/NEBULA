/**
 * Enhanced GitHub API Service
 * Integrates rate limiting, caching, and efficient content fetching strategies
 */

import { createGitHubClient } from './github-auth.js';
import { parseGitHubError, isRetryableError } from './github-errors.js';
import { getRateLimitManager, RetryManager } from './rate-limit-manager.js';
import { getGitHubCacheService, GitHubCacheMiddleware } from './github-cache-service.js';
import { logger } from './logger.js';

/**
 * Enhanced GitHub API Service
 */
export class GitHubAPIService {
  constructor(accessToken, options = {}) {
    if (!accessToken) {
      throw new Error('GitHub access token is required');
    }

    this.octokit = createGitHubClient(accessToken);
    this.accessToken = accessToken;
    this.logger = logger.child({ service: 'github-api' });
    
    // Initialize services
    this.rateLimitManager = getRateLimitManager(options.rateLimit);
    this.retryManager = new RetryManager(options.retry);
    this.cacheService = getGitHubCacheService(options.cache);
    this.cacheMiddleware = new GitHubCacheMiddleware(this.cacheService, options.cache);
    
    this.options = {
      // Content fetching options
      maxConcurrentRequests: options.maxConcurrentRequests || 5,
      batchSize: options.batchSize || 10,
      enableParallelFetching: options.enableParallelFetching !== false,
      
      // Caching options
      enableCaching: options.enableCaching !== false,
      enableConditionalRequests: options.enableConditionalRequests !== false,
      fallbackOnError: options.fallbackOnError !== false,
      
      // Content optimization
      enableContentCompression: options.enableContentCompression !== false,
      maxContentSize: options.maxContentSize || 10 * 1024 * 1024, // 10MB
      
      ...options
    };

    // Request queue for batch processing
    this.requestQueue = [];
    this.isProcessingQueue = false;
    
    // Statistics
    this.stats = {
      requests: 0,
      cacheHits: 0,
      cacheMisses: 0,
      rateLimitHits: 0,
      errors: 0,
      bytesTransferred: 0,
      startTime: Date.now()
    };
  }

  /**
   * Get repository information with caching
   * @param {string} owner - Repository owner
   * @param {string} repo - Repository name
   * @param {Object} options - Request options
   * @returns {Promise<Object>} Repository information
   */
  async getRepository(owner, repo, options = {}) {
    const cacheKey = this.cacheMiddleware.createKey(
      `repos/${owner}/${repo}`,
      {},
      this.accessToken
    );

    return this.cacheMiddleware.wrapRequest(
      async (requestOptions = {}) => {
        return this.executeRequest(
          () => this.octokit.rest.repos.get({
            owner,
            repo,
            ...requestOptions
          }),
          `get repository ${owner}/${repo}`
        );
      },
      {
        key: this.options.enableCaching ? cacheKey : null,
        ttl: 600000, // 10 minutes
        enableConditional: this.options.enableConditionalRequests,
        fallbackOnError: this.options.fallbackOnError,
        ...options
      }
    );
  }

  /**
   * Get repository contents with intelligent caching and batching
   * @param {string} owner - Repository owner
   * @param {string} repo - Repository name
   * @param {string} path - File/directory path
   * @param {Object} options - Request options
   * @returns {Promise<Object>} Repository contents
   */
  async getContents(owner, repo, path = '', options = {}) {
    const cacheKey = this.cacheMiddleware.createKey(
      `repos/${owner}/${repo}/contents/${path}`,
      { ref: options.ref },
      this.accessToken
    );

    return this.cacheMiddleware.wrapRequest(
      async (requestOptions = {}) => {
        return this.executeRequest(
          () => this.octokit.rest.repos.getContent({
            owner,
            repo,
            path,
            ref: options.ref,
            ...requestOptions
          }),
          `get contents ${owner}/${repo}/${path}`
        );
      },
      {
        key: this.options.enableCaching ? cacheKey : null,
        ttl: 180000, // 3 minutes
        enableConditional: this.options.enableConditionalRequests,
        fallbackOnError: this.options.fallbackOnError,
        ...options
      }
    );
  }

  /**
   * Get multiple files efficiently with batching and parallel requests
   * @param {string} owner - Repository owner
   * @param {string} repo - Repository name
   * @param {Array<string>} paths - Array of file paths
   * @param {Object} options - Request options
   * @returns {Promise<Array>} Array of file contents
   */
  async getMultipleContents(owner, repo, paths, options = {}) {
    if (!Array.isArray(paths) || paths.length === 0) {
      return [];
    }

    this.logger.info('Fetching multiple contents', {
      owner,
      repo,
      pathCount: paths.length,
      parallel: this.options.enableParallelFetching
    });

    const results = [];
    const errors = [];

    if (this.options.enableParallelFetching && paths.length > 1) {
      // Process in batches to respect rate limits
      const batches = this.createBatches(paths, this.options.batchSize);
      
      for (const batch of batches) {
        const batchPromises = batch.map(async (path) => {
          try {
            const content = await this.getContents(owner, repo, path, options);
            return { path, content, success: true };
          } catch (error) {
            this.logger.warn('Failed to fetch content', {
              owner,
              repo,
              path,
              error: error.message
            });
            return { path, error: error.message, success: false };
          }
        });

        const batchResults = await Promise.allSettled(batchPromises);
        
        batchResults.forEach((result, index) => {
          if (result.status === 'fulfilled') {
            if (result.value.success) {
              results.push(result.value);
            } else {
              errors.push(result.value);
            }
          } else {
            errors.push({
              path: batch[index],
              error: result.reason.message,
              success: false
            });
          }
        });

        // Small delay between batches to be respectful
        if (batches.indexOf(batch) < batches.length - 1) {
          await this.sleep(100);
        }
      }
    } else {
      // Sequential processing
      for (const path of paths) {
        try {
          const content = await this.getContents(owner, repo, path, options);
          results.push({ path, content, success: true });
        } catch (error) {
          errors.push({ path, error: error.message, success: false });
        }
      }
    }

    this.logger.info('Multiple contents fetch completed', {
      owner,
      repo,
      successful: results.length,
      failed: errors.length,
      total: paths.length
    });

    return {
      results,
      errors,
      stats: {
        total: paths.length,
        successful: results.length,
        failed: errors.length,
        successRate: Math.round((results.length / paths.length) * 100)
      }
    };
  }

  /**
   * Get repository tree with efficient traversal
   * @param {string} owner - Repository owner
   * @param {string} repo - Repository name
   * @param {string} treeSha - Tree SHA or branch name
   * @param {Object} options - Request options
   * @returns {Promise<Object>} Repository tree
   */
  async getTree(owner, repo, treeSha, options = {}) {
    const cacheKey = this.cacheMiddleware.createKey(
      `repos/${owner}/${repo}/git/trees/${treeSha}`,
      { recursive: options.recursive },
      this.accessToken
    );

    return this.cacheMiddleware.wrapRequest(
      async (requestOptions = {}) => {
        return this.executeRequest(
          () => this.octokit.rest.git.getTree({
            owner,
            repo,
            tree_sha: treeSha,
            recursive: options.recursive ? 'true' : undefined,
            ...requestOptions
          }),
          `get tree ${owner}/${repo}/${treeSha}`
        );
      },
      {
        key: this.options.enableCaching ? cacheKey : null,
        ttl: 300000, // 5 minutes
        enableConditional: this.options.enableConditionalRequests,
        fallbackOnError: this.options.fallbackOnError,
        ...options
      }
    );
  }

  /**
   * Search repositories with caching
   * @param {string} query - Search query
   * @param {Object} options - Search options
   * @returns {Promise<Object>} Search results
   */
  async searchRepositories(query, options = {}) {
    const cacheKey = this.cacheMiddleware.createKey(
      'search/repositories',
      { q: query, sort: options.sort, order: options.order },
      this.accessToken
    );

    return this.cacheMiddleware.wrapRequest(
      async (requestOptions = {}) => {
        return this.executeRequest(
          () => this.octokit.rest.search.repos({
            q: query,
            sort: options.sort,
            order: options.order,
            per_page: options.per_page || 30,
            page: options.page || 1,
            ...requestOptions
          }),
          `search repositories: ${query}`
        );
      },
      {
        key: this.options.enableCaching ? cacheKey : null,
        ttl: 300000, // 5 minutes
        enableConditional: this.options.enableConditionalRequests,
        ...options
      }
    );
  }

  /**
   * Get user information with caching
   * @param {string} username - GitHub username
   * @param {Object} options - Request options
   * @returns {Promise<Object>} User information
   */
  async getUser(username, options = {}) {
    const endpoint = username ? `users/${username}` : 'user';
    const cacheKey = this.cacheMiddleware.createKey(endpoint, {}, this.accessToken);

    return this.cacheMiddleware.wrapRequest(
      async (requestOptions = {}) => {
        const apiCall = username 
          ? () => this.octokit.rest.users.getByUsername({ username, ...requestOptions })
          : () => this.octokit.rest.users.getAuthenticated(requestOptions);

        return this.executeRequest(apiCall, `get user ${username || 'authenticated'}`);
      },
      {
        key: this.options.enableCaching ? cacheKey : null,
        ttl: 900000, // 15 minutes
        enableConditional: this.options.enableConditionalRequests,
        fallbackOnError: this.options.fallbackOnError,
        ...options
      }
    );
  }

  /**
   * Execute GitHub API request with rate limiting and error handling
   * @private
   */
  async executeRequest(requestFn, operation = 'GitHub API request') {
    this.stats.requests++;

    return this.retryManager.execute(async () => {
      return this.rateLimitManager.executeRequest(async () => {
        try {
          const result = await requestFn();
          
          // Update rate limit information
          if (result.headers) {
            this.rateLimitManager.updateRateLimit(result.headers);
          }

          // Update statistics
          if (result.data) {
            const size = JSON.stringify(result.data).length;
            this.stats.bytesTransferred += size;
          }
          
          return result;
        } catch (error) {
          this.stats.errors++;
          
          // Parse and enhance the error
          const githubError = parseGitHubError(error, operation);
          
          // Update rate limit info if available
          if (error.response?.headers) {
            this.rateLimitManager.updateRateLimit(error.response.headers);
            
            if (error.status === 403) {
              this.stats.rateLimitHits++;
            }
          }
          
          throw githubError;
        }
      });
    }, {
      logger: (message) => this.logger.info(`[${operation}] ${message}`)
    });
  }

  /**
   * Create batches from array
   * @private
   */
  createBatches(items, batchSize) {
    const batches = [];
    for (let i = 0; i < items.length; i += batchSize) {
      batches.push(items.slice(i, i + batchSize));
    }
    return batches;
  }

  /**
   * Sleep for specified milliseconds
   * @private
   */
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Invalidate cache for repository
   * @param {string} owner - Repository owner
   * @param {string} repo - Repository name
   */
  invalidateRepositoryCache(owner, repo) {
    return this.cacheMiddleware.invalidateRepository(owner, repo);
  }

  /**
   * Invalidate cache for user
   * @param {string} username - GitHub username
   */
  invalidateUserCache(username) {
    return this.cacheMiddleware.invalidateUser(username);
  }

  /**
   * Get service statistics
   * @returns {Object} Service statistics
   */
  getStats() {
    const rateLimitStatus = this.rateLimitManager.getStatus();
    const cacheStats = this.cacheService.getStats();
    
    return {
      service: 'github-api',
      uptime: Date.now() - this.stats.startTime,
      requests: this.stats.requests,
      errors: this.stats.errors,
      errorRate: this.stats.requests > 0 ? (this.stats.errors / this.stats.requests) * 100 : 0,
      bytesTransferred: this.stats.bytesTransferred,
      rateLimit: {
        remaining: rateLimitStatus.rateLimit.remaining,
        limit: rateLimitStatus.rateLimit.limit,
        resetTime: new Date(rateLimitStatus.rateLimit.reset).toISOString(),
        queueLength: rateLimitStatus.queue.length
      },
      cache: {
        entries: cacheStats.entries,
        hitRate: cacheStats.hitRate,
        memoryUsageMB: cacheStats.memoryUsageMB
      }
    };
  }

  /**
   * Get health status
   * @returns {Promise<Object>} Health status
   */
  async getHealthStatus() {
    try {
      const user = await this.getUser();
      const stats = this.getStats();
      
      return {
        healthy: true,
        service: 'github-api',
        user: {
          login: user.data.login,
          id: user.data.id
        },
        stats,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      return {
        healthy: false,
        service: 'github-api',
        error: error.message,
        stats: this.getStats(),
        timestamp: new Date().toISOString()
      };
    }
  }
}

/**
 * Create GitHub API service instance
 * @param {string} accessToken - GitHub access token
 * @param {Object} options - Service options
 * @returns {GitHubAPIService}
 */
export function createGitHubAPIService(accessToken, options = {}) {
  return new GitHubAPIService(accessToken, options);
}

export default GitHubAPIService;