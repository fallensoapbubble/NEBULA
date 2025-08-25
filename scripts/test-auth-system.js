#!/usr/bin/env node

/**
 * Test script for the enhanced GitHub OAuth authentication system
 */

import { config } from 'dotenv';
import { testAuthConfig, testAuthFlows } from '../lib/auth-test.js';

// Load environment variables from .env.local
config({ path: '.env.local' });

async function main() {
  console.log('🔧 Loading environment variables from .env.local...\n');
  
  // Show loaded environment variables (without secrets)
  console.log('Environment variables loaded:');
  console.log(`   GITHUB_CLIENT_ID: ${process.env.GITHUB_CLIENT_ID ? '✅ Set' : '❌ Missing'}`);
  console.log(`   GITHUB_CLIENT_SECRET: ${process.env.GITHUB_CLIENT_SECRET ? '✅ Set' : '❌ Missing'}`);
  console.log(`   NEXTAUTH_SECRET: ${process.env.NEXTAUTH_SECRET ? '✅ Set' : '❌ Missing'}`);
  console.log(`   NEXTAUTH_URL: ${process.env.NEXTAUTH_URL || 'Not set'}\n`);
  
  // Run the authentication tests
  const results = await testAuthConfig();
  const flowResults = testAuthFlows();
  
  // Exit with appropriate code
  const success = results.overall && flowResults;
  process.exit(success ? 0 : 1);
}

main().catch(error => {
  console.error('❌ Test script failed:', error);
  process.exit(1);
});