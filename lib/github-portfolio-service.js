/**
 * GitHub Portfolio Service
 * Handles fetching and processing portfolio data directly from GitHub repositories
 * Supports the decentralized portfolio hosting system
 */

import { Octokit } from '@octokit/rest';
import { createPortfolioContentAnalyzer } from './portfolio-content-analyzer.js';
import { GitHubFilePortfolioMapper } from './github-file-portfolio-mapper.js';
import yaml from 'js-yaml';

/**
 * GitHub Portfolio Service class
 * Fetches portfolio data from public GitHub repositories without authentication
 */
export class GitHubPortfolioService {
  constructor(options = {}) {
    // Initialize Octokit without authentication for public repositories
    this.octokit = new Octokit({
      userAgent: 'portfolio-platform/1.0.0',
      ...options.octokitOptions
    });
    
    this.options = {
      timeout: options.timeout || 30000,
      maxFileSize: options.maxFileSize || 1024 * 1024, // 1MB
      cacheTimeout: options.cacheTimeout || 300000, // 5 minutes
      ...options
    };

    // Simple in-memory cache for portfolio data
    this.cache = new Map();
    
    // Initialize file-to-portfolio mapper
    this.fileMapper = new GitHubFilePortfolioMapper({
      maxFileSize: this.options.maxFileSize
    });
  }

  /**
   * Get portfolio data from a GitHub repository
   * @param {string} owner - Repository owner (GitHub username)
   * @param {string} repo - Repository name
   * @param {string} [ref] - Git reference (branch/commit), defaults to default branch
   * @returns {Promise<{success: boolean, data?: object, error?: string, message?: string}>}
   */
  async getPortfolioData(owner, repo, ref = null) {
    const cacheKey = `${owner}/${repo}${ref ? `@${ref}` : ''}`;
    
    try {
      // Check cache first
      if (this.cache.has(cacheKey)) {
        const cached = this.cache.get(cacheKey);
        if (Date.now() - cached.timestamp < this.options.cacheTimeout) {
          return cached.data;
        }
        this.cache.delete(cacheKey);
      }

      // Validate repository exists and is accessible
      const repoValidation = await this.validateRepository(owner, repo);
      if (!repoValidation.success) {
        return repoValidation;
      }

      const repository = repoValidation.repository;
      const targetRef = ref || repository.default_branch;

      // Get repository structure and detect portfolio files
      const portfolioFiles = await this.detectPortfolioFiles(owner, repo, targetRef);
      if (!portfolioFiles.success) {
        return portfolioFiles;
      }

      // Parse portfolio content from detected files
      const portfolioContent = await this.parsePortfolioContent(owner, repo, portfolioFiles.files, targetRef);
      if (!portfolioContent.success) {
        return portfolioContent;
      }

      // Build standardized portfolio data structure
      const portfolioData = this.buildPortfolioData(portfolioContent.content, repository, targetRef);

      const result = {
        success: true,
        data: portfolioData
      };

      // Cache the result
      this.cache.set(cacheKey, {
        data: result,
        timestamp: Date.now()
      });

      return result;

    } catch (error) {
      console.error('GitHub Portfolio Service error:', error);
      
      // Handle specific GitHub API errors
      if (error.status === 404) {
        return {
          success: false,
          error: 'repository_not_found',
          message: `Repository ${owner}/${repo} not found`
        };
      }
      
      if (error.status === 403) {
        return {
          success: false,
          error: 'repository_private',
          message: `Repository ${owner}/${repo} is private or access denied`
        };
      }

      return {
        success: false,
        error: 'service_error',
        message: `Failed to fetch portfolio data: ${error.message}`
      };
    }
  }

  /**
   * Validate that the repository exists and is accessible
   * @param {string} owner - Repository owner
   * @param {string} repo - Repository name
   * @returns {Promise<{success: boolean, repository?: object, error?: string}>}
   */
  async validateRepository(owner, repo) {
    try {
      const { data: repository } = await this.octokit.rest.repos.get({
        owner,
        repo
      });

      // Check if repository is private
      if (repository.private) {
        return {
          success: false,
          error: 'repository_private',
          message: `Repository ${owner}/${repo} is private`
        };
      }

      return {
        success: true,
        repository
      };

    } catch (error) {
      if (error.status === 404) {
        // Check if it's a user not found or repository not found
        try {
          await this.octokit.rest.users.getByUsername({ username: owner });
          return {
            success: false,
            error: 'repository_not_found',
            message: `Repository ${owner}/${repo} not found`
          };
        } catch (userError) {
          if (userError.status === 404) {
            return {
              success: false,
              error: 'user_not_found',
              message: `GitHub user ${owner} not found`
            };
          }
        }
      }

      return {
        success: false,
        error: 'validation_error',
        message: `Failed to validate repository: ${error.message}`
      };
    }
  }

  /**
   * Detect portfolio files in the repository
   * @param {string} owner - Repository owner
   * @param {string} repo - Repository name
   * @param {string} ref - Git reference
   * @returns {Promise<{success: boolean, files?: Array, error?: string}>}
   */
  async detectPortfolioFiles(owner, repo, ref) {
    try {
      // Get repository contents from root
      const { data: contents } = await this.octokit.rest.repos.getContent({
        owner,
        repo,
        path: '',
        ref
      });

      const portfolioFiles = [];
      
      // Define portfolio file patterns with priorities
      const portfolioPatterns = [
        { pattern: /^data\.(json|yaml|yml)$/i, type: 'data', priority: 1 },
        { pattern: /^portfolio\.(json|yaml|yml)$/i, type: 'portfolio', priority: 1 },
        { pattern: /^about\.(md|markdown)$/i, type: 'about', priority: 2 },
        { pattern: /^readme\.md$/i, type: 'readme', priority: 3 },
        { pattern: /^projects\.(json|yaml|yml)$/i, type: 'projects', priority: 2 },
        { pattern: /^skills\.(json|yaml|yml)$/i, type: 'skills', priority: 3 },
        { pattern: /^contact\.(json|yaml|yml)$/i, type: 'contact', priority: 3 },
        { pattern: /^config\.(json|yaml|yml)$/i, type: 'config', priority: 4 }
      ];

      // Check each file in the repository root
      for (const item of contents) {
        if (item.type === 'file') {
          for (const { pattern, type, priority } of portfolioPatterns) {
            if (pattern.test(item.name)) {
              portfolioFiles.push({
                name: item.name,
                path: item.path,
                type,
                priority,
                size: item.size,
                sha: item.sha,
                downloadUrl: item.download_url,
                extension: this.getFileExtension(item.name)
              });
              break; // Only match first pattern
            }
          }
        }
      }

      // Sort by priority (lower number = higher priority)
      portfolioFiles.sort((a, b) => a.priority - b.priority);

      return {
        success: true,
        files: portfolioFiles
      };

    } catch (error) {
      return {
        success: false,
        error: `Failed to detect portfolio files: ${error.message}`
      };
    }
  }

  /**
   * Parse portfolio content from detected files
   * @param {string} owner - Repository owner
   * @param {string} repo - Repository name
   * @param {Array} files - Array of portfolio files to parse
   * @param {string} ref - Git reference
   * @returns {Promise<{success: boolean, content?: object, error?: string}>}
   */
  async parsePortfolioContent(owner, repo, files, ref) {
    const content = {};
    
    try {
      for (const file of files) {
        // Skip files that are too large
        if (file.size > this.options.maxFileSize) {
          console.warn(`Skipping large file: ${file.path} (${file.size} bytes)`);
          continue;
        }

        try {
          // Get file content
          const { data: fileData } = await this.octokit.rest.repos.getContent({
            owner,
            repo,
            path: file.path,
            ref
          });

          if (fileData.type !== 'file') {
            continue;
          }

          // Decode content
          const rawContent = fileData.encoding === 'base64' 
            ? Buffer.from(fileData.content, 'base64').toString('utf-8')
            : fileData.content;

          // Parse content based on file extension
          const parsedContent = this.parseFileContent(rawContent, file.extension);
          
          if (parsedContent.success) {
            if (!content[file.type]) {
              content[file.type] = [];
            }
            
            content[file.type].push({
              file: {
                name: file.name,
                path: file.path,
                type: file.type,
                size: file.size,
                sha: fileData.sha
              },
              content: parsedContent.content,
              format: parsedContent.format
            });
          }

        } catch (fileError) {
          console.error(`Error parsing file ${file.path}:`, fileError);
          // Continue with other files even if one fails
        }
      }

      return {
        success: true,
        content
      };

    } catch (error) {
      return {
        success: false,
        error: `Failed to parse portfolio content: ${error.message}`
      };
    }
  }

  /**
   * Parse file content based on extension
   * @param {string} content - Raw file content
   * @param {string} extension - File extension
   * @returns {object} Parsed content result
   */
  parseFileContent(content, extension) {
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
          const parsed = this.parseMarkdownWithFrontmatter(content);
          return {
            success: true,
            content: parsed,
            format: 'markdown'
          };
          
        default:
          return {
            success: true,
            content: content,
            format: 'text'
          };
      }
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Parse markdown with frontmatter support
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
   * Build standardized portfolio data structure
   * @param {object} content - Parsed portfolio content
   * @param {object} repository - GitHub repository data
   * @param {string} ref - Git reference
   * @returns {object} Standardized portfolio data
   */
  buildPortfolioData(content, repository, ref) {
    const portfolioData = {
      // Repository metadata
      repository: {
        owner: repository.owner.login,
        name: repository.name,
        fullName: repository.full_name,
        description: repository.description,
        url: repository.html_url,
        defaultBranch: repository.default_branch,
        ref,
        updatedAt: repository.updated_at,
        createdAt: repository.created_at
      },
      
      // Default portfolio structure
      name: repository.owner.login,
      title: repository.description || `${repository.owner.login}'s Portfolio`,
      description: repository.description || '',
      avatar: repository.owner.avatar_url,
      
      // Content sections
      about: null,
      projects: [],
      skills: [],
      contact: {},
      social: {},
      
      // Metadata
      lastUpdated: new Date().toISOString(),
      source: 'github-repository'
    };

    // Extract data from primary data/portfolio files
    const primaryData = this.extractPrimaryData(content);
    if (primaryData) {
      Object.assign(portfolioData, primaryData);
    }

    // Extract about information
    const aboutData = this.extractAboutData(content);
    if (aboutData) {
      portfolioData.about = aboutData;
    }

    // Extract projects
    const projectsData = this.extractProjectsData(content);
    if (projectsData && projectsData.length > 0) {
      portfolioData.projects = projectsData;
    }

    // Extract skills
    const skillsData = this.extractSkillsData(content);
    if (skillsData && skillsData.length > 0) {
      portfolioData.skills = skillsData;
    }

    // Extract contact information
    const contactData = this.extractContactData(content);
    if (contactData) {
      portfolioData.contact = contactData;
    }

    return portfolioData;
  }

  /**
   * Extract primary portfolio data from data.json or portfolio.json
   * @param {object} content - Parsed content
   * @returns {object|null} Primary portfolio data
   */
  extractPrimaryData(content) {
    // Try data files first, then portfolio files
    const sources = ['data', 'portfolio'];
    
    for (const source of sources) {
      if (content[source] && content[source].length > 0) {
        const dataFile = content[source][0]; // Use first file
        if (dataFile.content && typeof dataFile.content === 'object') {
          return dataFile.content;
        }
      }
    }
    
    return null;
  }

  /**
   * Extract about information from about.md or README.md
   * @param {object} content - Parsed content
   * @returns {object|null} About data
   */
  extractAboutData(content) {
    const sources = ['about', 'readme'];
    
    for (const source of sources) {
      if (content[source] && content[source].length > 0) {
        const aboutFile = content[source][0];
        if (aboutFile.content) {
          return {
            content: aboutFile.content.body || aboutFile.content,
            frontmatter: aboutFile.content.frontmatter || {},
            source: aboutFile.file.name
          };
        }
      }
    }
    
    return null;
  }

  /**
   * Extract projects data
   * @param {object} content - Parsed content
   * @returns {Array} Projects array
   */
  extractProjectsData(content) {
    if (content.projects && content.projects.length > 0) {
      const projectsFile = content.projects[0];
      if (Array.isArray(projectsFile.content)) {
        return projectsFile.content;
      }
      if (projectsFile.content && projectsFile.content.projects) {
        return projectsFile.content.projects;
      }
    }
    
    return [];
  }

  /**
   * Extract skills data
   * @param {object} content - Parsed content
   * @returns {Array} Skills array
   */
  extractSkillsData(content) {
    if (content.skills && content.skills.length > 0) {
      const skillsFile = content.skills[0];
      if (Array.isArray(skillsFile.content)) {
        return skillsFile.content;
      }
      if (skillsFile.content && skillsFile.content.skills) {
        return skillsFile.content.skills;
      }
    }
    
    return [];
  }

  /**
   * Extract contact information
   * @param {object} content - Parsed content
   * @returns {object} Contact data
   */
  extractContactData(content) {
    if (content.contact && content.contact.length > 0) {
      const contactFile = content.contact[0];
      if (contactFile.content && typeof contactFile.content === 'object') {
        return contactFile.content;
      }
    }
    
    return {};
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
   * Clear cache
   */
  clearCache() {
    this.cache.clear();
  }

  /**
   * Get cache statistics
   * @returns {object} Cache statistics
   */
  getCacheStats() {
    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys())
    };
  }

  /**
   * Get enhanced portfolio data using direct file-to-portfolio mapping
   * @param {string} owner - Repository owner
   * @param {string} repo - Repository name
   * @param {string} [ref] - Git reference
   * @returns {Promise<{success: boolean, data?: object, error?: string, message?: string}>}
   */
  async getEnhancedPortfolioData(owner, repo, ref = null) {
    const cacheKey = `enhanced_${owner}/${repo}${ref ? `@${ref}` : ''}`;
    
    try {
      // Check cache first
      if (this.cache.has(cacheKey)) {
        const cached = this.cache.get(cacheKey);
        if (Date.now() - cached.timestamp < this.options.cacheTimeout) {
          return cached.data;
        }
        this.cache.delete(cacheKey);
      }

      // Validate repository exists and is accessible
      const repoValidation = await this.validateRepository(owner, repo);
      if (!repoValidation.success) {
        return repoValidation;
      }

      const repository = repoValidation.repository;
      const targetRef = ref || repository.default_branch;

      // Get all repository files for comprehensive mapping
      const filesResult = await this.getAllRepositoryFiles(owner, repo, targetRef);
      if (!filesResult.success) {
        return filesResult;
      }

      // Use file mapper to create portfolio structure
      const portfolioMapping = this.fileMapper.mapFilesToPortfolio(filesResult.files);
      
      // Process the mapped files to get actual content
      const portfolioContent = await this.processEnhancedPortfolioContent(
        owner, 
        repo, 
        portfolioMapping, 
        targetRef
      );

      if (!portfolioContent.success) {
        return portfolioContent;
      }

      // Build enhanced portfolio data structure
      const portfolioData = this.buildEnhancedPortfolioData(
        portfolioContent.content, 
        portfolioMapping,
        repository, 
        targetRef
      );

      const result = {
        success: true,
        data: portfolioData,
        mapping: portfolioMapping,
        suggestions: this.fileMapper.getMappingSuggestions(filesResult.files)
      };

      // Cache the result
      this.cache.set(cacheKey, {
        data: result,
        timestamp: Date.now()
      });

      return result;

    } catch (error) {
      console.error('Enhanced GitHub Portfolio Service error:', error);
      
      // Handle specific GitHub API errors
      if (error.status === 404) {
        return {
          success: false,
          error: 'repository_not_found',
          message: `Repository ${owner}/${repo} not found`
        };
      }
      
      if (error.status === 403) {
        return {
          success: false,
          error: 'repository_private',
          message: `Repository ${owner}/${repo} is private or access denied`
        };
      }

      return {
        success: false,
        error: 'service_error',
        message: `Failed to fetch enhanced portfolio data: ${error.message}`
      };
    }
  }

  /**
   * Get all repository files recursively
   * @param {string} owner - Repository owner
   * @param {string} repo - Repository name
   * @param {string} ref - Git reference
   * @param {string} path - Path to scan (default: root)
   * @returns {Promise<{success: boolean, files?: Array, error?: string}>}
   */
  async getAllRepositoryFiles(owner, repo, ref, path = '') {
    try {
      const { data: contents } = await this.octokit.rest.repos.getContent({
        owner,
        repo,
        path,
        ref
      });

      const files = [];
      
      // Process each item
      for (const item of Array.isArray(contents) ? contents : [contents]) {
        if (item.type === 'file') {
          files.push({
            name: item.name,
            path: item.path,
            type: item.type,
            size: item.size,
            sha: item.sha,
            download_url: item.download_url
          });
        } else if (item.type === 'dir' && path === '') {
          // Only scan immediate subdirectories from root to avoid deep recursion
          const subFiles = await this.getAllRepositoryFiles(owner, repo, ref, item.path);
          if (subFiles.success) {
            files.push(...subFiles.files);
          }
        }
      }

      return {
        success: true,
        files
      };

    } catch (error) {
      return {
        success: false,
        error: `Failed to get repository files: ${error.message}`
      };
    }
  }

  /**
   * Process enhanced portfolio content based on file mapping
   * @param {string} owner - Repository owner
   * @param {string} repo - Repository name
   * @param {object} portfolioMapping - File mapping structure
   * @param {string} ref - Git reference
   * @returns {Promise<{success: boolean, content?: object, error?: string}>}
   */
  async processEnhancedPortfolioContent(owner, repo, portfolioMapping, ref) {
    const content = {};
    
    try {
      // Process each mapped section
      for (const [section, sectionData] of Object.entries(portfolioMapping)) {
        if (section === 'generated') continue; // Skip generated metadata
        
        content[section] = await this.processMappedSection(
          owner, 
          repo, 
          section, 
          sectionData, 
          ref
        );
      }

      return {
        success: true,
        content
      };

    } catch (error) {
      return {
        success: false,
        error: `Failed to process enhanced portfolio content: ${error.message}`
      };
    }
  }

  /**
   * Process a mapped section
   * @param {string} owner - Repository owner
   * @param {string} repo - Repository name
   * @param {string} section - Section name
   * @param {object} sectionData - Section mapping data
   * @param {string} ref - Git reference
   * @returns {Promise<object>} Processed section content
   */
  async processMappedSection(owner, repo, section, sectionData, ref) {
    const sectionContent = {
      type: section,
      sources: [],
      processed: null
    };

    try {
      // Handle different section types
      switch (section) {
        case 'data':
          sectionContent.processed = await this.processDataFiles(owner, repo, sectionData.files, ref);
          break;
          
        case 'about':
          sectionContent.processed = await this.processAboutFiles(owner, repo, sectionData.sections, ref);
          break;
          
        case 'projects':
          sectionContent.processed = await this.processProjectFiles(owner, repo, sectionData.sources, ref);
          break;
          
        case 'skills':
          sectionContent.processed = await this.processSkillFiles(owner, repo, sectionData.sources, ref);
          break;
          
        case 'experience':
          sectionContent.processed = await this.processExperienceFiles(owner, repo, sectionData.sources, ref);
          break;
          
        case 'education':
          sectionContent.processed = await this.processEducationFiles(owner, repo, sectionData.sources, ref);
          break;
          
        case 'contact':
          sectionContent.processed = await this.processContactFiles(owner, repo, sectionData.sources, ref);
          break;
          
        case 'images':
          sectionContent.processed = sectionData.images;
          break;
          
        default:
          sectionContent.processed = await this.processGenericFiles(owner, repo, sectionData.sources || [], ref);
      }

    } catch (error) {
      console.error(`Error processing ${section} section:`, error);
      sectionContent.error = error.message;
    }

    return sectionContent;
  }

  /**
   * Process data files (primary portfolio data)
   * @param {string} owner - Repository owner
   * @param {string} repo - Repository name
   * @param {Array} files - Data files
   * @param {string} ref - Git reference
   * @returns {Promise<object>} Processed data
   */
  async processDataFiles(owner, repo, files, ref) {
    if (!files || files.length === 0) return null;
    
    // Process the primary data file
    const primaryFile = files[0];
    const fileContent = await this.getFileContent(owner, repo, primaryFile.path, ref);
    
    if (fileContent) {
      const extension = this.getFileExtension(primaryFile.name);
      const parsed = this.parseFileContent(fileContent, extension);
      
      if (parsed.success) {
        return parsed.content;
      }
    }
    
    return null;
  }

  /**
   * Process about files
   * @param {string} owner - Repository owner
   * @param {string} repo - Repository name
   * @param {Array} sections - About sections
   * @param {string} ref - Git reference
   * @returns {Promise<object>} Processed about content
   */
  async processAboutFiles(owner, repo, sections, ref) {
    if (!sections || sections.length === 0) return null;
    
    const primarySection = sections[0];
    const fileContent = await this.getFileContent(owner, repo, primarySection.path, ref);
    
    if (fileContent) {
      const extension = this.getFileExtension(primarySection.source);
      const parsed = this.parseFileContent(fileContent, extension);
      
      if (parsed.success) {
        return {
          content: parsed.content,
          source: primarySection.source,
          type: primarySection.type
        };
      }
    }
    
    return null;
  }

  /**
   * Process project files
   * @param {string} owner - Repository owner
   * @param {string} repo - Repository name
   * @param {Array} sources - Project sources
   * @param {string} ref - Git reference
   * @returns {Promise<Array>} Processed projects
   */
  async processProjectFiles(owner, repo, sources, ref) {
    if (!sources || sources.length === 0) return [];
    
    const primarySource = sources[0];
    const fileContent = await this.getFileContent(owner, repo, primarySource.path, ref);
    
    if (fileContent) {
      const extension = this.getFileExtension(primarySource.source);
      const parsed = this.parseFileContent(fileContent, extension);
      
      if (parsed.success) {
        // Handle different project data formats
        if (Array.isArray(parsed.content)) {
          return parsed.content;
        } else if (parsed.content.projects) {
          return parsed.content.projects;
        } else if (typeof parsed.content === 'object') {
          return [parsed.content]; // Single project
        }
      }
    }
    
    return [];
  }

  /**
   * Process skill files
   * @param {string} owner - Repository owner
   * @param {string} repo - Repository name
   * @param {Array} sources - Skill sources
   * @param {string} ref - Git reference
   * @returns {Promise<Array>} Processed skills
   */
  async processSkillFiles(owner, repo, sources, ref) {
    if (!sources || sources.length === 0) return [];
    
    const primarySource = sources[0];
    const fileContent = await this.getFileContent(owner, repo, primarySource.path, ref);
    
    if (fileContent) {
      const extension = this.getFileExtension(primarySource.source);
      const parsed = this.parseFileContent(fileContent, extension);
      
      if (parsed.success) {
        // Handle different skill data formats
        if (Array.isArray(parsed.content)) {
          return parsed.content;
        } else if (parsed.content.skills) {
          return parsed.content.skills;
        } else if (typeof parsed.content === 'object') {
          // Convert categorized skills to flat array
          const skills = [];
          for (const [category, categorySkills] of Object.entries(parsed.content)) {
            if (Array.isArray(categorySkills)) {
              skills.push(...categorySkills.map(skill => ({
                ...skill,
                category
              })));
            }
          }
          return skills;
        }
      }
    }
    
    return [];
  }

  /**
   * Process experience files
   * @param {string} owner - Repository owner
   * @param {string} repo - Repository name
   * @param {Array} sources - Experience sources
   * @param {string} ref - Git reference
   * @returns {Promise<Array>} Processed experience
   */
  async processExperienceFiles(owner, repo, sources, ref) {
    if (!sources || sources.length === 0) return [];
    
    const primarySource = sources[0];
    const fileContent = await this.getFileContent(owner, repo, primarySource.path, ref);
    
    if (fileContent) {
      const extension = this.getFileExtension(primarySource.source);
      const parsed = this.parseFileContent(fileContent, extension);
      
      if (parsed.success) {
        if (Array.isArray(parsed.content)) {
          return parsed.content;
        } else if (parsed.content.experience) {
          return parsed.content.experience;
        }
      }
    }
    
    return [];
  }

  /**
   * Process education files
   * @param {string} owner - Repository owner
   * @param {string} repo - Repository name
   * @param {Array} sources - Education sources
   * @param {string} ref - Git reference
   * @returns {Promise<Array>} Processed education
   */
  async processEducationFiles(owner, repo, sources, ref) {
    if (!sources || sources.length === 0) return [];
    
    const primarySource = sources[0];
    const fileContent = await this.getFileContent(owner, repo, primarySource.path, ref);
    
    if (fileContent) {
      const extension = this.getFileExtension(primarySource.source);
      const parsed = this.parseFileContent(fileContent, extension);
      
      if (parsed.success) {
        if (Array.isArray(parsed.content)) {
          return parsed.content;
        } else if (parsed.content.education) {
          return parsed.content.education;
        }
      }
    }
    
    return [];
  }

  /**
   * Process contact files
   * @param {string} owner - Repository owner
   * @param {string} repo - Repository name
   * @param {Array} sources - Contact sources
   * @param {string} ref - Git reference
   * @returns {Promise<object>} Processed contact info
   */
  async processContactFiles(owner, repo, sources, ref) {
    if (!sources || sources.length === 0) return {};
    
    const primarySource = sources[0];
    const fileContent = await this.getFileContent(owner, repo, primarySource.path, ref);
    
    if (fileContent) {
      const extension = this.getFileExtension(primarySource.source);
      const parsed = this.parseFileContent(fileContent, extension);
      
      if (parsed.success) {
        return parsed.content;
      }
    }
    
    return {};
  }

  /**
   * Process generic files
   * @param {string} owner - Repository owner
   * @param {string} repo - Repository name
   * @param {Array} sources - File sources
   * @param {string} ref - Git reference
   * @returns {Promise<any>} Processed content
   */
  async processGenericFiles(owner, repo, sources, ref) {
    if (!sources || sources.length === 0) return null;
    
    const primarySource = sources[0];
    const fileContent = await this.getFileContent(owner, repo, primarySource.path, ref);
    
    if (fileContent) {
      const extension = this.getFileExtension(primarySource.source);
      const parsed = this.parseFileContent(fileContent, extension);
      
      if (parsed.success) {
        return parsed.content;
      }
    }
    
    return null;
  }

  /**
   * Get file content from GitHub
   * @param {string} owner - Repository owner
   * @param {string} repo - Repository name
   * @param {string} path - File path
   * @param {string} ref - Git reference
   * @returns {Promise<string|null>} File content
   */
  async getFileContent(owner, repo, path, ref) {
    try {
      const { data: fileData } = await this.octokit.rest.repos.getContent({
        owner,
        repo,
        path,
        ref
      });

      if (fileData.type !== 'file') {
        return null;
      }

      // Decode content
      return fileData.encoding === 'base64' 
        ? Buffer.from(fileData.content, 'base64').toString('utf-8')
        : fileData.content;

    } catch (error) {
      console.error(`Error getting file content for ${path}:`, error);
      return null;
    }
  }

  /**
   * Build enhanced portfolio data structure
   * @param {object} content - Processed content
   * @param {object} mapping - Portfolio mapping
   * @param {object} repository - GitHub repository data
   * @param {string} ref - Git reference
   * @returns {object} Enhanced portfolio data
   */
  buildEnhancedPortfolioData(content, mapping, repository, ref) {
    // Start with basic portfolio structure
    const portfolioData = {
      // Repository metadata
      repository: {
        owner: repository.owner.login,
        name: repository.name,
        fullName: repository.full_name,
        description: repository.description,
        url: repository.html_url,
        defaultBranch: repository.default_branch,
        ref,
        updatedAt: repository.updated_at,
        createdAt: repository.created_at
      },
      
      // Default values
      name: repository.owner.login,
      title: repository.description || `${repository.owner.login}'s Portfolio`,
      description: repository.description || '',
      avatar: repository.owner.avatar_url,
      
      // Enhanced metadata
      mapping: {
        detected: Object.keys(mapping).filter(k => k !== 'generated'),
        generated: mapping.generated || null,
        lastProcessed: new Date().toISOString()
      },
      
      // Content sections
      lastUpdated: new Date().toISOString(),
      source: 'github-repository-enhanced'
    };

    // Apply primary data if available
    if (content.data?.processed) {
      Object.assign(portfolioData, content.data.processed);
    }

    // Apply section-specific content
    if (content.about?.processed) {
      portfolioData.about = content.about.processed;
    }

    if (content.projects?.processed) {
      portfolioData.projects = content.projects.processed;
    }

    if (content.skills?.processed) {
      portfolioData.skills = content.skills.processed;
    }

    if (content.experience?.processed) {
      portfolioData.experience = content.experience.processed;
    }

    if (content.education?.processed) {
      portfolioData.education = content.education.processed;
    }

    if (content.contact?.processed) {
      portfolioData.contact = content.contact.processed;
    }

    if (content.images?.processed) {
      if (content.images.processed.avatar) {
        portfolioData.avatar = content.images.processed.avatar.downloadUrl;
      }
      portfolioData.images = content.images.processed;
    }

    return portfolioData;
  }
}

/**
 * Create a new GitHubPortfolioService instance
 * @param {object} options - Configuration options
 * @returns {GitHubPortfolioService} New service instance
 */
export function createGitHubPortfolioService(options = {}) {
  return new GitHubPortfolioService(options);
}

export default GitHubPortfolioService;