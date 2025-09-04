/**
 * Test utilities for comprehensive testing suite
 */
import { vi } from 'vitest';

/**
 * Mock GitHub API responses for consistent testing
 */
export const mockGitHubResponses = {
  user: {
    id: 12345,
    login: 'testuser',
    name: 'Test User',
    email: 'test@example.com',
    avatar_url: 'https://github.com/images/error/testuser_happy.gif'
  },
  
  repository: {
    id: 67890,
    name: 'test-repo',
    full_name: 'testuser/test-repo',
    owner: {
      login: 'testuser',
      id: 12345
    },
    private: false,
    default_branch: 'main',
    clone_url: 'https://github.com/testuser/test-repo.git',
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z'
  },
  
  fork: {
    id: 67891,
    name: 'forked-repo',
    full_name: 'testuser/forked-repo',
    owner: {
      login: 'testuser',
      id: 12345
    },
    fork: true,
    parent: {
      full_name: 'template-owner/template-repo'
    }
  },
  
  fileContent: {
    name: 'data.json',
    path: 'data.json',
    sha: 'abc123',
    size: 1024,
    content: btoa(JSON.stringify({
      name: 'Test Portfolio',
      description: 'A test portfolio'
    })),
    encoding: 'base64'
  },
  
  commit: {
    sha: 'def456',
    commit: {
      message: 'Update portfolio content',
      author: {
        name: 'Test User',
        email: 'test@example.com',
        date: '2024-01-01T00:00:00Z'
      }
    }
  }
};

/**
 * Create a mock Octokit instance with common methods
 */
export function createMockOctokit() {
  return {
    rest: {
      users: {
        getAuthenticated: vi.fn()
      },
      repos: {
        get: vi.fn(),
        createFork: vi.fn(),
        getContent: vi.fn(),
        createOrUpdateFileContents: vi.fn(),
        listCommits: vi.fn()
      },
      git: {
        createBlob: vi.fn(),
        createTree: vi.fn(),
        createCommit: vi.fn(),
        updateRef: vi.fn()
      },
      rateLimit: {
        get: vi.fn().mockResolvedValue({
          data: {
            rate: {
              limit: 5000,
              remaining: 4999,
              reset: Date.now() + 3600000
            }
          }
        })
      }
    }
  };
}

/**
 * Mock Next.js request/response objects
 */
export function createMockRequest(options = {}) {
  const { headers: headerOptions, ...otherOptions } = options;
  const headers = new Map(Object.entries(headerOptions || {}));
  return {
    method: options.method || 'GET',
    url: options.url || '/',
    headers,
    json: vi.fn().mockResolvedValue(options.body || {}),
    ...otherOptions
  };
}

export function createMockResponse() {
  const response = {
    status: vi.fn().mockReturnThis(),
    json: vi.fn().mockReturnThis(),
    send: vi.fn().mockReturnThis(),
    end: vi.fn().mockReturnThis(),
    setHeader: vi.fn().mockReturnThis(),
    revalidate: vi.fn().mockResolvedValue(true)
  };
  return response;
}

/**
 * Performance testing utilities
 */
export class PerformanceTestUtils {
  static async measureExecutionTime(fn) {
    const start = performance.now();
    const result = await fn();
    const end = performance.now();
    return {
      result,
      executionTime: end - start
    };
  }
  
  static async measureMemoryUsage(fn) {
    const initialMemory = process.memoryUsage();
    const result = await fn();
    const finalMemory = process.memoryUsage();
    
    return {
      result,
      memoryDelta: {
        heapUsed: finalMemory.heapUsed - initialMemory.heapUsed,
        heapTotal: finalMemory.heapTotal - initialMemory.heapTotal,
        external: finalMemory.external - initialMemory.external
      }
    };
  }
  
  static createLoadTest(fn, options = {}) {
    const { concurrency = 10, iterations = 100 } = options;
    
    return async () => {
      const promises = [];
      const results = [];
      
      for (let i = 0; i < concurrency; i++) {
        const promise = (async () => {
          const batchResults = [];
          for (let j = 0; j < Math.ceil(iterations / concurrency); j++) {
            const start = performance.now();
            try {
              await fn();
              batchResults.push({
                success: true,
                duration: performance.now() - start
              });
            } catch (error) {
              batchResults.push({
                success: false,
                duration: performance.now() - start,
                error: error.message
              });
            }
          }
          return batchResults;
        })();
        promises.push(promise);
      }
      
      const batchResults = await Promise.all(promises);
      batchResults.forEach(batch => results.push(...batch));
      
      return {
        totalRequests: results.length,
        successfulRequests: results.filter(r => r.success).length,
        failedRequests: results.filter(r => !r.success).length,
        averageDuration: results.reduce((sum, r) => sum + r.duration, 0) / results.length,
        minDuration: Math.min(...results.map(r => r.duration)),
        maxDuration: Math.max(...results.map(r => r.duration)),
        errors: results.filter(r => !r.success).map(r => r.error)
      };
    };
  }
}

/**
 * Integration test helpers
 */
export class IntegrationTestHelpers {
  static async waitForCondition(condition, timeout = 5000, interval = 100) {
    const start = Date.now();
    
    while (Date.now() - start < timeout) {
      if (await condition()) {
        return true;
      }
      await new Promise(resolve => setTimeout(resolve, interval));
    }
    
    throw new Error(`Condition not met within ${timeout}ms`);
  }
  
  static createTestRepository() {
    return {
      owner: 'testuser',
      name: 'test-portfolio',
      structure: [
        {
          name: 'data.json',
          type: 'file',
          content: JSON.stringify({
            name: 'Test Portfolio',
            description: 'A test portfolio for integration testing',
            sections: [
              {
                type: 'hero',
                title: 'Welcome',
                content: 'This is a test portfolio'
              }
            ]
          })
        },
        {
          name: 'README.md',
          type: 'file',
          content: '# Test Portfolio\n\nThis is a test portfolio for integration testing.'
        },
        {
          name: '.nebula',
          type: 'dir',
          children: [
            {
              name: 'config.json',
              type: 'file',
              content: JSON.stringify({
                version: '1.0',
                templateType: 'json',
                contentFiles: [
                  {
                    path: 'data.json',
                    type: 'json',
                    schema: {
                      name: { type: 'string', required: true },
                      description: { type: 'text' }
                    }
                  }
                ]
              })
            }
          ]
        }
      ]
    };
  }
}

/**
 * Mock environment variables for testing
 */
export function setupTestEnvironment() {
  const originalEnv = process.env;
  
  process.env = {
    ...originalEnv,
    GITHUB_CLIENT_ID: 'test-client-id',
    GITHUB_CLIENT_SECRET: 'test-client-secret',
    NEXTAUTH_SECRET: 'test-nextauth-secret',
    NEXTAUTH_URL: 'http://localhost:3000'
  };
  
  return () => {
    process.env = originalEnv;
  };
}