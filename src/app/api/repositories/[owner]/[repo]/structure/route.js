import { NextResponse } from 'next/server';
import { RepositoryService } from '../../../../../../lib/repository-service.js';
import { validateAuthToken } from '../../../../../../lib/auth.js';

/**
 * Get repository file structure
 * GET /api/repositories/[owner]/[repo]/structure
 */
export async function GET(request, { params }) {
  try {
    const { owner, repo } = params;
    const { searchParams } = new URL(request.url);
    
    // Get optional query parameters
    const path = searchParams.get('path') || '';
    const ref = searchParams.get('ref') || null;
    const recursive = searchParams.get('recursive') === 'true';

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

    // Get repository structure
    const structureResult = await repoService.getRepositoryStructure(
      owner,
      repo,
      path,
      ref
    );

    if (!structureResult.success) {
      return NextResponse.json(
        { error: structureResult.error },
        { status: 404 }
      );
    }

    let structure = structureResult.structure;

    // If recursive is requested and we're at root, get full tree
    if (recursive && path === '') {
      structure = await buildRecursiveStructure(
        repoService,
        owner,
        repo,
        '',
        ref,
        3 // Max depth to prevent excessive API calls
      );
    }

    return NextResponse.json({
      success: true,
      structure,
      metadata: {
        owner,
        repo,
        path,
        ref,
        recursive,
        timestamp: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('Get repository structure API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * Build recursive directory structure up to maxDepth
 */
async function buildRecursiveStructure(repoService, owner, repo, path, ref, maxDepth, currentDepth = 0) {
  if (currentDepth >= maxDepth) {
    return null;
  }

  const structureResult = await repoService.getRepositoryStructure(owner, repo, path, ref);
  
  if (!structureResult.success) {
    return null;
  }

  const structure = structureResult.structure;

  // Recursively get subdirectories
  for (const item of structure.items) {
    if (item.type === 'dir') {
      const subStructure = await buildRecursiveStructure(
        repoService,
        owner,
        repo,
        item.path,
        ref,
        maxDepth,
        currentDepth + 1
      );
      
      if (subStructure) {
        item.children = subStructure.items;
      }
    }
  }

  return structure;
}