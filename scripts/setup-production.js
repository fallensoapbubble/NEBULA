#!/usr/bin/env node

/**
 * Production Setup Script
 * Validates environment variables and deployment configuration
 */

import { readFileSync, existsSync } from 'fs';
import { execSync } from 'child_process';
import path from 'path';

const REQUIRED_ENV_VARS = [
  'NEXTAUTH_URL',
  'NEXTAUTH_SECRET',
  'GITHUB_CLIENT_ID',
  'GITHUB_CLIENT_SECRET',
  'ENCRYPTION_KEY'
];

const OPTIONAL_ENV_VARS = [
  'GITHUB_WEBHOOK_SECRET',
  'RATE_LIMIT_REDIS_URL',
  'SENTRY_DSN',
  'NEXT_PUBLIC_VERCEL_ANALYTICS_ID'
];

class ProductionSetup {
  constructor() {
    this.errors = [];
    this.warnings = [];
    this.info = [];
  }

  log(level, message) {
    const timestamp = new Date().toISOString();
    const logMessage = `[${timestamp}] ${level.toUpperCase()}: ${message}`;
    
    switch (level) {
      case 'error':
        this.errors.push(message);
        console.error(`❌ ${logMessage}`);
        break;
      case 'warning':
        this.warnings.push(message);
        console.warn(`⚠️  ${logMessage}`);
        break;
      case 'info':
        this.info.push(message);
        console.log(`ℹ️  ${logMessage}`);
        break;
      case 'success':
        console.log(`✅ ${logMessage}`);
        break;
    }
  }

  validateEnvironmentVariables() {
    this.log('info', 'Validating environment variables...');

    // Check required variables
    for (const envVar of REQUIRED_ENV_VARS) {
      if (!process.env[envVar]) {
        this.log('error', `Missing required environment variable: ${envVar}`);
      } else if (process.env[envVar].includes('your_') || process.env[envVar].includes('_here')) {
        this.log('error', `Environment variable ${envVar} contains placeholder value`);
      } else {
        this.log('success', `Required environment variable ${envVar} is set`);
      }
    }

    // Check optional variables
    for (const envVar of OPTIONAL_ENV_VARS) {
      if (!process.env[envVar]) {
        this.log('warning', `Optional environment variable ${envVar} is not set`);
      } else {
        this.log('success', `Optional environment variable ${envVar} is set`);
      }
    }

    // Validate specific formats
    this.validateSpecificEnvVars();
  }

  validateSpecificEnvVars() {
    // Validate NEXTAUTH_URL format
    if (process.env.NEXTAUTH_URL) {
      try {
        new URL(process.env.NEXTAUTH_URL);
        this.log('success', 'NEXTAUTH_URL format is valid');
      } catch {
        this.log('error', 'NEXTAUTH_URL is not a valid URL');
      }
    }

    // Validate GitHub Client ID format
    if (process.env.GITHUB_CLIENT_ID && !process.env.GITHUB_CLIENT_ID.match(/^[A-Za-z0-9]{20}$/)) {
      this.log('warning', 'GITHUB_CLIENT_ID format may be incorrect (expected 20 alphanumeric characters)');
    }

    // Validate secrets are not too short
    const secrets = ['NEXTAUTH_SECRET', 'ENCRYPTION_KEY', 'GITHUB_WEBHOOK_SECRET'];
    for (const secret of secrets) {
      if (process.env[secret] && process.env[secret].length < 32) {
        this.log('warning', `${secret} should be at least 32 characters long for security`);
      }
    }
  }

  validateDeploymentConfig() {
    this.log('info', 'Validating deployment configuration...');

    // Check vercel.json exists
    if (!existsSync('vercel.json')) {
      this.log('error', 'vercel.json configuration file not found');
      return;
    }

    try {
      const vercelConfig = JSON.parse(readFileSync('vercel.json', 'utf8'));
      
      // Validate required fields
      if (!vercelConfig.version) {
        this.log('error', 'vercel.json missing version field');
      }

      if (!vercelConfig.env) {
        this.log('warning', 'vercel.json missing environment variable configuration');
      }

      if (!vercelConfig.headers) {
        this.log('warning', 'vercel.json missing security headers configuration');
      }

      this.log('success', 'vercel.json configuration is valid');
    } catch (error) {
      this.log('error', `Invalid vercel.json: ${error.message}`);
    }
  }

  validateNextConfig() {
    this.log('info', 'Validating Next.js configuration...');

    if (!existsSync('next.config.mjs')) {
      this.log('error', 'next.config.mjs not found');
      return;
    }

    try {
      // Basic validation - check if file can be read
      const configContent = readFileSync('next.config.mjs', 'utf8');
      
      if (!configContent.includes('headers()')) {
        this.log('warning', 'next.config.mjs missing security headers configuration');
      }

      if (!configContent.includes('images:')) {
        this.log('warning', 'next.config.mjs missing image optimization configuration');
      }

      this.log('success', 'next.config.mjs configuration looks good');
    } catch (error) {
      this.log('error', `Error reading next.config.mjs: ${error.message}`);
    }
  }

  checkDependencies() {
    this.log('info', 'Checking production dependencies...');

    try {
      const packageJson = JSON.parse(readFileSync('package.json', 'utf8'));
      
      const requiredDeps = [
        '@octokit/rest',
        'next',
        'react',
        'react-dom',
        'next-auth'
      ];

      for (const dep of requiredDeps) {
        if (!packageJson.dependencies[dep]) {
          this.log('error', `Missing required dependency: ${dep}`);
        } else {
          this.log('success', `Required dependency ${dep} is installed`);
        }
      }

      // Check for security vulnerabilities
      try {
        execSync('npm audit --audit-level=high', { stdio: 'pipe' });
        this.log('success', 'No high-severity security vulnerabilities found');
      } catch (error) {
        this.log('warning', 'Security vulnerabilities detected - run "npm audit fix"');
      }

    } catch (error) {
      this.log('error', `Error reading package.json: ${error.message}`);
    }
  }

  generateDeploymentChecklist() {
    this.log('info', 'Generating deployment checklist...');

    const checklist = [
      '□ Set up GitHub OAuth App with production callback URL',
      '□ Configure all required environment variables in Vercel',
      '□ Set up custom domain and SSL certificate',
      '□ Configure GitHub webhooks for automatic updates',
      '□ Set up error monitoring (Sentry, LogRocket, etc.)',
      '□ Configure analytics tracking',
      '□ Set up rate limiting with Redis (optional)',
      '□ Test OAuth flow in production',
      '□ Test portfolio rendering with sample repositories',
      '□ Verify webhook functionality',
      '□ Set up monitoring alerts',
      '□ Configure backup and disaster recovery',
      '□ Document production URLs and access credentials'
    ];

    console.log('\n📋 Production Deployment Checklist:');
    console.log('=====================================');
    checklist.forEach(item => console.log(item));
  }

  generateSecurityRecommendations() {
    console.log('\n🔒 Security Recommendations:');
    console.log('=============================');
    
    const recommendations = [
      'Use strong, unique secrets for all environment variables',
      'Enable Vercel\'s security headers and CSP',
      'Regularly rotate GitHub OAuth secrets',
      'Monitor GitHub API rate limits and usage',
      'Set up alerts for authentication failures',
      'Use HTTPS everywhere and enable HSTS',
      'Regularly update dependencies to patch vulnerabilities',
      'Implement proper error handling to avoid information leakage',
      'Use environment-specific configurations',
      'Enable audit logging for sensitive operations'
    ];

    recommendations.forEach((rec, index) => {
      console.log(`${index + 1}. ${rec}`);
    });
  }

  run() {
    console.log('🚀 Nebula Portfolio Platform - Production Setup Validator');
    console.log('=========================================================\n');

    this.validateEnvironmentVariables();
    this.validateDeploymentConfig();
    this.validateNextConfig();
    this.checkDependencies();

    console.log('\n📊 Setup Validation Summary:');
    console.log('============================');
    console.log(`✅ Successful checks: ${this.info.length}`);
    console.log(`⚠️  Warnings: ${this.warnings.length}`);
    console.log(`❌ Errors: ${this.errors.length}`);

    if (this.errors.length > 0) {
      console.log('\n❌ Critical Issues Found:');
      this.errors.forEach(error => console.log(`   • ${error}`));
      console.log('\nPlease fix these issues before deploying to production.');
    }

    if (this.warnings.length > 0) {
      console.log('\n⚠️  Warnings:');
      this.warnings.forEach(warning => console.log(`   • ${warning}`));
    }

    this.generateDeploymentChecklist();
    this.generateSecurityRecommendations();

    if (this.errors.length === 0) {
      console.log('\n🎉 Production setup validation completed successfully!');
      console.log('You can proceed with deployment to Vercel.');
    } else {
      console.log('\n🛑 Production setup validation failed.');
      console.log('Please address the errors above before deploying.');
      process.exit(1);
    }
  }
}

// Run the setup validator
const setup = new ProductionSetup();
setup.run();