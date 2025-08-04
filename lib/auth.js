/**
 * Authentication utilities for GitHub OAuth
 */

/**
 * Validate authentication token from request
 * @param {Request} request - Next.js request object
 * @returns {Promise<{valid: boolean, accessToken?: string, user?: object, error?: string}>}
 */
export async function validateAuthToken(request) {
  try {
    // Check for Authorization header
    const authHeader = request.headers.get('authorization');
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      
      // Validate token with GitHub API
      const validation = await validateGitHubToken(token);
      if (validation.valid) {
        return {
          valid: true,
          accessToken: token,
          user: validation.user
        };
      }
    }

    // Check for session cookie (if using cookie-based auth)
    const cookies = request.headers.get('cookie');
    if (cookies) {
      const sessionToken = extractSessionToken(cookies);
      if (sessionToken) {
        const validation = await validateSessionToken(sessionToken);
        if (validation.valid) {
          return {
            valid: true,
            accessToken: validation.accessToken,
            user: validation.user
          };
        }
      }
    }

    return {
      valid: false,
      error: 'No valid authentication found'
    };

  } catch (error) {
    console.error('Auth validation error:', error);
    return {
      valid: false,
      error: 'Authentication validation failed'
    };
  }
}

/**
 * Validate GitHub access token
 * @param {string} token - GitHub access token
 * @returns {Promise<{valid: boolean, user?: object, error?: string}>}
 */
async function validateGitHubToken(token) {
  try {
    const response = await fetch('https://api.github.com/user', {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/vnd.github.v3+json',
        'User-Agent': 'Nebula-Portfolio-Platform'
      }
    });

    if (response.ok) {
      const user = await response.json();
      return {
        valid: true,
        user: {
          id: user.id,
          login: user.login,
          name: user.name,
          email: user.email,
          avatar_url: user.avatar_url
        }
      };
    }

    return {
      valid: false,
      error: 'Invalid GitHub token'
    };

  } catch (error) {
    console.error('GitHub token validation error:', error);
    return {
      valid: false,
      error: 'Token validation failed'
    };
  }
}

/**
 * Extract session token from cookies
 * @param {string} cookieHeader - Cookie header string
 * @returns {string|null} Session token or null
 */
function extractSessionToken(cookieHeader) {
  const cookies = cookieHeader.split(';').map(c => c.trim());
  
  for (const cookie of cookies) {
    if (cookie.startsWith('github_session=')) {
      return cookie.substring('github_session='.length);
    }
  }
  
  return null;
}

/**
 * Validate session token (placeholder for session-based auth)
 * @param {string} sessionToken - Session token
 * @returns {Promise<{valid: boolean, accessToken?: string, user?: object, error?: string}>}
 */
async function validateSessionToken(sessionToken) {
  // This would typically validate against a session store
  // For now, return invalid since we're using token-based auth
  return {
    valid: false,
    error: 'Session-based auth not implemented'
  };
}