/**
 * Template Configuration System
 * Manages template metadata, styling, and rendering configurations
 */

import { logger } from '../../lib/logger.js';

/**
 * Template Configuration Registry
 */
export class TemplateConfigurationRegistry {
  constructor() {
    this.templates = new Map();
    this.defaultConfig = this.getDefaultConfiguration();
  }

  /**
   * Registers a template configuration
   */
  register(templateId, config) {
    try {
      const normalizedConfig = this.normalizeConfiguration(config);
      this.templates.set(templateId, normalizedConfig);
      logger.debug('Template configuration registered', { templateId });
    } catch (error) {
      logger.error('Failed to register template configuration', { 
        templateId, 
        error: error.message 
      });
    }
  }

  /**
   * Gets template configuration
   */
  get(templateId) {
    return this.templates.get(templateId) || this.defaultConfig;
  }

  /**
   * Gets all registered templates
   */
  getAll() {
    return Array.from(this.templates.entries()).map(([id, config]) => ({
      id,
      ...config
    }));
  }

  /**
   * Normalizes template configuration
   */
  normalizeConfiguration(config) {
    return {
      // Basic metadata
      id: config.id || 'unknown',
      name: config.name || 'Unnamed Template',
      description: config.description || '',
      version: config.version || '1.0.0',
      author: config.author || 'Unknown',
      
      // Template metadata
      metadata: {
        type: config.metadata?.type || 'default',
        category: config.metadata?.category || 'general',
        tags: config.metadata?.tags || [],
        preview: config.metadata?.preview || null,
        thumbnail: config.metadata?.thumbnail || null,
        ...config.metadata
      },

      // Styling configuration
      styling: {
        theme: config.styling?.theme || 'default',
        variables: config.styling?.variables || {},
        fonts: config.styling?.fonts || [],
        animations: config.styling?.animations || {},
        responsive: config.styling?.responsive || {},
        customCSS: config.styling?.customCSS || '',
        ...config.styling
      },

      // Structure configuration
      structure: {
        sections: config.structure?.sections || ['about', 'projects', 'experience', 'skills', 'contact'],
        layout: config.structure?.layout || 'default',
        components: config.structure?.components || {},
        fieldMappings: config.structure?.fieldMappings || {},
        requiredFields: config.structure?.requiredFields || [],
        ...config.structure
      },

      // Features configuration
      features: {
        githubIntegration: config.features?.githubIntegration !== false,
        customCSS: config.features?.customCSS !== false,
        responsiveDesign: config.features?.responsiveDesign !== false,
        animations: config.features?.animations !== false,
        darkMode: config.features?.darkMode !== false,
        ...config.features
      },

      // Compatibility
      compatibility: {
        minVersion: config.compatibility?.minVersion || '1.0.0',
        maxVersion: config.compatibility?.maxVersion || null,
        dependencies: config.compatibility?.dependencies || [],
        ...config.compatibility
      }
    };
  }

  /**
   * Gets default template configuration
   */
  getDefaultConfiguration() {
    return {
      id: 'default',
      name: 'Default Template',
      description: 'A clean, professional portfolio template',
      version: '1.0.0',
      author: 'Nebula',
      
      metadata: {
        type: 'default',
        category: 'professional',
        tags: ['clean', 'professional', 'minimal'],
        preview: null,
        thumbnail: null
      },

      styling: {
        theme: 'default',
        variables: {
          'primary-color': '#3b82f6',
          'secondary-color': '#64748b',
          'accent-color': '#0ea5e9',
          'background-color': '#0f172a',
          'text-color': '#f1f5f9'
        },
        fonts: [],
        animations: {},
        responsive: {},
        customCSS: ''
      },

      structure: {
        sections: ['about', 'projects', 'experience', 'skills', 'contact'],
        layout: 'default',
        components: {},
        fieldMappings: {},
        requiredFields: []
      },

      features: {
        githubIntegration: true,
        customCSS: true,
        responsiveDesign: true,
        animations: true,
        darkMode: true
      },

      compatibility: {
        minVersion: '1.0.0',
        maxVersion: null,
        dependencies: []
      }
    };
  }
}

// Global registry instance
const templateRegistry = new TemplateConfigurationRegistry();

// Register built-in templates
templateRegistry.register('default', {
  id: 'default',
  name: 'Default Template',
  description: 'A clean, professional portfolio template suitable for most use cases',
  metadata: {
    type: 'default',
    category: 'professional',
    tags: ['clean', 'professional', 'versatile']
  },
  styling: {
    theme: 'default',
    variables: {
      'primary-color': '#3b82f6',
      'accent-color': '#0ea5e9'
    }
  }
});

templateRegistry.register('modern', {
  id: 'modern',
  name: 'Modern Template',
  description: 'A contemporary template with enhanced GitHub integration and custom styling support',
  metadata: {
    type: 'modern',
    category: 'contemporary',
    tags: ['modern', 'github', 'enhanced', 'responsive']
  },
  styling: {
    theme: 'modern',
    variables: {
      'primary-color': '#6366f1',
      'accent-color': '#8b5cf6',
      'gradient-start': '#667eea',
      'gradient-end': '#764ba2'
    },
    animations: {
      'fade-in': {
        '0%': { opacity: '0', transform: 'translateY(20px)' },
        '100%': { opacity: '1', transform: 'translateY(0)' }
      },
      'scale-in': {
        '0%': { opacity: '0', transform: 'scale(0.9)' },
        '100%': { opacity: '1', transform: 'scale(1)' }
      }
    }
  },
  features: {
    githubIntegration: true,
    customCSS: true,
    responsiveDesign: true,
    animations: true,
    darkMode: true
  }
});

templateRegistry.register('github', {
  id: 'github',
  name: 'GitHub Template',
  description: 'A template specifically designed for showcasing GitHub repositories and developer portfolios',
  metadata: {
    type: 'github',
    category: 'developer',
    tags: ['github', 'developer', 'repositories', 'stats']
  },
  styling: {
    theme: 'github',
    variables: {
      'primary-color': '#0969da',
      'accent-color': '#1f883d',
      'github-bg': '#0d1117',
      'github-border': '#30363d'
    }
  },
  features: {
    githubIntegration: true,
    repositoryStats: true,
    readmeRendering: true
  }
});

templateRegistry.register('minimal', {
  id: 'minimal',
  name: 'Minimal Template',
  description: 'A clean, minimalist template focusing on content',
  metadata: {
    type: 'minimal',
    category: 'minimal',
    tags: ['minimal', 'clean', 'simple', 'typography']
  },
  styling: {
    theme: 'minimal',
    variables: {
      'primary-color': '#1f2937',
      'accent-color': '#059669',
      'text-color': '#374151'
    }
  }
});

templateRegistry.register('creative', {
  id: 'creative',
  name: 'Creative Template',
  description: 'A vibrant, creative template for designers and artists',
  metadata: {
    type: 'creative',
    category: 'creative',
    tags: ['creative', 'colorful', 'artistic', 'vibrant']
  },
  styling: {
    theme: 'creative',
    variables: {
      'primary-color': '#ec4899',
      'accent-color': '#f59e0b',
      'creative-gradient': 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
    },
    animations: {
      'bounce-in': {
        '0%': { opacity: '0', transform: 'scale(0.3)' },
        '50%': { transform: 'scale(1.05)' },
        '70%': { transform: 'scale(0.9)' },
        '100%': { opacity: '1', transform: 'scale(1)' }
      }
    }
  }
});

/**
 * Template Configuration Hook
 */
export const useTemplateConfiguration = (templateId) => {
  const config = templateRegistry.get(templateId);
  
  return {
    config,
    isValid: Boolean(config),
    hasFeature: (feature) => config.features?.[feature] === true,
    getVariable: (name, defaultValue = null) => config.styling?.variables?.[name] || defaultValue,
    getSections: () => config.structure?.sections || [],
    getMetadata: () => config.metadata || {}
  };
};

/**
 * Template Validator
 */
export class TemplateValidator {
  static validate(config) {
    const errors = [];
    const warnings = [];

    // Required fields
    if (!config.id) errors.push('Template ID is required');
    if (!config.name) errors.push('Template name is required');

    // Metadata validation
    if (config.metadata?.type && !['default', 'minimal', 'creative', 'developer', 'github', 'modern'].includes(config.metadata.type)) {
      warnings.push(`Unknown template type: ${config.metadata.type}`);
    }

    // Styling validation
    if (config.styling?.variables) {
      Object.entries(config.styling.variables).forEach(([key, value]) => {
        if (typeof value !== 'string') {
          warnings.push(`CSS variable ${key} should be a string`);
        }
      });
    }

    // Structure validation
    if (config.structure?.sections && !Array.isArray(config.structure.sections)) {
      errors.push('Template sections must be an array');
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }
}

/**
 * Template Configuration Loader
 */
export class TemplateConfigurationLoader {
  static async loadFromRepository(repository, templateId) {
    try {
      // Try to load template configuration from repository
      const configPaths = [
        'template.json',
        '.template/config.json',
        'portfolio.config.json'
      ];

      for (const path of configPaths) {
        try {
          const response = await fetch(
            `https://raw.githubusercontent.com/${repository.full_name}/main/${path}`
          );
          
          if (response.ok) {
            const config = await response.json();
            config.id = templateId;
            
            const validation = TemplateValidator.validate(config);
            if (validation.isValid) {
              templateRegistry.register(templateId, config);
              return config;
            } else {
              logger.warn('Invalid template configuration', { 
                templateId, 
                errors: validation.errors 
              });
            }
          }
        } catch (error) {
          // Continue to next path
        }
      }

      // Return default configuration if no valid config found
      return templateRegistry.get('default');
    } catch (error) {
      logger.error('Failed to load template configuration', { 
        templateId, 
        repository: repository.full_name,
        error: error.message 
      });
      return templateRegistry.get('default');
    }
  }

  static async loadCustomCSS(repository) {
    try {
      const cssPaths = [
        'style.css',
        'styles.css',
        'template.css',
        'portfolio.css',
        'assets/style.css',
        'assets/styles.css'
      ];

      for (const path of cssPaths) {
        try {
          const response = await fetch(
            `https://raw.githubusercontent.com/${repository.full_name}/main/${path}`
          );
          
          if (response.ok) {
            return await response.text();
          }
        } catch (error) {
          // Continue to next path
        }
      }

      return null;
    } catch (error) {
      logger.error('Failed to load custom CSS', { 
        repository: repository.full_name,
        error: error.message 
      });
      return null;
    }
  }
}

export { templateRegistry };
export default TemplateConfigurationRegistry;