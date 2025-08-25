/**
 * Template Service
 * High-level service for template management operations
 */

import { createTemplateRegistry, DEFAULT_TEMPLATE_REPOSITORIES } from './template-registry.js';
import { logger } from './logger.js';
import { ERROR_MESSAGES } from './constants.js';

/**
 * Template Service class for managing template operations
 */
export class TemplateService {
  constructor(githubToken = null) {
    this.registry = createTemplateRegistry(githubToken);
    this.logger = logger.child({ service: 'template-service' });
    this.cache = new Map();
    this.cacheExpiry = 5 * 60 * 1000; // 5 minutes
  }

  /**
   * Gets all available templates
   * @param {Object} options - Options for template retrieval
   * @param {boolean} options.useCache - Whether to use cached results
   * @param {string[]} options.customRepos - Additional template repositories
   * @returns {Promise<Template[]>} Array of available templates
   */
  async getTemplates(options = {}) {
    const { useCache = true, customRepos = [] } = options;
    const cacheKey = 'all-templates';

    // Check cache first
    if (useCache && this.cache.has(cacheKey)) {
      const cached = this.cache.get(cacheKey);
      if (Date.now() - cached.timestamp < this.cacheExpiry) {
        this.logger.debug('Returning cached templates');
        return cached.data;
      }
    }

    try {
      this.logger.info('Fetching templates from repositories');
      
      // Combine default and custom repositories
      const repositories = [...DEFAULT_TEMPLATE_REPOSITORIES, ...customRepos];
      
      if (repositories.length === 0) {
        this.logger.warn('No template repositories configured');
        return [];
      }

      const templates = await this.registry.discoverTemplates(repositories);
      
      // Cache the results
      this.cache.set(cacheKey, {
        data: templates,
        timestamp: Date.now()
      });

      return templates;
    } catch (error) {
      this.logger.error('Failed to fetch templates', { error: error.message });
      throw new Error(ERROR_MESSAGES.TEMPLATE.INVALID_CONFIG);
    }
  }

  /**
   * Gets a specific template by ID
   * @param {string} templateId - Template ID (owner/repo format)
   * @returns {Promise<Template|null>} Template object or null if not found
   */
  async getTemplate(templateId) {
    if (!templateId || typeof templateId !== 'string') {
      throw new Error('Template ID is required');
    }

    const cacheKey = `template-${templateId}`;

    // Check cache first
    if (this.cache.has(cacheKey)) {
      const cached = this.cache.get(cacheKey);
      if (Date.now() - cached.timestamp < this.cacheExpiry) {
        this.logger.debug('Returning cached template', { templateId });
        return cached.data;
      }
    }

    try {
      this.logger.info('Fetching specific template', { templateId });
      
      const template = await this.registry.processTemplate(templateId);
      
      if (template) {
        // Cache the result
        this.cache.set(cacheKey, {
          data: template,
          timestamp: Date.now()
        });
      }

      return template;
    } catch (error) {
      this.logger.error('Failed to fetch template', { 
        templateId, 
        error: error.message 
      });
      return null;
    }
  }

  /**
   * Searches templates by criteria
   * @param {Object} criteria - Search criteria
   * @param {string} criteria.query - Search query
   * @param {string[]} criteria.tags - Tags to filter by
   * @param {string} criteria.author - Author to filter by
   * @returns {Promise<Template[]>} Filtered templates
   */
  async searchTemplates(criteria = {}) {
    const { query, tags, author } = criteria;
    
    this.logger.info('Searching templates', { criteria });
    
    const allTemplates = await this.getTemplates();
    
    let filteredTemplates = allTemplates;

    // Filter by search query
    if (query && query.trim()) {
      const searchTerm = query.toLowerCase().trim();
      filteredTemplates = filteredTemplates.filter(template => 
        template.name.toLowerCase().includes(searchTerm) ||
        template.description.toLowerCase().includes(searchTerm) ||
        template.tags.some(tag => tag.toLowerCase().includes(searchTerm))
      );
    }

    // Filter by tags
    if (tags && tags.length > 0) {
      filteredTemplates = filteredTemplates.filter(template =>
        tags.some(tag => template.tags.includes(tag))
      );
    }

    // Filter by author
    if (author && author.trim()) {
      const authorTerm = author.toLowerCase().trim();
      filteredTemplates = filteredTemplates.filter(template =>
        template.metadata.author.toLowerCase().includes(authorTerm)
      );
    }

    this.logger.info('Template search completed', { 
      total: allTemplates.length,
      filtered: filteredTemplates.length,
      criteria 
    });

    return filteredTemplates;
  }

  /**
   * Validates a template repository
   * @param {string} repoIdentifier - Repository identifier
   * @returns {Promise<Object>} Validation result
   */
  async validateTemplate(repoIdentifier) {
    if (!repoIdentifier) {
      throw new Error('Repository identifier is required');
    }

    try {
      this.logger.info('Validating template', { repoIdentifier });
      
      const template = await this.registry.processTemplate(repoIdentifier);
      
      if (!template) {
        return {
          isValid: false,
          errors: ['Template could not be processed'],
          warnings: []
        };
      }

      return template.validation;
    } catch (error) {
      this.logger.error('Template validation failed', { 
        repoIdentifier, 
        error: error.message 
      });
      
      return {
        isValid: false,
        errors: [error.message],
        warnings: []
      };
    }
  }

  /**
   * Clears the template cache
   */
  clearCache() {
    this.cache.clear();
    this.logger.info('Template cache cleared');
  }

  /**
   * Gets cache statistics
   * @returns {Object} Cache statistics
   */
  getCacheStats() {
    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys())
    };
  }
}

/**
 * Creates a new template service instance
 * @param {string} githubToken - GitHub access token
 * @returns {TemplateService} Template service instance
 */
export function createTemplateService(githubToken) {
  return new TemplateService(githubToken);
}