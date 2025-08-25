/**
 * Portfolio Data Provider
 * Context provider for portfolio data and repository information
 */

import React, { createContext, useContext, useMemo } from 'react';
import { logger } from '../../lib/logger.js';

/**
 * Portfolio Data Context
 */
const PortfolioDataContext = createContext(null);

/**
 * Hook to use portfolio data context
 */
export const usePortfolioData = () => {
  const context = useContext(PortfolioDataContext);
  if (!context) {
    throw new Error('usePortfolioData must be used within a PortfolioDataProvider');
  }
  return context;
};

/**
 * PortfolioDataProvider - Provides portfolio data to template components
 * 
 * @param {Object} props - Component props
 * @param {Object} props.data - Raw portfolio data from GitHub files
 * @param {Object} props.repository - Repository metadata
 * @param {Object} props.template - Template configuration
 * @param {React.ReactNode} props.children - Child components
 */
export const PortfolioDataProvider = ({
  data,
  repository,
  template,
  children
}) => {
  const contextLogger = useMemo(() => 
    logger.child({ 
      component: 'PortfolioDataProvider',
      repository: repository?.full_name 
    }), 
    [repository?.full_name]
  );

  // Process and normalize portfolio data
  const processedData = useMemo(() => {
    if (!data) {
      contextLogger.warn('No portfolio data provided');
      return getDefaultPortfolioData();
    }

    try {
      return normalizePortfolioData(data, template);
    } catch (error) {
      contextLogger.error('Failed to process portfolio data', { error: error.message });
      return getDefaultPortfolioData();
    }
  }, [data, template, contextLogger]);

  // Create context value
  const contextValue = useMemo(() => ({
    // Processed portfolio data
    portfolio: processedData,
    
    // Repository information
    repository,
    
    // Template configuration
    template,
    
    // Utility functions
    getSection: (sectionName) => processedData.sections?.[sectionName] || null,
    hasSection: (sectionName) => Boolean(processedData.sections?.[sectionName]),
    getSectionData: (sectionName, defaultValue = null) => {
      const section = processedData.sections?.[sectionName];
      return section?.data || defaultValue;
    },
    
    // Metadata helpers
    getMetadata: (key, defaultValue = null) => processedData.metadata?.[key] || defaultValue,
    getAssetUrl: (assetPath) => {
      if (!assetPath) return null;
      
      // If it's already a full URL, return as-is
      if (assetPath.startsWith('http://') || assetPath.startsWith('https://')) {
        return assetPath;
      }
      
      // If no repository info, return the path as-is
      if (!repository) return assetPath;
      
      // Handle different asset path formats
      const cleanPath = assetPath.startsWith('./') ? assetPath.slice(2) : 
                       assetPath.startsWith('/') ? assetPath.slice(1) : assetPath;
      
      return `https://raw.githubusercontent.com/${repository.full_name}/main/${cleanPath}`;
    },
    
    // GitHub-specific helpers
    getRepositoryUrl: () => repository?.html_url || repository?.url || null,
    getRepositoryName: () => repository?.name || null,
    getRepositoryOwner: () => repository?.owner?.login || repository?.owner || null,
    getRepositoryDescription: () => repository?.description || null,
    getRepositoryStats: () => ({
      stars: repository?.stargazers_count || 0,
      forks: repository?.forks_count || 0,
      watchers: repository?.watchers_count || 0,
      language: repository?.language || null,
      updated_at: repository?.updated_at || null
    }),
    
    // Content helpers
    getReadmeContent: () => {
      const readme = processedData.sections?.readme || processedData.sections?.about;
      return readme?.data || null;
    },
    
    // Asset helpers
    resolveAssetPath: (path) => {
      if (!path || !repository) return path;
      
      // Handle relative paths in markdown content
      if (path.startsWith('./') || (!path.startsWith('http') && !path.startsWith('/'))) {
        return `https://raw.githubusercontent.com/${repository.full_name}/main/${path}`;
      }
      
      return path;
    }
  }), [processedData, repository, template]);

  return (
    <PortfolioDataContext.Provider value={contextValue}>
      {children}
    </PortfolioDataContext.Provider>
  );
};

/**
 * Normalizes portfolio data from various file formats into a standard structure
 * @param {Object} rawData - Raw data from GitHub files
 * @param {Object} template - Template configuration
 * @returns {Object} Normalized portfolio data
 */
function normalizePortfolioData(rawData, template) {
  const normalized = {
    metadata: {},
    sections: {},
    assets: {},
    customData: {}
  };

  // Process different data sources
  Object.entries(rawData).forEach(([filePath, fileData]) => {
    const fileName = filePath.split('/').pop().toLowerCase();
    
    try {
      if (fileName === 'data.json' || fileName === 'portfolio.json') {
        // Main portfolio data file
        const data = typeof fileData === 'string' ? JSON.parse(fileData) : fileData;
        Object.assign(normalized.metadata, data.metadata || {});
        Object.assign(normalized.sections, data.sections || {});
        Object.assign(normalized.customData, data.customData || {});
      } else if (fileName === 'about.md') {
        // About markdown content
        normalized.sections.about = {
          type: 'markdown',
          data: fileData,
          title: 'About'
        };
      } else if (fileName === 'readme.md') {
        // README markdown content - separate from about
        normalized.sections.readme = {
          type: 'markdown',
          data: fileData,
          title: 'README'
        };
        // Also use as about if no dedicated about section
        if (!normalized.sections.about) {
          normalized.sections.about = {
            type: 'markdown',
            data: fileData,
            title: 'About'
          };
        }
      } else if (fileName.startsWith('projects.')) {
        // Projects data file
        const data = fileName.endsWith('.json') ? 
          (typeof fileData === 'string' ? JSON.parse(fileData) : fileData) : 
          fileData;
        normalized.sections.projects = {
          type: 'data',
          data: Array.isArray(data) ? data : data.projects || [],
          title: 'Projects'
        };
      } else if (fileName.startsWith('experience.')) {
        // Experience data file
        const data = fileName.endsWith('.json') ? 
          (typeof fileData === 'string' ? JSON.parse(fileData) : fileData) : 
          fileData;
        normalized.sections.experience = {
          type: 'data',
          data: Array.isArray(data) ? data : data.experience || [],
          title: 'Experience'
        };
      } else if (fileName.startsWith('skills.')) {
        // Skills data file
        const data = fileName.endsWith('.json') ? 
          (typeof fileData === 'string' ? JSON.parse(fileData) : fileData) : 
          fileData;
        normalized.sections.skills = {
          type: 'data',
          data: Array.isArray(data) ? data : data.skills || [],
          title: 'Skills'
        };
      } else if (fileName.startsWith('education.')) {
        // Education data file
        const data = fileName.endsWith('.json') ? 
          (typeof fileData === 'string' ? JSON.parse(fileData) : fileData) : 
          fileData;
        normalized.sections.education = {
          type: 'data',
          data: Array.isArray(data) ? data : data.education || [],
          title: 'Education'
        };
      } else if (fileName.startsWith('contact.')) {
        // Contact data file
        const data = fileName.endsWith('.json') ? 
          (typeof fileData === 'string' ? JSON.parse(fileData) : fileData) : 
          fileData;
        normalized.sections.contact = {
          type: 'data',
          data: data.contact || data,
          title: 'Contact'
        };
      } else if (filePath.includes('/assets/') || filePath.includes('/images/')) {
        // Asset files
        normalized.assets[fileName] = filePath;
      } else {
        // Custom data files
        normalized.customData[filePath] = fileData;
      }
    } catch (error) {
      logger.error('Failed to process file data', { 
        filePath, 
        error: error.message 
      });
    }
  });

  // Apply template-specific transformations
  if (template && template.structure) {
    applyTemplateTransformations(normalized, template);
  }

  return normalized;
}

/**
 * Applies template-specific data transformations
 * @param {Object} normalized - Normalized portfolio data
 * @param {Object} template - Template configuration
 */
function applyTemplateTransformations(normalized, template) {
  try {
    // Apply field mappings if defined in template
    if (template.structure.field_mappings) {
      Object.entries(template.structure.field_mappings).forEach(([from, to]) => {
        const value = getNestedValue(normalized, from);
        if (value !== undefined) {
          setNestedValue(normalized, to, value);
        }
      });
    }

    // Apply section transformations
    if (template.structure.section_transforms) {
      Object.entries(template.structure.section_transforms).forEach(([sectionName, transform]) => {
        const section = normalized.sections[sectionName];
        if (section && typeof transform === 'function') {
          normalized.sections[sectionName] = transform(section);
        }
      });
    }

    // Set default values for required fields
    if (template.structure.required_fields) {
      template.structure.required_fields.forEach(field => {
        const value = getNestedValue(normalized, field.path);
        if (value === undefined && field.default !== undefined) {
          setNestedValue(normalized, field.path, field.default);
        }
      });
    }
  } catch (error) {
    logger.error('Failed to apply template transformations', { 
      templateId: template.id,
      error: error.message 
    });
  }
}

/**
 * Gets a nested value from an object using dot notation
 * @param {Object} obj - Object to get value from
 * @param {string} path - Dot notation path
 * @returns {any} Value at path or undefined
 */
function getNestedValue(obj, path) {
  return path.split('.').reduce((current, key) => current?.[key], obj);
}

/**
 * Sets a nested value in an object using dot notation
 * @param {Object} obj - Object to set value in
 * @param {string} path - Dot notation path
 * @param {any} value - Value to set
 */
function setNestedValue(obj, path, value) {
  const keys = path.split('.');
  const lastKey = keys.pop();
  const target = keys.reduce((current, key) => {
    if (!current[key] || typeof current[key] !== 'object') {
      current[key] = {};
    }
    return current[key];
  }, obj);
  target[lastKey] = value;
}

/**
 * Returns default portfolio data structure
 * @returns {Object} Default portfolio data
 */
function getDefaultPortfolioData() {
  return {
    metadata: {
      name: 'Portfolio',
      title: 'Welcome to my portfolio',
      bio: 'This is a portfolio built with Nebula.',
      avatar: null,
      social: {}
    },
    sections: {},
    assets: {},
    customData: {}
  };
}