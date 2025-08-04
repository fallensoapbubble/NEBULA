import { NextResponse } from 'next/server';
import { RepositoryService } from '../../../../../../lib/repository-service.js';
import { validateAuthToken } from '../../../../../../lib/auth.js';

/**
 * Resolve synchronization conflicts
 * POST /api/sync/[owner]/[repo]/resolve
 */
export async function POST(request, { params }) {
  try {
    const { owner, repo } = params;
    const { 
      conflicts, 
      strategy, 
      manualResolutions, 
      branch,
      commitMessage 
    } = await request.json();

    // Validate parameters
    if (!owner || !repo || !conflicts || !strategy) {
      return NextResponse.json(
        { error: 'Owner, repository name, conflicts, and strategy are required' },
        { status: 400 }
      );
    }

    if (!Array.isArray(conflicts)) {
      return NextResponse.json(
        { error: 'Conflicts must be an array' },
        { status: 400 }
      );
    }

    const validStrategies = ['keep_local', 'keep_remote', 'manual'];
    if (!validStrategies.includes(strategy)) {
      return NextResponse.json(
        { error: `Invalid strategy. Must be one of: ${validStrategies.join(', ')}` },
        { status: 400 }
      );
    }

    if (strategy === 'manual' && !manualResolutions) {
      return NextResponse.json(
        { error: 'Manual resolutions required when using manual strategy' },
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

    // Resolve conflicts
    const resolutionResult = await repoService.resolveConflicts(
      owner,
      repo,
      conflicts,
      strategy,
      manualResolutions || {},
      branch
    );

    if (!resolutionResult.success) {
      return NextResponse.json(
        { error: resolutionResult.error },
        { status: 500 }
      );
    }

    // Create summary commit if multiple files were resolved
    let summaryCommit = null;
    if (resolutionResult.summary.resolved > 1 && commitMessage) {
      const summaryResult = await createResolutionSummaryCommit(
        repoService,
        owner,
        repo,
        resolutionResult,
        commitMessage,
        branch
      );
      
      if (summaryResult.success) {
        summaryCommit = summaryResult.commit;
      }
    }

    return NextResponse.json({
      success: true,
      resolution: {
        strategy,
        summary: resolutionResult.summary,
        resolutions: resolutionResult.resolutions,
        summaryCommit
      },
      metadata: {
        owner,
        repo,
        branch,
        timestamp: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('Conflict resolution API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * Get available conflict resolution strategies
 * GET /api/sync/[owner]/[repo]/resolve
 */
export async function GET(request, { params }) {
  try {
    const { owner, repo } = params;
    const { searchParams } = new URL(request.url);
    const conflictType = searchParams.get('type') || 'all';

    // Validate authentication
    const authResult = await validateAuthToken(request);
    if (!authResult.valid) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Get available resolution strategies
    const strategies = getResolutionStrategies(conflictType);

    return NextResponse.json({
      success: true,
      strategies,
      metadata: {
        owner,
        repo,
        conflictType,
        timestamp: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('Get resolution strategies API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * Create a summary commit for conflict resolution
 */
async function createResolutionSummaryCommit(repoService, owner, repo, resolutionResult, commitMessage, branch) {
  try {
    // Create a summary commit message if not provided
    const message = commitMessage || generateResolutionCommitMessage(resolutionResult);

    // The individual file resolutions have already been committed
    // This is just for creating a summary or tag if needed
    
    // For now, we'll just return the last successful resolution commit
    const successfulResolutions = resolutionResult.resolutions.filter(r => r.success);
    
    if (successfulResolutions.length > 0) {
      const lastResolution = successfulResolutions[successfulResolutions.length - 1];
      return {
        success: true,
        commit: {
          ...lastResolution.commit,
          message: `${message} (${successfulResolutions.length} files resolved)`
        }
      };
    }

    return {
      success: false,
      error: 'No successful resolutions to summarize'
    };

  } catch (error) {
    console.error('Create resolution summary commit error:', error);
    return {
      success: false,
      error: `Failed to create summary commit: ${error.message}`
    };
  }
}

/**
 * Generate commit message for conflict resolution
 */
function generateResolutionCommitMessage(resolutionResult) {
  const { strategy, summary } = resolutionResult;
  
  let message = `Resolve conflicts using ${strategy} strategy`;
  
  if (summary.resolved > 0) {
    message += ` (${summary.resolved} files resolved`;
    
    if (summary.failed > 0) {
      message += `, ${summary.failed} failed`;
    }
    
    message += ')';
  }

  return message;
}

/**
 * Get available conflict resolution strategies
 */
function getResolutionStrategies(conflictType = 'all') {
  const baseStrategies = [
    {
      id: 'keep_local',
      name: 'Keep Local Changes',
      description: 'Keep your local changes and discard remote changes',
      icon: 'user',
      risk: 'medium',
      recommended: false,
      useCases: [
        'When you are confident your changes are correct',
        'When remote changes are not important',
        'When you want to maintain your current work'
      ]
    },
    {
      id: 'keep_remote',
      name: 'Keep Remote Changes',
      description: 'Accept remote changes and discard local changes',
      icon: 'cloud',
      risk: 'high',
      recommended: false,
      useCases: [
        'When remote changes are more important',
        'When your local changes are experimental',
        'When you want to sync with the latest version'
      ]
    },
    {
      id: 'manual',
      name: 'Manual Resolution',
      description: 'Manually resolve each conflict by choosing specific content',
      icon: 'edit',
      risk: 'low',
      recommended: true,
      useCases: [
        'When you need to combine local and remote changes',
        'When conflicts require careful review',
        'When you want maximum control over the resolution'
      ]
    }
  ];

  // Filter strategies based on conflict type if specified
  if (conflictType !== 'all') {
    // Add type-specific filtering logic here if needed
    return baseStrategies;
  }

  return baseStrategies;
}