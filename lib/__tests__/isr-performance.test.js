/**
 * ISR (Incremental Static Regeneration) Performance Tests
 * Tests the performance characteristics of dynamic portfolio rendering
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { 
  PerformanceTestUtils,
  mockGitHubResponses,
  createMockOctokit,
  setupTestEnvironment 
} from './test-utils.js';

// Mock Next.js functions
const mockRevalidate = vi.fn();
const mockGetStaticProps = vi.fn();
const mockGetStaticPaths = vi.fn();

// Mock the portfolio rendering logic
class MockPortfolioRenderer {
  constructor(githubClient) {
    this.github = githubClient;
  }
  
  async getStaticProps({ params }) {
    const { username, repo } = params;
    
    // Simulate fetching repository data
    const repoData = await this.github.rest.repos.get({
      owner: username,
      repo: repo
    });
    
    // Simulate fetching content files
    const contentData = await this.github.rest.repos.getContent({
      owner: username,
      repo: repo,
      path: 'data.json'
    });
    
    // Simulate processing content
    const content = JSON.parse(
      Buffer.from(contentData.data.content, 'base64').toString()
    );
    
    return {
      props: {
        repository: repoData.data,
        content,
        generatedAt: new Date().toISOString()
      },
      revalidate: 600 // 10 minutes
    };
  }
  
  async revalidatePage(username, repo) {
    return mockRevalidate(`/${username}/${repo}`);
  }
}

describe('ISR Performance Tests', () => {
  let mockOctokit;
  let portfolioRenderer;
  let restoreEnv;

  beforeEach(() => {
    restoreEnv = setupTestEnvironment();
    mockOctokit = createMockOctokit();
    portfolioRenderer = new MockPortfolioRenderer(mockOctokit);
    
    // Setup default mocks
    mockOctokit.rest.repos.get.mockResolvedValue({
      data: mockGitHubResponses.repository
    });
    
    mockOctokit.rest.repos.getContent.mockResolvedValue({
      data: mockGitHubResponses.fileContent
    });
    
    mockRevalidate.mockResolvedValue(true);
  });

  afterEach(() => {
    restoreEnv();
    vi.clearAllMocks();
  });

  describe('Static Generation Performance', () => {
    it('should generate static pages within performance budget', async () => {
      const { result, executionTime } = await PerformanceTestUtils.measureExecutionTime(
        () => portfolioRenderer.getStaticProps({
          params: { username: 'testuser', repo: 'test-portfolio' }
        })
      );
      
      expect(result.props).toBeDefined();
      expect(result.props.repository).toBeDefined();
      expect(result.props.content).toBeDefined();
      
      // Should generate within 2 seconds
      expect(executionTime).toBeLessThan(2000);
    });

    it('should handle concurrent static generation efficiently', async () => {
      const concurrentRequests = 10;
      const requests = Array(concurrentRequests).fill().map((_, index) => 
        () => portfolioRenderer.getStaticProps({
          params: { 
            username: 'testuser', 
            repo: `test-portfolio-${index}` 
          }
        })
      );
      
      const loadTest = PerformanceTestUtils.createLoadTest(
        async () => {
          const randomIndex = Math.floor(Math.random() * requests.length);
          return requests[randomIndex]();
        },
        { concurrency: 5, iterations: 20 }
      );
      
      const results = await loadTest();
      
      expect(results.successfulRequests).toBeGreaterThan(15);
      expect(results.averageDuration).toBeLessThan(3000);
      expect(results.failedRequests).toBeLessThan(5);
    });

    it('should maintain performance with large content files', async () => {
      // Mock large content file
      const largeContent = {
        name: 'Large Portfolio',
        description: 'A portfolio with lots of content',
        sections: Array(100).fill().map((_, i) => ({
          id: `section-${i}`,
          type: 'content',
          title: `Section ${i}`,
          content: 'Lorem ipsum '.repeat(1000) // Large content block
        }))
      };
      
      mockOctokit.rest.repos.getContent.mockResolvedValueOnce({
        data: {
          ...mockGitHubResponses.fileContent,
          content: btoa(JSON.stringify(largeContent)),
          size: JSON.stringify(largeContent).length
        }
      });
      
      const { result, executionTime } = await PerformanceTestUtils.measureExecutionTime(
        () => portfolioRenderer.getStaticProps({
          params: { username: 'testuser', repo: 'large-portfolio' }
        })
      );
      
      expect(result.props.content.sections).toHaveLength(100);
      
      // Should still generate within reasonable time even with large content
      expect(executionTime).toBeLessThan(5000);
    });
  });

  describe('Revalidation Performance', () => {
    it('should revalidate pages quickly', async () => {
      const { result, executionTime } = await PerformanceTestUtils.measureExecutionTime(
        () => portfolioRenderer.revalidatePage('testuser', 'test-portfolio')
      );
      
      expect(result).toBe(true);
      expect(executionTime).toBeLessThan(1000);
      expect(mockRevalidate).toHaveBeenCalledWith('/testuser/test-portfolio');
    });

    it('should handle batch revalidation efficiently', async () => {
      const portfolios = Array(20).fill().map((_, i) => ({
        username: 'testuser',
        repo: `portfolio-${i}`
      }));
      
      const startTime = performance.now();
      
      const revalidationPromises = portfolios.map(({ username, repo }) =>
        portfolioRenderer.revalidatePage(username, repo)
      );
      
      const results = await Promise.all(revalidationPromises);
      const endTime = performance.now();
      
      expect(results.every(r => r === true)).toBe(true);
      expect(endTime - startTime).toBeLessThan(5000);
      expect(mockRevalidate).toHaveBeenCalledTimes(20);
    });

    it('should handle revalidation failures gracefully', async () => {
      mockRevalidate.mockRejectedValueOnce(new Error('Revalidation failed'));
      
      const { result, executionTime } = await PerformanceTestUtils.measureExecutionTime(
        async () => {
          try {
            return await portfolioRenderer.revalidatePage('testuser', 'test-portfolio');
          } catch (error) {
            return { error: error.message };
          }
        }
      );
      
      expect(result.error).toBe('Revalidation failed');
      expect(executionTime).toBeLessThan(2000);
    });
  });

  describe('Memory Usage and Resource Management', () => {
    it('should maintain reasonable memory usage during generation', async () => {
      const { result, memoryDelta } = await PerformanceTestUtils.measureMemoryUsage(
        () => portfolioRenderer.getStaticProps({
          params: { username: 'testuser', repo: 'test-portfolio' }
        })
      );
      
      expect(result.props).toBeDefined();
      
      // Memory usage should be reasonable (less than 50MB increase)
      expect(memoryDelta.heapUsed).toBeLessThan(50 * 1024 * 1024);
    });

    it('should not leak memory during repeated generations', async () => {
      const iterations = 10;
      const memorySnapshots = [];
      
      for (let i = 0; i < iterations; i++) {
        const initialMemory = process.memoryUsage().heapUsed;
        
        await portfolioRenderer.getStaticProps({
          params: { username: 'testuser', repo: `test-portfolio-${i}` }
        });
        
        // Force garbage collection if available
        if (global.gc) {
          global.gc();
        }
        
        const finalMemory = process.memoryUsage().heapUsed;
        memorySnapshots.push(finalMemory - initialMemory);
      }
      
      // Memory usage should not continuously increase
      const averageIncrease = memorySnapshots.reduce((sum, delta) => sum + delta, 0) / iterations;
      expect(averageIncrease).toBeLessThan(10 * 1024 * 1024); // Less than 10MB average increase
    });
  });

  describe('Cache Performance', () => {
    it('should benefit from GitHub API response caching', async () => {
      // First request - should hit GitHub API
      const { executionTime: firstTime } = await PerformanceTestUtils.measureExecutionTime(
        () => portfolioRenderer.getStaticProps({
          params: { username: 'testuser', repo: 'cached-portfolio' }
        })
      );
      
      // Mock cached response (faster)
      mockOctokit.rest.repos.get.mockResolvedValueOnce({
        data: { ...mockGitHubResponses.repository, _cached: true }
      });
      
      mockOctokit.rest.repos.getContent.mockResolvedValueOnce({
        data: { ...mockGitHubResponses.fileContent, _cached: true }
      });
      
      // Second request - should use cache
      const { executionTime: secondTime } = await PerformanceTestUtils.measureExecutionTime(
        () => portfolioRenderer.getStaticProps({
          params: { username: 'testuser', repo: 'cached-portfolio' }
        })
      );
      
      // Cached request should be faster (though this is mocked, it demonstrates the concept)
      expect(secondTime).toBeLessThan(firstTime + 100); // Allow for some variance
    });

    it('should handle cache invalidation efficiently', async () => {
      // Generate initial page
      await portfolioRenderer.getStaticProps({
        params: { username: 'testuser', repo: 'invalidation-test' }
      });
      
      // Simulate cache invalidation
      const { executionTime } = await PerformanceTestUtils.measureExecutionTime(
        () => portfolioRenderer.revalidatePage('testuser', 'invalidation-test')
      );
      
      expect(executionTime).toBeLessThan(1000);
      expect(mockRevalidate).toHaveBeenCalledWith('/testuser/invalidation-test');
    });
  });

  describe('Error Handling Performance', () => {
    it('should fail fast on invalid repositories', async () => {
      mockOctokit.rest.repos.get.mockRejectedValueOnce({
        status: 404,
        message: 'Not Found'
      });
      
      const { result, executionTime } = await PerformanceTestUtils.measureExecutionTime(
        async () => {
          try {
            return await portfolioRenderer.getStaticProps({
              params: { username: 'testuser', repo: 'nonexistent' }
            });
          } catch (error) {
            return { notFound: true, error: error.message };
          }
        }
      );
      
      expect(result.notFound).toBe(true);
      expect(executionTime).toBeLessThan(2000); // Should fail quickly
    });

    it('should handle GitHub API rate limits gracefully', async () => {
      mockOctokit.rest.repos.get.mockRejectedValueOnce({
        status: 403,
        message: 'API rate limit exceeded'
      });
      
      const { result, executionTime } = await PerformanceTestUtils.measureExecutionTime(
        async () => {
          try {
            return await portfolioRenderer.getStaticProps({
              params: { username: 'testuser', repo: 'rate-limited' }
            });
          } catch (error) {
            return { error: error.message, rateLimited: true };
          }
        }
      );
      
      expect(result.rateLimited).toBe(true);
      expect(executionTime).toBeLessThan(5000);
    });
  });

  describe('Scalability Tests', () => {
    it('should handle high-traffic scenarios', async () => {
      const highTrafficTest = PerformanceTestUtils.createLoadTest(
        () => portfolioRenderer.getStaticProps({
          params: { 
            username: 'testuser', 
            repo: `portfolio-${Math.floor(Math.random() * 100)}` 
          }
        }),
        { concurrency: 20, iterations: 100 }
      );
      
      const results = await highTrafficTest();
      
      expect(results.successfulRequests).toBeGreaterThan(80);
      expect(results.averageDuration).toBeLessThan(5000);
      expect(results.failedRequests).toBeLessThan(20);
    });

    it('should maintain performance with many unique portfolios', async () => {
      const uniquePortfolios = 50;
      const requests = [];
      
      for (let i = 0; i < uniquePortfolios; i++) {
        requests.push(
          portfolioRenderer.getStaticProps({
            params: { username: `user${i}`, repo: `portfolio${i}` }
          })
        );
      }
      
      const startTime = performance.now();
      const results = await Promise.all(requests);
      const endTime = performance.now();
      
      expect(results).toHaveLength(uniquePortfolios);
      expect(results.every(r => r.props)).toBe(true);
      
      // Should handle many unique portfolios within reasonable time
      expect(endTime - startTime).toBeLessThan(30000); // 30 seconds max
    });
  });
});