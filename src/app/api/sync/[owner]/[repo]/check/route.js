import { NextResponse } from 'next/server';
import { RepositoryService } from '../../../../../../lib/repository-service.js';
import { validateAuthToken } from '../../../../../../lib/auth.js';

/**
 * Check for synchronization conflicts
 * GET /api/sync/[owner]/[repo]/check
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

    if (!lastKnownSha) {
      return NextResponse.json(
        { error: 'lastKnownSha parameter is required for conflict detection' },
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

    // Check for conflicts
    const conflictResult = await checkSyncConflicts(
      repoService,
      owner,
      repo,
      lastKnownSha,
      branch
    );

    if (!conflictResult.success) {
      return NextResponse.json(
        { error: conflictResult.error },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      sync: conflictResult.sync,
      metadata: {
        owner,
        repo,
        branch,
        lastKnownSha,
        timestamp: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('Sync check API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * Check for synchronization conflicts with local changes
 * POST /api/sync/[owner]/[repo]/check
 */
export async function POST(request, { params }) {
  try {
    const { owner, repo } = params;
    const { lastKnownSha, localChanges, branch } = await request.json();

    // Validate parameters
    if (!owner || !repo || !lastKnownSha) {
      return NextResponse.json(
        { error: 'Owner, repository name, and lastKnownSha are required' },
        { status: 400 }
      );
    }

    if (!localChanges || !Array.isArray(localChanges)) {
      return NextResponse.json(
        { error: 'localChanges array is required' },
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

    // Detect conflicts with local changes
    const conflictResult = await repoService.detectConflicts(
      owner,
      repo,
      localChanges,
      lastKnownSha,
      branch
    );

    if (!conflictResult.success) {
      return NextResponse.json(
        { error: conflictResult.error },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      conflicts: {
        hasConflicts: conflictResult.hasConflicts,
        conflicts: conflictResult.conflicts,
        remoteCommits: conflictResult.remoteCommits,
        summary: {
          totalConflicts: conflictResult.conflicts.length,
          affectedFiles: [...new Set(conflictResult.conflicts.map(c => c.path))],
          conflictTypes: [...new Set(conflictResult.conflicts.map(c => c.type))]
        }
      },
      metadata: {
        owner,
        repo,
        branch,
        lastKnownSha,
        localChangesCount: localChanges.length,
        timestamp: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('Conflict detection API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * Check for synchronization conflicts (basic version without local changes)
 */
async function checkSyncConflicts(repoService, owner, repo, lastKnownSha, branch) {
  try {
    // Get current sync status
    const syncResult = await repoService.getSyncStatus(owner, repo, lastKnownSha, branch);
    
    if (!syncResult.success) {
      return {
        success: false,
        error: syncResult.error
      };
    }

    const sync = {
      upToDate: syncResult.status.upToDate,
      hasRemoteChanges: !syncResult.status.upToDate,
      lastKnownSha,
      latestSha: syncResult.status.latestSha,
      newCommitsCount: syncResult.status.newCommitsCount,
      newCommits: syncResult.status.newCommits,
      branch: syncResult.status.branch,
      conflictRisk: 'unknown', // Cannot determine without local changes
      recommendations: []
    };

    // Generate recommendations based on sync status
    if (!sync.upToDate) {
      sync.recommendations.push({
        type: 'pull_changes',
        priority: 'high',
        message: `Repository has ${sync.newCommitsCount} new commits`,
        action: 'Pull remote changes before making local modifications'
      });

      if (sync.newCommitsCount > 5) {
        sync.recommendations.push({
          type: 'review_changes',
          priority: 'medium',
          message: 'Many changes detected',
          action: 'Review commit history to understand recent changes'
        });
      }
    } else {
      sync.recommendations.push({
        type: 'up_to_date',
        priority: 'info',
        message: 'Repository is up to date',
        action: 'Safe to make local changes'
      });
    }

    return {
      success: true,
      sync
    };

  } catch (error) {
    console.error('Check sync conflicts error:', error);
    return {
      success: false,
      error: `Failed to check sync conflicts: ${error.message}`
    };
  }
}