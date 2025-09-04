# Deployment Guide

This guide covers deploying the Nebula Portfolio Platform to production using Vercel.

## Prerequisites

- GitHub account with OAuth app configured
- Vercel account
- Node.js 18+ installed locally
- Git repository with the platform code

## 1. GitHub OAuth App Setup

### Create GitHub OAuth App

1. Go to [GitHub Developer Settings](https://github.com/settings/developers)
2. Click "New OAuth App"
3. Fill in the application details:
   - **Application name**: `Nebula Portfolio Platform`
   - **Homepage URL**: `https://nebula-mu-henna.vercel.app`
   - **Authorization callback URL**: `https://nebula-mu-henna.vercel.app/api/auth/github/callback`
4. Click "Register application"
5. Note down the **Client ID** and generate a **Client Secret**

### Configure OAuth Scopes

The application requires the following GitHub scopes:
- `public_repo` - Access to public repositories
- `repo` - Full access to private repositories (optional, for private portfolio repos)

## 2. Environment Variables Setup

### Required Environment Variables

Set these in your Vercel project settings:

```bash
# GitHub OAuth
GITHUB_CLIENT_ID=your_github_client_id
GITHUB_CLIENT_SECRET=your_github_client_secret

# NextAuth Configuration
NEXTAUTH_URL=https://nebula-mu-henna.vercel.app
NEXTAUTH_SECRET=your_32_character_random_secret

# Security
ENCRYPTION_KEY=your_32_character_encryption_key
GITHUB_WEBHOOK_SECRET=your_webhook_secret
```

### Optional Environment Variables

```bash
# Rate Limiting (recommended for production)
RATE_LIMIT_REDIS_URL=redis://your-redis-instance

# Monitoring
SENTRY_DSN=your_sentry_dsn
NEXT_PUBLIC_VERCEL_ANALYTICS_ID=your_analytics_id

# Performance
NEXT_PUBLIC_PERFORMANCE_MONITORING=true
```

### Generate Secure Secrets

Use these commands to generate secure secrets:

```bash
# NextAuth Secret
openssl rand -base64 32

# Encryption Key
openssl rand -base64 32

# Webhook Secret
openssl rand -hex 20
```

## 3. Vercel Deployment

### Deploy via Vercel CLI

1. Install Vercel CLI:
   ```bash
   npm i -g vercel
   ```

2. Login to Vercel:
   ```bash
   vercel login
   ```

3. Deploy the project:
   ```bash
   vercel --prod
   ```

### Deploy via GitHub Integration

1. Connect your GitHub repository to Vercel
2. Import the project in Vercel dashboard
3. Configure environment variables in project settings
4. Deploy automatically on push to main branch

### Vercel Configuration

The `vercel.json` file includes:
- Security headers (CSP, HSTS, etc.)
- CORS configuration for API routes
- Function timeout settings
- Redirect rules

## 4. Custom Domain Setup (Optional)

### Add Custom Domain

1. In Vercel dashboard, go to your project
2. Navigate to "Settings" → "Domains"
3. Add your custom domain
4. Configure DNS records as instructed by Vercel

### SSL Certificate

Vercel automatically provisions SSL certificates for all domains.

## 5. GitHub Webhooks (Optional)

Set up webhooks for automatic portfolio updates:

### Create Webhook

1. Go to your template repository settings
2. Navigate to "Webhooks" → "Add webhook"
3. Set payload URL: `https://nebula-mu-henna.vercel.app/api/webhooks/github`
4. Set content type: `application/json`
5. Set secret: Use your `GITHUB_WEBHOOK_SECRET`
6. Select events: `push`, `repository`

### Webhook Benefits

- Automatic portfolio regeneration on content updates
- Improved cache invalidation
- Real-time content synchronization

## 6. Monitoring and Analytics

### Error Monitoring

Configure Sentry for error tracking:

1. Create Sentry project
2. Add `SENTRY_DSN` environment variable
3. Errors will be automatically tracked

### Performance Monitoring

Enable Vercel Analytics:

1. Enable in Vercel dashboard
2. Add `NEXT_PUBLIC_VERCEL_ANALYTICS_ID` if using custom analytics

### Rate Limit Monitoring

Set up Redis for distributed rate limiting:

1. Create Redis instance (Upstash, Redis Cloud, etc.)
2. Add `RATE_LIMIT_REDIS_URL` environment variable
3. Monitor GitHub API usage

## 7. Security Configuration

### Security Headers

The platform includes comprehensive security headers:

- **Content Security Policy (CSP)**: Prevents XSS attacks
- **Strict Transport Security (HSTS)**: Enforces HTTPS
- **X-Frame-Options**: Prevents clickjacking
- **X-Content-Type-Options**: Prevents MIME sniffing

### CORS Configuration

API routes are configured with appropriate CORS headers for secure cross-origin requests.

### Rate Limiting

GitHub API rate limiting is implemented to prevent abuse and ensure service availability.

## 8. Validation and Testing

### Pre-deployment Validation

Run the production setup validator:

```bash
npm run validate:production
```

This checks:
- Environment variables
- Configuration files
- Dependencies
- Security settings

### Post-deployment Testing

Test these critical flows:

1. **OAuth Authentication**:
   - Visit your deployed site
   - Click "Sign in with GitHub"
   - Verify successful authentication

2. **Template Gallery**:
   - Browse available templates
   - Verify template previews load

3. **Repository Forking**:
   - Select a template
   - Fork to your GitHub account
   - Verify repository creation

4. **Web Editor**:
   - Edit portfolio content
   - Save changes
   - Verify GitHub commits

5. **Portfolio Rendering**:
   - Visit `https://your-domain.com/username/repo`
   - Verify portfolio renders correctly
   - Test both light and dark modes

## 9. Troubleshooting

### Common Issues

#### OAuth Callback Errors
- Verify callback URL matches exactly in GitHub OAuth app
- Check `NEXTAUTH_URL` environment variable
- Ensure HTTPS is used in production

#### API Rate Limiting
- Monitor GitHub API usage in Vercel functions
- Implement Redis-based rate limiting for high traffic
- Use conditional requests with ETags

#### Portfolio Not Loading
- Check repository exists and is public
- Verify template structure follows conventions
- Check Vercel function logs for errors

#### Webhook Issues
- Verify webhook secret matches environment variable
- Check webhook delivery in GitHub repository settings
- Monitor webhook endpoint logs

### Debug Mode

Enable debug logging by setting:
```bash
LOG_LEVEL=debug
```

### Support Resources

- [Vercel Documentation](https://vercel.com/docs)
- [Next.js Deployment Guide](https://nextjs.org/docs/deployment)
- [GitHub OAuth Documentation](https://docs.github.com/en/developers/apps/building-oauth-apps)

## 10. Maintenance

### Regular Tasks

- **Security Updates**: Keep dependencies updated
- **Secret Rotation**: Rotate OAuth secrets periodically
- **Monitoring**: Review error logs and performance metrics
- **Backup**: Ensure critical configuration is backed up

### Scaling Considerations

- **Redis**: Use Redis for rate limiting at scale
- **CDN**: Leverage Vercel's global CDN
- **Database**: Consider database for user preferences (optional)
- **Monitoring**: Set up alerts for high error rates or API limits

## Deployment Checklist

- [ ] GitHub OAuth app created and configured
- [ ] All required environment variables set in Vercel
- [ ] Custom domain configured (if applicable)
- [ ] SSL certificate active
- [ ] Security headers configured
- [ ] Error monitoring set up
- [ ] Analytics configured
- [ ] Webhooks configured (optional)
- [ ] Rate limiting configured
- [ ] Production testing completed
- [ ] Monitoring alerts configured
- [ ] Documentation updated
- [ ] Team access configured

## Next Steps

After successful deployment:

1. **User Documentation**: Create user guides for portfolio creation
2. **Template Gallery**: Populate with high-quality templates
3. **Community**: Set up community channels for support
4. **Feedback**: Implement user feedback collection
5. **Analytics**: Monitor usage patterns and optimize accordingly