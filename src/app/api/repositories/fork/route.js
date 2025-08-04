import { NextResponse } from 'next/server';
import { RepositoryService } from '../../../../lib/repository-service.js';
import { validateAuthToken } from '../../../../lib/auth.js';

/**
 * Fork a template repository to the authenticated user's account
 * POST /api/repositories/fork
 */
export async function POST(request) {
  try {
    // Validate authentication
    const authResult = await validateAuthToken(request);
    if (!authResult.valid) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const { templateOwner, templateRepo, newName } = await request.json();

    // Validate required parameters
    if (!templateOwner || !templateRepo) {
      return NextResponse.json(
        { error: 'Template owner and repository name are required' },
        { status: 400 }
      );
    }

    // Initialize repository service with user's access token
    const repoService = new RepositoryService(authResult.accessToken);

    // Fork the repository
    const forkResult = await repoService.forkRepository(
      templateOwner,
      templateRepo,
      newName
    );

    if (!forkResult.success) {
      return NextResponse.json(
        { 
          error: forkResult.error,
          details: forkResult.details 
        },
        { status: forkResult.details?.status || 500 }
      );
    }

    return NextResponse.json({
      success: true,
      repository: forkResult.repository
    });

  } catch (error) {
    console.error('Fork repository API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}