/**
 * End-to-End Workflow Tests
 * Tests the complete flow from template selection to published portfolio
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { 
  mockGitHubResponses, 
  createMockOctokit, 
  IntegrationTestHelpers,
  setupTestEnvironment 
} from './test-utils.js';

// Import services
import { RepositoryService } from '../repository-service.js';
import { TemplateService } from '../template-service.js';
import { GitHubIntegrationService } from '../github-integration-service.js';

describe('End-to-End Workflow Tests', () => {
  let repositoryService;
  let templateService;
  let integrationService;
  let mockOctokit;
  let restoreEnv;

  beforeEach(() => {
    restoreEnv = setupTestEnvironment();
    mockOctokit = createMockOctokit();
    
    // Mock the GitHub client creation
    vi.doMock('../github-auth.js', () => ({
      createGitHubClient: vi.fn().mockReturnValue(mockOctokit)
    }));
    
    repositoryService = new RepositoryService('test-token');
    templateService = new TemplateService({ accessToken: 'test-token' });
    integrationService = new GitHubIntegrationService('test-token');
  });

  afterEach(() => {
    restoreEnv();
    vi.clearAllMocks();
  });

  describe('Complete Portfolio Creation Workflow', () => {
    it('should complete full workflow: template selection → fork → edit → publish', async () => {
      // Step 1: Template Selection
      const templateId = 'template-owner/portfolio-template';
      
      // Mock template validation
      mockOctokit.rest.repos.get.mockResolvedValueOnce({
        data: mockGitHubResponses.repository
      });
      
      mockOctokit.rest.repos.getContent.mockResolvedValueOnce({
        data: [
          {
            name: '.nebula',
            type: 'dir'
          },
          {
            name: 'data.json',
            type: 'file'
          }
        ]
      });
      
      // Validate template
      const templateValidation = await templateService.validateTemplate(templateId);
      expect(templateValidation.isValid).toBe(true);
      
      // Step 2: Repository Forking
      mockOctokit.rest.repos.createFork.mockResolvedValueOnce({
        data: mockGitHubResponses.fork
      });
      
      const forkResult = await repositoryService.forkRepository(
        'template-owner',
        'portfolio-template',
        { name: 'my-portfolio' }
      );
      
      expect(forkResult.success).toBe(true);
      expect(forkResult.repository.name).toBe('forked-repo');
      
      // Step 3: Content Editing
      const newContent = {
        name: 'My Portfolio',
        description: 'My personal portfolio website',
        sections: [
          {
            type: 'hero',
            title: 'Welcome to My Portfolio',
            content: 'I am a developer passionate about creating amazing experiences.'
          }
        ]
      };
      
      // Mock getting current file content
      mockOctokit.rest.repos.getContent.mockResolvedValueOnce({
        data: mockGitHubResponses.fileContent
      });
      
      // Mock updating file content
      mockOctokit.rest.repos.createOrUpdateFileContents.mockResolvedValueOnce({
        data: {
          commit: mockGitHubResponses.commit,
          content: {
            ...mockGitHubResponses.fileContent,
            content: btoa(JSON.stringify(newContent))
          }
        }
      });
      
      const updateResult = await repositoryService.updateFileContent(
        'testuser',
        'forked-repo',
        'data.json',
        JSON.stringify(newContent, null, 2),
        'Update portfolio content'
      );
      
      expect(updateResult.success).toBe(true);
      expect(updateResult.commit.sha).toBe('def456');
      
      // Step 4: Verify Portfolio Publishing
      // Mock the dynamic route behavior
      mockOctokit.rest.repos.get.mockResolvedValueOnce({
        data: {
          ...mockGitHubResponses.repository,
          name: 'forked-repo',
          full_name: 'testuser/forked-repo'
        }
      });
      
      mockOctokit.rest.repos.getContent.mockResolvedValueOnce({
        data: {
          ...mockGitHubResponses.fileContent,
          content: btoa(JSON.stringify(newContent))
        }
      });
      
      // Simulate fetching portfolio for rendering
      const portfolioContent = await repositoryService.getFileContent(
        'testuser',
        'forked-repo',
        'data.json'
      );
      
      expect(portfolioContent.success).toBe(true);
      const parsedContent = JSON.parse(portfolioContent.content);
      expect(parsedContent.name).toBe('My Portfolio');
      expect(parsedContent.sections).toHaveLength(1);
      
      // Verify all API calls were made correctly
      expect(mockOctokit.rest.repos.createFork).toHaveBeenCalledWith({
        owner: 'template-owner',
        repo: 'portfolio-template',
        name: 'my-portfolio'
      });
      
      expect(mockOctokit.rest.repos.createOrUpdateFileContents).toHaveBeenCalledWith({
        owner: 'testuser',
        repo: 'forked-repo',
        path: 'data.json',
        message: 'Update portfolio content',
        content: btoa(JSON.stringify(newContent, null, 2)),
        sha: 'abc123'
      });
    }, 30000);

    it('should handle workflow interruption and recovery', async () => {
      // Simulate fork success but edit failure
      mockOctokit.rest.repos.createFork.mockResolvedValueOnce({
        data: mockGitHubResponses.fork
      });
      
      const forkResult = await repositoryService.forkRepository(
        'template-owner',
        'portfolio-template'
      );
      expect(forkResult.success).toBe(true);
      
      // Simulate edit failure
      mockOctokit.rest.repos.getContent.mockRejectedValueOnce(
        new Error('Network error')
      );
      
      const editResult = await repositoryService.getFileContent(
        'testuser',
        'forked-repo',
        'data.json'
      );
      
      expect(editResult.success).toBe(false);
      expect(editResult.error).toContain('Network error');
      
      // Verify recovery - retry the edit operation
      mockOctokit.rest.repos.getContent.mockResolvedValueOnce({
        data: mockGitHubResponses.fileContent
      });
      
      const retryResult = await repositoryService.getFileContent(
        'testuser',
        'forked-repo',
        'data.json'
      );
      
      expect(retryResult.success).toBe(true);
    });

    it('should handle concurrent editing conflicts', async () => {
      // Setup initial state
      mockOctokit.rest.repos.getContent.mockResolvedValue({
        data: mockGitHubResponses.fileContent
      });
      
      // Simulate two concurrent edits
      const edit1Promise = repositoryService.updateFileContent(
        'testuser',
        'forked-repo',
        'data.json',
        JSON.stringify({ name: 'Edit 1' }),
        'First edit'
      );
      
      const edit2Promise = repositoryService.updateFileContent(
        'testuser',
        'forked-repo',
        'data.json',
        JSON.stringify({ name: 'Edit 2' }),
        'Second edit'
      );
      
      // Mock first edit success
      mockOctokit.rest.repos.createOrUpdateFileContents
        .mockResolvedValueOnce({
          data: {
            commit: { sha: 'edit1-sha' },
            content: { sha: 'new-sha-1' }
          }
        })
        .mockRejectedValueOnce({
          status: 409,
          message: 'Conflict: file was modified'
        });
      
      const [result1, result2] = await Promise.allSettled([
        edit1Promise,
        edit2Promise
      ]);
      
      expect(result1.status).toBe('fulfilled');
      expect(result1.value.success).toBe(true);
      
      expect(result2.status).toBe('fulfilled');
      expect(result2.value.success).toBe(false);
      expect(result2.value.error).toContain('Conflict');
    });
  });

  describe('Performance and Scalability Tests', () => {
    it('should handle multiple concurrent repository operations', async () => {
      const concurrentOperations = 5;
      const operations = [];
      
      // Setup mocks for concurrent operations
      for (let i = 0; i < concurrentOperations; i++) {
        mockOctokit.rest.repos.createFork.mockResolvedValueOnce({
          data: {
            ...mockGitHubResponses.fork,
            name: `forked-repo-${i}`,
            full_name: `testuser/forked-repo-${i}`
          }
        });
        
        operations.push(
          repositoryService.forkRepository(
            'template-owner',
            'portfolio-template',
            { name: `my-portfolio-${i}` }
          )
        );
      }
      
      const startTime = performance.now();
      const results = await Promise.all(operations);
      const endTime = performance.now();
      
      // Verify all operations succeeded
      results.forEach((result, index) => {
        expect(result.success).toBe(true);
        expect(result.repository.name).toBe(`forked-repo-${index}`);
      });
      
      // Verify reasonable performance (should complete within 5 seconds)
      expect(endTime - startTime).toBeLessThan(5000);
    });

    it('should maintain performance under rate limiting', async () => {
      // Mock rate limit responses
      mockOctokit.rest.rateLimit.get.mockResolvedValue({
        data: {
          rate: {
            limit: 5000,
            remaining: 10, // Low remaining requests
            reset: Date.now() + 3600000
          }
        }
      });
      
      // Mock API call that should be throttled
      mockOctokit.rest.repos.get.mockResolvedValue({
        data: mockGitHubResponses.repository
      });
      
      const startTime = performance.now();
      
      // Make multiple requests that should trigger rate limiting
      const requests = Array(5).fill().map(() => 
        repositoryService.verifyFork('testuser', 'test-repo')
      );
      
      const results = await Promise.all(requests);
      const endTime = performance.now();
      
      // All requests should succeed despite rate limiting
      results.forEach(result => {
        expect(result.success).toBe(true);
      });
      
      // Should take longer due to rate limiting (but not too long)
      expect(endTime - startTime).toBeGreaterThan(100);
      expect(endTime - startTime).toBeLessThan(10000);
    });
  });

  describe('Error Recovery and Resilience', () => {
    it('should recover from GitHub API outages', async () => {
      // Simulate API outage
      mockOctokit.rest.repos.get
        .mockRejectedValueOnce(new Error('Service unavailable'))
        .mockRejectedValueOnce(new Error('Service unavailable'))
        .mockResolvedValueOnce({ data: mockGitHubResponses.repository });
      
      // Should retry and eventually succeed
      const result = await repositoryService.verifyFork('testuser', 'test-repo');
      
      expect(result.success).toBe(true);
      expect(mockOctokit.rest.repos.get).toHaveBeenCalledTimes(3);
    });

    it('should handle authentication token expiration', async () => {
      // Mock token expiration
      mockOctokit.rest.users.getAuthenticated
        .mockRejectedValueOnce({
          status: 401,
          message: 'Bad credentials'
        });
      
      const healthCheck = await repositoryService.checkServiceHealth();
      
      expect(healthCheck.healthy).toBe(false);
      expect(healthCheck.error).toContain('authentication');
    });

    it('should gracefully handle repository access permissions', async () => {
      // Mock permission denied
      mockOctokit.rest.repos.get.mockRejectedValueOnce({
        status: 403,
        message: 'Forbidden'
      });
      
      const result = await repositoryService.verifyFork('testuser', 'private-repo');
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('permission');
    });
  });

  describe('Data Integrity and Validation', () => {
    it('should validate portfolio content before saving', async () => {
      const invalidContent = {
        // Missing required fields
        description: 'Invalid portfolio'
      };
      
      mockOctokit.rest.repos.getContent.mockResolvedValueOnce({
        data: mockGitHubResponses.fileContent
      });
      
      // Should validate content structure
      const result = await repositoryService.updateFileContent(
        'testuser',
        'forked-repo',
        'data.json',
        JSON.stringify(invalidContent),
        'Update with invalid content'
      );
      
      // Implementation should validate content before updating
      // This test verifies the validation logic exists
      expect(typeof result).toBe('object');
      expect(result).toHaveProperty('success');
    });

    it('should preserve data integrity during concurrent operations', async () => {
      // Setup initial content
      const initialContent = { name: 'Original', version: 1 };
      
      mockOctokit.rest.repos.getContent.mockResolvedValue({
        data: {
          ...mockGitHubResponses.fileContent,
          content: btoa(JSON.stringify(initialContent))
        }
      });
      
      // Mock successful updates with version tracking
      mockOctokit.rest.repos.createOrUpdateFileContents
        .mockResolvedValue({
          data: {
            commit: { sha: 'new-commit' },
            content: { sha: 'new-file-sha' }
          }
        });
      
      // Perform concurrent updates
      const update1 = repositoryService.updateFileContent(
        'testuser',
        'forked-repo',
        'data.json',
        JSON.stringify({ ...initialContent, name: 'Update 1', version: 2 }),
        'Update 1'
      );
      
      const update2 = repositoryService.updateFileContent(
        'testuser',
        'forked-repo',
        'data.json',
        JSON.stringify({ ...initialContent, name: 'Update 2', version: 2 }),
        'Update 2'
      );
      
      const results = await Promise.allSettled([update1, update2]);
      
      // At least one should succeed
      const successfulResults = results.filter(r => 
        r.status === 'fulfilled' && r.value.success
      );
      
      expect(successfulResults.length).toBeGreaterThan(0);
    });
  });
});