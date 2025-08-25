import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { TemplateService, createTemplateService } from '../template-service.js';

// Mock dependencies
vi.mock('../template-registry.js', () => ({
  createTemplateRegistry: vi.fn(() => ({
    discoverTemplates: vi.fn(),
    processTemplate: vi.fn()
  })),
  DEFAULT_TEMPLATE_REPOSITORIES: ['owner1/template1', 'owner2/template2']
}));

vi.mock('../logger.js', () => ({
  logger: {
    child: vi.fn(() => ({
      debug: vi.fn(),
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn()
    }))
  }
}));

vi.mock('../constants.js', () => ({
  ERROR_MESSAGES: {
    TEMPLATE: {
      INVALID_CONFIG: 'Invalid template configuration'
    }
  }
}));

describe('TemplateService', () => {
  let templateService;
  let mockRegistry;
  let mockLogger;

  beforeEach(() => {
    const { createTemplateRegistry } = require('../template-registry.js');
    const { logger } = require('../logger.js');
    
    mockRegistry = {
      discoverTemplates: vi.fn(),
      processTemplate: vi.fn()
    };
    
    mockLogger = {
      debug: vi.fn(),
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn()
    };

    createTemplateRegistry.mockReturnValue(mockRegistry);
    logger.child.mockReturnValue(mockLogger);

    templateService = new TemplateService('test-token');
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('constructor', () => {
    it('should initialize with default values', () => {
      expect(templateService.registry).toBe(mockRegistry);
      expect(templateService.cache).toBeInstanceOf(Map);
      expect(templateService.cacheExpiry).toBe(5 * 60 * 1000);
    });

    it('should create registry with provided token', () => {
      const { createTemplateRegistry } = require('../template-registry.js');
      
      new TemplateService('custom-token');
      
      expect(createTemplateRegistry).toHaveBeenCalledWith('custom-token');
    });
  });

  describe('getTemplates', () => {
    const mockTemplates = [
      {
        id: 'owner1/template1',
        name: 'Template 1',
        description: 'First template',
        tags: ['react', 'portfolio']
      },
      {
        id: 'owner2/template2',
        name: 'Template 2',
        description: 'Second template',
        tags: ['vue', 'portfolio']
      }
    ];

    it('should fetch templates successfully', async () => {
      mockRegistry.discoverTemplates.mockResolvedValue(mockTemplates);

      const result = await templateService.getTemplates();

      expect(result).toEqual(mockTemplates);
      expect(mockRegistry.discoverTemplates).toHaveBeenCalledWith(['owner1/template1', 'owner2/template2']);
      expect(mockLogger.info).toHaveBeenCalledWith('Fetching templates from repositories');
    });

    it('should use cached templates when available and not expired', async () => {
      // Set up cache
      templateService.cache.set('all-templates', {
        data: mockTemplates,
        timestamp: Date.now() - 1000 // 1 second ago
      });

      const result = await templateService.getTemplates();

      expect(result).toEqual(mockTemplates);
      expect(mockRegistry.discoverTemplates).not.toHaveBeenCalled();
      expect(mockLogger.debug).toHaveBeenCalledWith('Returning cached templates');
    });

    it('should fetch fresh templates when cache is expired', async () => {
      // Set up expired cache
      templateService.cache.set('all-templates', {
        data: mockTemplates,
        timestamp: Date.now() - (6 * 60 * 1000) // 6 minutes ago
      });

      mockRegistry.discoverTemplates.mockResolvedValue(mockTemplates);

      const result = await templateService.getTemplates();

      expect(result).toEqual(mockTemplates);
      expect(mockRegistry.discoverTemplates).toHaveBeenCalled();
    });

    it('should include custom repositories', async () => {
      const customRepos = ['owner3/template3'];
      mockRegistry.discoverTemplates.mockResolvedValue(mockTemplates);

      await templateService.getTemplates({ customRepos });

      expect(mockRegistry.discoverTemplates).toHaveBeenCalledWith([
        'owner1/template1',
        'owner2/template2',
        'owner3/template3'
      ]);
    });

    it('should return empty array when no repositories configured', async () => {
      // Mock empty default repositories
      const { DEFAULT_TEMPLATE_REPOSITORIES } = require('../template-registry.js');
      DEFAULT_TEMPLATE_REPOSITORIES.length = 0;

      const result = await templateService.getTemplates();

      expect(result).toEqual([]);
      expect(mockLogger.warn).toHaveBeenCalledWith('No template repositories configured');
    });

    it('should handle registry errors', async () => {
      mockRegistry.discoverTemplates.mockRejectedValue(new Error('Registry error'));

      await expect(templateService.getTemplates()).rejects.toThrow('Invalid template configuration');
      expect(mockLogger.error).toHaveBeenCalledWith('Failed to fetch templates', { error: 'Registry error' });
    });

    it('should skip cache when useCache is false', async () => {
      // Set up cache
      templateService.cache.set('all-templates', {
        data: mockTemplates,
        timestamp: Date.now()
      });

      mockRegistry.discoverTemplates.mockResolvedValue(mockTemplates);

      await templateService.getTemplates({ useCache: false });

      expect(mockRegistry.discoverTemplates).toHaveBeenCalled();
    });
  });

  describe('getTemplate', () => {
    const mockTemplate = {
      id: 'owner1/template1',
      name: 'Template 1',
      description: 'First template',
      tags: ['react', 'portfolio']
    };

    it('should fetch specific template successfully', async () => {
      mockRegistry.processTemplate.mockResolvedValue(mockTemplate);

      const result = await templateService.getTemplate('owner1/template1');

      expect(result).toEqual(mockTemplate);
      expect(mockRegistry.processTemplate).toHaveBeenCalledWith('owner1/template1');
      expect(mockLogger.info).toHaveBeenCalledWith('Fetching specific template', { templateId: 'owner1/template1' });
    });

    it('should use cached template when available', async () => {
      templateService.cache.set('template-owner1/template1', {
        data: mockTemplate,
        timestamp: Date.now()
      });

      const result = await templateService.getTemplate('owner1/template1');

      expect(result).toEqual(mockTemplate);
      expect(mockRegistry.processTemplate).not.toHaveBeenCalled();
      expect(mockLogger.debug).toHaveBeenCalledWith('Returning cached template', { templateId: 'owner1/template1' });
    });

    it('should validate template ID', async () => {
      await expect(templateService.getTemplate()).rejects.toThrow('Template ID is required');
      await expect(templateService.getTemplate('')).rejects.toThrow('Template ID is required');
      await expect(templateService.getTemplate(123)).rejects.toThrow('Template ID is required');
    });

    it('should return null when template not found', async () => {
      mockRegistry.processTemplate.mockResolvedValue(null);

      const result = await templateService.getTemplate('nonexistent/template');

      expect(result).toBeNull();
    });

    it('should handle registry errors gracefully', async () => {
      mockRegistry.processTemplate.mockRejectedValue(new Error('Template error'));

      const result = await templateService.getTemplate('owner1/template1');

      expect(result).toBeNull();
      expect(mockLogger.error).toHaveBeenCalledWith('Failed to fetch template', {
        templateId: 'owner1/template1',
        error: 'Template error'
      });
    });
  });

  describe('searchTemplates', () => {
    const mockTemplates = [
      {
        id: 'owner1/react-portfolio',
        name: 'React Portfolio',
        description: 'A modern React portfolio template',
        tags: ['react', 'portfolio', 'modern'],
        metadata: { author: 'John Doe' }
      },
      {
        id: 'owner2/vue-portfolio',
        name: 'Vue Portfolio',
        description: 'A beautiful Vue.js portfolio',
        tags: ['vue', 'portfolio', 'beautiful'],
        metadata: { author: 'Jane Smith' }
      },
      {
        id: 'owner3/simple-blog',
        name: 'Simple Blog',
        description: 'A simple blog template',
        tags: ['blog', 'simple'],
        metadata: { author: 'John Doe' }
      }
    ];

    beforeEach(() => {
      vi.spyOn(templateService, 'getTemplates').mockResolvedValue(mockTemplates);
    });

    it('should search by query string', async () => {
      const result = await templateService.searchTemplates({ query: 'react' });

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('owner1/react-portfolio');
    });

    it('should search by description', async () => {
      const result = await templateService.searchTemplates({ query: 'beautiful' });

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('owner2/vue-portfolio');
    });

    it('should search by tags', async () => {
      const result = await templateService.searchTemplates({ tags: ['portfolio'] });

      expect(result).toHaveLength(2);
      expect(result.map(t => t.id)).toEqual(['owner1/react-portfolio', 'owner2/vue-portfolio']);
    });

    it('should filter by author', async () => {
      const result = await templateService.searchTemplates({ author: 'John Doe' });

      expect(result).toHaveLength(2);
      expect(result.map(t => t.id)).toEqual(['owner1/react-portfolio', 'owner3/simple-blog']);
    });

    it('should combine multiple search criteria', async () => {
      const result = await templateService.searchTemplates({
        query: 'portfolio',
        tags: ['react'],
        author: 'John'
      });

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('owner1/react-portfolio');
    });

    it('should return all templates when no criteria provided', async () => {
      const result = await templateService.searchTemplates();

      expect(result).toEqual(mockTemplates);
    });

    it('should handle empty search results', async () => {
      const result = await templateService.searchTemplates({ query: 'nonexistent' });

      expect(result).toHaveLength(0);
    });

    it('should be case insensitive', async () => {
      const result = await templateService.searchTemplates({ query: 'REACT' });

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('owner1/react-portfolio');
    });
  });

  describe('validateTemplate', () => {
    it('should validate template successfully', async () => {
      const mockValidation = {
        isValid: true,
        errors: [],
        warnings: []
      };

      const mockTemplate = {
        validation: mockValidation
      };

      mockRegistry.processTemplate.mockResolvedValue(mockTemplate);

      const result = await templateService.validateTemplate('owner1/template1');

      expect(result).toEqual(mockValidation);
      expect(mockLogger.info).toHaveBeenCalledWith('Validating template', { repoIdentifier: 'owner1/template1' });
    });

    it('should handle template that cannot be processed', async () => {
      mockRegistry.processTemplate.mockResolvedValue(null);

      const result = await templateService.validateTemplate('invalid/template');

      expect(result).toEqual({
        isValid: false,
        errors: ['Template could not be processed'],
        warnings: []
      });
    });

    it('should handle validation errors', async () => {
      mockRegistry.processTemplate.mockRejectedValue(new Error('Validation error'));

      const result = await templateService.validateTemplate('owner1/template1');

      expect(result).toEqual({
        isValid: false,
        errors: ['Validation error'],
        warnings: []
      });

      expect(mockLogger.error).toHaveBeenCalledWith('Template validation failed', {
        repoIdentifier: 'owner1/template1',
        error: 'Validation error'
      });
    });

    it('should require repository identifier', async () => {
      await expect(templateService.validateTemplate()).rejects.toThrow('Repository identifier is required');
    });
  });

  describe('cache management', () => {
    it('should clear cache', () => {
      templateService.cache.set('test-key', 'test-value');
      
      templateService.clearCache();
      
      expect(templateService.cache.size).toBe(0);
      expect(mockLogger.info).toHaveBeenCalledWith('Template cache cleared');
    });

    it('should get cache statistics', () => {
      templateService.cache.set('key1', 'value1');
      templateService.cache.set('key2', 'value2');

      const stats = templateService.getCacheStats();

      expect(stats).toEqual({
        size: 2,
        keys: ['key1', 'key2']
      });
    });
  });

  describe('createTemplateService', () => {
    it('should create template service instance', () => {
      const service = createTemplateService('test-token');

      expect(service).toBeInstanceOf(TemplateService);
    });
  });
});