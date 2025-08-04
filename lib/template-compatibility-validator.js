/**
 * Template Compatibility Validation System
 * Comprehensive validation for template repositories to ensure platform compatibility
 * Implements requirements 8.1, 8.2, and 8.4
 */

import { TemplateCompatibilityValidator } from './template-validator.js';
import { TemplateAnalysisService } from './template-analysis-service.js';
import { TemplateFeedbackSystem } from './template-feedback-system.js';
import { parseGitHubError } from './github-errors.js';

/**
 * Main Template Compatibility Validation System
 * Orchestrates validation, analysis, and feedback generation
 */
export class TemplateCompatibilityValidationSystem {
  constructor(repositoryService) {
    this.repositoryService = repositoryService;
    this.validator = new TemplateCompatibilityValidator(repositoryService);
    this.analysisService = new TemplateAnalysisService(repositoryService);
    this.feedbackSystem = new TemplateFeedbackSystem(this.validator);
    
    // Platform compatibility requirements
    this.platformRequirements = {
      // Required files for all templates
      requiredFiles: [
        '.nebula/config.json'
      ],
      
      // Recommended files for better user experience
      recommendedFiles: [
        '.nebula/preview.png',
        'README.md'
      ],
      
      // Supported template types
      supportedTemplateTypes: ['json', 'markdown', 'hybrid'],
      
      // Required configuration fields
      requiredConfigFields: [
        'version',
        'templateType', 
        'contentFiles'
      ],
      
      // Supported schema field types
      supportedSchemaTypes: [
        'string', 'text', 'markdown', 'number', 'boolean', 
        'select', 'array', 'object', 'image', 'date', 'url', 'email'
      ],
      
      // File naming conventions
      namingConventions: {
        configFile: '.nebula/config.json',
        previewImage: '.nebula/preview.png',
        readmeFile: 'README.md'
      }
    };
  }

  /**
   * Perform comprehensive template compatibility validation
   * @param {string} owner - Repository owner
   * @param {string} repo - Repository name
   * @param {string} [ref] - Git reference (branch/commit)
   * @param {object} [options] - Validation options
   * @returns {Promise<{success: boolean, result?: object, error?: string}>}
   */
  async validateTemplateCompatibility(owner, repo, ref = null, options = {}) {
    try {
      console.log(`Starting template compatibility validation for ${owner}/${repo}`);
      
      // Step 1: Validate template structure
      const structureValidation = await this.validateTemplateStructure(owner, repo, ref);
      if (!structureValidation.success) {
        return {
          success: false,
          error: `Template structure validation failed: ${structureValidation.error}`,
          details: structureValidation.details
        };
      }

      // Step 2: Validate required files
      const fileValidation = await this.validateRequiredFiles(owner, repo, ref);
      if (!fileValidation.success) {
        return {
          success: false,
          error: `Required files validation failed: ${fileValidation.error}`,
          details: fileValidation.details
        };
      }

      // Step 3: Validate configuration and schema
      const configValidation = await this.validateConfigurationAndSchema(owner, repo, ref);
      if (!configValidation.success) {
        return {
          success: false,
          error: `Configuration validation failed: ${configValidation.error}`,
          details: configValidation.details
        };
      }

      // Step 4: Validate content files
      const contentValidation = await this.validateContentFiles(owner, repo, configValidation.config, ref);
      
      // Step 5: Run comprehensive validation using existing validator
      const comprehensiveValidation = await this.validator.validateTemplate(owner, repo, ref);
      if (!comprehensiveValidation.success) {
        return {
          success: false,
          error: `Comprehensive validation failed: ${comprehensiveValidation.error}`
        };
      }

      // Step 6: Generate template analysis
      const analysisResult = await this.analysisService.analyzeTemplate(owner, repo, ref);
      
      // Step 7: Compile final validation result
      const finalResult = {
        valid: comprehensiveValidation.validation.valid,
        compatibility: {
          platformCompatible: this.assessPlatformCompatibility(comprehensiveValidation.validation),
          templateType: configValidation.config?.templateType,
          supportedFeatures: this.identifySupportedFeatures(configValidation.config),
          limitations: this.identifyLimitations(comprehensiveValidation.validation)
        },
        validation: comprehensiveValidation.validation,
        analysis: analysisResult.success ? analysisResult.analysis : null,
        structure: structureValidation.structure,
        files: fileValidation.files,
        configuration: configValidation,
        content: contentValidation,
        metadata: {
          owner,
          repo,
          ref: ref || 'default',
          validatedAt: new Date().toISOString(),
          validatorVersion: '1.0.0'
        }
      };

      // Step 8: Generate creator feedback if requested
      if (options.generateFeedback) {
        finalResult.feedback = this.feedbackSystem.generateFeedback(
          comprehensiveValidation.validation,
          { interactive: options.interactive || false }
        );
      }

      console.log(`Template compatibility validation completed for ${owner}/${repo}`);
      
      return {
        success: true,
        result: finalResult
      };

    } catch (error) {
      console.error('Template compatibility validation error:', error);
      
      return {
        success: false,
        error: `Template compatibility validation failed: ${error.message}`,
        details: {
          type: 'ValidationSystemError',
          retryable: true,
          timestamp: new Date().toISOString()
        }
      };
    }
  }

  /**
   * Validate template repository structure
   * @param {string} owner - Repository owner
   * @param {string} repo - Repository name
   * @param {string} [ref] - Git reference
   * @returns {Promise<{success: boolean, structure?: object, error?: string}>}
   */
  async validateTemplateStructure(owner, repo, ref = null) {
    try {
      // Get repository structure
      const structureResult = await this.repositoryService.getRepositoryStructure(owner, repo, '', ref);
      if (!structureResult.success) {
        return {
          success: false,
          error: `Failed to retrieve repository structure: ${structureResult.error}`
        };
      }

      const repositoryContents = structureResult.structure.items;
      
      // Analyze structure
      const structure = {
        totalFiles: repositoryContents.filter(item => item.type === 'file').length,
        totalDirectories: repositoryContents.filter(item => item.type === 'dir').length,
        hasNebulaDirectory: repositoryContents.some(item => item.path === '.nebula' && item.type === 'dir'),
        hasComponentsDirectory: repositoryContents.some(item => item.name === 'components' && item.type === 'dir'),
        hasPublicDirectory: repositoryContents.some(item => item.name === 'public' && item.type === 'dir'),
        hasPackageJson: repositoryContents.some(item => item.name === 'package.json'),
        fileTypes: this.analyzeFileTypes(repositoryContents),
        directoryStructure: this.analyzeDirectoryStructure(repositoryContents)
      };

      // Validate structure requirements
      const structureIssues = [];
      
      if (!structure.hasNebulaDirectory) {
        structureIssues.push({
          type: 'error',
          message: 'Missing required .nebula directory',
          requirement: 'Template must have a .nebula directory for configuration files'
        });
      }

      if (structure.totalFiles === 0) {
        structureIssues.push({
          type: 'error',
          message: 'Repository appears to be empty',
          requirement: 'Template must contain files'
        });
      }

      return {
        success: structureIssues.filter(issue => issue.type === 'error').length === 0,
        structure: {
          ...structure,
          issues: structureIssues,
          valid: structureIssues.filter(issue => issue.type === 'error').length === 0
        }
      };

    } catch (error) {
      return {
        success: false,
        error: `Structure validation failed: ${error.message}`
      };
    }
  }

  /**
   * Validate required files exist
   * @param {string} owner - Repository owner
   * @param {string} repo - Repository name
   * @param {string} [ref] - Git reference
   * @returns {Promise<{success: boolean, files?: object, error?: string}>}
   */
  async validateRequiredFiles(owner, repo, ref = null) {
    try {
      const fileChecks = {
        required: {},
        recommended: {},
        issues: []
      };

      // Check required files
      for (const filePath of this.platformRequirements.requiredFiles) {
        const exists = await this.checkFileExists(owner, repo, filePath, ref);
        fileChecks.required[filePath] = {
          exists,
          path: filePath,
          required: true
        };

        if (!exists) {
          fileChecks.issues.push({
            type: 'error',
            message: `Missing required file: ${filePath}`,
            suggestion: `Create ${filePath} with proper template configuration`,
            critical: true
          });
        }
      }

      // Check recommended files
      for (const filePath of this.platformRequirements.recommendedFiles) {
        const exists = await this.checkFileExists(owner, repo, filePath, ref);
        fileChecks.recommended[filePath] = {
          exists,
          path: filePath,
          required: false
        };

        if (!exists) {
          fileChecks.issues.push({
            type: 'warning',
            message: `Missing recommended file: ${filePath}`,
            suggestion: this.getFileSuggestion(filePath),
            critical: false
          });
        }
      }

      // Check for additional important files
      const additionalFiles = ['package.json', 'LICENSE', '.gitignore'];
      for (const filePath of additionalFiles) {
        const exists = await this.checkFileExists(owner, repo, filePath, ref);
        if (exists) {
          fileChecks.recommended[filePath] = {
            exists: true,
            path: filePath,
            required: false,
            bonus: true
          };
        }
      }

      const hasRequiredFiles = Object.values(fileChecks.required).every(file => file.exists);

      return {
        success: hasRequiredFiles,
        files: {
          ...fileChecks,
          valid: hasRequiredFiles,
          summary: {
            requiredCount: Object.keys(fileChecks.required).length,
            requiredPresent: Object.values(fileChecks.required).filter(f => f.exists).length,
            recommendedCount: Object.keys(fileChecks.recommended).length,
            recommendedPresent: Object.values(fileChecks.recommended).filter(f => f.exists).length
          }
        },
        error: hasRequiredFiles ? null : 'Missing required files'
      };

    } catch (error) {
      return {
        success: false,
        error: `File validation failed: ${error.message}`
      };
    }
  }

  /**
   * Validate configuration file and schema definitions
   * @param {string} owner - Repository owner
   * @param {string} repo - Repository name
   * @param {string} [ref] - Git reference
   * @returns {Promise<{success: boolean, config?: object, error?: string}>}
   */
  async validateConfigurationAndSchema(owner, repo, ref = null) {
    try {
      // Get configuration file
      const configResult = await this.repositoryService.getFileContent(
        owner, 
        repo, 
        this.platformRequirements.namingConventions.configFile, 
        ref
      );

      if (!configResult.success) {
        return {
          success: false,
          error: 'Cannot read template configuration file',
          details: {
            type: 'ConfigurationError',
            suggestion: 'Ensure .nebula/config.json exists and is accessible'
          }
        };
      }

      // Parse configuration
      let config;
      try {
        config = JSON.parse(configResult.content.content);
      } catch (parseError) {
        return {
          success: false,
          error: 'Invalid JSON in configuration file',
          details: {
            type: 'JSONParseError',
            parseError: parseError.message,
            suggestion: 'Fix JSON syntax errors in .nebula/config.json'
          }
        };
      }

      // Validate configuration structure
      const configValidation = this.validateConfigurationStructure(config);
      if (!configValidation.valid) {
        return {
          success: false,
          error: 'Invalid configuration structure',
          details: {
            type: 'ConfigurationValidationError',
            errors: configValidation.errors
          }
        };
      }

      // Validate schema definitions
      const schemaValidation = this.validateSchemaDefinitions(config);
      if (!schemaValidation.valid) {
        return {
          success: false,
          error: 'Invalid schema definitions',
          details: {
            type: 'SchemaValidationError',
            errors: schemaValidation.errors
          }
        };
      }

      return {
        success: true,
        config,
        validation: {
          configStructure: configValidation,
          schemaDefinitions: schemaValidation
        }
      };

    } catch (error) {
      return {
        success: false,
        error: `Configuration validation failed: ${error.message}`
      };
    }
  }

  /**
   * Validate configuration structure against platform requirements
   * @param {object} config - Parsed configuration object
   * @returns {object} Validation result
   */
  validateConfigurationStructure(config) {
    const errors = [];
    const warnings = [];

    // Check required fields
    for (const field of this.platformRequirements.requiredConfigFields) {
      if (!config[field]) {
        errors.push(`Missing required configuration field: ${field}`);
      }
    }

    // Validate template type
    if (config.templateType && !this.platformRequirements.supportedTemplateTypes.includes(config.templateType)) {
      errors.push(`Unsupported template type: ${config.templateType}. Supported types: ${this.platformRequirements.supportedTemplateTypes.join(', ')}`);
    }

    // Validate version format
    if (config.version && !/^\d+\.\d+(\.\d+)?$/.test(config.version)) {
      warnings.push('Version should follow semantic versioning format (e.g., "1.0.0")');
    }

    // Validate content files array
    if (config.contentFiles) {
      if (!Array.isArray(config.contentFiles)) {
        errors.push('contentFiles must be an array');
      } else if (config.contentFiles.length === 0) {
        errors.push('contentFiles array cannot be empty');
      }
    }

    // Validate optional fields
    if (config.name && typeof config.name !== 'string') {
      warnings.push('Template name should be a string');
    }

    if (config.description && typeof config.description !== 'string') {
      warnings.push('Template description should be a string');
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Validate schema definitions in content files
   * @param {object} config - Template configuration
   * @returns {object} Schema validation result
   */
  validateSchemaDefinitions(config) {
    const errors = [];
    const warnings = [];

    if (!config.contentFiles || !Array.isArray(config.contentFiles)) {
      return { valid: true, errors, warnings };
    }

    for (const [index, contentFile] of config.contentFiles.entries()) {
      const filePrefix = `contentFiles[${index}]`;

      // Validate content file structure
      if (!contentFile.path) {
        errors.push(`${filePrefix}: Missing required 'path' field`);
      }

      if (!contentFile.schema) {
        errors.push(`${filePrefix}: Missing required 'schema' field`);
        continue;
      }

      // Validate schema definition
      const schemaErrors = this.validateSchemaObject(contentFile.schema, `${filePrefix}.schema`);
      errors.push(...schemaErrors);

      // Validate file type if specified
      if (contentFile.type && !['json', 'markdown', 'yaml'].includes(contentFile.type)) {
        warnings.push(`${filePrefix}: Unsupported file type '${contentFile.type}'`);
      }
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Validate schema object recursively
   * @param {object} schema - Schema object to validate
   * @param {string} path - Current path for error reporting
   * @returns {Array} Array of validation errors
   */
  validateSchemaObject(schema, path = 'schema') {
    const errors = [];

    if (typeof schema !== 'object' || schema === null) {
      errors.push(`${path} must be an object`);
      return errors;
    }

    for (const [fieldName, fieldDef] of Object.entries(schema)) {
      const fieldPath = `${path}.${fieldName}`;

      if (typeof fieldDef !== 'object' || fieldDef === null) {
        errors.push(`${fieldPath} must be an object`);
        continue;
      }

      // Validate field type
      if (fieldDef.type && !this.platformRequirements.supportedSchemaTypes.includes(fieldDef.type)) {
        errors.push(`${fieldPath}: Unsupported field type '${fieldDef.type}'. Supported types: ${this.platformRequirements.supportedSchemaTypes.join(', ')}`);
      }

      // Validate required field
      if (fieldDef.required !== undefined && typeof fieldDef.required !== 'boolean') {
        errors.push(`${fieldPath}.required must be a boolean`);
      }

      // Validate validation constraints
      if (fieldDef.maxLength !== undefined && (typeof fieldDef.maxLength !== 'number' || fieldDef.maxLength < 0)) {
        errors.push(`${fieldPath}.maxLength must be a positive number`);
      }

      if (fieldDef.minLength !== undefined && (typeof fieldDef.minLength !== 'number' || fieldDef.minLength < 0)) {
        errors.push(`${fieldPath}.minLength must be a positive number`);
      }

      // Validate array items
      if (fieldDef.type === 'array' && fieldDef.items) {
        if (typeof fieldDef.items === 'object' && fieldDef.items.properties) {
          const itemErrors = this.validateSchemaObject(fieldDef.items.properties, `${fieldPath}.items`);
          errors.push(...itemErrors);
        }
      }

      // Validate object properties
      if (fieldDef.type === 'object' && fieldDef.properties) {
        const propErrors = this.validateSchemaObject(fieldDef.properties, `${fieldPath}.properties`);
        errors.push(...propErrors);
      }

      // Validate select options
      if (fieldDef.type === 'select' && fieldDef.options) {
        if (!Array.isArray(fieldDef.options)) {
          errors.push(`${fieldPath}.options must be an array`);
        }
      }
    }

    return errors;
  }

  /**
   * Validate content files specified in configuration
   * @param {string} owner - Repository owner
   * @param {string} repo - Repository name
   * @param {object} config - Template configuration
   * @param {string} [ref] - Git reference
   * @returns {Promise<{success: boolean, content?: object, error?: string}>}
   */
  async validateContentFiles(owner, repo, config, ref = null) {
    try {
      const contentValidation = {
        files: [],
        issues: [],
        valid: true
      };

      if (!config || !config.contentFiles) {
        return {
          success: true,
          content: contentValidation
        };
      }

      for (const contentFile of config.contentFiles) {
        const fileValidation = {
          path: contentFile.path,
          exists: false,
          valid: false,
          issues: []
        };

        // Check if file exists (skip wildcard paths for now)
        if (!contentFile.path.includes('*')) {
          const exists = await this.checkFileExists(owner, repo, contentFile.path, ref);
          fileValidation.exists = exists;

          if (!exists) {
            fileValidation.issues.push({
              type: 'warning',
              message: `Content file not found: ${contentFile.path}`,
              suggestion: `Create ${contentFile.path} or update the path in configuration`
            });
          } else {
            // Validate file content if it exists
            const contentResult = await this.validateFileContent(owner, repo, contentFile, ref);
            fileValidation.valid = contentResult.valid;
            fileValidation.issues.push(...contentResult.issues);
          }
        } else {
          // Handle wildcard paths
          fileValidation.exists = true; // Assume wildcard paths are valid
          fileValidation.valid = true;
        }

        contentValidation.files.push(fileValidation);
        contentValidation.issues.push(...fileValidation.issues);
      }

      // Overall content validation is successful if no critical errors
      contentValidation.valid = !contentValidation.issues.some(issue => issue.type === 'error');

      return {
        success: true,
        content: contentValidation
      };

    } catch (error) {
      return {
        success: false,
        error: `Content validation failed: ${error.message}`
      };
    }
  }

  /**
   * Validate individual file content
   * @param {string} owner - Repository owner
   * @param {string} repo - Repository name
   * @param {object} contentFile - Content file configuration
   * @param {string} [ref] - Git reference
   * @returns {Promise<{valid: boolean, issues: Array}>}
   */
  async validateFileContent(owner, repo, contentFile, ref = null) {
    const validation = {
      valid: true,
      issues: []
    };

    try {
      const fileResult = await this.repositoryService.getFileContent(owner, repo, contentFile.path, ref);
      
      if (!fileResult.success) {
        validation.valid = false;
        validation.issues.push({
          type: 'error',
          message: `Cannot read content file: ${contentFile.path}`,
          suggestion: 'Ensure the file exists and is accessible'
        });
        return validation;
      }

      const content = fileResult.content.content;

      // Validate based on file type
      switch (contentFile.type) {
        case 'json':
          try {
            JSON.parse(content);
          } catch (parseError) {
            validation.valid = false;
            validation.issues.push({
              type: 'error',
              message: `Invalid JSON in ${contentFile.path}`,
              suggestion: 'Fix JSON syntax errors',
              details: parseError.message
            });
          }
          break;

        case 'markdown':
          if (!content.trim()) {
            validation.issues.push({
              type: 'warning',
              message: `Empty markdown file: ${contentFile.path}`,
              suggestion: 'Add content to the markdown file'
            });
          }
          break;

        case 'yaml':
          // Basic YAML validation could be added here
          break;
      }

    } catch (error) {
      validation.valid = false;
      validation.issues.push({
        type: 'error',
        message: `Content validation failed for ${contentFile.path}: ${error.message}`,
        suggestion: 'Check file accessibility and format'
      });
    }

    return validation;
  }

  /**
   * Check if a file exists in the repository
   * @param {string} owner - Repository owner
   * @param {string} repo - Repository name
   * @param {string} path - File path
   * @param {string} [ref] - Git reference
   * @returns {Promise<boolean>} True if file exists
   */
  async checkFileExists(owner, repo, path, ref = null) {
    try {
      const result = await this.repositoryService.getFileContent(owner, repo, path, ref);
      return result.success;
    } catch (error) {
      return false;
    }
  }

  /**
   * Analyze file types in repository
   * @param {Array} repositoryContents - Repository contents
   * @returns {object} File type analysis
   */
  analyzeFileTypes(repositoryContents) {
    const fileTypes = {};
    
    for (const item of repositoryContents) {
      if (item.type === 'file') {
        const extension = item.name.split('.').pop()?.toLowerCase();
        if (extension) {
          fileTypes[extension] = (fileTypes[extension] || 0) + 1;
        }
      }
    }

    return fileTypes;
  }

  /**
   * Analyze directory structure
   * @param {Array} repositoryContents - Repository contents
   * @returns {object} Directory structure analysis
   */
  analyzeDirectoryStructure(repositoryContents) {
    const directories = repositoryContents
      .filter(item => item.type === 'dir')
      .map(item => item.name);

    return {
      directories,
      hasStandardStructure: directories.includes('components') && directories.includes('public'),
      hasNebulaConfig: directories.includes('.nebula')
    };
  }

  /**
   * Get file suggestion based on file path
   * @param {string} filePath - File path
   * @returns {string} Suggestion message
   */
  getFileSuggestion(filePath) {
    switch (filePath) {
      case '.nebula/preview.png':
        return 'Add a preview image (800x600px recommended) to showcase your template';
      case 'README.md':
        return 'Create a README with template documentation and usage instructions';
      default:
        return `Create ${filePath} to improve template quality`;
    }
  }

  /**
   * Assess overall platform compatibility
   * @param {object} validation - Validation result
   * @returns {boolean} True if platform compatible
   */
  assessPlatformCompatibility(validation) {
    // Template is platform compatible if:
    // 1. It passes validation (no critical errors)
    // 2. Has required configuration structure
    // 3. Uses supported schema types
    return validation.valid && validation.score >= 70;
  }

  /**
   * Identify supported features based on configuration
   * @param {object} config - Template configuration
   * @returns {Array} Array of supported features
   */
  identifySupportedFeatures(config) {
    const features = [];

    if (config?.templateType) {
      features.push(`${config.templateType} template type`);
    }

    if (config?.contentFiles?.length > 0) {
      features.push(`${config.contentFiles.length} content file${config.contentFiles.length > 1 ? 's' : ''}`);
    }

    if (config?.assets) {
      features.push('Asset management');
    }

    if (config?.previewComponent) {
      features.push('Custom preview component');
    }

    return features;
  }

  /**
   * Identify template limitations
   * @param {object} validation - Validation result
   * @returns {Array} Array of limitations
   */
  identifyLimitations(validation) {
    const limitations = [];

    if (validation.errors.length > 0) {
      limitations.push(`${validation.errors.length} critical error${validation.errors.length > 1 ? 's' : ''}`);
    }

    if (validation.warnings.length > 3) {
      limitations.push('Multiple warning-level issues');
    }

    if (validation.score < 80) {
      limitations.push('Below recommended quality threshold');
    }

    return limitations;
  }

  /**
   * Generate template creator feedback
   * @param {string} owner - Repository owner
   * @param {string} repo - Repository name
   * @param {string} [ref] - Git reference
   * @param {object} [options] - Feedback options
   * @returns {Promise<{success: boolean, feedback?: object, error?: string}>}
   */
  async generateCreatorFeedback(owner, repo, ref = null, options = {}) {
    try {
      // Run validation with feedback generation
      const validationResult = await this.validateTemplateCompatibility(owner, repo, ref, {
        generateFeedback: true,
        interactive: options.interactive || false
      });

      if (!validationResult.success) {
        return {
          success: false,
          error: validationResult.error
        };
      }

      return {
        success: true,
        feedback: validationResult.result.feedback
      };

    } catch (error) {
      return {
        success: false,
        error: `Feedback generation failed: ${error.message}`
      };
    }
  }
}

export default TemplateCompatibilityValidationSystem;