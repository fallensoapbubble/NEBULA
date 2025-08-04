import { NextResponse } from 'next/server';
import { RepositoryService } from '../../../../../../lib/repository-service.js';
import { validateAuthToken } from '../../../../../../lib/auth.js';

/**
 * Get repository synchronization status
 * GET /api/repositories/[owner]/[repo]/status
 */
export async function GET(request, { params }) {
  try {
    const { owner, repo } = params;
    const { searchParams } = new URL(request.url);
    
    // Get query parameters
    const lastKnownSha = searchParams.get('lastKnownSha');
    const branch = searchParams.get('branch') || null;

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

    let syncStatus;

    if (lastKnownSha) {
      // Get detailed sync status with comparison
      const syncResult = await repoService.getSyncStatus(
        owner,
        repo,
        lastKnownSha,
        branch
      );

      if (!syncResult.success) {
        return NextResponse.json(
          { error: syncResult.error },
          { status: 500 }
        );
      }

      syncStatus = syncResult.status;
    } else {
      // Just get latest commit info
      const latestResult = await repoService.getLatestCommit(owner, repo, branch);

      if (!latestResult.success) {
        return NextResponse.json(
          { error: latestResult.error },
          { status: 500 }
        );
      }

      syncStatus = {
        upToDate: null, // Cannot determine without lastKnownSha
        lastKnownSha: null,
        latestSha: latestResult.commit.sha,
        newCommitsCount: null,
        newCommits: [],
        branch: latestResult.commit.branch,
        lastChecked: new Date().toISOString(),
        latestCommit: latestResult.commit
      };
    }

    // Get rate limit status for additional context
    const rateLimitStatus = repoService.getRateLimitStatus();

    return NextResponse.json({
      success: true,
      status: syncStatus,
      rateLimit: {
        remaining: rateLimitStatus.rateLimit.remaining,
        limit: rateLimitStatus.rateLimit.limit,
        resetTime: new Date(rateLimitStatus.rateLimit.reset).toISOString()
      },
      metadata: {
        owner,
        repo,
        branch,
        timestamp: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('Get repository status API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * Update repository sync tracking
 * POST /api/repositories/[owner]/[repo]/status
 */
export async function POST(request, { params }) {
  try {
    const { owner, repo } = params;
    const { lastKnownSha, branch } = await request.json();

    // Validate parameters
    if (!owner || !repo || !lastKnownSha) {
      return NextResponse.json(
        { error: 'Owner, repository name, and lastKnownSha are required' },
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

    // Verify the provided SHA exists
    const latestResult = await repoService.getLatestCommit(owner, repo, branch);
    
    if (!latestResult.success) {
      return NextResponse.json(
        { error: 'Failed to verify repository status' },
        { status: 500 }
      );
    }

    // For now, we just return the updated sync status
    // In a full implementation, this might update a database record
    const syncResult = await repoService.getSyncStatus(
      owner,
      repo,
      lastKnownSha,
      branch
    );

    if (!syncResult.success) {
      return NextResponse.json(
        { error: syncResult.error },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Sync status updated',
      status: syncResult.status,
      metadata: {
        owner,
        repo,
        branch,
        timestamp: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('Update repository status API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}