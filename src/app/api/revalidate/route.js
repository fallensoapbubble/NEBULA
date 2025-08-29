import { revalidatePath } from 'next/cache';
import { NextResponse } from 'next/server';

/**
 * Manual Revalidation API Endpoint
 * Allows manual cache invalidation for ISR pages
 */

export async function POST(request) {
  try {
    // Parse request body
    const body = await request.json();
    const { username, repo, token, paths } = body;

    // Verify revalidation token for security
    if (!verifyRevalidationToken(token)) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Invalid or missing revalidation token' 
        },
        { status: 401 }
      );
    }

    // Validate required parameters
    if (!username || !repo) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Username and repository name are required' 
        },
        { status: 400 }
      );
    }

    const revalidatedPaths = [];
    const errors = [];

    try {
      // Revalidate the main portfolio page
      const portfolioPath = `/${username}/${repo}`;
      await revalidatePath(portfolioPath);
      revalidatedPaths.push(portfolioPath);

      // Revalidate additional paths if specified
      if (paths && Array.isArray(paths)) {
        for (const path of paths) {
          try {
            await revalidatePath(path);
            revalidatedPaths.push(path);
          } catch (pathError) {
            errors.push(`Failed to revalidate ${path}: ${pathError.message}`);
          }
        }
      }

      // Log successful revalidation
      console.log(`Successfully revalidated paths for ${username}/${repo}:`, revalidatedPaths);

      return NextResponse.json({
        success: true,
        revalidated: revalidatedPaths,
        errors: errors.length > 0 ? errors : undefined,
        timestamp: new Date().toISOString()
      });

    } catch (revalidationError) {
      console.error('Revalidation error:', revalidationError);
      
      return NextResponse.json(
        { 
          success: false, 
          error: `Revalidation failed: ${revalidationError.message}`,
          revalidated: revalidatedPaths,
          errors
        },
        { status: 500 }
      );
    }

  } catch (error) {
    console.error('Revalidation API error:', error);
    
    return NextResponse.json(
      { 
        success: false, 
        error: 'Invalid request format or server error' 
      },
      { status: 400 }
    );
  }
}

/**
 * GET endpoint for health check and status
 */
export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const token = searchParams.get('token');

  // Basic health check without token
  if (!token) {
    return NextResponse.json({
      service: 'revalidation-api',
      status: 'healthy',
      timestamp: new Date().toISOString(),
      usage: 'POST with username, repo, and valid token to revalidate cache'
    });
  }

  // Detailed status with valid token
  if (verifyRevalidationToken(token)) {
    return NextResponse.json({
      service: 'revalidation-api',
      status: 'healthy',
      authenticated: true,
      timestamp: new Date().toISOString(),
      endpoints: {
        revalidate: 'POST /api/revalidate',
        webhook: 'POST /api/webhooks/github'
      }
    });
  }

  return NextResponse.json(
    { 
      service: 'revalidation-api',
      status: 'healthy',
      authenticated: false,
      error: 'Invalid token'
    },
    { status: 401 }
  );
}

/**
 * Verify revalidation token
 * In production, this should use a secure token verification method
 */
function verifyRevalidationToken(token) {
  if (!token) {
    return false;
  }

  // Check environment variable for revalidation secret
  const revalidationSecret = process.env.REVALIDATION_SECRET;
  
  if (!revalidationSecret) {
    console.warn('REVALIDATION_SECRET not set, using development mode');
    // In development, accept any non-empty token
    return process.env.NODE_ENV === 'development' && token.length > 0;
  }

  // In production, verify against the secret
  return token === revalidationSecret;
}

/**
 * Rate limiting for revalidation requests
 * Simple in-memory rate limiting (in production, use Redis or similar)
 */
const revalidationRateLimit = new Map();

function checkRateLimit(identifier, maxRequests = 10, windowMs = 60000) {
  const now = Date.now();
  const windowStart = now - windowMs;
  
  // Clean old entries
  for (const [key, requests] of revalidationRateLimit.entries()) {
    const filteredRequests = requests.filter(time => time > windowStart);
    if (filteredRequests.length === 0) {
      revalidationRateLimit.delete(key);
    } else {
      revalidationRateLimit.set(key, filteredRequests);
    }
  }
  
  // Check current requests
  const requests = revalidationRateLimit.get(identifier) || [];
  const recentRequests = requests.filter(time => time > windowStart);
  
  if (recentRequests.length >= maxRequests) {
    return false;
  }
  
  // Add current request
  recentRequests.push(now);
  revalidationRateLimit.set(identifier, recentRequests);
  
  return true;
}