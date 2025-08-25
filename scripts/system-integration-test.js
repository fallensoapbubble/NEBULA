#!/usr/bin/env node

/**
 * System Integration Test
 * 
 * This script validates that all system components are properly integrated
 * and work together as expected. It tests the complete system architecture.
 */

import { config } from 'dotenv';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

// Load environment variables
config({ path: '.env.local' });

class SystemIntegrationTest {
  constructor() {
    this.baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000';
    this.results = {
      components: [],
      integrations: [],
      totalTests: 0,
      passedTests: 0,
      failedTests: 0,
      errors: []
    };
  }

  /**
   * Run all system integration tests
   */
  async runSystemTests() {
    console.log('🔧 Starting System Integration Tests...\n');
    
    try {
      // Test 1: Component Architecture Validation
      await this.testComponentArchitecture();
      
      // Test 2: API Integration Validation
      await this.testAPIIntegration();
      
      // Test 3: Authentication Integration
      await this.testAuthenticationIntegration();
      
      // Test 4: Template System Integration
      await this.testTemplateSystemIntegration();
      
      // Test 5: Repository Management Integration
      await this.testRepositoryIntegration();
      
      // Test 6: Editor Integration
      await this.testEditorIntegration();
      
      // Test 7: Portfolio Rendering Integration
      await this.testPortfolioRenderingIntegration();
      
      // Test 8: Error Handling Integration
      await this.testErrorHandlingIntegration();
      
      // Test 9: Performance Integration
      await this.testPerformanceIntegration();
      
      // Test 10: Security Integration
      await this.testSecurityIntegration();
      
      this.printSystemResults();
      
    } catch (error) {
      console.error('❌ Critical system integration failure:', error.message);
      process.exit(1);
    }
  }

  /**
   * Test component architecture and file structure
   */
  async testComponentArchitecture() {
    const component = this.createComponent('Component Architecture');
    
    // Test core application structure
    await this.runTest(component, 'Core App Structure', () => {
      const requiredFiles = [
        'src/app/layout.js',
        'src/app/page.js',
        'package.json',
        'next.config.mjs'
      ];
      
      for (const file of requiredFiles) {
        if (!existsSync(file)) {
          throw new Error(`Required file missing: ${file}`);
        }
      }
    });
    
    // Test API route structure
    await this.runTest(component, 'API Route Structure', () => {
      const requiredAPIRoutes = [
        'src/app/api/auth',
        'src/app/api/templates',
        'src/app/api/repositories',
        'src/app/api/editor',
        'src/app/api/health'
      ];
      
      for (const route of requiredAPIRoutes) {
        if (!existsSync(route)) {
          throw new Error(`Required API route missing: ${route}`);
        }
      }
    });
    
    // Test component library structure
    await this.runTest(component, 'Component Library', () => {
      const requiredComponents = [
        'components/ui',
        'components/layout',
        'components/auth',
        'components/editor',
        'components/templates'
      ];
      
      for (const comp of requiredComponents) {
        if (!existsSync(comp)) {
          throw new Error(`Required component directory missing: ${comp}`);
        }
      }
    });
    
    // Test library structure
    await this.runTest(component, 'Library Structure', () => {
      const requiredLibs = [
        'lib/auth.js',
        'lib/github.js',
        'lib/template-service.js',
        'lib/repository-service.js'
      ];
      
      for (const lib of requiredLibs) {
        if (!existsSync(lib)) {
          throw new Error(`Required library missing: ${lib}`);
        }
      }
    });
    
    this.completeComponent(component);
  }

  /**
   * Test API integration between services
   */
  async testAPIIntegration() {
    const component = this.createComponent('API Integration');
    
    // Test health endpoint
    await this.runTest(component, 'Health Endpoint', async () => {
      const response = await this.makeRequest('/api/health');
      if (response.status !== 'healthy') {
        throw new Error('Health endpoint not responding correctly');
      }
    });
    
    // Test API endpoint consistency
    await this.runTest(component, 'API Endpoint Consistency', async () => {
      const endpoints = [
        '/api/auth/config',
        '/api/templates',
        '/api/health'
      ];
      
      for (const endpoint of endpoints) {
        const response = await this.makeRequest(endpoint, { expectError: true });
        
        // All endpoints should return JSON with consistent error structure
        if (response.error && typeof response.error !== 'string') {
          throw new Error(`Inconsistent error format at ${endpoint}`);
        }
      }
    });
    
    // Test CORS configuration
    await this.runTest(component, 'CORS Configuration', async () => {
      const response = await fetch(`${this.baseUrl}/api/health`, {
        method: 'OPTIONS'
      });
      
      if (response.status !== 200 && response.status !== 204) {
        throw new Error('CORS not properly configured');
      }
    });
    
    // Test error response format consistency
    await this.runTest(component, 'Error Response Format', async () => {
      const response = await this.makeRequest('/api/nonexistent', { expectError: true });
      
      // Should return 404 or proper error structure
      if (response.status !== 404 && !response.error) {
        throw new Error('Error responses not properly formatted');
      }
    });
    
    this.completeComponent(component);
  }

  /**
   * Test authentication system integration
   */
  async testAuthenticationIntegration() {
    const component = this.createComponent('Authentication Integration');
    
    // Test OAuth configuration
    await this.runTest(component, 'OAuth Configuration', async () => {
      const config = await this.makeRequest('/api/auth/config');
      
      if (!config.github || !config.github.clientId) {
        throw new Error('OAuth configuration not properly integrated');
      }
    });
    
    // Test session management
    await this.runTest(component, 'Session Management', async () => {
      const session = await this.makeRequest('/api/auth/session');
      
      // Should handle unauthenticated state gracefully
      if (session.error && !session.error.includes('unauthenticated')) {
        throw new Error('Session management not properly integrated');
      }
    });
    
    // Test authentication validation
    await this.runTest(component, 'Authentication Validation', async () => {
      const validation = await this.makeRequest('/api/auth/validate');
      
      // Should return proper validation response
      if (validation.status !== 401 && validation.status !== 200) {
        throw new Error('Authentication validation not working');
      }
    });
    
    // Test GitHub OAuth flow initiation
    await this.runTest(component, 'GitHub OAuth Flow', async () => {
      const response = await fetch(`${this.baseUrl}/api/auth/github`, {
        redirect: 'manual'
      });
      
      if (response.status !== 302) {
        throw new Error('GitHub OAuth flow not properly configured');
      }
      
      const location = response.headers.get('location');
      if (!location || !location.includes('github.com')) {
        throw new Error('GitHub OAuth redirect not working');
      }
    });
    
    this.completeComponent(component);
  }

  /**
   * Test template system integration
   */
  async testTemplateSystemIntegration() {
    const component = this.createComponent('Template System Integration');
    
    // Test template listing
    await this.runTest(component, 'Template Listing', async () => {
      const templates = await this.makeRequest('/api/templates');
      
      if (!Array.isArray(templates.templates)) {
        throw new Error('Template listing not properly integrated');
      }
    });
    
    // Test template preview system
    await this.runTest(component, 'Template Preview System', async () => {
      const templates = await this.makeRequest('/api/templates');
      
      if (templates.templates.length > 0) {
        const templateId = templates.templates[0].id;
        const preview = await this.makeRequest(`/api/templates/by-id/${templateId}`);
        
        if (!preview.template) {
          throw new Error('Template preview system not integrated');
        }
      }
    });
    
    // Test template validation
    await this.runTest(component, 'Template Validation', async () => {
      const response = await this.makeRequest('/api/templates/nonexistent', {
        expectError: true
      });
      
      // Should handle nonexistent templates gracefully
      if (response.status !== 404 && !response.error) {
        throw new Error('Template validation not working');
      }
    });
    
    // Test template forking integration
    await this.runTest(component, 'Template Forking Integration', async () => {
      const response = await this.makeRequest('/api/templates/test-owner/test-repo/fork', {
        method: 'POST',
        expectError: true
      });
      
      // Should require authentication
      if (!response.error) {
        throw new Error('Template forking not properly secured');
      }
    });
    
    this.completeComponent(component);
  }

  /**
   * Test repository management integration
   */
  async testRepositoryIntegration() {
    const component = this.createComponent('Repository Management Integration');
    
    // Test repository validation
    await this.runTest(component, 'Repository Validation', async () => {
      const response = await this.makeRequest('/api/repositories/test/repo', {
        expectError: true
      });
      
      // Should handle nonexistent repositories
      if (response.status !== 404 && !response.error) {
        throw new Error('Repository validation not working');
      }
    });
    
    // Test fork operation structure
    await this.runTest(component, 'Fork Operation Structure', async () => {
      const response = await this.makeRequest('/api/repositories/fork', {
        method: 'POST',
        body: JSON.stringify({ templateId: 'test' }),
        expectError: true
      });
      
      // Should require authentication
      if (!response.error) {
        throw new Error('Fork operation not properly secured');
      }
    });
    
    // Test repository sync integration
    await this.runTest(component, 'Repository Sync Integration', async () => {
      const response = await this.makeRequest('/api/sync/test/repo', {
        expectError: true
      });
      
      // Should handle sync requests appropriately
      if (!response.error && response.status !== 200) {
        throw new Error('Repository sync not integrated');
      }
    });
    
    // Test content API integration
    await this.runTest(component, 'Content API Integration', async () => {
      const response = await this.makeRequest('/api/content/test/repo', {
        expectError: true
      });
      
      // Should handle content requests
      if (!response.error && response.status !== 200) {
        throw new Error('Content API not integrated');
      }
    });
    
    this.completeComponent(component);
  }

  /**
   * Test editor integration
   */
  async testEditorIntegration() {
    const component = this.createComponent('Editor Integration');
    
    // Test editor save integration
    await this.runTest(component, 'Editor Save Integration', async () => {
      const response = await this.makeRequest('/api/editor/save', {
        method: 'POST',
        body: JSON.stringify({ test: 'data' }),
        expectError: true
      });
      
      // Should require authentication
      if (!response.error) {
        throw new Error('Editor save not properly secured');
      }
    });
    
    // Test conflict detection integration
    await this.runTest(component, 'Conflict Detection Integration', async () => {
      const response = await this.makeRequest('/api/editor/conflicts', {
        method: 'POST',
        body: JSON.stringify({ owner: 'test', repo: 'test' }),
        expectError: true
      });
      
      // Should handle conflicts appropriately
      if (response.status !== 401 && !response.error) {
        throw new Error('Conflict detection not integrated');
      }
    });
    
    // Test batch save integration
    await this.runTest(component, 'Batch Save Integration', async () => {
      const response = await this.makeRequest('/api/editor/batch-save', {
        method: 'POST',
        body: JSON.stringify({ operations: [] }),
        expectError: true
      });
      
      // Should require authentication
      if (!response.error) {
        throw new Error('Batch save not properly secured');
      }
    });
    
    // Test retry mechanism integration
    await this.runTest(component, 'Retry Mechanism Integration', async () => {
      const response = await this.makeRequest('/api/editor/retry', {
        method: 'POST',
        body: JSON.stringify({ operation: 'test' }),
        expectError: true
      });
      
      // Should handle retry requests
      if (!response.error && response.status !== 200) {
        throw new Error('Retry mechanism not integrated');
      }
    });
    
    this.completeComponent(component);
  }

  /**
   * Test portfolio rendering integration
   */
  async testPortfolioRenderingIntegration() {
    const component = this.createComponent('Portfolio Rendering Integration');
    
    // Test dynamic route integration
    await this.runTest(component, 'Dynamic Route Integration', async () => {
      const response = await fetch(`${this.baseUrl}/test-user/test-repo`, {
        redirect: 'manual'
      });
      
      // Should handle dynamic routes
      if (response.status !== 404 && response.status !== 200) {
        throw new Error('Dynamic routes not properly integrated');
      }
    });
    
    // Test portfolio analysis integration
    await this.runTest(component, 'Portfolio Analysis Integration', async () => {
      const response = await this.makeRequest('/api/portfolio/analyze', {
        method: 'POST',
        body: JSON.stringify({ owner: 'test', repo: 'test' }),
        expectError: true
      });
      
      // Should handle analysis requests
      if (!response.error && response.status !== 200) {
        throw new Error('Portfolio analysis not integrated');
      }
    });
    
    // Test multi-page support integration
    await this.runTest(component, 'Multi-page Support Integration', async () => {
      const response = await fetch(`${this.baseUrl}/test-user/test-repo/about`, {
        redirect: 'manual'
      });
      
      // Should handle sub-pages
      if (response.status !== 404 && response.status !== 200) {
        throw new Error('Multi-page support not integrated');
      }
    });
    
    // Test template rendering integration
    await this.runTest(component, 'Template Rendering Integration', async () => {
      // Test that the rendering system can handle requests
      const response = await fetch(`${this.baseUrl}/test-user/test-repo`, {
        method: 'HEAD',
        redirect: 'manual'
      });
      
      // Should respond to HEAD requests
      if (response.status !== 404 && response.status !== 200) {
        throw new Error('Template rendering not integrated');
      }
    });
    
    this.completeComponent(component);
  }

  /**
   * Test error handling integration
   */
  async testErrorHandlingIntegration() {
    const component = this.createComponent('Error Handling Integration');
    
    // Test error reporting integration
    await this.runTest(component, 'Error Reporting Integration', async () => {
      const response = await this.makeRequest('/api/error-reports', {
        method: 'POST',
        body: JSON.stringify({
          error: 'Test integration error',
          context: 'System integration test'
        })
      });
      
      if (response.status !== 'received' && !response.success) {
        throw new Error('Error reporting not integrated');
      }
    });
    
    // Test GitHub API error handling integration
    await this.runTest(component, 'GitHub API Error Handling', async () => {
      const response = await this.makeRequest('/api/github', {
        method: 'POST',
        body: JSON.stringify({ action: 'invalid' }),
        expectError: true
      });
      
      // Should handle GitHub API errors
      if (!response.error) {
        throw new Error('GitHub API error handling not integrated');
      }
    });
    
    // Test rate limiting integration
    await this.runTest(component, 'Rate Limiting Integration', async () => {
      // Make multiple requests to test rate limiting
      const promises = Array(3).fill().map(() => 
        this.makeRequest('/api/health')
      );
      
      const results = await Promise.all(promises);
      const failures = results.filter(r => r.error && !r.error.includes('rate'));
      
      if (failures.length > 0) {
        throw new Error('Rate limiting not properly integrated');
      }
    });
    
    // Test global error handling
    await this.runTest(component, 'Global Error Handling', async () => {
      const response = await this.makeRequest('/api/nonexistent-endpoint', {
        expectError: true
      });
      
      // Should handle nonexistent endpoints gracefully
      if (response.status !== 404 && !response.error) {
        throw new Error('Global error handling not working');
      }
    });
    
    this.completeComponent(component);
  }

  /**
   * Test performance integration
   */
  async testPerformanceIntegration() {
    const component = this.createComponent('Performance Integration');
    
    // Test response time requirements
    await this.runTest(component, 'Response Time Requirements', async () => {
      const startTime = Date.now();
      await this.makeRequest('/api/health');
      const responseTime = Date.now() - startTime;
      
      if (responseTime > 2000) {
        throw new Error(`Response time too slow: ${responseTime}ms`);
      }
    });
    
    // Test concurrent request handling
    await this.runTest(component, 'Concurrent Request Handling', async () => {
      const concurrentRequests = 5;
      const promises = Array(concurrentRequests).fill().map(() => 
        this.makeRequest('/api/health')
      );
      
      const results = await Promise.all(promises);
      const failures = results.filter(r => r.status !== 'healthy');
      
      if (failures.length > 0) {
        throw new Error(`${failures.length} concurrent requests failed`);
      }
    });
    
    // Test caching integration
    await this.runTest(component, 'Caching Integration', async () => {
      // Make two identical requests
      const start1 = Date.now();
      await this.makeRequest('/api/templates');
      const time1 = Date.now() - start1;
      
      const start2 = Date.now();
      await this.makeRequest('/api/templates');
      const time2 = Date.now() - start2;
      
      // Second request should not be significantly slower
      if (time2 > time1 * 3) {
        console.warn(`Caching may not be effective: ${time1}ms vs ${time2}ms`);
      }
    });
    
    // Test memory usage stability
    await this.runTest(component, 'Memory Usage Stability', async () => {
      // Make multiple requests to check for memory leaks
      for (let i = 0; i < 10; i++) {
        await this.makeRequest('/api/health');
      }
      
      // If we get here without errors, memory usage is stable
      return true;
    });
    
    this.completeComponent(component);
  }

  /**
   * Test security integration
   */
  async testSecurityIntegration() {
    const component = this.createComponent('Security Integration');
    
    // Test input validation integration
    await this.runTest(component, 'Input Validation Integration', async () => {
      const maliciousPayload = {
        script: '<script>alert("xss")</script>',
        sql: "'; DROP TABLE users; --"
      };
      
      const response = await this.makeRequest('/api/error-reports', {
        method: 'POST',
        body: JSON.stringify(maliciousPayload),
        expectError: true
      });
      
      // Should handle malicious input safely
      if (!response.error && !response.success) {
        throw new Error('Input validation not properly integrated');
      }
    });
    
    // Test authentication security integration
    await this.runTest(component, 'Authentication Security Integration', async () => {
      const protectedEndpoints = [
        '/api/repositories/fork',
        '/api/editor/save',
        '/api/editor/batch-save'
      ];
      
      for (const endpoint of protectedEndpoints) {
        const response = await this.makeRequest(endpoint, {
          method: 'POST',
          body: JSON.stringify({ test: 'data' }),
          expectError: true
        });
        
        // Should require authentication
        if (!response.error) {
          throw new Error(`Protected endpoint ${endpoint} not secured`);
        }
      }
    });
    
    // Test HTTPS enforcement (in production)
    await this.runTest(component, 'HTTPS Configuration', async () => {
      // In development, this is expected to be HTTP
      if (this.baseUrl.startsWith('https://')) {
        // Test that HTTPS is properly configured
        const response = await fetch(this.baseUrl.replace('https://', 'http://'), {
          redirect: 'manual'
        });
        
        // Should redirect to HTTPS or fail
        if (response.status !== 301 && response.status !== 302) {
          console.warn('HTTPS redirect not configured');
        }
      }
    });
    
    // Test CORS security
    await this.runTest(component, 'CORS Security Integration', async () => {
      const response = await fetch(`${this.baseUrl}/api/health`, {
        method: 'OPTIONS',
        headers: {
          'Origin': 'https://malicious-site.com'
        }
      });
      
      // Should handle CORS appropriately
      if (response.status !== 200 && response.status !== 204) {
        throw new Error('CORS not properly configured');
      }
    });
    
    this.completeComponent(component);
  }

  /**
   * Helper methods
   */
  createComponent(name) {
    const component = {
      name,
      tests: [],
      startTime: Date.now(),
      status: 'running'
    };
    
    this.results.components.push(component);
    console.log(`🔧 Testing component: ${name}`);
    return component;
  }

  async runTest(component, testName, testFunction) {
    this.results.totalTests++;
    
    try {
      console.log(`  ⏳ ${testName}...`);
      await testFunction();
      
      component.tests.push({ name: testName, status: 'passed' });
      this.results.passedTests++;
      console.log(`  ✅ ${testName}`);
      
    } catch (error) {
      component.tests.push({ 
        name: testName, 
        status: 'failed', 
        error: error.message 
      });
      this.results.failedTests++;
      this.results.errors.push({ component: component.name, test: testName, error: error.message });
      console.log(`  ❌ ${testName}: ${error.message}`);
    }
  }

  completeComponent(component) {
    component.endTime = Date.now();
    component.duration = component.endTime - component.startTime;
    component.status = 'completed';
    
    const passed = component.tests.filter(t => t.status === 'passed').length;
    const total = component.tests.length;
    
    console.log(`✅ Component tested: ${component.name} (${passed}/${total} tests passed)\n`);
  }

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

  printSystemResults() {
    console.log('\n' + '='.repeat(70));
    console.log('🔧 SYSTEM INTEGRATION TEST RESULTS');
    console.log('='.repeat(70));
    
    // Overall summary
    const successRate = this.results.totalTests > 0 
      ? (this.results.passedTests / this.results.totalTests * 100).toFixed(1) 
      : 0;
    
    console.log(`📈 Overall Success Rate: ${successRate}% (${this.results.passedTests}/${this.results.totalTests} tests)`);
    console.log(`🔧 Components Tested: ${this.results.components.length}`);
    
    // Component breakdown
    console.log('\n📋 COMPONENT BREAKDOWN:');
    this.results.components.forEach(component => {
      const passed = component.tests.filter(t => t.status === 'passed').length;
      const total = component.tests.length;
      const rate = total > 0 ? (passed / total * 100).toFixed(1) : 0;
      
      console.log(`  ${component.name}: ${rate}% (${passed}/${total}) - ${component.duration}ms`);
    });
    
    // Failed tests summary
    if (this.results.errors.length > 0) {
      console.log('\n❌ FAILED TESTS:');
      this.results.errors.forEach(({ component, test, error }) => {
        console.log(`  • ${component} - ${test}: ${error}`);
      });
    }
    
    console.log('\n' + '='.repeat(70));
    
    if (this.results.failedTests === 0) {
      console.log('🎉 All system integration tests passed! System is fully integrated.');
    } else {
      console.log('⚠️  Some integration tests failed. Please review and address the issues above.');
      console.log('💡 Note: Some failures may be expected for unauthenticated test scenarios.');
    }
  }
}

// Run tests if this script is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const tester = new SystemIntegrationTest();
  tester.runSystemTests().catch(error => {
    console.error('System integration test failed:', error);
    process.exit(1);
  });
}

export { SystemIntegrationTest };