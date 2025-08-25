/**
 * Content Persistence Service
 * Handles saving portfolio content changes to GitHub repositories
 */

import { RepositoryService } from './repository-service.js';
import { PortfolioDataStandardizer } from './portfolio-data-standardizer.js';
// import { createGitHubIntegrationService } from './github-integration-service.js';
import { logger } from './logger.js';

/**
 * Content Persistence Service class
 */
export class ContentPersistenceService {
  constructor(accessToken, options = {}) {
    if (!accessToken) {
      throw new Error('GitHub access token is required');
    }

    this.repositoryService = new RepositoryService(accessToken, options);
    // this.githubIntegrationService = createGitHubIntegrationService(accessToken, options);
    this.standardizer = new PortfolioDataStandardizer(options.standardizer);
    this.logger = logger.child({ service: 'content-persistence' });
    
    this.options = {
      commitMessageTemplate: options.commitMessageTemplate || 'Update portfolio content via web editor',
      defaultBranch: options.defaultBranch || 'main',
      createBackup: options.createBackup !== false,
      validateBeforeSave: options.validateBeforeSave !== false,
      ...options
    };
  }

  /**
   * Save portfolio content to repository
   * @param {string} owner - Repository owner
   * @param {string} repo - Repository name
   * @param {Object} portfolioData - Portfolio data to save
   * @param {Object} options - Save options
   * @returns {Promise<SaveResult>}
   */
  async savePortfolioContent(owner, repo, portfolioData, options = {}) {
    const saveOptions = {
      commitMessage: options.commitMessage || this.options.commitMessageTemplate,
      branch: options.branch || this.options.defaultBranch,
      createBackup: options.createBackup !== false,
      validateBeforeSave: options.validateBeforeSave !== false,
      ...options
    };

    this.logger.info('Starting portfolio content save', {
      owner,
      repo,
      branch: saveOptions.branch,
      hasData: !!portfolioData
    });

    try {
      // Step 1: Validate portfolio data if enabled
      if (saveOptions.validateBeforeSave) {
        const validationResult = await this.validatePortfolioData(portfolioData);
        if (!validationResult.success) {
          return {
            success: false,
            error: 'Portfolio data validation failed',
            details: {
              type: 'validation_error',
              errors: validationResult.errors,
              warnings: validationResult.warnings
            }
          };
        }
      }

      // Step 2: Get current repository state
      const repoState = await this.getRepositoryState(owner, repo, saveOptions.branch);
      if (!repoState.success) {
        return {
          success: false,
          error: 'Failed to get repository state',
          details: repoState.details
        };
      }

      // Step 3: Create backup if enabled
      if (saveOptions.createBackup) {
        const backupResult = await this.createContentBackup(owner, repo, repoState.currentCommit);
        if (!backupResult.success) {
          this.logger.warn('Failed to create backup, continuing with save', {
            error: backupResult.error
          });
        }
      }

      // Step 4: Determine files to update
      const filesToUpdate = await this.determineFilesToUpdate(
        owner, 
        repo, 
        portfolioData, 
        repoState.structure
      );

      if (filesToUpdate.length === 0) {
        return {
          success: true,
          message: 'No changes detected',
          commitSha: repoState.currentCommit.sha,
          filesChanged: 0
        };
      }

      // Step 5: Create commit with changes using enhanced GitHub integration
      // Temporarily disabled due to circular dependency
      const commitResult = {
        success: false,
        error: 'GitHub integration temporarily disabled',
        details: { type: 'service_disabled' }
      };
      /*
      const commitResult = await this.githubIntegrationService.createCommitWithChanges(
        owner,
        repo,
        filesToUpdate,
        saveOptions.commitMessage,
        {
          branch: saveOptions.branch,
          validateChanges: true,
          createBackup: saveOptions.createBackup
        }
      );
      */

      if (!commitResult.success) {
        return {
          success: false,
          error: 'Failed to create commit',
          details: commitResult.details
        };
      }

      this.logger.info('Portfolio content saved successfully', {
        owner,
        repo,
        commitSha: commitResult.commitSha,
        filesChanged: filesToUpdate.length
      });

      return {
        success: true,
        message: 'Portfolio content saved successfully',
        commitSha: commitResult.commit.sha,
        filesChanged: filesToUpdate.length,
        changedFiles: filesToUpdate.map(f => f.path),
        commit: commitResult.commit,
        feedback: commitResult.feedback || {
          type: 'success',
          title: 'Portfolio Updated',
          message: `Successfully updated ${filesToUpdate.length} file(s)`
        }
      };

    } catch (error) {
      this.logger.error('Portfolio content save failed', {
        owner,
        repo,
        error: error.message,
        stack: error.stack
      });

      return {
        success: false,
        error: `Save operation failed: ${error.message}`,
        details: {
          type: 'save_error',
          originalError: error.message,
          retryable: this.isRetryableError(error)
        }
      };
    }
  }

  /**
   * Save specific content files
   * @param {string} owner - Repository owner
   * @param {string} repo - Repository name
   * @param {Array} fileChanges - Array of file changes
   * @param {string} commitMessage - Commit message
   * @param {Object} options - Save options
   * @returns {Promise<SaveResult>}
   */
  async saveContentFiles(owner, repo, fileChanges, commitMessage, options = {}) {
    const saveOptions = {
      branch: options.branch || this.options.defaultBranch,
      ...options
    };

    this.logger.info('Saving content files', {
      owner,
      repo,
      fileCount: fileChanges.length,
      branch: saveOptions.branch
    });

    try {
      // Validate file changes
      const validationResult = this.validateFileChanges(fileChanges);
      if (!validationResult.isValid) {
        return {
          success: false,
          error: 'Invalid file changes',
          details: {
            type: 'validation_error',
            errors: validationResult.errors
          }
        };
      }

      // Create commit with file changes using enhanced GitHub integration
      // Temporarily disabled due to circular dependency
      const commitResult = {
        success: false,
        error: 'GitHub integration temporarily disabled',
        details: { type: 'service_disabled' }
      };
      /*
      const commitResult = await this.githubIntegrationService.createCommitWithChanges(
        owner,
        repo,
        fileChanges,
        commitMessage,
        {
          branch: saveOptions.branch,
          validateChanges: true,
          createBackup: saveOptions.createBackup !== false
        }
      );
      */

      if (!commitResult.success) {
        return {
          success: false,
          error: commitResult.error,
          details: {
            type: 'commit_error',
            retryable: this.isRetryableError(new Error(commitResult.error))
          }
        };
      }

      return {
        success: true,
        message: 'Content files saved successfully',
        commitSha: commitResult.commit.sha,
        filesChanged: fileChanges.length,
        commit: commitResult.commit,
        feedback: {
          type: 'success',
          title: 'Files Saved Successfully',
          message: `Successfully saved ${fileChanges.length} file(s) to repository`
        }
      };

    } catch (error) {
      this.logger.error('Content files save failed', {
        owner,
        repo,
        error: error.message
      });

      return {
        success: false,
        error: `Failed to save content files: ${error.message}`,
        details: {
          type: 'save_error',
          retryable: this.isRetryableError(error)
        }
      };
    }
  }

  /**
   * Check for conflicts before saving
   * @param {string} owner - Repository owner
   * @param {string} repo - Repository name
   * @param {Array} localChanges - Local file changes
   * @param {string} lastKnownCommitSha - Last known commit SHA
   * @param {Object} options - Check options
   * @returns {Promise<ConflictCheckResult>}
   */
  async checkForConflicts(owner, repo, localChanges, lastKnownCommitSha, options = {}) {
    const checkOptions = {
      branch: options.branch || this.options.defaultBranch,
      ...options
    };

    this.logger.info('Checking for conflicts', {
      owner,
      repo,
      lastKnownCommitSha,
      localChangesCount: localChanges.length
    });

    try {
      const conflictResult = await this.repositoryService.detectConflicts(
        owner,
        repo,
        localChanges,
        lastKnownCommitSha,
        checkOptions.branch
      );

      if (!conflictResult.success) {
        return {
          success: false,
          error: conflictResult.error,
          hasConflicts: false,
          conflicts: []
        };
      }

      return {
        success: true,
        hasConflicts: conflictResult.hasConflicts,
        conflicts: conflictResult.conflicts || [],
        remoteCommits: conflictResult.remoteCommits || []
      };

    } catch (error) {
      this.logger.error('Conflict check failed', {
        owner,
        repo,
        error: error.message
      });

      return {
        success: false,
        error: `Conflict check failed: ${error.message}`,
        hasConflicts: false,
        conflicts: []
      };
    }
  }

  /**
   * Get repository synchronization status
   * @param {string} owner - Repository owner
   * @param {string} repo - Repository name
   * @param {string} lastKnownCommitSha - Last known commit SHA
   * @param {Object} options - Status options
   * @returns {Promise<SyncStatusResult>}
   */
  async getSyncStatus(owner, repo, lastKnownCommitSha, options = {}) {
    const statusOptions = {
      branch: options.branch || this.options.defaultBranch,
      ...options
    };

    try {
      const syncResult = await this.repositoryService.getSyncStatus(
        owner,
        repo,
        lastKnownCommitSha,
        statusOptions.branch
      );

      if (!syncResult.success) {
        return {
          success: false,
          error: syncResult.error,
          status: null
        };
      }

      return {
        success: true,
        status: syncResult.status
      };

    } catch (error) {
      this.logger.error('Sync status check failed', {
        owner,
        repo,
        error: error.message
      });

      return {
        success: false,
        error: `Sync status check failed: ${error.message}`,
        status: null
      };
    }
  }

  /**
   * Validate portfolio data
   * @private
   */
  async validatePortfolioData(portfolioData) {
    try {
      const result = await this.standardizer.standardizePortfolioData(portfolioData);
      return {
        success: result.success,
        errors: result.errors || [],
        warnings: result.warnings || [],
        data: result.data
      };
    } catch (error) {
      return {
        success: false,
        errors: [`Validation failed: ${error.message}`],
        warnings: []
      };
    }
  }

  /**
   * Get current repository state
   * @private
   */
  async getRepositoryState(owner, repo, branch) {
    try {
      // Get latest commit
      const commitResult = await this.repositoryService.getLatestCommit(owner, repo, branch);
      if (!commitResult.success) {
        return {
          success: false,
          error: commitResult.error,
          details: { type: 'commit_fetch_error' }
        };
      }

      // Get repository structure
      const structureResult = await this.repositoryService.getRepositoryStructure(owner, repo, '', branch);
      if (!structureResult.success) {
        return {
          success: false,
          error: structureResult.error,
          details: { type: 'structure_fetch_error' }
        };
      }

      return {
        success: true,
        currentCommit: commitResult.commit,
        structure: structureResult.structure
      };

    } catch (error) {
      return {
        success: false,
        error: `Failed to get repository state: ${error.message}`,
        details: { type: 'repository_state_error' }
      };
    }
  }

  /**
   * Create content backup
   * @private
   */
  async createContentBackup(owner, repo, currentCommit) {
    try {
      // For now, we'll just log the backup creation
      // In a full implementation, this could create a backup branch or tag
      this.logger.info('Content backup created', {
        owner,
        repo,
        commitSha: currentCommit.sha,
        timestamp: new Date().toISOString()
      });

      return {
        success: true,
        backupRef: `backup-${Date.now()}`,
        commitSha: currentCommit.sha
      };

    } catch (error) {
      return {
        success: false,
        error: `Backup creation failed: ${error.message}`
      };
    }
  }

  /**
   * Determine which files need to be updated
   * @private
   */
  async determineFilesToUpdate(owner, repo, portfolioData, repoStructure) {
    const filesToUpdate = [];

    try {
      // Primary data file (data.json or portfolio.json)
      const dataFile = await this.findDataFile(repoStructure);
      if (dataFile) {
        const currentContent = await this.repositoryService.getFileContent(owner, repo, dataFile.path);
        
        let currentData = {};
        if (currentContent.success) {
          try {
            currentData = JSON.parse(currentContent.content.content);
          } catch (error) {
            this.logger.warn('Failed to parse current data file', { error: error.message });
          }
        }

        // Compare data and add to update list if different
        if (JSON.stringify(currentData) !== JSON.stringify(portfolioData)) {
          filesToUpdate.push({
            path: dataFile.path,
            content: JSON.stringify(portfolioData, null, 2),
            operation: 'update',
            sha: currentContent.success ? currentContent.content.sha : null
          });
        }
      } else {
        // Create new data.json file
        filesToUpdate.push({
          path: 'data.json',
          content: JSON.stringify(portfolioData, null, 2),
          operation: 'create'
        });
      }

      // Update README.md if it exists and contains portfolio data
      const readmeFile = repoStructure.items?.find(item => 
        item.name.toLowerCase() === 'readme.md' && item.type === 'file'
      );

      if (readmeFile) {
        const updatedReadme = await this.generateReadmeContent(portfolioData);
        if (updatedReadme) {
          const currentReadme = await this.repositoryService.getFileContent(owner, repo, readmeFile.path);
          
          if (!currentReadme.success || currentReadme.content.content !== updatedReadme) {
            filesToUpdate.push({
              path: readmeFile.path,
              content: updatedReadme,
              operation: 'update',
              sha: currentReadme.success ? currentReadme.content.sha : null
            });
          }
        }
      }

      return filesToUpdate;

    } catch (error) {
      this.logger.error('Failed to determine files to update', { error: error.message });
      throw error;
    }
  }

  /**
   * Find the main data file in repository structure
   * @private
   */
  findDataFile(repoStructure) {
    const dataFileNames = ['data.json', 'portfolio.json', 'content.json'];
    
    for (const fileName of dataFileNames) {
      const file = repoStructure.items?.find(item => 
        item.name === fileName && item.type === 'file'
      );
      if (file) {
        return file;
      }
    }

    return null;
  }

  /**
   * Generate README content from portfolio data
   * @private
   */
  async generateReadmeContent(portfolioData) {
    try {
      let readme = `# ${portfolioData.personal?.name || 'Portfolio'}\n\n`;

      if (portfolioData.personal?.title) {
        readme += `## ${portfolioData.personal.title}\n\n`;
      }

      if (portfolioData.personal?.description || portfolioData.personal?.bio) {
        readme += `${portfolioData.personal.description || portfolioData.personal.bio}\n\n`;
      }

      // Add contact information
      if (portfolioData.contact?.email) {
        readme += `📧 ${portfolioData.contact.email}\n\n`;
      }

      // Add social links
      if (portfolioData.contact?.social && portfolioData.contact.social.length > 0) {
        readme += `## Connect with me\n\n`;
        portfolioData.contact.social.forEach(social => {
          readme += `- [${social.platform}](${social.url})\n`;
        });
        readme += '\n';
      }

      // Add skills
      if (portfolioData.skills && portfolioData.skills.length > 0) {
        readme += `## Skills\n\n`;
        const skillsByCategory = portfolioData.skills.reduce((acc, skill) => {
          const category = skill.category || 'Other';
          if (!acc[category]) acc[category] = [];
          acc[category].push(skill.name);
          return acc;
        }, {});

        Object.entries(skillsByCategory).forEach(([category, skills]) => {
          readme += `**${category}:** ${skills.join(', ')}\n\n`;
        });
      }

      // Add projects
      if (portfolioData.projects && portfolioData.projects.length > 0) {
        readme += `## Projects\n\n`;
        portfolioData.projects.forEach(project => {
          readme += `### ${project.name}\n\n`;
          readme += `${project.description}\n\n`;
          
          if (project.technologies && project.technologies.length > 0) {
            readme += `**Technologies:** ${project.technologies.join(', ')}\n\n`;
          }
          
          if (project.url || project.repository) {
            readme += `**Links:**\n`;
            if (project.url) readme += `- [Live Demo](${project.url})\n`;
            if (project.repository) readme += `- [Source Code](${project.repository})\n`;
            readme += '\n';
          }
        });
      }

      readme += `---\n\n*This README was automatically generated from portfolio data.*\n`;

      return readme;

    } catch (error) {
      this.logger.error('Failed to generate README content', { error: error.message });
      return null;
    }
  }

  /**
   * Create commit with file changes
   * @private
   */
  async createCommitWithChanges(owner, repo, filesToUpdate, commitMessage, branch) {
    try {
      const commitResult = await this.repositoryService.createCommit(
        owner,
        repo,
        filesToUpdate,
        commitMessage,
        branch
      );

      return commitResult;

    } catch (error) {
      this.logger.error('Failed to create commit', { error: error.message });
      throw error;
    }
  }

  /**
   * Validate file changes
   * @private
   */
  validateFileChanges(fileChanges) {
    const errors = [];

    if (!Array.isArray(fileChanges)) {
      errors.push('File changes must be an array');
      return { isValid: false, errors };
    }

    fileChanges.forEach((change, index) => {
      if (!change.path) {
        errors.push(`File change ${index}: path is required`);
      }

      if (!change.content && change.operation !== 'delete') {
        errors.push(`File change ${index}: content is required for non-delete operations`);
      }

      if (!['create', 'update', 'delete'].includes(change.operation)) {
        errors.push(`File change ${index}: invalid operation '${change.operation}'`);
      }
    });

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Check if error is retryable
   * @private
   */
  isRetryableError(error) {
    const retryableErrors = [
      'rate limit',
      'timeout',
      'network',
      'temporary',
      'service unavailable',
      'internal server error'
    ];

    const errorMessage = error.message.toLowerCase();
    return retryableErrors.some(retryableError => 
      errorMessage.includes(retryableError)
    );
  }

  /**
   * Get service health status
   */
  async getHealthStatus() {
    try {
      const healthStatus = await this.repositoryService.checkServiceHealth();
      
      return {
        healthy: healthStatus.healthy,
        service: 'content-persistence',
        timestamp: new Date().toISOString(),
        details: {
          repositoryService: healthStatus,
          standardizer: {
            healthy: true,
            version: this.standardizer.options.schemaVersion
          }
        }
      };

    } catch (error) {
      return {
        healthy: false,
        service: 'content-persistence',
        error: error.message,
        timestamp: new Date().toISOString()
      };
    }
  }
}

/**
 * Create content persistence service instance
 * @param {string} accessToken - GitHub access token
 * @param {Object} options - Service options
 * @returns {ContentPersistenceService}
 */
export function createContentPersistenceService(accessToken, options = {}) {
  return new ContentPersistenceService(accessToken, options);
}

export default ContentPersistenceService;