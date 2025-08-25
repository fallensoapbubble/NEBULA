/**
 * Template Style System
 * Advanced styling system for portfolio templates with custom CSS support
 */

import React, { useMemo, useEffect, useState, useCallback } from 'react';
import { logger } from '../../lib/logger.js';

/**
 * Template Style Manager - Handles custom CSS and template-specific styling
 */
export class TemplateStyleManager {
  constructor() {
    this.styleElements = new Map();
    this.cssVariables = new Map();
    this.templateThemes = new Map();
  }

  /**
   * Registers a template with its styling configuration
   */
  registerTemplate(templateId, config) {
    try {
      const styleConfig = {
        id: templateId,
        variables: config.variables || {},
        customCSS: config.customCSS || '',
        theme: config.theme || 'default',
        fonts: config.fonts || [],
        animations: config.animations || {},
        responsive: config.responsive || {},
        ...config
      };

      this.templateThemes.set(templateId, styleConfig);
      
      // Process and inject styles
      this.injectTemplateStyles(templateId, styleConfig);
      
      logger.debug('Template registered with style system', { templateId });
    } catch (error) {
      logger.error('Failed to register template', { templateId, error: error.message });
    }
  }

  /**
   * Injects template-specific styles into the document
   */
  injectTemplateStyles(templateId, config) {
    const styleId = `template-styles-${templateId}`;
    
    // Remove existing styles
    this.removeTemplateStyles(templateId);
    
    // Create new style element
    const styleElement = document.createElement('style');
    styleElement.id = styleId;
    styleElement.setAttribute('data-template', templateId);
    
    // Build CSS content
    let cssContent = '';
    
    // Add CSS variables
    if (Object.keys(config.variables).length > 0) {
      cssContent += this.generateCSSVariables(config.variables, templateId);
    }
    
    // Add font imports
    if (config.fonts.length > 0) {
      cssContent += this.generateFontImports(config.fonts);
    }
    
    // Add animations
    if (Object.keys(config.animations).length > 0) {
      cssContent += this.generateAnimations(config.animations);
    }
    
    // Add responsive styles
    if (Object.keys(config.responsive).length > 0) {
      cssContent += this.generateResponsiveStyles(config.responsive, templateId);
    }
    
    // Add custom CSS
    if (config.customCSS) {
      cssContent += this.processCustomCSS(config.customCSS, templateId);
    }
    
    // Add theme-specific styles
    cssContent += this.generateThemeStyles(config.theme, templateId);
    
    styleElement.textContent = cssContent;
    document.head.appendChild(styleElement);
    
    this.styleElements.set(templateId, styleElement);
  }

  /**
   * Removes template styles from the document
   */
  removeTemplateStyles(templateId) {
    const existingElement = this.styleElements.get(templateId);
    if (existingElement && existingElement.parentNode) {
      existingElement.parentNode.removeChild(existingElement);
      this.styleElements.delete(templateId);
    }
  }

  /**
   * Generates CSS variables for a template
   */
  generateCSSVariables(variables, templateId) {
    const cssVars = Object.entries(variables)
      .map(([key, value]) => `  --template-${templateId}-${key}: ${value};`)
      .join('\n');
    
    return `:root {\n${cssVars}\n}\n\n`;
  }

  /**
   * Generates font import statements
   */
  generateFontImports(fonts) {
    return fonts
      .map(font => {
        if (typeof font === 'string') {
          return `@import url('${font}');`;
        }
        if (font.url) {
          return `@import url('${font.url}');`;
        }
        return '';
      })
      .filter(Boolean)
      .join('\n') + '\n\n';
  }

  /**
   * Generates CSS animations
   */
  generateAnimations(animations) {
    return Object.entries(animations)
      .map(([name, keyframes]) => {
        if (typeof keyframes === 'string') {
          return `@keyframes ${name} {\n${keyframes}\n}`;
        }
        if (typeof keyframes === 'object') {
          const frames = Object.entries(keyframes)
            .map(([percent, styles]) => {
              const styleProps = Object.entries(styles)
                .map(([prop, value]) => `${prop}: ${value};`)
                .join(' ');
              return `  ${percent} { ${styleProps} }`;
            })
            .join('\n');
          return `@keyframes ${name} {\n${frames}\n}`;
        }
        return '';
      })
      .filter(Boolean)
      .join('\n\n') + '\n\n';
  }

  /**
   * Generates responsive styles
   */
  generateResponsiveStyles(responsive, templateId) {
    const breakpoints = {
      mobile: '(max-width: 768px)',
      tablet: '(min-width: 769px) and (max-width: 1024px)',
      desktop: '(min-width: 1025px)',
      ...responsive.breakpoints
    };

    return Object.entries(responsive)
      .filter(([key]) => key !== 'breakpoints')
      .map(([breakpoint, styles]) => {
        const mediaQuery = breakpoints[breakpoint] || breakpoint;
        const scopedStyles = this.scopeStyles(styles, `.template-${templateId}`);
        return `@media ${mediaQuery} {\n${scopedStyles}\n}`;
      })
      .join('\n\n') + '\n\n';
  }

  /**
   * Processes custom CSS with template scoping
   */
  processCustomCSS(css, templateId) {
    try {
      // Scope CSS to template
      let processedCSS = this.scopeStyles(css, `.template-${templateId}`);
      
      // Process template-specific placeholders
      processedCSS = processedCSS.replace(
        /var\(--template-([^)]+)\)/g,
        `var(--template-${templateId}-$1)`
      );
      
      // Process responsive helpers
      processedCSS = processedCSS.replace(
        /@media\s+\(mobile\)/g,
        '@media (max-width: 768px)'
      );
      processedCSS = processedCSS.replace(
        /@media\s+\(tablet\)/g,
        '@media (min-width: 769px) and (max-width: 1024px)'
      );
      processedCSS = processedCSS.replace(
        /@media\s+\(desktop\)/g,
        '@media (min-width: 1025px)'
      );
      
      return processedCSS + '\n\n';
    } catch (error) {
      logger.error('Failed to process custom CSS', { templateId, error: error.message });
      return '';
    }
  }

  /**
   * Generates theme-specific styles
   */
  generateThemeStyles(theme, templateId) {
    const themeStyles = {
      default: `
        .template-${templateId} {
          --theme-primary: var(--accent);
          --theme-secondary: var(--text-2);
          --theme-background: var(--background-1);
        }
      `,
      dark: `
        .template-${templateId} {
          --theme-primary: #3b82f6;
          --theme-secondary: #64748b;
          --theme-background: #0f172a;
        }
      `,
      light: `
        .template-${templateId} {
          --theme-primary: #2563eb;
          --theme-secondary: #475569;
          --theme-background: #ffffff;
        }
      `,
      colorful: `
        .template-${templateId} {
          --theme-primary: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          --theme-secondary: #8b5cf6;
          --theme-background: var(--background-1);
        }
      `
    };

    return themeStyles[theme] || themeStyles.default;
  }

  /**
   * Scopes CSS selectors to a specific parent
   */
  scopeStyles(css, scope) {
    if (!css) return '';
    
    try {
      return css.replace(/([^{}]+){/g, (match, selector) => {
        const trimmedSelector = selector.trim();
        
        // Don't scope at-rules
        if (trimmedSelector.startsWith('@') || trimmedSelector.includes('keyframes')) {
          return match;
        }
        
        // Don't scope if already scoped
        if (trimmedSelector.includes(scope)) {
          return match;
        }
        
        // Scope the selector
        return `${scope} ${trimmedSelector} {`;
      });
    } catch (error) {
      logger.error('Failed to scope CSS styles', { error: error.message });
      return css;
    }
  }

  /**
   * Gets template configuration
   */
  getTemplateConfig(templateId) {
    return this.templateThemes.get(templateId) || null;
  }

  /**
   * Updates template variables dynamically
   */
  updateTemplateVariables(templateId, variables) {
    const config = this.templateThemes.get(templateId);
    if (config) {
      config.variables = { ...config.variables, ...variables };
      this.injectTemplateStyles(templateId, config);
    }
  }

  /**
   * Cleanup all template styles
   */
  cleanup() {
    this.styleElements.forEach((element, templateId) => {
      this.removeTemplateStyles(templateId);
    });
    this.templateThemes.clear();
  }
}

// Global instance
const templateStyleManager = new TemplateStyleManager();

/**
 * Hook for using template styles
 */
export const useTemplateStyles = (templateId, config) => {
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    if (templateId && config) {
      templateStyleManager.registerTemplate(templateId, config);
      setIsReady(true);
    }

    return () => {
      if (templateId) {
        templateStyleManager.removeTemplateStyles(templateId);
      }
    };
  }, [templateId, config]);

  const updateVariables = useCallback((variables) => {
    if (templateId) {
      templateStyleManager.updateTemplateVariables(templateId, variables);
    }
  }, [templateId]);

  return {
    isReady,
    updateVariables,
    getConfig: () => templateStyleManager.getTemplateConfig(templateId)
  };
};

/**
 * CSS Processor for repository files
 */
export class RepositoryCSSProcessor {
  constructor(repository) {
    this.repository = repository;
  }

  /**
   * Processes CSS from repository files
   */
  processRepositoryCSS(cssContent, templateId) {
    if (!cssContent) return '';

    try {
      let processed = cssContent;

      // Handle asset URL resolution
      processed = this.resolveAssetUrls(processed);
      
      // Handle GitHub-specific features
      processed = this.processGitHubFeatures(processed);
      
      // Handle template variables
      processed = this.processTemplateVariables(processed, templateId);
      
      // Handle responsive helpers
      processed = this.processResponsiveHelpers(processed);
      
      return processed;
    } catch (error) {
      logger.error('Failed to process repository CSS', { 
        repository: this.repository?.full_name,
        error: error.message 
      });
      return cssContent;
    }
  }

  /**
   * Resolves asset URLs in CSS
   */
  resolveAssetUrls(css) {
    if (!this.repository) return css;

    return css.replace(
      /url\(['"]?(?!https?:\/\/)([^'")\s]+)['"]?\)/g,
      (match, path) => {
        const cleanPath = path.startsWith('./') ? path.slice(2) : 
                         path.startsWith('/') ? path.slice(1) : path;
        const absoluteUrl = `https://raw.githubusercontent.com/${this.repository.full_name}/main/${cleanPath}`;
        return `url('${absoluteUrl}')`;
      }
    );
  }

  /**
   * Processes GitHub-specific CSS features
   */
  processGitHubFeatures(css) {
    // Handle GitHub color variables
    css = css.replace(/var\(--github-([^)]+)\)/g, (match, colorName) => {
      const githubColors = {
        'accent': '#0969da',
        'success': '#1a7f37',
        'warning': '#d1242f',
        'danger': '#cf222e',
        'text-primary': '#24292f',
        'text-secondary': '#656d76',
        'bg-primary': '#ffffff',
        'bg-secondary': '#f6f8fa'
      };
      return githubColors[colorName] || match;
    });

    return css;
  }

  /**
   * Processes template variables
   */
  processTemplateVariables(css, templateId) {
    if (!templateId) return css;

    return css.replace(
      /var\(--template-([^)]+)\)/g,
      `var(--template-${templateId}-$1)`
    );
  }

  /**
   * Processes responsive helpers
   */
  processResponsiveHelpers(css) {
    const responsiveMap = {
      '@media (mobile)': '@media (max-width: 768px)',
      '@media (tablet)': '@media (min-width: 769px) and (max-width: 1024px)',
      '@media (desktop)': '@media (min-width: 1025px)',
      '@media (large)': '@media (min-width: 1440px)'
    };

    Object.entries(responsiveMap).forEach(([helper, actual]) => {
      css = css.replace(new RegExp(helper.replace(/[()]/g, '\\$&'), 'g'), actual);
    });

    return css;
  }
}

/**
 * Template Style Loader Component
 */
export const TemplateStyleLoader = ({ 
  templateId, 
  customCSS, 
  repository, 
  variables = {},
  theme = 'default',
  fonts = [],
  animations = {},
  responsive = {},
  children 
}) => {
  const [processor] = useState(() => new RepositoryCSSProcessor(repository));
  
  const styleConfig = useMemo(() => ({
    variables,
    customCSS: processor.processRepositoryCSS(customCSS, templateId),
    theme,
    fonts,
    animations,
    responsive
  }), [processor, customCSS, templateId, variables, theme, fonts, animations, responsive]);

  const { isReady } = useTemplateStyles(templateId, styleConfig);

  if (!isReady) {
    return (
      <div className="template-loading flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin w-8 h-8 border-2 border-accent border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-text-2">Loading template styles...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`template-${templateId} template-theme-${theme}`}>
      {children}
    </div>
  );
};

/**
 * CSS Variable Hook
 */
export const useCSSVariable = (variableName, defaultValue = null) => {
  const [value, setValue] = useState(defaultValue);

  useEffect(() => {
    const updateValue = () => {
      const computedValue = getComputedStyle(document.documentElement)
        .getPropertyValue(`--${variableName}`)
        .trim();
      setValue(computedValue || defaultValue);
    };

    updateValue();
    
    // Listen for style changes
    const observer = new MutationObserver(updateValue);
    observer.observe(document.head, { 
      childList: true, 
      subtree: true,
      attributes: true,
      attributeFilter: ['style']
    });

    return () => observer.disconnect();
  }, [variableName, defaultValue]);

  return value;
};

export { templateStyleManager };
export default TemplateStyleManager;