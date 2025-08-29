/**
 * Repository Fork API Route
 * Handles forking template repositories to user accounts
 */

import { NextResponse } from 'next/server';
import { Octokit } from '@octokit/rest';
// Note: Using simplified auth check since NextAuth is currently disabled
// In production, this should use proper NextAuth session management

/**
 * POST /api/repositories/fork
 * Fork a template repository to the user's GitHub account
 */
export async function POST(request) {
  try {
    // Get GitHub token from request headers (simplified auth)
    const authHeader = request.headers.get('authorization');
    const githubToken = authHeader?.replace('Bearer ', '') || process.env.GITHUB_TOKEN;
    
    if (!githubToken) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'UNAUTHORIZED',
            message: 'GitHub authentication required'
          }
        },
        { status: 401 }
      );
    }

    const { templateId, repositoryName, description, isPrivate = false } = await request.json();

    // Validate input
    if (!templateId || !repositoryName) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'INVALID_INPUT',
            message: 'Template ID and repository name are required'
          }
        },
        { status: 400 }
      );
    }

    // Parse template ID (owner/repo format)
    const [templateOwner, templateRepo] = templateId.split('/');
    if (!templateOwner || !templateRepo) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'INVALID_TEMPLATE_ID',
            message: 'Template ID must be in owner/repo format'
          }
        },
        { status: 400 }
      );
    }

    // Validate repository name
    if (!/^[a-zA-Z0-9._-]+$/.test(repositoryName)) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'INVALID_REPO_NAME',
            message: 'Repository name contains invalid characters'
          }
        },
        { status: 400 }
      );
    }

    // Initialize GitHub API client
    const octokit = new Octokit({
      auth: githubToken,
    });

    // Get authenticated user info
    let authenticatedUser;
    try {
      const { data } = await octokit.users.getAuthenticated();
      authenticatedUser = data;
    } catch (error) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'INVALID_TOKEN',
            message: 'Invalid GitHub token'
          }
        },
        { status: 401 }
      );
    }

    // Step 1: Verify template repository exists and is accessible
    let templateRepoData;
    try {
      const { data } = await octokit.repos.get({
        owner: templateOwner,
        repo: templateRepo
      });
      templateRepoData = data;
    } catch (error) {
      if (error.status === 404) {
        return NextResponse.json(
          {
            success: false,
            error: {
              code: 'TEMPLATE_NOT_FOUND',
              message: 'Template repository not found or not accessible'
            }
          },
          { status: 404 }
        );
      }
      throw error;
    }

    // Step 2: Check if user already has a repository with this name
    try {
      await octokit.repos.get({
        owner: authenticatedUser.login,
        repo: repositoryName
      });
      
      // Repository exists
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'REPOSITORY_EXISTS',
            message: `Repository '${repositoryName}' already exists in your account`
          }
        },
        { status: 409 }
      );
    } catch (error) {
      if (error.status !== 404) {
        throw error;
      }
      // Repository doesn't exist, which is what we want
    }

    // Step 3: Fork the template repository
    let forkedRepo;
    try {
      const { data } = await octokit.repos.createFork({
        owner: templateOwner,
        repo: templateRepo,
        name: repositoryName,
        default_branch_only: true
      });
      forkedRepo = data;
    } catch (error) {
      console.error('Fork creation failed:', error);
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'FORK_FAILED',
            message: 'Failed to fork template repository',
            details: error.message
          }
        },
        { status: 500 }
      );
    }

    // Step 4: Wait for fork to be ready and update repository settings
    let attempts = 0;
    const maxAttempts = 10;
    let finalRepo = forkedRepo;

    while (attempts < maxAttempts) {
      try {
        // Check if fork is ready
        const { data: repoData } = await octokit.repos.get({
          owner: authenticatedUser.login,
          repo: repositoryName
        });

        // Update repository settings if needed
        if (description || isPrivate !== repoData.private) {
          const { data: updatedRepo } = await octokit.repos.update({
            owner: authenticatedUser.login,
            repo: repositoryName,
            description: description || `Portfolio created from ${templateId} template`,
            private: isPrivate
          });
          finalRepo = updatedRepo;
        } else {
          finalRepo = repoData;
        }

        break;
      } catch (error) {
        if (error.status === 404 && attempts < maxAttempts - 1) {
          // Fork not ready yet, wait and retry
          await new Promise(resolve => setTimeout(resolve, 1000));
          attempts++;
          continue;
        }
        throw error;
      }
    }

    // Step 5: Verify the fork was created successfully
    if (attempts >= maxAttempts) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'FORK_TIMEOUT',
            message: 'Fork creation timed out. Please check your GitHub account.'
          }
        },
        { status: 500 }
      );
    }

    // Step 6: Return success response with repository details
    return NextResponse.json({
      success: true,
      data: {
        repository: {
          id: finalRepo.id,
          name: finalRepo.name,
          full_name: finalRepo.full_name,
          description: finalRepo.description,
          private: finalRepo.private,
          html_url: finalRepo.html_url,
          clone_url: finalRepo.clone_url,
          ssh_url: finalRepo.ssh_url,
          default_branch: finalRepo.default_branch,
          created_at: finalRepo.created_at,
          updated_at: finalRepo.updated_at
        },
        template: {
          id: templateId,
          name: templateRepoData.name,
          full_name: templateRepoData.full_name
        },
        next_steps: {
          editor_url: `/editor/${authenticatedUser.login}/${repositoryName}`,
          portfolio_url: `/${authenticatedUser.login}/${repositoryName}`,
          github_url: finalRepo.html_url
        }
      }
    });

  } catch (error) {
    console.error('Repository fork API error:', error);
    
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'An unexpected error occurred while forking the repository',
          details: error.message
        }
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/repositories/fork
 * Get fork status or validate fork parameters
 */
export async function GET(request) {
  try {
    // Get GitHub token from request headers (simplified auth)
    const authHeader = request.headers.get('authorization');
    const githubToken = authHeader?.replace('Bearer ', '') || process.env.GITHUB_TOKEN;
    
    if (!githubToken) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'UNAUTHORIZED',
            message: 'GitHub authentication required'
          }
        },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const templateId = searchParams.get('templateId');
    const repositoryName = searchParams.get('repositoryName');

    if (!templateId) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'MISSING_TEMPLATE_ID',
            message: 'Template ID is required'
          }
        },
        { status: 400 }
      );
    }

    const octokit = new Octokit({
      auth: githubToken,
    });

    // Get authenticated user info
    let authenticatedUser;
    try {
      const { data } = await octokit.users.getAuthenticated();
      authenticatedUser = data;
    } catch (error) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'INVALID_TOKEN',
            message: 'Invalid GitHub token'
          }
        },
        { status: 401 }
      );
    }

    // Parse template ID
    const [templateOwner, templateRepo] = templateId.split('/');
    if (!templateOwner || !templateRepo) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'INVALID_TEMPLATE_ID',
            message: 'Template ID must be in owner/repo format'
          }
        },
        { status: 400 }
      );
    }

    // Check template repository accessibility
    let templateRepoData;
    try {
      const { data } = await octokit.repos.get({
        owner: templateOwner,
        repo: templateRepo
      });
      templateRepoData = data;
    } catch (error) {
      if (error.status === 404) {
        return NextResponse.json(
          {
            success: false,
            error: {
              code: 'TEMPLATE_NOT_FOUND',
              message: 'Template repository not found or not accessible'
            }
          },
          { status: 404 }
        );
      }
      throw error;
    }

    // If repository name is provided, check if it already exists
    let repositoryExists = false;
    if (repositoryName) {
      try {
        await octokit.repos.get({
          owner: authenticatedUser.login,
          repo: repositoryName
        });
        repositoryExists = true;
      } catch (error) {
        if (error.status !== 404) {
          throw error;
        }
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        template: {
          id: templateId,
          name: templateRepoData.name,
          full_name: templateRepoData.full_name,
          description: templateRepoData.description,
          private: templateRepoData.private,
          forkable: !templateRepoData.archived && !templateRepoData.disabled
        },
        user: {
          login: authenticatedUser.login,
          can_create_repos: true // Assume user can create repos
        },
        validation: {
          template_accessible: true,
          repository_name_available: repositoryName ? !repositoryExists : null,
          can_fork: !templateRepoData.archived && !templateRepoData.disabled
        }
      }
    });

  } catch (error) {
    console.error('Repository fork validation API error:', error);
    
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'An unexpected error occurred while validating fork parameters',
          details: error.message
        }
      },
      { status: 500 }
    );
  }
}