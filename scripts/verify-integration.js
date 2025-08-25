#!/usr/bin/env node

/**
 * Simple Integration Verification Script
 * Verifies that all integration components are properly wired together
 */

import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

// ANSI colors
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function checkFileExists(filePath) {
  return existsSync(filePath);
}

function checkFileContains(filePath, searchString) {
  try {
    const content = readFileSync(filePath, 'utf8');
    return content.includes(searchString);
  } catch (error) {
    return false;
  }
}

async function verifyIntegration() {
  log('🔍 Verifying Integration Components...', 'blue');
  
  const checks = [
    {
      name: 'Authentication Middleware',
      test: () => checkFileExists('lib/auth-middleware.js'),
      description: 'Auth middleware file exists'
    },
    {
      name: 'Service Factory',
      test: () => checkFileExists('lib/service-factory.js'),
      description: 'Service factory file exists'
    },
    {
      name: 'Editor Integration Service',
      test: () => checkFileExists('lib/editor-integration-service.js'),
      description: 'Editor integration service exists'
    },
    {
      name: 'Integration Test Service',
      test: () => checkFileExists('lib/integration-test-service.js'),
      description: 'Integration test service exists'
    },
    {
      name: 'Templates API Integration',
      test: () => checkFileContains('src/app/api/templates/route.js', 'templateAuthMiddleware'),
      description: 'Templates API uses auth middleware'
    },
    {
      name: 'Fork API Integration',
      test: () => checkFileContains('src/app/api/repositories/fork/route.js', 'repositoryAuthMiddleware'),
      description: 'Fork API uses auth middleware'
    },
    {
      name: 'Editor Save API Integration',
      test: () => checkFileContains('src/app/api/editor/save/route.js', 'editorAuthMiddleware'),
      description: 'Editor save API uses auth middleware'
    },
    {
      name: 'Health Check API',
      test: () => checkFileExists('src/app/api/health/route.js'),
      description: 'Health check API exists'
    },
    {
      name: 'Editor Integration API',
      test: () => checkFileExists('src/app/api/editor/integration/route.js'),
      description: 'Editor integration API exists'
    },
    {
      name: 'Integration Test API',
      test: () => checkFileExists('src/app/api/integration/test/route.js'),
      description: 'Integration test API exists'
    },
    {
      name: 'Editor Integration Hook',
      test: () => checkFileExists('lib/hooks/use-editor-integration.js'),
      description: 'Editor integration React hook exists'
    },
    {
      name: 'Editor Page Integration',
      test: () => checkFileContains('src/app/editor/[owner]/[repo]/page.js', 'useEditorIntegration'),
      description: 'Editor page uses integration hook'
    }
  ];

  let passed = 0;
  let failed = 0;

  log('\n📋 Running Integration Checks:', 'magenta');

  for (const check of checks) {
    try {
      const result = check.test();
      if (result) {
        log(`✅ ${check.name}`, 'green');
        log(`   ${check.description}`, 'cyan');
        passed++;
      } else {
        log(`❌ ${check.name}`, 'red');
        log(`   ${check.description}`, 'yellow');
        failed++;
      }
    } catch (error) {
      log(`❌ ${check.name} (Error: ${error.message})`, 'red');
      failed++;
    }
  }

  // Summary
  log('\n📊 Integration Verification Summary:', 'magenta');
  log(`   ✅ Passed: ${passed}`, 'green');
  log(`   ❌ Failed: ${failed}`, failed > 0 ? 'red' : 'green');
  log(`   📈 Success Rate: ${Math.round((passed / (passed + failed)) * 100)}%`, 'cyan');

  // Additional checks
  log('\n🔧 Additional Integration Checks:', 'blue');

  // Check package.json for integration test script
  try {
    const packageJson = JSON.parse(readFileSync('package.json', 'utf8'));
    if (packageJson.scripts?.['test:integration']) {
      log('✅ Integration test script configured in package.json', 'green');
    } else {
      log('⚠️  Integration test script not found in package.json', 'yellow');
    }
  } catch (error) {
    log('❌ Could not read package.json', 'red');
  }

  // Check for required dependencies
  const requiredDeps = ['next-auth', '@octokit/rest', 'next'];
  try {
    const packageJson = JSON.parse(readFileSync('package.json', 'utf8'));
    const allDeps = { ...packageJson.dependencies, ...packageJson.devDependencies };
    
    let depsOk = true;
    for (const dep of requiredDeps) {
      if (allDeps[dep]) {
        log(`✅ Dependency ${dep} found (${allDeps[dep]})`, 'green');
      } else {
        log(`❌ Missing dependency: ${dep}`, 'red');
        depsOk = false;
      }
    }
    
    if (depsOk) {
      log('✅ All required dependencies are present', 'green');
    }
  } catch (error) {
    log('❌ Could not verify dependencies', 'red');
  }

  // Final result
  log('\n🎯 Integration Verification Result:', 'magenta');
  
  if (failed === 0) {
    log('🎉 All integration components are properly wired together!', 'green');
    log('   The system is ready for end-to-end testing.', 'green');
    return true;
  } else {
    log(`⚠️  ${failed} integration issue(s) found.`, 'yellow');
    log('   Please review and fix the issues above.', 'yellow');
    return false;
  }
}

// Run verification
verifyIntegration()
  .then(success => {
    process.exit(success ? 0 : 1);
  })
  .catch(error => {
    log(`💥 Verification failed: ${error.message}`, 'red');
    console.error(error);
    process.exit(1);
  });