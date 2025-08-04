import { NextResponse } from 'next/server';
import { RepositoryService } from '../../../../../../../lib/repository-service.js';
import { validateAuthToken } from '../../../../../../../lib/auth.js';

/**
 * Get commit history for repository
 * GET /api/content/[owner]/[repo]/history
 */
export async function GET(request, { params }) {
  try {
    const { owner, repo } = params;
    const { searchParams } = new URL(request.url);
    
    // Get query parameters
    const branch = searchParams.get('branch') || null;
    const path = searchParams.get('path') || null;
    const since = searchParams.get('since') || null;
    const until = searchParams.get('until') || null;
    const page = parseInt(searchParams.get('page') || '1');
    const perPage = Math.min(parseInt(searchParams.get('per_page') || '30'), 100); // Max 100 per page

    // Validate parameters
    if (!owner || !repo) {
      return NextResponse.json(
        { error: 'Owner and repository name are required' },
        { status: 400 }
      );
    }

    if (page < 1 || perPage < 1) {
      return NextResponse.json(
        { error: 'Page and per_page must be positive integers' },
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

    // Get commit history using GitHub API directly since RepositoryService doesn't have this method
    const historyResult = await getCommitHistory(
      repoService,
      owner,
      repo,
      {
        branch,
        path,
        since,
        until,
        page,
        perPage
      }
    );

    if (!historyResult.success) {
      return NextResponse.json(
        { error: historyResult.error },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      commits: historyResult.commits,
      pagination: {
        page,
        perPage,
        hasMore: historyResult.commits.length === perPage,
        total: historyResult.total || null
      },
      metadata: {
        owner,
        repo,
        branch,
        path,
        since,
        until,
        timestamp: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('Get commit history API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * Get detailed commit history
 */
async function getCommitHistory(repoService, owner, repo, options) {
  try {
    const params = {
      owner,
      repo,
      page: options.page,
      per_page: options.perPage
    };

    // Add optional parameters
    if (options.branch) {
      params.sha = options.branch;
    }
    if (options.path) {
      params.path = options.path;
    }
    if (options.since) {
      params.since = options.since;
    }
    if (options.until) {
      params.until = options.until;
    }

    // Use the repository service's octokit instance
    const { data: commits } = await repoService.executeWithRetry(
      () => repoService.octokit.rest.repos.listCommits(params),
      `get commit history ${owner}/${repo}`
    );

    const formattedCommits = commits.map(commit => ({
      sha: commit.sha,
      message: commit.commit.message,
      author: {
        name: commit.commit.author.name,
        email: commit.commit.author.email,
        date: commit.commit.author.date,
        login: commit.author?.login || null,
        avatar_url: commit.author?.avatar_url || null
      },
      committer: {
        name: commit.commit.committer.name,
        email: commit.commit.committer.email,
        date: commit.commit.committer.date,
        login: commit.committer?.login || null,
        avatar_url: commit.committer?.avatar_url || null
      },
      url: commit.html_url,
      stats: commit.stats ? {
        additions: commit.stats.additions,
        deletions: commit.stats.deletions,
        total: commit.stats.total
      } : null,
      files: commit.files ? commit.files.map(file => ({
        filename: file.filename,
        status: file.status,
        additions: file.additions,
        deletions: file.deletions,
        changes: file.changes,
        patch: file.patch
      })) : null,
      parents: commit.parents.map(parent => ({
        sha: parent.sha,
        url: parent.url
      }))
    }));

    return {
      success: true,
      commits: formattedCommits
    };

  } catch (error) {
    console.error('Get commit history error:', error);
    return {
      success: false,
      error: `Failed to get commit history: ${error.message}`
    };
  }
}