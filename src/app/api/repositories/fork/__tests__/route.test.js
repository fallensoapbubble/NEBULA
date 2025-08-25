import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { NextRequest } from 'next/server';
import { POST } from '../route.js';

// Mock dependencies
vi.mock('../../../../../../lib/fork-service.js', () => ({
  createForkService: vi.fn(() => ({
    forkRepository: vi.fn()
  }))
}));

vi.mock('../../../../../../lib/auth.js', () => ({
  validateAuthToken: vi.fn()
}));

describe('/api/repositories/fork', () => {
  let mockForkService;
  let mockValidateAuthToken;

  beforeEach(async () => {
    vi.clearAllMocks();
    
    const { createForkService } = await import('../../../../../../lib/fork-service.js');
    const { validateAuthToken } = await import('../../../../../../lib/auth.js');
    
    mockForkService = {
      forkRepository: vi.fn()
    };
    
    createForkService.mockReturnValue(mockForkService);
    mockValidateAuthToken = validateAuthToken;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('POST', () => {
    it('should successfully fork a repository', async () => {
      // Mock authentication
      mockValidateAuthToken.mockResolvedValue({
        valid: true,
        accessToken: 'test-token'
      });

      // Mock successful fork
      mockForkService.forkRepository.mockResolvedValue({
        success: true,
        repository: {
          owner: 'testuser',
          name: 'repo',
          fullName: 'testuser/repo',
          url: 'https://github.com/testuser/repo'
        }
      });

      const request = new NextRequest('http://localhost/api/repositories/fork', {
        method: 'POST',
        body: JSON.stringify({
          templateOwner: 'owner',
          templateRepo: 'repo'
        })
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.repository.owner).toBe('testuser');
      expect(mockForkService.forkRepository).toHaveBeenCalledWith('owner', 'repo', {});
    });

    it('should handle authentication failure', async () => {
      mockValidateAuthToken.mockResolvedValue({
        valid: false
      });

      const request = new NextRequest('http://localhost/api/repositories/fork', {
        method: 'POST',
        body: JSON.stringify({
          templateOwner: 'owner',
          templateRepo: 'repo'
        })
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Authentication required');
    });

    it('should validate required parameters', async () => {
      mockValidateAuthToken.mockResolvedValue({
        valid: true,
        accessToken: 'test-token'
      });

      const request = new NextRequest('http://localhost/api/repositories/fork', {
        method: 'POST',
        body: JSON.stringify({
          templateOwner: '',
          templateRepo: 'repo'
        })
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Template owner and repository name are required');
    });

    it('should handle fork validation errors', async () => {
      mockValidateAuthToken.mockResolvedValue({
        valid: true,
        accessToken: 'test-token'
      });

      mockForkService.forkRepository.mockResolvedValue({
        success: false,
        error: 'Invalid template owner format',
        details: {
          type: 'ValidationError',
          retryable: false
        }
      });

      const request = new NextRequest('http://localhost/api/repositories/fork', {
        method: 'POST',
        body: JSON.stringify({
          templateOwner: 'owner',
          templateRepo: 'repo'
        })
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Invalid template owner format');
      expect(data.details.type).toBe('ValidationError');
    });

    it('should handle repository not found errors', async () => {
      mockValidateAuthToken.mockResolvedValue({
        valid: true,
        accessToken: 'test-token'
      });

      mockForkService.forkRepository.mockResolvedValue({
        success: false,
        error: 'Template repository not found',
        details: {
          type: 'RepositoryNotFoundError',
          retryable: false
        }
      });

      const request = new NextRequest('http://localhost/api/repositories/fork', {
        method: 'POST',
        body: JSON.stringify({
          templateOwner: 'owner',
          templateRepo: 'repo'
        })
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe('Template repository not found');
    });

    it('should handle fork exists errors', async () => {
      mockValidateAuthToken.mockResolvedValue({
        valid: true,
        accessToken: 'test-token'
      });

      mockForkService.forkRepository.mockResolvedValue({
        success: false,
        error: 'Repository already exists',
        details: {
          type: 'ForkExistsError',
          retryable: false
        }
      });

      const request = new NextRequest('http://localhost/api/repositories/fork', {
        method: 'POST',
        body: JSON.stringify({
          templateOwner: 'owner',
          templateRepo: 'repo'
        })
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(409);
      expect(data.error).toBe('Repository already exists');
    });

    it('should handle insufficient permissions errors', async () => {
      mockValidateAuthToken.mockResolvedValue({
        valid: true,
        accessToken: 'test-token'
      });

      mockForkService.forkRepository.mockResolvedValue({
        success: false,
        error: 'Insufficient permissions to fork repository',
        details: {
          type: 'InsufficientPermissionsError',
          retryable: false
        }
      });

      const request = new NextRequest('http://localhost/api/repositories/fork', {
        method: 'POST',
        body: JSON.stringify({
          templateOwner: 'owner',
          templateRepo: 'repo'
        })
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toBe('Insufficient permissions to fork repository');
    });

    it('should pass fork options correctly', async () => {
      mockValidateAuthToken.mockResolvedValue({
        valid: true,
        accessToken: 'test-token'
      });

      mockForkService.forkRepository.mockResolvedValue({
        success: true,
        repository: {
          owner: 'testuser',
          name: 'custom-repo'
        }
      });

      const options = {
        name: 'custom-repo',
        organization: 'myorg',
        defaultBranchOnly: true
      };

      const request = new NextRequest('http://localhost/api/repositories/fork', {
        method: 'POST',
        body: JSON.stringify({
          templateOwner: 'owner',
          templateRepo: 'repo',
          options
        })
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(mockForkService.forkRepository).toHaveBeenCalledWith('owner', 'repo', options);
    });

    it('should handle internal server errors', async () => {
      mockValidateAuthToken.mockRejectedValue(new Error('Database connection failed'));

      const request = new NextRequest('http://localhost/api/repositories/fork', {
        method: 'POST',
        body: JSON.stringify({
          templateOwner: 'owner',
          templateRepo: 'repo'
        })
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Internal server error');
    });
  });
});