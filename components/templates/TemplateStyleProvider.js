/**
 * Template Style Provider
 * Provides custom CSS and styling context for portfolio templates
 */

import React, { createContext, useContext, useMemo, useEffect } from 'react';
import { logger } from '../../lib/logger.js';

/**
 * Template Style Context
 */
const TemplateStyleContext = createContext(null);

/**
 * Hook to use template style context
 */
export const useTemplateStyle = () => {
  const context = useContext(TemplateStyleContext);
  if (!context) {
    throw new Error('useTemplateStyle must be used within a TemplateStyleProvider');
  }
  return context;
};

/**
 * TemplateStyleProvider - Provides custom styling for portfolio templates
 * 
 * @param {Object} props - Component props
 * @param {Object} props.template - Template configuration
 * @param {string} props.customCSS - Custom CSS from repository
 * @param {boolean} props.isPreview - Whether this is a preview render
 * @param {React.ReactNode} props.children - Child components
 */
export const TemplateStyleProvider = ({
  template,
  customCSS,
  isPreview = false,
  children
}) => {
  const styleLogger = useMemo(() => 
    logger.child({ 
      component: 'TemplateStyleProvider',
      templateId: template?.id 
    }), 
    [template?.id]
  );

  // Process template styles
  const processedStyles = useMemo(() => {
    const styles = {
      variables: {},
      customCSS: '',
      theme: 'default',
      fonts: [],
      animations: {}
    };

    // Extract template theme and variables
    if (template?.metadata?.theme) {
      styles.theme = template.metadata.theme;
    }

    if (template?.metadata?.variables) {
      styles.variables = template.metadata.variables;
    }

    // Extract custom fonts
    if (template?.metadata?.fonts) {
      styles.fonts = template.metadata.fonts;
    }

    // Extract custom animations
    if (template?.metadata?.animations) {
      styles.animations = template.metadata.animations;
    }

    // Process custom CSS
    if (customCSS) {
      try {
        // Enhanced CSS processing for repository files
        let processedCSS = customCSS;
        
        // Handle CSS imports and font declarations
        processedCSS = processRepositoryCSS(processedCSS, template);
        
        // Sanitize and scope custom CSS for preview mode
        styles.customCSS = isPreview ? scopePreviewCSS(processedCSS) : processedCSS;
      } catch (error) {
        styleLogger.error('Failed to process custom CSS', { error: error.message });
      }
    }

    return styles;
  }, [template, customCSS, isPreview, styleLogger]);

  // Apply CSS variables and custom styles
  useEffect(() => {
    if (!isPreview) {
      // Apply CSS variables to document root
      const root = document.documentElement;
      Object.entries(processedStyles.variables).forEach(([key, value]) => {
        root.style.setProperty(`--template-${key}`, value);
      });

      // Inject custom CSS
      if (processedStyles.customCSS) {
        const styleId = `template-styles-${template?.id || 'default'}`;
        let styleElement = document.getElementById(styleId);
        
        if (!styleElement) {
          styleElement = document.createElement('style');
          styleElement.id = styleId;
          document.head.appendChild(styleElement);
        }
        
        styleElement.textContent = processedStyles.customCSS;
      }

      // Cleanup function
      return () => {
        const styleId = `template-styles-${template?.id || 'default'}`;
        const styleElement = document.getElementById(styleId);
        if (styleElement) {
          styleElement.remove();
        }
      };
    }
  }, [processedStyles, template?.id, isPreview]);

  // Create context value
  const contextValue = useMemo(() => ({
    template,
    styles: processedStyles,
    isPreview,
    
    // Utility functions
    getVariable: (name, defaultValue = null) => {
      return processedStyles.variables[name] || defaultValue;
    },
    
    getThemeClass: (baseClass = '') => {
      const themeClass = `theme-${processedStyles.theme}`;
      return baseClass ? `${baseClass} ${themeClass}` : themeClass;
    },
    
    applyCustomStyles: (element) => {
      if (element && processedStyles.customCSS) {
        // Apply scoped styles to specific element
        const scopedCSS = scopeElementCSS(processedStyles.customCSS, element);
        if (scopedCSS) {
          const style = document.createElement('style');
          style.textContent = scopedCSS;
          element.appendChild(style);
        }
      }
    }
  }), [template, processedStyles, isPreview]);

  // Render with theme class
  const themeClass = `template-theme-${processedStyles.theme}`;
  const previewClass = isPreview ? 'template-preview-mode' : '';
  const containerClass = `template-style-provider ${themeClass} ${previewClass}`.trim();

  return (
    <TemplateStyleContext.Provider value={contextValue}>
      <div className={containerClass} style={processedStyles.variables}>
        {children}
      </div>
    </TemplateStyleContext.Provider>
  );
};

/**
 * Scopes CSS for preview mode to prevent conflicts
 * @param {string} css - Original CSS
 * @returns {string} Scoped CSS
 */
function scopePreviewCSS(css) {
  if (!css) return '';
  
  try {
    // Simple CSS scoping - prefix all selectors with .template-preview-mode
    return css.replace(/([^{}]+){/g, (match, selector) => {
      const trimmedSelector = selector.trim();
      if (trimmedSelector.startsWith('@') || trimmedSelector.includes('keyframes')) {
        return match; // Don't scope at-rules
      }
      return `.template-preview-mode ${trimmedSelector} {`;
    });
  } catch (error) {
    logger.error('Failed to scope preview CSS', { error: error.message });
    return '';
  }
}

/**
 * Scopes CSS to a specific element
 * @param {string} css - Original CSS
 * @param {HTMLElement} element - Target element
 * @returns {string} Element-scoped CSS
 */
function scopeElementCSS(css, element) {
  if (!css || !element) return '';
  
  try {
    const elementId = element.id || `template-element-${Date.now()}`;
    if (!element.id) {
      element.id = elementId;
    }
    
    return css.replace(/([^{}]+){/g, (match, selector) => {
      const trimmedSelector = selector.trim();
      if (trimmedSelector.startsWith('@') || trimmedSelector.includes('keyframes')) {
        return match;
      }
      return `#${elementId} ${trimmedSelector} {`;
    });
  } catch (error) {
    logger.error('Failed to scope element CSS', { error: error.message });
    return '';
  }
}

/**
 * Processes CSS from repository files with enhanced features
 * @param {string} css - Original CSS from repository
 * @param {Object} template - Template configuration
 * @returns {string} Processed CSS
 */
function processRepositoryCSS(css, template) {
  if (!css) return '';
  
  try {
    let processed = css;
    
    // Handle CSS custom properties (variables) from template
    if (template?.metadata?.variables) {
      Object.entries(template.metadata.variables).forEach(([key, value]) => {
        const cssVar = `--${key}`;
        if (!processed.includes(cssVar)) {
          processed = `:root { ${cssVar}: ${value}; }\n${processed}`;
        }
      });
    }
    
    // Handle font imports
    if (template?.metadata?.fonts) {
      const fontImports = template.metadata.fonts
        .map(font => `@import url('${font.url}');`)
        .join('\n');
      processed = `${fontImports}\n${processed}`;
    }
    
    // Handle responsive design helpers
    processed = processed.replace(
      /@media\s+\(mobile\)/g,
      '@media (max-width: 768px)'
    );
    processed = processed.replace(
      /@media\s+\(tablet\)/g,
      '@media (min-width: 769px) and (max-width: 1024px)'
    );
    processed = processed.replace(
      /@media\s+\(desktop\)/g,
      '@media (min-width: 1025px)'
    );
    
    // Handle theme-specific selectors
    if (template?.metadata?.theme) {
      processed = processed.replace(
        /\.theme-current/g,
        `.theme-${template.metadata.theme}`
      );
    }
    
    return processed;
  } catch (error) {
    logger.error('Failed to process repository CSS', { error: error.message });
    return css;
  }
}

/**
 * TemplateStyleInjector - Component for injecting template styles
 */
export const TemplateStyleInjector = ({ template, customCSS }) => {
  useEffect(() => {
    if (!template && !customCSS) return;

    const styleId = `template-injected-styles-${template?.id || 'custom'}`;
    let styleElement = document.getElementById(styleId);
    
    if (!styleElement) {
      styleElement = document.createElement('style');
      styleElement.id = styleId;
      document.head.appendChild(styleElement);
    }
    
    let css = '';
    
    // Add template base styles
    if (template?.metadata?.baseCSS) {
      css += template.metadata.baseCSS;
    }
    
    // Add custom CSS
    if (customCSS) {
      css += '\n' + customCSS;
    }
    
    styleElement.textContent = css;

    return () => {
      const element = document.getElementById(styleId);
      if (element) {
        element.remove();
      }
    };
  }, [template, customCSS]);

  return null;
};

export default TemplateStyleProvider;