import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { RepositoryService } from '../repository-service.js';

// Mock dependencies
vi.mock('../github-auth.js', () => ({
  createGitHubClient: vi.fn(() => ({
    rest: {
      repos: {
        createFork: vi.fn(),
        get: vi.fn(),
        getContent: vi.fn(),
        createOrUpdateFileContents: vi.fn(),
        listCommits: vi.fn()
      },
      git: {
        getRef: vi.fn(),
        getCommit: vi.fn(),
        createBlob: vi.fn(),
        createTree: vi.fn(),
        createCommit: vi.fn(),
        updateRef: vi.fn()
      }
    }
  }))
}));

vi.mock('../github-errors.js', () => ({
  parseGitHubError: vi.fn((error) => error),
  isRetryableError: vi.fn(() => false),
  getUserFriendlyMessage: vi.fn((error) => error.message)
}));

vi.mock('../rate-limit-manager.js', () => ({
  getRateLimitManager: vi.fn(() => ({
    executeRequest: vi.fn((fn) => fn()),
    updateRateLimit: vi.fn(),
    getStatus: vi.fn(() => ({
      rateLimit: { remaining: 5000, limit: 5000, reset: Date.now() + 3600000 },
      queue: { length: 0, isProcessing: false }
    })),
    on: vi.fn()
  })),
  RetryManager: vi.fn(() => ({
    execute: vi.fn((fn) => fn())
  }))
}));

describe('RepositoryService', () => {
  let repositoryService;
  let mockOctokit;
  let mockRateLimitManager;
  let mockRetryManager;

  beforeEach(() => {
    const { createGitHubClient } = require('../github-auth.js');
    const { getRateLimitManager, RetryManager } = require('../rate-limit-manager.js');

    mockOctokit = {
      rest: {
        repos: {
          createFork: vi.fn(),
          get: vi.fn(),
          getContent: vi.fn(),
          createOrUpdateFileContents: vi.fn(),
          listCommits: vi.fn()
        },
        git: {
          getRef: vi.fn(),
          getCommit: vi.fn(),
          createBlob: vi.fn(),
          createTree: vi.fn(),
          createCommit: vi.fn(),
          updateRef: vi.fn()
        }
      }
    };

    mockRateLimitManager = {
      executeRequest: vi.fn((fn) => fn()),
      updateRateLimit: vi.fn(),
      getStatus: vi.fn(() => ({
        rateLimit: { remaining: 5000, limit: 5000, reset: Date.now() + 3600000 },
        queue: { length: 0, isProcessing: false }
      })),
      on: vi.fn()
    };

    mockRetryManager = {
      execute: vi.fn((fn) => fn())
    };

    createGitHubClient.mockReturnValue(mockOctokit);
    getRateLimitManager.mockReturnValue(mockRateLimitManager);
    RetryManager.mockReturnValue(mockRetryManager);

    repositoryService = new RepositoryService('test-token');
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('constructor', () => {
    it('should initialize with access token', () => {
      expect(repositoryService.accessToken).toBe('test-token');
      expect(repositoryService.octokit).toBe(mockOctokit);
    });

    it('should throw error without access token', () => {
      expect(() => new RepositoryService()).toThrow('GitHub access token is required');
    });

    it('should set up rate limit monitoring', () => {
      expect(mockRateLimitManager.on).toHaveBeenCalledWith('warning', expect.any(Function));
      expect(mockRateLimitManager.on).toHaveBeenCalledWith('rateLimit', expect.any(Function));
      expect(mockRateLimitManager.on).toHaveBeenCalledWith('error', expect.any(Function));
    });
  });

  describe('forkRepository', () => {
    const mockForkedRepo = {
      owner: { login: 'testuser' },
      name: 'forked-repo',
      full_name: 'testuser/forked-repo',
      html_url: 'https://github.com/testuser/forked-repo',
      clone_url: 'https://github.com/testuser/forked-repo.git',
      default_branch: 'main',
      private: false,
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z'
    };

    beforeEach(() => {
      // Mock verifyRepositoryExists
      vi.spyOn(repositoryService, 'verifyRepositoryExists').mockResolvedValue({ exists: true });
      // Mock waitForForkReady
      vi.spyOn(repositoryService, 'waitForForkReady').mockResolvedValue({ ready: true });
    });

    it('should fork repository successfully', async () => {
      mockOctokit.rest.repos.createFork.mockResolvedValue({ data: mockForkedRepo });

      const result = await repositoryService.forkRepository('owner', 'template-repo');

      expect(result.success).toBe(true);
      expect(result.repository).toEqual({
        owner: 'testuser',
        name: 'forked-repo',
        fullName: 'testuser/forked-repo',
        url: 'https://github.com/testuser/forked-repo',
        cloneUrl: 'https://github.com/testuser/forked-repo.git',
        defaultBranch: 'main',
        private: false,
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z'
      });

      expect(mockOctokit.rest.repos.createFork).toHaveBeenCalledWith({
        owner: 'owner',
        repo: 'template-repo'
      });
    });

    it('should fork repository with custom name', async () => {
      mockOctokit.rest.repos.createFork.mockResolvedValue({ data: mockForkedRepo });

      await repositoryService.forkRepository('owner', 'template-repo', 'custom-name');

      expect(mockOctokit.rest.repos.createFork).toHaveBeenCalledWith({
        owner: 'owner',
        repo: 'template-repo',
        name: 'custom-name'
      });
    });

    it('should validate input parameters', async () => {
      const result1 = await repositoryService.forkRepository('', 'repo');
      expect(result1.success).toBe(false);
      expect(result1.error).toBe('Template owner and repository name are required');

      const result2 = await repositoryService.forkRepository('owner', '');
      expect(result2.success).toBe(false);
      expect(result2.error).toBe('Template owner and repository name are required');
    });

    it('should handle template repository not found', async () => {
      repositoryService.verifyRepositoryExists.mockResolvedValue({ exists: false });

      const result = await repositoryService.forkRepository('owner', 'nonexistent');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Template repository owner/nonexistent not found or not accessible');
    });

    it('should handle fork timeout', async () => {
      mockOctokit.rest.repos.createFork.mockResolvedValue({ data: mockForkedRepo });
      repositoryService.waitForForkReady.mockResolvedValue({ ready: false });

      const result = await repositoryService.forkRepository('owner', 'template-repo');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Fork creation timed out or failed');
      expect(result.details.type).toBe('ForkTimeoutError');
      expect(result.details.retryable).toBe(true);
    });

    it('should handle fork creation errors', async () => {
      const error = new Error('Fork failed');
      mockOctokit.rest.repos.createFork.mockRejectedValue(error);

      const result = await repositoryService.forkRepository('owner', 'template-repo');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Fork failed');
    });
  });

  describe('verifyFork', () => {
    const mockRepository = {
      owner: { login: 'testuser' },
      name: 'forked-repo',
      full_name: 'testuser/forked-repo',
      fork: true,
      parent: {
        owner: { login: 'original-owner' },
        name: 'original-repo',
        full_name: 'original-owner/original-repo'
      },
      default_branch: 'main',
      private: false
    };

    it('should verify fork successfully', async () => {
      mockOctokit.rest.repos.get.mockResolvedValue({ data: mockRepository });

      const result = await repositoryService.verifyFork('testuser', 'forked-repo');

      expect(result.verified).toBe(true);
      expect(result.repository).toEqual({
        owner: 'testuser',
        name: 'forked-repo',
        fullName: 'testuser/forked-repo',
        fork: true,
        parent: {
          owner: 'original-owner',
          name: 'original-repo',
          fullName: 'original-owner/original-repo'
        },
        defaultBranch: 'main',
        private: false
      });
    });

    it('should handle repository not found', async () => {
      const error = new Error('Not Found');
      error.status = 404;
      mockOctokit.rest.repos.get.mockRejectedValue(error);

      const result = await repositoryService.verifyFork('testuser', 'nonexistent');

      expect(result.verified).toBe(false);
      expect(result.error).toBe('Forked repository not found');
    });

    it('should handle other verification errors', async () => {
      const error = new Error('API Error');
      mockOctokit.rest.repos.get.mockRejectedValue(error);

      const result = await repositoryService.verifyFork('testuser', 'repo');

      expect(result.verified).toBe(false);
      expect(result.error).toBe('Fork verification failed: API Error');
    });
  });

  describe('getRepositoryStructure', () => {
    const mockContents = [
      {
        name: 'README.md',
        path: 'README.md',
        type: 'file',
        size: 1024,
        sha: 'abc123',
        url: 'https://api.github.com/repos/owner/repo/contents/README.md',
        download_url: 'https://raw.githubusercontent.com/owner/repo/main/README.md'
      },
      {
        name: 'src',
        path: 'src',
        type: 'dir',
        size: 0,
        sha: 'def456',
        url: 'https://api.github.com/repos/owner/repo/contents/src'
      }
    ];

    beforeEach(() => {
      vi.spyOn(repositoryService, 'getFileExtension').mockImplementation((name) => {
        const ext = name.split('.').pop();
        return ext === name ? '' : ext;
      });
      vi.spyOn(repositoryService, 'getContentType').mockReturnValue('text/plain');
      vi.spyOn(repositoryService, 'isEditableFile').mockReturnValue(true);
    });

    it('should get repository structure successfully', async () => {
      mockOctokit.rest.repos.getContent.mockResolvedValue({ data: mockContents });

      const result = await repositoryService.getRepositoryStructure('owner', 'repo');

      expect(result.success).toBe(true);
      expect(result.structure.path).toBe('');
      expect(result.structure.type).toBe('directory');
      expect(result.structure.items).toHaveLength(2);

      // Check that directories come first
      expect(result.structure.items[0].type).toBe('dir');
      expect(result.structure.items[1].type).toBe('file');
    });

    it('should handle single file response', async () => {
      const singleFile = mockContents[0];
      mockOctokit.rest.repos.getContent.mockResolvedValue({ data: singleFile });

      const result = await repositoryService.getRepositoryStructure('owner', 'repo', 'README.md');

      expect(result.success).toBe(true);
      expect(result.structure.items).toHaveLength(1);
      expect(result.structure.items[0].name).toBe('README.md');
    });

    it('should include file metadata for files', async () => {
      mockOctokit.rest.repos.getContent.mockResolvedValue({ data: [mockContents[0]] });

      const result = await repositoryService.getRepositoryStructure('owner', 'repo');

      const fileItem = result.structure.items[0];
      expect(fileItem.extension).toBeDefined();
      expect(fileItem.contentType).toBeDefined();
      expect(fileItem.editable).toBeDefined();
    });

    it('should handle API errors', async () => {
      const error = new Error('API Error');
      mockOctokit.rest.repos.getContent.mockRejectedValue(error);

      const result = await repositoryService.getRepositoryStructure('owner', 'repo');

      expect(result.success).toBe(false);
      expect(result.error).toBe('API Error');
    });

    it('should pass ref parameter when provided', async () => {
      mockOctokit.rest.repos.getContent.mockResolvedValue({ data: mockContents });

      await repositoryService.getRepositoryStructure('owner', 'repo', 'src', 'develop');

      expect(mockOctokit.rest.repos.getContent).toHaveBeenCalledWith({
        owner: 'owner',
        repo: 'repo',
        path: 'src',
        ref: 'develop'
      });
    });
  });

  describe('getFileContent', () => {
    const mockFile = {
      name: 'data.json',
      path: 'data.json',
      type: 'file',
      size: 256,
      sha: 'abc123',
      content: Buffer.from('{"name": "test"}').toString('base64'),
      encoding: 'base64',
      download_url: 'https://raw.githubusercontent.com/owner/repo/main/data.json'
    };

    beforeEach(() => {
      vi.spyOn(repositoryService, 'getContentType').mockReturnValue('application/json');
      vi.spyOn(repositoryService, 'isEditableFile').mockReturnValue(true);
    });

    it('should get file content successfully', async () => {
      mockOctokit.rest.repos.getContent.mockResolvedValue({ data: mockFile });

      const result = await repositoryService.getFileContent('owner', 'repo', 'data.json');

      expect(result.success).toBe(true);
      expect(result.content.path).toBe('data.json');
      expect(result.content.content).toBe('{"name": "test"}');
      expect(result.content.sha).toBe('abc123');
      expect(result.content.contentType).toBe('application/json');
    });

    it('should handle directory instead of file', async () => {
      const mockDir = { ...mockFile, type: 'dir' };
      mockOctokit.rest.repos.getContent.mockResolvedValue({ data: mockDir });

      const result = await repositoryService.getFileContent('owner', 'repo', 'src');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Path points to a directory, not a file');
    });

    it('should handle file not found', async () => {
      const error = new Error('Not Found');
      error.status = 404;
      mockOctokit.rest.repos.getContent.mockRejectedValue(error);

      const result = await repositoryService.getFileContent('owner', 'repo', 'nonexistent.txt');

      expect(result.success).toBe(false);
      expect(result.error).toBe('File not found');
    });

    it('should handle non-base64 encoded content', async () => {
      const mockTextFile = {
        ...mockFile,
        content: '{"name": "test"}',
        encoding: 'utf-8'
      };
      mockOctokit.rest.repos.getContent.mockResolvedValue({ data: mockTextFile });

      const result = await repositoryService.getFileContent('owner', 'repo', 'data.json');

      expect(result.success).toBe(true);
      expect(result.content.content).toBe('{"name": "test"}');
    });
  });

  describe('updateFileContent', () => {
    const mockCommitResult = {
      commit: {
        sha: 'new-commit-sha',
        message: 'Update file',
        author: { name: 'Test User', email: 'test@example.com' },
        committer: { name: 'Test User', email: 'test@example.com' },
        html_url: 'https://github.com/owner/repo/commit/new-commit-sha'
      },
      content: {
        name: 'data.json',
        path: 'data.json',
        sha: 'new-file-sha',
        size: 256
      }
    };

    it('should update file content successfully', async () => {
      mockOctokit.rest.repos.createOrUpdateFileContents.mockResolvedValue({ data: mockCommitResult });

      const result = await repositoryService.updateFileContent(
        'owner',
        'repo',
        'data.json',
        '{"updated": true}',
        'Update data file',
        'old-sha'
      );

      expect(result.success).toBe(true);
      expect(result.commit.sha).toBe('new-commit-sha');
      expect(result.commit.message).toBe('Update file');

      expect(mockOctokit.rest.repos.createOrUpdateFileContents).toHaveBeenCalledWith({
        owner: 'owner',
        repo: 'repo',
        path: 'data.json',
        message: 'Update data file',
        content: Buffer.from('{"updated": true}').toString('base64'),
        sha: 'old-sha'
      });
    });

    it('should get current SHA when not provided', async () => {
      vi.spyOn(repositoryService, 'getFileContent').mockResolvedValue({
        success: true,
        content: { sha: 'current-sha' }
      });

      mockOctokit.rest.repos.createOrUpdateFileContents.mockResolvedValue({ data: mockCommitResult });

      await repositoryService.updateFileContent(
        'owner',
        'repo',
        'data.json',
        '{"updated": true}',
        'Update data file'
      );

      expect(mockOctokit.rest.repos.createOrUpdateFileContents).toHaveBeenCalledWith(
        expect.objectContaining({ sha: 'current-sha' })
      );
    });

    it('should create new file when SHA not found', async () => {
      vi.spyOn(repositoryService, 'getFileContent').mockResolvedValue({
        success: false,
        error: 'File not found'
      });

      mockOctokit.rest.repos.createOrUpdateFileContents.mockResolvedValue({ data: mockCommitResult });

      await repositoryService.updateFileContent(
        'owner',
        'repo',
        'new-file.json',
        '{"new": true}',
        'Create new file'
      );

      expect(mockOctokit.rest.repos.createOrUpdateFileContents).toHaveBeenCalledWith(
        expect.not.objectContaining({ sha: expect.anything() })
      );
    });

    it('should handle update errors', async () => {
      const error = new Error('Update failed');
      mockOctokit.rest.repos.createOrUpdateFileContents.mockRejectedValue(error);

      const result = await repositoryService.updateFileContent(
        'owner',
        'repo',
        'data.json',
        '{"updated": true}',
        'Update data file',
        'old-sha'
      );

      expect(result.success).toBe(false);
      expect(result.error).toBe('Update failed');
    });
  });

  describe('getLatestCommit', () => {
    const mockCommits = [{
      sha: 'latest-commit-sha',
      commit: {
        message: 'Latest commit',
        author: {
          name: 'Test User',
          email: 'test@example.com',
          date: '2024-01-01T00:00:00Z'
        },
        committer: {
          name: 'Test User',
          email: 'test@example.com',
          date: '2024-01-01T00:00:00Z'
        }
      },
      html_url: 'https://github.com/owner/repo/commit/latest-commit-sha'
    }];

    const mockRepoInfo = {
      default_branch: 'main'
    };

    it('should get latest commit successfully', async () => {
      mockOctokit.rest.repos.get.mockResolvedValue({ data: mockRepoInfo });
      mockOctokit.rest.repos.listCommits.mockResolvedValue({ data: mockCommits });

      const result = await repositoryService.getLatestCommit('owner', 'repo');

      expect(result.success).toBe(true);
      expect(result.commit.sha).toBe('latest-commit-sha');
      expect(result.commit.message).toBe('Latest commit');
      expect(result.commit.branch).toBe('main');

      expect(mockOctokit.rest.repos.listCommits).toHaveBeenCalledWith({
        owner: 'owner',
        repo: 'repo',
        sha: 'main',
        per_page: 1
      });
    });

    it('should use specified branch', async () => {
      mockOctokit.rest.repos.listCommits.mockResolvedValue({ data: mockCommits });

      await repositoryService.getLatestCommit('owner', 'repo', 'develop');

      expect(mockOctokit.rest.repos.listCommits).toHaveBeenCalledWith({
        owner: 'owner',
        repo: 'repo',
        sha: 'develop',
        per_page: 1
      });
    });

    it('should handle no commits found', async () => {
      mockOctokit.rest.repos.get.mockResolvedValue({ data: mockRepoInfo });
      mockOctokit.rest.repos.listCommits.mockResolvedValue({ data: [] });

      const result = await repositoryService.getLatestCommit('owner', 'repo');

      expect(result.success).toBe(false);
      expect(result.error).toBe('No commits found in repository');
    });

    it('should handle repository not found', async () => {
      const error = new Error('Not Found');
      error.status = 404;
      mockOctokit.rest.repos.get.mockRejectedValue(error);

      const result = await repositoryService.getLatestCommit('owner', 'nonexistent');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Repository or branch not found');
    });
  });

  describe('checkServiceHealth', () => {
    const mockUser = {
      login: 'testuser',
      id: 12345
    };

    it('should return healthy status', async () => {
      mockOctokit.rest.users = {
        getAuthenticated: vi.fn().mockResolvedValue({ data: mockUser })
      };

      const result = await repositoryService.checkServiceHealth();

      expect(result.healthy).toBe(true);
      expect(result.user.login).toBe('testuser');
      expect(result.user.id).toBe(12345);
      expect(result.rateLimit).toBeDefined();
      expect(result.queue).toBeDefined();
      expect(result.timestamp).toBeDefined();
    });

    it('should return unhealthy status on error', async () => {
      const error = new Error('Service unavailable');
      mockOctokit.rest.users = {
        getAuthenticated: vi.fn().mockRejectedValue(error)
      };

      const result = await repositoryService.checkServiceHealth();

      expect(result.healthy).toBe(false);
      expect(result.error).toBe('Service unavailable');
      expect(result.details.type).toBeDefined();
      expect(result.timestamp).toBeDefined();
    });
  });

  describe('getRateLimitStatus', () => {
    it('should return rate limit status', () => {
      const status = repositoryService.getRateLimitStatus();

      expect(status.rateLimit).toBeDefined();
      expect(status.queue).toBeDefined();
    });
  });
});