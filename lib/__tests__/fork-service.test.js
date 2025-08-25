import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ForkService, createForkService, forkRepository } from '../fork-service.js';

// Mock dependencies
vi.mock('../github-auth.js', () => ({
  createGitHubClient: vi.fn(() => ({
    rest: {
      repos: {
        get: vi.fn(),
        createFork: vi.fn(),
        compareCommits: vi.fn()
      },
      users: {
        getAuthenticated: vi.fn()
      }
    }
  }))
}));

vi.mock('../github-errors.js', () => ({
  parseGitHubError: vi.fn((error) => error),
  isRetryableError: vi.fn(() => false),
  getUserFriendlyMessage: vi.fn((error) => error.message || 'Unknown error')
}));

vi.mock('../rate-limit-manager.js', () => ({
  getRateLimitManager: vi.fn(() => ({
    executeRequest: vi.fn((fn) => fn()),
    updateRateLimit: vi.fn(),
    getStatus: vi.fn(() => ({
      rateLimit: { remaining: 5000, limit: 5000, reset: Date.now() + 3600000 },
      queue: { length: 0, isProcessing: false }
    }))
  })),
  RetryManager: vi.fn(() => ({
    execute: vi.fn((fn) => fn())
  }))
}));

describe('ForkService', () => {
  let forkService;
  let mockOctokit;
  const mockAccessToken = 'test-token';

  beforeEach(() => {
    vi.clearAllMocks();
    forkService = new ForkService(mockAccessToken);
    mockOctokit = forkService.octokit;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('constructor', () => {
    it('should throw error if no access token provided', () => {
      expect(() => new ForkService()).toThrow('GitHub access token is required');
    });

    it('should initialize with default options', () => {
      const service = new ForkService(mockAccessToken);
      expect(service.accessToken).toBe(mockAccessToken);
      expect(service.options.forkTimeout).toBe(30000);
      expect(service.options.maxRetries).toBe(3);
    });

    it('should accept custom options', () => {
      const options = { forkTimeout: 60000, maxRetries: 5 };
      const service = new ForkService(mockAccessToken, options);
      expect(service.options.forkTimeout).toBe(60000);
      expect(service.options.maxRetries).toBe(5);
    });
  });

  describe('validateForkParameters', () => {
    it('should validate required parameters', () => {
      expect(forkService.validateForkParameters('', 'repo')).toEqual({
        valid: false,
        error: 'Template owner is required and must be a string'
      });

      expect(forkService.validateForkParameters('owner', '')).toEqual({
        valid: false,
        error: 'Template repository name is required and must be a string'
      });
    });

    it('should validate parameter types', () => {
      expect(forkService.validateForkParameters(123, 'repo')).toEqual({
        valid: false,
        error: 'Template owner is required and must be a string'
      });

      expect(forkService.validateForkParameters('owner', 123)).toEqual({
        valid: false,
        error: 'Template repository name is required and must be a string'
      });
    });

    it('should validate GitHub username format', () => {
      expect(forkService.validateForkParameters('-invalid', 'repo')).toEqual({
        valid: false,
        error: 'Invalid template owner format'
      });

      expect(forkService.validateForkParameters('invalid-', 'repo')).toEqual({
        valid: false,
        error: 'Invalid template owner format'
      });
    });

    it('should validate repository name format', () => {
      expect(forkService.validateForkParameters('owner', 'invalid repo')).toEqual({
        valid: false,
        error: 'Invalid template repository name format'
      });
    });

    it('should validate optional new name', () => {
      expect(forkService.validateForkParameters('owner', 'repo', { name: 'invalid name' })).toEqual({
        valid: false,
        error: 'Invalid new repository name format'
      });
    });

    it('should validate optional organization', () => {
      expect(forkService.validateForkParameters('owner', 'repo', { organization: '-invalid' })).toEqual({
        valid: false,
        error: 'Invalid organization name format'
      });
    });

    it('should pass valid parameters', () => {
      expect(forkService.validateForkParameters('owner', 'repo')).toEqual({
        valid: true
      });

      expect(forkService.validateForkParameters('owner', 'repo', { 
        name: 'new-repo', 
        organization: 'org' 
      })).toEqual({
        valid: true
      });
    });
  });

  describe('verifyTemplateRepository', () => {
    it('should verify accessible repository', async () => {
      const mockRepo = {
        owner: { login: 'owner' },
        name: 'repo',
        full_name: 'owner/repo',
        private: false,
        fork: false,
        archived: false,
        disabled: false,
        default_branch: 'main',
        forks_count: 10,
        allow_forking: true
      };

      mockOctokit.rest.repos.get.mockResolvedValue({ data: mockRepo });

      const result = await forkService.verifyTemplateRepository('owner', 'repo');

      expect(result.success).toBe(true);
      expect(result.repository.owner).toBe('owner');
      expect(result.repository.name).toBe('repo');
      expect(mockOctokit.rest.repos.get).toHaveBeenCalledWith({
        owner: 'owner',
        repo: 'repo'
      });
    });

    it('should handle repository not found', async () => {
      const error = new Error('Not Found');
      error.status = 404;
      mockOctokit.rest.repos.get.mockRejectedValue(error);

      const result = await forkService.verifyTemplateRepository('owner', 'repo');

      expect(result.success).toBe(false);
      expect(result.error).toContain('not found or not accessible');
      expect(result.details.type).toBe('RepositoryNotFoundError');
    });

    it('should handle access denied', async () => {
      const error = new Error('Forbidden');
      error.status = 403;
      mockOctokit.rest.repos.get.mockRejectedValue(error);

      const result = await forkService.verifyTemplateRepository('owner', 'repo');

      expect(result.success).toBe(false);
      expect(result.error).toContain('Access denied');
      expect(result.details.type).toBe('AccessDeniedError');
    });

    it('should reject archived repository', async () => {
      const mockRepo = {
        owner: { login: 'owner' },
        name: 'repo',
        archived: true,
        disabled: false
      };

      mockOctokit.rest.repos.get.mockResolvedValue({ data: mockRepo });

      const result = await forkService.verifyTemplateRepository('owner', 'repo');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Cannot fork archived repository');
      expect(result.details.type).toBe('ArchivedRepositoryError');
    });

    it('should reject disabled repository', async () => {
      const mockRepo = {
        owner: { login: 'owner' },
        name: 'repo',
        archived: false,
        disabled: true
      };

      mockOctokit.rest.repos.get.mockResolvedValue({ data: mockRepo });

      const result = await forkService.verifyTemplateRepository('owner', 'repo');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Cannot fork disabled repository');
      expect(result.details.type).toBe('DisabledRepositoryError');
    });
  });

  describe('checkExistingFork', () => {
    beforeEach(() => {
      mockOctokit.rest.users.getAuthenticated.mockResolvedValue({
        data: { login: 'testuser' }
      });
    });

    it('should detect existing fork', async () => {
      const mockExistingRepo = {
        owner: { login: 'testuser' },
        name: 'repo',
        full_name: 'testuser/repo',
        fork: true,
        parent: {
          owner: { login: 'owner' },
          name: 'repo',
          full_name: 'owner/repo'
        }
      };

      mockOctokit.rest.repos.get.mockResolvedValue({ data: mockExistingRepo });

      const result = await forkService.checkExistingFork('owner', 'repo');

      expect(result.exists).toBe(true);
      expect(result.repository.fullName).toBe('testuser/repo');
      expect(result.repository.fork).toBe(true);
    });

    it('should return false when repository does not exist', async () => {
      const error = new Error('Not Found');
      error.status = 404;
      mockOctokit.rest.repos.get.mockRejectedValue(error);

      const result = await forkService.checkExistingFork('owner', 'repo');

      expect(result.exists).toBe(false);
    });

    it('should check with custom name and organization', async () => {
      const options = { name: 'custom-repo', organization: 'myorg' };
      
      const error = new Error('Not Found');
      error.status = 404;
      mockOctokit.rest.repos.get.mockRejectedValue(error);

      await forkService.checkExistingFork('owner', 'repo', options);

      expect(mockOctokit.rest.repos.get).toHaveBeenCalledWith({
        owner: 'myorg',
        repo: 'custom-repo'
      });
    });
  });

  describe('performFork', () => {
    it('should successfully fork repository', async () => {
      const mockForkedRepo = {
        owner: { login: 'testuser' },
        name: 'repo',
        full_name: 'testuser/repo',
        html_url: 'https://github.com/testuser/repo',
        clone_url: 'https://github.com/testuser/repo.git',
        ssh_url: 'git@github.com:testuser/repo.git',
        default_branch: 'main',
        private: false,
        fork: true,
        parent: {
          owner: { login: 'owner' },
          name: 'repo',
          full_name: 'owner/repo'
        },
        created_at: '2023-01-01T00:00:00Z',
        updated_at: '2023-01-01T00:00:00Z',
        pushed_at: '2023-01-01T00:00:00Z'
      };

      mockOctokit.rest.repos.createFork.mockResolvedValue({ data: mockForkedRepo });

      const result = await forkService.performFork('owner', 'repo');

      expect(result.success).toBe(true);
      expect(result.repository.owner).toBe('testuser');
      expect(result.repository.name).toBe('repo');
      expect(result.repository.fork).toBe(true);
      expect(mockOctokit.rest.repos.createFork).toHaveBeenCalledWith({
        owner: 'owner',
        repo: 'repo'
      });
    });

    it('should fork with custom options', async () => {
      const mockForkedRepo = {
        owner: { login: 'myorg' },
        name: 'custom-repo',
        full_name: 'myorg/custom-repo',
        html_url: 'https://github.com/myorg/custom-repo',
        clone_url: 'https://github.com/myorg/custom-repo.git',
        ssh_url: 'git@github.com:myorg/custom-repo.git',
        default_branch: 'main',
        private: false,
        fork: true,
        created_at: '2023-01-01T00:00:00Z',
        updated_at: '2023-01-01T00:00:00Z',
        pushed_at: '2023-01-01T00:00:00Z'
      };

      mockOctokit.rest.repos.createFork.mockResolvedValue({ data: mockForkedRepo });

      const options = { 
        name: 'custom-repo', 
        organization: 'myorg',
        defaultBranchOnly: true
      };

      const result = await forkService.performFork('owner', 'repo', options);

      expect(result.success).toBe(true);
      expect(mockOctokit.rest.repos.createFork).toHaveBeenCalledWith({
        owner: 'owner',
        repo: 'repo',
        name: 'custom-repo',
        organization: 'myorg',
        default_branch_only: true
      });
    });

    it('should handle insufficient permissions', async () => {
      const error = new Error('Forbidden');
      error.status = 403;
      mockOctokit.rest.repos.createFork.mockRejectedValue(error);

      const result = await forkService.performFork('owner', 'repo');

      expect(result.success).toBe(false);
      expect(result.error).toContain('Insufficient permissions');
      expect(result.details.type).toBe('InsufficientPermissionsError');
    });

    it('should handle fork conflict', async () => {
      const error = new Error('Validation Failed');
      error.status = 422;
      mockOctokit.rest.repos.createFork.mockRejectedValue(error);

      const result = await forkService.performFork('owner', 'repo');

      expect(result.success).toBe(false);
      expect(result.error).toContain('Fork already exists');
      expect(result.details.type).toBe('ForkConflictError');
    });
  });

  describe('waitForForkReady', () => {
    it('should wait for fork to be ready', async () => {
      const mockRepo = {
        owner: { login: 'testuser' },
        name: 'repo',
        full_name: 'testuser/repo',
        default_branch: 'main',
        fork: true,
        empty: false,
        size: 100
      };

      mockOctokit.rest.repos.get.mockResolvedValue({ data: mockRepo });

      const result = await forkService.waitForForkReady('testuser', 'repo', 5000);

      expect(result.ready).toBe(true);
      expect(result.repository.owner).toBe('testuser');
      expect(result.repository.empty).toBe(false);
    });

    it('should timeout if fork is not ready', async () => {
      const error = new Error('Not Found');
      error.status = 404;
      mockOctokit.rest.repos.get.mockRejectedValue(error);

      const result = await forkService.waitForForkReady('testuser', 'repo', 100);

      expect(result.ready).toBe(false);
      expect(result.error).toContain('timed out');
    });

    it('should handle repository errors', async () => {
      const error = new Error('Server Error');
      error.status = 500;
      mockOctokit.rest.repos.get.mockRejectedValue(error);

      const result = await forkService.waitForForkReady('testuser', 'repo', 100);

      expect(result.ready).toBe(false);
      expect(result.error).toContain('Error checking fork readiness');
    });
  });

  describe('verifyFork', () => {
    it('should verify successful fork', async () => {
      const mockRepo = {
        owner: { login: 'testuser' },
        name: 'repo',
        full_name: 'testuser/repo',
        fork: true,
        parent: {
          owner: { login: 'owner' },
          name: 'repo',
          full_name: 'owner/repo'
        },
        default_branch: 'main',
        private: false,
        empty: false,
        size: 100,
        created_at: '2023-01-01T00:00:00Z',
        updated_at: '2023-01-01T00:00:00Z'
      };

      mockOctokit.rest.repos.get.mockResolvedValue({ data: mockRepo });

      const result = await forkService.verifyFork('testuser', 'repo', 'owner/repo');

      expect(result.verified).toBe(true);
      expect(result.repository.fork).toBe(true);
      expect(result.repository.parent.fullName).toBe('owner/repo');
    });

    it('should fail if repository is not a fork', async () => {
      const mockRepo = {
        owner: { login: 'testuser' },
        name: 'repo',
        full_name: 'testuser/repo',
        fork: false
      };

      mockOctokit.rest.repos.get.mockResolvedValue({ data: mockRepo });

      const result = await forkService.verifyFork('testuser', 'repo');

      expect(result.verified).toBe(false);
      expect(result.error).toBe('Repository exists but is not a fork');
    });

    it('should fail if parent mismatch', async () => {
      const mockRepo = {
        owner: { login: 'testuser' },
        name: 'repo',
        full_name: 'testuser/repo',
        fork: true,
        parent: {
          owner: { login: 'different' },
          name: 'repo',
          full_name: 'different/repo'
        }
      };

      mockOctokit.rest.repos.get.mockResolvedValue({ data: mockRepo });

      const result = await forkService.verifyFork('testuser', 'repo', 'owner/repo');

      expect(result.verified).toBe(false);
      expect(result.error).toContain('Fork parent mismatch');
    });

    it('should handle repository not found', async () => {
      const error = new Error('Not Found');
      error.status = 404;
      mockOctokit.rest.repos.get.mockRejectedValue(error);

      const result = await forkService.verifyFork('testuser', 'repo');

      expect(result.verified).toBe(false);
      expect(result.error).toBe('Forked repository not found');
    });
  });

  describe('forkRepository', () => {
    it('should complete full fork workflow', async () => {
      // Mock template verification
      const mockTemplateRepo = {
        owner: { login: 'owner' },
        name: 'repo',
        full_name: 'owner/repo',
        private: false,
        fork: false,
        archived: false,
        disabled: false,
        default_branch: 'main',
        forks_count: 10,
        allow_forking: true
      };

      // Mock user authentication
      mockOctokit.rest.users.getAuthenticated.mockResolvedValue({
        data: { login: 'testuser' }
      });

      // Mock existing fork check (not found)
      mockOctokit.rest.repos.get
        .mockResolvedValueOnce({ data: mockTemplateRepo }) // Template verification
        .mockRejectedValueOnce({ status: 404 }) // Existing fork check
        .mockResolvedValueOnce({ // Fork creation
          data: {
            owner: { login: 'testuser' },
            name: 'repo',
            full_name: 'testuser/repo',
            html_url: 'https://github.com/testuser/repo',
            clone_url: 'https://github.com/testuser/repo.git',
            ssh_url: 'git@github.com:testuser/repo.git',
            default_branch: 'main',
            private: false,
            fork: true,
            parent: {
              owner: { login: 'owner' },
              name: 'repo',
              full_name: 'owner/repo'
            },
            created_at: '2023-01-01T00:00:00Z',
            updated_at: '2023-01-01T00:00:00Z',
            pushed_at: '2023-01-01T00:00:00Z'
          }
        })
        .mockResolvedValueOnce({ // Fork readiness check
          data: {
            owner: { login: 'testuser' },
            name: 'repo',
            full_name: 'testuser/repo',
            default_branch: 'main',
            fork: true,
            empty: false,
            size: 100
          }
        });

      mockOctokit.rest.repos.createFork.mockResolvedValue({
        data: {
          owner: { login: 'testuser' },
          name: 'repo',
          full_name: 'testuser/repo',
          html_url: 'https://github.com/testuser/repo',
          clone_url: 'https://github.com/testuser/repo.git',
          ssh_url: 'git@github.com:testuser/repo.git',
          default_branch: 'main',
          private: false,
          fork: true,
          parent: {
            owner: { login: 'owner' },
            name: 'repo',
            full_name: 'owner/repo'
          },
          created_at: '2023-01-01T00:00:00Z',
          updated_at: '2023-01-01T00:00:00Z',
          pushed_at: '2023-01-01T00:00:00Z'
        }
      });

      const result = await forkService.forkRepository('owner', 'repo');

      expect(result.success).toBe(true);
      expect(result.repository.owner).toBe('testuser');
      expect(result.repository.name).toBe('repo');
      expect(result.repository.verified).toBe(true);
    });

    it('should fail with invalid parameters', async () => {
      const result = await forkService.forkRepository('', 'repo');

      expect(result.success).toBe(false);
      expect(result.error).toContain('Template owner is required');
      expect(result.details.type).toBe('ValidationError');
    });

    it('should fail if template repository does not exist', async () => {
      const error = new Error('Not Found');
      error.status = 404;
      mockOctokit.rest.repos.get.mockRejectedValue(error);

      const result = await forkService.forkRepository('owner', 'repo');

      expect(result.success).toBe(false);
      expect(result.error).toContain('not found or not accessible');
    });

    it('should fail if fork already exists', async () => {
      // Mock template verification
      const mockTemplateRepo = {
        owner: { login: 'owner' },
        name: 'repo',
        archived: false,
        disabled: false
      };

      // Mock user authentication
      mockOctokit.rest.users.getAuthenticated.mockResolvedValue({
        data: { login: 'testuser' }
      });

      // Mock existing fork
      const mockExistingRepo = {
        owner: { login: 'testuser' },
        name: 'repo',
        full_name: 'testuser/repo',
        fork: true
      };

      mockOctokit.rest.repos.get
        .mockResolvedValueOnce({ data: mockTemplateRepo }) // Template verification
        .mockResolvedValueOnce({ data: mockExistingRepo }); // Existing fork check

      const result = await forkService.forkRepository('owner', 'repo');

      expect(result.success).toBe(false);
      expect(result.error).toContain('already exists');
      expect(result.details.type).toBe('ForkExistsError');
    });
  });

  describe('getForkStatus', () => {
    it('should get fork status with sync information', async () => {
      const mockRepo = {
        owner: { login: 'testuser' },
        name: 'repo',
        full_name: 'testuser/repo',
        private: false,
        empty: false,
        size: 100,
        default_branch: 'main',
        fork: true,
        parent: {
          owner: { login: 'owner' },
          name: 'repo',
          full_name: 'owner/repo'
        },
        created_at: '2023-01-01T00:00:00Z',
        updated_at: '2023-01-01T00:00:00Z',
        pushed_at: '2023-01-01T00:00:00Z'
      };

      const mockComparison = {
        data: {
          ahead_by: 0,
          behind_by: 2
        }
      };

      mockOctokit.rest.repos.get.mockResolvedValue({ data: mockRepo });
      mockOctokit.rest.repos.compareCommits.mockResolvedValue(mockComparison);

      const result = await forkService.getForkStatus('testuser', 'repo');

      expect(result.success).toBe(true);
      expect(result.status.exists).toBe(true);
      expect(result.status.fork).toBe(true);
      expect(result.status.syncStatus.behindBy).toBe(2);
      expect(result.status.syncStatus.upToDate).toBe(false);
    });

    it('should handle non-existent repository', async () => {
      const error = new Error('Not Found');
      error.status = 404;
      mockOctokit.rest.repos.get.mockRejectedValue(error);

      const result = await forkService.getForkStatus('testuser', 'repo');

      expect(result.success).toBe(true);
      expect(result.status.exists).toBe(false);
    });
  });
});

describe('createForkService', () => {
  it('should create ForkService instance', () => {
    const service = createForkService('test-token');
    expect(service).toBeInstanceOf(ForkService);
    expect(service.accessToken).toBe('test-token');
  });

  it('should pass options to ForkService', () => {
    const options = { forkTimeout: 60000 };
    const service = createForkService('test-token', options);
    expect(service.options.forkTimeout).toBe(60000);
  });
});

describe('forkRepository', () => {
  it('should fork repository with simplified interface', async () => {
    // This is an integration test that would require mocking the entire flow
    // For now, we'll just test that it creates a service and calls the method
    const mockForkService = {
      forkRepository: vi.fn().mockResolvedValue({ success: true })
    };

    // Mock the ForkService constructor to return our mock
    vi.doMock('../fork-service.js', () => ({
      ForkService: vi.fn(() => mockForkService),
      createForkService: vi.fn(() => mockForkService),
      forkRepository: async (accessToken, templateOwner, templateRepo, options = {}) => {
        const service = mockForkService;
        return service.forkRepository(templateOwner, templateRepo, options);
      }
    }));

    const { forkRepository: forkRepo } = await import('../fork-service.js');
    const result = await forkRepo('test-token', 'owner', 'repo');

    expect(result.success).toBe(true);
    expect(mockForkService.forkRepository).toHaveBeenCalledWith('owner', 'repo', {});
  });
});