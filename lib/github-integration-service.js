/**
 * GitHub Integration Service
 * Enhanced GitHub API integration for content persistence with advanced commit and push operations
 */

import { createGitHubClient } from './github-auth.js';
import { parseGitHubError, isRetryableError, getUserFriendlyMessage } from './github-errors.js';
import { getRateLimitManager, RetryManager } from './rate-limit-manager.js';
import { logger } from './logger.js';

/**
 * GitHub Integration Service class
 */
export class GitHubIntegrationService {
  constructor(accessToken, options = {}) {
    if (!accessToken) {
      throw new Error('GitHub access token is required');
    }

    this.octokit = createGitHubClient(accessToken);
    this.accessToken = accessToken;
    this.logger = logger.child({ service: 'github-integration' });
    
    // Initialize rate limiting and retry mechanisms
    this.rateLimitManager = getRateLimitManager(options.rateLimit);
    this.retryManager = new RetryManager(options.retry);
    
    this.options = {
      defaultBranch: options.defaultBranch || 'main',
      commitAuthor: options.commitAuthor || null,
      enableSignedCommits: options.enableSignedCommits || false,
      maxFileSize: options.maxFileSize || 100 * 1024 * 1024, // 100MB
      ...options
    };

    // Set up rate limit monitoring
    this.setupRateLimitMonitoring();
  }

  /**
   * Create a comprehensive commit with multiple file changes and proper messaging
   * @param {string} owner - Repository owner
   * @param {string} repo - Repository name
   * @param {Array} changes - Array of file changes
   * @param {string} message - Commit message
   * @param {Object} options - Commit options
   * @returns {Promise<CommitResult>}
   */
  async createCommitWithChanges(owner, repo, changes, message, options = {}) {
    const commitOptions = {
      branch: options.branch || this.options.defaultBranch,
      author: options.author || this.options.commitAuthor,
      enableSigning: options.enableSigning || this.options.enableSignedCommits,
      validateChanges: options.validateChanges !== false,
      createBackup: options.createBackup !== false,
      ...options
    };

    this.logger.info('Creating commit with changes', {
      owner,
      repo,
      branch: commitOptions.branch,
      changeCount: changes.length,
      message: message.substring(0, 100)
    });

    try {
      // Step 1: Validate changes
      if (commitOptions.validateChanges) {
        const validationResult = this.validateFileChanges(changes);
        if (!validationResult.isValid) {
          return {
            success: false,
            error: 'File changes validation failed',
            details: {
              type: 'validation_error',
              errors: validationResult.errors
            }
          };
        }
      }

      // Step 2: Get current branch reference
      const branchRef = await this.getBranchReference(owner, repo, commitOptions.branch);
      if (!branchRef.success) {
        return {
          success: false,
          error: branchRef.error,
          details: branchRef.details
        };
      }

      // Step 3: Get current commit and tree
      const currentCommit = await this.getCommit(owner, repo, branchRef.sha);
      if (!currentCommit.success) {
        return {
          success: false,
          error: currentCommit.error,
          details: currentCommit.details
        };
      }

      // Step 4: Create backup if enabled
      if (commitOptions.createBackup) {
        await this.createCommitBackup(owner, repo, branchRef.sha, message);
      }

      // Step 5: Create blobs for file content
      const blobResults = await this.createBlobsForChanges(owner, repo, changes);
      if (!blobResults.success) {
        return {
          success: false,
          error: blobResults.error,
          details: blobResults.details
        };
      }

      // Step 6: Create new tree with changes
      const treeResult = await this.createTreeWithChanges(
        owner,
        repo,
        currentCommit.treeSha,
        changes,
        blobResults.blobs
      );
      if (!treeResult.success) {
        return {
          success: false,
          error: treeResult.error,
          details: treeResult.details
        };
      }

      // Step 7: Create commit
      const commitResult = await this.createCommit(
        owner,
        repo,
        message,
        treeResult.treeSha,
        [branchRef.sha],
        commitOptions.author
      );
      if (!commitResult.success) {
        return {
          success: false,
          error: commitResult.error,
          details: commitResult.details
        };
      }

      // Step 8: Update branch reference
      const updateResult = await this.updateBranchReference(
        owner,
        repo,
        commitOptions.branch,
        commitResult.commitSha
      );
      if (!updateResult.success) {
        return {
          success: false,
          error: updateResult.error,
          details: updateResult.details
        };
      }

      this.logger.info('Commit created successfully', {
        owner,
        repo,
        branch: commitOptions.branch,
        commitSha: commitResult.commitSha,
        filesChanged: changes.length
      });

      return {
        success: true,
        commit: {
          sha: commitResult.commitSha,
          message: message,
          author: commitResult.author,
          committer: commitResult.committer,
          url: commitResult.url,
          tree: {
            sha: treeResult.treeSha,
            url: treeResult.url
          },
          parents: [branchRef.sha],
          filesChanged: changes.length,
          timestamp: new Date().toISOString()
        },
        branch: {
          name: commitOptions.branch,
          sha: commitResult.commitSha
        },
        changes: changes.map(change => ({
          path: change.path,
          operation: change.operation,
          size: change.content ? change.content.length : 0
        }))
      };

    } catch (error) {
      this.logger.error('Commit creation failed', {
        owner,
        repo,
        error: error.message,
        stack: error.stack
      });

      return {
        success: false,
        error: `Commit creation failed: ${error.message}`,
        details: {
          type: 'commit_error',
          originalError: error.message,
          retryable: isRetryableError(error)
        }
      };
    }
  }

  /**
   * Push changes to repository with comprehensive feedback
   * @param {string} owner - Repository owner
   * @param {string} repo - Repository name
   * @param {Array} changes - Array of file changes
   * @param {string} commitMessage - Commit message
   * @param {Object} options - Push options
   * @returns {Promise<PushResult>}
   */
  async pushChanges(owner, repo, changes, commitMessage, options = {}) {
    const pushOptions = {
      branch: options.branch || this.options.defaultBranch,
      force: options.force || false,
      createPullRequest: options.createPullRequest || false,
      prTitle: options.prTitle,
      prDescription: options.prDescription,
      ...options
    };

    this.logger.info('Pushing changes', {
      owner,
      repo,
      branch: pushOptions.branch,
      changeCount: changes.length,
      force: pushOptions.force
    });

    try {
      // Create commit with changes
      const commitResult = await this.createCommitWithChanges(
        owner,
        repo,
        changes,
        commitMessage,
        pushOptions
      );

      if (!commitResult.success) {
        return {
          success: false,
          error: commitResult.error,
          details: commitResult.details
        };
      }

      // Create pull request if requested
      let pullRequest = null;
      if (pushOptions.createPullRequest && pushOptions.branch !== 'main' && pushOptions.branch !== 'master') {
        const prResult = await this.createPullRequest(
          owner,
          repo,
          pushOptions.branch,
          'main',
          pushOptions.prTitle || commitMessage,
          pushOptions.prDescription || `Automated pull request for changes in ${pushOptions.branch}`
        );

        if (prResult.success) {
          pullRequest = prResult.pullRequest;
        }
      }

      return {
        success: true,
        commit: commitResult.commit,
        branch: commitResult.branch,
        changes: commitResult.changes,
        pullRequest,
        feedback: {
          type: 'success',
          title: 'Changes Pushed Successfully',
          message: `Successfully pushed ${changes.length} file(s) to ${owner}/${repo}`,
          actions: [
            {
              type: 'view_commit',
              label: 'View Commit',
              url: commitResult.commit.url
            },
            {
              type: 'view_repository',
              label: 'View Repository',
              url: `https://github.com/${owner}/${repo}`
            }
          ]
        }
      };

    } catch (error) {
      this.logger.error('Push failed', {
        owner,
        repo,
        error: error.message
      });

      return {
        success: false,
        error: `Push failed: ${error.message}`,
        details: {
          type: 'push_error',
          retryable: isRetryableError(error)
        }
      };
    }
  }

  /**
   * Get branch reference
   * @private
   */
  async getBranchReference(owner, repo, branch) {
    try {
      const { data: ref } = await this.executeWithRetry(
        () => this.octokit.rest.git.getRef({
          owner,
          repo,
          ref: `heads/${branch}`
        }),
        `get branch reference ${branch}`
      );

      return {
        success: true,
        sha: ref.object.sha,
        ref: ref.ref,
        url: ref.url
      };

    } catch (error) {
      if (error.status === 404) {
        return {
          success: false,
          error: `Branch '${branch}' not found`,
          details: { type: 'branch_not_found' }
        };
      }

      return {
        success: false,
        error: `Failed to get branch reference: ${error.message}`,
        details: { type: 'branch_reference_error' }
      };
    }
  }

  /**
   * Get commit details
   * @private
   */
  async getCommit(owner, repo, commitSha) {
    try {
      const { data: commit } = await this.executeWithRetry(
        () => this.octokit.rest.git.getCommit({
          owner,
          repo,
          commit_sha: commitSha
        }),
        `get commit ${commitSha}`
      );

      return {
        success: true,
        sha: commit.sha,
        treeSha: commit.tree.sha,
        message: commit.message,
        author: commit.author,
        committer: commit.committer,
        parents: commit.parents
      };

    } catch (error) {
      return {
        success: false,
        error: `Failed to get commit: ${error.message}`,
        details: { type: 'commit_fetch_error' }
      };
    }
  }

  /**
   * Create blobs for file changes
   * @private
   */
  async createBlobsForChanges(owner, repo, changes) {
    const blobs = new Map();
    const errors = [];

    try {
      for (const change of changes) {
        if (change.operation === 'delete') {
          continue; // No blob needed for deletions
        }

        // Check file size
        if (change.content && change.content.length > this.options.maxFileSize) {
          errors.push(`File ${change.path} exceeds maximum size limit`);
          continue;
        }

        const { data: blob } = await this.executeWithRetry(
          () => this.octokit.rest.git.createBlob({
            owner,
            repo,
            content: Buffer.from(change.content, 'utf-8').toString('base64'),
            encoding: 'base64'
          }),
          `create blob for ${change.path}`
        );

        blobs.set(change.path, {
          sha: blob.sha,
          url: blob.url,
          size: change.content.length
        });
      }

      if (errors.length > 0) {
        return {
          success: false,
          error: 'Blob creation failed for some files',
          details: {
            type: 'blob_creation_error',
            errors
          }
        };
      }

      return {
        success: true,
        blobs
      };

    } catch (error) {
      return {
        success: false,
        error: `Failed to create blobs: ${error.message}`,
        details: { type: 'blob_creation_error' }
      };
    }
  }

  /**
   * Create tree with changes
   * @private
   */
  async createTreeWithChanges(owner, repo, baseTreeSha, changes, blobs) {
    try {
      const tree = [];

      for (const change of changes) {
        const treeItem = {
          path: change.path,
          mode: '100644', // Regular file
          type: 'blob'
        };

        if (change.operation === 'delete') {
          treeItem.sha = null; // Null SHA means delete
        } else {
          const blob = blobs.get(change.path);
          if (!blob) {
            throw new Error(`No blob found for ${change.path}`);
          }
          treeItem.sha = blob.sha;
        }

        tree.push(treeItem);
      }

      const { data: newTree } = await this.executeWithRetry(
        () => this.octokit.rest.git.createTree({
          owner,
          repo,
          base_tree: baseTreeSha,
          tree
        }),
        'create tree with changes'
      );

      return {
        success: true,
        treeSha: newTree.sha,
        url: newTree.url
      };

    } catch (error) {
      return {
        success: false,
        error: `Failed to create tree: ${error.message}`,
        details: { type: 'tree_creation_error' }
      };
    }
  }

  /**
   * Create commit
   * @private
   */
  async createCommit(owner, repo, message, treeSha, parents, author = null) {
    try {
      const commitParams = {
        owner,
        repo,
        message,
        tree: treeSha,
        parents
      };

      if (author) {
        commitParams.author = author;
      }

      const { data: commit } = await this.executeWithRetry(
        () => this.octokit.rest.git.createCommit(commitParams),
        'create commit'
      );

      return {
        success: true,
        commitSha: commit.sha,
        url: commit.html_url,
        author: commit.author,
        committer: commit.committer
      };

    } catch (error) {
      return {
        success: false,
        error: `Failed to create commit: ${error.message}`,
        details: { type: 'commit_creation_error' }
      };
    }
  }

  /**
   * Update branch reference
   * @private
   */
  async updateBranchReference(owner, repo, branch, commitSha) {
    try {
      await this.executeWithRetry(
        () => this.octokit.rest.git.updateRef({
          owner,
          repo,
          ref: `heads/${branch}`,
          sha: commitSha
        }),
        `update branch reference ${branch}`
      );

      return {
        success: true,
        branch,
        sha: commitSha
      };

    } catch (error) {
      return {
        success: false,
        error: `Failed to update branch reference: ${error.message}`,
        details: { type: 'branch_update_error' }
      };
    }
  }

  /**
   * Create pull request
   * @private
   */
  async createPullRequest(owner, repo, head, base, title, body) {
    try {
      const { data: pr } = await this.executeWithRetry(
        () => this.octokit.rest.pulls.create({
          owner,
          repo,
          title,
          body,
          head,
          base
        }),
        'create pull request'
      );

      return {
        success: true,
        pullRequest: {
          number: pr.number,
          title: pr.title,
          url: pr.html_url,
          state: pr.state,
          head: pr.head.ref,
          base: pr.base.ref
        }
      };

    } catch (error) {
      return {
        success: false,
        error: `Failed to create pull request: ${error.message}`,
        details: { type: 'pull_request_error' }
      };
    }
  }

  /**
   * Create commit backup
   * @private
   */
  async createCommitBackup(owner, repo, commitSha, originalMessage) {
    try {
      const backupRef = `backup-${Date.now()}`;
      
      await this.executeWithRetry(
        () => this.octokit.rest.git.createRef({
          owner,
          repo,
          ref: `refs/heads/${backupRef}`,
          sha: commitSha
        }),
        'create backup branch'
      );

      this.logger.info('Backup created', {
        owner,
        repo,
        backupRef,
        commitSha,
        originalMessage
      });

      return {
        success: true,
        backupRef,
        commitSha
      };

    } catch (error) {
      this.logger.warn('Failed to create backup', {
        owner,
        repo,
        error: error.message
      });

      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Validate file changes
   * @private
   */
  validateFileChanges(changes) {
    const errors = [];

    if (!Array.isArray(changes)) {
      errors.push('Changes must be an array');
      return { isValid: false, errors };
    }

    changes.forEach((change, index) => {
      if (!change.path) {
        errors.push(`Change ${index}: path is required`);
      }

      if (!['create', 'update', 'delete'].includes(change.operation)) {
        errors.push(`Change ${index}: invalid operation '${change.operation}'`);
      }

      if ((change.operation === 'create' || change.operation === 'update') && change.content === undefined) {
        errors.push(`Change ${index}: content is required for ${change.operation} operations`);
      }

      // Validate file path
      if (change.path && (change.path.includes('..') || change.path.startsWith('/'))) {
        errors.push(`Change ${index}: invalid file path '${change.path}'`);
      }

      // Check file size
      if (change.content && change.content.length > this.options.maxFileSize) {
        errors.push(`Change ${index}: file size exceeds limit (${this.options.maxFileSize} bytes)`);
      }
    });

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Set up rate limit monitoring
   * @private
   */
  setupRateLimitMonitoring() {
    this.rateLimitManager.on('warning', (data) => {
      this.logger.warn('GitHub API rate limit warning', {
        remaining: data.remaining,
        resetTime: data.reset
      });
    });

    this.rateLimitManager.on('rateLimit', (data) => {
      if (data.type === 'waiting_for_reset') {
        this.logger.info('Rate limit exceeded, waiting for reset', {
          waitTime: Math.round(data.waitTime / 1000),
          queueLength: data.queueLength
        });
      }
    });
  }

  /**
   * Execute GitHub API request with rate limiting and error handling
   * @private
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
      logger: (message) => this.logger.info(`[${operation}] ${message}`)
    });
  }

  /**
   * Get service health status
   */
  async getHealthStatus() {
    try {
      const { data: user } = await this.executeWithRetry(
        () => this.octokit.rest.users.getAuthenticated(),
        'health check'
      );

      const rateLimitStatus = this.rateLimitManager.getStatus();
      
      return {
        healthy: true,
        service: 'github-integration',
        user: {
          login: user?.login || 'unknown',
          id: user?.id || 'unknown'
        },
        rateLimit: {
          remaining: rateLimitStatus.rateLimit.remaining,
          limit: rateLimitStatus.rateLimit.limit,
          resetTime: new Date(rateLimitStatus.rateLimit.reset).toISOString()
        },
        timestamp: new Date().toISOString()
      };

    } catch (error) {
      return {
        healthy: false,
        service: 'github-integration',
        error: getUserFriendlyMessage(error),
        details: {
          type: error.name,
          status: error.status,
          retryable: isRetryableError(error)
        },
        timestamp: new Date().toISOString()
      };
    }
  }
}

/**
 * Create GitHub integration service instance
 * @param {string} accessToken - GitHub access token
 * @param {Object} options - Service options
 * @returns {GitHubIntegrationService}
 */
export function createGitHubIntegrationService(accessToken, options = {}) {
  return new GitHubIntegrationService(accessToken, options);
}

export default GitHubIntegrationService;