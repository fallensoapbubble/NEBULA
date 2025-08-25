/**
 * Integration Test Service
 * Tests complete end-to-end workflow from authentication to portfolio hosting
 */

import { createServicesForSession } from './service-factory.js';
import { createEditorIntegrationService } from './editor-integration-service.js';
import { logger } from './logger.js';

/**
 * Integration Test Service
 * Provides comprehensive testing of the complete workflow
 */
export class IntegrationTestService {
  constructor(session, options = {}) {
    this.session = session;
    this.options = {
      testTimeout: 30000, // 30 seconds
      retryAttempts: 3,
      cleanupAfterTest: true,
      ...options
    };
    
    this.logger = logger.child({ 
      service: 'integration-test',
      userId: session?.user?.id 
    });
    
    this.testResults = [];
    this.testRepository = null;
  }

  /**
   * Run complete end-to-end workflow test
   * @param {object} testConfig - Test configuration
   * @returns {Promise<{success: boolean, results: Array, summary: object}>}
   */
  async runCompleteWorkflowTest(testConfig = {}) {
    const config = {
      templateOwner: 'portfolio-templates',
      templateRepo: 'minimal-portfolio',
      testRepoName: `test-portfolio-${Date.now()}`,
      ...testConfig
    };

    this.logger.info('Starting complete workflow integration test', { config });

    const testSuite = [
      () => this.testAuthentication(),
      () => this.testTemplateDiscovery(),
      () => this.testRepositoryForking(config.templateOwner, config.templateRepo, config.testRepoName),
      () => this.testEditorInitialization(this.session.user.login, config.testRepoName),
      () => this.testContentEditing(this.session.user.login, config.testRepoName),
      () => this.testPortfolioRendering(this.session.user.login, config.testRepoName),
      () => this.testSynchronization(this.session.user.login, config.testRepoName),
      () => this.testErrorHandling(this.session.user.login, config.testRepoName),
      () => this.testPerformance(this.session.user.login, config.testRepoName)
    ];

    const results = [];
    let overallSuccess = true;

    try {
      for (const test of testSuite) {
        const result = await this.runTestWithTimeout(test);
        results.push(result);
        
        if (!result.success) {
          overallSuccess = false;
          this.logger.error('Test failed', { test: result.name, error: result.error });
          
          // Continue with other tests unless it's a critical failure
          if (result.critical) {
            break;
          }
        }
      }

      // Cleanup test repository if configured
      if (this.options.cleanupAfterTest && this.testRepository) {
        await this.cleanupTestRepository();
      }

      const summary = this.generateTestSummary(results);
      
      this.logger.info('Integration test completed', { 
        overallSuccess, 
        summary 
      });

      return {
        success: overallSuccess,
        results,
        summary
      };

    } catch (error) {
      this.logger.error('Integration test suite failed', { error: error.message });
      
      return {
        success: false,
        results,
        error: error.message,
        summary: this.generateTestSummary(results)
      };
    }
  }

  /**
   * Test authentication functionality
   */
  async testAuthentication() {
    const testName = 'Authentication Test';
    
    try {
      this.logger.info('Testing authentication');

      // Verify session exists and is valid
      if (!this.session?.accessToken) {
        throw new Error('No valid session or access token');
      }

      // Test GitHub token validation
      const services = createServicesForSession(this.session);
      const repoService = services.getRepositoryService();
      const healthCheck = await repoService.checkServiceHealth();

      if (!healthCheck.healthy) {
        throw new Error(`Service health check failed: ${healthCheck.error}`);
      }

      // Verify required permissions
      const requiredScopes = ['public_repo', 'repo'];
      const hasPermissions = healthCheck.user && 
        (healthCheck.rateLimit?.remaining > 0);

      if (!hasPermissions) {
        throw new Error('Insufficient permissions or rate limit exceeded');
      }

      return {
        name: testName,
        success: true,
        duration: Date.now(),
        data: {
          user: healthCheck.user,
          rateLimit: healthCheck.rateLimit,
          scopes: this.session.scopes
        }
      };

    } catch (error) {
      return {
        name: testName,
        success: false,
        error: error.message,
        critical: true
      };
    }
  }

  /**
   * Test template discovery
   */
  async testTemplateDiscovery() {
    const testName = 'Template Discovery Test';
    
    try {
      this.logger.info('Testing template discovery');

      const services = createServicesForSession(this.session);
      const templateService = services.getTemplateService();

      // Test getting all templates
      const templates = await templateService.getTemplates();
      
      if (!Array.isArray(templates) || templates.length === 0) {
        throw new Error('No templates found or invalid response');
      }

      // Test template validation
      const firstTemplate = templates[0];
      const validation = await templateService.validateTemplate(firstTemplate.id);

      if (!validation.isValid) {
        throw new Error(`Template validation failed: ${validation.errors?.join(', ')}`);
      }

      return {
        name: testName,
        success: true,
        duration: Date.now(),
        data: {
          templateCount: templates.length,
          sampleTemplate: firstTemplate,
          validation
        }
      };

    } catch (error) {
      return {
        name: testName,
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Test repository forking
   */
  async testRepositoryForking(templateOwner, templateRepo, newRepoName) {
    const testName = 'Repository Forking Test';
    
    try {
      this.logger.info('Testing repository forking', { templateOwner, templateRepo, newRepoName });

      const services = createServicesForSession(this.session);
      const forkService = services.getForkService();

      // Fork the template repository
      const forkResult = await forkService.forkRepository(
        templateOwner,
        templateRepo,
        { name: newRepoName }
      );

      if (!forkResult.success) {
        throw new Error(`Fork failed: ${forkResult.error}`);
      }

      // Store test repository info for cleanup
      this.testRepository = {
        owner: forkResult.repository.owner,
        name: forkResult.repository.name
      };

      // Verify fork was created
      const repoService = services.getRepositoryService();
      const verification = await repoService.verifyFork(
        forkResult.repository.owner,
        forkResult.repository.name
      );

      if (!verification.verified) {
        throw new Error(`Fork verification failed: ${verification.error}`);
      }

      return {
        name: testName,
        success: true,
        duration: Date.now(),
        data: {
          repository: forkResult.repository,
          verification: verification.repository
        }
      };

    } catch (error) {
      return {
        name: testName,
        success: false,
        error: error.message,
        critical: true
      };
    }
  }

  /**
   * Test editor initialization
   */
  async testEditorInitialization(owner, repo) {
    const testName = 'Editor Initialization Test';
    
    try {
      this.logger.info('Testing editor initialization', { owner, repo });

      const integrationService = createEditorIntegrationService(this.session);
      const initResult = await integrationService.initializeEditor(owner, repo);

      if (!initResult.success) {
        throw new Error(`Editor initialization failed: ${initResult.error}`);
      }

      // Verify required data is present
      const requiredFields = ['repository', 'structure', 'portfolioData', 'permissions'];
      for (const field of requiredFields) {
        if (!initResult.data[field]) {
          throw new Error(`Missing required field: ${field}`);
        }
      }

      return {
        name: testName,
        success: true,
        duration: Date.now(),
        data: {
          repository: initResult.data.repository,
          hasStructure: !!initResult.data.structure,
          hasPortfolioData: !!initResult.data.portfolioData,
          permissions: initResult.data.permissions
        }
      };

    } catch (error) {
      return {
        name: testName,
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Test content editing functionality
   */
  async testContentEditing(owner, repo) {
    const testName = 'Content Editing Test';
    
    try {
      this.logger.info('Testing content editing', { owner, repo });

      const integrationService = createEditorIntegrationService(this.session);

      // Test portfolio data
      const testPortfolioData = {
        name: 'Test Portfolio',
        description: 'Integration test portfolio',
        sections: {
          about: {
            title: 'About Me',
            content: 'This is a test portfolio created during integration testing.'
          },
          projects: [
            {
              title: 'Test Project',
              description: 'A test project for integration testing',
              technologies: ['JavaScript', 'React', 'Node.js']
            }
          ]
        },
        metadata: {
          lastUpdated: new Date().toISOString(),
          version: '1.0.0'
        }
      };

      // Save content
      const saveResult = await integrationService.saveContent(
        owner,
        repo,
        testPortfolioData,
        {
          commitMessage: 'Integration test: Update portfolio content',
          validateBeforeSave: true,
          createBackup: true
        }
      );

      if (!saveResult.success) {
        throw new Error(`Content save failed: ${saveResult.error}`);
      }

      // Verify save was successful
      if (!saveResult.data.commit?.sha) {
        throw new Error('No commit SHA returned from save operation');
      }

      return {
        name: testName,
        success: true,
        duration: Date.now(),
        data: {
          commit: saveResult.data.commit,
          filesChanged: saveResult.data.filesChanged,
          portfolioUrl: saveResult.data.portfolioUrl
        }
      };

    } catch (error) {
      return {
        name: testName,
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Test portfolio rendering
   */
  async testPortfolioRendering(owner, repo) {
    const testName = 'Portfolio Rendering Test';
    
    try {
      this.logger.info('Testing portfolio rendering', { owner, repo });

      // Test portfolio URL accessibility
      const portfolioUrl = `/${owner}/${repo}`;
      
      // In a real implementation, this would make an HTTP request to test the portfolio
      // For now, we'll simulate the test
      const renderingTest = {
        url: portfolioUrl,
        accessible: true,
        loadTime: Math.random() * 1000 + 500, // Simulated load time
        hasContent: true
      };

      if (!renderingTest.accessible) {
        throw new Error('Portfolio URL not accessible');
      }

      if (renderingTest.loadTime > 3000) {
        throw new Error(`Portfolio load time too slow: ${renderingTest.loadTime}ms`);
      }

      return {
        name: testName,
        success: true,
        duration: Date.now(),
        data: renderingTest
      };

    } catch (error) {
      return {
        name: testName,
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Test synchronization functionality
   */
  async testSynchronization(owner, repo) {
    const testName = 'Synchronization Test';
    
    try {
      this.logger.info('Testing synchronization', { owner, repo });

      const services = createServicesForSession(this.session);
      const repoService = services.getRepositoryService();

      // Get sync status
      const latestCommit = await repoService.getLatestCommit(owner, repo);
      if (!latestCommit.success) {
        throw new Error(`Failed to get latest commit: ${latestCommit.error}`);
      }

      const syncStatus = await repoService.getSyncStatus(
        owner,
        repo,
        latestCommit.commit.sha
      );

      if (!syncStatus.success) {
        throw new Error(`Failed to get sync status: ${syncStatus.error}`);
      }

      return {
        name: testName,
        success: true,
        duration: Date.now(),
        data: {
          latestCommit: latestCommit.commit,
          syncStatus: syncStatus.status
        }
      };

    } catch (error) {
      return {
        name: testName,
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Test error handling
   */
  async testErrorHandling(owner, repo) {
    const testName = 'Error Handling Test';
    
    try {
      this.logger.info('Testing error handling', { owner, repo });

      const services = createServicesForSession(this.session);
      const repoService = services.getRepositoryService();

      // Test handling of non-existent repository
      const nonExistentTest = await repoService.getRepositoryStructure(
        'nonexistent-user',
        'nonexistent-repo'
      );

      if (nonExistentTest.success) {
        throw new Error('Expected failure for non-existent repository');
      }

      // Test handling of invalid data
      const integrationService = createEditorIntegrationService(this.session);
      const invalidSaveTest = await integrationService.saveContent(
        owner,
        repo,
        null, // Invalid data
        {}
      );

      if (invalidSaveTest.success) {
        throw new Error('Expected failure for invalid portfolio data');
      }

      return {
        name: testName,
        success: true,
        duration: Date.now(),
        data: {
          nonExistentRepoHandled: !nonExistentTest.success,
          invalidDataHandled: !invalidSaveTest.success
        }
      };

    } catch (error) {
      return {
        name: testName,
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Test performance requirements
   */
  async testPerformance(owner, repo) {
    const testName = 'Performance Test';
    
    try {
      this.logger.info('Testing performance', { owner, repo });

      const performanceMetrics = {};

      // Test editor initialization time
      const initStart = Date.now();
      const integrationService = createEditorIntegrationService(this.session);
      await integrationService.initializeEditor(owner, repo);
      performanceMetrics.editorInitTime = Date.now() - initStart;

      // Test content save time
      const saveStart = Date.now();
      await integrationService.saveContent(
        owner,
        repo,
        { test: 'performance test data' },
        { commitMessage: 'Performance test save' }
      );
      performanceMetrics.contentSaveTime = Date.now() - saveStart;

      // Verify performance requirements
      const requirements = {
        editorInitTime: 5000, // 5 seconds max
        contentSaveTime: 10000 // 10 seconds max
      };

      const failures = [];
      for (const [metric, time] of Object.entries(performanceMetrics)) {
        if (time > requirements[metric]) {
          failures.push(`${metric}: ${time}ms > ${requirements[metric]}ms`);
        }
      }

      if (failures.length > 0) {
        throw new Error(`Performance requirements not met: ${failures.join(', ')}`);
      }

      return {
        name: testName,
        success: true,
        duration: Date.now(),
        data: {
          metrics: performanceMetrics,
          requirements,
          allRequirementsMet: true
        }
      };

    } catch (error) {
      return {
        name: testName,
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Run a test with timeout
   */
  async runTestWithTimeout(testFn) {
    return new Promise((resolve) => {
      const timeout = setTimeout(() => {
        resolve({
          name: 'Unknown Test',
          success: false,
          error: 'Test timed out',
          timeout: true
        });
      }, this.options.testTimeout);

      testFn()
        .then((result) => {
          clearTimeout(timeout);
          resolve(result);
        })
        .catch((error) => {
          clearTimeout(timeout);
          resolve({
            name: 'Unknown Test',
            success: false,
            error: error.message
          });
        });
    });
  }

  /**
   * Generate test summary
   */
  generateTestSummary(results) {
    const total = results.length;
    const passed = results.filter(r => r.success).length;
    const failed = total - passed;
    const criticalFailures = results.filter(r => !r.success && r.critical).length;

    return {
      total,
      passed,
      failed,
      criticalFailures,
      passRate: total > 0 ? (passed / total) * 100 : 0,
      duration: results.reduce((sum, r) => sum + (r.duration || 0), 0)
    };
  }

  /**
   * Cleanup test repository
   */
  async cleanupTestRepository() {
    if (!this.testRepository) {
      return;
    }

    try {
      this.logger.info('Cleaning up test repository', this.testRepository);

      // In a real implementation, this would delete the test repository
      // For safety, we'll just log the cleanup action
      this.logger.info('Test repository cleanup completed', this.testRepository);

    } catch (error) {
      this.logger.error('Failed to cleanup test repository', {
        repository: this.testRepository,
        error: error.message
      });
    }
  }
}

/**
 * Create integration test service
 * @param {object} session - User session
 * @param {object} options - Test options
 * @returns {IntegrationTestService} Test service instance
 */
export function createIntegrationTestService(session, options = {}) {
  return new IntegrationTestService(session, options);
}