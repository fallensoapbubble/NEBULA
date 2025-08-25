import { NextResponse } from 'next/server';
// Temporarily disabled for build fix
// import { getUserSession, isSessionValid, validateGitHubToken } from '@/lib/github-auth.js';

/**
 * Test endpoint for authentication system
 * This endpoint can be used to verify the authentication system is working
 */
export async function GET(request) {
  return new Response('Temporarily disabled - build fix', { status: 503 });
}

export async function GET_TEMP_DISABLED(request) {
  try {
    // Test session retrieval
    // const session = getUserSession(request);
    
    if (!session) {
      return NextResponse.json({
        status: 'no_session',
        message: 'No active session found',
        authenticated: false
      });
    }
    
    // Test session validation
    const sessionValid = isSessionValid(session);
    
    if (!sessionValid) {
      return NextResponse.json({
        status: 'session_expired',
        message: 'Session has expired',
        authenticated: false,
        session: {
          username: session.username,
          tokenExpiry: session.tokenExpiry
        }
      });
    }
    
    // Test GitHub token validation (optional - only if we want to verify with GitHub)
    // const tokenValidation = await validateGitHubToken(session.accessToken);
    
    return NextResponse.json({
      status: 'authenticated',
      message: 'Authentication system working correctly',
      authenticated: true,
      session: {
        username: session.username,
        githubId: session.githubId,
        permissions: session.permissions,
        tokenExpiry: session.tokenExpiry,
        userData: session.userData
      }
    });
    
  } catch (error) {
    console.error('Authentication test error:', error);
    return NextResponse.json({
      status: 'error',
      message: 'Authentication test failed',
      error: error.message
    }, { status: 500 });
  }
}