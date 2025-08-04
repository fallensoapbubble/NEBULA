import { NextResponse } from 'next/server';
import { RepositoryService } from '../../../../../../../lib/repository-service.js';
import { validateAuthToken } from '../../../../../../../lib/auth.js';

/**
 * Pull remote updates and sync repository
 * POST /api/sync/[owner]/[repo]/pull
 */
export async function POST(request, { params }) {
  try {
    const { owner, repo } = params;
    const { 
      branch, 
      strategy = 'merge',
      preserveLocalChanges = false,
      localChanges = []
    } = await request.json();

    // Validate parameters
    if (!owner || !repo) {
      return NextResponse.json(
        { error: 'Owner and repository name are required' },
        { status: 400 }
      );
    }

    const validStrategies = ['merge', 'rebase', 'reset'];
    if (!validStrategies.includes(strategy)) {
      return NextResponse.json(
        { error: `Invalid strategy. Must be one of: ${validStrategies.join(', ')}` },
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

    // Pull remote updates
    const pullResult = await pullRemoteUpdates(
      repoService,
      owner,
      repo,
      branch,
      strategy,
      preserveLocalChanges,
      localChanges
    );

    if (!pullResult.success) {
      return NextResponse.json(
        { error: pullResult.error },
        { status: pullResult.status || 500 }
      );
    }

    return NextResponse.json({
      success: true,
      pull: pullResult.pull,
      metadata: {
        owner,
        repo,
        branch,
        strategy,
        preserveLocalChanges,
        timestamp: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('Pull remote updates API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * Get pull status and preview changes
 * GET /api/sync/[owner]/[repo]/pull
 */
export async function GET(request, { params }) {
  try {
    const { owner, repo } = params;
    const { searchParams } = new URL(request.url);
    
    const branch = searchParams.get('branch') || null;
    const lastKnownSha = searchParams.get('lastKnownSha') || null;

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

    // Get pull preview
    const previewResult = await getPullPreview(
      repoService,
      owner,
      repo,
      branch,
      lastKnownSha
    );

    if (!previewResult.success) {
      return NextResponse.json(
        { error: previewResult.error },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      preview: previewResult.preview,
      metadata: {
        owner,
        repo,
        branch,
        lastKnownSha,
        timestamp: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('Pull preview API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * Pull remote updates with specified strategy
 */
async function pullRemoteUpdates(repoService, owner, repo, branch, strategy, preserveLocalChanges, localChanges) {
  try {
    // Get current repository state
    const latestResult = await repoService.getLatestCommit(owner, repo, branch);
    if (!latestResult.success) {
      return {
        success: false,
        error: 'Failed to get current repository state',
        status: 404
      };
    }

    const currentSha = latestResult.commit.sha;

    // If preserving local changes, we need to handle them carefully
    if (preserveLocalChanges && localChanges.length > 0) {
      return await pullWithLocalChanges(
        repoService,
        owner,
        repo,
        branch,
        strategy,
        localChanges,
        currentSha
      );
    }

    // Simple pull without local changes
    return await performSimplePull(
      repoService,
      owner,
      repo,
      branch,
      strategy,
      currentSha
    );

  } catch (error) {
    console.error('Pull remote updates error:', error);
    return {
      success: false,
      error: `Failed to pull remote updates: ${error.message}`
    };
  }
}

/**
 * Pull remote updates while preserving local changes
 */
async function pullWithLocalChanges(repoService, owner, repo, branch, strategy, localChanges, currentSha) {
  try {
    // First, detect if there are conflicts
    const conflictResult = await repoService.detectConflicts(
      owner,
      repo,
      localChanges,
      currentSha,
      branch
    );

    if (!conflictResult.success) {
      return {
        success: false,
        error: 'Failed to detect conflicts before pull'
      };
    }

    if (conflictResult.hasConflicts) {
      // Cannot pull with conflicts - user must resolve first
      return {
        success: false,
        error: 'Conflicts detected. Resolve conflicts before pulling remote updates.',
        status: 409,
        conflicts: conflictResult.conflicts
      };
    }

    // No conflicts - safe to apply local changes after getting latest
    const latestResult = await repoService.getLatestCommit(owner, repo, branch);
    if (!latestResult.success) {
      return {
        success: false,
        error: 'Failed to get latest commit after conflict check'
      };
    }

    // Apply local changes to the latest commit
    const commitResult = await repoService.createCommit(
      owner,
      repo,
      localChanges.map(change => ({
        path: change.path,
        content: change.content,
        operation: change.operation || 'update'
      })),
      'Apply local changes after pull',
      branch
    );

    if (!commitResult.success) {
      return {
        success: false,
        error: 'Failed to apply local changes after pull'
      };
    }

    return {
      success: true,
      pull: {
        strategy: 'merge_with_local_changes',
        previousSha: currentSha,
        newSha: commitResult.commit.sha,
        localChangesApplied: localChanges.length,
        commit: commitResult.commit,
        conflicts: [],
        summary: {
          filesChanged: localChanges.length,
          remoteCommitsIntegrated: latestResult.commit.sha !== currentSha ? 1 : 0,
          localChangesPreserved: localChanges.length
        }
      }
    };

  } catch (error) {
    console.error('Pull with local changes error:', error);
    return {
      success: false,
      error: `Failed to pull with local changes: ${error.message}`
    };
  }
}

/**
 * Perform simple pull without local changes
 */
async function performSimplePull(repoService, owner, repo, branch, strategy, currentSha) {
  try {
    // Get latest commit to see if there are updates
    const latestResult = await repoService.getLatestCommit(owner, repo, branch);
    if (!latestResult.success) {
      return {
        success: false,
        error: 'Failed to get latest commit'
      };
    }

    const latestSha = latestResult.commit.sha;

    // Check if already up to date
    if (currentSha === latestSha) {
      return {
        success: true,
        pull: {
          strategy,
          previousSha: currentSha,
          newSha: latestSha,
          upToDate: true,
          conflicts: [],
          summary: {
            filesChanged: 0,
            remoteCommitsIntegrated: 0,
            localChangesPreserved: 0
          }
        }
      };
    }

    // Get the commits between current and latest
    const updatesResult = await repoService.checkForUpdates(owner, repo, currentSha, branch);
    if (!updatesResult.success) {
      return {
        success: false,
        error: 'Failed to check for updates'
      };
    }

    // For simple pull, we just update our reference to the latest commit
    // In a real Git scenario, this would involve actual merge/rebase operations
    // Since we're working with GitHub API, we simulate this by acknowledging the new state
    
    return {
      success: true,
      pull: {
        strategy,
        previousSha: currentSha,
        newSha: latestSha,
        upToDate: false,
        remoteCommits: updatesResult.commits,
        conflicts: [],
        summary: {
          filesChanged: 0, // Would need to calculate from commits
          remoteCommitsIntegrated: updatesResult.commits.length,
          localChangesPreserved: 0
        }
      }
    };

  } catch (error) {
    console.error('Perform simple pull error:', error);
    return {
      success: false,
      error: `Failed to perform simple pull: ${error.message}`
    };
  }
}

/**
 * Get preview of what would be pulled
 */
async function getPullPreview(repoService, owner, repo, branch, lastKnownSha) {
  try {
    // Get current state
    const latestResult = await repoService.getLatestCommit(owner, repo, branch);
    if (!latestResult.success) {
      return {
        success: false,
        error: 'Failed to get current repository state'
      };
    }

    const currentSha = latestResult.commit.sha;
    const baseSha = lastKnownSha || currentSha;

    // Check if there are updates
    if (baseSha === currentSha) {
      return {
        success: true,
        preview: {
          upToDate: true,
          hasUpdates: false,
          commits: [],
          filesChanged: [],
          summary: {
            commitsToIntegrate: 0,
            filesAffected: 0,
            additions: 0,
            deletions: 0
          }
        }
      };
    }

    // Get updates since last known SHA
    const updatesResult = await repoService.checkForUpdates(owner, repo, baseSha, branch);
    if (!updatesResult.success) {
      return {
        success: false,
        error: 'Failed to check for updates'
      };
    }

    // Get detailed diff if there are updates
    let filesChanged = [];
    let summary = {
      commitsToIntegrate: updatesResult.commits.length,
      filesAffected: 0,
      additions: 0,
      deletions: 0
    };

    if (updatesResult.hasUpdates) {
      // Get diff between base and current
      try {
        const { data: comparison } = await repoService.executeWithRetry(
          () => repoService.octokit.rest.repos.compareCommits({
            owner,
            repo,
            base: baseSha,
            head: currentSha
          }),
          `compare commits for pull preview ${owner}/${repo}`
        );

        if (comparison.files) {
          filesChanged = comparison.files.map(file => ({
            filename: file.filename,
            status: file.status,
            additions: file.additions,
            deletions: file.deletions,
            changes: file.changes,
            patch: file.patch ? file.patch.substring(0, 1000) : null // Truncate for preview
          }));

          summary.filesAffected = filesChanged.length;
          summary.additions = filesChanged.reduce((sum, f) => sum + f.additions, 0);
          summary.deletions = filesChanged.reduce((sum, f) => sum + f.deletions, 0);
        }
      } catch (diffError) {
        console.warn('Could not get detailed diff for pull preview:', diffError);
        // Continue without detailed file changes
      }
    }

    return {
      success: true,
      preview: {
        upToDate: false,
        hasUpdates: updatesResult.hasUpdates,
        baseSha,
        targetSha: currentSha,
        commits: updatesResult.commits,
        filesChanged,
        summary,
        recommendations: generatePullRecommendations(updatesResult.commits.length, summary.filesAffected)
      }
    };

  } catch (error) {
    console.error('Get pull preview error:', error);
    return {
      success: false,
      error: `Failed to get pull preview: ${error.message}`
    };
  }
}

/**
 * Generate recommendations for pull operation
 */
function generatePullRecommendations(commitCount, fileCount) {
  const recommendations = [];

  if (commitCount === 0) {
    recommendations.push({
      type: 'up_to_date',
      priority: 'info',
      message: 'Repository is up to date',
      action: 'No pull needed'
    });
  } else if (commitCount <= 3 && fileCount <= 10) {
    recommendations.push({
      type: 'safe_pull',
      priority: 'low',
      message: 'Small number of changes detected',
      action: 'Safe to pull without review'
    });
  } else if (commitCount <= 10 && fileCount <= 50) {
    recommendations.push({
      type: 'review_recommended',
      priority: 'medium',
      message: 'Moderate changes detected',
      action: 'Review changes before pulling'
    });
  } else {
    recommendations.push({
      type: 'careful_review',
      priority: 'high',
      message: 'Large number of changes detected',
      action: 'Carefully review all changes before pulling'
    });
  }

  if (fileCount > 20) {
    recommendations.push({
      type: 'backup_recommended',
      priority: 'medium',
      message: 'Many files will be affected',
      action: 'Consider backing up local changes before pulling'
    });
  }

  return recommendations;
}