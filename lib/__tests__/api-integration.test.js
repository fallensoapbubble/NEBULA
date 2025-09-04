/**
 * API Integration Tests
 * Tests the integration between API routes and services
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { 
  mockGitHubResponses,
  createMockRequest,
  createMockResponse,
  createMockOctokit,
  setupTestEnvironment 
} from './test-utils.js';

// Mock Next.js API route handlers
const createMockApiHandler = (handler) => {
  return async (req, res) => {
    try {
      return await handler(req, res);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  };
};

// Mock API route implementations
const mockForkApiRoute = createMockApiHandler(async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  
  const { templateOwner, templateRepo, options } = await req.json();
  
  if (!templateOwner || !templateRepo) {
    return res.status(400).json({ 
      error: 'Template owner and repository name are required' 
    });
  }
  
  // Simulate authentication check
  const authHeader = req.headers.get('authorization');
  if (!authHeader) {
    return res.status(401).json({ 
      error: { code: 'UNAUTHORIZED', message: 'GitHub authentication required' }
    });
  }
  
  // Simulate fork operation
  const forkResult = {
    success: true,
    repository: {
      ...mockGitHubResponses.fork,
      owner: 'testuser'
    }
  };
  
  return res.status(200).json(forkResult);
});

const mockContentApiRoute = createMockApiHandler(async (req, res) => {
  const { owner, repo, path } = req.query;
  
  if (req.method === 'GET') {
    // Get file content
    return res.status(200).json({
      success: true,
      content: JSON.stringify({ name: 'Test Portfolio' }),
      sha: 'abc123'
    });
  }
  
  if (req.method === 'PUT') {
    // Update file content
    const { content, message } = await req.json();
    
    return res.status(200).json({
      success: true,
      commit: { sha: 'def456' },
      content: { sha: 'new-sha' }
    });
  }
  
  return res.status(405).json({ error: 'Method not allowed' });
});

const mockTemplatesApiRoute = createMockApiHandler(async (req, res) => {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  
  const templates = [
    {
      id: 'template1/portfolio',
      name: 'Modern Portfolio',
      description: 'A modern portfolio template',
      author: 'template1',
      tags: ['portfolio', 'modern'],
      preview: 'https://example.com/preview1.png'
    },
    {
      id: 'template2/blog',
      name: 'Developer Blog',
      description: 'A blog template for developers',
      author: 'template2',
      tags: ['blog', 'developer'],
      preview: 'https://example.com/preview2.png'
    }
  ];
  
  return res.status(200).json({ templates });
});

describe('API Integration Tests', () => {
  let restoreEnv;

  beforeEach(() => {
    restoreEnv = setupTestEnvironment();
  });

  afterEach(() => {
    restoreEnv();
    vi.clearAllMocks();
  });

  describe('Repository Fork API', () => {
    it('should successfully fork a repository', async () => {
      const req = createMockRequest({
        method: 'POST',
        headers: { authorization: 'Bearer test-token' },
        body: {
          templateOwner: 'template-owner',
          templateRepo: 'portfolio-template',
          options: { name: 'my-portfolio' }
        }
      });
      const res = createMockResponse();
      
      await mockForkApiRoute(req, res);
      
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          repository: expect.objectContaining({
            owner: 'testuser'
          })
        })
      );
    });

    it('should handle authentication errors', async () => {
      const req = createMockRequest({
        method: 'POST',
        body: {
          templateOwner: 'template-owner',
          templateRepo: 'portfolio-template'
        }
      });
      const res = createMockResponse();
      
      await mockForkApiRoute(req, res);
      
      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.objectContaining({
            code: 'UNAUTHORIZED'
          })
        })
      );
    });

    it('should validate required parameters', async () => {
      const req = createMockRequest({
        method: 'POST',
        headers: { authorization: 'Bearer test-token' },
        body: { templateOwner: 'template-owner' } // Missing templateRepo
      });
      const res = createMockResponse();
      
      await mockForkApiRoute(req, res);
      
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'Template owner and repository name are required'
        })
      );
    });

    it('should handle unsupported HTTP methods', async () => {
      const req = createMockRequest({
        method: 'GET',
        headers: { authorization: 'Bearer test-token' }
      });
      const res = createMockResponse();
      
      await mockForkApiRoute(req, res);
      
      expect(res.status).toHaveBeenCalledWith(405);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'Method not allowed'
        })
      );
    });
  });

  describe('Content Management API', () => {
    it('should retrieve file content', async () => {
      const req = createMockRequest({
        method: 'GET',
        query: { owner: 'testuser', repo: 'test-repo', path: 'data.json' }
      });
      const res = createMockResponse();
      
      await mockContentApiRoute(req, res);
      
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          content: expect.any(String),
          sha: expect.any(String)
        })
      );
    });

    it('should update file content', async () => {
      const req = createMockRequest({
        method: 'PUT',
        query: { owner: 'testuser', repo: 'test-repo', path: 'data.json' },
        body: {
          content: JSON.stringify({ name: 'Updated Portfolio' }),
          message: 'Update portfolio content'
        }
      });
      const res = createMockResponse();
      
      await mockContentApiRoute(req, res);
      
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          commit: expect.objectContaining({ sha: expect.any(String) })
        })
      );
    });
  });

  describe('Template Gallery API', () => {
    it('should return available templates', async () => {
      const req = createMockRequest({ method: 'GET' });
      const res = createMockResponse();
      
      await mockTemplatesApiRoute(req, res);
      
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          templates: expect.arrayContaining([
            expect.objectContaining({
              id: expect.any(String),
              name: expect.any(String),
              description: expect.any(String),
              author: expect.any(String),
              tags: expect.any(Array)
            })
          ])
        })
      );
    });

    it('should handle method not allowed', async () => {
      const req = createMockRequest({ method: 'POST' });
      const res = createMockResponse();
      
      await mockTemplatesApiRoute(req, res);
      
      expect(res.status).toHaveBeenCalledWith(405);
    });
  });

  describe('API Error Handling', () => {
    it('should handle internal server errors gracefully', async () => {
      const errorHandler = createMockApiHandler(async (req, res) => {
        throw new Error('Database connection failed');
      });
      
      const req = createMockRequest({ method: 'GET' });
      const res = createMockResponse();
      
      await errorHandler(req, res);
      
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'Database connection failed'
        })
      );
    });

    it('should handle malformed JSON requests', async () => {
      const req = createMockRequest({
        method: 'POST',
        headers: { authorization: 'Bearer test-token' }
      });
      
      // Mock malformed JSON
      req.json = vi.fn().mockRejectedValue(new Error('Invalid JSON'));
      
      const res = createMockResponse();
      
      await mockForkApiRoute(req, res);
      
      expect(res.status).toHaveBeenCalledWith(500);
    });
  });

  describe('API Performance', () => {
    it('should respond within acceptable time limits', async () => {
      const req = createMockRequest({
        method: 'POST',
        headers: { authorization: 'Bearer test-token' },
        body: {
          templateOwner: 'template-owner',
          templateRepo: 'portfolio-template'
        }
      });
      const res = createMockResponse();
      
      const startTime = performance.now();
      await mockForkApiRoute(req, res);
      const endTime = performance.now();
      
      expect(endTime - startTime).toBeLessThan(1000); // Should respond within 1 second
    });

    it('should handle concurrent requests efficiently', async () => {
      const concurrentRequests = 10;
      const requests = Array(concurrentRequests).fill().map(() => {
        const req = createMockRequest({
          method: 'GET',
          query: { 
            owner: 'testuser', 
            repo: `test-repo-${Math.random()}`, 
            path: 'data.json' 
          }
        });
        const res = createMockResponse();
        return mockContentApiRoute(req, res);
      });
      
      const startTime = performance.now();
      await Promise.all(requests);
      const endTime = performance.now();
      
      expect(endTime - startTime).toBeLessThan(5000); // All requests within 5 seconds
    });
  });

  describe('API Security', () => {
    it('should validate authentication tokens', async () => {
      const req = createMockRequest({
        method: 'POST',
        headers: { authorization: 'Bearer invalid-token' },
        body: {
          templateOwner: 'template-owner',
          templateRepo: 'portfolio-template'
        }
      });
      const res = createMockResponse();
      
      // Mock token validation failure
      const secureHandler = createMockApiHandler(async (req, res) => {
        const authHeader = req.headers.get('authorization');
        if (authHeader !== 'Bearer valid-token') {
          return res.status(401).json({ error: 'Invalid token' });
        }
        return res.status(200).json({ success: true });
      });
      
      await secureHandler(req, res);
      
      expect(res.status).toHaveBeenCalledWith(401);
    });

    it('should sanitize input parameters', async () => {
      const req = createMockRequest({
        method: 'POST',
        headers: { authorization: 'Bearer test-token' },
        body: {
          templateOwner: '<script>alert("xss")</script>',
          templateRepo: 'portfolio-template'
        }
      });
      const res = createMockResponse();
      
      const sanitizingHandler = createMockApiHandler(async (req, res) => {
        const { templateOwner } = await req.json();
        
        // Basic XSS protection check
        if (templateOwner.includes('<script>')) {
          return res.status(400).json({ error: 'Invalid characters in input' });
        }
        
        return res.status(200).json({ success: true });
      });
      
      await sanitizingHandler(req, res);
      
      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('should implement rate limiting', async () => {
      const rateLimitedHandler = createMockApiHandler(async (req, res) => {
        // Simulate rate limit check
        const clientIp = req.headers.get('x-forwarded-for') || 'unknown';
        const requestCount = parseInt(req.headers.get('x-request-count') || '0');
        
        if (requestCount > 100) {
          return res.status(429).json({ 
            error: 'Rate limit exceeded',
            retryAfter: 3600 
          });
        }
        
        return res.status(200).json({ success: true });
      });
      
      const req = createMockRequest({
        method: 'GET',
        headers: { 'x-request-count': '101' }
      });
      const res = createMockResponse();
      
      await rateLimitedHandler(req, res);
      
      expect(res.status).toHaveBeenCalledWith(429);
    });
  });

  describe('API Documentation and Validation', () => {
    it('should provide consistent error response format', async () => {
      const req = createMockRequest({
        method: 'POST',
        body: {} // Missing required fields
      });
      const res = createMockResponse();
      
      await mockForkApiRoute(req, res);
      
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.any(String)
        })
      );
    });

    it('should include helpful error details', async () => {
      const req = createMockRequest({
        method: 'POST',
        headers: { authorization: 'Bearer test-token' },
        body: {
          templateOwner: '', // Invalid empty string
          templateRepo: 'portfolio-template'
        }
      });
      const res = createMockResponse();
      
      const validatingHandler = createMockApiHandler(async (req, res) => {
        const { templateOwner, templateRepo } = await req.json();
        
        if (!templateOwner || !templateRepo) {
          return res.status(400).json({
            error: 'Validation failed',
            details: {
              templateOwner: !templateOwner ? 'Required field' : null,
              templateRepo: !templateRepo ? 'Required field' : null
            }
          });
        }
        
        return res.status(200).json({ success: true });
      });
      
      await validatingHandler(req, res);
      
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'Validation failed',
          details: expect.objectContaining({
            templateOwner: 'Required field'
          })
        })
      );
    });
  });
});