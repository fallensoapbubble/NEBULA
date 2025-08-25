/**
 * Repository Synchronization Service
 * Handles conflict detection and resolution for GitHub repositories
 */

import { Octokit } from '@octokit/rest';
import { logger } from './logger.js';

export class RepositorySyncService {
  constructor(accessToken) {
    this.octokit = new Octokit({
      auth: accessToken,
    });
  }

  /**
   * Check if remote repository has newer commits than local state
   * @param {string} owner - Repository owner
   * @param {string} repo - Repository name
   * @param {string} lastKnownSha - Last known commit SHA
   * @returns {Promise<{hasChanges: boolean, latestSha: string, commits: Array}>}
   */
  async checkForRemoteChanges(owner, repo, lastKnownSha) {
    try {
      // Get the latest commit from the default branch
      const { data: repoData } = await this.octokit.rest.repos.get({
        owner,
        repo,
      });

      const defaultBranch = repoData.default_branch;
      
      // Get commits since the last known SHA
      const { data: commits } = await this.octokit.rest.repos.listCommits({
        owner,
        repo,
        sha: defaultBranch,
        since: lastKnownSha ? new Date(await this.getCommitDate(owner, repo, lastKnownSha)) : undefined,
      });

      const latestSha = commits.length > 0 ? commits[0].sha : lastKnownSha;
      const hasChanges = lastKnownSha && latestSha !== lastKnownSha;

      return {
        hasChanges,
        latestSha,
        commits: hasChanges ? commits.filter(commit => commit.sha !== lastKnownSha) : [],
        defaultBranch,
      };
    } catch (error) {
      logger.error('Error checking for remote changes:', error);
      throw new Error(`Failed to check remote changes: ${error.message}`);
    }
  }

  /**
   * Get commit date for a specific SHA
   * @param {string} owner - Repository owner
   * @param {string} repo - Repository name
   * @param {string} sha - Commit SHA
   * @returns {Promise<string>} ISO date string
   */
  async getCommitDate(owner, repo, sha) {
    try {
      const { data: commit } = await this.octokit.rest.repos.getCommit({
        owner,
        repo,
        ref: sha,
      });
      return commit.commit.committer.date;
    } catch (error) {
      logger.error('Error getting commit date:', error);
      return new Date().toISOString();
    }
  }

  /**
   * Detect conflicts before saving content
   * @param {string} owner - Repository owner
   * @param {string} repo - Repository name
   * @param {string} path - File path
   * @param {string} expectedSha - Expected file SHA
   * @returns {Promise<{hasConflict: boolean, currentSha: string, conflictType: string}>}
   */
  async detectFileConflicts(owner, repo, path, expectedSha) {
    try {
      const { data: fileData } = await this.octokit.rest.repos.getContent({
        owner,
        repo,
        path,
      });

      const currentSha = fileData.sha;
      const hasConflict = expectedSha && currentSha !== expectedSha;

      return {
        hasConflict,
        currentSha,
        conflictType: hasConflict ? 'file_modified' : 'none',
        currentContent: fileData.content,
        encoding: fileData.encoding,
      };
    } catch (error) {
      if (error.status === 404) {
        // File was deleted
        return {
          hasConflict: expectedSha ? true : false,
          currentSha: null,
          conflictType: expectedSha ? 'file_deleted' : 'none',
        };
      }
      logger.error('Error detecting file conflicts:', error);
      throw new Error(`Failed to detect conflicts: ${error.message}`);
    }
  }

  /**
   * Get detailed conflict information for multiple files
   * @param {string} owner - Repository owner
   * @param {string} repo - Repository name
   * @param {Array} files - Array of {path, expectedSha} objects
   * @returns {Promise<Array>} Array of conflict details
   */
  async getConflictDetails(owner, repo, files) {
    const conflicts = [];

    for (const file of files) {
      try {
        const conflictInfo = await this.detectFileConflicts(
          owner,
          repo,
          file.path,
          file.expectedSha
        );

        if (conflictInfo.hasConflict) {
          conflicts.push({
            path: file.path,
            expectedSha: file.expectedSha,
            currentSha: conflictInfo.currentSha,
            conflictType: conflictInfo.conflictType,
            currentContent: conflictInfo.currentContent,
            encoding: conflictInfo.encoding,
          });
        }
      } catch (error) {
        conflicts.push({
          path: file.path,
          expectedSha: file.expectedSha,
          error: error.message,
          conflictType: 'error',
        });
      }
    }

    return conflicts;
  }

  /**
   * Create a conflict resolution strategy
   * @param {Array} conflicts - Array of conflict objects
   * @returns {Object} Resolution strategy options
   */
  createResolutionStrategy(conflicts) {
    const strategies = {
      overwrite: {
        name: 'Overwrite Remote Changes',
        description: 'Your changes will overwrite the remote changes',
        risk: 'high',
        action: 'force_push',
      },
      merge: {
        name: 'Merge Changes',
        description: 'Attempt to merge your changes with remote changes',
        risk: 'medium',
        action: 'merge',
        available: conflicts.every(c => c.conflictType === 'file_modified'),
      },
      refresh: {
        name: 'Refresh and Retry',
        description: 'Load latest changes and retry your edits',
        risk: 'low',
        action: 'refresh',
      },
      cancel: {
        name: 'Cancel Changes',
        description: 'Discard your changes and keep remote version',
        risk: 'low',
        action: 'cancel',
      },
    };

    return {
      conflicts,
      strategies,
      recommended: this.getRecommendedStrategy(conflicts),
    };
  }

  /**
   * Get recommended resolution strategy based on conflict types
   * @param {Array} conflicts - Array of conflict objects
   * @returns {string} Recommended strategy key
   */
  getRecommendedStrategy(conflicts) {
    const hasFileDeleted = conflicts.some(c => c.conflictType === 'file_deleted');
    const hasErrors = conflicts.some(c => c.conflictType === 'error');
    const allModified = conflicts.every(c => c.conflictType === 'file_modified');

    if (hasErrors) return 'refresh';
    if (hasFileDeleted) return 'refresh';
    if (allModified && conflicts.length === 1) return 'merge';
    return 'refresh';
  }
}

/**
 * Create repository sync service instance
 * @param {string} accessToken - GitHub access token
 * @param {object} options - Service options
 * @returns {RepositorySyncService} Repository sync service instance
 */
export function createRepositorySyncService(accessToken, options = {}) {
  return new RepositorySyncService(accessToken, options);
}

export default RepositorySyncService;