import { createGitHubClient } from './github-auth.js';
import { parseGitHubError, isRetryableError, getUserFriendlyMessage } from './github-errors.js';
import { getRateLimitManager, RetryManager } from './rate-limit-manager.js';

/**
 * GitHub Repository Forking Service
 * Handles repository forking operations with validation, error handling, and retry logic
 */
export class ForkService {
  constructor(accessToken, options = {}) {
    if (!accessToken) {
      throw new Error('GitHub access token is required');
    }
    
    this.octokit = createGitHubClient(accessToken);
    this.accessToken = accessToken;
    
    // Initialize rate limiting and retry mechanisms
    this.rateLimitManager = getRateLimitManager(options.rateLimit);
    this.retryManager = new RetryManager(options.retry);
    
    // Configuration options
    this.options = {
      forkTimeout: options.forkTimeout || 30000, // 30 seconds
      maxRetries: options.maxRetries || 3,
      retryDelay: options.retryDelay || 1000,
      ...options
    };
  }

  /**
   * Fork a repository to the authenticated user's account
   * @param {string} templateOwner - Owner of the template repository
   * @param {string} templateRepo - Name of the template repository
   * @param {Object} options - Fork options
   * @param {string} [options.name] - New name for the forked repository
   * @param {string} [options.organization] - Organization to fork to (optional)
   * @param {boolean} [options.defaultBranchOnly] - Fork only the default branch
   * @returns {Promise<{success: boolean, repository?: object, error?: string}>}
   */
  async forkRepository(templateOwner, templateRepo, options = {}) {
    try {
      // Validate input parameters
      const validation = this.validateForkParameters(templateOwner, templateRepo, options);
      if (!validation.valid) {
        return {
          success: false,
          error: validation.error,
          details: { type: 'ValidationError', retryable: false }
        };
      }

      // Check if template repository exists and is accessible
      const templateCheck = await this.verifyTemplateRepository(templateOwner, templateRepo);
      if (!templateCheck.success) {
        return templateCheck;
      }

      // Check if fork already exists
      const existingFork = await this.checkExistingFork(templateOwner, templateRepo, options);
      if (existingFork.exists) {
        return {
          success: false,
          error: `Repository ${existingFork.repository.fullName} already exists`,
          details: { 
            type: 'ForkExistsError', 
            retryable: false,
            existingRepository: existingFork.repository
          }
        };
      }

      // Perform the fork operation
      const forkResult = await this.performFork(templateOwner, templateRepo, options);
      if (!forkResult.success) {
        return forkResult;
      }

      // Wait for fork to be ready and verify
      const verificationResult = await this.waitForForkReady(
        forkResult.repository.owner,
        forkResult.repository.name
      );

      if (!verificationResult.ready) {
        return {
          success: false,
          error: 'Fork creation timed out or failed verification',
          details: {
            type: 'ForkTimeoutError',
            retryable: true,
            repository: forkResult.repository
          }
        };
      }

      return {
        success: true,
        repository: {
          ...forkResult.repository,
          verified: true,
          readyAt: new Date().toISOString()
        }
      };

    } catch (error) {
      return this.handleError(error, 'fork repository');
    }
  }

  /**
   * Validate fork parameters
   * @param {string} templateOwner - Template repository owner
   * @param {string} templateRepo - Template repository name
   * @param {Object} options - Fork options
   * @returns {Object} Validation result
   */
  validateForkParameters(templateOwner, templateRepo, options = {}) {
    if (!templateOwner || typeof templateOwner !== 'string') {
      return { valid: false, error: 'Template owner is required and must be a string' };
    }

    if (!templateRepo || typeof templateRepo !== 'string') {
      return { valid: false, error: 'Template repository name is required and must be a string' };
    }

    // Validate GitHub username/organization format
    const usernameRegex = /^[a-zA-Z0-9]([a-zA-Z0-9-])*[a-zA-Z0-9]$|^[a-zA-Z0-9]$/;
    if (!usernameRegex.test(templateOwner)) {
      return { valid: false, error: 'Invalid template owner format' };
    }

    // Validate repository name format
    const repoRegex = /^[a-zA-Z0-9._-]+$/;
    if (!repoRegex.test(templateRepo)) {
      return { valid: false, error: 'Invalid template repository name format' };
    }

    // Validate optional new name
    if (options.name && !repoRegex.test(options.name)) {
      return { valid: false, error: 'Invalid new repository name format' };
    }

    // Validate organization if provided
    if (options.organization && !usernameRegex.test(options.organization)) {
      return { valid: false, error: 'Invalid organization name format' };
    }

    return { valid: true };
  }

  /**
   * Verify that the template repository exists and is accessible
   * @param {string} templateOwner - Template repository owner
   * @param {string} templateRepo - Template repository name
   * @returns {Promise<{success: boolean, repository?: object, error?: string}>}
   */
  async verifyTemplateRepository(templateOwner, templateRepo) {
    try {
      const { data: repository } = await this.executeWithRetry(
        () => this.octokit.rest.repos.get({
          owner: templateOwner,
          repo: templateRepo
        }),
        `verify template repository ${templateOwner}/${templateRepo}`
      );

      // Check if repository can be forked
      if (repository.archived) {
        return {
          success: false,
          error: 'Cannot fork archived repository',
          details: { type: 'ArchivedRepositoryError', retryable: false }
        };
      }

      if (repository.disabled) {
        return {
          success: false,
          error: 'Cannot fork disabled repository',
          details: { type: 'DisabledRepositoryError', retryable: false }
        };
      }

      return {
        success: true,
        repository: {
          owner: repository.owner.login,
          name: repository.name,
          fullName: repository.full_name,
          private: repository.private,
          fork: repository.fork,
          archived: repository.archived,
          disabled: repository.disabled,
          defaultBranch: repository.default_branch,
          forksCount: repository.forks_count,
          allowForking: repository.allow_forking !== false
        }
      };

    } catch (error) {
      if (error.status === 404) {
        return {
          success: false,
          error: `Template repository ${templateOwner}/${templateRepo} not found or not accessible`,
          details: { type: 'RepositoryNotFoundError', retryable: false }
        };
      }

      if (error.status === 403) {
        return {
          success: false,
          error: `Access denied to template repository ${templateOwner}/${templateRepo}`,
          details: { type: 'AccessDeniedError', retryable: false }
        };
      }

      return this.handleError(error, 'verify template repository');
    }
  }

  /**
   * Check if a fork already exists
   * @param {string} templateOwner - Template repository owner
   * @param {string} templateRepo - Template repository name
   * @param {Object} options - Fork options
   * @returns {Promise<{exists: boolean, repository?: object}>}
   */
  async checkExistingFork(templateOwner, templateRepo, options = {}) {
    try {
      // Get authenticated user info
      const { data: user } = await this.octokit.rest.users.getAuthenticated();
      
      // Determine target owner (user or organization)
      const targetOwner = options.organization || user.login;
      
      // Determine target repository name
      const targetRepo = options.name || templateRepo;

      // Check if repository already exists
      try {
        const { data: existingRepo } = await this.octokit.rest.repos.get({
          owner: targetOwner,
          repo: targetRepo
        });

        return {
          exists: true,
          repository: {
            owner: existingRepo.owner.login,
            name: existingRepo.name,
            fullName: existingRepo.full_name,
            fork: existingRepo.fork,
            parent: existingRepo.parent ? {
              owner: existingRepo.parent.owner.login,
              name: existingRepo.parent.name,
              fullName: existingRepo.parent.full_name
            } : null
          }
        };
      } catch (error) {
        if (error.status === 404) {
          // Repository doesn't exist, which is what we want
          return { exists: false };
        }
        throw error;
      }

    } catch (error) {
      console.error('Error checking existing fork:', error);
      // If we can't check, assume it doesn't exist and let the fork operation handle conflicts
      return { exists: false };
    }
  }

  /**
   * Perform the actual fork operation
   * @param {string} templateOwner - Template repository owner
   * @param {string} templateRepo - Template repository name
   * @param {Object} options - Fork options
   * @returns {Promise<{success: boolean, repository?: object, error?: string}>}
   */
  async performFork(templateOwner, templateRepo, options = {}) {
    try {
      const forkParams = {
        owner: templateOwner,
        repo: templateRepo
      };

      // Add optional parameters
      if (options.name) {
        forkParams.name = options.name;
      }

      if (options.organization) {
        forkParams.organization = options.organization;
      }

      if (options.defaultBranchOnly) {
        forkParams.default_branch_only = true;
      }

      const { data: forkedRepo } = await this.executeWithRetry(
        () => this.octokit.rest.repos.createFork(forkParams),
        `fork repository ${templateOwner}/${templateRepo}`
      );

      return {
        success: true,
        repository: {
          owner: forkedRepo.owner.login,
          name: forkedRepo.name,
          fullName: forkedRepo.full_name,
          url: forkedRepo.html_url,
          cloneUrl: forkedRepo.clone_url,
          sshUrl: forkedRepo.ssh_url,
          defaultBranch: forkedRepo.default_branch,
          private: forkedRepo.private,
          fork: forkedRepo.fork,
          parent: forkedRepo.parent ? {
            owner: forkedRepo.parent.owner.login,
            name: forkedRepo.parent.name,
            fullName: forkedRepo.parent.full_name
          } : null,
          createdAt: forkedRepo.created_at,
          updatedAt: forkedRepo.updated_at,
          pushedAt: forkedRepo.pushed_at
        }
      };

    } catch (error) {
      if (error.status === 403) {
        return {
          success: false,
          error: 'Insufficient permissions to fork repository. Ensure you have the required OAuth scopes.',
          details: { type: 'InsufficientPermissionsError', retryable: false }
        };
      }

      if (error.status === 422) {
        return {
          success: false,
          error: 'Fork already exists or repository cannot be forked',
          details: { type: 'ForkConflictError', retryable: false }
        };
      }

      return this.handleError(error, 'perform fork');
    }
  }

  /**
   * Wait for fork to be ready and accessible
   * @param {string} owner - Fork owner
   * @param {string} repo - Fork repository name
   * @param {number} [timeout] - Timeout in milliseconds
   * @returns {Promise<{ready: boolean, repository?: object, error?: string}>}
   */
  async waitForForkReady(owner, repo, timeout = this.options.forkTimeout) {
    const startTime = Date.now();
    const checkInterval = 2000; // Check every 2 seconds
    
    while (Date.now() - startTime < timeout) {
      try {
        const { data: repository } = await this.octokit.rest.repos.get({
          owner,
          repo
        });

        // Check if repository is fully initialized
        if (repository && !repository.empty) {
          return {
            ready: true,
            repository: {
              owner: repository.owner.login,
              name: repository.name,
              fullName: repository.full_name,
              defaultBranch: repository.default_branch,
              fork: repository.fork,
              empty: repository.empty,
              size: repository.size
            }
          };
        }

        // Wait before next check
        await new Promise(resolve => setTimeout(resolve, checkInterval));

      } catch (error) {
        if (error.status === 404) {
          // Repository not yet available, continue waiting
          await new Promise(resolve => setTimeout(resolve, checkInterval));
          continue;
        }

        // Other errors should be reported
        return {
          ready: false,
          error: `Error checking fork readiness: ${error.message}`
        };
      }
    }

    return {
      ready: false,
      error: 'Fork readiness check timed out'
    };
  }

  /**
   * Verify that a fork was created successfully
   * @param {string} owner - Repository owner
   * @param {string} repo - Repository name
   * @param {string} [expectedParent] - Expected parent repository full name
   * @returns {Promise<{verified: boolean, repository?: object, error?: string}>}
   */
  async verifyFork(owner, repo, expectedParent = null) {
    try {
      const { data: repository } = await this.executeWithRetry(
        () => this.octokit.rest.repos.get({ owner, repo }),
        `verify fork ${owner}/${repo}`
      );

      // Verify it's actually a fork
      if (!repository.fork) {
        return {
          verified: false,
          error: 'Repository exists but is not a fork'
        };
      }

      // Verify parent if specified
      if (expectedParent && repository.parent) {
        const parentFullName = repository.parent.full_name;
        if (parentFullName !== expectedParent) {
          return {
            verified: false,
            error: `Fork parent mismatch. Expected: ${expectedParent}, Actual: ${parentFullName}`
          };
        }
      }

      return {
        verified: true,
        repository: {
          owner: repository.owner.login,
          name: repository.name,
          fullName: repository.full_name,
          fork: repository.fork,
          parent: repository.parent ? {
            owner: repository.parent.owner.login,
            name: repository.parent.name,
            fullName: repository.parent.full_name
          } : null,
          defaultBranch: repository.default_branch,
          private: repository.private,
          empty: repository.empty,
          size: repository.size,
          createdAt: repository.created_at,
          updatedAt: repository.updated_at
        }
      };

    } catch (error) {
      if (error.status === 404) {
        return {
          verified: false,
          error: 'Forked repository not found'
        };
      }

      return this.handleError(error, 'verify fork');
    }
  }

  /**
   * Get fork status and information
   * @param {string} owner - Repository owner
   * @param {string} repo - Repository name
   * @returns {Promise<{success: boolean, status?: object, error?: string}>}
   */
  async getForkStatus(owner, repo) {
    try {
      const { data: repository } = await this.executeWithRetry(
        () => this.octokit.rest.repos.get({ owner, repo }),
        `get fork status ${owner}/${repo}`
      );

      const status = {
        exists: true,
        fork: repository.fork,
        owner: repository.owner.login,
        name: repository.name,
        fullName: repository.full_name,
        private: repository.private,
        empty: repository.empty,
        size: repository.size,
        defaultBranch: repository.default_branch,
        createdAt: repository.created_at,
        updatedAt: repository.updated_at,
        pushedAt: repository.pushed_at
      };

      if (repository.fork && repository.parent) {
        status.parent = {
          owner: repository.parent.owner.login,
          name: repository.parent.name,
          fullName: repository.parent.full_name
        };

        // Check if fork is up to date with parent
        try {
          const comparison = await this.octokit.rest.repos.compareCommits({
            owner: repository.parent.owner.login,
            repo: repository.parent.name,
            base: repository.default_branch,
            head: `${owner}:${repository.default_branch}`
          });

          status.syncStatus = {
            aheadBy: comparison.data.ahead_by,
            behindBy: comparison.data.behind_by,
            upToDate: comparison.data.ahead_by === 0 && comparison.data.behind_by === 0,
            diverged: comparison.data.ahead_by > 0 && comparison.data.behind_by > 0
          };
        } catch (syncError) {
          console.warn('Could not check fork sync status:', syncError.message);
          status.syncStatus = { error: 'Could not determine sync status' };
        }
      }

      return {
        success: true,
        status
      };

    } catch (error) {
      if (error.status === 404) {
        return {
          success: true,
          status: { exists: false }
        };
      }

      return this.handleError(error, 'get fork status');
    }
  }

  /**
   * Execute GitHub API request with rate limiting and retry logic
   * @param {Function} requestFn - Function that makes the API request
   * @param {string} operation - Description of the operation for logging
   * @returns {Promise} Promise that resolves with request result
   */
  async executeWithRetry(requestFn, operation = 'GitHub API request') {
    return this.retryManager.execute(async () => {
      return this.rateLimitManager.executeRequest(async () => {
        try {
          const result = await requestFn();
          
          // Update rate limit information from response headers
          if (result.headers) {
            this.rateLimitManager.updateRateLimit(result.headers);
          }
          
          return result;
        } catch (error) {
          // Parse and enhance the error
          const githubError = parseGitHubError(error, operation);
          
          // Update rate limit info if available
          if (error.response?.headers) {
            this.rateLimitManager.updateRateLimit(error.response.headers);
          }
          
          throw githubError;
        }
      });
    }, {
      logger: (message) => console.log(`[${operation}] ${message}`)
    });
  }

  /**
   * Handle GitHub API errors and return user-friendly response
   * @param {Error} error - Error from GitHub API
   * @param {string} operation - Description of the failed operation
   * @returns {object} Error response object
   */
  handleError(error, operation) {
    const userMessage = getUserFriendlyMessage(error);
    const isRetryable = isRetryableError(error);
    
    console.error(`GitHub API error in ${operation}:`, error);
    
    return {
      success: false,
      error: userMessage,
      details: {
        type: error.name,
        status: error.status,
        retryable: isRetryable,
        timestamp: error.timestamp || new Date().toISOString()
      }
    };
  }

  /**
   * Get current rate limit status
   * @returns {object} Rate limit status information
   */
  getRateLimitStatus() {
    return this.rateLimitManager.getStatus();
  }
}

/**
 * Create a new ForkService instance
 * @param {string} accessToken - GitHub access token
 * @param {Object} [options] - Service options
 * @returns {ForkService} ForkService instance
 */
export function createForkService(accessToken, options = {}) {
  return new ForkService(accessToken, options);
}

/**
 * Fork a repository with simplified interface
 * @param {string} accessToken - GitHub access token
 * @param {string} templateOwner - Template repository owner
 * @param {string} templateRepo - Template repository name
 * @param {Object} [options] - Fork options
 * @returns {Promise<{success: boolean, repository?: object, error?: string}>}
 */
export async function forkRepository(accessToken, templateOwner, templateRepo, options = {}) {
  const forkService = createForkService(accessToken, options);
  return forkService.forkRepository(templateOwner, templateRepo, options);
}