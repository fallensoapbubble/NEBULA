/**
 * GitHub File-to-Portfolio Mapper
 * Maps repository files directly to portfolio sections
 * Supports standard portfolio files and automatic portfolio generation
 */

import yaml from 'js-yaml';
import { marked } from 'marked';

/**
 * GitHub File-to-Portfolio Mapper class
 * Handles automatic mapping of repository files to portfolio structure
 */
export class GitHubFilePortfolioMapper {
  constructor(options = {}) {
    this.options = {
      maxFileSize: options.maxFileSize || 1024 * 1024, // 1MB
      supportedImageFormats: ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'],
      supportedDataFormats: ['json', 'yaml', 'yml', 'toml'],
      supportedDocFormats: ['md', 'markdown', 'txt', 'rst'],
      ...options
    };

    // Define standard portfolio file patterns
    this.portfolioFilePatterns = this.initializeFilePatterns();
    
    // Initialize section processors
    this.sectionProcessors = this.initializeSectionProcessors();
  }

  /**
   * Initialize file patterns for portfolio mapping
   */
  initializeFilePatterns() {
    return {
      // Primary data files (highest priority)
      data: [
        { pattern: /^data\.(json|yaml|yml)$/i, priority: 1 },
        { pattern: /^portfolio\.(json|yaml|yml)$/i, priority: 1 },
        { pattern: /^profile\.(json|yaml|yml)$/i, priority: 2 }
      ],

      // About/Bio files
      about: [
        { pattern: /^about\.(md|markdown)$/i, priority: 1 },
        { pattern: /^bio\.(md|markdown)$/i, priority: 2 },
        { pattern: /^readme\.md$/i, priority: 3 },
        { pattern: /^profile\.(md|markdown)$/i, priority: 2 }
      ],

      // Project files
      projects: [
        { pattern: /^projects\.(json|yaml|yml)$/i, priority: 1 },
        { pattern: /^work\.(json|yaml|yml)$/i, priority: 2 },
        { pattern: /^portfolio\.(json|yaml|yml)$/i, priority: 3 },
        { pattern: /^projects\.(md|markdown)$/i, priority: 4 }
      ],

      // Skills files
      skills: [
        { pattern: /^skills\.(json|yaml|yml)$/i, priority: 1 },
        { pattern: /^technologies\.(json|yaml|yml)$/i, priority: 2 },
        { pattern: /^expertise\.(json|yaml|yml)$/i, priority: 3 }
      ],

      // Experience files
      experience: [
        { pattern: /^experience\.(json|yaml|yml)$/i, priority: 1 },
        { pattern: /^work-history\.(json|yaml|yml)$/i, priority: 2 },
        { pattern: /^career\.(json|yaml|yml)$/i, priority: 3 },
        { pattern: /^resume\.(json|yaml|yml)$/i, priority: 4 }
      ],

      // Education files
      education: [
        { pattern: /^education\.(json|yaml|yml)$/i, priority: 1 },
        { pattern: /^academic\.(json|yaml|yml)$/i, priority: 2 },
        { pattern: /^qualifications\.(json|yaml|yml)$/i, priority: 3 }
      ],

      // Contact files
      contact: [
        { pattern: /^contact\.(json|yaml|yml)$/i, priority: 1 },
        { pattern: /^social\.(json|yaml|yml)$/i, priority: 2 },
        { pattern: /^links\.(json|yaml|yml)$/i, priority: 3 }
      ],

      // Configuration files
      config: [
        { pattern: /^config\.(json|yaml|yml)$/i, priority: 1 },
        { pattern: /^settings\.(json|yaml|yml)$/i, priority: 2 },
        { pattern: /^_config\.(json|yaml|yml)$/i, priority: 3 }
      ],

      // Media files
      images: [
        { pattern: /^avatar\.(jpg|jpeg|png|gif|webp)$/i, priority: 1 },
        { pattern: /^profile\.(jpg|jpeg|png|gif|webp)$/i, priority: 1 },
        { pattern: /^photo\.(jpg|jpeg|png|gif|webp)$/i, priority: 2 },
        { pattern: /^headshot\.(jpg|jpeg|png|gif|webp)$/i, priority: 2 }
      ]
    };
  }

  /**
   * Initialize section processors
   */
  initializeSectionProcessors() {
    return {
      data: this.processDataSection.bind(this),
      about: this.processAboutSection.bind(this),
      projects: this.processProjectsSection.bind(this),
      skills: this.processSkillsSection.bind(this),
      experience: this.processExperienceSection.bind(this),
      education: this.processEducationSection.bind(this),
      contact: this.processContactSection.bind(this),
      config: this.processConfigSection.bind(this),
      images: this.processImagesSection.bind(this)
    };
  }

  /**
   * Map repository files to portfolio structure
   * @param {Array} files - Array of repository files
   * @returns {object} Mapped portfolio structure
   */
  mapFilesToPortfolio(files) {
    // Categorize files by portfolio sections
    const categorizedFiles = this.categorizeFiles(files);
    
    // Process each section
    const portfolioSections = {};
    
    for (const [section, sectionFiles] of Object.entries(categorizedFiles)) {
      if (sectionFiles.length > 0) {
        const processor = this.sectionProcessors[section];
        if (processor) {
          portfolioSections[section] = processor(sectionFiles);
        }
      }
    }

    // Generate automatic portfolio structure if no explicit data files
    if (!portfolioSections.data) {
      portfolioSections.generated = this.generateAutomaticPortfolio(portfolioSections);
    }

    return portfolioSections;
  }

  /**
   * Categorize files into portfolio sections
   * @param {Array} files - Repository files
   * @returns {object} Categorized files
   */
  categorizeFiles(files) {
    const categorized = {};
    
    // Initialize categories
    for (const section of Object.keys(this.portfolioFilePatterns)) {
      categorized[section] = [];
    }

    // Categorize each file
    for (const file of files) {
      if (file.type !== 'file' || file.size > this.options.maxFileSize) {
        continue;
      }

      let matched = false;
      
      // Check against each section's patterns
      for (const [section, patterns] of Object.entries(this.portfolioFilePatterns)) {
        for (const { pattern, priority } of patterns) {
          if (pattern.test(file.name)) {
            categorized[section].push({
              ...file,
              priority,
              section
            });
            matched = true;
            break;
          }
        }
        if (matched) break;
      }
    }

    // Sort files in each category by priority
    for (const section of Object.keys(categorized)) {
      categorized[section].sort((a, b) => a.priority - b.priority);
    }

    return categorized;
  }

  /**
   * Process data section files
   * @param {Array} files - Data files
   * @returns {object} Processed data section
   */
  processDataSection(files) {
    const primaryFile = files[0]; // Highest priority file
    
    return {
      type: 'data',
      source: primaryFile.name,
      priority: primaryFile.priority,
      files: files.map(f => ({
        name: f.name,
        path: f.path,
        size: f.size,
        downloadUrl: f.download_url
      }))
    };
  }

  /**
   * Process about section files
   * @param {Array} files - About files
   * @returns {object} Processed about section
   */
  processAboutSection(files) {
    const sections = [];
    
    for (const file of files) {
      sections.push({
        source: file.name,
        type: this.getFileType(file.name),
        priority: file.priority,
        path: file.path,
        downloadUrl: file.download_url,
        processing: {
          expectsMarkdown: file.name.match(/\.(md|markdown)$/i),
          expectsFrontmatter: file.name.match(/\.(md|markdown)$/i)
        }
      });
    }

    return {
      type: 'about',
      sections,
      primary: sections[0] // Highest priority
    };
  }

  /**
   * Process projects section files
   * @param {Array} files - Project files
   * @returns {object} Processed projects section
   */
  processProjectsSection(files) {
    const projectSources = [];
    
    for (const file of files) {
      const fileType = this.getFileType(file.name);
      
      projectSources.push({
        source: file.name,
        type: fileType,
        priority: file.priority,
        path: file.path,
        downloadUrl: file.download_url,
        processing: {
          expectsArray: fileType !== 'markdown',
          expectsStructuredData: ['json', 'yaml', 'yml'].includes(fileType),
          expectsMarkdown: fileType === 'markdown'
        }
      });
    }

    return {
      type: 'projects',
      sources: projectSources,
      primary: projectSources[0],
      mapping: {
        standardFields: ['name', 'title', 'description', 'url', 'github', 'technologies', 'image'],
        optionalFields: ['status', 'startDate', 'endDate', 'role', 'team', 'highlights']
      }
    };
  }

  /**
   * Process skills section files
   * @param {Array} files - Skills files
   * @returns {object} Processed skills section
   */
  processSkillsSection(files) {
    const skillSources = [];
    
    for (const file of files) {
      skillSources.push({
        source: file.name,
        type: this.getFileType(file.name),
        priority: file.priority,
        path: file.path,
        downloadUrl: file.download_url,
        processing: {
          expectsArray: true,
          supportsCategorization: true,
          supportsLevels: true
        }
      });
    }

    return {
      type: 'skills',
      sources: skillSources,
      primary: skillSources[0],
      mapping: {
        formats: [
          'string[]', // Simple array of skill names
          'object[]', // Array of skill objects with name, level, category
          'categorized' // Object with categories as keys
        ],
        standardFields: ['name', 'level', 'category', 'years', 'percentage']
      }
    };
  }

  /**
   * Process experience section files
   * @param {Array} files - Experience files
   * @returns {object} Processed experience section
   */
  processExperienceSection(files) {
    const experienceSources = [];
    
    for (const file of files) {
      experienceSources.push({
        source: file.name,
        type: this.getFileType(file.name),
        priority: file.priority,
        path: file.path,
        downloadUrl: file.download_url,
        processing: {
          expectsArray: true,
          expectsChronological: true
        }
      });
    }

    return {
      type: 'experience',
      sources: experienceSources,
      primary: experienceSources[0],
      mapping: {
        standardFields: ['company', 'position', 'startDate', 'endDate', 'description', 'technologies', 'achievements'],
        optionalFields: ['location', 'type', 'website', 'logo']
      }
    };
  }

  /**
   * Process education section files
   * @param {Array} files - Education files
   * @returns {object} Processed education section
   */
  processEducationSection(files) {
    const educationSources = [];
    
    for (const file of files) {
      educationSources.push({
        source: file.name,
        type: this.getFileType(file.name),
        priority: file.priority,
        path: file.path,
        downloadUrl: file.download_url
      });
    }

    return {
      type: 'education',
      sources: educationSources,
      primary: educationSources[0],
      mapping: {
        standardFields: ['institution', 'degree', 'field', 'startDate', 'endDate', 'gpa'],
        optionalFields: ['location', 'honors', 'activities', 'thesis']
      }
    };
  }

  /**
   * Process contact section files
   * @param {Array} files - Contact files
   * @returns {object} Processed contact section
   */
  processContactSection(files) {
    const contactSources = [];
    
    for (const file of files) {
      contactSources.push({
        source: file.name,
        type: this.getFileType(file.name),
        priority: file.priority,
        path: file.path,
        downloadUrl: file.download_url
      });
    }

    return {
      type: 'contact',
      sources: contactSources,
      primary: contactSources[0],
      mapping: {
        standardFields: ['email', 'phone', 'location', 'website'],
        socialFields: ['linkedin', 'twitter', 'github', 'instagram', 'facebook', 'youtube'],
        optionalFields: ['timezone', 'availability', 'preferredContact']
      }
    };
  }

  /**
   * Process config section files
   * @param {Array} files - Config files
   * @returns {object} Processed config section
   */
  processConfigSection(files) {
    return {
      type: 'config',
      sources: files.map(f => ({
        source: f.name,
        type: this.getFileType(f.name),
        priority: f.priority,
        path: f.path,
        downloadUrl: f.download_url
      })),
      primary: files[0]
    };
  }

  /**
   * Process images section files
   * @param {Array} files - Image files
   * @returns {object} Processed images section
   */
  processImagesSection(files) {
    const images = {};
    
    for (const file of files) {
      const imageType = this.getImageType(file.name);
      if (imageType) {
        images[imageType] = {
          source: file.name,
          path: file.path,
          downloadUrl: file.download_url,
          size: file.size
        };
      }
    }

    return {
      type: 'images',
      images,
      avatar: images.avatar || images.profile || images.photo || images.headshot
    };
  }

  /**
   * Generate automatic portfolio structure from available sections
   * @param {object} sections - Processed sections
   * @returns {object} Generated portfolio structure
   */
  generateAutomaticPortfolio(sections) {
    const portfolio = {
      generated: true,
      timestamp: new Date().toISOString(),
      structure: {}
    };

    // Generate basic structure based on available sections
    if (sections.about) {
      portfolio.structure.about = {
        enabled: true,
        source: sections.about.primary?.source,
        priority: 1
      };
    }

    if (sections.projects) {
      portfolio.structure.projects = {
        enabled: true,
        source: sections.projects.primary?.source,
        priority: 2,
        displayLimit: 6
      };
    }

    if (sections.skills) {
      portfolio.structure.skills = {
        enabled: true,
        source: sections.skills.primary?.source,
        priority: 3,
        groupByCategory: true
      };
    }

    if (sections.experience) {
      portfolio.structure.experience = {
        enabled: true,
        source: sections.experience.primary?.source,
        priority: 4,
        displayLimit: 5
      };
    }

    if (sections.education) {
      portfolio.structure.education = {
        enabled: true,
        source: sections.education.primary?.source,
        priority: 5
      };
    }

    if (sections.contact) {
      portfolio.structure.contact = {
        enabled: true,
        source: sections.contact.primary?.source,
        priority: 6
      };
    }

    // Set default template based on available sections
    const sectionCount = Object.keys(portfolio.structure).length;
    if (sectionCount <= 3) {
      portfolio.template = 'minimal';
    } else if (sectionCount <= 5) {
      portfolio.template = 'default';
    } else {
      portfolio.template = 'modern';
    }

    return portfolio;
  }

  /**
   * Get file type from filename
   * @param {string} filename - File name
   * @returns {string} File type
   */
  getFileType(filename) {
    const extension = filename.split('.').pop().toLowerCase();
    
    if (['json'].includes(extension)) return 'json';
    if (['yaml', 'yml'].includes(extension)) return 'yaml';
    if (['md', 'markdown'].includes(extension)) return 'markdown';
    if (['txt'].includes(extension)) return 'text';
    if (['toml'].includes(extension)) return 'toml';
    
    return 'unknown';
  }

  /**
   * Get image type from filename
   * @param {string} filename - File name
   * @returns {string|null} Image type
   */
  getImageType(filename) {
    const baseName = filename.split('.')[0].toLowerCase();
    
    if (['avatar', 'profile'].includes(baseName)) return 'avatar';
    if (['photo', 'headshot'].includes(baseName)) return 'profile';
    if (['cover', 'banner', 'hero'].includes(baseName)) return 'cover';
    if (['logo'].includes(baseName)) return 'logo';
    
    return null;
  }

  /**
   * Get mapping suggestions for a repository
   * @param {Array} files - Repository files
   * @returns {object} Mapping suggestions
   */
  getMappingSuggestions(files) {
    const categorized = this.categorizeFiles(files);
    const suggestions = {
      detected: {},
      missing: [],
      recommendations: []
    };

    // Analyze detected sections
    for (const [section, sectionFiles] of Object.entries(categorized)) {
      if (sectionFiles.length > 0) {
        suggestions.detected[section] = {
          files: sectionFiles.map(f => f.name),
          primary: sectionFiles[0].name,
          confidence: this.calculateConfidence(section, sectionFiles)
        };
      }
    }

    // Identify missing essential sections
    const essentialSections = ['about', 'projects', 'contact'];
    for (const section of essentialSections) {
      if (!suggestions.detected[section]) {
        suggestions.missing.push(section);
      }
    }

    // Generate recommendations
    if (suggestions.missing.includes('about')) {
      suggestions.recommendations.push({
        type: 'create_file',
        section: 'about',
        suggestion: 'Create an about.md file with your bio and background'
      });
    }

    if (suggestions.missing.includes('projects')) {
      suggestions.recommendations.push({
        type: 'create_file',
        section: 'projects',
        suggestion: 'Create a projects.json file with your project portfolio'
      });
    }

    if (!suggestions.detected.images) {
      suggestions.recommendations.push({
        type: 'add_image',
        section: 'images',
        suggestion: 'Add an avatar.jpg or profile.png for your profile picture'
      });
    }

    return suggestions;
  }

  /**
   * Calculate confidence score for section detection
   * @param {string} section - Section name
   * @param {Array} files - Section files
   * @returns {number} Confidence score (0-1)
   */
  calculateConfidence(section, files) {
    if (files.length === 0) return 0;
    
    const primaryFile = files[0];
    let confidence = 0.5; // Base confidence
    
    // Higher confidence for lower priority numbers (higher priority)
    confidence += (5 - primaryFile.priority) * 0.1;
    
    // Higher confidence for expected file types
    const expectedTypes = {
      data: ['json', 'yaml'],
      about: ['markdown'],
      projects: ['json', 'yaml'],
      skills: ['json', 'yaml'],
      contact: ['json', 'yaml']
    };
    
    const fileType = this.getFileType(primaryFile.name);
    if (expectedTypes[section]?.includes(fileType)) {
      confidence += 0.2;
    }
    
    // Cap at 1.0
    return Math.min(confidence, 1.0);
  }
}

/**
 * Create a new GitHub file-to-portfolio mapper instance
 * @param {object} options - Configuration options
 * @returns {GitHubFilePortfolioMapper} New mapper instance
 */
export function createGitHubFilePortfolioMapper(options = {}) {
  return new GitHubFilePortfolioMapper(options);
}

export default GitHubFilePortfolioMapper;