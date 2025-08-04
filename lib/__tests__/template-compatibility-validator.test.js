/**
 * Tests for Template Compatibility Validation System
 * Tests requirements 8.1, 8.2, and 8.4
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { TemplateCompatibilityValidationSystem } from '../template-compatibility-validator.js';

// Mock repository service
const mockRepositoryService = {
  getRepositoryStructure: vi.fn(),
  getFileContent: vi.fn()
};

describe('TemplateCompatibilityValidationSystem', () => {
  let validator;

  beforeEach(() => {
    validator = new TemplateCompatibilityValidationSystem(mockRepositoryService);
    vi.clearAllMocks();
  });

  describe('validateTemplateStructure', () => {
    it('should validate a well-structured template repository', async () => {
      const mockStructure = {
        success: true,
        structure: {
          items: [
            { path: '.nebula', type: 'dir', name: '.nebula' },
            { path: '.nebula/config.json', type: 'file', name: 'config.json' },
            { path: '.nebula/preview.png', type: 'file', name: 'preview.png' },
            { path: 'components', type: 'dir', name: 'components' },
            { path: 'public', type: 'dir', name: 'public' },
            { path: 'README.md', type: 'file', name: 'README.md' },
            { path: 'package.json', type: 'file', name: 'package.json' }
          ]
        }
      };

      mockRepositoryService.getRepositoryStructure.mockResolvedValue(mockStructure);

      const result = await validator.validateTemplateStructure('owner', 'repo');

      expect(result.success).toBe(true);
      expect(result.structure.hasNebulaDirectory).toBe(true);
      expect(result.structure.hasComponentsDirectory).toBe(true);
      expect(result.structure.hasPublicDirectory).toBe(true);
      expect(result.structure.hasPackageJson).toBe(true);
      expect(result.structure.valid).toBe(true);
    });

    it('should fail validation for repository without .nebula directory', async () => {
      const mockStructure = {
        success: true,
        structure: {
          items: [
            { path: 'README.md', type: 'file', name: 'README.md' }
          ]
        }
      };

      mockRepositoryService.getRepositoryStructure.mockResolvedValue(mockStructure);

      const result = await validator.validateTemplateStructure('owner', 'repo');

      expect(result.success).toBe(false);
      expect(result.structure.hasNebulaDirectory).toBe(false);
      expect(result.structure.valid).toBe(false);
      expect(result.structure.issues).toContainEqual(
        expect.objectContaining({
          type: 'error',
          message: 'Missing required .nebula directory'
        })
      );
    });

    it('should fail validation for empty repository', async () => {
      const mockStructure = {
        success: true,
        structure: {
          items: []
        }
      };

      mockRepositoryService.getRepositoryStructure.mockResolvedValue(mockStructure);

      const result = await validator.validateTemplateStructure('owner', 'repo');

      expect(result.success).toBe(false);
      expect(result.structure.totalFiles).toBe(0);
      expect(result.structure.issues).toContainEqual(
        expect.objectContaining({
          type: 'error',
          message: 'Repository appears to be empty'
        })
      );
    });
  });

  describe('validateRequiredFiles', () => {
    it('should validate presence of required files', async () => {
      // Mock file existence checks
      mockRepositoryService.getFileContent
        .mockResolvedValueOnce({ success: true }) // .nebula/config.json
        .mockResolvedValueOnce({ success: true }) // .nebula/preview.png
        .mockResolvedValueOnce({ success: true }); // README.md

      const result = await validator.validateRequiredFiles('owner', 'repo');

      expect(result.success).toBe(true);
      expect(result.files.valid).toBe(true);
      expect(result.files.required['.nebula/config.json'].exists).toBe(true);
      expect(result.files.recommended['.nebula/preview.png'].exists).toBe(true);
      expect(result.files.recommended['README.md'].exists).toBe(true);
    });

    it('should fail validation when required files are missing', async () => {
      // Mock missing config file
      mockRepositoryService.getFileContent
        .mockResolvedValueOnce({ success: false }) // .nebula/config.json missing
        .mockResolvedValueOnce({ success: false }) // .nebula/preview.png missing
        .mockResolvedValueOnce({ success: false }); // README.md missing

      const result = await validator.validateRequiredFiles('owner', 'repo');

      expect(result.success).toBe(false);
      expect(result.files.valid).toBe(false);
      expect(result.files.required['.nebula/config.json'].exists).toBe(false);
      expect(result.files.issues).toContainEqual(
        expect.objectContaining({
          type: 'error',
          message: 'Missing required file: .nebula/config.json',
          critical: true
        })
      );
    });

    it('should warn about missing recommended files', async () => {
      // Required file exists, recommended files missing
      mockRepositoryService.getFileContent
        .mockResolvedValueOnce({ success: true })  // .nebula/config.json exists
        .mockResolvedValueOnce({ success: false }) // .nebula/preview.png missing
        .mockResolvedValueOnce({ success: false }); // README.md missing

      const result = await validator.validateRequiredFiles('owner', 'repo');

      expect(result.success).toBe(true); // Still successful because required files exist
      expect(result.files.issues).toContainEqual(
        expect.objectContaining({
          type: 'warning',
          message: 'Missing recommended file: .nebula/preview.png'
        })
      );
      expect(result.files.issues).toContainEqual(
        expect.objectContaining({
          type: 'warning',
          message: 'Missing recommended file: README.md'
        })
      );
    });
  });

  describe('validateConfigurationAndSchema', () => {
    it('should validate a correct configuration file', async () => {
      const validConfig = {
        version: '1.0.0',
        name: 'Test Template',
        templateType: 'json',
        contentFiles: [
          {
            path: 'data.json',
            type: 'json',
            schema: {
              title: {
                type: 'string',
                label: 'Title',
                required: true
              },
              description: {
                type: 'text',
                label: 'Description',
                maxLength: 500
              }
            }
          }
        ]
      };

      mockRepositoryService.getFileContent.mockResolvedValue({
        success: true,
        content: {
          content: JSON.stringify(validConfig)
        }
      });

      const result = await validator.validateConfigurationAndSchema('owner', 'repo');

      expect(result.success).toBe(true);
      expect(result.config).toEqual(validConfig);
      expect(result.validation.configStructure.valid).toBe(true);
      expect(result.validation.schemaDefinitions.valid).toBe(true);
    });

    it('should fail validation for invalid JSON', async () => {
      mockRepositoryService.getFileContent.mockResolvedValue({
        success: true,
        content: {
          content: '{ invalid json }'
        }
      });

      const result = await validator.validateConfigurationAndSchema('owner', 'repo');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Invalid JSON in configuration file');
      expect(result.details.type).toBe('JSONParseError');
    });

    it('should fail validation for missing required fields', async () => {
      const invalidConfig = {
        name: 'Test Template'
        // Missing version, templateType, contentFiles
      };

      mockRepositoryService.getFileContent.mockResolvedValue({
        success: true,
        content: {
          content: JSON.stringify(invalidConfig)
        }
      });

      const result = await validator.validateConfigurationAndSchema('owner', 'repo');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Invalid configuration structure');
      expect(result.details.errors).toContain('Missing required configuration field: version');
      expect(result.details.errors).toContain('Missing required configuration field: templateType');
      expect(result.details.errors).toContain('Missing required configuration field: contentFiles');
    });

    it('should fail validation for unsupported template type', async () => {
      const invalidConfig = {
        version: '1.0.0',
        templateType: 'unsupported',
        contentFiles: []
      };

      mockRepositoryService.getFileContent.mockResolvedValue({
        success: true,
        content: {
          content: JSON.stringify(invalidConfig)
        }
      });

      const result = await validator.validateConfigurationAndSchema('owner', 'repo');

      expect(result.success).toBe(false);
      expect(result.details.errors).toContain(
        'Unsupported template type: unsupported. Supported types: json, markdown, hybrid'
      );
    });

    it('should validate schema definitions correctly', async () => {
      const configWithInvalidSchema = {
        version: '1.0.0',
        templateType: 'json',
        contentFiles: [
          {
            path: 'data.json',
            schema: {
              title: {
                type: 'unsupported_type',
                required: 'not_boolean'
              }
            }
          }
        ]
      };

      mockRepositoryService.getFileContent.mockResolvedValue({
        success: true,
        content: {
          content: JSON.stringify(configWithInvalidSchema)
        }
      });

      const result = await validator.validateConfigurationAndSchema('owner', 'repo');

      expect(result.success).toBe(false);
      expect(result.details.errors).toContain(
        expect.stringContaining('Unsupported field type \'unsupported_type\'')
      );
      expect(result.details.errors).toContain(
        expect.stringContaining('required must be a boolean')
      );
    });
  });

  describe('validateContentFiles', () => {
    it('should validate existing content files', async () => {
      const config = {
        contentFiles: [
          {
            path: 'data.json',
            type: 'json',
            schema: {}
          },
          {
            path: 'content/about.md',
            type: 'markdown',
            schema: {}
          }
        ]
      };

      // Mock file existence and content
      mockRepositoryService.getFileContent
        .mockResolvedValueOnce({ 
          success: true, 
          content: { content: '{"title": "Test"}' } 
        }) // data.json
        .mockResolvedValueOnce({ 
          success: true, 
          content: { content: '# About\nThis is content.' } 
        }); // about.md

      const result = await validator.validateContentFiles('owner', 'repo', config);

      expect(result.success).toBe(true);
      expect(result.content.valid).toBe(true);
      expect(result.content.files).toHaveLength(2);
      expect(result.content.files[0].exists).toBe(true);
      expect(result.content.files[0].valid).toBe(true);
      expect(result.content.files[1].exists).toBe(true);
      expect(result.content.files[1].valid).toBe(true);
    });

    it('should handle missing content files', async () => {
      const config = {
        contentFiles: [
          {
            path: 'missing.json',
            type: 'json',
            schema: {}
          }
        ]
      };

      mockRepositoryService.getFileContent.mockResolvedValue({ success: false });

      const result = await validator.validateContentFiles('owner', 'repo', config);

      expect(result.success).toBe(true); // Still successful, just warnings
      expect(result.content.files[0].exists).toBe(false);
      expect(result.content.issues).toContainEqual(
        expect.objectContaining({
          type: 'warning',
          message: 'Content file not found: missing.json'
        })
      );
    });

    it('should validate JSON content files', async () => {
      const config = {
        contentFiles: [
          {
            path: 'invalid.json',
            type: 'json',
            schema: {}
          }
        ]
      };

      mockRepositoryService.getFileContent.mockResolvedValue({
        success: true,
        content: { content: '{ invalid json }' }
      });

      const result = await validator.validateContentFiles('owner', 'repo', config);

      expect(result.success).toBe(true);
      expect(result.content.files[0].valid).toBe(false);
      expect(result.content.issues).toContainEqual(
        expect.objectContaining({
          type: 'error',
          message: 'Invalid JSON in invalid.json'
        })
      );
    });

    it('should handle wildcard paths', async () => {
      const config = {
        contentFiles: [
          {
            path: 'content/*.md',
            type: 'markdown',
            schema: {}
          }
        ]
      };

      const result = await validator.validateContentFiles('owner', 'repo', config);

      expect(result.success).toBe(true);
      expect(result.content.files[0].exists).toBe(true); // Wildcard paths assumed valid
      expect(result.content.files[0].valid).toBe(true);
    });
  });

  describe('validateSchemaObject', () => {
    it('should validate correct schema objects', () => {
      const validSchema = {
        title: {
          type: 'string',
          label: 'Title',
          required: true,
          maxLength: 100
        },
        description: {
          type: 'text',
          label: 'Description'
        },
        projects: {
          type: 'array',
          items: {
            properties: {
              name: {
                type: 'string',
                required: true
              }
            }
          }
        }
      };

      const errors = validator.validateSchemaObject(validSchema);

      expect(errors).toHaveLength(0);
    });

    it('should detect unsupported field types', () => {
      const invalidSchema = {
        field1: {
          type: 'unsupported_type'
        }
      };

      const errors = validator.validateSchemaObject(invalidSchema);

      expect(errors).toContain(
        expect.stringContaining('Unsupported field type \'unsupported_type\'')
      );
    });

    it('should validate nested object schemas', () => {
      const nestedSchema = {
        personalInfo: {
          type: 'object',
          properties: {
            name: {
              type: 'invalid_type'
            }
          }
        }
      };

      const errors = validator.validateSchemaObject(nestedSchema);

      expect(errors).toContain(
        expect.stringContaining('Unsupported field type \'invalid_type\'')
      );
    });

    it('should validate array item schemas', () => {
      const arraySchema = {
        items: {
          type: 'array',
          items: {
            properties: {
              field: {
                type: 'invalid_type'
              }
            }
          }
        }
      };

      const errors = validator.validateSchemaObject(arraySchema);

      expect(errors).toContain(
        expect.stringContaining('Unsupported field type \'invalid_type\'')
      );
    });

    it('should validate validation constraints', () => {
      const schemaWithInvalidConstraints = {
        field1: {
          type: 'string',
          maxLength: -1
        },
        field2: {
          type: 'string',
          minLength: 'not_a_number'
        },
        field3: {
          type: 'string',
          required: 'not_boolean'
        }
      };

      const errors = validator.validateSchemaObject(schemaWithInvalidConstraints);

      expect(errors).toContain(
        expect.stringContaining('maxLength must be a positive number')
      );
      expect(errors).toContain(
        expect.stringContaining('minLength must be a positive number')
      );
      expect(errors).toContain(
        expect.stringContaining('required must be a boolean')
      );
    });
  });

  describe('assessPlatformCompatibility', () => {
    it('should assess template as compatible when validation passes', () => {
      const validationResult = {
        valid: true,
        score: 85,
        errors: [],
        warnings: []
      };

      const isCompatible = validator.assessPlatformCompatibility(validationResult);

      expect(isCompatible).toBe(true);
    });

    it('should assess template as incompatible when validation fails', () => {
      const validationResult = {
        valid: false,
        score: 45,
        errors: ['Critical error'],
        warnings: []
      };

      const isCompatible = validator.assessPlatformCompatibility(validationResult);

      expect(isCompatible).toBe(false);
    });

    it('should assess template as incompatible when score is too low', () => {
      const validationResult = {
        valid: true,
        score: 65, // Below 70 threshold
        errors: [],
        warnings: []
      };

      const isCompatible = validator.assessPlatformCompatibility(validationResult);

      expect(isCompatible).toBe(false);
    });
  });

  describe('identifySupportedFeatures', () => {
    it('should identify features from configuration', () => {
      const config = {
        templateType: 'json',
        contentFiles: [
          { path: 'data.json' },
          { path: 'content.json' }
        ],
        assets: {
          allowedTypes: ['image/png']
        },
        previewComponent: 'MyTemplate'
      };

      const features = validator.identifySupportedFeatures(config);

      expect(features).toContain('json template type');
      expect(features).toContain('2 content files');
      expect(features).toContain('Asset management');
      expect(features).toContain('Custom preview component');
    });

    it('should handle missing configuration', () => {
      const features = validator.identifySupportedFeatures(null);

      expect(features).toHaveLength(0);
    });
  });

  describe('identifyLimitations', () => {
    it('should identify limitations from validation result', () => {
      const validationResult = {
        errors: ['Error 1', 'Error 2'],
        warnings: ['Warning 1', 'Warning 2', 'Warning 3', 'Warning 4'],
        score: 65
      };

      const limitations = validator.identifyLimitations(validationResult);

      expect(limitations).toContain('2 critical errors');
      expect(limitations).toContain('Multiple warning-level issues');
      expect(limitations).toContain('Below recommended quality threshold');
    });

    it('should return empty array for high-quality templates', () => {
      const validationResult = {
        errors: [],
        warnings: ['Minor warning'],
        score: 95
      };

      const limitations = validator.identifyLimitations(validationResult);

      expect(limitations).toHaveLength(0);
    });
  });

  describe('integration tests', () => {
    it('should perform complete validation workflow', async () => {
      // Mock repository structure
      mockRepositoryService.getRepositoryStructure.mockResolvedValue({
        success: true,
        structure: {
          items: [
            { path: '.nebula', type: 'dir', name: '.nebula' },
            { path: '.nebula/config.json', type: 'file', name: 'config.json' },
            { path: 'data.json', type: 'file', name: 'data.json' }
          ]
        }
      });

      // Mock configuration file
      const validConfig = {
        version: '1.0.0',
        templateType: 'json',
        contentFiles: [
          {
            path: 'data.json',
            type: 'json',
            schema: {
              title: { type: 'string', required: true }
            }
          }
        ]
      };

      // Mock file content calls
      mockRepositoryService.getFileContent
        .mockResolvedValueOnce({ success: true }) // .nebula/config.json exists
        .mockResolvedValueOnce({ success: false }) // .nebula/preview.png missing
        .mockResolvedValueOnce({ success: false }) // README.md missing
        .mockResolvedValueOnce({ 
          success: true, 
          content: { content: JSON.stringify(validConfig) } 
        }) // config content
        .mockResolvedValueOnce({ 
          success: true, 
          content: { content: '{"title": "Test"}' } 
        }); // data.json content

      // Note: This is a simplified test since the full validateTemplateCompatibility
      // method calls the existing validator which has complex dependencies
      const structureResult = await validator.validateTemplateStructure('owner', 'repo');
      const filesResult = await validator.validateRequiredFiles('owner', 'repo');
      const configResult = await validator.validateConfigurationAndSchema('owner', 'repo');

      expect(structureResult.success).toBe(true);
      expect(filesResult.success).toBe(true);
      expect(configResult.success).toBe(true);
    });
  });
});