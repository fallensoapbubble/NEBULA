/**
 * Template Service Tests
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { TemplateService } from '../template-service.js';

// Mock template registry
vi.mock('../template-registry.js', () => ({
  createTemplateRegistry: vi.fn(() => ({
    discoverTemplates: vi.fn(),
    processTemplate: vi.fn()
  })),
  DEFAULT_TEMPLATE_REPOSITORIES: ['test/template1', 'test/template2']
}));

// Mock logger
vi.mock('../logger.js', () => ({
  logger: {
    child: vi.fn(() => ({
      info: vi.fn(),
      debug: vi.fn(),
      warn: vi.fn(),
      error: vi.fn()
    }))
  }
}));

describe('TemplateService', () => {
  let service;
  let mockRegistry;

  beforeEach(() => {
    service = new TemplateService('mock-token');
    mockRegistry = service.registry;
    service.clearCache(); // Clear cache between tests
  });

  describe('getTemplates', () => {
    const mockTemplates = [
      {
        id: 'test/template1',
        name: 'Template 1',
        description: 'First test template',
        tags: ['portfolio', 'minimal']
      },
      {
        id: 'test/template2',
        name: 'Template 2',
        description: 'Second test template',
        tags: ['portfolio', 'creative']
      }
    ];

    it('should fetch templates successfully', async () => {
      mockRegistry.discoverTemplates.mockResolvedValue(mockTemplates);

      const result = await service.getTemplates();
      expect(result).toEqual(mockTemplates);
      expect(mockRegistry.discoverTemplates).toHaveBeenCalledWith(['test/template1', 'test/template2']);
    });

    it('should use cache when available', async () => {
      mockRegistry.discoverTemplates.mockResolvedValue(mockTemplates);

      // First call
      await service.getTemplates();
      
      // Second call should use cache
      const result = await service.getTemplates();
      
      expect(result).toEqual(mockTemplates);
      expect(mockRegistry.discoverTemplates).toHaveBeenCalledTimes(1);
    });

    it('should bypass cache when useCache is false', async () => {
      mockRegistry.discoverTemplates.mockResolvedValue(mockTemplates);

      // First call
      await service.getTemplates();
      
      // Second call with useCache: false
      await service.getTemplates({ useCache: false });
      
      expect(mockRegistry.discoverTemplates).toHaveBeenCalledTimes(2);
    });

    it('should include custom repositories', async () => {
      mockRegistry.discoverTemplates.mockResolvedValue(mockTemplates);

      await service.getTemplates({ customRepos: ['custom/template'] });
      
      expect(mockRegistry.discoverTemplates).toHaveBeenCalledWith([
        'test/template1', 
        'test/template2', 
        'custom/template'
      ]);
    });

    it('should return empty array when no repositories configured', async () => {
      // Mock empty default repositories
      vi.doMock('../template-registry.js', () => ({
        createTemplateRegistry: vi.fn(() => mockRegistry),
        DEFAULT_TEMPLATE_REPOSITORIES: []
      }));

      const result = await service.getTemplates();
      expect(result).toEqual([]);
    });
  });

  describe('getTemplate', () => {
    const mockTemplate = {
      id: 'test/template1',
      name: 'Template 1',
      description: 'Test template'
    };

    it('should fetch specific template successfully', async () => {
      mockRegistry.processTemplate.mockResolvedValue(mockTemplate);

      const result = await service.getTemplate('test/template1');
      expect(result).toEqual(mockTemplate);
      expect(mockRegistry.processTemplate).toHaveBeenCalledWith('test/template1');
    });

    it('should return null for non-existent template', async () => {
      mockRegistry.processTemplate.mockResolvedValue(null);

      const result = await service.getTemplate('test/nonexistent');
      expect(result).toBeNull();
    });

    it('should throw error for invalid template ID', async () => {
      await expect(service.getTemplate('')).rejects.toThrow('Template ID is required');
      await expect(service.getTemplate(null)).rejects.toThrow('Template ID is required');
    });

    it('should use cache for repeated requests', async () => {
      mockRegistry.processTemplate.mockResolvedValue(mockTemplate);

      // First call
      await service.getTemplate('test/template1');
      
      // Second call should use cache
      const result = await service.getTemplate('test/template1');
      
      expect(result).toEqual(mockTemplate);
      expect(mockRegistry.processTemplate).toHaveBeenCalledTimes(1);
    });
  });

  describe('searchTemplates', () => {
    const mockTemplates = [
      {
        id: 'test/minimal',
        name: 'Minimal Portfolio',
        description: 'A clean minimal portfolio template',
        tags: ['portfolio', 'minimal', 'clean'],
        metadata: { author: 'john' }
      },
      {
        id: 'test/creative',
        name: 'Creative Portfolio',
        description: 'A creative and colorful portfolio template',
        tags: ['portfolio', 'creative', 'colorful'],
        metadata: { author: 'jane' }
      }
    ];

    beforeEach(() => {
      mockRegistry.discoverTemplates.mockResolvedValue(mockTemplates);
    });

    it('should search by query', async () => {
      const result = await service.searchTemplates({ query: 'minimal' });
      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('Minimal Portfolio');
    });

    it('should search by tags', async () => {
      const result = await service.searchTemplates({ tags: ['creative'] });
      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('Creative Portfolio');
    });

    it('should search by author', async () => {
      const result = await service.searchTemplates({ author: 'jane' });
      expect(result).toHaveLength(1);
      expect(result[0].metadata.author).toBe('jane');
    });

    it('should return all templates when no criteria provided', async () => {
      const result = await service.searchTemplates({});
      expect(result).toHaveLength(2);
    });

    it('should handle case-insensitive search', async () => {
      const result = await service.searchTemplates({ query: 'MINIMAL' });
      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('Minimal Portfolio');
    });
  });

  describe('validateTemplate', () => {
    it('should validate template successfully', async () => {
      const mockTemplate = {
        validation: {
          isValid: true,
          errors: [],
          warnings: []
        }
      };
      
      mockRegistry.processTemplate.mockResolvedValue(mockTemplate);

      const result = await service.validateTemplate('test/template');
      expect(result).toEqual(mockTemplate.validation);
    });

    it('should return invalid for non-processable template', async () => {
      mockRegistry.processTemplate.mockResolvedValue(null);

      const result = await service.validateTemplate('test/invalid');
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Template could not be processed');
    });

    it('should handle validation errors', async () => {
      mockRegistry.processTemplate.mockRejectedValue(new Error('Validation failed'));

      const result = await service.validateTemplate('test/error');
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Validation failed');
    });

    it('should throw error for missing repository identifier', async () => {
      await expect(service.validateTemplate('')).rejects.toThrow('Repository identifier is required');
    });
  });

  describe('cache management', () => {
    it('should clear cache successfully', () => {
      service.cache.set('test', { data: 'test' });
      expect(service.cache.size).toBe(1);
      
      service.clearCache();
      expect(service.cache.size).toBe(0);
    });

    it('should return cache statistics', () => {
      service.cache.set('key1', { data: 'test1' });
      service.cache.set('key2', { data: 'test2' });
      
      const stats = service.getCacheStats();
      expect(stats.size).toBe(2);
      expect(stats.keys).toEqual(['key1', 'key2']);
    });
  });
});