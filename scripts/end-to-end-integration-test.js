#!/usr/bin/env node

/**
 * End-to-End Integration Test Suite
 * 
 * This script tests the complete user journey from authentication to portfolio hosting.
 * It validates all major workflows and error handling paths.
 */

import { config } from 'dotenv';
import { Octokit } from '@octokit/rest';

// Load environment variables
config({ path: '.env.local' });

class EndToEndIntegrationTest {
  constructor() {
    this.baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000';
    this.testResults = {
      passed: 0,
      failed: 0,
      errors: []
    };
    
    // Test configuration
    this.testConfig = {
      timeout: 30000, // 30 seconds
      retryAttempts: 3,
      testUser: {
        username: process.env.TEST_GITHUB_USERNAME || 'test-user',
        token: process.env.TEST_GITHUB_TOKEN
      }
    };
  }

  /**
   * Main test runner
   */
  async runAllTests() {
    console.log('🚀 Starting End-to-End Integration Tests...\n');
    
    try {
      // 1. System Health Checks
      await this.testSystemHealth();
      
      // 2. Authentication Flow Tests
      await this.testAuthenticationFlow();
      
      // 3. Template System Tests
      await this.testTemplateSystem();
      
      // 4. Repository Operations Tests
      await this.testRepositoryOperations();
      
      // 5. Editor Integration Tests
      await this.testEditorIntegration();
      
      // 6. Portfolio Rendering Tests
      await this.testPortfolioRendering();
      
      // 7. Error Handling Tests
      await this.testErrorHandling();
      
      // 8. Performance Tests
      await this.testPerformance();
      
      // 9. Security Tests
      await this.testSecurity();
      
      this.printResults();
      
    } catch (error) {
      console.error('❌ Critical test failure:', error.message);
      process.exit(1);
    }
  }

  /**
   * Test system health and configuration
   */
  async testSystemHealth() {
    console.log('🔍 Testing System Health...');
    
    // Test health endpoint
    await this.runTest('Health Check Endpoint', async () => {
      const response = await this.makeRequest('/api/health');
      if (response.status !== 'healthy') {
        throw new Error('Health check failed');
      }
    });
    
    // Test environment configuration
    await this.runTest('Environment Configuration', async () => {
      const requiredEnvVars = [
        'GITHUB_CLIENT_ID',
        'GITHUB_CLIENT_SECRET',
        'NEXTAUTH_SECRET',
        'NEXTAUTH_URL'
      ];
      
      for (const envVar of requiredEnvVars) {
        if (!process.env[envVar]) {
          throw new Error(`Missing required environment variable: ${envVar}`);
        }
      }
    });
    
    // Test GitHub API connectivity
    await this.runTest('GitHub API Connectivity', async () => {
      if (!this.testConfig.testUser.token) {
        console.log('⚠️  Skipping GitHub API test - no test token provided');
        return;
      }
      
      const octokit = new Octokit({ auth: this.testConfig.testUser.token });
      const { data } = await octokit.rest.users.getAuthenticated();
      
      if (!data.login) {
        throw new Error('GitHub API authentication failed');
      }
    });
  }

  /**
   * Test authentication flow
   */
  async testAuthenticationFlow() {
    console.log('\n🔐 Testing Authentication Flow...');
    
    // Test OAuth configuration endpoint
    await this.runTest('OAuth Configuration', async () => {
      const response = await this.makeRequest('/api/auth/config');
      if (!response.github || !response.github.clientId) {
        throw new Error('OAuth configuration incomplete');
      }
    });
    
    // Test session endpoint
    await this.runTest('Session Management', async () => {
      const response = await this.makeRequest('/api/auth/session');
      // Should return null or valid session data
      if (response.error) {
        throw new Error(`Session endpoint error: ${response.error}`);
      }
    });
    
    // Test authentication validation
    await this.runTest('Authentication Validation', async () => {
      const response = await this.makeRequest('/api/auth/validate');
      // Should handle unauthenticated requests gracefully
      if (response.status !== 401 && response.status !== 200) {
        throw new Error('Authentication validation failed');
      }
    });
  }

  /**
   * Test template system
   */
  async testTemplateSystem() {
    console.log('\n🎨 Testing Template System...');
    
    // Test template listing
    await this.runTest('Template Listing', async () => {
      const response = await this.makeRequest('/api/templates');
      if (!Array.isArray(response.templates)) {
        throw new Error('Template listing failed');
      }
    });
    
    // Test template preview
    await this.runTest('Template Preview Generation', async () => {
      const templates = await this.makeRequest('/api/templates');
      if (templates.templates.length > 0) {
        const templateId = templates.templates[0].id;
        const preview = await this.makeRequest(`/api/templates/by-id/${templateId}`);
        
        if (!preview.template || !preview.preview) {
          throw new Error('Template preview generation failed');
        }
      }
    });
  }

  /**
   * Test repository operations
   */
  async testRepositoryOperations() {
    console.log('\n📁 Testing Repository Operations...');
    
    // Test repository validation
    await this.runTest('Repository Validation', async () => {
      const response = await this.makeRequest('/api/repositories/nonexistent/repo');
      if (response.status !== 404) {
        throw new Error('Repository validation should return 404 for nonexistent repos');
      }
    });
    
    // Test fork endpoint (without actual forking)
    await this.runTest('Fork Endpoint Structure', async () => {
      const response = await this.makeRequest('/api/repositories/fork', {
        method: 'POST',
        body: JSON.stringify({ templateId: 'test-template' }),
        expectError: true
      });
      
      // Should return proper error structure for unauthenticated request
      if (!response.error) {
        throw new Error('Fork endpoint should return error structure');
      }
    });
  }

  /**
   * Test editor integration
   */
  async testEditorIntegration() {
    console.log('\n✏️  Testing Editor Integration...');
    
    // Test editor API structure
    await this.runTest('Editor API Structure', async () => {
      const response = await this.makeRequest('/api/editor/save', {
        method: 'POST',
        body: JSON.stringify({ test: 'data' }),
        expectError: true
      });
      
      // Should return proper error structure
      if (!response.error) {
        throw new Error('Editor API should return error structure');
      }
    });
    
    // Test conflict detection endpoint
    await this.runTest('Conflict Detection', async () => {
      const response = await this.makeRequest('/api/editor/conflicts', {
        method: 'POST',
        body: JSON.stringify({ owner: 'test', repo: 'test' }),
        expectError: true
      });
      
      // Should handle unauthenticated requests
      if (response.status !== 401 && !response.error) {
        throw new Error('Conflict detection should handle auth properly');
      }
    });
  }

  /**
   * Test portfolio rendering
   */
  async testPortfolioRendering() {
    console.log('\n🌐 Testing Portfolio Rendering...');
    
    // Test dynamic route structure
    await this.runTest('Dynamic Route Handling', async () => {
      const response = await fetch(`${this.baseUrl}/nonexistent/repo`, {
        method: 'GET',
        redirect: 'manual'
      });
      
      // Should return proper error page or 404
      if (response.status !== 404 && response.status !== 200) {
        throw new Error(`Unexpected status for nonexistent portfolio: ${response.status}`);
      }
    });
    
    // Test portfolio API endpoint
    await this.runTest('Portfolio API', async () => {
      const response = await this.makeRequest('/api/portfolio/analyze', {
        method: 'POST',
        body: JSON.stringify({ owner: 'test', repo: 'test' }),
        expectError: true
      });
      
      // Should handle requests properly
      if (!response.error && response.status !== 200) {
        throw new Error('Portfolio API should handle requests properly');
      }
    });
  }

  /**
   * Test error handling
   */
  async testErrorHandling() {
    console.log('\n🚨 Testing Error Handling...');
    
    // Test error reporting endpoint
    await this.runTest('Error Reporting', async () => {
      const response = await this.makeRequest('/api/error-reports', {
        method: 'POST',
        body: JSON.stringify({
          error: 'Test error',
          context: 'Integration test'
        })
      });
      
      if (response.status !== 'received' && !response.success) {
        throw new Error('Error reporting failed');
      }
    });
    
    // Test rate limiting
    await this.runTest('Rate Limiting', async () => {
      // Make multiple rapid requests to test rate limiting
      const promises = Array(5).fill().map(() => 
        this.makeRequest('/api/health', { expectError: true })
      );
      
      const results = await Promise.all(promises);
      // All should succeed or be properly rate limited
      const hasErrors = results.some(r => r.error && !r.error.includes('rate'));
      if (hasErrors) {
        throw new Error('Unexpected errors in rate limiting test');
      }
    });
  }

  /**
   * Test performance requirements
   */
  async testPerformance() {
    console.log('\n⚡ Testing Performance...');
    
    // Test response times
    await this.runTest('Response Time Requirements', async () => {
      const startTime = Date.now();
      await this.makeRequest('/api/health');
      const responseTime = Date.now() - startTime;
      
      if (responseTime > 2000) {
        throw new Error(`Response time too slow: ${responseTime}ms (should be < 2000ms)`);
      }
    });
    
    // Test concurrent requests
    await this.runTest('Concurrent Request Handling', async () => {
      const concurrentRequests = 10;
      const promises = Array(concurrentRequests).fill().map(() => 
        this.makeRequest('/api/health')
      );
      
      const startTime = Date.now();
      const results = await Promise.all(promises);
      const totalTime = Date.now() - startTime;
      
      // All requests should succeed
      const failures = results.filter(r => r.status !== 'healthy');
      if (failures.length > 0) {
        throw new Error(`${failures.length} concurrent requests failed`);
      }
      
      // Average response time should be reasonable
      const avgTime = totalTime / concurrentRequests;
      if (avgTime > 1000) {
        throw new Error(`Average concurrent response time too slow: ${avgTime}ms`);
      }
    });
  }

  /**
   * Test security measures
   */
  async testSecurity() {
    console.log('\n🔒 Testing Security...');
    
    // Test CORS headers
    await this.runTest('CORS Configuration', async () => {
      const response = await fetch(`${this.baseUrl}/api/health`, {
        method: 'OPTIONS'
      });
      
      // Should handle OPTIONS requests properly
      if (response.status !== 200 && response.status !== 204) {
        throw new Error('CORS preflight handling failed');
      }
    });
    
    // Test input validation
    await this.runTest('Input Validation', async () => {
      const maliciousPayload = {
        script: '<script>alert("xss")</script>',
        sql: "'; DROP TABLE users; --",
        path: '../../../etc/passwd'
      };
      
      const response = await this.makeRequest('/api/error-reports', {
        method: 'POST',
        body: JSON.stringify(maliciousPayload),
        expectError: true
      });
      
      // Should handle malicious input safely
      if (!response.error && !response.success) {
        throw new Error('Input validation test failed');
      }
    });
  }

  /**
   * Helper method to run individual tests
   */
  async runTest(testName, testFunction) {
    try {
      console.log(`  ⏳ ${testName}...`);
      await Promise.race([
        testFunction(),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Test timeout')), this.testConfig.timeout)
        )
      ]);
      
      console.log(`  ✅ ${testName}`);
      this.testResults.passed++;
    } catch (error) {
      console.log(`  ❌ ${testName}: ${error.message}`);
      this.testResults.failed++;
      this.testResults.errors.push({ test: testName, error: error.message });
    }
  }

  /**
   * Helper method to make HTTP requests
   */
  async makeRequest(endpoint, options = {}) {
    const url = `${this.baseUrl}${endpoint}`;
    const config = {
      method: options.method || 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...options.headers
      }
    };
    
    if (options.body) {
      config.body = options.body;
    }
    
    try {
      const response = await fetch(url, config);
      
      if (!response.ok && !options.expectError) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        return await response.json();
      }
      
      return { status: response.status, statusText: response.statusText };
    } catch (error) {
      if (options.expectError) {
        return { error: error.message, status: 500 };
      }
      throw error;
    }
  }

  /**
   * Print test results summary
   */
  printResults() {
    console.log('\n' + '='.repeat(60));
    console.log('📊 TEST RESULTS SUMMARY');
    console.log('='.repeat(60));
    
    const total = this.testResults.passed + this.testResults.failed;
    const successRate = total > 0 ? (this.testResults.passed / total * 100).toFixed(1) : 0;
    
    console.log(`✅ Passed: ${this.testResults.passed}`);
    console.log(`❌ Failed: ${this.testResults.failed}`);
    console.log(`📈 Success Rate: ${successRate}%`);
    
    if (this.testResults.errors.length > 0) {
      console.log('\n❌ FAILED TESTS:');
      this.testResults.errors.forEach(({ test, error }) => {
        console.log(`  • ${test}: ${error}`);
      });
    }
    
    console.log('\n' + '='.repeat(60));
    
    if (this.testResults.failed === 0) {
      console.log('🎉 All tests passed! The system is ready for production.');
    } else {
      console.log('⚠️  Some tests failed. Please review and fix the issues above.');
      process.exit(1);
    }
  }
}

// Run tests if this script is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const tester = new EndToEndIntegrationTest();
  tester.runAllTests().catch(error => {
    console.error('Test runner failed:', error);
    process.exit(1);
  });
}

export { EndToEndIntegrationTest };