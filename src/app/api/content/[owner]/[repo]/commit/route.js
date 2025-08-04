import { NextResponse } from 'next/server';
import { RepositoryService } from '../../../../../../../lib/repository-service.js';
import { validateAuthToken } from '../../../../../../../lib/auth.js';

/**
 * Create a batch commit with multiple file changes
 * POST /api/content/[owner]/[repo]/commit
 */
export async function POST(request, { params }) {
  try {
    const { owner, repo } = params;
    const { changes, message, branch } = await request.json();

    // Validate parameters
    if (!owner || !repo || !changes || !Array.isArray(changes) || !message) {
      return NextResponse.json(
        { error: 'Owner, repository name, changes array, and commit message are required' },
        { status: 400 }
      );
    }

    if (changes.length === 0) {
      return NextResponse.json(
        { error: 'At least one file change is required' },
        { status: 400 }
      );
    }

    // Validate each change object
    for (const [index, change] of changes.entries()) {
      if (!change.path) {
        return NextResponse.json(
          { error: `Change at index ${index} missing required 'path' field` },
          { status: 400 }
        );
      }

      if (!['create', 'update', 'delete'].includes(change.operation)) {
        return NextResponse.json(
          { error: `Change at index ${index} has invalid operation. Must be 'create', 'update', or 'delete'` },
          { status: 400 }
        );
      }

      if ((change.operation === 'create' || change.operation === 'update') && change.content === undefined) {
        return NextResponse.json(
          { error: `Change at index ${index} with operation '${change.operation}' missing required 'content' field` },
          { status: 400 }
        );
      }
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

    // Check for conflicts before committing
    const conflictCheck = await checkForConflicts(repoService, owner, repo, changes, branch);
    
    if (conflictCheck.hasConflicts) {
      return NextResponse.json(
        { 
          error: 'Conflicts detected',
          conflicts: conflictCheck.conflicts
        },
        { status: 409 }
      );
    }

    // Create the batch commit
    const commitResult = await repoService.createCommit(
      owner,
      repo,
      changes,
      message,
      branch
    );

    if (!commitResult.success) {
      return NextResponse.json(
        { error: commitResult.error },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      commit: commitResult.commit,
      summary: {
        filesChanged: changes.length,
        operations: {
          create: changes.filter(c => c.operation === 'create').length,
          update: changes.filter(c => c.operation === 'update').length,
          delete: changes.filter(c => c.operation === 'delete').length
        }
      },
      metadata: {
        owner,
        repo,
        branch,
        timestamp: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('Batch commit API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * Check for conflicts in batch changes
 */
async function checkForConflicts(repoService, owner, repo, changes, branch) {
  const conflicts = [];

  for (const change of changes) {
    if (change.operation === 'update' && change.expectedSha) {
      // Check if file has been modified since expectedSha
      const currentFile = await repoService.getFileContent(owner, repo, change.path, branch);
      
      if (currentFile.success && currentFile.content.sha !== change.expectedSha) {
        conflicts.push({
          path: change.path,
          type: 'sha_mismatch',
          expectedSha: change.expectedSha,
          currentSha: currentFile.content.sha,
          message: `File ${change.path} has been modified by another process`
        });
      }
    }
  }

  return {
    hasConflicts: conflicts.length > 0,
    conflicts
  };
}