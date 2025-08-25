import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ContentPersistenceService, createContentPersistenceService } from '../content-persistence-service.js';

// Mock dependencies
vi.mock('../repository-service.js', () => ({
  RepositoryService: vi.fn(() => ({
    detectConflicts: vi.fn(),
    getSyncStatus: vi.fn(),
    getLatestCommit: vi.fn(),
    getRepositoryStructure: vi.fn(),
    getFileContent: vi.fn(),
    checkServiceHealth: vi.fn()
  }))
}));

vi.mock('../portfolio-data-standardizer.js', () => ({
  PortfolioDataStandardizer: vi.fn(() => ({
    standardizePortfolioData: vi.fn(),
    options: { schemaVersion: '1.0.0' }
  }))
}));

vi.mock('../github-integration-service.js', () => ({
  createGitHubIntegrationService: vi.fn(() => ({
    createCommitWithChanges: vi.fn()
  }))
}));

vi.mock('../logger.js', () => ({
  logger: {
    child: vi.fn(() => ({
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
      debug: vi.fn()
    }))
  }
}));

describe('ContentPersistenceService', () => {
  let contentPersistenceService;
  let mockRepositoryService;
  let mockGitHubIntegrationService;
  let mockStandardizer;
  let mockLogger;

  beforeEach(() => {
    const { RepositoryService } = require('../repository-service.js');
    const { PortfolioDataStandardizer } = require('../portfolio-data-standardizer.js');
    const { createGitHubIntegrationService } = require('../github-integration-service.js');
    const { logger } = require('../logger.js');

    mockRepositoryService = {
      detectConflicts: vi.fn(),
      getSyncStatus: vi.fn(),
      getLatestCommit: vi.fn(),
      getRepositoryStructure: vi.fn(),
      getFileContent: vi.fn(),
      checkServiceHealth: vi.fn()
    };

    mockGitHubIntegrationService = {
      createCommitWithChanges: vi.fn()
    };

    mockStandardizer = {
      standardizePortfolioData: vi.fn(),
      options: { schemaVersion: '1.0.0' }
    };

    mockLogger = {
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
      debug: vi.fn()
    };

    RepositoryService.mockReturnValue(mockRepositoryService);
    PortfolioDataStandardizer.mockReturnValue(mockStandardizer);
    createGitHubIntegrationService.mockReturnValue(mockGitHubIntegrationService);
    logger.child.mockReturnValue(mockLogger);

    contentPersistenceService = new ContentPersistenceService('test-token');
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('constructor', () => {
    it('should initialize with access token', () => {
      expect(contentPersistenceService.repositoryService).toBe(mockRepositoryService);
      expect(contentPersistenceService.githubIntegrationService).toBe(mockGitHubIntegrationService);
      expect(contentPersistenceService.standardizer).toBe(mockStandardizer);
    });

    it('should throw error without access token', () => {
      expect(() => new ContentPersistenceService()).toThrow('GitHub access token is required');
    });

    it('should set default options', () => {
      expect(contentPersistenceService.options.commitMessageTemplate).toBe('Update portfolio content via web editor');
      expect(contentPersistenceService.options.defaultBranch).toBe('main');
      expect(contentPersistenceService.options.createBackup).toBe(true);
      expect(contentPersistenceService.options.validateBeforeSave).toBe(true);
    });

    it('should accept custom options', () => {
      const customOptions = {
        commitMessageTemplate: 'Custom commit message',
        defaultBranch: 'develop',
        createBackup: false,
        validateBeforeSave: false
      };

      const service = new ContentPersistenceService('test-token', customOptions);

      expect(service.options.commitMessageTemplate).toBe('Custom commit message');
      expect(service.options.defaultBranch).toBe('develop');
      expect(service.options.createBackup).toBe(false);
      expect(service.options.validateBeforeSave).toBe(false);
    });
  });

  describe('savePortfolioContent', () => {
    const mockPortfolioData = {
      personal: {
        name: 'John Doe',
        title: 'Developer',
        description: 'A passionate developer'
      },
      projects: [
        {
          name: 'Project 1',
          description: 'First project',
          technologies: ['React', 'Node.js']
        }
      ]
    };

    const mockRepoState = {
      success: true,
      currentCommit: { sha: 'current-commit-sha' },
      structure: {
        items: [
          { name: 'data.json', type: 'file', path: 'data.json' },
          { name: 'README.md', type: 'file', path: 'README.md' }
        ]
      }
    };

    beforeEach(() => {
      // Mock validation
      mockStandardizer.standardizePortfolioData.mockResolvedValue({
        success: true,
        data: mockPortfolioData,
        errors: [],
        warnings: []
      });

      // Mock repository state
      vi.spyOn(contentPersistenceService, 'getRepositoryState').mockResolvedValue(mockRepoState);

      // Mock backup creation
      vi.spyOn(contentPersistenceService, 'createContentBackup').mockResolvedValue({
        success: true,
        backupRef: 'backup-123'
      });

      // Mock file determination
      vi.spyOn(contentPersistenceService, 'determineFilesToUpdate').mockResolvedValue([
        {
          path: 'data.json',
          content: JSON.stringify(mockPortfolioData, null, 2),
          operation: 'update',
          sha: 'old-sha'
        }
      ]);

      // Mock commit creation
      mockGitHubIntegrationService.createCommitWithChanges.mockResolvedValue({
        success: true,
        commit: {
          sha: 'new-commit-sha',
          message: 'Update portfolio content'
        },
        feedback: {
          type: 'success',
          title: 'Portfolio Updated',
          message: 'Successfully updated 1 file(s)'
        }
      });
    });

    it('should save portfolio content successfully', async () => {
      const result = await contentPersistenceService.savePortfolioContent(
        'owner',
        'repo',
        mockPortfolioData
      );

      expect(result.success).toBe(true);
      expect(result.message).toBe('Portfolio content saved successfully');
      expect(result.commitSha).toBe('new-commit-sha');
      expect(result.filesChanged).toBe(1);
      expect(result.changedFiles).toEqual(['data.json']);

      expect(mockLogger.info).toHaveBeenCalledWith('Starting portfolio content save', {
        owner: 'owner',
        repo: 'repo',
        branch: 'main',
        hasData: true
      });

      expect(mockLogger.info).toHaveBeenCalledWith('Portfolio content saved successfully', {
        owner: 'owner',
        repo: 'repo',
        commitSha: 'new-commit-sha',
        filesChanged: 1
      });
    });

    it('should handle validation failure', async () => {
      mockStandardizer.standardizePortfolioData.mockResolvedValue({
        success: false,
        errors: ['Invalid data format'],
        warnings: []
      });

      const result = await contentPersistenceService.savePortfolioContent(
        'owner',
        'repo',
        mockPortfolioData
      );

      expect(result.success).toBe(false);
      expect(result.error).toBe('Portfolio data validation failed');
      expect(result.details.type).toBe('validation_error');
      expect(result.details.errors).toEqual(['Invalid data format']);
    });

    it('should handle repository state fetch failure', async () => {
      contentPersistenceService.getRepositoryState.mockResolvedValue({
        success: false,
        error: 'Repository not found',
        details: { type: 'repo_error' }
      });

      const result = await contentPersistenceService.savePortfolioContent(
        'owner',
        'repo',
        mockPortfolioData
      );

      expect(result.success).toBe(false);
      expect(result.error).toBe('Failed to get repository state');
      expect(result.details).toEqual({ type: 'repo_error' });
    });

    it('should handle no changes detected', async () => {
      contentPersistenceService.determineFilesToUpdate.mockResolvedValue([]);

      const result = await contentPersistenceService.savePortfolioContent(
        'owner',
        'repo',
        mockPortfolioData
      );

      expect(result.success).toBe(true);
      expect(result.message).toBe('No changes detected');
      expect(result.commitSha).toBe('current-commit-sha');
      expect(result.filesChanged).toBe(0);
    });

    it('should handle commit creation failure', async () => {
      mockGitHubIntegrationService.createCommitWithChanges.mockResolvedValue({
        success: false,
        error: 'Commit failed',
        details: { type: 'commit_error' }
      });

      const result = await contentPersistenceService.savePortfolioContent(
        'owner',
        'repo',
        mockPortfolioData
      );

      expect(result.success).toBe(false);
      expect(result.error).toBe('Failed to create commit');
      expect(result.details).toEqual({ type: 'commit_error' });
    });

    it('should skip validation when disabled', async () => {
      const result = await contentPersistenceService.savePortfolioContent(
        'owner',
        'repo',
        mockPortfolioData,
        { validateBeforeSave: false }
      );

      expect(mockStandardizer.standardizePortfolioData).not.toHaveBeenCalled();
      expect(result.success).toBe(true);
    });

    it('should skip backup when disabled', async () => {
      const result = await contentPersistenceService.savePortfolioContent(
        'owner',
        'repo',
        mockPortfolioData,
        { createBackup: false }
      );

      expect(contentPersistenceService.createContentBackup).not.toHaveBeenCalled();
      expect(result.success).toBe(true);
    });

    it('should continue when backup fails', async () => {
      contentPersistenceService.createContentBackup.mockResolvedValue({
        success: false,
        error: 'Backup failed'
      });

      const result = await contentPersistenceService.savePortfolioContent(
        'owner',
        'repo',
        mockPortfolioData
      );

      expect(result.success).toBe(true);
      expect(mockLogger.warn).toHaveBeenCalledWith('Failed to create backup, continuing with save', {
        error: 'Backup failed'
      });
    });

    it('should handle unexpected errors', async () => {
      const error = new Error('Unexpected error');
      contentPersistenceService.getRepositoryState.mockRejectedValue(error);

      const result = await contentPersistenceService.savePortfolioContent(
        'owner',
        'repo',
        mockPortfolioData
      );

      expect(result.success).toBe(false);
      expect(result.error).toBe('Save operation failed: Unexpected error');
      expect(result.details.type).toBe('save_error');

      expect(mockLogger.error).toHaveBeenCalledWith('Portfolio content save failed', {
        owner: 'owner',
        repo: 'repo',
        error: 'Unexpected error',
        stack: error.stack
      });
    });
  });

  describe('saveContentFiles', () => {
    const mockFileChanges = [
      {
        path: 'data.json',
        content: '{"updated": true}',
        operation: 'update'
      },
      {
        path: 'README.md',
        content: '# Updated README',
        operation: 'update'
      }
    ];

    beforeEach(() => {
      vi.spyOn(contentPersistenceService, 'validateFileChanges').mockReturnValue({
        isValid: true,
        errors: []
      });

      mockGitHubIntegrationService.createCommitWithChanges.mockResolvedValue({
        success: true,
        commit: {
          sha: 'new-commit-sha',
          message: 'Update files'
        }
      });
    });

    it('should save content files successfully', async () => {
      const result = await contentPersistenceService.saveContentFiles(
        'owner',
        'repo',
        mockFileChanges,
        'Update content files'
      );

      expect(result.success).toBe(true);
      expect(result.message).toBe('Content files saved successfully');
      expect(result.commitSha).toBe('new-commit-sha');
      expect(result.filesChanged).toBe(2);

      expect(mockGitHubIntegrationService.createCommitWithChanges).toHaveBeenCalledWith(
        'owner',
        'repo',
        mockFileChanges,
        'Update content files',
        {
          branch: 'main',
          validateChanges: true,
          createBackup: true
        }
      );
    });

    it('should handle validation errors', async () => {
      contentPersistenceService.validateFileChanges.mockReturnValue({
        isValid: false,
        errors: ['Invalid file path']
      });

      const result = await contentPersistenceService.saveContentFiles(
        'owner',
        'repo',
        mockFileChanges,
        'Update content files'
      );

      expect(result.success).toBe(false);
      expect(result.error).toBe('Invalid file changes');
      expect(result.details.type).toBe('validation_error');
      expect(result.details.errors).toEqual(['Invalid file path']);
    });

    it('should handle commit creation failure', async () => {
      mockGitHubIntegrationService.createCommitWithChanges.mockResolvedValue({
        success: false,
        error: 'Commit failed'
      });

      const result = await contentPersistenceService.saveContentFiles(
        'owner',
        'repo',
        mockFileChanges,
        'Update content files'
      );

      expect(result.success).toBe(false);
      expect(result.error).toBe('Commit failed');
      expect(result.details.type).toBe('commit_error');
    });

    it('should use custom branch', async () => {
      await contentPersistenceService.saveContentFiles(
        'owner',
        'repo',
        mockFileChanges,
        'Update content files',
        { branch: 'develop' }
      );

      expect(mockGitHubIntegrationService.createCommitWithChanges).toHaveBeenCalledWith(
        'owner',
        'repo',
        mockFileChanges,
        'Update content files',
        expect.objectContaining({ branch: 'develop' })
      );
    });
  });

  describe('checkForConflicts', () => {
    const mockLocalChanges = [
      { path: 'data.json', content: '{"updated": true}' }
    ];

    it('should check for conflicts successfully', async () => {
      const mockConflictResult = {
        success: true,
        hasConflicts: true,
        conflicts: [
          {
            path: 'data.json',
            type: 'content_conflict',
            description: 'File modified both locally and remotely'
          }
        ],
        remoteCommits: [
          { sha: 'remote-commit-sha', message: 'Remote update' }
        ]
      };

      mockRepositoryService.detectConflicts.mockResolvedValue(mockConflictResult);

      const result = await contentPersistenceService.checkForConflicts(
        'owner',
        'repo',
        mockLocalChanges,
        'last-known-sha'
      );

      expect(result.success).toBe(true);
      expect(result.hasConflicts).toBe(true);
      expect(result.conflicts).toHaveLength(1);
      expect(result.remoteCommits).toHaveLength(1);

      expect(mockRepositoryService.detectConflicts).toHaveBeenCalledWith(
        'owner',
        'repo',
        mockLocalChanges,
        'last-known-sha',
        'main'
      );
    });

    it('should handle conflict detection failure', async () => {
      mockRepositoryService.detectConflicts.mockResolvedValue({
        success: false,
        error: 'Detection failed'
      });

      const result = await contentPersistenceService.checkForConflicts(
        'owner',
        'repo',
        mockLocalChanges,
        'last-known-sha'
      );

      expect(result.success).toBe(false);
      expect(result.error).toBe('Detection failed');
      expect(result.hasConflicts).toBe(false);
      expect(result.conflicts).toEqual([]);
    });

    it('should handle unexpected errors', async () => {
      const error = new Error('Unexpected error');
      mockRepositoryService.detectConflicts.mockRejectedValue(error);

      const result = await contentPersistenceService.checkForConflicts(
        'owner',
        'repo',
        mockLocalChanges,
        'last-known-sha'
      );

      expect(result.success).toBe(false);
      expect(result.error).toBe('Conflict check failed: Unexpected error');
      expect(result.hasConflicts).toBe(false);
    });
  });

  describe('getSyncStatus', () => {
    it('should get sync status successfully', async () => {
      const mockSyncResult = {
        success: true,
        status: {
          upToDate: false,
          lastKnownSha: 'old-sha',
          latestSha: 'new-sha',
          newCommitsCount: 2,
          newCommits: [
            { sha: 'commit1', message: 'Update 1' },
            { sha: 'commit2', message: 'Update 2' }
          ]
        }
      };

      mockRepositoryService.getSyncStatus.mockResolvedValue(mockSyncResult);

      const result = await contentPersistenceService.getSyncStatus(
        'owner',
        'repo',
        'old-sha'
      );

      expect(result.success).toBe(true);
      expect(result.status.upToDate).toBe(false);
      expect(result.status.newCommitsCount).toBe(2);

      expect(mockRepositoryService.getSyncStatus).toHaveBeenCalledWith(
        'owner',
        'repo',
        'old-sha',
        'main'
      );
    });

    it('should handle sync status failure', async () => {
      mockRepositoryService.getSyncStatus.mockResolvedValue({
        success: false,
        error: 'Sync check failed'
      });

      const result = await contentPersistenceService.getSyncStatus(
        'owner',
        'repo',
        'old-sha'
      );

      expect(result.success).toBe(false);
      expect(result.error).toBe('Sync check failed');
      expect(result.status).toBeNull();
    });
  });

  describe('validateFileChanges', () => {
    it('should validate valid file changes', () => {
      const validChanges = [
        { path: 'file1.json', content: '{}', operation: 'create' },
        { path: 'file2.md', content: '# Title', operation: 'update' },
        { path: 'file3.txt', operation: 'delete' }
      ];

      const result = contentPersistenceService.validateFileChanges(validChanges);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should detect invalid file changes', () => {
      const invalidChanges = [
        { content: '{}', operation: 'create' }, // missing path
        { path: 'file2.md', operation: 'update' }, // missing content for non-delete
        { path: 'file3.txt', content: 'content', operation: 'invalid' } // invalid operation
      ];

      const result = contentPersistenceService.validateFileChanges(invalidChanges);

      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveLength(3);
      expect(result.errors[0]).toContain('path is required');
      expect(result.errors[1]).toContain('content is required');
      expect(result.errors[2]).toContain('invalid operation');
    });

    it('should handle non-array input', () => {
      const result = contentPersistenceService.validateFileChanges('not-an-array');

      expect(result.isValid).toBe(false);
      expect(result.errors).toEqual(['File changes must be an array']);
    });
  });

  describe('getHealthStatus', () => {
    it('should return healthy status', async () => {
      const mockHealthStatus = {
        healthy: true,
        user: { login: 'testuser' },
        rateLimit: { remaining: 5000 }
      };

      mockRepositoryService.checkServiceHealth.mockResolvedValue(mockHealthStatus);

      const result = await contentPersistenceService.getHealthStatus();

      expect(result.healthy).toBe(true);
      expect(result.service).toBe('content-persistence');
      expect(result.details.repositoryService).toBe(mockHealthStatus);
      expect(result.details.standardizer.healthy).toBe(true);
      expect(result.details.standardizer.version).toBe('1.0.0');
    });

    it('should handle health check failure', async () => {
      const error = new Error('Health check failed');
      mockRepositoryService.checkServiceHealth.mockRejectedValue(error);

      const result = await contentPersistenceService.getHealthStatus();

      expect(result.healthy).toBe(false);
      expect(result.service).toBe('content-persistence');
      expect(result.error).toBe('Health check failed');
    });
  });

  describe('createContentPersistenceService', () => {
    it('should create service instance', () => {
      const service = createContentPersistenceService('test-token');

      expect(service).toBeInstanceOf(ContentPersistenceService);
    });

    it('should pass options to constructor', () => {
      const options = { defaultBranch: 'develop' };
      const service = createContentPersistenceService('test-token', options);

      expect(service.options.defaultBranch).toBe('develop');
    });
  });
});