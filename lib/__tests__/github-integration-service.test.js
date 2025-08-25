/**
 * Tests for GitHub Integration Service
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { GitHubIntegrationService } from '../github-integration-service.js';

// Mock dependencies
vi.mock('../github-auth.js');
vi.mock('../github-errors.js');
vi.mock('../rate-limit-manager.js');
vi.mock('../logger.js', () => ({
  logger: {
    child: vi.fn(() => ({
      info: vi.fn(),
      error: vi.fn(),
      warn: vi.fn()
    }))
  }
}));

describe('GitHubIntegrationService', () => {
  let service;
  let mockAccessToken;
  let mockOctokit;
  let mockRateLimitManager;
  let mockRetryManager;

  beforeEach(() => {
    mockAccessToken = 'test-token';
    
    // Mock Octokit
    mockOctokit = {
      rest: {
        git: {
          getRef: vi.fn(),
          getCommit: vi.fn(),
          createBlob: vi.fn(),
          createTree: vi.fn(),
          createCommit: vi.fn(),
          updateRef: vi.fn(),
          createRef: vi.fn()
        },
        pulls: {
          create: vi.fn()
        },
        users: {
          getAuthenticated: vi.fn()
        }
      }
    };

    // Mock rate limit manager
    mockRateLimitManager = {
      executeRequest: vi.fn((fn) => fn()),
      updateRateLimit: vi.fn(),
      getStatus: vi.fn(() => ({
        rateLimit: { remaining: 5000, limit: 5000, reset: Date.now() + 3600000 }
      })),
      on: vi.fn()
    };

    // Mock retry manager
    mockRetryManager = {
      execute: vi.fn((fn) => fn())
    };

    // Mock the factory functions
    vi.doMock('../github-auth.js', () => ({
      createGitHubClient: vi.fn(() => mockOctokit)
    }));

    vi.doMock('../rate-limit-manager.js', () => ({
      getRateLimitManager: vi.fn(() => mockRateLimitManager),
      RetryManager: vi.fn(() => mockRetryManager)
    }));

    service = new GitHubIntegrationService(mockAccessToken);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('constructor', () => {
    it('should throw error if no access token provided', () => {
      expect(() => new GitHubIntegrationService()).toThrow('GitHub access token is required');
    });

    it('should initialize with default options', () => {
      expect(service.options.defaultBranch).toBe('main');
      expect(service.options.maxFileSize).toBe(100 * 1024 * 1024);
    });
  });

  describe('createCommitWithChanges', () => {
    const mockOwner = 'testuser';
    const mockRepo = 'test-repo';
    const mockChanges = [
      {
        path: 'data.json',
        content: '{"test": "data"}',
        operation: 'update'
      }
    ];
    const mockMessage = 'Update files';

    beforeEach(() => {
      // Setup successful mocks
      mockOctokit.rest.git.getRef.mockResolvedValue({
        data: { object: { sha: 'branch-sha' }, ref: 'refs/heads/main', url: 'ref-url' }
      });

      mockOctokit.rest.git.getCommit.mockResolvedValue({
        data: {
          sha: 'commit-sha',
          tree: { sha: 'tree-sha' },
          message: 'Previous commit',
          author: { name: 'Test User' },
          committer: { name: 'Test User' },
          parents: []
        }
      });

      mockOctokit.rest.git.createBlob.mockResolvedValue({
        data: { sha: 'blob-sha', url: 'blob-url' }
      });

      mockOctokit.rest.git.createTree.mockResolvedValue({
        data: { sha: 'new-tree-sha', url: 'tree-url' }
      });

      mockOctokit.rest.git.createCommit.mockResolvedValue({
        data: {
          sha: 'new-commit-sha',
          html_url: 'https://github.com/testuser/test-repo/commit/new-commit-sha',
          author: { name: 'Test User' },
          committer: { name: 'Test User' }
        }
      });

      mockOctokit.rest.git.updateRef.mockResolvedValue({
        data: { ref: 'refs/heads/main', object: { sha: 'new-commit-sha' } }
      });
    });

    it('should successfully create commit with changes', async () => {
      const result = await service.createCommitWithChanges(
        mockOwner,
        mockRepo,
        mockChanges,
        mockMessage
      );

      expect(result.success).toBe(true);
      expect(result.commit.sha).toBe('new-commit-sha');
      expect(result.commit.message).toBe(mockMessage);
      expect(result.changes).toHaveLength(1);
      expect(result.changes[0].path).toBe('data.json');

      // Verify all GitHub API calls were made
      expect(mockOctokit.rest.git.getRef).toHaveBeenCalledWith({
        owner: mockOwner,
        repo: mockRepo,
        ref: 'heads/main'
      });
      expect(mockOctokit.rest.git.createBlob).toHaveBeenCalled();
      expect(mockOctokit.rest.git.createTree).toHaveBeenCalled();
      expect(mockOctokit.rest.git.createCommit).toHaveBeenCalled();
      expect(mockOctokit.rest.git.updateRef).toHaveBeenCalled();
    });

    it('should validate file changes before processing', async () => {
      const invalidChanges = [
        { content: 'test', operation: 'update' } // Missing path
      ];

      const result = await service.createCommitWithChanges(
        mockOwner,
        mockRepo,
        invalidChanges,
        mockMessage
      );

      expect(result.success).toBe(false);
      expect(result.error).toBe('File changes validation failed');
      expect(result.details.type).toBe('validation_error');
    });

    it('should handle branch not found error', async () => {
      mockOctokit.rest.git.getRef.mockRejectedValue({
        status: 404,
        message: 'Not Found'
      });

      const result = await service.createCommitWithChanges(
        mockOwner,
        mockRepo,
        mockChanges,
        mockMessage
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain("Branch 'main' not found");
    });

    it('should handle file size limit exceeded', async () => {
      const largeChanges = [
        {
          path: 'large-file.txt',
          content: 'x'.repeat(200 * 1024 * 1024), // 200MB
          operation: 'create'
        }
      ];

      const result = await service.createCommitWithChanges(
        mockOwner,
        mockRepo,
        largeChanges,
        mockMessage
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain('Blob creation failed');
    });

    it('should skip blob creation for delete operations', async () => {
      const deleteChanges = [
        {
          path: 'file-to-delete.txt',
          operation: 'delete'
        }
      ];

      const result = await service.createCommitWithChanges(
        mockOwner,
        mockRepo,
        deleteChanges,
        mockMessage
      );

      expect(result.success).toBe(true);
      expect(mockOctokit.rest.git.createBlob).not.toHaveBeenCalled();
      expect(mockOctokit.rest.git.createTree).toHaveBeenCalledWith({
        owner: mockOwner,
        repo: mockRepo,
        base_tree: 'tree-sha',
        tree: [
          {
            path: 'file-to-delete.txt',
            mode: '100644',
            type: 'blob',
            sha: null // null SHA for deletion
          }
        ]
      });
    });

    it('should create backup when enabled', async () => {
      mockOctokit.rest.git.createRef.mockResolvedValue({
        data: { ref: 'refs/heads/backup-123', object: { sha: 'branch-sha' } }
      });

      const result = await service.createCommitWithChanges(
        mockOwner,
        mockRepo,
        mockChanges,
        mockMessage,
        { createBackup: true }
      );

      expect(result.success).toBe(true);
      expect(mockOctokit.rest.git.createRef).toHaveBeenCalledWith(
        expect.objectContaining({
          owner: mockOwner,
          repo: mockRepo,
          ref: expect.stringMatching(/refs\/heads\/backup-\d+/),
          sha: 'branch-sha'
        })
      );
    });
  });

  describe('pushChanges', () => {
    const mockOwner = 'testuser';
    const mockRepo = 'test-repo';
    const mockChanges = [
      {
        path: 'data.json',
        content: '{"test": "data"}',
        operation: 'update'
      }
    ];
    const mockCommitMessage = 'Update files';

    beforeEach(() => {
      // Mock successful commit creation
      vi.spyOn(service, 'createCommitWithChanges').mockResolvedValue({
        success: true,
        commit: {
          sha: 'new-commit-sha',
          message: mockCommitMessage,
          url: 'https://github.com/testuser/test-repo/commit/new-commit-sha'
        },
        branch: { name: 'main', sha: 'new-commit-sha' },
        changes: mockChanges.map(change => ({
          path: change.path,
          operation: change.operation,
          size: change.content?.length || 0
        }))
      });
    });

    it('should successfully push changes', async () => {
      const result = await service.pushChanges(
        mockOwner,
        mockRepo,
        mockChanges,
        mockCommitMessage
      );

      expect(result.success).toBe(true);
      expect(result.commit.sha).toBe('new-commit-sha');
      expect(result.feedback.type).toBe('success');
      expect(result.feedback.actions).toHaveLength(2);
      expect(service.createCommitWithChanges).toHaveBeenCalledWith(
        mockOwner,
        mockRepo,
        mockChanges,
        mockCommitMessage,
        expect.any(Object)
      );
    });

    it('should create pull request when requested', async () => {
      mockOctokit.rest.pulls.create.mockResolvedValue({
        data: {
          number: 1,
          title: mockCommitMessage,
          html_url: 'https://github.com/testuser/test-repo/pull/1',
          state: 'open',
          head: { ref: 'feature-branch' },
          base: { ref: 'main' }
        }
      });

      const result = await service.pushChanges(
        mockOwner,
        mockRepo,
        mockChanges,
        mockCommitMessage,
        {
          branch: 'feature-branch',
          createPullRequest: true,
          prTitle: 'Test PR',
          prDescription: 'Test PR description'
        }
      );

      expect(result.success).toBe(true);
      expect(result.pullRequest).toBeDefined();
      expect(result.pullRequest.number).toBe(1);
      expect(mockOctokit.rest.pulls.create).toHaveBeenCalledWith({
        owner: mockOwner,
        repo: mockRepo,
        title: 'Test PR',
        body: 'Test PR description',
        head: 'feature-branch',
        base: 'main'
      });
    });

    it('should handle commit creation failure', async () => {
      vi.spyOn(service, 'createCommitWithChanges').mockResolvedValue({
        success: false,
        error: 'Commit failed',
        details: { type: 'commit_error' }
      });

      const result = await service.pushChanges(
        mockOwner,
        mockRepo,
        mockChanges,
        mockCommitMessage
      );

      expect(result.success).toBe(false);
      expect(result.error).toBe('Commit failed');
    });
  });

  describe('getHealthStatus', () => {
    it('should return healthy status when authenticated', async () => {
      mockOctokit.rest.users.getAuthenticated.mockResolvedValue({
        data: { login: 'testuser', id: 12345 }
      });

      const result = await service.getHealthStatus();

      expect(result.healthy).toBe(true);
      expect(result.service).toBe('github-integration');
      expect(result.user.login).toBe('testuser');
      expect(result.rateLimit).toBeDefined();
    });

    it('should return unhealthy status when authentication fails', async () => {
      mockOctokit.rest.users.getAuthenticated.mockRejectedValue(
        new Error('Authentication failed')
      );

      const result = await service.getHealthStatus();

      expect(result.healthy).toBe(false);
      expect(result.error).toBeDefined();
    });
  });
});