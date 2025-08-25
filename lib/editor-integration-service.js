/**
 * Editor Integration Service
 * Connects web editor with repository management and live portfolio rendering
 */

import { createServicesForSession } from './service-factory.js';
import { logger } from './logger.js';

/**
 * Editor Integration Service
 * Provides seamless integration between editor, repository operations, and live portfolio updates
 */
export class EditorIntegrationService {
  constructor(session, options = {}) {
    if (!session?.accessToken) {
      throw new Error('Valid session with access token is required');
    }

    this.session = session;
    this.options = {
      enableLivePreview: true,
      enableAutoSync: true,
      conflictResolution: 'prompt', // 'prompt', 'auto-merge', 'keep-local', 'keep-remote'
      ...options
    };

    // Initialize services
    this.services = createServicesForSession(session, options);
    this.logger = logger.child({ 
      service: 'editor-integration',
      userId: session.user?.id 
    });

    // Cache for repository states
    this.repositoryCache = new Map();
  }

  /**
   * Initialize editor for a repository
   * @param {string} owner - Repository owner
   * @param {string} repo - Repository name
   * @returns {Promise<{success: boolean, data?: object, error?: string}>}
   */
  async initializeEditor(owner, repo) {
    try {
      this.logger.info('Initializing editor', { owner, repo });

      // Validate repository access
      const repositoryService = this.services.getRepositoryService();
      const accessCheck = await this.validateRepositoryAccess(owner, repo, 'write');
      
      if (!accessCheck.allowed) {
        return {
          success: false,
          error: accessCheck.error,
          details: accessCheck.details
        };
      }

      // Load repository data in parallel
      const [
        repositoryStructure,
        portfolioData,
        latestCommit,
        syncStatus
      ] = await Promise.all([
        this.getRepositoryStructure(owner, repo),
        this.getPortfolioData(owner, repo),
        repositoryService.getLatestCommit(owner, repo),
        this.getSyncStatus(owner, repo)
      ]);

      // Cache repository state
      const repositoryState = {
        owner,
        repo,
        structure: repositoryStructure.success ? repositoryStructure.structure : null,
        portfolioData: portfolioData.success ? portfolioData.data : {},
        latestCommit: latestCommit.success ? latestCommit.commit : null,
        syncStatus: syncStatus.success ? syncStatus.status : null,
        lastUpdated: new Date().toISOString()
      };

      this.repositoryCache.set(`${owner}/${repo}`, repositoryState);

      return {
        success: true,
        data: {
          repository: {
            owner,
            repo,
            fullName: `${owner}/${repo}`,
            url: `https://github.com/${owner}/${repo}`,
            editorUrl: `/editor/${owner}/${repo}`,
            portfolioUrl: `/${owner}/${repo}`
          },
          structure: repositoryState.structure,
          portfolioData: repositoryState.portfolioData,
          commit: repositoryState.latestCommit,
          syncStatus: repositoryState.syncStatus,
          permissions: {
            canRead: true,
            canWrite: true,
            canEdit: true
          }
        }
      };

    } catch (error) {
      this.logger.error('Failed to initialize editor', {
        owner,
        repo,
        error: error.message
      });

      return {
        success: false,
        error: 'Failed to initialize editor',
        details: error.message
      };
    }
  }

  /**
   * Save content with integrated repository management
   * @param {string} owner - Repository owner
   * @param {string} repo - Repository name
   * @param {object} portfolioData - Portfolio data to save
   * @param {object} options - Save options
   * @returns {Promise<{success: boolean, data?: object, error?: string}>}
   */
  async saveContent(owner, repo, portfolioData, options = {}) {
    try {
      this.logger.info('Saving content with integration', { owner, repo });

      // Check for conflicts before saving
      const conflictCheck = await this.checkForConflicts(owner, repo, portfolioData);
      
      if (conflictCheck.hasConflicts) {
        const resolution = await this.handleConflicts(
          owner, 
          repo, 
          conflictCheck.conflicts, 
          options.conflictResolution || this.options.conflictResolution
        );

        if (!resolution.success) {
          return {
            success: false,
            error: 'Conflict resolution failed',
            conflicts: conflictCheck.conflicts,
            details: resolution.error
          };
        }
      }

      // Save content using persistence service
      const persistenceService = this.services.getContentPersistenceService();
      const saveResult = await persistenceService.savePortfolioContent(
        owner,
        repo,
        portfolioData,
        {
          commitMessage: options.commitMessage || `Update portfolio content via web editor

Updated by: ${this.session.user.name || this.session.user.login}
Timestamp: ${new Date().toISOString()}`,
          branch: options.branch,
          validateBeforeSave: options.validateBeforeSave !== false,
          createBackup: options.createBackup !== false
        }
      );

      if (!saveResult.success) {
        return saveResult;
      }

      // Update repository cache
      await this.updateRepositoryCache(owner, repo, {
        portfolioData,
        latestCommit: saveResult.commit,
        lastUpdated: new Date().toISOString()
      });

      // Trigger live preview update if enabled
      if (this.options.enableLivePreview) {
        await this.triggerLivePreviewUpdate(owner, repo, portfolioData);
      }

      // Sync with repository if enabled
      if (this.options.enableAutoSync) {
        await this.syncRepository(owner, repo);
      }

      return {
        success: true,
        data: {
          commit: saveResult.commit,
          filesChanged: saveResult.filesChanged,
          portfolioUrl: `/${owner}/${repo}`,
          editorUrl: `/editor/${owner}/${repo}`,
          repositoryUrl: `https://github.com/${owner}/${repo}`,
          livePreviewEnabled: this.options.enableLivePreview
        }
      };

    } catch (error) {
      this.logger.error('Failed to save content with integration', {
        owner,
        repo,
        error: error.message
      });

      return {
        success: false,
        error: 'Failed to save content',
        details: error.message
      };
    }
  }

  /**
   * Navigate between editor and portfolio view
   * @param {string} owner - Repository owner
   * @param {string} repo - Repository name
   * @param {string} mode - Navigation mode ('editor', 'portfolio', 'repository')
   * @param {object} options - Navigation options
   * @returns {Promise<{success: boolean, url?: string, error?: string}>}
   */
  async navigate(owner, repo, mode, options = {}) {
    try {
      const baseUrls = {
        editor: `/editor/${owner}/${repo}`,
        portfolio: `/${owner}/${repo}`,
        repository: `https://github.com/${owner}/${repo}`
      };

      let url = baseUrls[mode];
      
      if (!url) {
        return {
          success: false,
          error: `Invalid navigation mode: ${mode}`
        };
      }

      // Add query parameters if provided
      if (options.params) {
        const searchParams = new URLSearchParams(options.params);
        url += `?${searchParams.toString()}`;
      }

      // Add hash if provided
      if (options.hash) {
        url += `#${options.hash}`;
      }

      return {
        success: true,
        url,
        mode,
        repository: `${owner}/${repo}`
      };

    } catch (error) {
      this.logger.error('Navigation failed', {
        owner,
        repo,
        mode,
        error: error.message
      });

      return {
        success: false,
        error: 'Navigation failed',
        details: error.message
      };
    }
  }

  /**
   * Get repository structure for editor
   * @param {string} owner - Repository owner
   * @param {string} repo - Repository name
   * @returns {Promise<{success: boolean, structure?: object, error?: string}>}
   */
  async getRepositoryStructure(owner, repo) {
    try {
      const repositoryService = this.services.getRepositoryService();
      return await repositoryService.getRepositoryStructure(owner, repo);
    } catch (error) {
      this.logger.error('Failed to get repository structure', {
        owner,
        repo,
        error: error.message
      });

      return {
        success: false,
        error: 'Failed to get repository structure',
        details: error.message
      };
    }
  }

  /**
   * Get portfolio data for editor
   * @param {string} owner - Repository owner
   * @param {string} repo - Repository name
   * @returns {Promise<{success: boolean, data?: object, error?: string}>}
   */
  async getPortfolioData(owner, repo) {
    try {
      const githubIntegrationService = this.services.getGitHubIntegrationService();
      return await githubIntegrationService.getPortfolioData(owner, repo);
    } catch (error) {
      this.logger.error('Failed to get portfolio data', {
        owner,
        repo,
        error: error.message
      });

      return {
        success: false,
        error: 'Failed to get portfolio data',
        details: error.message
      };
    }
  }

  /**
   * Check for conflicts before saving
   * @param {string} owner - Repository owner
   * @param {string} repo - Repository name
   * @param {object} localData - Local portfolio data
   * @returns {Promise<{hasConflicts: boolean, conflicts?: Array}>}
   */
  async checkForConflicts(owner, repo, localData) {
    try {
      const repositoryService = this.services.getRepositoryService();
      const cachedState = this.repositoryCache.get(`${owner}/${repo}`);
      
      if (!cachedState?.latestCommit?.sha) {
        return { hasConflicts: false, conflicts: [] };
      }

      // Convert portfolio data to file changes for conflict detection
      const localChanges = this.portfolioDataToFileChanges(localData);
      
      return await repositoryService.detectConflicts(
        owner,
        repo,
        localChanges,
        cachedState.latestCommit.sha
      );

    } catch (error) {
      this.logger.error('Conflict check failed', {
        owner,
        repo,
        error: error.message
      });

      return { hasConflicts: false, conflicts: [] };
    }
  }

  /**
   * Handle conflicts based on resolution strategy
   * @param {string} owner - Repository owner
   * @param {string} repo - Repository name
   * @param {Array} conflicts - Array of conflicts
   * @param {string} strategy - Resolution strategy
   * @returns {Promise<{success: boolean, error?: string}>}
   */
  async handleConflicts(owner, repo, conflicts, strategy) {
    try {
      const repositoryService = this.services.getRepositoryService();
      
      switch (strategy) {
        case 'keep-local':
          return await repositoryService.resolveConflicts(
            owner, 
            repo, 
            conflicts, 
            'keep_local'
          );
          
        case 'keep-remote':
          return await repositoryService.resolveConflicts(
            owner, 
            repo, 
            conflicts, 
            'keep_remote'
          );
          
        case 'auto-merge':
          // Implement auto-merge logic here
          return { success: true };
          
        case 'prompt':
        default:
          // Return conflicts for user resolution
          return {
            success: false,
            error: 'User intervention required for conflict resolution',
            requiresUserInput: true,
            conflicts
          };
      }

    } catch (error) {
      this.logger.error('Conflict resolution failed', {
        owner,
        repo,
        strategy,
        error: error.message
      });

      return {
        success: false,
        error: 'Conflict resolution failed',
        details: error.message
      };
    }
  }

  /**
   * Get synchronization status
   * @param {string} owner - Repository owner
   * @param {string} repo - Repository name
   * @returns {Promise<{success: boolean, status?: object, error?: string}>}
   */
  async getSyncStatus(owner, repo) {
    try {
      const repositoryService = this.services.getRepositoryService();
      const cachedState = this.repositoryCache.get(`${owner}/${repo}`);
      
      if (!cachedState?.latestCommit?.sha) {
        const latestCommit = await repositoryService.getLatestCommit(owner, repo);
        if (!latestCommit.success) {
          return latestCommit;
        }
        
        return {
          success: true,
          status: {
            upToDate: true,
            lastKnownSha: latestCommit.commit.sha,
            latestSha: latestCommit.commit.sha,
            newCommitsCount: 0
          }
        };
      }

      return await repositoryService.getSyncStatus(
        owner,
        repo,
        cachedState.latestCommit.sha
      );

    } catch (error) {
      this.logger.error('Failed to get sync status', {
        owner,
        repo,
        error: error.message
      });

      return {
        success: false,
        error: 'Failed to get sync status',
        details: error.message
      };
    }
  }

  /**
   * Sync repository with remote changes
   * @param {string} owner - Repository owner
   * @param {string} repo - Repository name
   * @returns {Promise<{success: boolean, changes?: object, error?: string}>}
   */
  async syncRepository(owner, repo) {
    try {
      const syncService = this.services.getRepositorySyncService();
      return await syncService.syncRepository(owner, repo);
    } catch (error) {
      this.logger.error('Repository sync failed', {
        owner,
        repo,
        error: error.message
      });

      return {
        success: false,
        error: 'Repository sync failed',
        details: error.message
      };
    }
  }

  /**
   * Trigger live preview update
   * @param {string} owner - Repository owner
   * @param {string} repo - Repository name
   * @param {object} portfolioData - Updated portfolio data
   * @returns {Promise<void>}
   */
  async triggerLivePreviewUpdate(owner, repo, portfolioData) {
    try {
      // This could trigger a webhook, WebSocket update, or cache invalidation
      // For now, we'll just log the update
      this.logger.info('Live preview update triggered', {
        owner,
        repo,
        portfolioUrl: `/${owner}/${repo}`
      });

      // In a real implementation, this might:
      // 1. Invalidate CDN cache for the portfolio URL
      // 2. Send WebSocket update to connected clients
      // 3. Trigger a rebuild of static assets
      // 4. Update search indexes

    } catch (error) {
      this.logger.error('Live preview update failed', {
        owner,
        repo,
        error: error.message
      });
    }
  }

  /**
   * Validate repository access
   * @param {string} owner - Repository owner
   * @param {string} repo - Repository name
   * @param {string} permission - Required permission
   * @returns {Promise<{allowed: boolean, error?: string, details?: object}>}
   */
  async validateRepositoryAccess(owner, repo, permission) {
    // User always has access to their own repositories
    if (this.session.user.login === owner) {
      return { allowed: true };
    }

    // For other repositories, check via GitHub API
    try {
      const repositoryService = this.services.getRepositoryService();
      const { data: repoData } = await repositoryService.octokit.rest.repos.get({
        owner,
        repo
      });

      // Check if repository is public (read access for everyone)
      if (permission === 'read' && !repoData.private) {
        return { allowed: true };
      }

      // For write access or private repositories, check collaborator status
      if (permission === 'write' || repoData.private) {
        try {
          const { data: permissionData } = await repositoryService.octokit.rest.repos.getCollaboratorPermissionLevel({
            owner,
            repo,
            username: this.session.user.login
          });

          const userPermission = permissionData.permission;
          const hasWriteAccess = ['write', 'maintain', 'admin'].includes(userPermission);

          return { 
            allowed: permission === 'write' ? hasWriteAccess : true 
          };

        } catch (permissionError) {
          return { 
            allowed: false, 
            error: 'Access denied or repository not found',
            details: { type: 'AccessDeniedError' }
          };
        }
      }

      return { allowed: true };

    } catch (error) {
      this.logger.error('Repository access validation failed', {
        owner,
        repo,
        permission,
        error: error.message
      });

      return { 
        allowed: false, 
        error: 'Failed to validate repository access',
        details: { type: 'ValidationError', message: error.message }
      };
    }
  }

  /**
   * Update repository cache
   * @param {string} owner - Repository owner
   * @param {string} repo - Repository name
   * @param {object} updates - Cache updates
   */
  async updateRepositoryCache(owner, repo, updates) {
    const cacheKey = `${owner}/${repo}`;
    const existing = this.repositoryCache.get(cacheKey) || {};
    
    this.repositoryCache.set(cacheKey, {
      ...existing,
      ...updates,
      lastUpdated: new Date().toISOString()
    });
  }

  /**
   * Convert portfolio data to file changes for conflict detection
   * @param {object} portfolioData - Portfolio data
   * @returns {Array} Array of file changes
   */
  portfolioDataToFileChanges(portfolioData) {
    // This is a simplified implementation
    // In practice, this would map portfolio data to actual file changes
    return [
      {
        path: 'data.json',
        content: JSON.stringify(portfolioData, null, 2),
        operation: 'update'
      }
    ];
  }

  /**
   * Clear repository cache
   * @param {string} owner - Repository owner
   * @param {string} repo - Repository name
   */
  clearCache(owner, repo) {
    if (owner && repo) {
      this.repositoryCache.delete(`${owner}/${repo}`);
    } else {
      this.repositoryCache.clear();
    }
  }

  /**
   * Get cache statistics
   * @returns {object} Cache statistics
   */
  getCacheStats() {
    return {
      size: this.repositoryCache.size,
      repositories: Array.from(this.repositoryCache.keys())
    };
  }
}

/**
 * Create editor integration service
 * @param {object} session - User session
 * @param {object} options - Service options
 * @returns {EditorIntegrationService} Service instance
 */
export function createEditorIntegrationService(session, options = {}) {
  return new EditorIntegrationService(session, options);
}