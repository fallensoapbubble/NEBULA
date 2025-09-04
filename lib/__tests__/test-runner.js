/**
 * Comprehensive Test Runner
 * Organizes and runs different types of tests with reporting
 */
import { execSync } from 'child_process';
import { writeFileSync, readFileSync } from 'fs';
import { join } from 'path';

class TestRunner {
  constructor() {
    this.results = {
      unit: { passed: 0, failed: 0, duration: 0 },
      integration: { passed: 0, failed: 0, duration: 0 },
      e2e: { passed: 0, failed: 0, duration: 0 },
      performance: { passed: 0, failed: 0, duration: 0 },
      total: { passed: 0, failed: 0, duration: 0 }
    };
  }

  async runUnitTests() {
    console.log('🧪 Running Unit Tests...');
    
    const unitTestFiles = [
      'lib/__tests__/repository-service-unit.test.js',
      'lib/__tests__/template-service-unit.test.js',
      'lib/__tests__/github-auth.test.js',
      'lib/__tests__/auth-config.test.js',
      'lib/__tests__/errors.test.js',
      'lib/__tests__/network-manager.test.js',
      'lib/__tests__/rate-limit-manager.test.js'
    ];

    return this.runTestSuite('unit', unitTestFiles);
  }

  async runIntegrationTests() {
    console.log('🔗 Running Integration Tests...');
    
    const integrationTestFiles = [
      'lib/__tests__/api-integration.test.js',
      'lib/__tests__/github-oauth-integration.test.js',
      'lib/__tests__/portfolio-analyzer-integration.test.js',
      'lib/__tests__/content-persistence-integration.test.js',
      'lib/__tests__/dynamic-route-integration.test.js'
    ];

    return this.runTestSuite('integration', integrationTestFiles);
  }

  async runE2ETests() {
    console.log('🎯 Running End-to-End Tests...');
    
    const e2eTestFiles = [
      'lib/__tests__/e2e-workflow.test.js'
    ];

    return this.runTestSuite('e2e', e2eTestFiles);
  }

  async runPerformanceTests() {
    console.log('⚡ Running Performance Tests...');
    
    const performanceTestFiles = [
      'lib/__tests__/isr-performance.test.js',
      'lib/__tests__/performance-optimizer.test.js',
      'lib/__tests__/portfolio-performance-service.test.js'
    ];

    return this.runTestSuite('performance', performanceTestFiles);
  }

  async runTestSuite(suiteName, testFiles) {
    const startTime = Date.now();
    
    try {
      // Filter to only existing test files
      const existingFiles = testFiles.filter(file => {
        try {
          readFileSync(file);
          return true;
        } catch {
          return false;
        }
      });

      if (existingFiles.length === 0) {
        console.log(`⚠️  No ${suiteName} test files found`);
        return { passed: 0, failed: 0, duration: 0 };
      }

      const command = `npm run test:run -- ${existingFiles.join(' ')}`;
      const output = execSync(command, { 
        encoding: 'utf8',
        stdio: 'pipe',
        timeout: 300000 // 5 minutes timeout
      });

      const duration = Date.now() - startTime;
      const results = this.parseTestOutput(output);
      
      this.results[suiteName] = { ...results, duration };
      
      console.log(`✅ ${suiteName} tests completed: ${results.passed} passed, ${results.failed} failed`);
      
      return this.results[suiteName];
    } catch (error) {
      const duration = Date.now() - startTime;
      const results = this.parseTestOutput(error.stdout || error.message);
      
      this.results[suiteName] = { ...results, duration };
      
      console.log(`❌ ${suiteName} tests failed: ${results.passed} passed, ${results.failed} failed`);
      console.log(`Error: ${error.message}`);
      
      return this.results[suiteName];
    }
  }

  parseTestOutput(output) {
    // Parse vitest output to extract test results
    const passedMatch = output.match(/(\d+) passed/);
    const failedMatch = output.match(/(\d+) failed/);
    
    return {
      passed: passedMatch ? parseInt(passedMatch[1]) : 0,
      failed: failedMatch ? parseInt(failedMatch[1]) : 0
    };
  }

  async runAllTests() {
    console.log('🚀 Starting Comprehensive Test Suite...\n');
    
    const startTime = Date.now();
    
    // Run all test suites
    await this.runUnitTests();
    await this.runIntegrationTests();
    await this.runE2ETests();
    await this.runPerformanceTests();
    
    // Calculate totals
    this.results.total = {
      passed: Object.values(this.results).reduce((sum, result) => sum + (result.passed || 0), 0) - this.results.total.passed,
      failed: Object.values(this.results).reduce((sum, result) => sum + (result.failed || 0), 0) - this.results.total.failed,
      duration: Date.now() - startTime
    };
    
    this.generateReport();
    
    return this.results;
  }

  generateReport() {
    console.log('\n📊 Test Results Summary');
    console.log('========================');
    
    const categories = ['unit', 'integration', 'e2e', 'performance'];
    
    categories.forEach(category => {
      const result = this.results[category];
      const total = result.passed + result.failed;
      const successRate = total > 0 ? ((result.passed / total) * 100).toFixed(1) : '0.0';
      const duration = (result.duration / 1000).toFixed(2);
      
      console.log(`${category.toUpperCase().padEnd(12)} | ${result.passed.toString().padStart(3)} passed | ${result.failed.toString().padStart(3)} failed | ${successRate.padStart(5)}% | ${duration.padStart(6)}s`);
    });
    
    console.log('------------------------');
    
    const totalTests = this.results.total.passed + this.results.total.failed;
    const overallSuccessRate = totalTests > 0 ? ((this.results.total.passed / totalTests) * 100).toFixed(1) : '0.0';
    const totalDuration = (this.results.total.duration / 1000).toFixed(2);
    
    console.log(`TOTAL        | ${this.results.total.passed.toString().padStart(3)} passed | ${this.results.total.failed.toString().padStart(3)} failed | ${overallSuccessRate.padStart(5)}% | ${totalDuration.padStart(6)}s`);
    
    // Generate detailed report file
    const reportData = {
      timestamp: new Date().toISOString(),
      results: this.results,
      summary: {
        totalTests,
        successRate: overallSuccessRate,
        duration: totalDuration
      }
    };
    
    writeFileSync(
      join(process.cwd(), 'test-results.json'),
      JSON.stringify(reportData, null, 2)
    );
    
    console.log('\n📄 Detailed report saved to test-results.json');
    
    // Exit with appropriate code
    if (this.results.total.failed > 0) {
      console.log('\n❌ Some tests failed. Please review the results above.');
      process.exit(1);
    } else {
      console.log('\n✅ All tests passed successfully!');
      process.exit(0);
    }
  }

  async runSpecificCategory(category) {
    console.log(`🎯 Running ${category} tests only...\n`);
    
    switch (category.toLowerCase()) {
      case 'unit':
        await this.runUnitTests();
        break;
      case 'integration':
        await this.runIntegrationTests();
        break;
      case 'e2e':
        await this.runE2ETests();
        break;
      case 'performance':
        await this.runPerformanceTests();
        break;
      default:
        console.log(`❌ Unknown test category: ${category}`);
        console.log('Available categories: unit, integration, e2e, performance');
        process.exit(1);
    }
    
    this.generateReport();
  }
}

// CLI interface
if (import.meta.url === `file://${process.argv[1]}`) {
  const runner = new TestRunner();
  const category = process.argv[2];
  
  if (category) {
    runner.runSpecificCategory(category);
  } else {
    runner.runAllTests();
  }
}

export { TestRunner };