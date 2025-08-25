/**
 * Tests for Content Persistence Service
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { ContentPersistenceService } from '../content-persistence-service.js';

// Mock dependencies
vi.mock('../repository-service.js');
vi.mock('../github-integration-service.js');
vi.mock('../portfolio-data-standardizer.js');
vi.mock('../logger.js', () => ({
  logger: {
    child: vi.fn(() => ({
      info: vi.fn(),
      error: vi.fn(),
      warn: vi.fn()
    }))
  }
}));

describe('ContentPersistenceService', () => {
  let service;
  let mockAccessToken;
  let mockRepositoryService;
  let mockGithubIntegrationService;
  let mockStandardizer;

  beforeEach(() => {
    mockAccessToken = 'test-token';
    
    // Mock repository service
    mockRepositoryService = {
      getLatestCommit: vi.fn(),
      getRepositoryStructure: vi.fn(),
      getFileContent: vi.fn(),
      detectConflicts: vi.fn(),
      getSyncStatus: vi.fn(),
      checkServiceHealth: vi.fn()
    };

    // Mock GitHub integration service
    mockGithubIntegrationService = {
      createCommitWithChanges: vi.fn()
    };

    // Mock standardizer
    mockStandardizer = {
      standardizePortfolioData: vi.fn()
    };

    // Mock the factory functions
    vi.doMock('../repository-service.js', () => ({
      RepositoryService: vi.fn(() => mockRepositoryService)
    }));

    vi.doMock('../github-integration-service.js', () => ({
      createGitHubIntegrationService: vi.fn(() => mockGithubIntegrationService)
    }));

    vi.doMock('../portfolio-data-standardizer.js', () => ({
      PortfolioDataStandardizer: vi.fn(() => mockStandardizer)
    }));

    service = new ContentPersistenceService(mockAccessToken);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('constructor', () => {
    it('should throw error if no access token provided', () => {
      expect(() => new ContentPersistenceService()).toThrow('GitHub access token is required');
    });

    it('should initialize with default options', () => {
      expect(service.options.commitMessageTemplate).toBe('Update portfolio content via web editor');
      expect(service.options.defaultBranch).toBe('main');
      expect(service.options.createBackup).toBe(true);
      expect(service.options.validateBeforeSave).toBe(true);
    });
  });

  describe('savePortfolioContent', () => {
    const mockOwner = 'testuser';
    const mockRepo = 'test-repo';
    const mockPortfolioData = {
      personal: { name: 'Test User', title: 'Developer' },
      projects: [{ name: 'Test Project', description: 'A test project' }]
    };

    beforeEach(() => {
      // Setup default mocks for successful save
      mockStandardizer.standardizePortfolioData.mockResolvedValue({
        success: true,
        data: mockPortfolioData
      });

      mockRepositoryService.getLatestCommit.mockResolvedValue({
        success: true,
        commit: { sha: 'abc123', message: 'Previous commit' }
      });

      mockRepositoryService.getRepositoryStructure.mockResolvedValue({
        success: true,
        structure: { items: [] }
      });

      mockGithubIntegrationService.createCommitWithChanges.mockResolvedValue({
        success: true,
        commit: {
          sha: 'def456',
          message: 'Update portfolio content via web editor',
          url: 'https://github.com/testuser/test-repo/commit/def456'
        }
      });
    });

    it('should successfully save portfolio content', async () => {
      const result = await service.savePortfolioContent(mockOwner, mockRepo, mockPortfolioData);

      expect(result.success).toBe(true);
      expect(result.commitSha).toBe('def456');
      expect(mockStandardizer.standardizePortfolioData).toHaveBeenCalledWith(mockPortfolioData);
      expect(mockGithubIntegrationService.createCommitWithChanges).toHaveBeenCalled();
    });

    it('should return validation error if portfolio data is invalid', async () => {
      mockStandardizer.standardizePortfolioData.mockResolvedValue({
        success: false,
        errors: ['Invalid data format']
      });

      const result = await service.savePortfolioContent(mockOwner, mockRepo, mockPortfolioData);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Portfolio data validation failed');
      expect(result.details.type).toBe('validation_error');
    });

    it('should handle repository state fetch failure', async () => {
      mockRepositoryService.getLatestCommit.mockResolvedValue({
        success: false,
        error: 'Repository not found'
      });

      const result = await service.savePortfolioContent(mockOwner, mockRepo, mockPortfolioData);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Failed to get repository state');
    });

    it('should handle commit creation failure', async () => {
      mockGithubIntegrationService.createCommitWithChanges.mockResolvedValue({
        success: false,
        error: 'Commit failed',
        details: { type: 'commit_error' }
      });

      const result = await service.savePortfolioContent(mockOwner, mockRepo, mockPortfolioData);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Failed to create commit');
    });

    it('should skip validation when disabled', async () => {
      const result = await service.savePortfolioContent(
        mockOwner, 
        mockRepo, 
        mockPortfolioData,
        { validateBeforeSave: false }
      );

      expect(mockStandardizer.standardizePortfolioData).not.toHaveBeenCalled();
      expect(result.success).toBe(true);
    });

    it('should return no changes message when no files need updating', async () => {
      // Mock that no files need updating
      mockRepositoryService.getRepositoryStructure.mockResolvedValue({
        success: true,
        structure: { 
          items: [{ 
            name: 'data.json', 
            type: 'file', 
            path: 'data.json' 
          }] 
        }
      });

      mockRepositoryService.getFileContent.mockResolvedValue({
        success: true,
        content: {
          content: JSON.stringify(mockPortfolioData),
          sha: 'existing-sha'
        }
      });

      const result = await service.savePortfolioContent(mockOwner, mockRepo, mockPortfolioData);

      expect(result.success).toBe(true);
      expect(result.message).toBe('No changes detected');
      expect(result.filesChanged).toBe(0);
    });
  });

  describe('saveContentFiles', () => {
    const mockOwner = 'testuser';
    const mockRepo = 'test-repo';
    const mockFileChanges = [
      {
        path: 'data.json',
        content: '{"test": "data"}',
        operation: 'update'
      }
    ];
    const mockCommitMessage = 'Update files';

    beforeEach(() => {
      mockGithubIntegrationService.createCommitWithChanges.mockResolvedValue({
        success: true,
        commit: {
          sha: 'def456',
          message: mockCommitMessage,
          url: 'https://github.com/testuser/test-repo/commit/def456'
        }
      });
    });

    it('should successfully save content files', async () => {
      const result = await service.saveContentFiles(
        mockOwner, 
        mockRepo, 
        mockFileChanges, 
        mockCommitMessage
      );

      expect(result.success).toBe(true);
      expect(result.commitSha).toBe('def456');
      expect(result.filesChanged).toBe(1);
      expect(mockGithubIntegrationService.createCommitWithChanges).toHaveBeenCalledWith(
        mockOwner,
        mockRepo,
        mockFileChanges,
        mockCommitMessage,
        expect.any(Object)
      );
    });

    it('should validate file changes', async () => {
      const invalidChanges = [
        { content: 'test', operation: 'update' } // Missing path
      ];

      const result = await service.saveContentFiles(
        mockOwner, 
        mockRepo, 
        invalidChanges, 
        mockCommitMessage
      );

      expect(result.success).toBe(false);
      expect(result.error).toBe('Invalid file changes');
      expect(result.details.type).toBe('validation_error');
    });

    it('should handle commit creation failure', async () => {
      mockGithubIntegrationService.createCommitWithChanges.mockResolvedValue({
        success: false,
        error: 'Commit failed'
      });

      const result = await service.saveContentFiles(
        mockOwner, 
        mockRepo, 
        mockFileChanges, 
        mockCommitMessage
      );

      expect(result.success).toBe(false);
      expect(result.details.type).toBe('commit_error');
    });
  });

  describe('checkForConflicts', () => {
    const mockOwner = 'testuser';
    const mockRepo = 'test-repo';
    const mockLocalChanges = [{ path: 'data.json', content: 'new content' }];
    const mockLastKnownCommitSha = 'abc123';

    it('should successfully check for conflicts', async () => {
      mockRepositoryService.detectConflicts.mockResolvedValue({
        success: true,
        hasConflicts: false,
        conflicts: []
      });

      const result = await service.checkForConflicts(
        mockOwner, 
        mockRepo, 
        mockLocalChanges, 
        mockLastKnownCommitSha
      );

      expect(result.success).toBe(true);
      expect(result.hasConflicts).toBe(false);
      expect(result.conflicts).toEqual([]);
      expect(mockRepositoryService.detectConflicts).toHaveBeenCalledWith(
        mockOwner,
        mockRepo,
        mockLocalChanges,
        mockLastKnownCommitSha,
        'main'
      );
    });

    it('should detect conflicts when they exist', async () => {
      const mockConflicts = [
        { path: 'data.json', type: 'content_conflict' }
      ];

      mockRepositoryService.detectConflicts.mockResolvedValue({
        success: true,
        hasConflicts: true,
        conflicts: mockConflicts
      });

      const result = await service.checkForConflicts(
        mockOwner, 
        mockRepo, 
        mockLocalChanges, 
        mockLastKnownCommitSha
      );

      expect(result.success).toBe(true);
      expect(result.hasConflicts).toBe(true);
      expect(result.conflicts).toEqual(mockConflicts);
    });

    it('should handle conflict detection failure', async () => {
      mockRepositoryService.detectConflicts.mockResolvedValue({
        success: false,
        error: 'Failed to detect conflicts'
      });

      const result = await service.checkForConflicts(
        mockOwner, 
        mockRepo, 
        mockLocalChanges, 
        mockLastKnownCommitSha
      );

      expect(result.success).toBe(false);
      expect(result.error).toBe('Failed to detect conflicts');
    });
  });

  describe('getSyncStatus', () => {
    const mockOwner = 'testuser';
    const mockRepo = 'test-repo';
    const mockLastKnownCommitSha = 'abc123';

    it('should successfully get sync status', async () => {
      const mockStatus = {
        upToDate: true,
        latestSha: 'abc123',
        newCommitsCount: 0
      };

      mockRepositoryService.getSyncStatus.mockResolvedValue({
        success: true,
        status: mockStatus
      });

      const result = await service.getSyncStatus(
        mockOwner, 
        mockRepo, 
        mockLastKnownCommitSha
      );

      expect(result.success).toBe(true);
      expect(result.status).toEqual(mockStatus);
      expect(mockRepositoryService.getSyncStatus).toHaveBeenCalledWith(
        mockOwner,
        mockRepo,
        mockLastKnownCommitSha,
        'main'
      );
    });

    it('should handle sync status check failure', async () => {
      mockRepositoryService.getSyncStatus.mockResolvedValue({
        success: false,
        error: 'Failed to get sync status'
      });

      const result = await service.getSyncStatus(
        mockOwner, 
        mockRepo, 
        mockLastKnownCommitSha
      );

      expect(result.success).toBe(false);
      expect(result.error).toBe('Failed to get sync status');
    });
  });

  describe('getHealthStatus', () => {
    it('should return healthy status when all services are working', async () => {
      mockRepositoryService.checkServiceHealth.mockResolvedValue({
        healthy: true
      });

      const result = await service.getHealthStatus();

      expect(result.healthy).toBe(true);
      expect(result.service).toBe('content-persistence');
      expect(result.details.repositoryService.healthy).toBe(true);
    });

    it('should return unhealthy status when service check fails', async () => {
      mockRepositoryService.checkServiceHealth.mockRejectedValue(
        new Error('Service check failed')
      );

      const result = await service.getHealthStatus();

      expect(result.healthy).toBe(false);
      expect(result.error).toBe('Service check failed');
    });
  });
});