import { NextResponse } from 'next/server';
import { RepositoryService } from '../../../../../../lib/repository-service.js';
import { validateAuthToken } from '../../../../../../lib/auth.js';

/**
 * Get diff comparison between commits or branches
 * GET /api/sync/[owner]/[repo]/diff
 */
export async function GET(request, { params }) {
  try {
    const { owner, repo } = params;
    const { searchParams } = new URL(request.url);
    
    // Get query parameters
    const base = searchParams.get('base'); // Base commit/branch
    const head = searchParams.get('head'); // Head commit/branch
    const path = searchParams.get('path') || null; // Optional file path filter
    const format = searchParams.get('format') || 'unified'; // diff format

    // Validate parameters
    if (!owner || !repo) {
      return NextResponse.json(
        { error: 'Owner and repository name are required' },
        { status: 400 }
      );
    }

    if (!base || !head) {
      return NextResponse.json(
        { error: 'Both base and head parameters are required' },
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

    // Get diff comparison
    const diffResult = await getDiffComparison(
      repoService,
      owner,
      repo,
      base,
      head,
      path,
      format
    );

    if (!diffResult.success) {
      return NextResponse.json(
        { error: diffResult.error },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      diff: diffResult.diff,
      metadata: {
        owner,
        repo,
        base,
        head,
        path,
        format,
        timestamp: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('Diff comparison API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * Compare local changes with remote state
 * POST /api/sync/[owner]/[repo]/diff
 */
export async function POST(request, { params }) {
  try {
    const { owner, repo } = params;
    const { localChanges, baseSha, targetSha } = await request.json();

    // Validate parameters
    if (!owner || !repo || !localChanges || !baseSha) {
      return NextResponse.json(
        { error: 'Owner, repository name, localChanges, and baseSha are required' },
        { status: 400 }
      );
    }

    if (!Array.isArray(localChanges)) {
      return NextResponse.json(
        { error: 'localChanges must be an array' },
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

    // Compare local changes with remote state
    const comparisonResult = await compareLocalChanges(
      repoService,
      owner,
      repo,
      localChanges,
      baseSha,
      targetSha
    );

    if (!comparisonResult.success) {
      return NextResponse.json(
        { error: comparisonResult.error },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      comparison: comparisonResult.comparison,
      metadata: {
        owner,
        repo,
        baseSha,
        targetSha,
        localChangesCount: localChanges.length,
        timestamp: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('Local changes comparison API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * Get diff comparison between two commits/branches
 */
async function getDiffComparison(repoService, owner, repo, base, head, path, format) {
  try {
    // Use GitHub API to get comparison
    const params = {
      owner,
      repo,
      base,
      head
    };

    const { data: comparison } = await repoService.executeWithRetry(
      () => repoService.octokit.rest.repos.compareCommits(params),
      `compare commits ${owner}/${repo} ${base}...${head}`
    );

    // Process the comparison data
    const diff = {
      status: comparison.status, // 'ahead', 'behind', 'identical', 'diverged'
      aheadBy: comparison.ahead_by,
      behindBy: comparison.behind_by,
      totalCommits: comparison.total_commits,
      commits: comparison.commits.map(commit => ({
        sha: commit.sha,
        message: commit.commit.message,
        author: {
          name: commit.commit.author.name,
          email: commit.commit.author.email,
          date: commit.commit.author.date,
          login: commit.author?.login,
          avatar_url: commit.author?.avatar_url
        },
        url: commit.html_url
      })),
      files: []
    };

    // Process file changes
    if (comparison.files) {
      for (const file of comparison.files) {
        // Filter by path if specified
        if (path && !file.filename.includes(path)) {
          continue;
        }

        const fileChange = {
          filename: file.filename,
          status: file.status, // 'added', 'removed', 'modified', 'renamed'
          additions: file.additions,
          deletions: file.deletions,
          changes: file.changes,
          patch: file.patch,
          previousFilename: file.previous_filename,
          blobUrl: file.blob_url,
          rawUrl: file.raw_url,
          contentsUrl: file.contents_url
        };

        // Parse patch for better diff visualization
        if (file.patch && format === 'structured') {
          fileChange.structuredDiff = parsePatch(file.patch);
        }

        diff.files.push(fileChange);
      }
    }

    // Add summary statistics
    diff.summary = {
      filesChanged: diff.files.length,
      totalAdditions: diff.files.reduce((sum, f) => sum + f.additions, 0),
      totalDeletions: diff.files.reduce((sum, f) => sum + f.deletions, 0),
      filesByStatus: {
        added: diff.files.filter(f => f.status === 'added').length,
        modified: diff.files.filter(f => f.status === 'modified').length,
        removed: diff.files.filter(f => f.status === 'removed').length,
        renamed: diff.files.filter(f => f.status === 'renamed').length
      }
    };

    return {
      success: true,
      diff
    };

  } catch (error) {
    console.error('Get diff comparison error:', error);
    
    if (error.status === 404) {
      return {
        success: false,
        error: 'One or both commits/branches not found'
      };
    }

    return {
      success: false,
      error: `Failed to get diff comparison: ${error.message}`
    };
  }
}

/**
 * Compare local changes with remote state
 */
async function compareLocalChanges(repoService, owner, repo, localChanges, baseSha, targetSha) {
  try {
    const comparison = {
      baseSha,
      targetSha: targetSha || null,
      localChanges: localChanges.length,
      conflicts: [],
      safeToApply: true,
      recommendations: []
    };

    // Get target SHA if not provided (use latest commit)
    if (!targetSha) {
      const latestResult = await repoService.getLatestCommit(owner, repo);
      if (latestResult.success) {
        comparison.targetSha = latestResult.commit.sha;
      } else {
        return {
          success: false,
          error: 'Failed to get latest commit for comparison'
        };
      }
    }

    // If base and target are the same, no remote changes
    if (baseSha === comparison.targetSha) {
      comparison.recommendations.push({
        type: 'no_remote_changes',
        message: 'No remote changes detected',
        action: 'Safe to apply local changes'
      });

      return {
        success: true,
        comparison
      };
    }

    // Get diff between base and target
    const diffResult = await getDiffComparison(
      repoService,
      owner,
      repo,
      baseSha,
      comparison.targetSha,
      null,
      'structured'
    );

    if (!diffResult.success) {
      return {
        success: false,
        error: 'Failed to get remote changes diff'
      };
    }

    const remoteDiff = diffResult.diff;
    comparison.remoteChanges = {
      commits: remoteDiff.totalCommits,
      filesChanged: remoteDiff.summary.filesChanged,
      additions: remoteDiff.summary.totalAdditions,
      deletions: remoteDiff.summary.totalDeletions
    };

    // Check for conflicts between local and remote changes
    const remoteFiles = new Set(remoteDiff.files.map(f => f.filename));
    const localFiles = new Set(localChanges.map(c => c.path));
    const conflictingFiles = [...localFiles].filter(f => remoteFiles.has(f));

    if (conflictingFiles.length > 0) {
      comparison.safeToApply = false;
      
      for (const filePath of conflictingFiles) {
        const localChange = localChanges.find(c => c.path === filePath);
        const remoteChange = remoteDiff.files.find(f => f.filename === filePath);

        comparison.conflicts.push({
          path: filePath,
          type: 'concurrent_modification',
          local: {
            operation: localChange.operation || 'modify',
            hasContent: !!localChange.content
          },
          remote: {
            status: remoteChange.status,
            additions: remoteChange.additions,
            deletions: remoteChange.deletions,
            changes: remoteChange.changes
          },
          severity: calculateConflictSeverity(localChange, remoteChange)
        });
      }

      comparison.recommendations.push({
        type: 'conflicts_detected',
        message: `${conflictingFiles.length} files have conflicting changes`,
        action: 'Resolve conflicts before applying local changes'
      });
    } else {
      comparison.recommendations.push({
        type: 'no_conflicts',
        message: 'No conflicts detected between local and remote changes',
        action: 'Safe to apply local changes'
      });
    }

    // Add recommendations based on change volume
    if (remoteDiff.totalCommits > 10) {
      comparison.recommendations.push({
        type: 'many_remote_changes',
        message: `${remoteDiff.totalCommits} commits behind remote`,
        action: 'Consider reviewing remote changes before applying local changes'
      });
    }

    return {
      success: true,
      comparison
    };

  } catch (error) {
    console.error('Compare local changes error:', error);
    return {
      success: false,
      error: `Failed to compare local changes: ${error.message}`
    };
  }
}

/**
 * Parse unified diff patch into structured format
 */
function parsePatch(patch) {
  const lines = patch.split('\n');
  const hunks = [];
  let currentHunk = null;

  for (const line of lines) {
    if (line.startsWith('@@')) {
      // New hunk header
      const match = line.match(/@@ -(\d+),?(\d*) \+(\d+),?(\d*) @@/);
      if (match) {
        currentHunk = {
          oldStart: parseInt(match[1]),
          oldLines: parseInt(match[2]) || 1,
          newStart: parseInt(match[3]),
          newLines: parseInt(match[4]) || 1,
          lines: []
        };
        hunks.push(currentHunk);
      }
    } else if (currentHunk) {
      // Hunk content line
      const type = line[0] === '+' ? 'addition' : 
                   line[0] === '-' ? 'deletion' : 'context';
      
      currentHunk.lines.push({
        type,
        content: line.substring(1),
        oldLineNumber: type !== 'addition' ? currentHunk.oldStart + currentHunk.lines.filter(l => l.type !== 'addition').length : null,
        newLineNumber: type !== 'deletion' ? currentHunk.newStart + currentHunk.lines.filter(l => l.type !== 'deletion').length : null
      });
    }
  }

  return hunks;
}

/**
 * Calculate conflict severity based on change types
 */
function calculateConflictSeverity(localChange, remoteChange) {
  // Simple heuristic for conflict severity
  let severity = 'low';

  if (remoteChange.status === 'removed' && localChange.operation === 'update') {
    severity = 'high'; // File deleted remotely but modified locally
  } else if (localChange.operation === 'delete' && remoteChange.status === 'modified') {
    severity = 'high'; // File deleted locally but modified remotely
  } else if (remoteChange.changes > 50) {
    severity = 'medium'; // Large remote changes
  }

  return severity;
}