import { Octokit } from '@octokit/rest';

/**
 * GitHub Authentication Utility
 * Handles token validation, refresh, and user session management
 */

/**
 * Validate GitHub access token
 * @param {string} accessToken - GitHub access token
 * @returns {Promise<{valid: boolean, user?: object, error?: string}>}
 */
export async function validateGitHubToken(accessToken) {
  if (!accessToken) {
    return { valid: false, error: 'No access token provided' };
  }
  
  try {
    const octokit = new Octokit({
      auth: accessToken,
      userAgent: 'Nebula-Portfolio-Platform'
    });
    
    // Test token by getting user data
    const { data: user } = await octokit.rest.users.getAuthenticated();
    
    // Check token scopes
    const { headers } = await octokit.request('GET /user');
    const scopes = headers['x-oauth-scopes'] ? headers['x-oauth-scopes'].split(', ') : [];
    
    return {
      valid: true,
      user,
      scopes,
      rateLimit: {
        limit: parseInt(headers['x-ratelimit-limit']) || 0,
        remaining: parseInt(headers['x-ratelimit-remaining']) || 0,
        reset: new Date(parseInt(headers['x-ratelimit-reset']) * 1000)
      }
    };
    
  } catch (error) {
    console.error('Token validation error:', error);
    
    if (error.status === 401) {
      return { valid: false, error: 'Invalid or expired token' };
    }
    
    if (error.status === 403) {
      return { valid: false, error: 'Token lacks required permissions' };
    }
    
    return { valid: false, error: 'Token validation failed' };
  }
}

/**
 * Refresh GitHub access token
 * @param {string} refreshToken - GitHub refresh token
 * @returns {Promise<{success: boolean, tokens?: object, error?: string}>}
 */
export async function refreshGitHubToken(refreshToken) {
  if (!refreshToken) {
    return { success: false, error: 'No refresh token provided' };
  }
  
  try {
    const clientId = process.env.GITHUB_CLIENT_ID;
    const clientSecret = process.env.GITHUB_CLIENT_SECRET;
    
    if (!clientId || !clientSecret) {
      throw new Error('GitHub OAuth credentials not configured');
    }
    
    const response = await fetch('https://github.com/login/oauth/access_token', {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'User-Agent': 'Nebula-Portfolio-Platform'
      },
      body: JSON.stringify({
        client_id: clientId,
        client_secret: clientSecret,
        refresh_token: refreshToken,
        grant_type: 'refresh_token'
      })
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Token refresh failed: ${response.status} ${errorText}`);
    }
    
    const data = await response.json();
    
    if (data.error) {
      return { 
        success: false, 
        error: `GitHub OAuth error: ${data.error_description || data.error}` 
      };
    }
    
    return {
      success: true,
      tokens: {
        accessToken: data.access_token,
        refreshToken: data.refresh_token || refreshToken, // GitHub may not always return new refresh token
        expiresIn: data.expires_in || 3600,
        scope: data.scope
      }
    };
    
  } catch (error) {
    console.error('Token refresh error:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Get user session from request cookies
 * @param {Request} request - Next.js request object
 * @returns {object|null} User session data or null if not authenticated
 */
export function getUserSession(request) {
  try {
    const cookies = request.cookies;
    
    const githubId = cookies.get('github_session_id')?.value;
    const username = cookies.get('github_username')?.value;
    const accessToken = cookies.get('github_access_token')?.value;
    const refreshToken = cookies.get('github_refresh_token')?.value;
    const tokenExpiry = cookies.get('github_token_expiry')?.value;
    const permissions = cookies.get('github_permissions')?.value;
    const userData = cookies.get('github_user_data')?.value;
    
    if (!githubId || !username || !accessToken) {
      return null;
    }
    
    return {
      githubId,
      username,
      accessToken,
      refreshToken,
      tokenExpiry: tokenExpiry ? new Date(tokenExpiry) : null,
      permissions: permissions ? permissions.split(',') : [],
      userData: userData ? JSON.parse(userData) : null
    };
    
  } catch (error) {
    console.error('Error parsing user session:', error);
    return null;
  }
}

/**
 * Check if user session is valid and not expired
 * @param {object} session - User session object
 * @returns {boolean} True if session is valid
 */
export function isSessionValid(session) {
  if (!session || !session.accessToken) {
    return false;
  }
  
  // Check if token is expired (with 5 minute buffer)
  if (session.tokenExpiry) {
    const now = new Date();
    const expiry = new Date(session.tokenExpiry);
    const buffer = 5 * 60 * 1000; // 5 minutes in milliseconds
    
    if (now.getTime() > (expiry.getTime() - buffer)) {
      return false;
    }
  }
  
  return true;
}

/**
 * Check if user has required GitHub permissions
 * @param {object} session - User session object
 * @param {string[]} requiredScopes - Required OAuth scopes
 * @returns {boolean} True if user has all required permissions
 */
export function hasRequiredPermissions(session, requiredScopes = ['public_repo']) {
  if (!session || !session.permissions) {
    return false;
  }
  
  return requiredScopes.every(scope => 
    session.permissions.includes(scope) || 
    session.permissions.includes('repo') // 'repo' includes 'public_repo'
  );
}

/**
 * Create Octokit instance with user's access token
 * @param {string} accessToken - GitHub access token
 * @returns {Octokit} Configured Octokit instance
 */
export function createGitHubClient(accessToken) {
  return new Octokit({
    auth: accessToken,
    userAgent: 'Nebula-Portfolio-Platform',
    baseUrl: process.env.GITHUB_API_URL || 'https://api.github.com'
  });
}

/**
 * Logout user by clearing session cookies
 * @param {NextResponse} response - Next.js response object
 */
export function clearUserSession(response) {
  const clearOptions = {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 0,
    path: '/'
  };
  
  const sessionCookies = [
    'github_session_id',
    'github_username', 
    'github_access_token',
    'github_refresh_token',
    'github_token_expiry',
    'github_permissions'
  ];
  
  sessionCookies.forEach(cookieName => {
    response.cookies.set(cookieName, '', clearOptions);
  });
  
  // Clear user data cookie (not httpOnly)
  response.cookies.set('github_user_data', '', {
    ...clearOptions,
    httpOnly: false
  });
}