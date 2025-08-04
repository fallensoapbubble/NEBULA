# GitHub OAuth Setup Guide

This guide walks you through setting up GitHub OAuth for the Nebula Portfolio Platform.

## Prerequisites

- A GitHub account
- Access to GitHub Developer Settings
- The Nebula application running locally or deployed

## Step 1: Create a GitHub OAuth App

1. Go to [GitHub Developer Settings](https://github.com/settings/developers)
2. Click "OAuth Apps" in the left sidebar
3. Click "New OAuth App"

## Step 2: Configure the OAuth App

Fill in the following details:

### Application Details
- **Application name**: `Nebula Portfolio Platform`
- **Homepage URL**: 
  - Development: `http://localhost:3000`
  - Production: `https://your-domain.com`
- **Application description**: `Decentralized portfolio platform with GitHub integration`
- **Authorization callback URL**:
  - Development: `http://localhost:3000/api/auth/github/callback`
  - Production: `https://your-domain.com/api/auth/github/callback`

### Required Permissions
The application will request the following OAuth scopes:
- `public_repo`: Access to public repositories (for forking and reading public templates)
- `repo`: Full repository access (for private repositories if needed)

## Step 3: Copy Credentials

After creating the OAuth app:

1. Copy the **Client ID**
2. Generate and copy the **Client Secret**
3. Update your `.env.local` file:

```bash
# GitHub OAuth Configuration
GITHUB_CLIENT_ID=your_actual_client_id_here
GITHUB_CLIENT_SECRET=your_actual_client_secret_here
GITHUB_OAUTH_SCOPES=public_repo,repo

# NextAuth Configuration
NEXTAUTH_URL=http://localhost:3000  # or your production URL
NEXTAUTH_SECRET=your_generated_secret_here
```

## Step 4: Generate NextAuth Secret

Generate a secure random secret for NextAuth:

```bash
# Using OpenSSL (recommended)
openssl rand -base64 32

# Using Node.js
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

Copy the generated secret to your `NEXTAUTH_SECRET` environment variable.

## Step 5: Test the Configuration

1. Start your development server:
   ```bash
   npm run dev
   ```

2. Visit the configuration test endpoint:
   ```
   http://localhost:3000/api/auth/config?action=validate
   ```

3. Or visit the auth test page:
   ```
   http://localhost:3000/auth-test
   ```

4. Test the OAuth flow by clicking "Login with GitHub"

## Troubleshooting

### Common Issues

1. **"OAuth configuration missing" error**
   - Ensure `GITHUB_CLIENT_ID` and `GITHUB_CLIENT_SECRET` are set
   - Check that values are not still set to placeholder values

2. **"Invalid OAuth state parameter" error**
   - This usually indicates a CSRF protection issue
   - Ensure cookies are enabled in your browser
   - Check that `NEXTAUTH_SECRET` is set

3. **"GitHub authentication was denied" error**
   - User denied permission during OAuth flow
   - Check that the OAuth app is configured correctly
   - Ensure callback URL matches exactly

4. **"Repository not found" or permission errors**
   - Ensure the OAuth app has the correct scopes (`public_repo`, `repo`)
   - User may need to re-authenticate to grant new permissions

### Configuration Validation

Use the built-in configuration validator:

```bash
# Check configuration status
curl http://localhost:3000/api/auth/config?action=status

# Get setup instructions
curl http://localhost:3000/api/auth/config?action=instructions

# Validate configuration
curl http://localhost:3000/api/auth/config?action=validate

# Test OAuth endpoints
curl -X POST http://localhost:3000/api/auth/config \
  -H "Content-Type: application/json" \
  -d '{"action": "test"}'
```

## Security Considerations

1. **Keep secrets secure**: Never commit actual credentials to version control
2. **Use HTTPS in production**: OAuth requires HTTPS for production deployments
3. **Rotate secrets regularly**: Consider rotating OAuth secrets periodically
4. **Limit scope permissions**: Only request the minimum required OAuth scopes
5. **Validate redirect URIs**: Ensure callback URLs are exactly configured in GitHub

## Production Deployment

When deploying to production:

1. Update the OAuth app callback URL to your production domain
2. Set `NEXTAUTH_URL` to your production URL (must use HTTPS)
3. Use environment variables or secure secret management for credentials
4. Test the OAuth flow thoroughly in the production environment

## API Endpoints

The following OAuth-related API endpoints are available:

- `GET /api/auth/github` - Initiate OAuth flow
- `GET /api/auth/github/callback` - OAuth callback handler
- `GET /api/auth/validate` - Validate current session
- `POST /api/auth/logout` - Logout and clear session
- `GET /api/auth/config` - Configuration status and validation

## Support

If you encounter issues:

1. Check the browser console for error messages
2. Review server logs for detailed error information
3. Use the configuration validation endpoints to diagnose issues
4. Ensure all environment variables are correctly set
5. Verify the GitHub OAuth app configuration matches your setup