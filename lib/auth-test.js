/**
 * Authentication System Integration Test
 * Tests the complete authentication flow
 */

import { validateGitHubToken, getUserSession, isSessionValid, hasRequiredPermissions } from './github-auth.js';

/**
 * Test authentication utilities
 */
export async function testAuthSystem() {
  const results = {
    tests: [],
    passed: 0,
    failed: 0,
    errors: []
  };
  
  // Test 1: Token validation with invalid token
  try {
    const result = await validateGitHubToken('invalid-token');
    results.tests.push({
      name: 'Invalid token validation',
      passed: !result.valid && result.error,
      details: result
    });
    if (!result.valid && result.error) results.passed++;
    else results.failed++;
  } catch (error) {
    results.tests.push({
      name: 'Invalid token validation',
      passed: false,
      error: error.message
    });
    results.failed++;
    results.errors.push(error.message);
  }
  
  // Test 2: Token validation with no token
  try {
    const result = await validateGitHubToken(null);
    results.tests.push({
      name: 'Null token validation',
      passed: !result.valid && result.error === 'No access token provided',
      details: result
    });
    if (!result.valid && result.error === 'No access token provided') results.passed++;
    else results.failed++;
  } catch (error) {
    results.tests.push({
      name: 'Null token validation',
      passed: false,
      error: error.message
    });
    results.failed++;
    results.errors.push(error.message);
  }
  
  // Test 3: Session validation with empty session
  try {
    const isValid = isSessionValid(null);
    results.tests.push({
      name: 'Empty session validation',
      passed: !isValid,
      details: { isValid }
    });
    if (!isValid) results.passed++;
    else results.failed++;
  } catch (error) {
    results.tests.push({
      name: 'Empty session validation',
      passed: false,
      error: error.message
    });
    results.failed++;
    results.errors.push(error.message);
  }
  
  // Test 4: Session validation with expired session
  try {
    const expiredSession = {
      accessToken: 'test-token',
      tokenExpiry: new Date(Date.now() - 1000 * 60 * 60) // 1 hour ago
    };
    const isValid = isSessionValid(expiredSession);
    results.tests.push({
      name: 'Expired session validation',
      passed: !isValid,
      details: { isValid, session: expiredSession }
    });
    if (!isValid) results.passed++;
    else results.failed++;
  } catch (error) {
    results.tests.push({
      name: 'Expired session validation',
      passed: false,
      error: error.message
    });
    results.failed++;
    results.errors.push(error.message);
  }
  
  // Test 5: Permission checking
  try {
    const sessionWithPermissions = {
      permissions: ['public_repo', 'user']
    };
    const hasPublicRepo = hasRequiredPermissions(sessionWithPermissions, ['public_repo']);
    const hasRepo = hasRequiredPermissions(sessionWithPermissions, ['repo']);
    const hasMultiple = hasRequiredPermissions(sessionWithPermissions, ['public_repo', 'user']);
    
    results.tests.push({
      name: 'Permission checking',
      passed: hasPublicRepo && !hasRepo && hasMultiple,
      details: { hasPublicRepo, hasRepo, hasMultiple, permissions: sessionWithPermissions.permissions }
    });
    if (hasPublicRepo && !hasRepo && hasMultiple) results.passed++;
    else results.failed++;
  } catch (error) {
    results.tests.push({
      name: 'Permission checking',
      passed: false,
      error: error.message
    });
    results.failed++;
    results.errors.push(error.message);
  }
  
  // Test 6: Mock request session parsing
  try {
    const mockRequest = {
      cookies: {
        get: (name) => {
          const mockCookies = {
            'github_session_id': { value: 'test-id' },
            'github_username': { value: 'testuser' },
            'github_access_token': { value: 'test-token' },
            'github_permissions': { value: 'public_repo,user' },
            'github_user_data': { value: JSON.stringify({ login: 'testuser', id: 123 }) }
          };
          return mockCookies[name];
        }
      }
    };
    
    const session = getUserSession(mockRequest);
    results.tests.push({
      name: 'Session parsing from cookies',
      passed: session && session.username === 'testuser' && session.permissions.includes('public_repo'),
      details: session
    });
    if (session && session.username === 'testuser' && session.permissions.includes('public_repo')) results.passed++;
    else results.failed++;
  } catch (error) {
    results.tests.push({
      name: 'Session parsing from cookies',
      passed: false,
      error: error.message
    });
    results.failed++;
    results.errors.push(error.message);
  }
  
  return results;
}

/**
 * Run tests and log results
 */
export async function runAuthTests() {
  console.log('🧪 Running Authentication System Tests...\n');
  
  const results = await testAuthSystem();
  
  console.log('📊 Test Results:');
  console.log(`✅ Passed: ${results.passed}`);
  console.log(`❌ Failed: ${results.failed}`);
  console.log(`📈 Success Rate: ${((results.passed / (results.passed + results.failed)) * 100).toFixed(1)}%\n`);
  
  if (results.errors.length > 0) {
    console.log('🚨 Errors:');
    results.errors.forEach(error => console.log(`  - ${error}`));
    console.log('');
  }
  
  console.log('📋 Detailed Results:');
  results.tests.forEach((test, index) => {
    const status = test.passed ? '✅' : '❌';
    console.log(`  ${index + 1}. ${status} ${test.name}`);
    if (test.error) {
      console.log(`     Error: ${test.error}`);
    }
    if (test.details && process.env.NODE_ENV === 'development') {
      console.log(`     Details:`, test.details);
    }
  });
  
  return results;
}

// Export for use in other test files
const authTestUtils = { testAuthSystem, runAuthTests };
export default authTestUtils;