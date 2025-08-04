import { NextResponse } from 'next/server';
import { RepositoryService } from '../../../../../../../lib/repository-service.js';
import { validateAuthToken } from '../../../../../../../lib/auth.js';

/**
 * Get file content from repository
 * GET /api/content/[owner]/[repo]/[...path]
 */
export async function GET(request, { params }) {
  try {
    const { owner, repo, path: pathSegments } = params;
    const { searchParams } = new URL(request.url);
    
    // Reconstruct file path from segments
    const filePath = Array.isArray(pathSegments) ? pathSegments.join('/') : pathSegments;
    const ref = searchParams.get('ref') || null;

    // Validate parameters
    if (!owner || !repo || !filePath) {
      return NextResponse.json(
        { error: 'Owner, repository name, and file path are required' },
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

    // Get file content
    const contentResult = await repoService.getFileContent(
      owner,
      repo,
      filePath,
      ref
    );

    if (!contentResult.success) {
      const statusCode = contentResult.error === 'File not found' ? 404 : 500;
      return NextResponse.json(
        { error: contentResult.error },
        { status: statusCode }
      );
    }

    return NextResponse.json({
      success: true,
      content: contentResult.content,
      metadata: {
        owner,
        repo,
        path: filePath,
        ref,
        timestamp: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('Get file content API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * Update file content in repository
 * PUT /api/content/[owner]/[repo]/[...path]
 */
export async function PUT(request, { params }) {
  try {
    const { owner, repo, path: pathSegments } = params;
    
    // Reconstruct file path from segments
    const filePath = Array.isArray(pathSegments) ? pathSegments.join('/') : pathSegments;
    
    const { content, message, sha, branch } = await request.json();

    // Validate parameters
    if (!owner || !repo || !filePath || content === undefined || !message) {
      return NextResponse.json(
        { error: 'Owner, repository name, file path, content, and commit message are required' },
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

    // Check for conflicts before updating
    if (sha) {
      // Get current file to check if it has been modified
      const currentFile = await repoService.getFileContent(owner, repo, filePath, branch);
      
      if (currentFile.success && currentFile.content.sha !== sha) {
        return NextResponse.json(
          { 
            error: 'File has been modified by another process',
            conflict: true,
            currentSha: currentFile.content.sha,
            providedSha: sha
          },
          { status: 409 }
        );
      }
    }

    // Update file content
    const updateResult = await repoService.updateFileContent(
      owner,
      repo,
      filePath,
      content,
      message,
      sha,
      branch
    );

    if (!updateResult.success) {
      return NextResponse.json(
        { error: updateResult.error },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      commit: updateResult.commit,
      metadata: {
        owner,
        repo,
        path: filePath,
        branch,
        timestamp: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('Update file content API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * Delete file from repository
 * DELETE /api/content/[owner]/[repo]/[...path]
 */
export async function DELETE(request, { params }) {
  try {
    const { owner, repo, path: pathSegments } = params;
    
    // Reconstruct file path from segments
    const filePath = Array.isArray(pathSegments) ? pathSegments.join('/') : pathSegments;
    
    const { message, sha, branch } = await request.json();

    // Validate parameters
    if (!owner || !repo || !filePath || !message || !sha) {
      return NextResponse.json(
        { error: 'Owner, repository name, file path, commit message, and file SHA are required' },
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

    // Create a commit with file deletion
    const deleteResult = await repoService.createCommit(
      owner,
      repo,
      [{
        path: filePath,
        operation: 'delete'
      }],
      message,
      branch
    );

    if (!deleteResult.success) {
      return NextResponse.json(
        { error: deleteResult.error },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      commit: deleteResult.commit,
      metadata: {
        owner,
        repo,
        path: filePath,
        branch,
        operation: 'delete',
        timestamp: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('Delete file API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}