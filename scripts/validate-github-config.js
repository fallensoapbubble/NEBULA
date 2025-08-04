#!/usr/bin/env node

/**
 * GitHub Integration Configuration Validator
 * Validates that all GitHub OAuth and API configurations are properly set up
 */

import dotenv from 'dotenv';

// Load environment variables from .env.local FIRST
dotenv.config({ path: '.env.local' });

async function main() {
  console.log('🔍 Validating GitHub Integration Configuration...\n');
  
  // Now import modules that depend on environment variables (after dotenv loads)
  const { config } = await import('../lib/config.js');
  const { validateOAuthConfig, getOAuthRedirectURIs, testOAuthConfig } = await import('../lib/oauth-config.js');

  // 1. Validate OAuth Configuration
  console.log('📋 Checking OAuth Configuration:');
  const oauthStatus = validateOAuthConfig();
  
  if (oauthStatus.hasErrors()) {
    console.log('❌ OAuth Configuration Errors:');
    oauthStatus.errors.forEach(error => console.log(`   • ${error}`));
  }
  
  if (oauthStatus.hasWarnings()) {
    console.log('⚠️  OAuth Configuration Warnings:');
    oauthStatus.warnings.forEach(warning => console.log(`   • ${warning}`));
  }
  
  if (oauthStatus.isValid) {
    console.log('✅ OAuth configuration is valid');
  }
  
  console.log();

  // 2. Display Redirect URIs
  console.log('🔗 OAuth Redirect URIs:');
  const redirectURIs = getOAuthRedirectURIs();
  console.log(`   Development: ${redirectURIs.development}`);
  console.log(`   Production:  ${redirectURIs.production}`);
  console.log(`   Current:     ${redirectURIs.current}`);
  console.log();

  // 3. Display GitHub App Configuration Instructions
  if (!oauthStatus.isValid) {
    console.log('⚙️  GitHub App Configuration Required:');
    console.log('   1. Go to: https://github.com/settings/applications/new');
    console.log('   2. Fill in the following details:');
    console.log('      • Application name: Nebula Portfolio Platform');
    console.log(`      • Homepage URL: ${config.nextAuth.url}`);
    console.log('      • Application description: Decentralized portfolio platform with GitHub integration');
    console.log(`      • Authorization callback URL: ${redirectURIs.current}`);
    console.log('   3. Copy the Client ID and Client Secret to your .env.local file');
    console.log();
  }

  // 4. Test OAuth Endpoints (if configuration is valid)
  if (oauthStatus.isValid) {
    console.log('🧪 Testing OAuth Endpoints:');
    try {
      const testResult = await testOAuthConfig();
      if (testResult.success) {
        console.log('✅ OAuth endpoints are accessible');
      } else {
        console.log(`❌ OAuth endpoint test failed: ${testResult.error}`);
      }
    } catch (error) {
      console.log(`❌ Failed to test OAuth endpoints: ${error.message}`);
    }
    console.log();
  }

  // 5. Display Environment Summary
  console.log('📊 Configuration Summary:');
  console.log(`   Environment: ${config.env}`);
  console.log(`   Base URL: ${config.nextAuth.url}`);
  console.log(`   GitHub API URL: ${config.github.apiUrl}`);
  console.log(`   Required Scopes: ${config.github.scopes.join(', ')}`);
  console.log(`   Client ID Set: ${config.github.clientId ? '✅' : '❌'}`);
  console.log(`   Client Secret Set: ${config.github.clientSecret ? '✅' : '❌'}`);
  console.log(`   NextAuth Secret Set: ${config.nextAuth.secret ? '✅' : '❌'}`);
  console.log();

  // 6. Final Status
  if (oauthStatus.isValid) {
    console.log('🎉 GitHub integration is properly configured and ready to use!');
    console.log(`   Test authentication: ${config.nextAuth.url}/api/auth/github`);
  } else {
    console.log('❌ GitHub integration configuration needs attention.');
    console.log('   Please fix the errors above and run this script again.');
    process.exit(1);
  }
}

// Handle errors gracefully
main().catch(error => {
  console.error('❌ Configuration validation failed:', error.message);
  if (process.env.NODE_ENV === 'development') {
    console.error(error.stack);
  }
  process.exit(1);
});