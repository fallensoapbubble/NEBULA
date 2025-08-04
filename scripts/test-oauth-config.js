#!/usr/bin/env node

/**
 * OAuth Configuration Test Script
 * Tests the GitHub OAuth configuration without starting the full server
 */

import { validateOAuthConfig, getOAuthConfigSummary, getOAuthSetupInstructions } from '../lib/oauth-config.js';

console.log('🔍 Testing GitHub OAuth Configuration...\n');

// Test configuration validation
console.log('📋 Configuration Validation:');
const validation = validateOAuthConfig();
const report = validation.getReport();

if (report.isValid) {
  console.log('✅ Configuration is valid!');
} else {
  console.log('❌ Configuration has errors:');
  report.errors.forEach(error => console.log(`   • ${error}`));
}

if (report.warnings.length > 0) {
  console.log('⚠️  Warnings:');
  report.warnings.forEach(warning => console.log(`   • ${warning}`));
}

console.log(`\n📊 Summary: ${report.summary}\n`);

// Show configuration summary
console.log('🔧 Configuration Summary:');
const summary = getOAuthConfigSummary();
console.log(`   Environment: ${summary.environment}`);
console.log(`   Base URL: ${summary.baseUrl}`);
console.log(`   GitHub API URL: ${summary.githubApiUrl}`);
console.log(`   Has Client ID: ${summary.hasClientId}`);
console.log(`   Has Client Secret: ${summary.hasClientSecret}`);
console.log(`   Has NextAuth Secret: ${summary.hasNextAuthSecret}`);
console.log(`   Required Scopes: ${summary.requiredScopes.join(', ')}`);

// Show redirect URIs
console.log('\n🔗 OAuth Redirect URIs:');
Object.entries(summary.redirectURIs).forEach(([env, uri]) => {
  console.log(`   ${env}: ${uri}`);
});

// Show setup instructions if configuration is invalid
if (!report.isValid) {
  console.log('\n📖 Setup Instructions:');
  const instructions = getOAuthSetupInstructions();
  
  instructions.steps.forEach(step => {
    console.log(`\n${step.step}. ${step.title}`);
    console.log(`   ${step.description}`);
    
    if (step.url) {
      console.log(`   URL: ${step.url}`);
    }
    
    if (step.fields) {
      console.log('   Fields:');
      Object.entries(step.fields).forEach(([field, value]) => {
        console.log(`     ${field}: ${value}`);
      });
    }
    
    if (step.envVars) {
      console.log('   Environment Variables:');
      Object.entries(step.envVars).forEach(([key, description]) => {
        console.log(`     ${key}=${description}`);
      });
    }
    
    if (step.command) {
      console.log(`   Command: ${step.command}`);
      console.log(`   Environment Variable: ${step.envVar}`);
    }
  });
  
  console.log(`\n🧪 Test Endpoint: ${instructions.testEndpoint}`);
}

console.log('\n✨ OAuth configuration test complete!');

// Exit with appropriate code
process.exit(report.isValid ? 0 : 1);