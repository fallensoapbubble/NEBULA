/**
 * GitHub OAuth Configuration Validator
 * Validates OAuth setup and provides configuration helpers
 */

import { config, validateConfig } from './config.js';

/**
 * OAuth Configuration Status
 */
export class OAuthConfigStatus {
  constructor() {
    this.errors = [];
    this.warnings = [];
    this.isValid = false;
  }

  addError(message) {
    this.errors.push(message);
  }

  addWarning(message) {
    this.warnings.push(message);
  }

  setValid(valid) {
    this.isValid = valid;
  }

  hasErrors() {
    return this.errors.length > 0;
  }

  hasWarnings() {
    return this.warnings.length > 0;
  }

  getReport() {
    return {
      isValid: this.isValid,
      errors: this.errors,
      warnings: this.warnings,
      summary: this.getSummary()
    };
  }

  getSummary() {
    if (this.hasErrors()) {
      return `OAuth configuration has ${this.errors.length} error(s) that must be fixed`;
    }
    if (this.hasWarnings()) {
      return `OAuth configuration is valid but has ${this.warnings.length} warning(s)`;
    }
    return 'OAuth configuration is valid and ready to use';
  }
}

/**
 * Validate GitHub OAuth configuration
 * @returns {OAuthConfigStatus} Configuration status with errors and warnings
 */
export function validateOAuthConfig() {
  const status = new OAuthConfigStatus();

  try {
    // Validate basic configuration
    validateConfig();
  } catch (error) {
    status.addError(error.message);
    return status;
  }

  // Check GitHub OAuth specific configuration
  const { github, nextAuth, urls } = config;

  // Validate GitHub client credentials
  if (!github.clientId) {
    status.addError('GITHUB_CLIENT_ID is not set');
  } else if (github.clientId === 'your_github_client_id_here') {
    status.addError('GITHUB_CLIENT_ID is still set to placeholder value');
  }

  if (!github.clientSecret) {
    status.addError('GITHUB_CLIENT_SECRET is not set');
  } else if (github.clientSecret === 'your_github_client_secret_here') {
    status.addError('GITHUB_CLIENT_SECRET is still set to placeholder value');
  }

  // Validate NextAuth configuration
  if (!nextAuth.secret) {
    status.addError('NEXTAUTH_SECRET is not set');
  } else if (nextAuth.secret === 'your_nextauth_secret_here') {
    status.addError('NEXTAUTH_SECRET is still set to placeholder value');
  } else if (nextAuth.secret.length < 32) {
    status.addWarning('NEXTAUTH_SECRET should be at least 32 characters long for security');
  }

  if (!nextAuth.url) {
    status.addError('NEXTAUTH_URL is not set');
  } else {
    // Validate URL format
    try {
      new URL(nextAuth.url);
    } catch (error) {
      status.addError('NEXTAUTH_URL is not a valid URL');
    }
  }

  // Validate GitHub API URL
  if (github.apiUrl !== 'https://api.github.com') {
    status.addWarning(`Using custom GitHub API URL: ${github.apiUrl}`);
  }

  // Environment-specific validations
  if (config.isProduction) {
    if (nextAuth.url.includes('localhost')) {
      status.addError('NEXTAUTH_URL should not use localhost in production');
    }
    if (!nextAuth.url.startsWith('https://')) {
      status.addError('NEXTAUTH_URL must use HTTPS in production');
    }
  }

  // Set overall validity
  status.setValid(!status.hasErrors());

  return status;
}

/**
 * Get OAuth redirect URIs for GitHub app configuration
 * @returns {Object} Redirect URIs for different environments
 */
export function getOAuthRedirectURIs() {
  const baseUrl = config.nextAuth.url;
  const callbackPath = '/api/auth/github/callback';

  return {
    development: `http://localhost:3000${callbackPath}`,
    production: `${baseUrl}${callbackPath}`,
    current: `${baseUrl}${callbackPath}`
  };
}

/**
 * Get GitHub OAuth app configuration instructions
 * @returns {Object} Configuration instructions and URLs
 */
export function getOAuthSetupInstructions() {
  const redirectURIs = getOAuthRedirectURIs();
  
  return {
    steps: [
      {
        step: 1,
        title: 'Create GitHub OAuth App',
        description: 'Go to GitHub Settings > Developer settings > OAuth Apps',
        url: 'https://github.com/settings/applications/new'
      },
      {
        step: 2,
        title: 'Configure Application Details',
        description: 'Fill in the application details',
        fields: {
          'Application name': 'Nebula Portfolio Platform',
          'Homepage URL': config.nextAuth.url,
          'Application description': 'Decentralized portfolio platform with GitHub integration',
          'Authorization callback URL': redirectURIs.current
        }
      },
      {
        step: 3,
        title: 'Copy Credentials',
        description: 'Copy the Client ID and Client Secret to your .env.local file',
        envVars: {
          'GITHUB_CLIENT_ID': 'Your GitHub App Client ID',
          'GITHUB_CLIENT_SECRET': 'Your GitHub App Client Secret'
        }
      },
      {
        step: 4,
        title: 'Generate NextAuth Secret',
        description: 'Generate a secure random secret for NextAuth',
        command: 'openssl rand -base64 32',
        envVar: 'NEXTAUTH_SECRET'
      }
    ],
    redirectURIs,
    requiredScopes: ['public_repo', 'repo'],
    testEndpoint: `${config.nextAuth.url}/api/auth/github`
  };
}

/**
 * Test OAuth configuration by making a test request
 * @returns {Promise<Object>} Test result with status and details
 */
export async function testOAuthConfig() {
  const status = validateOAuthConfig();
  
  if (!status.isValid) {
    return {
      success: false,
      error: 'Configuration validation failed',
      details: status.getReport()
    };
  }

  try {
    // Test GitHub OAuth endpoints accessibility
    const authUrl = `${config.nextAuth.url}/api/auth/github`;
    
    // Note: We can't actually test the full OAuth flow without user interaction,
    // but we can verify the endpoint exists and responds
    const response = await fetch(authUrl, {
      method: 'GET',
      redirect: 'manual' // Don't follow redirects
    });

    // OAuth endpoint should redirect (302) or return an error
    if (response.status === 302 || response.status === 500) {
      return {
        success: true,
        message: 'OAuth endpoints are accessible',
        details: {
          authEndpoint: authUrl,
          redirectURIs: getOAuthRedirectURIs(),
          status: status.getReport()
        }
      };
    } else {
      return {
        success: false,
        error: `Unexpected response from OAuth endpoint: ${response.status}`,
        details: {
          status: response.status,
          statusText: response.statusText
        }
      };
    }

  } catch (error) {
    return {
      success: false,
      error: 'Failed to test OAuth configuration',
      details: {
        error: error.message,
        stack: error.stack
      }
    };
  }
}

/**
 * Get OAuth configuration summary for debugging
 * @returns {Object} Configuration summary (without sensitive data)
 */
export function getOAuthConfigSummary() {
  const status = validateOAuthConfig();
  const redirectURIs = getOAuthRedirectURIs();
  
  return {
    environment: config.env,
    baseUrl: config.nextAuth.url,
    githubApiUrl: config.github.apiUrl,
    redirectURIs,
    requiredScopes: config.github.scopes,
    configStatus: status.getReport(),
    hasClientId: !!config.github.clientId,
    hasClientSecret: !!config.github.clientSecret,
    hasNextAuthSecret: !!config.nextAuth.secret,
    clientIdLength: config.github.clientId ? config.github.clientId.length : 0,
    secretLength: config.nextAuth.secret ? config.nextAuth.secret.length : 0
  };
}