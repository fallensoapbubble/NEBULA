#!/usr/bin/env node

/**
 * GitHub OAuth Setup Helper
 * Provides step-by-step instructions for setting up GitHub OAuth
 */

import dotenv from 'dotenv';

// Load environment variables from .env.local
dotenv.config({ path: '.env.local' });

async function main() {
  // Import modules after environment variables are loaded
  const { config } = await import('../lib/config.js');
  const { getOAuthRedirectURIs, getOAuthSetupInstructions } = await import('../lib/oauth-config.js');
  console.log('🚀 GitHub OAuth Setup Helper\n');
  
  const instructions = getOAuthSetupInstructions();
  const redirectURIs = getOAuthRedirectURIs();
  
  console.log('Follow these steps to set up GitHub OAuth for your application:\n');
  
  // Display step-by-step instructions
  instructions.steps.forEach(step => {
    console.log(`${step.step}. ${step.title}`);
    console.log(`   ${step.description}`);
    
    if (step.url) {
      console.log(`   🔗 ${step.url}`);
    }
    
    if (step.fields) {
      console.log('   📝 Application Details:');
      Object.entries(step.fields).forEach(([key, value]) => {
        console.log(`      • ${key}: ${value}`);
      });
    }
    
    if (step.envVars) {
      console.log('   📄 Environment Variables:');
      Object.entries(step.envVars).forEach(([key, value]) => {
        console.log(`      ${key}=${value}`);
      });
    }
    
    if (step.command) {
      console.log(`   💻 Command: ${step.command}`);
      console.log(`   📄 Add to .env.local: ${step.envVar}="<generated_secret>"`);
    }
    
    console.log();
  });
  
  // Display redirect URIs for different environments
  console.log('🔗 Redirect URIs for Different Environments:');
  console.log(`   Development: ${redirectURIs.development}`);
  console.log(`   Production:  ${redirectURIs.production}`);
  console.log(`   Current:     ${redirectURIs.current}`);
  console.log();
  
  // Display required scopes
  console.log('🔐 Required OAuth Scopes:');
  instructions.requiredScopes.forEach(scope => {
    const descriptions = {
      'public_repo': 'Access to public repositories (read/write)',
      'repo': 'Full access to private and public repositories'
    };
    console.log(`   • ${scope}: ${descriptions[scope] || 'GitHub API access'}`);
  });
  console.log();
  
  // Display test endpoint
  console.log('🧪 Test Your Configuration:');
  console.log(`   1. Run: npm run validate-github-config`);
  console.log(`   2. Test authentication: ${instructions.testEndpoint}`);
  console.log();
  
  // Display example .env.local file
  console.log('📄 Example .env.local Configuration:');
  console.log(`
# GitHub OAuth Configuration
GITHUB_CLIENT_ID=your_github_client_id_here
GITHUB_CLIENT_SECRET=your_github_client_secret_here
GITHUB_OAUTH_SCOPES=public_repo,repo

# NextAuth Configuration
NEXTAUTH_URL=${config.nextAuth.url}
NEXTAUTH_SECRET="your_generated_secret_here"

# GitHub API Configuration (optional)
GITHUB_API_URL=https://api.github.com

# Application Configuration
NODE_ENV=${config.env}
`);
  
  console.log('💡 Tips:');
  console.log('   • Keep your Client Secret secure and never commit it to version control');
  console.log('   • Use different GitHub Apps for development and production');
  console.log('   • Test the OAuth flow in development before deploying to production');
  console.log('   • Monitor your GitHub API rate limits in production');
  console.log();
  
  console.log('✅ Once configured, run `npm run validate-github-config` to verify your setup!');
}

main().catch(console.error);