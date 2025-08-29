import { revalidatePath, revalidateTag } from 'next/cache';
import { NextResponse } from 'next/server';

/**
 * Specific Cache Clearing API
 * Allows clearing cache for specific repositories with more granular control
 */

export async function POST(request, { params }) {
  try {
    const { owner, repo } = params;
    
    // Parse request body for additional options
    const body = await request.json().catch(() => ({}));
    const { token, tags, paths, force } = body;

    // Verify authorization
    if (!verifyAuthToken(token)) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Invalid or missing authorization token' 
        },
        { status: 401 }
      );
    }

    // Validate parameters
    if (!owner || !repo) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Owner and repository name are required' 
        },
        { status: 400 }
      );
    }

    const clearedPaths = [];
    const clearedTags = [];
    const errors = [];

    try {
      // Clear main portfolio path
      const portfolioPath = `/${owner}/${repo}`;
      await revalidatePath(portfolioPath);
      clearedPaths.push(portfolioPath);

      // Clear additional paths if specified
      if (paths && Array.isArray(paths)) {
        for (const path of paths) {
          try {
            await revalidatePath(path);
            clearedPaths.push(path);
          } catch (pathError) {
            errors.push(`Failed to clear path ${path}: ${pathError.message}`);
          }
        }
      }

      // Clear cache tags if specified
      if (tags && Array.isArray(tags)) {
        for (const tag of tags) {
          try {
            await revalidateTag(tag);
            clearedTags.push(tag);
          } catch (tagError) {
            errors.push(`Failed to clear tag ${tag}: ${tagError.message}`);
          }
        }
      }

      // Clear repository-specific tags
      const repoTags = [
        `repo-${owner}-${repo}`,
        `user-${owner}`,
        `portfolio-${owner}-${repo}`
      ];

      for (const tag of repoTags) {
        try {
          await revalidateTag(tag);
          clearedTags.push(tag);
        } catch (tagError) {
          errors.push(`Failed to clear repo tag ${tag}: ${tagError.message}`);
        }
      }

      // Log cache clearing
      console.log(`Cache cleared for ${owner}/${repo}:`, {
        paths: clearedPaths,
        tags: clearedTags,
        errors
      });

      return NextResponse.json({
        success: true,
        repository: `${owner}/${repo}`,
        cleared: {
          paths: clearedPaths,
          tags: clearedTags
        },
        errors: errors.length > 0 ? errors : undefined,
        timestamp: new Date().toISOString()
      });

    } catch (clearError) {
      console.error('Cache clearing error:', clearError);
      
      return NextResponse.json(
        { 
          success: false, 
          error: `Cache clearing failed: ${clearError.message}`,
          cleared: {
            paths: clearedPaths,
            tags: clearedTags
          },
          errors
        },
        { status: 500 }
      );
    }

  } catch (error) {
    console.error('Cache clear API error:', error);
    
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
 * GET endpoint for cache status
 */
export async function GET(request, { params }) {
  const { owner, repo } = params;
  const { searchParams } = new URL(request.url);
  const token = searchParams.get('token');

  // Basic status without token
  if (!token) {
    return NextResponse.json({
      service: 'cache-management',
      repository: `${owner}/${repo}`,
      status: 'healthy',
      timestamp: new Date().toISOString(),
      usage: 'POST with valid token to clear cache'
    });
  }

  // Detailed status with valid token
  if (verifyAuthToken(token)) {
    return NextResponse.json({
      service: 'cache-management',
      repository: `${owner}/${repo}`,
      status: 'healthy',
      authenticated: true,
      availableOperations: {
        clearPaths: 'Clear specific URL paths',
        clearTags: 'Clear cache tags',
        clearRepository: 'Clear all repository-related cache'
      },
      defaultTags: [
        `repo-${owner}-${repo}`,
        `user-${owner}`,
        `portfolio-${owner}-${repo}`
      ],
      timestamp: new Date().toISOString()
    });
  }

  return NextResponse.json(
    { 
      service: 'cache-management',
      repository: `${owner}/${repo}`,
      status: 'healthy',
      authenticated: false,
      error: 'Invalid token'
    },
    { status: 401 }
  );
}

/**
 * DELETE endpoint for complete cache clearing
 */
export async function DELETE(request, { params }) {
  try {
    const { owner, repo } = params;
    
    // Parse request body for token
    const body = await request.json().catch(() => ({}));
    const { token } = body;

    // Verify authorization
    if (!verifyAuthToken(token)) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Invalid or missing authorization token' 
        },
        { status: 401 }
      );
    }

    // Clear all cache for this repository
    const portfolioPath = `/${owner}/${repo}`;
    const allTags = [
      `repo-${owner}-${repo}`,
      `user-${owner}`,
      `portfolio-${owner}-${repo}`,
      `template-${owner}-${repo}`,
      `content-${owner}-${repo}`
    ];

    const clearedPaths = [];
    const clearedTags = [];
    const errors = [];

    // Clear main path
    try {
      await revalidatePath(portfolioPath);
      clearedPaths.push(portfolioPath);
    } catch (error) {
      errors.push(`Failed to clear path ${portfolioPath}: ${error.message}`);
    }

    // Clear all related tags
    for (const tag of allTags) {
      try {
        await revalidateTag(tag);
        clearedTags.push(tag);
      } catch (error) {
        errors.push(`Failed to clear tag ${tag}: ${error.message}`);
      }
    }

    console.log(`Complete cache clear for ${owner}/${repo}:`, {
      paths: clearedPaths,
      tags: clearedTags,
      errors
    });

    return NextResponse.json({
      success: true,
      operation: 'complete-cache-clear',
      repository: `${owner}/${repo}`,
      cleared: {
        paths: clearedPaths,
        tags: clearedTags
      },
      errors: errors.length > 0 ? errors : undefined,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Complete cache clear error:', error);
    
    return NextResponse.json(
      { 
        success: false, 
        error: 'Cache clear operation failed' 
      },
      { status: 500 }
    );
  }
}

/**
 * Verify authorization token
 */
function verifyAuthToken(token) {
  if (!token) {
    return false;
  }

  // Check for cache management token
  const cacheSecret = process.env.CACHE_MANAGEMENT_SECRET || process.env.REVALIDATION_SECRET;
  
  if (!cacheSecret) {
    console.warn('CACHE_MANAGEMENT_SECRET not set, using development mode');
    // In development, accept any non-empty token
    return process.env.NODE_ENV === 'development' && token.length > 0;
  }

  return token === cacheSecret;
}