/**
 * NextAuth API Route Handler
 * Note: Temporarily using fallback implementation due to NextAuth v4 + Next.js 15 compatibility issues
 * TODO: Upgrade to NextAuth v5 (Auth.js) for full Next.js 15 support
 */

// Fallback authentication handlers
async function handleAuthRequest(request) {
  const url = new URL(request.url);
  const pathSegments = url.pathname.split('/');
  const action = pathSegments[pathSegments.length - 1];
  
  // Handle different NextAuth endpoints
  switch (action) {
    case 'session':
      return new Response(JSON.stringify({ user: null }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
      
    case 'signin':
      return new Response(JSON.stringify({ 
        url: '/auth/signin',
        message: 'Redirect to sign in page'
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
      
    case 'signout':
      return new Response(JSON.stringify({ 
        url: '/',
        message: 'Signed out successfully'
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
      
    case 'providers':
      return new Response(JSON.stringify({
        github: {
          id: 'github',
          name: 'GitHub',
          type: 'oauth',
          signinUrl: '/auth/signin',
          callbackUrl: '/api/auth/callback/github'
        }
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
      
    default:
      return new Response(JSON.stringify({ 
        error: 'Authentication service in maintenance mode',
        message: 'NextAuth v4 compatibility with Next.js 15 requires upgrade to NextAuth v5'
      }), {
        status: 503,
        headers: { 'Content-Type': 'application/json' }
      });
  }
}

export { handleAuthRequest as GET, handleAuthRequest as POST };