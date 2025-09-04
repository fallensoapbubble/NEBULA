/**
 * Test Configuration
 * Centralized configuration for all test types
 */

export const testConfig = {
  // Performance test thresholds
  performance: {
    maxExecutionTime: {
      unit: 100,        // 100ms for unit tests
      integration: 2000, // 2s for integration tests
      e2e: 30000,       // 30s for e2e tests
      api: 1000         // 1s for API tests
    },
    maxMemoryUsage: {
      small: 10 * 1024 * 1024,  // 10MB
      medium: 50 * 1024 * 1024, // 50MB
      large: 100 * 1024 * 1024  // 100MB
    },
    loadTest: {
      concurrency: 10,
      iterations: 100,
      timeout: 30000
    }
  },

  // GitHub API mocking configuration
  github: {
    rateLimits: {
      core: { limit: 5000, remaining: 4999 },
      search: { limit: 30, remaining: 29 },
      graphql: { limit: 5000, remaining: 4999 }
    },
    defaultResponses: {
      user: {
        id: 12345,
        login: 'testuser',
        name: 'Test User',
        email: 'test@example.com'
      },
      repository: {
        id: 67890,
        name: 'test-repo',
        full_name: 'testuser/test-repo',
        private: false,
        default_branch: 'main'
      }
    }
  },

  // Test data templates
  templates: {
    portfolioContent: {
      name: 'Test Portfolio',
      description: 'A test portfolio for automated testing',
      sections: [
        {
          type: 'hero',
          title: 'Welcome',
          content: 'This is a test portfolio'
        },
        {
          type: 'about',
          title: 'About Me',
          content: 'I am a test user'
        }
      ]
    },
    nebulaConfig: {
      version: '1.0',
      templateType: 'json',
      contentFiles: [
        {
          path: 'data.json',
          type: 'json',
          schema: {
            name: { type: 'string', required: true },
            description: { type: 'text' },
            sections: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  type: { type: 'string' },
                  title: { type: 'string' },
                  content: { type: 'text' }
                }
              }
            }
          }
        }
      ]
    }
  },

  // Test environment settings
  environment: {
    timeout: 30000,
    retries: 3,
    parallel: true,
    coverage: {
      threshold: {
        global: {
          branches: 80,
          functions: 80,
          lines: 80,
          statements: 80
        }
      }
    }
  },

  // Mock service configurations
  mocks: {
    octokit: {
      defaultDelay: 100, // Simulate network delay
      errorRate: 0.05,   // 5% error rate for resilience testing
      rateLimitSimulation: true
    },
    nextjs: {
      revalidateDelay: 50,
      staticGenerationTime: 200
    }
  },

  // Test categories and their specific settings
  categories: {
    unit: {
      timeout: 5000,
      parallel: true,
      coverage: true
    },
    integration: {
      timeout: 15000,
      parallel: false, // Sequential for integration tests
      coverage: true
    },
    e2e: {
      timeout: 60000,
      parallel: false,
      coverage: false // E2E tests don't need coverage
    },
    performance: {
      timeout: 120000,
      parallel: false,
      coverage: false,
      warmup: true // Warm up before performance tests
    }
  }
};

/**
 * Get configuration for specific test type
 */
export function getTestConfig(category) {
  return {
    ...testConfig,
    ...testConfig.categories[category]
  };
}

/**
 * Create test-specific environment variables
 */
export function createTestEnvironment(category) {
  const baseEnv = {
    NODE_ENV: 'test',
    GITHUB_CLIENT_ID: 'test-client-id',
    GITHUB_CLIENT_SECRET: 'test-client-secret',
    NEXTAUTH_SECRET: 'test-nextauth-secret',
    NEXTAUTH_URL: 'http://localhost:3000'
  };

  const categoryEnv = {
    unit: {
      ...baseEnv,
      TEST_CATEGORY: 'unit'
    },
    integration: {
      ...baseEnv,
      TEST_CATEGORY: 'integration',
      GITHUB_API_URL: 'https://api.github.com' // Use real API URL for integration
    },
    e2e: {
      ...baseEnv,
      TEST_CATEGORY: 'e2e',
      GITHUB_API_URL: 'https://api.github.com',
      NEXT_PUBLIC_APP_URL: 'http://localhost:3000'
    },
    performance: {
      ...baseEnv,
      TEST_CATEGORY: 'performance',
      NODE_OPTIONS: '--max-old-space-size=4096' // Increase memory for performance tests
    }
  };

  return categoryEnv[category] || baseEnv;
}

/**
 * Performance test utilities configuration
 */
export const performanceConfig = {
  // ISR performance benchmarks
  isr: {
    staticGeneration: {
      maxTime: 2000,      // 2s max for static generation
      maxMemory: 50 * 1024 * 1024 // 50MB max memory usage
    },
    revalidation: {
      maxTime: 1000,      // 1s max for revalidation
      batchSize: 10       // Max concurrent revalidations
    }
  },

  // API performance benchmarks
  api: {
    response: {
      maxTime: 1000,      // 1s max response time
      p95Time: 500        // 95th percentile under 500ms
    },
    throughput: {
      minRps: 100,        // Minimum 100 requests per second
      concurrency: 20     // Handle 20 concurrent requests
    }
  },

  // Service performance benchmarks
  services: {
    repository: {
      fork: { maxTime: 5000 },
      content: { maxTime: 2000 },
      sync: { maxTime: 3000 }
    },
    template: {
      validation: { maxTime: 1000 },
      analysis: { maxTime: 2000 }
    }
  }
};

export default testConfig;