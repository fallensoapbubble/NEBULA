import { NextResponse } from 'next/server';
import { RepositoryService } from '../../../../lib/repository-service.js';
import { validateAuthToken } from '../../../../lib/auth.js';

// Template gallery configuration
const TEMPLATE_SOURCES = [
  {
    owner: 'nebula-templates',
    repositories: [
      'simple-portfolio',
      'developer-blog',
      'creative-showcase',
      'business-portfolio',
      'photography-portfolio'
    ]
  },
  {
    owner: 'portfolio-templates',
    repositories: [
      'minimal-portfolio',
      'modern-portfolio',
      'tech-portfolio'
    ]
  }
];

/**
 * Get template gallery data
 * GET /api/templates
 */
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    
    // Get query parameters
    const category = searchParams.get('category') || null;
    const featured = searchParams.get('featured') === 'true';
    const search = searchParams.get('search') || null;
    const page = parseInt(searchParams.get('page') || '1');
    const perPage = Math.min(parseInt(searchParams.get('per_page') || '20'), 50);

    // Validate authentication (optional for public templates)
    const authResult = await validateAuthToken(request);
    const isAuthenticated = authResult.valid;

    // Initialize repository service with optional token
    const repoService = isAuthenticated 
      ? new RepositoryService(authResult.accessToken)
      : new RepositoryService(process.env.GITHUB_PUBLIC_TOKEN || '');

    // Get templates from configured sources
    const templates = await fetchTemplateGallery(repoService, {
      category,
      featured,
      search,
      page,
      perPage
    });

    if (!templates.success) {
      return NextResponse.json(
        { error: templates.error },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      templates: templates.data,
      pagination: {
        page,
        perPage,
        total: templates.total,
        hasMore: templates.hasMore
      },
      filters: {
        category,
        featured,
        search
      },
      metadata: {
        authenticated: isAuthenticated,
        timestamp: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('Get templates API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * Fetch template gallery data from configured sources
 */
async function fetchTemplateGallery(repoService, options) {
  try {
    const allTemplates = [];

    // Fetch templates from each source
    for (const source of TEMPLATE_SOURCES) {
      for (const repoName of source.repositories) {
        try {
          const templateData = await fetchTemplateData(
            repoService,
            source.owner,
            repoName
          );

          if (templateData) {
            allTemplates.push(templateData);
          }
        } catch (error) {
          console.warn(`Failed to fetch template ${source.owner}/${repoName}:`, error.message);
          // Continue with other templates
        }
      }
    }

    // Apply filters
    let filteredTemplates = allTemplates;

    if (options.category) {
      filteredTemplates = filteredTemplates.filter(t => 
        t.category === options.category || 
        (t.tags && t.tags.includes(options.category))
      );
    }

    if (options.featured) {
      filteredTemplates = filteredTemplates.filter(t => t.featured === true);
    }

    if (options.search) {
      const searchLower = options.search.toLowerCase();
      filteredTemplates = filteredTemplates.filter(t =>
        t.name.toLowerCase().includes(searchLower) ||
        t.description.toLowerCase().includes(searchLower) ||
        (t.tags && t.tags.some(tag => tag.toLowerCase().includes(searchLower)))
      );
    }

    // Sort by featured first, then by stars, then by name
    filteredTemplates.sort((a, b) => {
      if (a.featured !== b.featured) {
        return b.featured ? 1 : -1;
      }
      if (a.stars !== b.stars) {
        return b.stars - a.stars;
      }
      return a.name.localeCompare(b.name);
    });

    // Apply pagination
    const startIndex = (options.page - 1) * options.perPage;
    const endIndex = startIndex + options.perPage;
    const paginatedTemplates = filteredTemplates.slice(startIndex, endIndex);

    return {
      success: true,
      data: paginatedTemplates,
      total: filteredTemplates.length,
      hasMore: endIndex < filteredTemplates.length
    };

  } catch (error) {
    console.error('Fetch template gallery error:', error);
    return {
      success: false,
      error: `Failed to fetch template gallery: ${error.message}`
    };
  }
}

/**
 * Fetch individual template data
 */
async function fetchTemplateData(repoService, owner, repo) {
  try {
    // Get repository info
    const { data: repoInfo } = await repoService.executeWithRetry(
      () => repoService.octokit.rest.repos.get({ owner, repo }),
      `get template info ${owner}/${repo}`
    );

    // Get template configuration
    const configResult = await repoService.getFileContent(owner, repo, '.nebula/config.json');
    
    let templateConfig = {};
    if (configResult.success) {
      try {
        templateConfig = JSON.parse(configResult.content.content);
      } catch (error) {
        console.warn(`Invalid template config for ${owner}/${repo}:`, error.message);
      }
    }

    // Get preview image
    const previewResult = await repoService.getFileContent(owner, repo, '.nebula/preview.png');
    const hasPreview = previewResult.success;

    // Build template data
    const template = {
      id: `${owner}/${repo}`,
      owner,
      name: repo,
      displayName: templateConfig.name || repoInfo.name,
      description: templateConfig.description || repoInfo.description || 'No description available',
      category: templateConfig.category || 'general',
      tags: templateConfig.tags || [],
      featured: templateConfig.featured || false,
      difficulty: templateConfig.difficulty || 'beginner',
      templateType: templateConfig.templateType || 'unknown',
      
      // Repository metadata
      stars: repoInfo.stargazers_count,
      forks: repoInfo.forks_count,
      language: repoInfo.language,
      createdAt: repoInfo.created_at,
      updatedAt: repoInfo.updated_at,
      
      // URLs
      repositoryUrl: repoInfo.html_url,
      cloneUrl: repoInfo.clone_url,
      previewUrl: hasPreview ? `https://raw.githubusercontent.com/${owner}/${repo}/main/.nebula/preview.png` : null,
      
      // Template-specific data
      version: templateConfig.version || '1.0',
      author: templateConfig.author || repoInfo.owner.login,
      license: repoInfo.license?.name || 'Unknown',
      
      // Availability
      available: true,
      lastChecked: new Date().toISOString()
    };

    return template;

  } catch (error) {
    console.error(`Fetch template data error for ${owner}/${repo}:`, error);
    
    // Return basic template info even if detailed fetch fails
    return {
      id: `${owner}/${repo}`,
      owner,
      name: repo,
      displayName: repo,
      description: 'Template information unavailable',
      category: 'general',
      tags: [],
      featured: false,
      available: false,
      error: error.message,
      lastChecked: new Date().toISOString()
    };
  }
}