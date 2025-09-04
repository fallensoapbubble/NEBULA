import { Octokit } from '@octokit/rest';
import { createGitHubClient } from './github-auth.js';
import { parseGitHubError, isRetryableError, getUserFriendlyMessage } from './github-errors.js';
import { getRateLimitManager, RetryManager } from './rate-limit-manager.js';

/**
 * Repository Service
 * Handles GitHub repository operations including forking, content management, and structure analysis
 */
export class RepositoryService {
  constructor(accessToken, options = {}) {
    if (!accessToken) {
      throw new Error('GitHub access token is required');
    }
    
    this.octokit = createGitHubClient(accessToken);
    this.accessToken = accessToken;
    
    // Initialize rate limiting and retry mechanisms
    this.rateLimitManager = getRateLimitManager(options.rateLimit);
    this.retryManager = new RetryManager(options.retry);
    
    // Set up rate limit monitoring
    this.setupRateLimitMonitoring();
  }

  /**
   * Fork a repository to the authenticated user's account
   * @param {string} templateOwner - Owner of the template repository
   * @param {string} templateRepo - Name of the template repository
   * @param {string} [newName] - Optional new name for the forked repository
   * @returns {Promise<{success: boolean, repository?: object, error?: string}>}
   */
  async forkRepository(templateOwner, templateRepo, newName = null) {
    try {
      // Validate input parameters
      if (!templateOwner || !templateRepo) {
        return {
          success: false,
          error: 'Template owner and repository name are required'
        };
      }

      // Check if template repository exists and is accessible
      const templateExists = await this.verifyRepositoryExists(templateOwner, templateRepo);
      if (!templateExists.exists) {
        return {
          success: false,
          error: `Template repository ${templateOwner}/${templateRepo} not found or not accessible`
        };
      }

      // Fork the repository with retry and rate limiting
      const forkParams = {
        owner: templateOwner,
        repo: templateRepo
      };

      // Add new name if specified
      if (newName) {
        forkParams.name = newName;
      }

      const { data: forkedRepo } = await this.executeWithRetry(
        () => this.octokit.rest.repos.createFork(forkParams),
        `fork repository ${templateOwner}/${templateRepo}`
      );

      // Wait for fork to be ready (GitHub needs time to create the fork)
      const forkReady = await this.waitForForkReady(forkedRepo.owner.login, forkedRepo.name);
      
      if (!forkReady.ready) {
        return {
          success: false,
          error: 'Fork creation timed out or failed',
          details: {
            type: 'ForkTimeoutError',
            retryable: true
          }
        };
      }

      return {
        success: true,
        repository: {
          owner: forkedRepo.owner.login,
          name: forkedRepo.name,
          fullName: forkedRepo.full_name,
          url: forkedRepo.html_url,
          cloneUrl: forkedRepo.clone_url,
          defaultBranch: forkedRepo.default_branch,
          private: forkedRepo.private,
          createdAt: forkedRepo.created_at,
          updatedAt: forkedRepo.updated_at
        }
      };

    } catch (error) {
      return this.handleError(error, 'fork repository');
    }
  }

  /**
   * Verify that a fork was created successfully
   * @param {string} owner - Repository owner
   * @param {string} repo - Repository name
   * @returns {Promise<{verified: boolean, repository?: object, error?: string}>}
   */
  async verifyFork(owner, repo) {
    try {
      const { data: repository } = await this.octokit.rest.repos.get({
        owner,
        repo
      });

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
          private: repository.private
        }
      };

    } catch (error) {
      console.error('Fork verification error:', error);
      
      if (error.status === 404) {
        return {
          verified: false,
          error: 'Forked repository not found'
        };
      }

      return {
        verified: false,
        error: `Fork verification failed: ${error.message}`
      };
    }
  }

  /**
   * Get repository structure and analyze content files
   * @param {string} owner - Repository owner
   * @param {string} repo - Repository name
   * @param {string} [path=''] - Path to analyze (default: root)
   * @param {string} [ref] - Git reference (branch/commit)
   * @returns {Promise<{success: boolean, structure?: object, error?: string}>}
   */
  async getRepositoryStructure(owner, repo, path = '', ref = null) {
    try {
      const params = {
        owner,
        repo,
        path
      };

      if (ref) {
        params.ref = ref;
      }

      const { data: contents } = await this.executeWithRetry(
        () => this.octokit.rest.repos.getContent(params),
        `get repository structure ${owner}/${repo}${path ? `/${path}` : ''}`
      );
      
      // Handle single file vs directory
      const items = Array.isArray(contents) ? contents : [contents];
      
      const structure = {
        path,
        type: 'directory',
        items: []
      };

      for (const item of items) {
        const structureItem = {
          name: item.name,
          path: item.path,
          type: item.type, // 'file' or 'dir'
          size: item.size,
          sha: item.sha,
          url: item.url,
          downloadUrl: item.download_url
        };

        // For files, add additional metadata
        if (item.type === 'file') {
          structureItem.extension = this.getFileExtension(item.name);
          structureItem.contentType = this.getContentType(item.name);
          structureItem.editable = this.isEditableFile(item.name);
        }

        structure.items.push(structureItem);
      }

      // Sort items: directories first, then files alphabetically
      structure.items.sort((a, b) => {
        if (a.type !== b.type) {
          return a.type === 'dir' ? -1 : 1;
        }
        return a.name.localeCompare(b.name);
      });

      return {
        success: true,
        structure
      };

    } catch (error) {
      return this.handleError(error, 'get repository structure');
    }
  }

  /**
   * Get file content from repository
   * @param {string} owner - Repository owner
   * @param {string} repo - Repository name
   * @param {string} path - File path
   * @param {string} [ref] - Git reference (branch/commit)
   * @returns {Promise<{success: boolean, content?: object, error?: string}>}
   */
  async getFileContent(owner, repo, path, ref = null) {
    try {
      const params = {
        owner,
        repo,
        path
      };

      if (ref) {
        params.ref = ref;
      }

      const { data: file } = await this.octokit.rest.repos.getContent(params);

      // Ensure we're dealing with a file, not a directory
      if (file.type !== 'file') {
        return {
          success: false,
          error: 'Path points to a directory, not a file'
        };
      }

      // Decode content (GitHub API returns base64 encoded content)
      const content = file.encoding === 'base64' 
        ? Buffer.from(file.content, 'base64').toString('utf-8')
        : file.content;

      return {
        success: true,
        content: {
          path: file.path,
          name: file.name,
          sha: file.sha,
          size: file.size,
          content,
          encoding: file.encoding,
          contentType: this.getContentType(file.name),
          editable: this.isEditableFile(file.name),
          downloadUrl: file.download_url
        }
      };

    } catch (error) {
      console.error('Get file content error:', error);
      
      if (error.status === 404) {
        return {
          success: false,
          error: 'File not found'
        };
      }

      return {
        success: false,
        error: `Failed to get file content: ${error.message}`
      };
    }
  }

  /**
   * Update file content in repository
   * @param {string} owner - Repository owner
   * @param {string} repo - Repository name
   * @param {string} path - File path
   * @param {string} content - New file content
   * @param {string} message - Commit message
   * @param {string} [sha] - Current file SHA (required for updates)
   * @param {string} [branch] - Target branch
   * @returns {Promise<{success: boolean, commit?: object, error?: string}>}
   */
  async updateFileContent(owner, repo, path, content, message, sha = null, branch = null) {
    try {
      // If no SHA provided, get current file SHA
      if (!sha) {
        const currentFile = await this.getFileContent(owner, repo, path, branch);
        if (!currentFile.success) {
          // File doesn't exist, this will be a new file creation
          sha = null;
        } else {
          sha = currentFile.content.sha;
        }
      }

      const params = {
        owner,
        repo,
        path,
        message,
        content: Buffer.from(content, 'utf-8').toString('base64')
      };

      if (sha) {
        params.sha = sha;
      }

      if (branch) {
        params.branch = branch;
      }

      const { data: result } = await this.executeWithRetry(
        () => this.octokit.rest.repos.createOrUpdateFileContents(params),
        `update file ${owner}/${repo}/${path}`
      );

      return {
        success: true,
        commit: {
          sha: result.commit.sha,
          message: result.commit.message,
          author: result.commit.author,
          committer: result.commit.committer,
          url: result.commit.html_url,
          content: {
            name: result.content.name,
            path: result.content.path,
            sha: result.content.sha,
            size: result.content.size
          }
        }
      };

    } catch (error) {
      return this.handleError(error, 'update file content');
    }
  }

  /**
   * Create multiple file updates in a single commit
   * @param {string} owner - Repository owner
   * @param {string} repo - Repository name
   * @param {Array} changes - Array of file changes
   * @param {string} message - Commit message
   * @param {string} [branch] - Target branch
   * @returns {Promise<{success: boolean, commit?: object, error?: string}>}
   */
  async createCommit(owner, repo, changes, message, branch = null) {
    try {
      // Get repository info to determine default branch
      const { data: repoInfo } = await this.octokit.rest.repos.get({ owner, repo });
      const targetBranch = branch || repoInfo.default_branch;

      // Get current branch reference
      const { data: ref } = await this.octokit.rest.git.getRef({
        owner,
        repo,
        ref: `heads/${targetBranch}`
      });

      const currentCommitSha = ref.object.sha;

      // Get current commit to get tree SHA
      const { data: currentCommit } = await this.octokit.rest.git.getCommit({
        owner,
        repo,
        commit_sha: currentCommitSha
      });

      // Create tree with changes
      const tree = [];
      
      for (const change of changes) {
        const treeItem = {
          path: change.path,
          mode: '100644', // Regular file
          type: 'blob'
        };

        if (change.operation === 'delete') {
          treeItem.sha = null;
        } else {
          // Create blob for file content
          const { data: blob } = await this.octokit.rest.git.createBlob({
            owner,
            repo,
            content: Buffer.from(change.content, 'utf-8').toString('base64'),
            encoding: 'base64'
          });
          
          treeItem.sha = blob.sha;
        }

        tree.push(treeItem);
      }

      // Create new tree
      const { data: newTree } = await this.octokit.rest.git.createTree({
        owner,
        repo,
        base_tree: currentCommit.tree.sha,
        tree
      });

      // Create commit
      const { data: newCommit } = await this.octokit.rest.git.createCommit({
        owner,
        repo,
        message,
        tree: newTree.sha,
        parents: [currentCommitSha]
      });

      // Update branch reference
      await this.octokit.rest.git.updateRef({
        owner,
        repo,
        ref: `heads/${targetBranch}`,
        sha: newCommit.sha
      });

      return {
        success: true,
        commit: {
          sha: newCommit.sha,
          message: newCommit.message,
          author: newCommit.author,
          committer: newCommit.committer,
          url: newCommit.html_url,
          filesChanged: changes.length
        }
      };

    } catch (error) {
      console.error('Create commit error:', error);
      
      return {
        success: false,
        error: `Failed to create commit: ${error.message}`
      };
    }
  }

  // Synchronization and Conflict Detection Methods

  /**
   * Get the latest commit from a repository
   * @param {string} owner - Repository owner
   * @param {string} repo - Repository name
   * @param {string} [branch] - Branch name (defaults to default branch)
   * @returns {Promise<{success: boolean, commit?: object, error?: string}>}
   */
  async getLatestCommit(owner, repo, branch = null) {
    try {
      // Get repository info to determine default branch if not specified
      const { data: repoInfo } = await this.octokit.rest.repos.get({ owner, repo });
      const targetBranch = branch || repoInfo.default_branch;

      // Get latest commit from the branch
      const { data: commits } = await this.octokit.rest.repos.listCommits({
        owner,
        repo,
        sha: targetBranch,
        per_page: 1
      });

      if (commits.length === 0) {
        return {
          success: false,
          error: 'No commits found in repository'
        };
      }

      const latestCommit = commits[0];

      return {
        success: true,
        commit: {
          sha: latestCommit.sha,
          message: latestCommit.commit.message,
          author: {
            name: latestCommit.commit.author.name,
            email: latestCommit.commit.author.email,
            date: latestCommit.commit.author.date
          },
          committer: {
            name: latestCommit.commit.committer.name,
            email: latestCommit.commit.committer.email,
            date: latestCommit.commit.committer.date
          },
          url: latestCommit.html_url,
          branch: targetBranch
        }
      };

    } catch (error) {
      console.error('Get latest commit error:', error);
      
      if (error.status === 404) {
        return {
          success: false,
          error: 'Repository or branch not found'
        };
      }

      return {
        success: false,
        error: `Failed to get latest commit: ${error.message}`
      };
    }
  }

  /**
   * Check for updates since a given commit SHA
   * @param {string} owner - Repository owner
   * @param {string} repo - Repository name
   * @param {string} lastKnownSha - Last known commit SHA
   * @param {string} [branch] - Branch name (defaults to default branch)
   * @returns {Promise<{success: boolean, hasUpdates?: boolean, commits?: Array, error?: string}>}
   */
  async checkForUpdates(owner, repo, lastKnownSha, branch = null) {
    try {
      // Get repository info to determine default branch if not specified
      const { data: repoInfo } = await this.octokit.rest.repos.get({ owner, repo });
      const targetBranch = branch || repoInfo.default_branch;

      // Get the date of the last known commit
      const lastKnownDate = await this.getCommitDate(owner, repo, lastKnownSha);
      if (!lastKnownDate) {
        return {
          success: false,
          error: 'Could not determine date of last known commit'
        };
      }

      // Get commits since the last known commit
      const { data: commits } = await this.octokit.rest.repos.listCommits({
        owner,
        repo,
        sha: targetBranch,
        since: lastKnownDate
      });

      // Filter out the last known commit itself
      const newCommits = commits.filter(commit => commit.sha !== lastKnownSha);

      return {
        success: true,
        hasUpdates: newCommits.length > 0,
        commits: newCommits.map(commit => ({
          sha: commit.sha,
          message: commit.commit.message,
          author: {
            name: commit.commit.author.name,
            email: commit.commit.author.email,
            date: commit.commit.author.date
          },
          url: commit.html_url
        }))
      };

    } catch (error) {
      console.error('Check for updates error:', error);
      
      return {
        success: false,
        error: `Failed to check for updates: ${error.message}`
      };
    }
  }

  /**
   * Get synchronization status for a repository
   * @param {string} owner - Repository owner
   * @param {string} repo - Repository name
   * @param {string} lastKnownSha - Last known commit SHA
   * @param {string} [branch] - Branch name
   * @returns {Promise<{success: boolean, status?: object, error?: string}>}
   */
  async getSyncStatus(owner, repo, lastKnownSha, branch = null) {
    try {
      // Get latest commit
      const latestResult = await this.getLatestCommit(owner, repo, branch);
      if (!latestResult.success) {
        return {
          success: false,
          error: latestResult.error
        };
      }

      const latestSha = latestResult.commit.sha;
      const upToDate = latestSha === lastKnownSha;

      let newCommitsCount = 0;
      let newCommits = [];

      if (!upToDate) {
        // Check for new commits
        const updatesResult = await this.checkForUpdates(owner, repo, lastKnownSha, branch);
        if (updatesResult.success) {
          newCommitsCount = updatesResult.commits.length;
          newCommits = updatesResult.commits;
        }
      }

      return {
        success: true,
        status: {
          upToDate,
          lastKnownSha,
          latestSha,
          newCommitsCount,
          newCommits,
          branch: latestResult.commit.branch,
          lastChecked: new Date().toISOString()
        }
      };

    } catch (error) {
      console.error('Get sync status error:', error);
      
      return {
        success: false,
        error: `Failed to get sync status: ${error.message}`
      };
    }
  }

  /**
   * Detect conflicts between local changes and remote updates
   * @param {string} owner - Repository owner
   * @param {string} repo - Repository name
   * @param {Array} localChanges - Array of local file changes
   * @param {string} lastKnownSha - Last known commit SHA
   * @param {string} [branch] - Branch name
   * @returns {Promise<{success: boolean, hasConflicts?: boolean, conflicts?: Array, error?: string}>}
   */
  async detectConflicts(owner, repo, localChanges, lastKnownSha, branch = null) {
    try {
      // Check for remote updates
      const updatesResult = await this.checkForUpdates(owner, repo, lastKnownSha, branch);
      if (!updatesResult.success) {
        return {
          success: false,
          error: updatesResult.error
        };
      }

      if (!updatesResult.hasUpdates) {
        // No remote updates, no conflicts possible
        return {
          success: true,
          hasConflicts: false,
          conflicts: []
        };
      }

      const conflicts = [];

      // Get details of each new commit to see what files were changed
      const remoteChangedFiles = new Set();
      
      for (const commit of updatesResult.commits) {
        const commitDetails = await this.getCommitDetails(owner, repo, commit.sha);
        if (commitDetails.success) {
          commitDetails.files.forEach(file => {
            remoteChangedFiles.add(file.filename);
          });
        }
      }

      // Check for conflicts between local changes and remote changes
      for (const localChange of localChanges) {
        if (remoteChangedFiles.has(localChange.path)) {
          // Same file modified both locally and remotely - potential conflict
          
          // Get current remote content
          const remoteContent = await this.getFileContent(owner, repo, localChange.path, branch);
          
          if (remoteContent.success) {
            // Compare content to determine if there's an actual conflict
            const hasContentConflict = localChange.content !== remoteContent.content.content;
            
            if (hasContentConflict) {
              conflicts.push({
                path: localChange.path,
                type: 'content_conflict',
                localChange: {
                  content: localChange.content,
                  sha: localChange.sha
                },
                remoteChange: {
                  content: remoteContent.content.content,
                  sha: remoteContent.content.sha
                },
                description: `File ${localChange.path} has been modified both locally and remotely`
              });
            }
          }
        }
      }

      return {
        success: true,
        hasConflicts: conflicts.length > 0,
        conflicts,
        remoteCommits: updatesResult.commits
      };

    } catch (error) {
      console.error('Detect conflicts error:', error);
      
      return {
        success: false,
        error: `Failed to detect conflicts: ${error.message}`
      };
    }
  }

  /**
   * Resolve conflicts using specified strategy
   * @param {string} owner - Repository owner
   * @param {string} repo - Repository name
   * @param {Array} conflicts - Array of conflicts to resolve
   * @param {string} strategy - Resolution strategy ('keep_local', 'keep_remote', 'manual')
   * @param {Object} [manualResolutions] - Manual resolutions for 'manual' strategy
   * @param {string} [branch] - Branch name
   * @returns {Promise<{success: boolean, resolutions?: Array, summary?: object, error?: string}>}
   */
  async resolveConflicts(owner, repo, conflicts, strategy, manualResolutions = {}, branch = null) {
    try {
      const resolutions = [];
      let resolved = 0;
      let failed = 0;

      for (const conflict of conflicts) {
        let contentToUse;
        let resolutionType;

        switch (strategy) {
          case 'keep_local':
            contentToUse = conflict.localChange.content;
            resolutionType = 'kept_local';
            break;
            
          case 'keep_remote':
            contentToUse = conflict.remoteChange.content;
            resolutionType = 'kept_remote';
            break;
            
          case 'manual':
            if (manualResolutions[conflict.path]) {
              contentToUse = manualResolutions[conflict.path];
              resolutionType = 'manual_resolution';
            } else {
              resolutions.push({
                path: conflict.path,
                success: false,
                error: 'No manual resolution provided for this conflict'
              });
              failed++;
              continue;
            }
            break;
            
          default:
            return {
              success: false,
              error: `Unknown resolution strategy: ${strategy}`
            };
        }

        // Apply the resolution by updating the file
        const updateResult = await this.updateFileContent(
          owner,
          repo,
          conflict.path,
          contentToUse,
          `Resolve conflict in ${conflict.path} using ${strategy} strategy`,
          conflict.remoteChange.sha, // Use remote SHA as base
          branch
        );

        if (updateResult.success) {
          resolutions.push({
            path: conflict.path,
            success: true,
            resolutionType,
            commit: updateResult.commit
          });
          resolved++;
        } else {
          resolutions.push({
            path: conflict.path,
            success: false,
            error: updateResult.error
          });
          failed++;
        }
      }

      return {
        success: true,
        resolutions,
        summary: {
          total: conflicts.length,
          resolved,
          failed,
          strategy
        }
      };

    } catch (error) {
      console.error('Resolve conflicts error:', error);
      
      return {
        success: false,
        error: `Failed to resolve conflicts: ${error.message}`
      };
    }
  }

  // Rate Limiting and Error Handling

  /**
   * Set up rate limit monitoring
   */
  setupRateLimitMonitoring() {
    this.rateLimitManager.on('warning', (data) => {
      console.warn(`GitHub API rate limit warning: ${data.remaining} requests remaining`);
    });

    this.rateLimitManager.on('rateLimit', (data) => {
      if (data.type === 'waiting_for_reset') {
        console.log(`Rate limit exceeded. Waiting ${Math.round(data.waitTime / 1000)}s for reset. Queue length: ${data.queueLength}`);
      }
    });

    this.rateLimitManager.on('error', (error) => {
      console.error('Rate limit manager error:', error);
    });
  }

  /**
   * Execute GitHub API request with rate limiting and error handling
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
        timestamp: error.timestamp
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

  /**
   * Check service health and availability
   * @returns {Promise<object>} Service health status
   */
  async checkServiceHealth() {
    try {
      // Make a simple API call to check connectivity
      const { data: user } = await this.executeWithRetry(
        () => this.octokit.rest.users.getAuthenticated(),
        'health check'
      );

      const rateLimitStatus = this.getRateLimitStatus();
      
      return {
        healthy: true,
        user: {
          login: user?.login || 'unknown',
          id: user?.id || 'unknown'
        },
        rateLimit: {
          remaining: rateLimitStatus.rateLimit.remaining,
          limit: rateLimitStatus.rateLimit.limit,
          resetTime: new Date(rateLimitStatus.rateLimit.reset).toISOString()
        },
        queue: {
          length: rateLimitStatus.queue.length,
          isProcessing: rateLimitStatus.queue.isProcessing
        },
        timestamp: new Date().toISOString()
      };

    } catch (error) {
      return {
        healthy: false,
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

  /**
   * Enable graceful degradation mode
   * Reduces API calls and provides cached/simplified responses when possible
   */
  enableGracefulDegradation() {
    this.gracefulDegradation = true;
    console.log('Graceful degradation mode enabled');
  }

  /**
   * Disable graceful degradation mode
   */
  disableGracefulDegradation() {
    this.gracefulDegradation = false;
    console.log('Graceful degradation mode disabled');
  }

  /**
   * Check if graceful degradation is enabled
   * @returns {boolean} True if graceful degradation is enabled
   */
  isGracefulDegradationEnabled() {
    return this.gracefulDegradation || false;
  }

  // Helper methods

  /**
   * Get the date of a specific commit
   * @param {string} owner - Repository owner
   * @param {string} repo - Repository name
   * @param {string} sha - Commit SHA
   * @returns {Promise<string|null>} Commit date in ISO format or null if not found
   */
  async getCommitDate(owner, repo, sha) {
    try {
      const { data: commit } = await this.octokit.rest.repos.getCommit({
        owner,
        repo,
        ref: sha
      });
      
      return commit.commit.author.date;
    } catch (error) {
      console.error('Get commit date error:', error);
      return null;
    }
  }

  /**
   * Get details of a specific commit including changed files
   * @param {string} owner - Repository owner
   * @param {string} repo - Repository name
   * @param {string} sha - Commit SHA
   * @returns {Promise<{success: boolean, files?: Array, error?: string}>}
   */
  async getCommitDetails(owner, repo, sha) {
    try {
      const { data: commit } = await this.octokit.rest.repos.getCommit({
        owner,
        repo,
        ref: sha
      });

      return {
        success: true,
        files: commit.files || []
      };
    } catch (error) {
      console.error('Get commit details error:', error);
      
      return {
        success: false,
        error: `Failed to get commit details: ${error.message}`
      };
    }
  }

  /**
   * Wait for fork to be ready (GitHub needs time to create forks)
   * @param {string} owner - Fork owner
   * @param {string} repo - Fork repository name
   * @param {number} maxAttempts - Maximum number of attempts
   * @param {number} delay - Delay between attempts in milliseconds
   * @returns {Promise<{ready: boolean, error?: string}>}
   */
  async waitForForkReady(owner, repo, maxAttempts = 10, delay = 2000) {
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        await this.octokit.rest.repos.get({ owner, repo });
        return { ready: true };
      } catch (error) {
        if (error.status === 404 && attempt < maxAttempts) {
          // Fork not ready yet, wait and retry
          await new Promise(resolve => setTimeout(resolve, delay));
          continue;
        }
        
        return { 
          ready: false, 
          error: `Fork verification failed after ${attempt} attempts: ${error.message}` 
        };
      }
    }
    
    return { 
      ready: false, 
      error: `Fork not ready after ${maxAttempts} attempts` 
    };
  }

  /**
   * Verify that a repository exists and is accessible
   * @param {string} owner - Repository owner
   * @param {string} repo - Repository name
   * @returns {Promise<{exists: boolean, repository?: object, error?: string}>}
   */
  async verifyRepositoryExists(owner, repo) {
    try {
      const { data: repository } = await this.octokit.rest.repos.get({ owner, repo });
      
      return {
        exists: true,
        repository: {
          owner: repository.owner.login,
          name: repository.name,
          fullName: repository.full_name,
          private: repository.private,
          fork: repository.fork,
          defaultBranch: repository.default_branch
        }
      };
    } catch (error) {
      if (error.status === 404) {
        return { exists: false, error: 'Repository not found' };
      }
      
      return { exists: false, error: error.message };
    }
  }

  /**
   * Get file extension from filename
   * @param {string} filename - File name
   * @returns {string} File extension (without dot)
   */
  getFileExtension(filename) {
    const lastDot = filename.lastIndexOf('.');
    return lastDot > 0 ? filename.substring(lastDot + 1).toLowerCase() : '';
  }

  /**
   * Determine content type based on file extension
   * @param {string} filename - File name
   * @returns {string} Content type
   */
  getContentType(filename) {
    const extension = this.getFileExtension(filename);
    
    const contentTypes = {
      // Text files
      'txt': 'text/plain',
      'md': 'text/markdown',
      'markdown': 'text/markdown',
      'json': 'application/json',
      'js': 'text/javascript',
      'jsx': 'text/javascript',
      'ts': 'text/typescript',
      'tsx': 'text/typescript',
      'css': 'text/css',
      'scss': 'text/scss',
      'sass': 'text/sass',
      'html': 'text/html',
      'htm': 'text/html',
      'xml': 'text/xml',
      'yaml': 'text/yaml',
      'yml': 'text/yaml',
      'toml': 'text/toml',
      
      // Images
      'png': 'image/png',
      'jpg': 'image/jpeg',
      'jpeg': 'image/jpeg',
      'gif': 'image/gif',
      'svg': 'image/svg+xml',
      'webp': 'image/webp',
      
      // Other
      'pdf': 'application/pdf',
      'zip': 'application/zip'
    };
    
    return contentTypes[extension] || 'application/octet-stream';
  }

  /**
   * Check if file is editable in the web editor
   * @param {string} filename - File name
   * @returns {boolean} True if file is editable
   */
  isEditableFile(filename) {
    const extension = this.getFileExtension(filename);
    
    const editableExtensions = [
      'txt', 'md', 'markdown', 'json', 'js', 'jsx', 'ts', 'tsx',
      'css', 'scss', 'sass', 'html', 'htm', 'xml', 'yaml', 'yml',
      'toml', 'env', 'gitignore', 'gitattributes'
    ];
    
    return editableExtensions.includes(extension) || filename.startsWith('.');
  }
}

/**
 * Create a new RepositoryService instance
 * @param {string} accessToken - GitHub access token
 * @returns {RepositoryService} Repository service instance
 */
export function createRepositoryService(accessToken) {
  return new RepositoryService(accessToken);
}