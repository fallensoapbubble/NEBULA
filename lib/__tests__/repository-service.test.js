import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { RepositoryService, createRepositoryService } from '../repository-service.js';

// Mock Octokit instance
const mockOctokit = {
  rest: {
    users: {
      getAuthenticated: vi.fn()
    },
    repos: {
      createFork: vi.fn(),
      get: vi.fn(),
      getContent: vi.fn(),
      createOrUpdateFileContents: vi.fn(),
      deleteFile: vi.fn(),
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
  },
  request: vi.fn()
};

// Mock rate limit manager
const mockRateLimitManager = {
  executeRequest: vi.fn((fn) => fn()),
  updateRateLimit: vi.fn(),
  getStatus: vi.fn(() => ({
    rateLimit: { remaining: 4000, limit: 5000, reset: Date.now() + 3600000 },
    queue: { length: 0, isProcessing: false }
  })),
  on: vi.fn(),
  off: vi.fn(),
  emit: vi.fn()
};

// Mock retry manager
const mockRetryManager = {
  execute: vi.fn((fn) => fn())
};

// Mock the github-auth module
vi.mock('../github-auth.js', () => ({
  createGitHubClient: vi.fn(() => mockOctokit)
}));

// Mock the error handling modules
vi.mock('../github-errors.js', () => ({
  parseGitHubError: vi.fn((error) => error),
  isRetryableError: vi.fn(() => false),
  getUserFriendlyMessage: vi.fn((error) => error.message || 'An error occurred')
}));

// Mock the rate limit manager
vi.mock('../rate-limit-manager.js', () => ({
  getRateLimitManager: vi.fn(() => mockRateLimitManager),
  RetryManager: vi.fn(() => mockRetryManager)
}));

describe('RepositoryService', () => {
  let service;
  const mockToken = 'test-token';

  beforeEach(() => {
    vi.clearAllMocks();
    service = new RepositoryService(mockToken);
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('constructor', () => {
    it('should create service with valid token', () => {
      expect(service).toBeInstanceOf(RepositoryService);
      expect(service.accessToken).toBe(mockToken);
    });

    it('should throw error without token', () => {
      expect(() => new RepositoryService()).toThrow('GitHub access token is required');
    });
  });

  describe('forkRepository', () => {
    const templateOwner = 'template-owner';
    const templateRepo = 'portfolio-template';
    const mockUser = { login: 'test-user' };
    const mockForkedRepo = {
      owner: { login: 'test-user' },
      name: 'portfolio-template',
      full_name: 'test-user/portfolio-template',
      html_url: 'https://github.com/test-user/portfolio-template',
      clone_url: 'https://github.com/test-user/portfolio-template.git',
      default_branch: 'main',
      private: false,
      created_at: '2024-01-01T00:00:00Z'
    };

    beforeEach(() => {
      mockOctokit.rest.users.getAuthenticated.mockResolvedValue({ data: mockUser });
      mockOctokit.rest.repos.get
        .mockResolvedValueOnce({ data: { owner: { login: templateOwner }, name: templateRepo } }) // Template exists
        .mockRejectedValueOnce({ status: 404 }) // Fork doesn't exist
        .mockResolvedValueOnce({ data: mockForkedRepo }); // Fork ready check
      mockOctokit.rest.repos.createFork.mockResolvedValue({ data: mockForkedRepo });
    });

    it('should successfully fork a repository', async () => {
      const result = await service.forkRepository(templateOwner, templateRepo);

      expect(result.success).toBe(true);
      expect(result.repository).toEqual({
        owner: 'test-user',
        name: 'portfolio-template',
        fullName: 'test-user/portfolio-template',
        url: 'https://github.com/test-user/portfolio-template',
        cloneUrl: 'https://github.com/test-user/portfolio-template.git',
        defaultBranch: 'main',
        private: false,
        createdAt: '2024-01-01T00:00:00Z'
      });

      expect(mockOctokit.rest.repos.createFork).toHaveBeenCalledWith({
        owner: templateOwner,
        repo: templateRepo
      });
    });

    it('should fork with custom name', async () => {
      const customName = 'my-portfolio';
      await service.forkRepository(templateOwner, templateRepo, customName);

      expect(mockOctokit.rest.repos.createFork).toHaveBeenCalledWith({
        owner: templateOwner,
        repo: templateRepo,
        name: customName
      });
    });

    it('should handle template repository not found', async () => {
      mockOctokit.rest.repos.get.mockRejectedValueOnce({ status: 404 });

      const result = await service.forkRepository(templateOwner, templateRepo);

      expect(result.success).toBe(false);
      expect(result.error).toContain('not found or not accessible');
    });

    it('should handle existing fork', async () => {
      mockOctokit.rest.repos.get
        .mockResolvedValueOnce({ data: { owner: { login: templateOwner }, name: templateRepo } }) // Template exists
        .mockResolvedValueOnce({ data: mockForkedRepo }); // Fork already exists

      const result = await service.forkRepository(templateOwner, templateRepo);

      expect(result.success).toBe(false);
      expect(result.error).toContain('already exists');
    });

    it('should handle insufficient permissions', async () => {
      mockOctokit.rest.repos.get.mockResolvedValueOnce({ data: { owner: { login: templateOwner }, name: templateRepo } });
      mockOctokit.rest.repos.createFork.mockRejectedValue({ status: 403 });

      const result = await service.forkRepository(templateOwner, templateRepo);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Insufficient permissions');
    });
  });

  describe('verifyFork', () => {
    const owner = 'test-user';
    const repo = 'test-repo';
    const mockRepo = {
      owner: { login: owner },
      name: repo,
      full_name: `${owner}/${repo}`,
      default_branch: 'main',
      private: false,
      fork: true,
      parent: {
        owner: { login: 'parent-owner' },
        name: 'parent-repo',
        full_name: 'parent-owner/parent-repo'
      }
    };

    it('should verify fork successfully', async () => {
      mockOctokit.rest.repos.get.mockResolvedValue({ data: mockRepo });

      const result = await service.verifyFork(owner, repo);

      expect(result.verified).toBe(true);
      expect(result.repository).toEqual({
        owner,
        name: repo,
        fullName: `${owner}/${repo}`,
        defaultBranch: 'main',
        private: false,
        fork: true,
        parent: {
          owner: 'parent-owner',
          name: 'parent-repo',
          fullName: 'parent-owner/parent-repo'
        }
      });
    });

    it('should handle repository not found', async () => {
      mockOctokit.rest.repos.get.mockRejectedValue({ status: 404 });

      const result = await service.verifyFork(owner, repo);

      expect(result.verified).toBe(false);
      expect(result.error).toContain('not found');
    });
  });

  describe('getRepositoryStructure', () => {
    const owner = 'test-user';
    const repo = 'test-repo';
    const mockRepoInfo = { default_branch: 'main' };
    const mockContents = [
      {
        name: 'README.md',
        path: 'README.md',
        type: 'file',
        size: 1024,
        sha: 'abc123',
        download_url: 'https://example.com/readme',
        html_url: 'https://github.com/test/readme'
      },
      {
        name: 'src',
        path: 'src',
        type: 'dir',
        size: 0,
        sha: 'def456',
        download_url: null,
        html_url: 'https://github.com/test/src'
      }
    ];

    it('should get repository structure successfully', async () => {
      mockOctokit.rest.repos.get.mockResolvedValue({ data: mockRepoInfo });
      mockOctokit.rest.repos.getContent.mockResolvedValue({ data: mockContents });

      const result = await service.getRepositoryStructure(owner, repo);

      expect(result.success).toBe(true);
      expect(result.structure.owner).toBe(owner);
      expect(result.structure.repo).toBe(repo);
      expect(result.structure.branch).toBe('main');
      expect(result.structure.contents).toHaveLength(2);
      
      // Check that directories come first
      expect(result.structure.contents[0].type).toBe('dir');
      expect(result.structure.contents[1].type).toBe('file');
    });

    it('should handle repository not found', async () => {
      mockOctokit.rest.repos.get.mockRejectedValue({ status: 404 });

      const result = await service.getRepositoryStructure(owner, repo);

      expect(result.success).toBe(false);
      expect(result.error).toContain('not found');
    });
  });

  describe('getFileContent', () => {
    const owner = 'test-user';
    const repo = 'test-repo';
    const path = 'data.json';
    const mockFile = {
      path,
      name: 'data.json',
      sha: 'abc123',
      size: 256,
      content: Buffer.from('{"test": "data"}').toString('base64'),
      encoding: 'base64',
      type: 'file',
      download_url: 'https://example.com/data.json'
    };

    it('should get file content successfully', async () => {
      mockOctokit.rest.repos.getContent.mockResolvedValue({ data: mockFile });

      const result = await service.getFileContent(owner, repo, path);

      expect(result.success).toBe(true);
      expect(result.file.path).toBe(path);
      expect(result.file.content).toBe('{"test": "data"}');
      expect(result.file.type).toBe('json');
    });

    it('should handle directory instead of file', async () => {
      mockOctokit.rest.repos.getContent.mockResolvedValue({ data: [mockFile] });

      const result = await service.getFileContent(owner, repo, path);

      expect(result.success).toBe(false);
      expect(result.error).toContain('is a directory');
    });

    it('should handle file not found', async () => {
      mockOctokit.rest.repos.getContent.mockRejectedValue({ status: 404 });

      const result = await service.getFileContent(owner, repo, path);

      expect(result.success).toBe(false);
      expect(result.error).toContain('not found');
    });
  });

  describe('updateFileContent', () => {
    const owner = 'test-user';
    const repo = 'test-repo';
    const path = 'data.json';
    const content = '{"updated": "data"}';
    const message = 'Update data.json';
    const sha = 'abc123';
    const mockResult = {
      commit: {
        sha: 'def456',
        message,
        author: { name: 'Test User' },
        html_url: 'https://github.com/test/commit/def456'
      },
      content: {
        path,
        sha: 'new-sha',
        size: 256
      }
    };

    it('should update file content successfully', async () => {
      mockOctokit.rest.repos.createOrUpdateFileContents.mockResolvedValue({ data: mockResult });

      const result = await service.updateFileContent(owner, repo, path, content, message, null, sha);

      expect(result.success).toBe(true);
      expect(result.commit.sha).toBe('def456');
      expect(result.commit.message).toBe(message);

      expect(mockOctokit.rest.repos.createOrUpdateFileContents).toHaveBeenCalledWith({
        owner,
        repo,
        path,
        message,
        content: Buffer.from(content).toString('base64'),
        sha
      });
    });

    it('should handle conflict (409)', async () => {
      mockOctokit.rest.repos.createOrUpdateFileContents.mockRejectedValue({ status: 409 });

      const result = await service.updateFileContent(owner, repo, path, content, message, null, sha);

      expect(result.success).toBe(false);
      expect(result.error).toContain('modified by another process');
    });

    it('should handle invalid content (422)', async () => {
      mockOctokit.rest.repos.createOrUpdateFileContents.mockRejectedValue({ status: 422 });

      const result = await service.updateFileContent(owner, repo, path, content, message, null, sha);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid file content');
    });
  });

  describe('createFile', () => {
    const owner = 'test-user';
    const repo = 'test-repo';
    const path = 'new-file.json';
    const content = '{"new": "file"}';
    const message = 'Create new file';
    const mockResult = {
      commit: {
        sha: 'def456',
        message,
        author: { name: 'Test User' },
        html_url: 'https://github.com/test/commit/def456'
      },
      content: {
        path,
        sha: 'new-sha',
        size: 256
      }
    };

    it('should create file successfully', async () => {
      mockOctokit.rest.repos.createOrUpdateFileContents.mockResolvedValue({ data: mockResult });

      const result = await service.createFile(owner, repo, path, content, message);

      expect(result.success).toBe(true);
      expect(result.commit.sha).toBe('def456');

      expect(mockOctokit.rest.repos.createOrUpdateFileContents).toHaveBeenCalledWith({
        owner,
        repo,
        path,
        message,
        content: Buffer.from(content).toString('base64')
      });
    });

    it('should handle file already exists (422)', async () => {
      mockOctokit.rest.repos.createOrUpdateFileContents.mockRejectedValue({ status: 422 });

      const result = await service.createFile(owner, repo, path, content, message);

      expect(result.success).toBe(false);
      expect(result.error).toContain('already exists');
    });
  });

  describe('deleteFile', () => {
    const owner = 'test-user';
    const repo = 'test-repo';
    const path = 'old-file.json';
    const message = 'Delete old file';
    const sha = 'abc123';
    const mockResult = {
      commit: {
        sha: 'def456',
        message,
        author: { name: 'Test User' },
        html_url: 'https://github.com/test/commit/def456'
      }
    };

    it('should delete file successfully', async () => {
      mockOctokit.rest.repos.deleteFile.mockResolvedValue({ data: mockResult });

      const result = await service.deleteFile(owner, repo, path, message, sha);

      expect(result.success).toBe(true);
      expect(result.commit.sha).toBe('def456');

      expect(mockOctokit.rest.repos.deleteFile).toHaveBeenCalledWith({
        owner,
        repo,
        path,
        message,
        sha
      });
    });

    it('should handle file not found (404)', async () => {
      mockOctokit.rest.repos.deleteFile.mockRejectedValue({ status: 404 });

      const result = await service.deleteFile(owner, repo, path, message, sha);

      expect(result.success).toBe(false);
      expect(result.error).toContain('not found');
    });
  });

  describe('helper methods', () => {
    describe('getFileType', () => {
      it('should identify file types correctly', () => {
        expect(service.getFileType('script.js')).toBe('javascript');
        expect(service.getFileType('data.json')).toBe('json');
        expect(service.getFileType('README.md')).toBe('markdown');
        expect(service.getFileType('image.png')).toBe('image');
        expect(service.getFileType('unknown.xyz')).toBe('unknown');
      });
    });

    describe('isEditableFile', () => {
      it('should identify editable files correctly', () => {
        expect(service.isEditableFile('script.js')).toBe(true);
        expect(service.isEditableFile('data.json')).toBe(true);
        expect(service.isEditableFile('README.md')).toBe(true);
        expect(service.isEditableFile('image.png')).toBe(false);
        expect(service.isEditableFile('binary.exe')).toBe(false);
      });
    });
  });

  describe('synchronization methods', () => {
    const owner = 'test-user';
    const repo = 'test-repo';

    describe('getLatestCommit', () => {
      const mockCommit = {
        sha: 'abc123',
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
        html_url: 'https://github.com/test/commit/abc123'
      };

      it('should get latest commit successfully', async () => {
        mockOctokit.rest.repos.get.mockResolvedValue({ data: { default_branch: 'main' } });
        mockOctokit.rest.repos.listCommits.mockResolvedValue({ data: [mockCommit] });

        const result = await service.getLatestCommit(owner, repo);

        expect(result.success).toBe(true);
        expect(result.commit.sha).toBe('abc123');
        expect(result.commit.message).toBe('Latest commit');
        expect(result.commit.branch).toBe('main');
      });

      it('should handle no commits found', async () => {
        mockOctokit.rest.repos.get.mockResolvedValue({ data: { default_branch: 'main' } });
        mockOctokit.rest.repos.listCommits.mockResolvedValue({ data: [] });

        const result = await service.getLatestCommit(owner, repo);

        expect(result.success).toBe(false);
        expect(result.error).toContain('No commits found');
      });
    });

    describe('checkForUpdates', () => {
      const lastKnownSha = 'old123';
      const mockCommits = [
        {
          sha: 'new456',
          commit: {
            message: 'New commit',
            author: {
              name: 'Test User',
              email: 'test@example.com',
              date: '2024-01-02T00:00:00Z'
            }
          },
          html_url: 'https://github.com/test/commit/new456'
        }
      ];

      beforeEach(() => {
        mockOctokit.rest.repos.get.mockResolvedValue({ data: { default_branch: 'main' } });
        mockOctokit.rest.repos.getCommit = vi.fn().mockResolvedValue({
          data: {
            commit: {
              author: { date: '2024-01-01T00:00:00Z' }
            }
          }
        });
      });

      it('should detect updates successfully', async () => {
        mockOctokit.rest.repos.listCommits.mockResolvedValue({ data: mockCommits });

        const result = await service.checkForUpdates(owner, repo, lastKnownSha);

        expect(result.success).toBe(true);
        expect(result.hasUpdates).toBe(true);
        expect(result.commits).toHaveLength(1);
        expect(result.commits[0].sha).toBe('new456');
      });

      it('should handle no updates', async () => {
        mockOctokit.rest.repos.listCommits.mockResolvedValue({ data: [] });

        const result = await service.checkForUpdates(owner, repo, lastKnownSha);

        expect(result.success).toBe(true);
        expect(result.hasUpdates).toBe(false);
        expect(result.commits).toHaveLength(0);
      });
    });

    describe('getSyncStatus', () => {
      const lastKnownSha = 'old123';
      const latestSha = 'new456';

      it('should return up-to-date status', async () => {
        const result = await service.getSyncStatus(owner, repo, lastKnownSha);

        expect(result.success).toBe(true);
        expect(result.status.upToDate).toBe(true);
        expect(result.status.newCommitsCount).toBe(0);
      });

      it('should return out-of-date status with new commits', async () => {
        mockOctokit.rest.repos.get.mockResolvedValue({ data: { default_branch: 'main' } });
        mockOctokit.rest.repos.listCommits.mockResolvedValue({ 
          data: [{ 
            sha: latestSha, 
            commit: { 
              message: 'New commit',
              author: { name: 'Test', email: 'test@example.com', date: '2024-01-01T00:00:00Z' },
              committer: { name: 'Test', email: 'test@example.com', date: '2024-01-01T00:00:00Z' }
            },
            html_url: 'https://github.com/test/commit/new456'
          }] 
        });
        mockOctokit.rest.repos.getCommit.mockResolvedValue({
          data: {
            commit: {
              author: { date: '2024-01-01T00:00:00Z' }
            }
          }
        });

        const result = await service.getSyncStatus(owner, repo, lastKnownSha);

        expect(result.success).toBe(true);
        expect(result.status.upToDate).toBe(false);
        expect(result.status.latestSha).toBe(latestSha);
      });
    });

    describe('detectConflicts', () => {
      const lastKnownSha = 'old123';
      const localChanges = [
        { path: 'data.json', content: '{"local": "change"}', sha: 'local123' }
      ];

      it('should detect no conflicts when no remote updates', async () => {
        mockOctokit.rest.repos.get.mockResolvedValue({ data: { default_branch: 'main' } });
        mockOctokit.rest.repos.getCommit.mockResolvedValue({
          data: {
            commit: {
              author: { date: '2024-01-01T00:00:00Z' }
            }
          }
        });
        mockOctokit.rest.repos.listCommits.mockResolvedValue({ data: [] });

        const result = await service.detectConflicts(owner, repo, localChanges, lastKnownSha);

        expect(result.success).toBe(true);
        expect(result.hasConflicts).toBe(false);
        expect(result.conflicts).toHaveLength(0);
      });

      it('should detect conflicts when same file modified', async () => {
        const mockCommits = [{ sha: 'new456', message: 'Remote change' }];
        
        mockOctokit.rest.repos.get.mockResolvedValue({ data: { default_branch: 'main' } });
        mockOctokit.rest.repos.getCommit
          .mockResolvedValueOnce({
            data: {
              commit: { author: { date: '2024-01-01T00:00:00Z' } }
            }
          })
          .mockResolvedValueOnce({
            data: {
              files: [{ filename: 'data.json', status: 'modified' }]
            }
          });
        mockOctokit.rest.repos.listCommits.mockResolvedValue({ data: mockCommits });
        mockOctokit.rest.repos.getContent.mockResolvedValue({
          data: {
            type: 'file',
            content: Buffer.from('{"remote": "change"}').toString('base64'),
            encoding: 'base64',
            sha: 'remote123',
            path: 'data.json',
            name: 'data.json',
            size: 20,
            download_url: 'https://example.com/data.json'
          }
        });

        const result = await service.detectConflicts(owner, repo, localChanges, lastKnownSha);

        expect(result.success).toBe(true);
        expect(result.hasConflicts).toBe(true);
        expect(result.conflicts).toHaveLength(1);
        expect(result.conflicts[0].path).toBe('data.json');
        expect(result.conflicts[0].type).toBe('content_conflict');
      });
    });

    describe('resolveConflicts', () => {
      const conflicts = [
        {
          path: 'data.json',
          localChange: { content: '{"local": "change"}', sha: 'local123' },
          remoteChange: { content: '{"remote": "change"}', sha: 'remote123' }
        }
      ];

      it('should resolve conflicts with keep_local strategy', async () => {
        mockOctokit.rest.repos.createOrUpdateFileContents.mockResolvedValue({
          data: {
            commit: {
              sha: 'resolved123',
              message: 'Resolve conflict',
              author: { name: 'Test User' },
              committer: { name: 'Test User' },
              html_url: 'https://github.com/test/commit/resolved123'
            },
            content: {
              name: 'data.json',
              path: 'data.json',
              sha: 'new-sha',
              size: 256
            }
          }
        });

        const result = await service.resolveConflicts(owner, repo, conflicts, 'keep_local');

        expect(result.success).toBe(true);
        expect(result.resolutions).toHaveLength(1);
        expect(result.resolutions[0].resolutionType).toBe('kept_local');
        expect(result.summary.resolved).toBe(1);
      });

      it('should resolve conflicts with manual strategy', async () => {
        const manualResolutions = {
          'data.json': '{"manual": "resolution"}'
        };
        
        mockOctokit.rest.repos.createOrUpdateFileContents.mockResolvedValue({
          data: {
            commit: {
              sha: 'resolved123',
              message: 'Resolve conflict',
              author: { name: 'Test User' },
              committer: { name: 'Test User' },
              html_url: 'https://github.com/test/commit/resolved123'
            },
            content: {
              name: 'data.json',
              path: 'data.json',
              sha: 'new-sha',
              size: 256
            }
          }
        });

        const result = await service.resolveConflicts(owner, repo, conflicts, 'manual', manualResolutions);

        expect(result.success).toBe(true);
        expect(result.resolutions[0].resolutionType).toBe('manual_resolution');
      });
    });
  });

  describe('error handling and rate limiting', () => {
    describe('getRateLimitStatus', () => {
      it('should return rate limit status', () => {
        const status = service.getRateLimitStatus();
        
        expect(status).toEqual({
          rateLimit: { remaining: 4000, limit: 5000, reset: expect.any(Number) },
          queue: { length: 0, isProcessing: false }
        });
      });
    });

    describe('checkServiceHealth', () => {
      it('should return healthy status when API is accessible', async () => {
        const mockUser = { login: 'test-user', id: 12345 };
        mockOctokit.rest.users.getAuthenticated.mockResolvedValue({ 
          data: mockUser,
          headers: {
            'x-ratelimit-remaining': '4000',
            'x-ratelimit-limit': '5000',
            'x-ratelimit-reset': Math.floor((Date.now() + 3600000) / 1000).toString()
          }
        });

        const health = await service.checkServiceHealth();

        expect(health.healthy).toBe(true);
        expect(health.user).toEqual({
          login: 'test-user',
          id: 12345
        });
        expect(health.rateLimit).toBeDefined();
        expect(health.timestamp).toBeDefined();
      });

      it('should return unhealthy status when API is not accessible', async () => {
        const error = new Error('Network error');
        error.name = 'GitHubNetworkError';
        mockOctokit.rest.users.getAuthenticated.mockRejectedValue(error);

        const health = await service.checkServiceHealth();

        expect(health.healthy).toBe(false);
        expect(health.error).toBeDefined();
        expect(health.details).toBeDefined();
        expect(health.timestamp).toBeDefined();
      });
    });

    describe('graceful degradation', () => {
      it('should enable graceful degradation', () => {
        service.enableGracefulDegradation();
        expect(service.isGracefulDegradationEnabled()).toBe(true);
      });

      it('should disable graceful degradation', () => {
        service.enableGracefulDegradation();
        service.disableGracefulDegradation();
        expect(service.isGracefulDegradationEnabled()).toBe(false);
      });
    });

    describe('executeWithRetry', () => {
      it('should execute request successfully', async () => {
        const mockResult = { data: 'test-data', headers: {} };
        const requestFn = vi.fn().mockResolvedValue(mockResult);

        const result = await service.executeWithRetry(requestFn, 'test operation');

        expect(result).toEqual(mockResult);
        expect(mockRateLimitManager.executeRequest).toHaveBeenCalled();
        expect(mockRetryManager.execute).toHaveBeenCalled();
      });
    });

    describe('handleError', () => {
      it('should return formatted error response', () => {
        const error = new Error('Test error');
        error.name = 'GitHubAPIError';
        error.status = 404;
        error.timestamp = '2024-01-01T00:00:00Z';

        const result = service.handleError(error, 'test operation');

        expect(result.success).toBe(false);
        expect(result.error).toBeDefined();
        expect(result.details).toEqual({
          type: 'GitHubAPIError',
          status: 404,
          retryable: false,
          timestamp: '2024-01-01T00:00:00Z'
        });
      });
    });
  });

  describe('createRepositoryService', () => {
    it('should create service instance', () => {
      const service = createRepositoryService(mockToken);
      expect(service).toBeInstanceOf(RepositoryService);
    });
  });
});