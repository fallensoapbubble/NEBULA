/**
 * Template Renderer Component
 * Main component for rendering portfolio data using template-specific layouts
 */

import React, { useMemo } from 'react';
import { logger } from '../../lib/logger.js';
import { PortfolioDataProvider } from './PortfolioDataProvider.js';
import { TemplateStyleProvider } from './TemplateStyleProvider.js';
import { DefaultTemplate } from './layouts/DefaultTemplate.js';
import { MinimalTemplate } from './layouts/MinimalTemplate.js';
import { CreativeTemplate } from './layouts/CreativeTemplate.js';
import { DeveloperTemplate } from './layouts/DeveloperTemplate.js';
import { GitHubTemplate } from './layouts/GitHubTemplate.js';
import { EnhancedGitHubTemplate } from './layouts/EnhancedGitHubTemplate.js';
import { ModernTemplate } from './layouts/ModernTemplate.js';
import { LoadingSpinner } from '../ui/Loading.js';
import { GlassCard, GlassCardContent } from '../ui/Card.js';

/**
 * Template registry mapping template IDs to their components
 */
const TEMPLATE_COMPONENTS = {
  'default': DefaultTemplate,
  'minimal': MinimalTemplate,
  'creative': CreativeTemplate,
  'developer': DeveloperTemplate,
  'github': GitHubTemplate,
  'enhanced-github': EnhancedGitHubTemplate,
  'modern': ModernTemplate
};

/**
 * TemplateRenderer - Renders portfolio data using specified template
 * 
 * @param {Object} props - Component props
 * @param {Object} props.template - Template configuration object
 * @param {Object} props.portfolioData - Portfolio data from GitHub repository
 * @param {Object} props.repositoryInfo - Repository metadata
 * @param {string} props.customCSS - Custom CSS from repository
 * @param {boolean} props.isPreview - Whether this is a preview render
 * @param {function} props.onError - Error callback
 * @param {string} props.className - Additional CSS classes
 */
export const TemplateRenderer = ({
  template,
  portfolioData,
  repositoryInfo,
  customCSS,
  isPreview = false,
  onError,
  className = '',
  ...props
}) => {
  const templateLogger = useMemo(() => 
    logger.child({ 
      component: 'TemplateRenderer',
      templateId: template?.id,
      repository: repositoryInfo?.full_name 
    }), 
    [template?.id, repositoryInfo?.full_name]
  );

  // Determine which template component to use
  const TemplateComponent = useMemo(() => {
    if (!template) {
      templateLogger.warn('No template provided, using default');
      return DefaultTemplate;
    }

    const templateType = template.metadata?.type || 'default';
    const component = TEMPLATE_COMPONENTS[templateType] || TEMPLATE_COMPONENTS['default'];
    
    templateLogger.debug('Selected template component', { templateType });
    return component;
  }, [template, templateLogger]);

  // Handle rendering errors
  const handleRenderError = (error) => {
    templateLogger.error('Template rendering failed', { error: error.message });
    if (onError) {
      onError(error);
    }
  };

  // Validate required props
  if (!portfolioData) {
    return (
      <GlassCard className={`p-8 text-center ${className}`}>
        <GlassCardContent>
          <p className="text-text-2">No portfolio data available</p>
        </GlassCardContent>
      </GlassCard>
    );
  }

  return (
    <div className={`template-renderer ${className}`} {...props}>
      <TemplateStyleProvider 
        template={template}
        customCSS={customCSS}
        isPreview={isPreview}
      >
        <PortfolioDataProvider 
          data={portfolioData}
          repository={repositoryInfo}
          template={template}
        >
          <TemplateComponent
            template={template}
            portfolioData={portfolioData}
            repositoryInfo={repositoryInfo}
            isPreview={isPreview}
          />
        </PortfolioDataProvider>
      </TemplateStyleProvider>
    </div>
  );
};



/**
 * TemplatePreview - Lightweight preview version of template renderer
 */
export const TemplatePreview = ({
  template,
  portfolioData,
  className = '',
  ...props
}) => {
  return (
    <div className={`template-preview scale-75 origin-top-left ${className}`} {...props}>
      <TemplateRenderer
        template={template}
        portfolioData={portfolioData}
        isPreview={true}
        className="pointer-events-none"
      />
    </div>
  );
};

/**
 * TemplateLoader - Loading state for template renderer
 */
export const TemplateLoader = ({ className = '', ...props }) => {
  return (
    <GlassCard className={`p-8 ${className}`} {...props}>
      <GlassCardContent className="text-center">
        <LoadingSpinner size="lg" className="mx-auto mb-4" />
        <p className="text-text-2">Loading portfolio template...</p>
      </GlassCardContent>
    </GlassCard>
  );
};

export { TEMPLATE_COMPONENTS };
export default TemplateRenderer;