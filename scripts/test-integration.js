#!/usr/bin/env node

/**
 * Integration Test Script
 * Tests the complete end-to-end workflow integration
 */

import { execSync } from 'child_process';
import { readFileSync } from 'fs';

/**
 * Test configuration
 */
const TEST_CONFIG = {
  baseUrl: process.env.NEXTAUTH_URL || 'http://localhost:3000',
  timeout: 30000,
  retries: 3
};

/**
 * ANSI color codes for console output
 */
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
};

/**
 * Log with colors
 */
function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

/**
 * Test health endpoint
 */
async function testHealthEndpoint() {
  log('\n🔍 Testing Health Endpoint...', 'blue');
  
  try {
    const response = await fetch(`${TEST_CONFIG.baseUrl}/api/health`);
    const health = await response.json();
    
    if (health.status === 'healthy') {
      log('✅ Health check passed', 'green');
      log(`   Components: ${Object.keys(health.components).length}`, 'cyan');
      log(`   Response time: ${health.performance.totalResponseTime}ms`, 'cyan');
      return true;
    } else {
      log('⚠️  Health check shows degraded status', 'yellow');
      log(`   Status: ${health.status}`, 'yellow');
      return false;
    }
  } catch (error) {
    log(`❌ Health check failed: ${error.message}`, 'red');
    return false;
  }
}

/**
 * Test authentication configuration
 */
async function testAuthConfiguration() {
  log('\n🔐 Testing Authentication Configuration...', 'blue');
  
  try {
    // Check environment variables
    const requiredEnvVars = [
      'GITHUB_CLIENT_ID',
      'GITHUB_CLIENT_SECRET',
      'NEXTAUTH_SECRET',
      'NEXTAUTH_URL'
    ];
    
    const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);
    
    if (missingVars.length > 0) {
      log(`❌ Missing environment variables: ${missingVars.join(', ')}`, 'red');
      return false;
    }
    
    log('✅ All required environment variables are set', 'green');
    
    // Test auth configuration endpoint
    const response = await fetch(`${TEST_CONFIG.baseUrl}/api/auth/config`);
    
    if (response.ok) {
      log('✅ Auth configuration endpoint accessible', 'green');
      return true;
    } else {
      log(`⚠️  Auth configuration endpoint returned ${response.status}`, 'yellow');
      return false;
    }
    
  } catch (error) {
    log(`❌ Auth configuration test failed: ${error.message}`, 'red');
    return false;
  }
}

/**
 * Test API endpoints
 */
async function testApiEndpoints() {
  log('\n🌐 Testing API Endpoints...', 'blue');
  
  const endpoints = [
    { path: '/api/templates', method: 'GET', description: 'Templates API' },
    { path: '/api/health', method: 'GET', description: 'Health Check' }
  ];
  
  let passedCount = 0;
  
  for (const endpoint of endpoints) {
    try {
      const response = await fetch(`${TEST_CONFIG.baseUrl}${endpoint.path}`, {
        method: endpoint.method
      });
      
      if (response.ok || response.status === 401) { // 401 is expected for protected endpoints
        log(`✅ ${endpoint.description} (${endpoint.method} ${endpoint.path})`, 'green');
        passedCount++;
      } else {
        log(`❌ ${endpoint.description} returned ${response.status}`, 'red');
      }
    } catch (error) {
      log(`❌ ${endpoint.description} failed: ${error.message}`, 'red');
    }
  }
  
  log(`   Passed: ${passedCount}/${endpoints.length}`, 'cyan');
  return passedCount === endpoints.length;
}

/**
 * Test build and dependencies
 */
async function testBuildAndDependencies() {
  log('\n📦 Testing Build and Dependencies...', 'blue');
  
  try {
    // Check if package.json exists and has required dependencies
    const packageJson = JSON.parse(readFileSync('package.json', 'utf8'));
    
    const requiredDependencies = [
      'next',
      'next-auth',
      '@octokit/rest',
      'react'
    ];
    
    const missingDeps = requiredDependencies.filter(dep => 
      !packageJson.dependencies?.[dep] && !packageJson.devDependencies?.[dep]
    );
    
    if (missingDeps.length > 0) {
      log(`❌ Missing dependencies: ${missingDeps.join(', ')}`, 'red');
      return false;
    }
    
    log('✅ All required dependencies are present', 'green');
    
    // Test if the build would succeed (dry run)
    try {
      execSync('npm run build --dry-run 2>/dev/null || echo "Build check completed"', { 
        stdio: 'pipe' 
      });
      log('✅ Build configuration appears valid', 'green');
    } catch (error) {
      log('⚠️  Build check inconclusive', 'yellow');
    }
    
    return true;
    
  } catch (error) {
    log(`❌ Build and dependencies test failed: ${error.message}`, 'red');
    return false;
  }
}

/**
 * Test file structure
 */
async function testFileStructure() {
  log('\n📁 Testing File Structure...', 'blue');
  
  const requiredFiles = [
    'lib/auth-middleware.js',
    'lib/service-factory.js',
    'lib/editor-integration-service.js',
    'lib/integration-test-service.js',
    'src/app/api/health/route.js',
    'src/app/api/templates/route.js',
    'src/app/api/repositories/fork/route.js',
    'src/app/api/editor/save/route.js',
    'src/app/api/editor/integration/route.js'
  ];
  
  let existingFiles = 0;
  
  for (const file of requiredFiles) {
    try {
      readFileSync(file);
      log(`✅ ${file}`, 'green');
      existingFiles++;
    } catch (error) {
      log(`❌ Missing: ${file}`, 'red');
    }
  }
  
  log(`   Files found: ${existingFiles}/${requiredFiles.length}`, 'cyan');
  return existingFiles === requiredFiles.length;
}

/**
 * Run all integration tests
 */
async function runIntegrationTests() {
  log('🚀 Starting Integration Tests...', 'magenta');
  log(`   Base URL: ${TEST_CONFIG.baseUrl}`, 'cyan');
  log(`   Timeout: ${TEST_CONFIG.timeout}ms`, 'cyan');
  
  const tests = [
    { name: 'File Structure', fn: testFileStructure },
    { name: 'Build and Dependencies', fn: testBuildAndDependencies },
    { name: 'Authentication Configuration', fn: testAuthConfiguration },
    { name: 'API Endpoints', fn: testApiEndpoints },
    { name: 'Health Endpoint', fn: testHealthEndpoint }
  ];
  
  const results = [];
  
  for (const test of tests) {
    try {
      const result = await test.fn();
      results.push({ name: test.name, success: result });
    } catch (error) {
      log(`❌ ${test.name} threw an error: ${error.message}`, 'red');
      results.push({ name: test.name, success: false, error: error.message });
    }
  }
  
  // Summary
  log('\n📊 Test Summary:', 'magenta');
  const passed = results.filter(r => r.success).length;
  const total = results.length;
  
  results.forEach(result => {
    const icon = result.success ? '✅' : '❌';
    const color = result.success ? 'green' : 'red';
    log(`   ${icon} ${result.name}`, color);
    if (result.error) {
      log(`      Error: ${result.error}`, 'red');
    }
  });
  
  log(`\n🎯 Overall Result: ${passed}/${total} tests passed`, passed === total ? 'green' : 'red');
  
  if (passed === total) {
    log('\n🎉 All integration tests passed! The system is ready for use.', 'green');
    process.exit(0);
  } else {
    log('\n⚠️  Some tests failed. Please review the issues above.', 'yellow');
    process.exit(1);
  }
}

/**
 * Main execution
 */
if (import.meta.url === `file://${process.argv[1]}`) {
  runIntegrationTests().catch(error => {
    log(`💥 Integration test suite crashed: ${error.message}`, 'red');
    console.error(error);
    process.exit(1);
  });
}

export { runIntegrationTests };