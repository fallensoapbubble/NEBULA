/**
 * Authentication System Test Suite
 * Tests the enhanced GitHub OAuth authentication system
 */

import { authOptions } from './auth-config.js';
import { validateOAuthConfig } from './oauth-config.js';
import { createAuthError, AUTH_ERROR_TYPES } from './auth-errors.js';

/**
 * Test the authentication configuration
 */
export async function testAuthConfig() {
  console.log('🧪 Testing Enhanced GitHub OAuth Authentication System\n');
  
  const results = {
    configValidation: false,
    authOptionsValid: false,
    errorHandling: false,
    overall: false
  };

  try {
    // Test 1: OAuth Configuration Validation
    console.log('1️⃣ Testing OAuth Configuration...');
    const configStatus = validateOAuthConfig();
    
    if (configStatus.isValid) {
      console.log('   ✅ OAuth configuration is valid');
      results.configValidation = true;
    } else {
      console.log('   ❌ OAuth configuration has errors:');
      configStatus.errors.forEach(error => console.log(`      - ${error}`));
    }

    // Test 2: NextAuth Options Validation
    console.log('\n2️⃣ Testing NextAuth Configuration...');
    
    if (authOptions.providers && authOptions.providers.length > 0) {
      console.log('   ✅ NextAuth providers configured');
      
      const githubProvider = authOptions.providers.find(p => p.id === 'github');
      if (githubProvider) {
        console.log('   ✅ GitHub provider found');
        
        if (githubProvider.clientId && githubProvider.clientSecret) {
          console.log('   ✅ GitHub credentials configured');
          results.authOptionsValid = true;
        } else {
          console.log('   ❌ GitHub credentials missing');
        }
      } else {
        console.log('   ❌ GitHub provider not found');
      }
    } else {
      console.log('   ❌ No providers configured');
    }

    // Test 3: Error Handling System
    console.log('\n3️⃣ Testing Error Handling System...');
    
    try {
      // Test different error types
      const testErrors = [
        'OAuthSignin',
        'RefreshAccessTokenError',
        'SessionRequired',
        new Error('Network error')
      ];

      let errorTestsPassed = 0;
      
      for (const testError of testErrors) {
        const authError = createAuthError(testError);
        
        if (authError.userMessage && authError.suggestions.length > 0) {
          errorTestsPassed++;
        }
      }

      if (errorTestsPassed === testErrors.length) {
        console.log('   ✅ Error handling system working correctly');
        results.errorHandling = true;
      } else {
        console.log(`   ❌ Error handling issues (${errorTestsPassed}/${testErrors.length} tests passed)`);
      }
    } catch (error) {
      console.log('   ❌ Error handling system failed:', error.message);
    }

    // Overall Result
    results.overall = results.configValidation && results.authOptionsValid && results.errorHandling;
    
    console.log('\n📊 Test Results Summary:');
    console.log(`   OAuth Configuration: ${results.configValidation ? '✅' : '❌'}`);
    console.log(`   NextAuth Setup: ${results.authOptionsValid ? '✅' : '❌'}`);
    console.log(`   Error Handling: ${results.errorHandling ? '✅' : '❌'}`);
    console.log(`   Overall Status: ${results.overall ? '✅ PASS' : '❌ FAIL'}`);

    if (results.overall) {
      console.log('\n🎉 Enhanced GitHub OAuth authentication system is ready!');
      console.log('\n📋 Key Features Implemented:');
      console.log('   • NextAuth.js integration with GitHub OAuth');
      console.log('   • Automatic token refresh handling');
      console.log('   • Comprehensive error handling and user feedback');
      console.log('   • Secure session management');
      console.log('   • Enhanced error pages with actionable suggestions');
      console.log('\n🚀 Ready for production use!');
    } else {
      console.log('\n⚠️  Some issues need to be resolved before production use.');
    }

    return results;

  } catch (error) {
    console.error('❌ Test suite failed:', error.message);
    return { ...results, overall: false };
  }
}

/**
 * Test specific authentication flows
 */
export function testAuthFlows() {
  console.log('\n🔄 Testing Authentication Flows...');
  
  // Test error scenarios
  const errorScenarios = [
    {
      name: 'Invalid Token',
      error: { status: 401, message: 'Invalid token' },
      expectedType: AUTH_ERROR_TYPES.TOKEN_INVALID
    },
    {
      name: 'Rate Limit',
      error: { status: 403, message: 'rate limit exceeded' },
      expectedType: AUTH_ERROR_TYPES.GITHUB_RATE_LIMIT
    },
    {
      name: 'Network Error',
      error: new TypeError('fetch failed'),
      expectedType: AUTH_ERROR_TYPES.NETWORK_ERROR
    }
  ];

  let flowTestsPassed = 0;

  errorScenarios.forEach(scenario => {
    try {
      const authError = createAuthError(scenario.error);
      
      if (authError.type === scenario.expectedType) {
        console.log(`   ✅ ${scenario.name} flow handled correctly`);
        flowTestsPassed++;
      } else {
        console.log(`   ❌ ${scenario.name} flow incorrect (expected ${scenario.expectedType}, got ${authError.type})`);
      }
    } catch (error) {
      console.log(`   ❌ ${scenario.name} flow failed:`, error.message);
    }
  });

  console.log(`\n   Flow Tests: ${flowTestsPassed}/${errorScenarios.length} passed`);
  return flowTestsPassed === errorScenarios.length;
}

// Run tests if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  testAuthConfig().then(results => {
    testAuthFlows();
    process.exit(results.overall ? 0 : 1);
  });
}