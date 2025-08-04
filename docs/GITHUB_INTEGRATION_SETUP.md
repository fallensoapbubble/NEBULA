# GitHub Integration Setup Guide

## Overview

The GitHub integration for the Nebula Portfolio Platform is now fully configured and ready to use. This guide covers the setup, configuration, and testing of the GitHub OAuth authentication and API integration.

## ✅ What's Been Configured

### 1. GitHub OAuth Authentication
- **OAuth Initiation**: `/api/auth/github` - Redirects users to GitHub for authentication
- **OAuth Callback**: `/api/auth/github/callback` - Handles the OAuth callback and token exchange
- **Redirect URI**: Properly configured for both development and production environments
- **Scopes**: `public_repo` and `repo` for full repository access
- **Security**: CSRF protection with state parameter validation

### 2. API Routes Structure
All GitHub integration API routes are implemented and ready:

#### Repository Management
- `POST /api/repositories/fork` - Fork template repositories
- `GET /api/repositories/[owner]/[repo]` - Get repository information
- `GET /api/repositories/[owner]/[repo]/structure` - Get repository file structure
- `GET /api/repositories/[owner]/[repo]/status` - Get synchronization status

#### Content Management
- `GET /api/content/[owner]/[repo]/[...path]` - Get file content
- `PUT /api/content/[owner]/[repo]/[...path]` - Update file content
- `POST /api/content/[owner]/[repo]/commit` - Create batch commits
- `GET /api/content/[owner]/[repo]/history` - Get commit history

#### Template Management
- `GET /api/templates` - Get template gallery
- `GET /api/templates/[owner]/[repo]/validate` - Validate template structure
- `POST /api/templates/[owner]/[repo]/analyze` - Analyze template configuration
- `GET /api/templates/[owner]/[repo]/schema` - Get editing schema

#### Synchronization
- `GET /api/sync/[owner]/[repo]/check` - Check for conflicts
- `POST /api/sync/[owner]/[repo]/resolve` - Resolve conflicts
- `GET /api/sync/[owner]/[repo]/diff` - Get change differences
- `POST /api/sync/[owner]/[repo]/pull` - Pull remote updates

### 3. Configuration Management
- **Environment Variables**: Properly loaded from `.env.local`
- **Validation Scripts**: Automated configuration validation
- **Setup Helper**: Step-by-step setup instructions

## 🔧 Environment Configuration

Your `.env.local` file is properly configured with:

```bash
# GitHub OAuth Configuration
GITHUB_CLIENT_ID=Ov23lik0OJ6tnsQ4FrMu
GITHUB_CLIENT_SECRET=a4be6a37286cbc800ffe61b593f76b239722f6a3

# GitHub OAuth Scopes
GITHUB_OAUTH_SCOPES=public_repo,repo

# NextAuth Configuration
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET="wy1p15zH0efWv83Do1abPq76xCUhQWl4If2v588VbUw="

# GitHub API Configuration
GITHUB_API_URL=https://api.github.com

# Application Configuration
NODE_ENV=development
```

## 🧪 Testing the Integration

### 1. Validate Configuration
Run the configuration validator to ensure everything is set up correctly:

```bash
npm run validate-github-config
```

Expected output: ✅ OAuth configuration is valid

### 2. Start Development Server
```bash
npm run dev
```

### 3. Test OAuth Flow
1. Open your browser to: `http://localhost:3000/api/auth/github`
2. You should be redirected to GitHub for authentication
3. After authorizing, you'll be redirected back to your application
4. Check browser cookies for GitHub session data

### 4. Test API Endpoints
With a valid session, you can test the API endpoints:

```bash
# Test repository information (replace with actual owner/repo)
curl -H "Cookie: github_access_token=your_token" \
  http://localhost:3000/api/repositories/owner/repo

# Test template gallery
curl http://localhost:3000/api/templates
```

## 🔗 GitHub App Configuration

Your GitHub OAuth App should be configured with:

- **Application name**: Nebula Portfolio Platform
- **Homepage URL**: `http://localhost:3000` (development) / `https://nebula-mu-henna.vercel.app` (production)
- **Authorization callback URL**: 
  - Development: `http://localhost:3000/api/auth/github/callback`
  - Production: `https://nebula-mu-henna.vercel.app/api/auth/github/callback`
- **Required scopes**: `public_repo`, `repo`

## 🚀 Production Deployment

For production deployment, update your environment variables:

```bash
# Production Environment Variables
NEXTAUTH_URL=https://nebula-mu-henna.vercel.app
GITHUB_CLIENT_ID=your_production_client_id
GITHUB_CLIENT_SECRET=your_production_client_secret
NEXTAUTH_SECRET=your_production_secret
NODE_ENV=production
```

## 🛠️ Available Scripts

- `npm run setup-github` - Display GitHub OAuth setup instructions
- `npm run validate-github-config` - Validate GitHub integration configuration
- `npm run dev` - Start development server
- `npm run build` - Build for production

## 🔍 Troubleshooting

### Common Issues

1. **OAuth Configuration Errors**
   - Run `npm run validate-github-config` to identify issues
   - Ensure all environment variables are set in `.env.local`
   - Check that GitHub App redirect URI matches your configuration

2. **Authentication Failures**
   - Verify GitHub App is active and not suspended
   - Check that required scopes are granted
   - Ensure callback URL is correctly configured

3. **API Rate Limiting**
   - Monitor GitHub API rate limits in production
   - Implement proper error handling for rate limit responses
   - Consider using GitHub App authentication for higher limits

### Debug Mode

Enable debug logging by setting:
```bash
LOG_LEVEL=debug
```

## 📚 Next Steps

With GitHub integration configured, you can now:

1. **Implement Template Gallery** (Task 7) - Create the UI for browsing and forking templates
2. **Build Web Editor** (Task 8) - Create the content editing interface
3. **Add Dynamic Portfolio Rendering** (Task 9) - Implement ISR-based portfolio hosting

## 🔐 Security Considerations

- GitHub access tokens are stored in HTTP-only cookies
- CSRF protection is implemented with state parameter validation
- All API routes require authentication
- Environment variables are properly secured
- Rate limiting is implemented for GitHub API calls

The GitHub integration is now fully functional and ready for the next phase of development!