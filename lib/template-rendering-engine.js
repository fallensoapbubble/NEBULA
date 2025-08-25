/**
 * Template Rendering Engine
 * Provides dynamic template rendering for portfolio data from GitHub repositories
 * Supports multiple data formats (JSON, YAML, Markdown) and dynamic component rendering
 */

import yaml from 'js-yaml';
import { marked } from 'marked';

/**
 * Template Rendering Engine class
 * Handles template selection, data processing, and component rendering
 */
export class TemplateRenderingEngine {
  constructor(options = {}) {
    this.options = {
      defaultTemplate: 'default',
      supportedFormats: ['json', 'yaml', 'yml', 'markdown', 'md'],
      maxDepth: 10, // Maximum nesting depth for data processing
      ...options
    };

    // Template registry
    this.templates = new Map();
    this.registerDefaultTemplates();

    // Data processors for different formats
    this.dataProcessors = new Map([
      ['json', this.processJsonData.bind(this)],
      ['yaml', this.processYamlData.bind(this)],
      ['yml', this.processYamlData.bind(this)],
      ['markdown', this.processMarkdownData.bind(this)],
      ['md', this.processMarkdownData.bind(this)]
    ]);
  }

  /**
   * Register default templates
   */
  registerDefaultTemplates() {
    // Default template configuration
    this.registerTemplate('default', {
      name: 'Default',
      description: 'Clean and professional portfolio layout',
      layout: 'standard',
      sections: ['header', 'about', 'projects', 'skills', 'contact'],
      styling: {
        theme: 'light',
        colorScheme: 'blue',
        typography: 'modern'
      },
      components: {
        header: 'PortfolioHeader',
        about: 'AboutSection',
        projects: 'ProjectsSection',
        skills: 'SkillsSection',
        contact: 'ContactSection'
      }
    });

    // Minimal template configuration
    this.registerTemplate('minimal', {
      name: 'Minimal',
      description: 'Clean and simple design with focus on content',
      layout: 'centered',
      sections: ['header', 'about', 'projects'],
      styling: {
        theme: 'light',
        colorScheme: 'gray',
        typography: 'clean'
      },
      components: {
        header: 'MinimalHeader',
        about: 'MinimalAbout',
        projects: 'MinimalProjects'
      }
    });

    // Modern template configuration
    this.registerTemplate('modern', {
      name: 'Modern',
      description: 'Contemporary design with gradients and animations',
      layout: 'hero',
      sections: ['hero', 'about', 'projects', 'skills', 'contact'],
      styling: {
        theme: 'gradient',
        colorScheme: 'blue-purple',
        typography: 'bold'
      },
      components: {
        hero: 'ModernHero',
        about: 'ModernAbout',
        projects: 'ModernProjects',
        skills: 'ModernSkills',
        contact: 'ModernContact'
      }
    });

    // Classic template configuration
    this.registerTemplate('classic', {
      name: 'Classic',
      description: 'Traditional portfolio layout with navigation',
      layout: 'navigation',
      sections: ['navigation', 'hero', 'about', 'projects', 'contact'],
      styling: {
        theme: 'light',
        colorScheme: 'neutral',
        typography: 'serif'
      },
      components: {
        navigation: 'ClassicNavigation',
        hero: 'ClassicHero',
        about: 'ClassicAbout',
        projects: 'ClassicProjects',
        contact: 'ClassicContact'
      }
    });
  }

  /**
   * Register a new template
   * @param {string} id - Template identifier
   * @param {object} config - Template configuration
   */
  registerTemplate(id, config) {
    this.templates.set(id, {
      id,
      ...config,
      registeredAt: new Date().toISOString()
    });
  }

  /**
   * Get template configuration
   * @param {string} templateId - Template identifier
   * @returns {object|null} Template configuration
   */
  getTemplate(templateId) {
    return this.templates.get(templateId) || this.templates.get(this.options.defaultTemplate);
  }

  /**
   * Get all available templates
   * @returns {Array} Array of template configurations
   */
  getAvailableTemplates() {
    return Array.from(this.templates.values());
  }

  /**
   * Process portfolio data for template rendering
   * @param {object} portfolioData - Raw portfolio data from GitHub
   * @param {string} templateId - Template to use for rendering
   * @returns {object} Processed data ready for template rendering
   */
  processPortfolioData(portfolioData, templateId = null) {
    const template = this.getTemplate(templateId || this.options.defaultTemplate);
    
    if (!template) {
      throw new Error(`Template not found: ${templateId}`);
    }

    // Process different data formats within the portfolio data
    const processedData = this.processDataFormats(portfolioData);
    
    // Apply template-specific data transformations
    const templateData = this.applyTemplateTransformations(processedData, template);
    
    // Generate component props for each section
    const componentProps = this.generateComponentProps(templateData, template);

    return {
      template,
      data: templateData,
      componentProps,
      metadata: {
        processedAt: new Date().toISOString(),
        templateId: template.id,
        dataFormats: this.detectDataFormats(portfolioData)
      }
    };
  }

  /**
   * Process different data formats within portfolio data
   * @param {object} portfolioData - Portfolio data
   * @returns {object} Processed portfolio data
   */
  processDataFormats(portfolioData) {
    const processed = { ...portfolioData };

    // Process each section that might contain different formats
    const sectionsToProcess = ['about', 'projects', 'skills', 'contact', 'experience', 'education'];

    for (const section of sectionsToProcess) {
      if (processed[section]) {
        processed[section] = this.processSection(processed[section], section);
      }
    }

    return processed;
  }

  /**
   * Process a specific section of portfolio data
   * @param {any} sectionData - Section data
   * @param {string} sectionName - Name of the section
   * @returns {any} Processed section data
   */
  processSection(sectionData, sectionName) {
    // If it's already processed or simple data, return as-is
    if (typeof sectionData !== 'object' || sectionData === null) {
      return sectionData;
    }

    // Handle array data (like projects, skills)
    if (Array.isArray(sectionData)) {
      return sectionData.map(item => this.processDataItem(item));
    }

    // Handle object data with potential format indicators
    if (sectionData.format || sectionData.content) {
      return this.processFormattedData(sectionData);
    }

    // Handle nested objects
    const processed = {};
    for (const [key, value] of Object.entries(sectionData)) {
      processed[key] = this.processDataItem(value);
    }

    return processed;
  }

  /**
   * Process formatted data based on its format
   * @param {object} data - Data with format information
   * @returns {any} Processed data
   */
  processFormattedData(data) {
    const format = data.format || 'text';
    const content = data.content || data;

    const processor = this.dataProcessors.get(format.toLowerCase());
    if (processor) {
      return processor(content, data);
    }

    return content;
  }

  /**
   * Process individual data items
   * @param {any} item - Data item to process
   * @returns {any} Processed item
   */
  processDataItem(item) {
    if (typeof item !== 'object' || item === null) {
      return item;
    }

    if (Array.isArray(item)) {
      return item.map(subItem => this.processDataItem(subItem));
    }

    // Check if item has format-specific processing needs
    if (item.format && item.content) {
      return this.processFormattedData(item);
    }

    // Process nested objects
    const processed = {};
    for (const [key, value] of Object.entries(item)) {
      processed[key] = this.processDataItem(value);
    }

    return processed;
  }

  /**
   * Process JSON data
   * @param {any} content - JSON content
   * @param {object} metadata - Additional metadata
   * @returns {any} Processed JSON data
   */
  processJsonData(content, metadata = {}) {
    if (typeof content === 'string') {
      try {
        return JSON.parse(content);
      } catch (error) {
        console.warn('Failed to parse JSON content:', error);
        return content;
      }
    }
    return content;
  }

  /**
   * Process YAML data
   * @param {any} content - YAML content
   * @param {object} metadata - Additional metadata
   * @returns {any} Processed YAML data
   */
  processYamlData(content, metadata = {}) {
    if (typeof content === 'string') {
      try {
        return yaml.load(content);
      } catch (error) {
        console.warn('Failed to parse YAML content:', error);
        return content;
      }
    }
    return content;
  }

  /**
   * Process Markdown data
   * @param {any} content - Markdown content
   * @param {object} metadata - Additional metadata
   * @returns {object} Processed markdown data
   */
  processMarkdownData(content, metadata = {}) {
    if (typeof content === 'string') {
      try {
        // Parse frontmatter if present
        const frontmatterMatch = content.match(/^---\s*\n([\s\S]*?)\n---\s*\n([\s\S]*)$/);
        
        if (frontmatterMatch) {
          const frontmatter = yaml.load(frontmatterMatch[1]) || {};
          const body = frontmatterMatch[2];
          const html = marked(body);
          
          return {
            frontmatter,
            body,
            html,
            raw: content
          };
        } else {
          const html = marked(content);
          return {
            frontmatter: {},
            body: content,
            html,
            raw: content
          };
        }
      } catch (error) {
        console.warn('Failed to parse Markdown content:', error);
        return {
          frontmatter: {},
          body: content,
          html: content,
          raw: content
        };
      }
    }
    
    return content;
  }

  /**
   * Apply template-specific data transformations
   * @param {object} data - Portfolio data
   * @param {object} template - Template configuration
   * @returns {object} Transformed data
   */
  applyTemplateTransformations(data, template) {
    const transformed = { ...data };

    // Apply template-specific transformations based on template configuration
    switch (template.layout) {
      case 'hero':
        transformed.hero = this.createHeroSection(data);
        break;
      case 'navigation':
        transformed.navigation = this.createNavigationData(data, template);
        break;
      case 'centered':
        transformed.layout = { centered: true, maxWidth: '4xl' };
        break;
      default:
        transformed.layout = { standard: true };
    }

    // Apply styling transformations
    transformed.styling = {
      ...template.styling,
      customStyles: this.generateCustomStyles(data, template)
    };

    return transformed;
  }

  /**
   * Create hero section data
   * @param {object} data - Portfolio data
   * @returns {object} Hero section data
   */
  createHeroSection(data) {
    return {
      title: data.title || `${data.name}'s Portfolio`,
      subtitle: data.description || data.tagline,
      backgroundImage: data.heroImage || data.coverImage,
      avatar: data.avatar,
      name: data.name,
      callToAction: data.callToAction || {
        text: 'View My Work',
        link: '#projects'
      }
    };
  }

  /**
   * Create navigation data
   * @param {object} data - Portfolio data
   * @param {object} template - Template configuration
   * @returns {object} Navigation data
   */
  createNavigationData(data, template) {
    const sections = template.sections || [];
    const navigation = {
      brand: {
        name: data.name,
        avatar: data.avatar
      },
      links: []
    };

    for (const section of sections) {
      if (section !== 'navigation') {
        navigation.links.push({
          label: this.formatSectionLabel(section),
          href: `#${section}`,
          active: false
        });
      }
    }

    return navigation;
  }

  /**
   * Generate component props for each template section
   * @param {object} data - Processed portfolio data
   * @param {object} template - Template configuration
   * @returns {object} Component props for each section
   */
  generateComponentProps(data, template) {
    const props = {};

    for (const section of template.sections) {
      const componentName = template.components[section];
      if (componentName) {
        props[section] = this.generateSectionProps(section, data, template);
      }
    }

    return props;
  }

  /**
   * Generate props for a specific section
   * @param {string} section - Section name
   * @param {object} data - Portfolio data
   * @param {object} template - Template configuration
   * @returns {object} Section props
   */
  generateSectionProps(section, data, template) {
    const baseProps = {
      data: data[section],
      styling: data.styling,
      template: template.id
    };

    // Section-specific prop generation
    switch (section) {
      case 'header':
      case 'hero':
        return {
          ...baseProps,
          name: data.name,
          title: data.title,
          description: data.description,
          avatar: data.avatar,
          repository: data.repository
        };

      case 'about':
        return {
          ...baseProps,
          content: data.about?.content || data.about?.body || data.about,
          frontmatter: data.about?.frontmatter
        };

      case 'projects':
        return {
          ...baseProps,
          projects: data.projects || [],
          showTechnologies: template.styling?.showTechnologies !== false
        };

      case 'skills':
        return {
          ...baseProps,
          skills: data.skills || [],
          groupByCategory: template.styling?.groupSkills !== false
        };

      case 'contact':
        return {
          ...baseProps,
          contact: data.contact || {},
          social: data.social || {},
          showForm: template.styling?.showContactForm === true
        };

      default:
        return baseProps;
    }
  }

  /**
   * Generate custom styles based on data and template
   * @param {object} data - Portfolio data
   * @param {object} template - Template configuration
   * @returns {object} Custom styles
   */
  generateCustomStyles(data, template) {
    const styles = {};

    // Generate color scheme based on template and data
    if (data.theme?.colors) {
      styles.colors = data.theme.colors;
    } else {
      styles.colors = this.generateColorScheme(template.styling.colorScheme);
    }

    // Generate typography styles
    styles.typography = this.generateTypographyStyles(template.styling.typography);

    // Generate spacing and layout styles
    styles.layout = this.generateLayoutStyles(template.layout);

    return styles;
  }

  /**
   * Generate color scheme
   * @param {string} scheme - Color scheme name
   * @returns {object} Color scheme object
   */
  generateColorScheme(scheme) {
    const schemes = {
      'blue': {
        primary: '#3B82F6',
        secondary: '#1E40AF',
        accent: '#60A5FA',
        background: '#F8FAFC',
        text: '#1F2937'
      },
      'blue-purple': {
        primary: '#6366F1',
        secondary: '#8B5CF6',
        accent: '#A855F7',
        background: '#F1F5F9',
        text: '#1E293B'
      },
      'gray': {
        primary: '#6B7280',
        secondary: '#4B5563',
        accent: '#9CA3AF',
        background: '#F9FAFB',
        text: '#111827'
      },
      'neutral': {
        primary: '#525252',
        secondary: '#404040',
        accent: '#737373',
        background: '#FAFAFA',
        text: '#171717'
      }
    };

    return schemes[scheme] || schemes.blue;
  }

  /**
   * Generate typography styles
   * @param {string} typography - Typography style name
   * @returns {object} Typography styles
   */
  generateTypographyStyles(typography) {
    const styles = {
      'modern': {
        fontFamily: 'Inter, system-ui, sans-serif',
        headingWeight: '700',
        bodyWeight: '400'
      },
      'clean': {
        fontFamily: 'system-ui, sans-serif',
        headingWeight: '600',
        bodyWeight: '400'
      },
      'bold': {
        fontFamily: 'Inter, system-ui, sans-serif',
        headingWeight: '800',
        bodyWeight: '500'
      },
      'serif': {
        fontFamily: 'Georgia, serif',
        headingWeight: '600',
        bodyWeight: '400'
      }
    };

    return styles[typography] || styles.modern;
  }

  /**
   * Generate layout styles
   * @param {string} layout - Layout type
   * @returns {object} Layout styles
   */
  generateLayoutStyles(layout) {
    const styles = {
      'standard': {
        maxWidth: '6xl',
        spacing: 'normal'
      },
      'centered': {
        maxWidth: '4xl',
        spacing: 'comfortable'
      },
      'hero': {
        maxWidth: '7xl',
        spacing: 'spacious'
      },
      'navigation': {
        maxWidth: '6xl',
        spacing: 'compact'
      }
    };

    return styles[layout] || styles.standard;
  }

  /**
   * Detect data formats present in portfolio data
   * @param {object} data - Portfolio data
   * @returns {Array} Array of detected formats
   */
  detectDataFormats(data) {
    const formats = new Set();

    const detectInValue = (value) => {
      if (typeof value === 'object' && value !== null) {
        if (value.format) {
          formats.add(value.format);
        }
        if (Array.isArray(value)) {
          value.forEach(detectInValue);
        } else {
          Object.values(value).forEach(detectInValue);
        }
      }
    };

    detectInValue(data);
    return Array.from(formats);
  }

  /**
   * Format section label for navigation
   * @param {string} section - Section name
   * @returns {string} Formatted label
   */
  formatSectionLabel(section) {
    return section.charAt(0).toUpperCase() + section.slice(1);
  }

  /**
   * Validate template configuration
   * @param {object} config - Template configuration
   * @returns {object} Validation result
   */
  validateTemplate(config) {
    const required = ['name', 'sections', 'components'];
    const missing = required.filter(field => !config[field]);

    if (missing.length > 0) {
      return {
        valid: false,
        errors: [`Missing required fields: ${missing.join(', ')}`]
      };
    }

    return { valid: true, errors: [] };
  }
}

/**
 * Create a new template rendering engine instance
 * @param {object} options - Configuration options
 * @returns {TemplateRenderingEngine} New engine instance
 */
export function createTemplateRenderingEngine(options = {}) {
  return new TemplateRenderingEngine(options);
}

export default TemplateRenderingEngine;