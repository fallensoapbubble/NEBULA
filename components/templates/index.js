/**
 * Template Components Index
 * Exports all template-related components for easy importing
 */

// Main template components
export { TemplateRenderer, TemplatePreview, TemplateLoader } from './TemplateRenderer.js';
export { PortfolioDataProvider, usePortfolioData } from './PortfolioDataProvider.js';
export { TemplateStyleProvider, TemplateStyleInjector, useTemplateStyle } from './TemplateStyleProvider.js';

// Template preview and selection components
export { TemplatePreviewSystem } from './TemplatePreviewSystem.js';
export { TemplateSelectionInterface } from './TemplateSelectionInterface.js';

// Template preview hooks
export { useTemplatePreview, useMultipleTemplatePreviews } from './useTemplatePreview.js';

// Template layouts
export { DefaultTemplate } from './layouts/DefaultTemplate.js';
export { MinimalTemplate } from './layouts/MinimalTemplate.js';
export { CreativeTemplate } from './layouts/CreativeTemplate.js';
export { DeveloperTemplate } from './layouts/DeveloperTemplate.js';
export { GitHubTemplate } from './layouts/GitHubTemplate.js';
export { ModernTemplate } from './layouts/ModernTemplate.js';

// Import for getTemplateComponent function
import { DefaultTemplate } from './layouts/DefaultTemplate.js';
import { MinimalTemplate } from './layouts/MinimalTemplate.js';
import { CreativeTemplate } from './layouts/CreativeTemplate.js';
import { DeveloperTemplate } from './layouts/DeveloperTemplate.js';
import { GitHubTemplate } from './layouts/GitHubTemplate.js';
import { ModernTemplate } from './layouts/ModernTemplate.js';

// Enhanced template components
export {
  EnhancedPortfolioSection,
  MarkdownRenderer,
  EnhancedProjectCard,
  EnhancedExperienceItem,
  EnhancedSkillGroup,
  EnhancedSkillItem,
  EnhancedEducationItem,
  EnhancedPortfolioImage,
  GitHubStats,
  TechnologyBadges,
  ProjectLinks
} from './EnhancedPortfolioRenderer.js';

// Template styling system
export {
  TemplateStyleManager,
  RepositoryCSSProcessor,
  TemplateStyleLoader,
  useTemplateStyles,
  useCSSVariable,
  templateStyleManager
} from './TemplateStyleSystem.js';

// Template configuration
export {
  TemplateConfigurationRegistry,
  TemplateValidator,
  TemplateConfigurationLoader,
  useTemplateConfiguration,
  templateRegistry
} from './TemplateConfiguration.js';

// Legacy utility components
export {
  PortfolioSection,
  PortfolioImage,
  SocialLinks,
  SocialLink,
  SkillBadge,
  ProjectCard,
  ExperienceItem,
  ContactInfo,
  MarkdownContent,
  GitHubReadme,
  RepositoryStats,
  LoadingTemplate,
  ErrorTemplate
} from './TemplateComponents.js';

// Template registry (for convenience)
export { TEMPLATE_COMPONENTS } from './TemplateRenderer.js';

/**
 * Template component registry for dynamic loading
 */
export const AVAILABLE_TEMPLATES = {
  'default': {
    name: 'Default',
    description: 'Clean, professional portfolio template',
    component: 'DefaultTemplate'
  },
  'minimal': {
    name: 'Minimal',
    description: 'Minimalist portfolio with focus on content',
    component: 'MinimalTemplate'
  },
  'creative': {
    name: 'Creative',
    description: 'Bold, creative portfolio with vibrant design',
    component: 'CreativeTemplate'
  },
  'developer': {
    name: 'Developer',
    description: 'Technical portfolio designed for developers',
    component: 'DeveloperTemplate'
  },
  'github': {
    name: 'GitHub',
    description: 'Developer-focused template with GitHub integration',
    component: 'GitHubTemplate'
  },
  'modern': {
    name: 'Modern',
    description: 'Contemporary template with enhanced GitHub integration and custom styling',
    component: 'ModernTemplate'
  }
};

/**
 * Helper function to get template component by ID
 * @param {string} templateId - Template identifier
 * @returns {React.Component|null} Template component or null
 */
export function getTemplateComponent(templateId) {
  const templates = {
    'default': DefaultTemplate,
    'minimal': MinimalTemplate,
    'creative': CreativeTemplate,
    'developer': DeveloperTemplate,
    'github': GitHubTemplate,
    'modern': ModernTemplate
  };
  
  return templates[templateId] || templates['default'];
}

/**
 * Helper function to validate template data structure
 * @param {Object} portfolioData - Portfolio data to validate
 * @param {Object} template - Template configuration
 * @returns {Object} Validation result
 */
export function validateTemplateData(portfolioData, template) {
  const validation = {
    isValid: true,
    errors: [],
    warnings: []
  };

  if (!portfolioData) {
    validation.isValid = false;
    validation.errors.push('Portfolio data is required');
    return validation;
  }

  // Check for required sections based on template
  if (template?.structure?.required_fields) {
    template.structure.required_fields.forEach(field => {
      const fieldPath = field.path || field;
      const value = getNestedValue(portfolioData, fieldPath);
      
      if (value === undefined || value === null) {
        if (field.required !== false) {
          validation.warnings.push(`Missing recommended field: ${fieldPath}`);
        }
      }
    });
  }

  return validation;
}

/**
 * Helper function to get nested value from object
 * @param {Object} obj - Object to search
 * @param {string} path - Dot notation path
 * @returns {any} Value or undefined
 */
function getNestedValue(obj, path) {
  return path.split('.').reduce((current, key) => current?.[key], obj);
}