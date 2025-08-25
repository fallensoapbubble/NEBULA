/**
 * Portfolio Content Analyzer
 * Analyzes GitHub repositories to detect and parse portfolio data files
 * Supports multiple formats: JSON, YAML, Markdown
 */

import { createGitHubClient } from './github-auth.js';
import { parseGitHubError } from './github-errors.js';
import yaml from 'js-yaml';

/**
 * Portfolio Content Analyzer class
 * Handles detection and parsing of portfolio data from GitHub repositories
 */
export class PortfolioContentAnalyzer {
  constructor(accessToken, options = {}) {
    if (!accessToken) {
      throw new Error('GitHub access token is required');
    }
    
    this.octokit = createGitHubClient(accessToken);
    this.accessToken = accessToken;
    this.options = {
      maxDepth: options.maxDepth || 3,
      timeout: options.timeout || 30000,
      ...options
    };
  }

  /**
   * Analyze repository for portfolio data files
   * @param {string} owner - Repository owner
   * @param {string} repo - Repository name
   * @param {string} [ref] - Git reference (branch/commit)
   * @returns {Promise<{success: boolean, analysis?: object, error?: string}>}
   */
  async analyzeRepository(owner, repo, ref = null) {
    try {
      // Get repository structure
      const structure = await this.getRepositoryStructure(owner, repo, '', ref);
      if (!structure.success) {
        return structure;
      }

      // Detect portfolio files
      const portfolioFiles = await this.detectPortfolioFiles(owner, repo, structure.structure, ref);
      
      // Parse detected files
      const parsedContent = await this.parsePortfolioFiles(owner, repo, portfolioFiles, ref);
      
      // Analyze content structure
      const contentAnalysis = this.analyzeContentStructure(parsedContent);
      
      return {
        success: true,
        analysis: {
          repository: {
            owner,
            name: repo,
            ref: ref || 'default'
          },
          structure: structure.structure,
          portfolioFiles,
          parsedContent,
          contentAnalysis,
          timestamp: new Date().toISOString()
        }
      };

    } catch (error) {
      console.error('Repository analysis error:', error);
      return {
        success: false,
        error: `Failed to analyze repository: ${error.message}`
      };
    }
  }

  /**
   * Get repository structure recursively
   * @param {string} owner - Repository owner
   * @param {string} repo - Repository name
   * @param {string} path - Current path
   * @param {string} ref - Git reference
   * @param {number} depth - Current depth
   * @returns {Promise<{success: boolean, structure?: object, error?: string}>}
   */
  async getRepositoryStructure(owner, repo, path = '', ref = null, depth = 0) {
    try {
      if (depth > this.options.maxDepth) {
        return {
          success: true,
          structure: { path, type: 'directory', items: [], truncated: true }
        };
      }

      const params = { owner, repo, path };
      if (ref) params.ref = ref;

      const { data: contents } = await this.octokit.rest.repos.getContent(params);
      const items = Array.isArray(contents) ? contents : [contents];
      
      const structure = {
        path,
        type: 'directory',
        items: []
      };

      for (const item of items) {
        const structureItem = {
          name: item.name,
          path: item.path,
          type: item.type,
          size: item.size,
          sha: item.sha,
          downloadUrl: item.download_url
        };

        // Add file metadata for files
        if (item.type === 'file') {
          structureItem.extension = this.getFileExtension(item.name);
          structureItem.contentType = this.getContentType(item.name);
          structureItem.isPortfolioFile = this.isPortfolioFile(item.name, item.path);
        }

        // Recursively get directory contents
        if (item.type === 'dir' && depth < this.options.maxDepth) {
          const subStructure = await this.getRepositoryStructure(owner, repo, item.path, ref, depth + 1);
          if (subStructure.success) {
            structureItem.items = subStructure.structure.items;
          }
        }

        structure.items.push(structureItem);
      }

      return {
        success: true,
        structure
      };

    } catch (error) {
      console.error('Get repository structure error:', error);
      return {
        success: false,
        error: `Failed to get repository structure: ${error.message}`
      };
    }
  }

  /**
   * Detect portfolio data files in repository structure
   * @param {string} owner - Repository owner
   * @param {string} repo - Repository name
   * @param {object} structure - Repository structure
   * @param {string} ref - Git reference
   * @returns {Promise<Array>} Array of detected portfolio files
   */
  async detectPortfolioFiles(owner, repo, structure, ref = null) {
    const portfolioFiles = [];
    
    // Define portfolio file patterns
    const portfolioPatterns = [
      // Data files
      { pattern: /^data\.(json|yaml|yml)$/, type: 'data', priority: 1 },
      { pattern: /^portfolio\.(json|yaml|yml)$/, type: 'portfolio', priority: 1 },
      { pattern: /^config\.(json|yaml|yml)$/, type: 'config', priority: 2 },
      
      // Content files
      { pattern: /^about\.(md|markdown)$/, type: 'about', priority: 1 },
      { pattern: /^readme\.md$/i, type: 'readme', priority: 3 },
      { pattern: /^bio\.(md|markdown)$/, type: 'bio', priority: 2 },
      
      // Project files
      { pattern: /^projects\.(json|yaml|yml)$/, type: 'projects', priority: 1 },
      { pattern: /^work\.(json|yaml|yml)$/, type: 'work', priority: 2 },
      { pattern: /^experience\.(json|yaml|yml)$/, type: 'experience', priority: 2 },
      
      // Skills and education
      { pattern: /^skills\.(json|yaml|yml)$/, type: 'skills', priority: 2 },
      { pattern: /^education\.(json|yaml|yml)$/, type: 'education', priority: 2 },
      
      // Contact and social
      { pattern: /^contact\.(json|yaml|yml)$/, type: 'contact', priority: 2 },
      { pattern: /^social\.(json|yaml|yml)$/, type: 'social', priority: 2 }
    ];

    // Recursively search for portfolio files
    const searchFiles = (items, currentPath = '') => {
      for (const item of items) {
        if (item.type === 'file') {
          // Check against portfolio patterns
          for (const { pattern, type, priority } of portfolioPatterns) {
            if (pattern.test(item.name.toLowerCase())) {
              portfolioFiles.push({
                name: item.name,
                path: item.path,
                type,
                priority,
                size: item.size,
                sha: item.sha,
                downloadUrl: item.downloadUrl,
                extension: this.getFileExtension(item.name),
                contentType: this.getContentType(item.name)
              });
              break; // Only match first pattern
            }
          }
        } else if (item.type === 'dir' && item.items) {
          // Search in subdirectories
          searchFiles(item.items, item.path);
        }
      }
    };

    searchFiles(structure.items);

    // Sort by priority and path
    portfolioFiles.sort((a, b) => {
      if (a.priority !== b.priority) {
        return a.priority - b.priority;
      }
      return a.path.localeCompare(b.path);
    });

    return portfolioFiles;
  }

  /**
   * Parse portfolio files content
   * @param {string} owner - Repository owner
   * @param {string} repo - Repository name
   * @param {Array} portfolioFiles - Array of portfolio files to parse
   * @param {string} ref - Git reference
   * @returns {Promise<object>} Parsed content organized by type
   */
  async parsePortfolioFiles(owner, repo, portfolioFiles, ref = null) {
    const parsedContent = {};
    
    for (const file of portfolioFiles) {
      try {
        // Get file content
        const params = { owner, repo, path: file.path };
        if (ref) params.ref = ref;
        
        const { data: fileData } = await this.octokit.rest.repos.getContent(params);
        
        if (fileData.type !== 'file') {
          continue;
        }

        // Decode content
        const content = fileData.encoding === 'base64' 
          ? Buffer.from(fileData.content, 'base64').toString('utf-8')
          : fileData.content;

        // Parse content based on file type
        const parsed = await this.parseFileContent(content, file.extension, file.contentType);
        
        // Store parsed content
        if (!parsedContent[file.type]) {
          parsedContent[file.type] = [];
        }
        
        parsedContent[file.type].push({
          file: {
            name: file.name,
            path: file.path,
            type: file.type,
            extension: file.extension,
            size: file.size,
            sha: fileData.sha
          },
          content: parsed.content,
          metadata: {
            format: parsed.format,
            parseSuccess: parsed.success,
            parseError: parsed.error,
            parsedAt: new Date().toISOString()
          }
        });

      } catch (error) {
        console.error(`Error parsing file ${file.path}:`, error);
        
        // Store error information
        if (!parsedContent[file.type]) {
          parsedContent[file.type] = [];
        }
        
        parsedContent[file.type].push({
          file: {
            name: file.name,
            path: file.path,
            type: file.type,
            extension: file.extension,
            size: file.size
          },
          content: null,
          metadata: {
            format: 'unknown',
            parseSuccess: false,
            parseError: error.message,
            parsedAt: new Date().toISOString()
          }
        });
      }
    }

    return parsedContent;
  }

  /**
   * Parse file content based on format
   * @param {string} content - Raw file content
   * @param {string} extension - File extension
   * @param {string} contentType - Content type
   * @returns {Promise<{success: boolean, content?: any, format?: string, error?: string}>}
   */
  async parseFileContent(content, extension, contentType) {
    try {
      switch (extension.toLowerCase()) {
        case '.json':
          return {
            success: true,
            content: JSON.parse(content),
            format: 'json'
          };
          
        case '.yaml':
        case '.yml':
          return {
            success: true,
            content: yaml.load(content),
            format: 'yaml'
          };
          
        case '.md':
        case '.markdown':
          // Parse markdown with frontmatter support
          const parsed = this.parseMarkdownWithFrontmatter(content);
          return {
            success: true,
            content: parsed,
            format: 'markdown'
          };
          
        default:
          // Try to parse as text
          return {
            success: true,
            content: content,
            format: 'text'
          };
      }
    } catch (error) {
      return {
        success: false,
        error: error.message,
        format: 'unknown'
      };
    }
  }

  /**
   * Parse markdown content with frontmatter support
   * @param {string} content - Markdown content
   * @returns {object} Parsed markdown with frontmatter and body
   */
  parseMarkdownWithFrontmatter(content) {
    const frontmatterRegex = /^---\s*\n([\s\S]*?)\n---\s*\n([\s\S]*)$/;
    const match = content.match(frontmatterRegex);
    
    if (match) {
      try {
        const frontmatter = yaml.load(match[1]) || {};
        const body = match[2].trim();
        
        return {
          frontmatter,
          body,
          raw: content
        };
      } catch (error) {
        // If frontmatter parsing fails, treat as regular markdown
        return {
          frontmatter: {},
          body: content,
          raw: content
        };
      }
    }
    
    return {
      frontmatter: {},
      body: content,
      raw: content
    };
  }

  /**
   * Analyze content structure and completeness
   * @param {object} parsedContent - Parsed portfolio content
   * @returns {object} Content analysis results
   */
  analyzeContentStructure(parsedContent) {
    const analysis = {
      completeness: {
        score: 0,
        maxScore: 100,
        breakdown: {}
      },
      structure: {
        hasData: false,
        hasAbout: false,
        hasProjects: false,
        hasContact: false,
        hasSkills: false
      },
      recommendations: [],
      issues: []
    };

    // Define scoring weights
    const weights = {
      data: 25,
      portfolio: 25,
      about: 20,
      projects: 15,
      contact: 10,
      skills: 5
    };

    // Analyze each content type
    for (const [type, items] of Object.entries(parsedContent)) {
      if (items && items.length > 0) {
        const weight = weights[type] || 0;
        const hasValidContent = items.some(item => 
          item.metadata.parseSuccess && item.content !== null
        );
        
        if (hasValidContent) {
          analysis.completeness.score += weight;
          analysis.structure[`has${type.charAt(0).toUpperCase() + type.slice(1)}`] = true;
        }
        
        analysis.completeness.breakdown[type] = {
          present: true,
          valid: hasValidContent,
          weight,
          files: items.length
        };

        // Check for parsing issues
        const failedItems = items.filter(item => !item.metadata.parseSuccess);
        if (failedItems.length > 0) {
          analysis.issues.push({
            type: 'parse_error',
            category: type,
            message: `Failed to parse ${failedItems.length} ${type} file(s)`,
            files: failedItems.map(item => item.file.path)
          });
        }
      }
    }

    // Generate recommendations
    if (!analysis.structure.hasData && !analysis.structure.hasPortfolio) {
      analysis.recommendations.push({
        priority: 'high',
        type: 'missing_data',
        message: 'Add a data.json or portfolio.json file with basic portfolio information',
        suggestion: 'Create a data.json file with fields like name, title, description, and contact information'
      });
    }

    if (!analysis.structure.hasAbout) {
      analysis.recommendations.push({
        priority: 'medium',
        type: 'missing_about',
        message: 'Add an about.md file to describe yourself',
        suggestion: 'Create an about.md file with your background, experience, and interests'
      });
    }

    if (!analysis.structure.hasProjects) {
      analysis.recommendations.push({
        priority: 'medium',
        type: 'missing_projects',
        message: 'Add a projects.json file to showcase your work',
        suggestion: 'Create a projects.json file with an array of your projects including titles, descriptions, and links'
      });
    }

    if (!analysis.structure.hasContact) {
      analysis.recommendations.push({
        priority: 'low',
        type: 'missing_contact',
        message: 'Add contact information',
        suggestion: 'Include contact details in your data file or create a separate contact.json file'
      });
    }

    // Calculate final score as percentage
    analysis.completeness.percentage = Math.round(
      (analysis.completeness.score / analysis.completeness.maxScore) * 100
    );

    return analysis;
  }

  /**
   * Check if a file is a potential portfolio file
   * @param {string} filename - File name
   * @param {string} filepath - Full file path
   * @returns {boolean} True if file might contain portfolio data
   */
  isPortfolioFile(filename, filepath) {
    const portfolioPatterns = [
      /^data\.(json|yaml|yml)$/,
      /^portfolio\.(json|yaml|yml)$/,
      /^about\.(md|markdown)$/,
      /^projects\.(json|yaml|yml)$/,
      /^skills\.(json|yaml|yml)$/,
      /^contact\.(json|yaml|yml)$/,
      /^config\.(json|yaml|yml)$/,
      /^readme\.md$/i
    ];

    return portfolioPatterns.some(pattern => pattern.test(filename.toLowerCase()));
  }

  /**
   * Get file extension from filename
   * @param {string} filename - File name
   * @returns {string} File extension including dot
   */
  getFileExtension(filename) {
    const lastDot = filename.lastIndexOf('.');
    return lastDot === -1 ? '' : filename.substring(lastDot);
  }

  /**
   * Get content type from filename
   * @param {string} filename - File name
   * @returns {string} Content type
   */
  getContentType(filename) {
    const extension = this.getFileExtension(filename).toLowerCase();
    
    const contentTypes = {
      '.json': 'application/json',
      '.yaml': 'application/x-yaml',
      '.yml': 'application/x-yaml',
      '.md': 'text/markdown',
      '.markdown': 'text/markdown',
      '.txt': 'text/plain'
    };

    return contentTypes[extension] || 'text/plain';
  }

  /**
   * Get quick portfolio summary from repository
   * @param {string} owner - Repository owner
   * @param {string} repo - Repository name
   * @param {string} [ref] - Git reference
   * @returns {Promise<{success: boolean, summary?: object, error?: string}>}
   */
  async getPortfolioSummary(owner, repo, ref = null) {
    try {
      const analysis = await this.analyzeRepository(owner, repo, ref);
      if (!analysis.success) {
        return analysis;
      }

      const { parsedContent, contentAnalysis } = analysis.analysis;
      
      // Extract key information
      const summary = {
        repository: {
          owner,
          name: repo,
          ref: ref || 'default'
        },
        completeness: contentAnalysis.completeness.percentage,
        structure: contentAnalysis.structure,
        keyData: {},
        lastAnalyzed: new Date().toISOString()
      };

      // Extract basic portfolio data
      if (parsedContent.data && parsedContent.data.length > 0) {
        const dataFile = parsedContent.data.find(item => item.metadata.parseSuccess);
        if (dataFile) {
          summary.keyData = {
            name: dataFile.content.name,
            title: dataFile.content.title,
            description: dataFile.content.description,
            email: dataFile.content.email,
            ...dataFile.content
          };
        }
      }

      // Extract from portfolio file if no data file
      if (!summary.keyData.name && parsedContent.portfolio && parsedContent.portfolio.length > 0) {
        const portfolioFile = parsedContent.portfolio.find(item => item.metadata.parseSuccess);
        if (portfolioFile) {
          summary.keyData = {
            name: portfolioFile.content.name,
            title: portfolioFile.content.title,
            description: portfolioFile.content.description,
            ...portfolioFile.content
          };
        }
      }

      return {
        success: true,
        summary
      };

    } catch (error) {
      console.error('Get portfolio summary error:', error);
      return {
        success: false,
        error: `Failed to get portfolio summary: ${error.message}`
      };
    }
  }
}

/**
 * Create a new PortfolioContentAnalyzer instance
 * @param {string} accessToken - GitHub access token
 * @param {object} options - Configuration options
 * @returns {PortfolioContentAnalyzer} New analyzer instance
 */
export function createPortfolioContentAnalyzer(accessToken, options = {}) {
  return new PortfolioContentAnalyzer(accessToken, options);
}

/**
 * Analyze a repository for portfolio content (convenience function)
 * @param {string} accessToken - GitHub access token
 * @param {string} owner - Repository owner
 * @param {string} repo - Repository name
 * @param {string} [ref] - Git reference
 * @returns {Promise<object>} Analysis results
 */
export async function analyzeRepositoryPortfolio(accessToken, owner, repo, ref = null) {
  const analyzer = createPortfolioContentAnalyzer(accessToken);
  return analyzer.analyzeRepository(owner, repo, ref);
}