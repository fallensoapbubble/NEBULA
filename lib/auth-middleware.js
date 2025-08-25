/**
 * Authentication Middleware
 * Provides centralized authentication integration for all GitHub API services
 */

import { getServerSession } from 'next-auth';
import { authOptions } from './auth-config.js';
import { validateGitHubToken, getUserSession, isSessionValid, hasRequiredPermissions } from './github-auth.js';
import { logger } from './logger.js';

/**
 * Authentication middleware for API routes
 * Validates session and provides GitHub token for service operations
 */
export class AuthMiddleware {
  constructor(options = {}) {
    this.options = {
      requireAuth: true,
      requiredScopes: ['public_repo'],
      allowAnonymous: false,
      ...options
    };
    this.logger = logger.child({ service: 'auth-middleware' });
  }

  /**
   * Authenticate request and return session with GitHub token
   * @param {Request} request - Next.js request object
   * @returns {Promise<{success: boolean, session?: object, error?: string, status?: number}>}
   */
  async authenticate(request) {
    try {
      // Get session from NextAuth
      const session = await getServerSession(authOptions);

      if (!session) {
        if (this.options.allowAnonymous) {
          return {
            success: true,
            session: null,
            anonymous: true
          };
        }

        return {
          success: false,
          error: 'Authentication required',
          status: 401
        };
      }

      // Check for token refresh errors
      if (session.error === 'RefreshAccessTokenError') {
        this.logger.warn('Token refresh failed for user', { 
          userId: session.user?.id 
        });
        
        return {
          success: false,
          error: 'Token refresh failed. Please sign in again.',
          status: 401,
          requiresReauth: true
        };
      }

      // Validate GitHub token
      if (session.accessToken) {
        const tokenValidation = await validateGitHubToken(session.accessToken);
        
        if (!tokenValidation.valid) {
          this.logger.warn('Invalid GitHub token for user', { 
            userId: session.user?.id,
            error: tokenValidation.error 
          });
          
          return {
            success: false,
            error: 'Invalid GitHub token. Please sign in again.',
            status: 401,
            requiresReauth: true
          };
        }

        // Check required permissions
        if (this.options.requiredScopes.length > 0) {
          const hasPermissions = tokenValidation.scopes && 
            this.options.requiredScopes.every(scope => 
              tokenValidation.scopes.includes(scope) || 
              tokenValidation.scopes.includes('repo') // 'repo' includes all other scopes
            );

          if (!hasPermissions) {
            this.logger.warn('Insufficient permissions for user', { 
              userId: session.user?.id,
              requiredScopes: this.options.requiredScopes,
              userScopes: tokenValidation.scopes
            });
            
            return {
              success: false,
              error: `Insufficient permissions. Required: ${this.options.requiredScopes.join(', ')}`,
              status: 403,
              requiredScopes: this.options.requiredScopes,
              userScopes: tokenValidation.scopes
            };
          }
        }

        // Return enhanced session with validation data
        return {
          success: true,
          session: {
            ...session,
            user: {
              ...session.user,
              ...tokenValidation.user
            },
            scopes: tokenValidation.scopes,
            rateLimit: tokenValidation.rateLimit
          }
        };
      }

      return {
        success: false,
        error: 'No GitHub access token found',
        status: 401,
        requiresReauth: true
      };

    } catch (error) {
      this.logger.error('Authentication middleware error', { 
        error: error.message,
        stack: error.stack 
      });
      
      return {
        success: false,
        error: 'Authentication validation failed',
        status: 500
      };
    }
  }

  /**
   * Create authenticated service instance with user's GitHub token
   * @param {Function} ServiceClass - Service class constructor
   * @param {string} accessToken - GitHub access token
   * @param {object} options - Service options
   * @returns {object} Service instance
   */
  createAuthenticatedService(ServiceClass, accessToken, options = {}) {
    if (!accessToken) {
      throw new Error('Access token is required for authenticated service');
    }

    return new ServiceClass(accessToken, {
      ...options,
      userAgent: 'Nebula-Portfolio-Platform',
      baseUrl: process.env.GITHUB_API_URL || 'https://api.github.com'
    });
  }

  /**
   * Middleware wrapper for API routes
   * @param {Function} handler - API route handler
   * @param {object} options - Middleware options
   * @returns {Function} Wrapped handler
   */
  withAuth(handler, options = {}) {
    const middlewareOptions = { ...this.options, ...options };
    
    return async (request, context) => {
      const authResult = await this.authenticate(request);
      
      if (!authResult.success) {
        const { NextResponse } = await import('next/server');
        
        return NextResponse.json(
          {
            error: authResult.error,
            requiresReauth: authResult.requiresReauth,
            requiredScopes: authResult.requiredScopes,
            userScopes: authResult.userScopes
          },
          { status: authResult.status || 401 }
        );
      }

      // Add session to request context
      request.session = authResult.session;
      request.authenticated = !authResult.anonymous;
      
      // Call the original handler
      return handler(request, context);
    };
  }

  /**
   * Check if user has permission to access repository
   * @param {object} session - User session
   * @param {string} owner - Repository owner
   * @param {string} repo - Repository name
   * @param {string} permission - Required permission ('read', 'write', 'admin')
   * @returns {Promise<{hasPermission: boolean, error?: string}>}
   */
  async checkRepositoryPermission(session, owner, repo, permission = 'read') {
    try {
      // User always has permission to their own repositories
      if (session.user.login === owner) {
        return { hasPermission: true };
      }

      // For other repositories, we need to check via GitHub API
      const { Octokit } = await import('@octokit/rest');
      const octokit = new Octokit({
        auth: session.accessToken,
        userAgent: 'Nebula-Portfolio-Platform'
      });

      try {
        const { data: repoData } = await octokit.rest.repos.get({
          owner,
          repo
        });

        // Check if repository is public (read access for everyone)
        if (permission === 'read' && !repoData.private) {
          return { hasPermission: true };
        }

        // For private repositories or write access, check collaborator status
        const { data: permission_data } = await octokit.rest.repos.getCollaboratorPermissionLevel({
          owner,
          repo,
          username: session.user.login
        });

        const userPermission = permission_data.permission;
        
        // Check permission levels
        const permissionLevels = {
          'read': ['read', 'triage', 'write', 'maintain', 'admin'],
          'write': ['write', 'maintain', 'admin'],
          'admin': ['admin']
        };

        const hasPermission = permissionLevels[permission]?.includes(userPermission) || false;
        
        return { hasPermission };

      } catch (apiError) {
        if (apiError.status === 404) {
          return { 
            hasPermission: false, 
            error: 'Repository not found or access denied' 
          };
        }
        
        throw apiError;
      }

    } catch (error) {
      this.logger.error('Repository permission check failed', {
        owner,
        repo,
        permission,
        userId: session.user?.id,
        error: error.message
      });
      
      return { 
        hasPermission: false, 
        error: 'Failed to check repository permissions' 
      };
    }
  }

  /**
   * Validate repository access for operations
   * @param {object} session - User session
   * @param {string} owner - Repository owner
   * @param {string} repo - Repository name
   * @param {string} operation - Operation type ('read', 'write', 'fork')
   * @returns {Promise<{allowed: boolean, error?: string, status?: number}>}
   */
  async validateRepositoryAccess(session, owner, repo, operation = 'read') {
    try {
      // Define required permissions for operations
      const operationPermissions = {
        'read': 'read',
        'write': 'write',
        'fork': 'read', // Forking only requires read access to source
        'delete': 'admin'
      };

      const requiredPermission = operationPermissions[operation] || 'read';
      
      const permissionCheck = await this.checkRepositoryPermission(
        session, 
        owner, 
        repo, 
        requiredPermission
      );

      if (!permissionCheck.hasPermission) {
        return {
          allowed: false,
          error: permissionCheck.error || `Insufficient permissions for ${operation} operation`,
          status: 403
        };
      }

      return { allowed: true };

    } catch (error) {
      this.logger.error('Repository access validation failed', {
        owner,
        repo,
        operation,
        userId: session.user?.id,
        error: error.message
      });
      
      return {
        allowed: false,
        error: 'Failed to validate repository access',
        status: 500
      };
    }
  }
}

/**
 * Create authentication middleware instance
 * @param {object} options - Middleware options
 * @returns {AuthMiddleware} Middleware instance
 */
export function createAuthMiddleware(options = {}) {
  return new AuthMiddleware(options);
}

/**
 * Default authentication middleware for API routes
 */
export const authMiddleware = createAuthMiddleware();

/**
 * Authentication middleware for template operations
 */
export const templateAuthMiddleware = createAuthMiddleware({
  requiredScopes: ['public_repo'],
  allowAnonymous: true // Allow anonymous template browsing
});

/**
 * Authentication middleware for repository operations
 */
export const repositoryAuthMiddleware = createAuthMiddleware({
  requiredScopes: ['public_repo', 'repo'],
  requireAuth: true
});

/**
 * Authentication middleware for editor operations
 */
export const editorAuthMiddleware = createAuthMiddleware({
  requiredScopes: ['repo'],
  requireAuth: true
});