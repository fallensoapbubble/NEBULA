/**
 * Repository Refresh Service
 * Handles repository state refresh and update mechanisms
 */

import { Octokit } from '@octokit/rest';
import { logger } from './logger.js';

export class RepositoryRefreshService {
  constructor(accessToken) {
    this.octokit = new Octokit({
      auth: accessToken,
    });
    
    // Cache for repository states
    this.stateCache = new Map();
    this.refreshCallbacks = new Map();
  }

  /**
   * Refresh complete repository state
   * @param {string} owner - Repository owner
   * @param {string} repo - Repository name
   * @returns {Promise<Object>} Complete repository state
   */
  async refreshRepositoryState(owner, repo) {
    try {
      // Get repository metadata
      const { data: repoData } = await this.octokit.rest.repos.get({
        owner,
        repo,
      });

      // Get latest commit
      const { data: commits } = await this.octokit.rest.repos.listCommits({
        owner,
        repo,
        per_page: 1,
      });

      const latestCommit = commits[0];

      // Get repository tree to understand structure
      const { data: tree } = await this.octokit.rest.git.getTree({
        owner,
        repo,
        tree_sha: latestCommit.sha,
        recursive: true,
      });

      return {
        repository: {
          name: repoData.name,
          full_name: repoData.full_name,
          description: repoData.description,
          private: repoData.private,
          default_branch: repoData.default_branch,
          updated_at: repoData.updated_at,
        },
        latestCommit: {
          sha: latestCommit.sha,
          message: latestCommit.commit.message,
          author: latestCommit.commit.author,
          date: latestCommit.commit.author.date,
        },
        tree: tree.tree,
        refreshed_at: new Date().toISOString(),
      };
    } catch (error) {
      logger.error('Error refreshing repository state:', error);
      throw new Error(`Failed to refresh repository: ${error.message}`);
    }
  }

  /**
   * Get specific file content with metadata
   * @param {string} owner - Repository owner
   * @param {string} repo - Repository name
   * @param {string} path - File path
   * @returns {Promise<Object>} File content and metadata
   */
  async getFileContent(owner, repo, path) {
    try {
      const { data: fileData } = await this.octokit.rest.repos.getContent({
        owner,
        repo,
        path,
      });

      return {
        path: fileData.path,
        name: fileData.name,
        sha: fileData.sha,
        size: fileData.size,
        content: fileData.content,
        encoding: fileData.encoding,
        type: fileData.type,
        download_url: fileData.download_url,
        last_modified: new Date().toISOString(), // GitHub doesn't provide this directly
      };
    } catch (error) {
      if (error.status === 404) {
        return null; // File doesn't exist
      }
      logger.error('Error getting file content:', error);
      throw new Error(`Failed to get file content: ${error.message}`);
    }
  }

  /**
   * Get multiple file contents efficiently
   * @param {string} owner - Repository owner
   * @param {string} repo - Repository name
   * @param {Array<string>} paths - Array of file paths
   * @returns {Promise<Object>} Map of path to file content
   */
  async getMultipleFileContents(owner, repo, paths) {
    const results = {};
    
    // Process files in parallel but limit concurrency
    const batchSize = 5;
    for (let i = 0; i < paths.length; i += batchSize) {
      const batch = paths.slice(i, i + batchSize);
      const batchPromises = batch.map(async (path) => {
        try {
          const content = await this.getFileContent(owner, repo, path);
          return { path, content };
        } catch (error) {
          logger.warn(`Failed to get content for ${path}:`, error);
          return { path, content: null, error: error.message };
        }
      });

      const batchResults = await Promise.all(batchPromises);
      batchResults.forEach(({ path, content, error }) => {
        results[path] = error ? { error } : content;
      });
    }

    return results;
  }

  /**
   * Compare local state with remote state
   * @param {Object} localState - Current local state
   * @param {string} owner - Repository owner
   * @param {string} repo - Repository name
   * @returns {Promise<Object>} Comparison results
   */
  async compareWithRemote(localState, owner, repo) {
    try {
      const remoteState = await this.refreshRepositoryState(owner, repo);
      
      const comparison = {
        repository_changed: localState.repository?.updated_at !== remoteState.repository.updated_at,
        commit_changed: localState.latestCommit?.sha !== remoteState.latestCommit.sha,
        files_changed: [],
        new_files: [],
        deleted_files: [],
      };

      // Compare file trees if available
      if (localState.tree && remoteState.tree) {
        const localFiles = new Map(localState.tree.map(f => [f.path, f]));
        const remoteFiles = new Map(remoteState.tree.map(f => [f.path, f]));

        // Find changed and new files
        for (const [path, remoteFile] of remoteFiles) {
          const localFile = localFiles.get(path);
          if (!localFile) {
            comparison.new_files.push(remoteFile);
          } else if (localFile.sha !== remoteFile.sha) {
            comparison.files_changed.push({
              path,
              local_sha: localFile.sha,
              remote_sha: remoteFile.sha,
            });
          }
        }

        // Find deleted files
        for (const [path, localFile] of localFiles) {
          if (!remoteFiles.has(path)) {
            comparison.deleted_files.push(localFile);
          }
        }
      }

      return {
        comparison,
        remoteState,
        needs_update: comparison.commit_changed || comparison.repository_changed,
      };
    } catch (error) {
      logger.error('Error comparing with remote:', error);
      throw new Error(`Failed to compare with remote: ${error.message}`);
    }
  }

  /**
   * Create a refresh summary for user display
   * @param {Object} comparison - Comparison results
   * @returns {Object} User-friendly refresh summary
   */
  createRefreshSummary(comparison) {
    const { comparison: comp, remoteState } = comparison;
    
    const summary = {
      has_changes: comparison.needs_update,
      latest_commit: remoteState.latestCommit,
      changes: {
        files_modified: comp.files_changed.length,
        files_added: comp.new_files.length,
        files_deleted: comp.deleted_files.length,
      },
      details: {
        modified_files: comp.files_changed.map(f => f.path),
        added_files: comp.new_files.map(f => f.path),
        deleted_files: comp.deleted_files.map(f => f.path),
      },
      refresh_recommended: comparison.needs_update,
      last_checked: new Date().toISOString(),
    };

    return summary;
  }

  /**
   * Register a callback for repository refresh events
   * @param {string} repoKey - Repository key (owner/repo)
   * @param {Function} callback - Callback function
   */
  onRefresh(repoKey, callback) {
    if (!this.refreshCallbacks.has(repoKey)) {
      this.refreshCallbacks.set(repoKey, []);
    }
    this.refreshCallbacks.get(repoKey).push(callback);
  }

  /**
   * Unregister a refresh callback
   * @param {string} repoKey - Repository key (owner/repo)
   * @param {Function} callback - Callback function to remove
   */
  offRefresh(repoKey, callback) {
    const callbacks = this.refreshCallbacks.get(repoKey);
    if (callbacks) {
      const index = callbacks.indexOf(callback);
      if (index > -1) {
        callbacks.splice(index, 1);
      }
    }
  }

  /**
   * Emit refresh event to registered callbacks
   * @private
   */
  emitRefresh(repoKey, data) {
    const callbacks = this.refreshCallbacks.get(repoKey);
    if (callbacks) {
      callbacks.forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          logger.error('Error in refresh callback:', error);
        }
      });
    }
  }

  /**
   * Cache repository state
   * @param {string} owner - Repository owner
   * @param {string} repo - Repository name
   * @param {Object} state - Repository state to cache
   */
  cacheState(owner, repo, state) {
    const key = `${owner}/${repo}`;
    this.stateCache.set(key, {
      ...state,
      cached_at: new Date().toISOString()
    });
  }

  /**
   * Get cached repository state
   * @param {string} owner - Repository owner
   * @param {string} repo - Repository name
   * @returns {Object|null} Cached state or null
   */
  getCachedState(owner, repo) {
    const key = `${owner}/${repo}`;
    return this.stateCache.get(key) || null;
  }

  /**
   * Clear cached state for a repository
   * @param {string} owner - Repository owner
   * @param {string} repo - Repository name
   */
  clearCache(owner, repo) {
    const key = `${owner}/${repo}`;
    this.stateCache.delete(key);
  }

  /**
   * Perform a full repository refresh and update
   * @param {string} owner - Repository owner
   * @param {string} repo - Repository name
   * @param {Object} options - Refresh options
   * @returns {Promise<Object>} Refresh result
   */
  async performFullRefresh(owner, repo, options = {}) {
    const {
      preserveUnsavedChanges = true,
      forceRefresh = false,
      notifyCallbacks = true
    } = options;

    try {
      const repoKey = `${owner}/${repo}`;
      
      // Get current cached state
      const cachedState = this.getCachedState(owner, repo);
      
      // Refresh repository state
      const newState = await this.refreshRepositoryState(owner, repo);
      
      // Compare with cached state if available
      let comparison = null;
      if (cachedState && !forceRefresh) {
        comparison = await this.compareWithRemote(cachedState, owner, repo);
      }

      // Cache the new state
      this.cacheState(owner, repo, newState);

      const refreshResult = {
        success: true,
        repository: newState.repository,
        previousState: cachedState,
        newState,
        comparison,
        hasChanges: comparison ? comparison.needs_update : true,
        refreshed_at: new Date().toISOString(),
        preserveUnsavedChanges
      };

      // Emit refresh event to callbacks
      if (notifyCallbacks) {
        this.emitRefresh(repoKey, refreshResult);
      }

      logger.info('Repository refresh completed', {
        owner,
        repo,
        hasChanges: refreshResult.hasChanges,
        filesChanged: comparison?.comparison?.files_changed?.length || 0
      });

      return refreshResult;

    } catch (error) {
      logger.error('Repository refresh failed:', error);
      
      const errorResult = {
        success: false,
        error: error.message,
        refreshed_at: new Date().toISOString()
      };

      // Still notify callbacks about the error
      if (options.notifyCallbacks !== false) {
        this.emitRefresh(`${owner}/${repo}`, errorResult);
      }

      throw error;
    }
  }

  /**
   * Check if repository needs refresh
   * @param {string} owner - Repository owner
   * @param {string} repo - Repository name
   * @param {number} maxAge - Maximum age in milliseconds (default: 5 minutes)
   * @returns {Promise<boolean>} Whether refresh is needed
   */
  async needsRefresh(owner, repo, maxAge = 5 * 60 * 1000) {
    const cachedState = this.getCachedState(owner, repo);
    
    if (!cachedState) {
      return true; // No cached state, needs refresh
    }

    const cacheAge = Date.now() - new Date(cachedState.cached_at).getTime();
    if (cacheAge > maxAge) {
      return true; // Cache is too old
    }

    // Check if remote has newer commits
    try {
      const { data: commits } = await this.octokit.rest.repos.listCommits({
        owner,
        repo,
        per_page: 1,
      });

      const latestRemoteCommit = commits[0];
      const cachedCommit = cachedState.latestCommit;

      return latestRemoteCommit.sha !== cachedCommit.sha;
    } catch (error) {
      logger.warn('Failed to check remote commits:', error);
      return false; // Don't force refresh on error
    }
  }

  /**
   * Get repository update status
   * @param {string} owner - Repository owner
   * @param {string} repo - Repository name
   * @returns {Promise<Object>} Update status information
   */
  async getUpdateStatus(owner, repo) {
    try {
      const cachedState = this.getCachedState(owner, repo);
      const needsRefresh = await this.needsRefresh(owner, repo);
      
      let remoteInfo = null;
      if (needsRefresh) {
        try {
          // Get just the latest commit info without full refresh
          const { data: commits } = await this.octokit.rest.repos.listCommits({
            owner,
            repo,
            per_page: 1,
          });
          remoteInfo = {
            latest_commit: commits[0],
            ahead_by: cachedState ? 1 : 0 // Simplified - would need proper comparison
          };
        } catch (error) {
          logger.warn('Failed to get remote info:', error);
        }
      }

      return {
        cached_state: cachedState,
        needs_refresh: needsRefresh,
        remote_info: remoteInfo,
        last_checked: new Date().toISOString()
      };

    } catch (error) {
      logger.error('Failed to get update status:', error);
      throw error;
    }
  }
}

export default RepositoryRefreshService;