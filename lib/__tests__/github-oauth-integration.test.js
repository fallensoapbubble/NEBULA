import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { validateGitHubToken, refreshGitHubToken, createGitHubClient } from '../github-auth.js';
import { RepositoryService } from '../repository-service.js';

// Mock Octokit
const mockOctokitInstance = {
  auth: 'test-token',
  rest: {
    users: {
      getAuthenticated: vi.fn()
    },
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
  },
  request: vi.fn()
};

vi.mock('@octokit/rest', () => ({
  Octokit: vi.fn().mockImplementation(() => mockOctokitInstance)
}));

// Mock rate limit manager
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

// Mock GitHub errors
vi.mock('../github-errors.js', () => ({
  parseGitHubError: vi.fn((error) => error),
  isRetryableError: vi.fn(() => false),
  getUserFriendlyMessage: vi.fn((error) => error.message)
}));

// Mock fetch globally
global.fetch = vi.fn();

describe('GitHub OAuth Integration Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('OAuth Flow Integration', () => {
    it('should complete full OAuth token validation flow', async () => {
      const mockUser = {
        id: 12345,
        login: 'testuser',
        name: 'Test User',
        email: 'test@example.com',
        avatar_url: 'https://github.com/avatar.jpg'
      };

      mockOctokitInstance.rest.users.getAuthenticated.mockResolvedValue({
        data: mockUser
      });

      mockOctokitInstance.request.mockResolvedValue({
        headers: {
          'x-oauth-scopes': 'public_repo, repo, user:email',
          'x-ratelimit-limit': '5000',
          'x-ratelimit-remaining': '4999',
          'x-ratelimit-reset': '1640995200'
        }
      });

      const result = await validateGitHubToken('valid-oauth-token');

      expect(result.valid).toBe(true);
      expect(result.user).toEqual(mockUser);
      expect(result.scopes).toEqual(['public_repo', 'repo', 'user:email']);
      expect(result.rateLimit).toBeDefined();
      expect(result.rateLimit.remaining).toBe(4999);
    });

    it('should handle OAuth token refresh flow', async () => {
      fetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          access_token: 'new-access-token',
          refresh_token: 'new-refresh-token',
          expires_in: 3600,
          scope: 'public_repo repo user:email'
        })
      });

      // Mock environment variables
      process.env.GITHUB_CLIENT_ID = 'test-client-id';
      process.env.GITHUB_CLIENT_SECRET = 'test-client-secret';

      const result = await refreshGitHubToken('valid-refresh-token');

      expect(result.success).toBe(true);
      expect(result.tokens.accessToken).toBe('new-access-token');
      expect(result.tokens.refreshToken).toBe('new-refresh-token');
      expect(result.tokens.expiresIn).toBe(3600);

      expect(fetch).toHaveBeenCalledWith('https://github.com/login/oauth/access_token', {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
          'User-Agent': 'Nebula-Portfolio-Platform'
        },
        body: JSON.stringify({
          client_id: 'test-client-id',
          client_secret: 'test-client-secret',
          refresh_token: 'valid-refresh-token',
          grant_type: 'refresh_token'
        })
      });

      // Cleanup
      delete process.env.GITHUB_CLIENT_ID;
      delete process.env.GITHUB_CLIENT_SECRET;
    });

    it('should handle OAuth token expiration and refresh cycle', async () => {
      // First call - token expired
      const expiredError = new Error('Bad credentials');
      expiredError.status = 401;
      mockOctokitInstance.rest.users.getAuthenticated.mockRejectedValueOnce(expiredError);

      // Mock token refresh
      fetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          access_token: 'refreshed-token',
          expires_in: 3600
        })
      });

      // Mock environment variables
      process.env.GITHUB_CLIENT_ID = 'test-client-id';
      process.env.GITHUB_CLIENT_SECRET = 'test-client-secret';

      // First validation should fail
      const expiredResult = await validateGitHubToken('expired-token');
      expect(expiredResult.valid).toBe(false);
      expect(expiredResult.error).toBe('Invalid or expired token');

      // Refresh token
      const refreshResult = await refreshGitHubToken('refresh-token');
      expect(refreshResult.success).toBe(true);

      // Second validation with new token should succeed
      const mockUser = { id: 12345, login: 'testuser' };
      mockOctokitInstance.rest.users.getAuthenticated.mockResolvedValueOnce({
        data: mockUser
      });
      mockOctokitInstance.request.mockResolvedValueOnce({
        headers: {
          'x-oauth-scopes': 'public_repo',
          'x-ratelimit-limit': '5000',
          'x-ratelimit-remaining': '4998',
          'x-ratelimit-reset': '1640995200'
        }
      });

      const newResult = await validateGitHubToken('refreshed-token');
      expect(newResult.valid).toBe(true);
      expect(newResult.user).toEqual(mockUser);

      // Cleanup
      delete process.env.GITHUB_CLIENT_ID;
      delete process.env.GITHUB_CLIENT_SECRET;
    });
  });

  describe('Repository Operations Integration', () => {
    let repositoryService;

    beforeEach(() => {
      repositoryService = new RepositoryService('test-token');
    });

    it('should complete full repository forking workflow', async () => {
      const { Octokit } = await import('@octokit/rest');
      const mockOctokit = repositoryService.octokit;

      // Mock template repository verification
      mockOctokit.rest.repos.get.mockResolvedValueOnce({
        data: {
          id: 1,
          name: 'template-repo',
          owner: { login: 'template-owner' },
          private: false
        }
      });

      // Mock fork creation
      const mockForkedRepo = {
        id: 2,
        name: 'forked-repo',
        full_name: 'testuser/forked-repo',
        owner: { login: 'testuser' },
        html_url: 'https://github.com/testuser/forked-repo',
        clone_url: 'https://github.com/testuser/forked-repo.git',
        default_branch: 'main',
        private: false,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z'
      };

      mockOctokit.rest.repos.createFork.mockResolvedValueOnce({
        data: mockForkedRepo
      });

      // Mock fork verification
      mockOctokit.rest.repos.get.mockResolvedValueOnce({
        data: mockForkedRepo
      });

      // Mock verifyRepositoryExists and waitForForkReady
      vi.spyOn(repositoryService, 'verifyRepositoryExists').mockResolvedValue({ exists: true });
      vi.spyOn(repositoryService, 'waitForForkReady').mockResolvedValue({ ready: true });

      const result = await repositoryService.forkRepository('template-owner', 'template-repo');

      expect(result.success).toBe(true);
      expect(result.repository.owner).toBe('testuser');
      expect(result.repository.name).toBe('forked-repo');
      expect(result.repository.url).toBe('https://github.com/testuser/forked-repo');

      // Verify fork
      const verifyResult = await repositoryService.verifyFork('testuser', 'forked-repo');
      expect(verifyResult.verified).toBe(true);
      expect(verifyResult.repository.owner).toBe('testuser');
    });

    it('should handle repository content operations', async () => {
      const mockOctokit = repositoryService.octokit;

      // Mock repository structure
      const mockContents = [
        {
          name: 'data.json',
          path: 'data.json',
          type: 'file',
          size: 256,
          sha: 'file-sha-123',
          url: 'https://api.github.com/repos/owner/repo/contents/data.json',
          download_url: 'https://raw.githubusercontent.com/owner/repo/main/data.json'
        },
        {
          name: 'README.md',
          path: 'README.md',
          type: 'file',
          size: 1024,
          sha: 'readme-sha-456',
          url: 'https://api.github.com/repos/owner/repo/contents/README.md',
          download_url: 'https://raw.githubusercontent.com/owner/repo/main/README.md'
        }
      ];

      mockOctokit.rest.repos.getContent.mockResolvedValueOnce({
        data: mockContents
      });

      // Get repository structure
      const structureResult = await repositoryService.getRepositoryStructure('owner', 'repo');

      expect(structureResult.success).toBe(true);
      expect(structureResult.structure.items).toHaveLength(2);
      expect(structureResult.structure.items[0].name).toBe('data.json');
      expect(structureResult.structure.items[1].name).toBe('README.md');

      // Mock file content
      const mockFileContent = {
        name: 'data.json',
        path: 'data.json',
        type: 'file',
        size: 256,
        sha: 'file-sha-123',
        content: Buffer.from('{"name": "Test Portfolio"}').toString('base64'),
        encoding: 'base64',
        download_url: 'https://raw.githubusercontent.com/owner/repo/main/data.json'
      };

      mockOctokit.rest.repos.getContent.mockResolvedValueOnce({
        data: mockFileContent
      });

      // Get file content
      const contentResult = await repositoryService.getFileContent('owner', 'repo', 'data.json');

      expect(contentResult.success).toBe(true);
      expect(contentResult.content.path).toBe('data.json');
      expect(contentResult.content.content).toBe('{"name": "Test Portfolio"}');
      expect(contentResult.content.sha).toBe('file-sha-123');
    });

    it('should handle content updates and commits', async () => {
      const mockOctokit = repositoryService.octokit;

      // Mock current file content for SHA retrieval
      const mockCurrentFile = {
        name: 'data.json',
        path: 'data.json',
        type: 'file',
        sha: 'current-sha-123',
        content: Buffer.from('{"name": "Old Portfolio"}').toString('base64'),
        encoding: 'base64'
      };

      mockOctokit.rest.repos.getContent.mockResolvedValueOnce({
        data: mockCurrentFile
      });

      // Mock file update
      const mockUpdateResult = {
        commit: {
          sha: 'new-commit-sha',
          message: 'Update portfolio data',
          author: { name: 'Test User', email: 'test@example.com' },
          committer: { name: 'Test User', email: 'test@example.com' },
          html_url: 'https://github.com/owner/repo/commit/new-commit-sha'
        },
        content: {
          name: 'data.json',
          path: 'data.json',
          sha: 'new-file-sha',
          size: 300
        }
      };

      mockOctokit.rest.repos.createOrUpdateFileContents.mockResolvedValueOnce({
        data: mockUpdateResult
      });

      const updateResult = await repositoryService.updateFileContent(
        'owner',
        'repo',
        'data.json',
        '{"name": "Updated Portfolio"}',
        'Update portfolio data'
      );

      expect(updateResult.success).toBe(true);
      expect(updateResult.commit.sha).toBe('new-commit-sha');
      expect(updateResult.commit.message).toBe('Update portfolio data');

      expect(mockOctokit.rest.repos.createOrUpdateFileContents).toHaveBeenCalledWith({
        owner: 'owner',
        repo: 'repo',
        path: 'data.json',
        message: 'Update portfolio data',
        content: Buffer.from('{"name": "Updated Portfolio"}').toString('base64'),
        sha: 'current-sha-123'
      });
    });

    it('should handle repository synchronization', async () => {
      const mockOctokit = repositoryService.octokit;

      // Mock repository info
      mockOctokit.rest.repos.get.mockResolvedValue({
        data: { default_branch: 'main' }
      });

      // Mock latest commit
      const mockCommits = [{
        sha: 'latest-commit-sha',
        commit: {
          message: 'Latest commit',
          author: {
            name: 'Test User',
            email: 'test@example.com',
            date: '2024-01-01T12:00:00Z'
          },
          committer: {
            name: 'Test User',
            email: 'test@example.com',
            date: '2024-01-01T12:00:00Z'
          }
        },
        html_url: 'https://github.com/owner/repo/commit/latest-commit-sha'
      }];

      mockOctokit.rest.repos.listCommits.mockResolvedValue({
        data: mockCommits
      });

      // Get latest commit
      const latestResult = await repositoryService.getLatestCommit('owner', 'repo');

      expect(latestResult.success).toBe(true);
      expect(latestResult.commit.sha).toBe('latest-commit-sha');
      expect(latestResult.commit.message).toBe('Latest commit');
      expect(latestResult.commit.branch).toBe('main');

      // Mock commits since last known
      const mockNewCommits = [
        {
          sha: 'new-commit-1',
          commit: {
            message: 'New commit 1',
            author: { date: '2024-01-01T13:00:00Z' }
          },
          html_url: 'https://github.com/owner/repo/commit/new-commit-1'
        },
        {
          sha: 'new-commit-2',
          commit: {
            message: 'New commit 2',
            author: { date: '2024-01-01T14:00:00Z' }
          },
          html_url: 'https://github.com/owner/repo/commit/new-commit-2'
        }
      ];

      // Mock getCommitDate
      vi.spyOn(repositoryService, 'getCommitDate').mockResolvedValue('2024-01-01T11:00:00Z');

      mockOctokit.rest.repos.listCommits.mockResolvedValueOnce({
        data: [...mockNewCommits, mockCommits[0]] // Include the old commit
      });

      // Check for updates
      const updatesResult = await repositoryService.checkForUpdates(
        'owner',
        'repo',
        'old-commit-sha'
      );

      expect(updatesResult.success).toBe(true);
      expect(updatesResult.hasUpdates).toBe(true);
      expect(updatesResult.commits).toHaveLength(2);
      expect(updatesResult.commits[0].sha).toBe('new-commit-1');
      expect(updatesResult.commits[1].sha).toBe('new-commit-2');
    });
  });

  describe('Error Handling Integration', () => {
    it('should handle GitHub API rate limiting', async () => {
      const { Octokit } = await import('@octokit/rest');
      const mockOctokit = new Octokit();

      const rateLimitError = new Error('API rate limit exceeded');
      rateLimitError.status = 403;
      rateLimitError.response = {
        headers: {
          'x-ratelimit-remaining': '0',
          'x-ratelimit-reset': Math.floor(Date.now() / 1000) + 3600
        }
      };

      mockOctokit.rest.users.getAuthenticated.mockRejectedValue(rateLimitError);

      const result = await validateGitHubToken('valid-token');

      expect(result.valid).toBe(false);
      expect(result.error).toBe('Token lacks required permissions');
    });

    it('should handle network connectivity issues', async () => {
      const networkError = new Error('Network error');
      networkError.code = 'ENOTFOUND';

      fetch.mockRejectedValue(networkError);

      process.env.GITHUB_CLIENT_ID = 'test-client-id';
      process.env.GITHUB_CLIENT_SECRET = 'test-client-secret';

      const result = await refreshGitHubToken('refresh-token');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Network error');

      delete process.env.GITHUB_CLIENT_ID;
      delete process.env.GITHUB_CLIENT_SECRET;
    });

    it('should handle repository access permissions', async () => {
      const repositoryService = new RepositoryService('limited-token');
      const mockOctokit = repositoryService.octokit;

      const permissionError = new Error('Not Found');
      permissionError.status = 404;

      mockOctokit.rest.repos.get.mockRejectedValue(permissionError);

      const result = await repositoryService.verifyFork('owner', 'private-repo');

      expect(result.verified).toBe(false);
      expect(result.error).toBe('Forked repository not found');
    });
  });

  describe('End-to-End Workflow Integration', () => {
    it('should complete full portfolio creation workflow', async () => {
      // This test simulates the complete workflow from OAuth to portfolio creation
      const { Octokit } = await import('@octokit/rest');
      
      // Step 1: OAuth Authentication
      const mockUser = {
        id: 12345,
        login: 'testuser',
        name: 'Test User',
        email: 'test@example.com'
      };

      const mockOctokit = new Octokit();
      mockOctokit.rest.users.getAuthenticated.mockResolvedValue({
        data: mockUser
      });
      mockOctokit.request.mockResolvedValue({
        headers: {
          'x-oauth-scopes': 'public_repo, repo',
          'x-ratelimit-limit': '5000',
          'x-ratelimit-remaining': '4999',
          'x-ratelimit-reset': '1640995200'
        }
      });

      const authResult = await validateGitHubToken('oauth-token');
      expect(authResult.valid).toBe(true);
      expect(authResult.user.login).toBe('testuser');

      // Step 2: Repository Service Setup
      const repositoryService = new RepositoryService('oauth-token');
      
      // Step 3: Fork Template Repository
      const mockForkedRepo = {
        id: 2,
        name: 'my-portfolio',
        full_name: 'testuser/my-portfolio',
        owner: { login: 'testuser' },
        html_url: 'https://github.com/testuser/my-portfolio',
        clone_url: 'https://github.com/testuser/my-portfolio.git',
        default_branch: 'main',
        private: false,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z'
      };

      vi.spyOn(repositoryService, 'verifyRepositoryExists').mockResolvedValue({ exists: true });
      vi.spyOn(repositoryService, 'waitForForkReady').mockResolvedValue({ ready: true });
      
      repositoryService.octokit.rest.repos.createFork.mockResolvedValue({
        data: mockForkedRepo
      });

      const forkResult = await repositoryService.forkRepository('template-owner', 'portfolio-template');
      expect(forkResult.success).toBe(true);
      expect(forkResult.repository.name).toBe('my-portfolio');

      // Step 4: Update Portfolio Content
      const portfolioData = {
        name: 'Test User',
        title: 'Software Developer',
        bio: 'A passionate developer',
        projects: [
          {
            name: 'Project 1',
            description: 'My first project',
            url: 'https://project1.com'
          }
        ]
      };

      // Mock current file for SHA
      repositoryService.octokit.rest.repos.getContent.mockResolvedValueOnce({
        data: {
          name: 'data.json',
          path: 'data.json',
          type: 'file',
          sha: 'current-sha',
          content: Buffer.from('{}').toString('base64'),
          encoding: 'base64'
        }
      });

      // Mock file update
      repositoryService.octokit.rest.repos.createOrUpdateFileContents.mockResolvedValue({
        data: {
          commit: {
            sha: 'update-commit-sha',
            message: 'Update portfolio data',
            author: { name: 'Test User', email: 'test@example.com' },
            committer: { name: 'Test User', email: 'test@example.com' },
            html_url: 'https://github.com/testuser/my-portfolio/commit/update-commit-sha'
          },
          content: {
            name: 'data.json',
            path: 'data.json',
            sha: 'new-file-sha',
            size: 500
          }
        }
      });

      const updateResult = await repositoryService.updateFileContent(
        'testuser',
        'my-portfolio',
        'data.json',
        JSON.stringify(portfolioData, null, 2),
        'Update portfolio data'
      );

      expect(updateResult.success).toBe(true);
      expect(updateResult.commit.sha).toBe('update-commit-sha');

      // Step 5: Verify Final State
      repositoryService.octokit.rest.repos.get.mockResolvedValue({
        data: mockForkedRepo
      });

      const verifyResult = await repositoryService.verifyFork('testuser', 'my-portfolio');
      expect(verifyResult.verified).toBe(true);
      expect(verifyResult.repository.owner).toBe('testuser');

      // The workflow is complete - user now has a forked portfolio with updated content
      expect(authResult.valid).toBe(true);
      expect(forkResult.success).toBe(true);
      expect(updateResult.success).toBe(true);
      expect(verifyResult.verified).toBe(true);
    });
  });
});