import { NextResponse } from 'next/server';
import { RepositoryService } from '../../../../../lib/repository-service.js';
import { validateAuthToken } from '../../../../../lib/auth.js';

/**
 * Get repository information
 * GET /api/repositories/[owner]/[repo]
 */
export async function GET(request, { params }) {
  try {
    const { owner, repo } = params;

    // Validate parameters
    if (!owner || !repo) {
      return NextResponse.json(
        { error: 'Owner and repository name are required' },
        { status: 400 }
      );
    }

    // Validate authentication
    const authResult = await validateAuthToken(request);
    if (!authResult.valid) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Initialize repository service
    const repoService = new RepositoryService(authResult.accessToken);

    // Verify fork exists and get repository info
    const verifyResult = await repoService.verifyFork(owner, repo);

    if (!verifyResult.verified) {
      return NextResponse.json(
        { error: verifyResult.error || 'Repository not found' },
        { status: 404 }
      );
    }

    // Get additional repository health status
    const healthStatus = await repoService.checkServiceHealth();

    return NextResponse.json({
      success: true,
      repository: verifyResult.repository,
      health: {
        healthy: healthStatus.healthy,
        rateLimit: healthStatus.rateLimit,
        timestamp: healthStatus.timestamp
      }
    });

  } catch (error) {
    console.error('Get repository info API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * Update repository settings (if needed in the future)
 * PUT /api/repositories/[owner]/[repo]
 */
export async function PUT(request, { params }) {
  try {
    const { owner, repo } = params;

    // Validate authentication
    const authResult = await validateAuthToken(request);
    if (!authResult.valid) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // For now, return method not implemented
    // This can be extended later for repository settings updates
    return NextResponse.json(
      { error: 'Repository updates not yet implemented' },
      { status: 501 }
    );

  } catch (error) {
    console.error('Update repository API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}