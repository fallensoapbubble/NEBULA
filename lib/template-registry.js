/**
 * Template Registry Service
 * Manages portfolio template discovery, validation, and metadata extraction
 */

import { Octokit } from '@octokit/rest';
import { logger } from './logger.js';
import { TEMPLATE, ERROR_MESSAGES } from './constants.js';
import { safeJsonParse, isValidGitHubUsername, isValidGitHubRepoName } from './utils.js';

/**
 * Template Registry class for managing portfolio templates
 */
export class TemplateRegistry {
  constructor(githubToken = null) {
    this.octokit = new Octokit({
      auth: githubToken,
    });
    this.logger = logger.child({ service: 'template-registry' });
  }

  /**
   * Discovers and catalogs portfolio template repositories
   * @param {string[]} templateRepos - Array of template repository URLs or owner/repo strings
   * @returns {Promise<Template[]>} Array of validated template objects
   */
  async discoverTemplates(templateRepos = []) {
    this.logger.info('Starting template discovery', { count: templateRepos.length });
    
    const templates = [];
    
    for (const repoIdentifier of templateRepos) {
      try {
        const template = await this.processTemplate(repoIdentifier);
        if (template) {
          templates.push(template);
        }
      } catch (error) {
        this.logger.error('Failed to process template', { 
          repo: repoIdentifier, 
          error: error.message 
        });
      }
    }

    this.logger.info('Template discovery completed', { 
      total: templateRepos.length, 
      successful: templates.length 
    });
    
    return templates;
  }

  /**
   * Processes a single template repository
   * @param {string} repoIdentifier - Repository identifier (owner/repo or URL)
   * @returns {Promise<Template|null>} Template object or null if invalid
   */
  async processTemplate(repoIdentifier) {
    const { owner, repo } = this.parseRepoIdentifier(repoIdentifier);
    
    if (!owner || !repo) {
      throw new Error(`Invalid repository identifier: ${repoIdentifier}`);
    }

    this.logger.debug('Processing template', { owner, repo });

    // Fetch repository information
    const repoInfo = await this.fetchRepositoryInfo(owner, repo);
    if (!repoInfo) {
      return null;
    }

    // Extract template metadata
    const metadata = await this.extractTemplateMetadata(owner, repo);
    
    // Validate template structure
    const validation = await this.validateTemplateStructure(owner, repo, metadata);
    
    if (!validation.isValid) {
      this.logger.warn('Template validation failed', { 
        owner, 
        repo, 
        errors: validation.errors 
      });
      return null;
    }

    // Build template object
    const template = {
      id: `${owner}/${repo}`,
      name: metadata.name || repoInfo.name,
      description: metadata.description || repoInfo.description || '',
      repository: {
        owner,
        name: repo,
        full_name: `${owner}/${repo}`,
        url: repoInfo.html_url,
        clone_url: repoInfo.clone_url,
        private: repoInfo.private
      },
      preview_url: metadata.preview_url || null,
      tags: metadata.tags || [],
      structure: {
        content_files: metadata.content_files || [],
        config_files: metadata.config_files || [TEMPLATE.CONFIG_FILE],
        required_fields: metadata.required_fields || []
      },
      metadata: {
        version: metadata.version || '1.0.0',
        author: repoInfo.owner.login,
        created_at: new Date(repoInfo.created_at),
        updated_at: new Date(repoInfo.updated_at),
        stars: repoInfo.stargazers_count,
        forks: repoInfo.forks_count
      },
      validation
    };

    this.logger.info('Template processed successfully', { 
      id: template.id, 
      name: template.name 
    });

    return template;
  }  
/**
   * Parses repository identifier into owner and repo name
   * @param {string} identifier - Repository identifier (owner/repo or URL)
   * @returns {Object} Object with owner and repo properties
   */
  parseRepoIdentifier(identifier) {
    if (!identifier || typeof identifier !== 'string') {
      return { owner: null, repo: null };
    }

    // Handle GitHub URLs
    if (identifier.includes('github.com')) {
      const match = identifier.match(/github\.com\/([^\/]+)\/([^\/]+)/);
      if (match) {
        return { 
          owner: match[1], 
          repo: match[2].replace(/\.git$/, '') 
        };
      }
    }

    // Handle owner/repo format
    if (identifier.includes('/')) {
      const [owner, repo] = identifier.split('/');
      if (isValidGitHubUsername(owner) && isValidGitHubRepoName(repo)) {
        return { owner, repo };
      }
    }

    return { owner: null, repo: null };
  }

  /**
   * Fetches repository information from GitHub API
   * @param {string} owner - Repository owner
   * @param {string} repo - Repository name
   * @returns {Promise<Object|null>} Repository information or null
   */
  async fetchRepositoryInfo(owner, repo) {
    try {
      const { data } = await this.octokit.repos.get({
        owner,
        repo
      });
      
      return data;
    } catch (error) {
      if (error.status === 404) {
        this.logger.warn('Repository not found', { owner, repo });
      } else if (error.status === 403) {
        this.logger.warn('Repository access forbidden', { owner, repo });
      } else {
        this.logger.error('Failed to fetch repository info', { 
          owner, 
          repo, 
          error: error.message 
        });
      }
      return null;
    }
  }

  /**
   * Extracts template metadata from repository files
   * @param {string} owner - Repository owner
   * @param {string} repo - Repository name
   * @returns {Promise<Object>} Template metadata object
   */
  async extractTemplateMetadata(owner, repo) {
    const metadata = {};

    try {
      // Try to fetch template configuration file
      const configContent = await this.fetchFileContent(owner, repo, TEMPLATE.CONFIG_FILE);
      if (configContent) {
        const config = safeJsonParse(configContent, {});
        Object.assign(metadata, config);
      }

      // Try to fetch package.json for additional metadata
      const packageContent = await this.fetchFileContent(owner, repo, 'package.json');
      if (packageContent) {
        const packageJson = safeJsonParse(packageContent, {});
        if (packageJson.name && !metadata.name) {
          metadata.name = packageJson.name;
        }
        if (packageJson.description && !metadata.description) {
          metadata.description = packageJson.description;
        }
        if (packageJson.keywords && !metadata.tags) {
          metadata.tags = packageJson.keywords;
        }
      }

      // Analyze repository structure for content files
      const structure = await this.analyzeRepositoryStructure(owner, repo);
      metadata.content_files = structure.content_files;
      metadata.config_files = structure.config_files;

    } catch (error) {
      this.logger.error('Failed to extract template metadata', { 
        owner, 
        repo, 
        error: error.message 
      });
    }

    return metadata;
  }

  /**
   * Fetches content of a specific file from repository
   * @param {string} owner - Repository owner
   * @param {string} repo - Repository name
   * @param {string} path - File path
   * @returns {Promise<string|null>} File content or null
   */
  async fetchFileContent(owner, repo, path) {
    try {
      const { data } = await this.octokit.repos.getContent({
        owner,
        repo,
        path
      });

      if (data.type === 'file' && data.content) {
        return Buffer.from(data.content, 'base64').toString('utf-8');
      }
    } catch (error) {
      if (error.status !== 404) {
        this.logger.debug('Failed to fetch file content', { 
          owner, 
          repo, 
          path, 
          error: error.message 
        });
      }
    }

    return null;
  }  /**

   * Analyzes repository structure to identify content and config files
   * @param {string} owner - Repository owner
   * @param {string} repo - Repository name
   * @returns {Promise<Object>} Structure analysis result
   */
  async analyzeRepositoryStructure(owner, repo) {
    const structure = {
      content_files: [],
      config_files: []
    };

    try {
      // Get repository contents
      const { data: contents } = await this.octokit.repos.getContent({
        owner,
        repo,
        path: ''
      });

      for (const item of contents) {
        if (item.type === 'file') {
          const fileName = item.name.toLowerCase();
          
          // Identify content files
          if (this.isContentFile(fileName)) {
            structure.content_files.push(item.name);
          }
          
          // Identify config files
          if (this.isConfigFile(fileName)) {
            structure.config_files.push(item.name);
          }
        }
      }

      // Check for common portfolio directories
      const commonDirs = ['data', 'content', 'portfolio', 'assets'];
      for (const dir of commonDirs) {
        try {
          const { data: dirContents } = await this.octokit.repos.getContent({
            owner,
            repo,
            path: dir
          });

          if (Array.isArray(dirContents)) {
            for (const item of dirContents) {
              if (item.type === 'file' && this.isContentFile(item.name.toLowerCase())) {
                structure.content_files.push(`${dir}/${item.name}`);
              }
            }
          }
        } catch (error) {
          // Directory doesn't exist, continue
        }
      }

    } catch (error) {
      this.logger.error('Failed to analyze repository structure', { 
        owner, 
        repo, 
        error: error.message 
      });
    }

    return structure;
  }

  /**
   * Checks if a file is a content file
   * @param {string} fileName - File name to check
   * @returns {boolean} True if it's a content file
   */
  isContentFile(fileName) {
    const contentPatterns = [
      /^data\.(json|yaml|yml)$/,
      /^portfolio\.(json|yaml|yml)$/,
      /^about\.(md|markdown)$/,
      /^projects\.(json|yaml|yml)$/,
      /^skills\.(json|yaml|yml)$/,
      /^experience\.(json|yaml|yml)$/,
      /^education\.(json|yaml|yml)$/,
      /^contact\.(json|yaml|yml)$/,
      /^readme\.md$/
    ];

    return contentPatterns.some(pattern => pattern.test(fileName));
  }

  /**
   * Checks if a file is a config file
   * @param {string} fileName - File name to check
   * @returns {boolean} True if it's a config file
   */
  isConfigFile(fileName) {
    const configPatterns = [
      /^\.nebula\/config\.json$/,
      /^package\.json$/,
      /^next\.config\.(js|mjs)$/,
      /^tailwind\.config\.(js|ts)$/,
      /^\.gitignore$/,
      /^\.env\.example$/
    ];

    return configPatterns.some(pattern => pattern.test(fileName));
  }

  /**
   * Validates template structure and requirements
   * @param {string} owner - Repository owner
   * @param {string} repo - Repository name
   * @param {Object} metadata - Template metadata
   * @returns {Promise<Object>} Validation result
   */
  async validateTemplateStructure(owner, repo, metadata) {
    const validation = {
      isValid: true,
      errors: [],
      warnings: []
    };

    // Check for required configuration file
    const hasConfig = await this.fetchFileContent(owner, repo, TEMPLATE.CONFIG_FILE);
    if (!hasConfig) {
      validation.warnings.push(`Missing template configuration file: ${TEMPLATE.CONFIG_FILE}`);
    }

    // Check for content files
    if (!metadata.content_files || metadata.content_files.length === 0) {
      validation.errors.push('No content files found in template');
      validation.isValid = false;
    }

    // Check for package.json (Next.js requirement)
    const hasPackageJson = await this.fetchFileContent(owner, repo, 'package.json');
    if (!hasPackageJson) {
      validation.errors.push('Missing package.json file');
      validation.isValid = false;
    } else {
      // Validate package.json structure
      const packageJson = safeJsonParse(hasPackageJson, {});
      if (!packageJson.dependencies || !packageJson.dependencies.next) {
        validation.errors.push('Template must be a Next.js project');
        validation.isValid = false;
      }
    }

    // Check for README
    const hasReadme = await this.fetchFileContent(owner, repo, 'README.md') ||
                     await this.fetchFileContent(owner, repo, 'readme.md');
    if (!hasReadme) {
      validation.warnings.push('Missing README.md file');
    }

    return validation;
  }
}

/**
 * Default template repositories for the platform
 */
export const DEFAULT_TEMPLATE_REPOSITORIES = [
  // Note: These are placeholder repositories for testing
  // In production, these should be actual portfolio template repositories
  // that contain Next.js projects with portfolio structure
  
  // Example format for real template repositories:
  // 'portfolio-templates/minimal-portfolio',
  // 'portfolio-templates/creative-portfolio',
  // 'portfolio-templates/developer-portfolio'
];

/**
 * Creates a new template registry instance
 * @param {string} githubToken - GitHub access token
 * @returns {TemplateRegistry} Template registry instance
 */
export function createTemplateRegistry(githubToken) {
  return new TemplateRegistry(githubToken);
}