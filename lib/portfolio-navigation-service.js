/**
 * Portfolio Navigation Service
 * Handles navigation structure generation and page routing for portfolios
 * Supports automatic menu generation from repository file structure
 */

import { Octokit } from '@octokit/rest';
import yaml from 'js-yaml';

/**
 * Portfolio Navigation Service class
 * Manages navigation structure and multi-page portfolio routing
 */
export class PortfolioNavigationService {
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
      supportedPageFormats: ['md', 'markdown', 'html', 'json', 'yaml', 'yml'],
      ...options
    };

    // Simple in-memory cache for navigation data
    this.cache = new Map();

    // Define navigation patterns
    this.navigationPatterns = this.initializeNavigationPatterns();
  }

  /**
   * Initialize navigation patterns for automatic detection
   */
  initializeNavigationPatterns() {
    return {
      // Page directories that indicate multi-page structure
      pageDirectories: [
        'pages',
        'content',
        'docs',
        'sections',
        'portfolio'
      ],

      // Navigation configuration files
      navigationFiles: [
        { pattern: /^navigation\.(json|yaml|yml)$/i, priority: 1 },
        { pattern: /^menu\.(json|yaml|yml)$/i, priority: 2 },
        { pattern: /^config\.(json|yaml|yml)$/i, priority: 3 },
        { pattern: /^_config\.(json|yaml|yml)$/i, priority: 4 }
      ],

      // Standard page files
      standardPages: [
        { pattern: /^about\.(md|html)$/i, title: 'About', section: 'about' },
        { pattern: /^projects\.(md|html)$/i, title: 'Projects', section: 'projects' },
        { pattern: /^portfolio\.(md|html)$/i, title: 'Portfolio', section: 'portfolio' },
        { pattern: /^work\.(md|html)$/i, title: 'Work', section: 'work' },
        { pattern: /^experience\.(md|html)$/i, title: 'Experience', section: 'experience' },
        { pattern: /^skills\.(md|html)$/i, title: 'Skills', section: 'skills' },
        { pattern: /^contact\.(md|html)$/i, title: 'Contact', section: 'contact' },
        { pattern: /^blog\.(md|html)$/i, title: 'Blog', section: 'blog' },
        { pattern: /^resume\.(md|html)$/i, title: 'Resume', section: 'resume' }
      ],

      // Ignore patterns
      ignorePatterns: [
        /^readme\.md$/i,
        /^license/i,
        /^changelog/i,
        /^contributing/i,
        /^\./,
        /^_/
      ]
    };
  }

  /**
   * Get navigation structure for a repository
   * @param {string} owner - Repository owner
   * @param {string} repo - Repository name
   * @param {string} [ref] - Git reference
   * @returns {Promise<{success: boolean, navigation?: object, error?: string}>}
   */
  async getNavigationStructure(owner, repo, ref = null) {
    const cacheKey = `nav_${owner}/${repo}${ref ? `@${ref}` : ''}`;
    
    try {
      // Check cache first
      if (this.cache.has(cacheKey)) {
        const cached = this.cache.get(cacheKey);
        if (Date.now() - cached.timestamp < this.options.cacheTimeout) {
          return cached.data;
        }
        this.cache.delete(cacheKey);
      }

      // Get repository information
      const { data: repository } = await this.octokit.rest.repos.get({
        owner,
        repo
      });

      const targetRef = ref || repository.default_branch;

      // Get repository structure
      const repositoryStructure = await this.getRepositoryStructure(owner, repo, targetRef);
      if (!repositoryStructure.success) {
        return repositoryStructure;
      }

      // Check for explicit navigation configuration
      const explicitNavigation = await this.getExplicitNavigation(
        owner, 
        repo, 
        repositoryStructure.files, 
        targetRef
      );

      // Generate navigation structure
      const navigation = explicitNavigation.success 
        ? explicitNavigation.navigation
        : this.generateAutomaticNavigation(repositoryStructure.files, repositoryStructure.directories);

      // Enhance navigation with metadata
      const enhancedNavigation = {
        ...navigation,
        repository: {
          owner,
          name: repo,
          ref: targetRef
        },
        generated: !explicitNavigation.success,
        lastUpdated: new Date().toISOString()
      };

      const result = {
        success: true,
        navigation: enhancedNavigation
      };

      // Cache the result
      this.cache.set(cacheKey, {
        data: result,
        timestamp: Date.now()
      });

      return result;

    } catch (error) {
      console.error('Navigation service error:', error);
      
      if (error.status === 404) {
        return {
          success: false,
          error: 'repository_not_found',
          message: `Repository ${owner}/${repo} not found`
        };
      }
      
      return {
        success: false,
        error: 'navigation_error',
        message: `Failed to get navigation structure: ${error.message}`
      };
    }
  }

  /**
   * Get repository structure for navigation analysis
   * @param {string} owner - Repository owner
   * @param {string} repo - Repository name
   * @param {string} ref - Git reference
   * @returns {Promise<{success: boolean, files?: Array, directories?: Array, error?: string}>}
   */
  async getRepositoryStructure(owner, repo, ref) {
    try {
      const files = [];
      const directories = [];

      // Get root contents
      const { data: rootContents } = await this.octokit.rest.repos.getContent({
        owner,
        repo,
        path: '',
        ref
      });

      // Process root items
      for (const item of rootContents) {
        if (item.type === 'file') {
          files.push({
            name: item.name,
            path: item.path,
            type: item.type,
            size: item.size,
            sha: item.sha,
            download_url: item.download_url
          });
        } else if (item.type === 'dir') {
          directories.push({
            name: item.name,
            path: item.path,
            type: item.type
          });

          // Check if it's a page directory
          if (this.navigationPatterns.pageDirectories.includes(item.name.toLowerCase())) {
            const dirContents = await this.getDirectoryContents(owner, repo, item.path, ref);
            if (dirContents.success) {
              files.push(...dirContents.files);
            }
          }
        }
      }

      return {
        success: true,
        files,
        directories
      };

    } catch (error) {
      return {
        success: false,
        error: `Failed to get repository structure: ${error.message}`
      };
    }
  }

  /**
   * Get directory contents
   * @param {string} owner - Repository owner
   * @param {string} repo - Repository name
   * @param {string} path - Directory path
   * @param {string} ref - Git reference
   * @returns {Promise<{success: boolean, files?: Array, error?: string}>}
   */
  async getDirectoryContents(owner, repo, path, ref) {
    try {
      const { data: contents } = await this.octokit.rest.repos.getContent({
        owner,
        repo,
        path,
        ref
      });

      const files = [];
      
      for (const item of contents) {
        if (item.type === 'file') {
          files.push({
            name: item.name,
            path: item.path,
            type: item.type,
            size: item.size,
            sha: item.sha,
            download_url: item.download_url,
            directory: path
          });
        }
      }

      return {
        success: true,
        files
      };

    } catch (error) {
      return {
        success: false,
        error: `Failed to get directory contents: ${error.message}`
      };
    }
  }

  /**
   * Get explicit navigation configuration from files
   * @param {string} owner - Repository owner
   * @param {string} repo - Repository name
   * @param {Array} files - Repository files
   * @param {string} ref - Git reference
   * @returns {Promise<{success: boolean, navigation?: object, error?: string}>}
   */
  async getExplicitNavigation(owner, repo, files, ref) {
    // Find navigation configuration files
    const navFiles = [];
    
    for (const file of files) {
      for (const { pattern, priority } of this.navigationPatterns.navigationFiles) {
        if (pattern.test(file.name)) {
          navFiles.push({ ...file, priority });
          break;
        }
      }
    }

    if (navFiles.length === 0) {
      return { success: false, error: 'No navigation configuration found' };
    }

    // Sort by priority and use the first one
    navFiles.sort((a, b) => a.priority - b.priority);
    const navFile = navFiles[0];

    try {
      // Get navigation file content
      const { data: fileData } = await this.octokit.rest.repos.getContent({
        owner,
        repo,
        path: navFile.path,
        ref
      });

      const content = fileData.encoding === 'base64' 
        ? Buffer.from(fileData.content, 'base64').toString('utf-8')
        : fileData.content;

      // Parse navigation configuration
      const extension = this.getFileExtension(navFile.name);
      let navigationConfig;

      if (extension === '.json') {
        navigationConfig = JSON.parse(content);
      } else if (['.yaml', '.yml'].includes(extension)) {
        navigationConfig = yaml.load(content);
      } else {
        return { success: false, error: 'Unsupported navigation file format' };
      }

      // Validate and normalize navigation structure
      const navigation = this.normalizeNavigationConfig(navigationConfig);

      return {
        success: true,
        navigation,
        source: navFile.name
      };

    } catch (error) {
      return {
        success: false,
        error: `Failed to parse navigation configuration: ${error.message}`
      };
    }
  }

  /**
   * Generate automatic navigation from repository structure
   * @param {Array} files - Repository files
   * @param {Array} directories - Repository directories
   * @returns {object} Generated navigation structure
   */
  generateAutomaticNavigation(files, directories) {
    const navigation = {
      pages: [],
      sections: [],
      menu: []
    };

    // Detect standard pages
    for (const file of files) {
      // Skip ignored files
      if (this.shouldIgnoreFile(file.name)) {
        continue;
      }

      // Check against standard page patterns
      for (const { pattern, title, section } of this.navigationPatterns.standardPages) {
        if (pattern.test(file.name)) {
          const page = {
            title,
            path: this.getPagePath(file),
            section,
            file: file.name,
            type: this.getFileType(file.name)
          };

          navigation.pages.push(page);
          
          if (!navigation.sections.find(s => s.name === section)) {
            navigation.sections.push({
              name: section,
              title,
              pages: [page]
            });
          } else {
            navigation.sections.find(s => s.name === section).pages.push(page);
          }

          break;
        }
      }
    }

    // Generate menu from detected pages
    navigation.menu = navigation.pages.map(page => ({
      title: page.title,
      path: page.path,
      section: page.section
    }));

    // Sort menu items by common order
    const menuOrder = ['about', 'projects', 'portfolio', 'work', 'experience', 'skills', 'blog', 'contact', 'resume'];
    navigation.menu.sort((a, b) => {
      const aIndex = menuOrder.indexOf(a.section);
      const bIndex = menuOrder.indexOf(b.section);
      
      if (aIndex === -1 && bIndex === -1) return 0;
      if (aIndex === -1) return 1;
      if (bIndex === -1) return -1;
      
      return aIndex - bIndex;
    });

    return navigation;
  }

  /**
   * Normalize navigation configuration
   * @param {object} config - Raw navigation configuration
   * @returns {object} Normalized navigation structure
   */
  normalizeNavigationConfig(config) {
    const navigation = {
      pages: [],
      sections: [],
      menu: []
    };

    // Handle different configuration formats
    if (config.navigation) {
      config = config.navigation;
    }

    // Process pages
    if (config.pages) {
      navigation.pages = config.pages.map(page => ({
        title: page.title || page.name,
        path: page.path || page.url,
        section: page.section || 'general',
        file: page.file,
        type: page.type || 'page',
        description: page.description,
        order: page.order || 0
      }));
    }

    // Process menu
    if (config.menu) {
      navigation.menu = config.menu.map(item => ({
        title: item.title || item.name,
        path: item.path || item.url,
        section: item.section,
        order: item.order || 0,
        external: item.external || false
      }));
    } else {
      // Generate menu from pages
      navigation.menu = navigation.pages.map(page => ({
        title: page.title,
        path: page.path,
        section: page.section,
        order: page.order || 0
      }));
    }

    // Process sections
    if (config.sections) {
      navigation.sections = config.sections;
    } else {
      // Generate sections from pages
      const sectionMap = new Map();
      
      for (const page of navigation.pages) {
        if (!sectionMap.has(page.section)) {
          sectionMap.set(page.section, {
            name: page.section,
            title: this.formatSectionTitle(page.section),
            pages: []
          });
        }
        sectionMap.get(page.section).pages.push(page);
      }
      
      navigation.sections = Array.from(sectionMap.values());
    }

    // Sort by order
    navigation.pages.sort((a, b) => (a.order || 0) - (b.order || 0));
    navigation.menu.sort((a, b) => (a.order || 0) - (b.order || 0));

    return navigation;
  }

  /**
   * Check if a page exists in the navigation structure
   * @param {string} pagePath - Page path to check
   * @param {object} navigation - Navigation structure
   * @returns {boolean} True if page exists
   */
  pageExists(pagePath, navigation) {
    return navigation.pages.some(page => page.path === pagePath);
  }

  /**
   * Get page information
   * @param {string} pagePath - Page path
   * @param {object} navigation - Navigation structure
   * @returns {object|null} Page information
   */
  getPageInfo(pagePath, navigation) {
    return navigation.pages.find(page => page.path === pagePath) || null;
  }

  /**
   * Get page content
   * @param {string} owner - Repository owner
   * @param {string} repo - Repository name
   * @param {string} pagePath - Page path
   * @param {string} [ref] - Git reference
   * @returns {Promise<object>} Page content
   */
  async getPageContent(owner, repo, pagePath, ref = null) {
    try {
      // Get navigation structure to find the file
      const navigationResult = await this.getNavigationStructure(owner, repo, ref);
      if (!navigationResult.success) {
        return { success: false, error: 'Navigation not available' };
      }

      const pageInfo = this.getPageInfo(pagePath, navigationResult.navigation);
      if (!pageInfo || !pageInfo.file) {
        return { success: false, error: 'Page file not found' };
      }

      // Get file content
      const { data: fileData } = await this.octokit.rest.repos.getContent({
        owner,
        repo,
        path: pageInfo.file,
        ref: ref || navigationResult.navigation.repository.ref
      });

      const content = fileData.encoding === 'base64' 
        ? Buffer.from(fileData.content, 'base64').toString('utf-8')
        : fileData.content;

      // Parse content based on file type
      const parsedContent = this.parsePageContent(content, pageInfo.type);

      return {
        success: true,
        content: parsedContent,
        pageInfo,
        lastModified: fileData.sha
      };

    } catch (error) {
      return {
        success: false,
        error: `Failed to get page content: ${error.message}`
      };
    }
  }

  /**
   * Get navigation links for a specific page
   * @param {string} pagePath - Current page path
   * @param {object} navigation - Navigation structure
   * @returns {object} Previous and next page links
   */
  getPageNavigation(pagePath, navigation) {
    if (!navigation || !navigation.pages) {
      return { previous: null, next: null };
    }

    const currentIndex = navigation.pages.findIndex(page => page.path === pagePath);
    if (currentIndex === -1) {
      return { previous: null, next: null };
    }

    const previous = currentIndex > 0 ? navigation.pages[currentIndex - 1] : null;
    const next = currentIndex < navigation.pages.length - 1 ? navigation.pages[currentIndex + 1] : null;

    return { previous, next };
  }

  /**
   * Get related pages in the same section
   * @param {string} pagePath - Current page path
   * @param {object} navigation - Navigation structure
   * @returns {Array} Related pages
   */
  getRelatedPages(pagePath, navigation) {
    if (!navigation || !navigation.pages) {
      return [];
    }

    const currentPage = navigation.pages.find(page => page.path === pagePath);
    if (!currentPage) {
      return [];
    }

    return navigation.pages.filter(page => 
      page.section === currentPage.section && page.path !== pagePath
    );
  }

  /**
   * Generate sitemap for the portfolio
   * @param {string} owner - Repository owner
   * @param {string} repo - Repository name
   * @param {string} baseUrl - Base URL for the portfolio
   * @param {object} navigation - Navigation structure
   * @returns {Array} Sitemap entries
   */
  generateSitemap(owner, repo, baseUrl, navigation) {
    const sitemap = [];
    
    // Add main portfolio page
    sitemap.push({
      url: `${baseUrl}/${owner}/${repo}`,
      lastModified: new Date().toISOString(),
      changeFrequency: 'weekly',
      priority: 1.0
    });

    // Add all pages
    if (navigation && navigation.pages) {
      navigation.pages.forEach(page => {
        sitemap.push({
          url: `${baseUrl}/${owner}/${repo}/${page.path}`,
          lastModified: new Date().toISOString(),
          changeFrequency: 'monthly',
          priority: 0.8
        });
      });
    }

    return sitemap;
  }

  /**
   * Parse page content based on type
   * @param {string} content - Raw content
   * @param {string} type - Content type
   * @returns {object} Parsed content
   */
  parsePageContent(content, type) {
    switch (type) {
      case 'markdown':
        return this.parseMarkdownContent(content);
      case 'json':
        try {
          return { type: 'json', data: JSON.parse(content) };
        } catch (error) {
          return { type: 'text', content, error: 'Invalid JSON' };
        }
      case 'yaml':
        try {
          return { type: 'yaml', data: yaml.load(content) };
        } catch (error) {
          return { type: 'text', content, error: 'Invalid YAML' };
        }
      case 'html':
        return { type: 'html', content };
      default:
        return { type: 'text', content };
    }
  }

  /**
   * Parse markdown content with frontmatter
   * @param {string} content - Markdown content
   * @returns {object} Parsed markdown
   */
  parseMarkdownContent(content) {
    const frontmatterRegex = /^---\s*\n([\s\S]*?)\n---\s*\n([\s\S]*)$/;
    const match = content.match(frontmatterRegex);
    
    if (match) {
      try {
        const frontmatter = yaml.load(match[1]) || {};
        const body = match[2].trim();
        
        return {
          type: 'markdown',
          frontmatter,
          body,
          content
        };
      } catch (error) {
        return {
          type: 'markdown',
          frontmatter: {},
          body: content,
          content
        };
      }
    }
    
    return {
      type: 'markdown',
      frontmatter: {},
      body: content,
      content
    };
  }

  /**
   * Get page path from file
   * @param {object} file - File object
   * @returns {string} Page path
   */
  getPagePath(file) {
    // Remove extension and directory prefix
    let path = file.name.replace(/\.[^/.]+$/, '');
    
    // If file is in a directory, include directory in path
    if (file.directory) {
      path = `${file.directory}/${path}`;
    }
    
    return path;
  }

  /**
   * Check if file should be ignored
   * @param {string} filename - File name
   * @returns {boolean} True if should be ignored
   */
  shouldIgnoreFile(filename) {
    return this.navigationPatterns.ignorePatterns.some(pattern => pattern.test(filename));
  }

  /**
   * Get file type from filename
   * @param {string} filename - File name
   * @returns {string} File type
   */
  getFileType(filename) {
    const extension = this.getFileExtension(filename);
    
    switch (extension.toLowerCase()) {
      case '.md':
      case '.markdown':
        return 'markdown';
      case '.html':
      case '.htm':
        return 'html';
      case '.json':
        return 'json';
      case '.yaml':
      case '.yml':
        return 'yaml';
      default:
        return 'text';
    }
  }

  /**
   * Get file extension
   * @param {string} filename - File name
   * @returns {string} File extension
   */
  getFileExtension(filename) {
    const lastDot = filename.lastIndexOf('.');
    return lastDot === -1 ? '' : filename.substring(lastDot);
  }

  /**
   * Format section title
   * @param {string} section - Section name
   * @returns {string} Formatted title
   */
  formatSectionTitle(section) {
    return section.charAt(0).toUpperCase() + section.slice(1);
  }

  /**
   * Clear cache
   */
  clearCache() {
    this.cache.clear();
  }
}

/**
 * Create a new portfolio navigation service instance
 * @param {object} options - Configuration options
 * @returns {PortfolioNavigationService} New service instance
 */
export function createPortfolioNavigationService(options = {}) {
  return new PortfolioNavigationService(options);
}

export default PortfolioNavigationService;