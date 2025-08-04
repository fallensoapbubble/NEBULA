import { parseGitHubError, getUserFriendlyMessage } from './github-errors.js';

/**
 * Template Analysis Service
 * Handles template configuration parsing, validation, and schema generation
 * for the decentralized portfolio platform
 */
export class TemplateAnalysisService {
  constructor(repositoryService) {
    this.repositoryService = repositoryService;
    
    // Supported schema types and their validation rules
    this.supportedSchemaTypes = {
      'string': { 
        component: 'TextInput', 
        validation: ['required', 'maxLength', 'minLength', 'pattern'] 
      },
      'text': { 
        component: 'TextArea', 
        validation: ['required', 'maxLength', 'minLength'] 
      },
      'markdown': { 
        component: 'MarkdownEditor', 
        validation: ['required'] 
      },
      'number': { 
        component: 'NumberInput', 
        validation: ['required', 'min', 'max'] 
      },
      'boolean': { 
        component: 'Checkbox', 
        validation: [] 
      },
      'select': { 
        component: 'Select', 
        validation: ['required', 'options'] 
      },
      'array': { 
        component: 'ArrayEditor', 
        validation: ['minItems', 'maxItems'] 
      },
      'object': { 
        component: 'ObjectEditor', 
        validation: ['required'] 
      },
      'image': { 
        component: 'ImageUpload', 
        validation: ['required', 'fileSize', 'fileType'] 
      },
      'date': { 
        component: 'DateInput', 
        validation: ['required'] 
      },
      'url': { 
        component: 'URLInput', 
        validation: ['required', 'pattern'] 
      },
      'email': { 
        component: 'EmailInput', 
        validation: ['required', 'pattern'] 
      }
    };

    // Template type configurations
    this.templateTypes = {
      'json': {
        description: 'JSON-based template with structured data files',
        requiredFiles: ['.nebula/config.json'],
        optionalFiles: ['data.json', 'content.json'],
        supportedExtensions: ['.json']
      },
      'markdown': {
        description: 'Markdown-based template with content files',
        requiredFiles: ['.nebula/config.json'],
        optionalFiles: ['content/*.md', '*.md'],
        supportedExtensions: ['.md', '.markdown']
      },
      'hybrid': {
        description: 'Mixed template with both JSON and Markdown content',
        requiredFiles: ['.nebula/config.json'],
        optionalFiles: ['data.json', 'content/*.md', '*.md'],
        supportedExtensions: ['.json', '.md', '.markdown']
      }
    };
  }

  /**
   * Analyze repository structure and parse template configuration
   * @param {string} owner - Repository owner
   * @param {string} repo - Repository name
   * @param {string} [ref] - Git reference (branch/commit)
   * @returns {Promise<{success: boolean, analysis?: object, error?: string}>}
   */
  async analyzeTemplate(owner, repo, ref = null) {
    try {
      // Get repository structure
      const structureResult = await this.repositoryService.getRepositoryStructure(owner, repo, '', ref);
      if (!structureResult.success) {
        return {
          success: false,
          error: `Failed to get repository structure: ${structureResult.error}`
        };
      }

      const repositoryContents = structureResult.structure.items;

      // Look for .nebula/config.json
      const configFile = await this.findConfigFile(owner, repo, ref);
      if (!configFile.success) {
        return {
          success: false,
          error: configFile.error,
          details: {
            type: 'MissingConfigError',
            suggestion: 'Template must include a .nebula/config.json file with editing schema'
          }
        };
      }

      // Parse and validate configuration
      const configResult = await this.parseTemplateConfig(configFile.config);
      if (!configResult.success) {
        return {
          success: false,
          error: configResult.error,
          details: configResult.details
        };
      }

      const config = configResult.config;

      // Identify content files based on configuration
      const contentFilesResult = await this.identifyContentFiles(owner, repo, config, ref);
      if (!contentFilesResult.success) {
        return {
          success: false,
          error: contentFilesResult.error
        };
      }

      // Generate editing schema
      const schemaResult = await this.generateEditingSchema(config.contentFiles);
      if (!schemaResult.success) {
        return {
          success: false,
          error: schemaResult.error
        };
      }

      // Validate template structure
      const validationResult = await this.validateTemplateStructure(owner, repo, config, repositoryContents, ref);

      return {
        success: true,
        analysis: {
          templateType: config.templateType,
          templateName: config.name || `${owner}/${repo}`,
          description: config.description || '',
          version: config.version,
          contentFiles: contentFilesResult.contentFiles,
          editingSchema: schemaResult.schema,
          assets: config.assets || {},
          previewComponent: config.previewComponent,
          editableFields: config.editableFields || [],
          validation: validationResult,
          metadata: {
            owner,
            repo,
            ref: ref || 'default',
            analyzedAt: new Date().toISOString(),
            configPath: '.nebula/config.json'
          }
        }
      };

    } catch (error) {
      console.error('Template analysis error:', error);
      
      return {
        success: false,
        error: `Template analysis failed: ${error.message}`,
        details: {
          type: 'AnalysisError',
          retryable: true
        }
      };
    }
  }

  /**
   * Find and retrieve template configuration file
   * @param {string} owner - Repository owner
   * @param {string} repo - Repository name
   * @param {string} [ref] - Git reference
   * @returns {Promise<{success: boolean, config?: object, error?: string}>}
   */
  async findConfigFile(owner, repo, ref = null) {
    try {
      // Try to get .nebula/config.json
      const configResult = await this.repositoryService.getFileContent(owner, repo, '.nebula/config.json', ref);
      
      if (!configResult.success) {
        // Check if .nebula directory exists
        const nebulaResult = await this.repositoryService.getRepositoryStructure(owner, repo, '.nebula', ref);
        
        if (!nebulaResult.success) {
          return {
            success: false,
            error: 'Template missing required .nebula directory and config.json file'
          };
        }

        return {
          success: false,
          error: 'Template missing required .nebula/config.json file'
        };
      }

      return {
        success: true,
        config: configResult.content.content
      };

    } catch (error) {
      return {
        success: false,
        error: `Failed to find config file: ${error.message}`
      };
    }
  }

  /**
   * Parse and validate template configuration JSON
   * @param {string} configContent - Raw config file content
   * @returns {Promise<{success: boolean, config?: object, error?: string, details?: object}>}
   */
  async parseTemplateConfig(configContent) {
    try {
      // Parse JSON
      let config;
      try {
        config = JSON.parse(configContent);
      } catch (parseError) {
        return {
          success: false,
          error: 'Invalid JSON in .nebula/config.json',
          details: {
            type: 'JSONParseError',
            parseError: parseError.message
          }
        };
      }

      // Validate configuration schema
      const validationResult = this.validateConfigSchema(config);
      if (!validationResult.valid) {
        return {
          success: false,
          error: 'Invalid template configuration',
          details: {
            type: 'ConfigValidationError',
            errors: validationResult.errors
          }
        };
      }

      return {
        success: true,
        config
      };

    } catch (error) {
      return {
        success: false,
        error: `Failed to parse template config: ${error.message}`,
        details: {
          type: 'ConfigParseError'
        }
      };
    }
  }

  /**
   * Validate template configuration schema
   * @param {object} config - Parsed configuration object
   * @returns {object} Validation result with errors if any
   */
  validateConfigSchema(config) {
    const errors = [];

    // Required fields
    const requiredFields = ['version', 'templateType', 'contentFiles'];
    for (const field of requiredFields) {
      if (!config[field]) {
        errors.push(`Missing required field: ${field}`);
      }
    }

    // Validate version
    if (config.version && typeof config.version !== 'string') {
      errors.push('Version must be a string');
    }

    // Validate template type
    if (config.templateType && !this.templateTypes[config.templateType]) {
      errors.push(`Unsupported template type: ${config.templateType}. Supported types: ${Object.keys(this.templateTypes).join(', ')}`);
    }

    // Validate content files
    if (config.contentFiles) {
      if (!Array.isArray(config.contentFiles)) {
        errors.push('contentFiles must be an array');
      } else {
        for (const [index, contentFile] of config.contentFiles.entries()) {
          if (!contentFile.path) {
            errors.push(`Content file ${index} missing required 'path' field`);
          }
          if (!contentFile.schema) {
            errors.push(`Content file ${index} missing required 'schema' field`);
          }
          if (contentFile.type && !['json', 'markdown', 'yaml'].includes(contentFile.type)) {
            errors.push(`Content file ${index} has unsupported type: ${contentFile.type}`);
          }

          // Validate schema structure
          if (contentFile.schema) {
            const schemaErrors = this.validateSchemaDefinition(contentFile.schema, `contentFiles[${index}].schema`);
            errors.push(...schemaErrors);
          }
        }
      }
    }

    // Validate assets configuration
    if (config.assets) {
      if (config.assets.allowedTypes && !Array.isArray(config.assets.allowedTypes)) {
        errors.push('assets.allowedTypes must be an array');
      }
      if (config.assets.maxSize && typeof config.assets.maxSize !== 'string') {
        errors.push('assets.maxSize must be a string (e.g., "5MB")');
      }
      if (config.assets.paths && !Array.isArray(config.assets.paths)) {
        errors.push('assets.paths must be an array');
      }
    }

    // Validate editable fields
    if (config.editableFields && !Array.isArray(config.editableFields)) {
      errors.push('editableFields must be an array');
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Validate schema definition recursively
   * @param {object} schema - Schema object to validate
   * @param {string} path - Current path for error reporting
   * @returns {Array} Array of validation errors
   */
  validateSchemaDefinition(schema, path = 'schema') {
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
      if (fieldDef.type && !this.supportedSchemaTypes[fieldDef.type]) {
        errors.push(`${fieldPath} has unsupported type: ${fieldDef.type}. Supported types: ${Object.keys(this.supportedSchemaTypes).join(', ')}`);
      }

      // Validate label
      if (fieldDef.label && typeof fieldDef.label !== 'string') {
        errors.push(`${fieldPath}.label must be a string`);
      }

      // Validate required
      if (fieldDef.required !== undefined && typeof fieldDef.required !== 'boolean') {
        errors.push(`${fieldPath}.required must be a boolean`);
      }

      // Validate validation rules
      if (fieldDef.maxLength !== undefined && (typeof fieldDef.maxLength !== 'number' || fieldDef.maxLength < 0)) {
        errors.push(`${fieldPath}.maxLength must be a positive number`);
      }

      if (fieldDef.minLength !== undefined && (typeof fieldDef.minLength !== 'number' || fieldDef.minLength < 0)) {
        errors.push(`${fieldPath}.minLength must be a positive number`);
      }

      if (fieldDef.min !== undefined && typeof fieldDef.min !== 'number') {
        errors.push(`${fieldPath}.min must be a number`);
      }

      if (fieldDef.max !== undefined && typeof fieldDef.max !== 'number') {
        errors.push(`${fieldPath}.max must be a number`);
      }

      // Validate array items
      if (fieldDef.type === 'array' && fieldDef.items) {
        if (typeof fieldDef.items === 'object' && fieldDef.items.type) {
          // Single item type
          if (!this.supportedSchemaTypes[fieldDef.items.type]) {
            errors.push(`${fieldPath}.items has unsupported type: ${fieldDef.items.type}`);
          }
        } else if (typeof fieldDef.items === 'object') {
          // Object schema for array items
          const itemErrors = this.validateSchemaDefinition(fieldDef.items, `${fieldPath}.items`);
          errors.push(...itemErrors);
        }
      }

      // Validate object properties
      if (fieldDef.type === 'object' && fieldDef.properties) {
        const propErrors = this.validateSchemaDefinition(fieldDef.properties, `${fieldPath}.properties`);
        errors.push(...propErrors);
      }

      // Validate select options
      if (fieldDef.type === 'select' && fieldDef.options) {
        if (!Array.isArray(fieldDef.options)) {
          errors.push(`${fieldPath}.options must be an array`);
        } else {
          for (const [optIndex, option] of fieldDef.options.entries()) {
            if (typeof option !== 'object' || !option.value || !option.label) {
              errors.push(`${fieldPath}.options[${optIndex}] must have 'value' and 'label' properties`);
            }
          }
        }
      }
    }

    return errors;
  }

  /**
   * Identify content files based on configuration
   * @param {string} owner - Repository owner
   * @param {string} repo - Repository name
   * @param {object} config - Template configuration
   * @param {string} [ref] - Git reference
   * @returns {Promise<{success: boolean, contentFiles?: Array, error?: string}>}
   */
  async identifyContentFiles(owner, repo, config, ref = null) {
    try {
      const contentFiles = [];

      for (const contentFileConfig of config.contentFiles) {
        const { path, type, schema } = contentFileConfig;

        // Handle wildcard paths (e.g., "content/posts/*.md")
        if (path.includes('*')) {
          const wildcardFiles = await this.resolveWildcardPath(owner, repo, path, ref);
          for (const wildcardFile of wildcardFiles) {
            contentFiles.push({
              path: wildcardFile.path,
              type: type || this.detectFileType(wildcardFile.path),
              schema,
              editable: true,
              wildcard: true,
              pattern: path
            });
          }
        } else {
          // Single file path
          const fileExists = await this.checkFileExists(owner, repo, path, ref);
          
          contentFiles.push({
            path,
            type: type || this.detectFileType(path),
            schema,
            editable: true,
            exists: fileExists,
            wildcard: false
          });
        }
      }

      return {
        success: true,
        contentFiles
      };

    } catch (error) {
      return {
        success: false,
        error: `Failed to identify content files: ${error.message}`
      };
    }
  }

  /**
   * Resolve wildcard paths to actual files
   * @param {string} owner - Repository owner
   * @param {string} repo - Repository name
   * @param {string} wildcardPath - Path with wildcards
   * @param {string} [ref] - Git reference
   * @returns {Promise<Array>} Array of matching files
   */
  async resolveWildcardPath(owner, repo, wildcardPath, ref = null) {
    try {
      const files = [];
      
      // Parse wildcard path
      const pathParts = wildcardPath.split('/');
      const wildcardIndex = pathParts.findIndex(part => part.includes('*'));
      
      if (wildcardIndex === -1) {
        return files;
      }

      // Get directory path before wildcard
      const dirPath = pathParts.slice(0, wildcardIndex).join('/');
      const wildcardPattern = pathParts[wildcardIndex];
      
      // Get directory contents
      const structureResult = await this.repositoryService.getRepositoryStructure(owner, repo, dirPath, ref);
      
      if (structureResult.success) {
        for (const item of structureResult.structure.items) {
          if (item.type === 'file' && this.matchesWildcard(item.name, wildcardPattern)) {
            files.push({
              path: item.path,
              name: item.name,
              size: item.size,
              sha: item.sha
            });
          }
        }
      }

      return files;

    } catch (error) {
      console.error('Error resolving wildcard path:', error);
      return [];
    }
  }

  /**
   * Check if filename matches wildcard pattern
   * @param {string} filename - File name to check
   * @param {string} pattern - Wildcard pattern
   * @returns {boolean} True if matches
   */
  matchesWildcard(filename, pattern) {
    // Convert wildcard pattern to regex
    const regexPattern = pattern
      .replace(/\./g, '\\.')
      .replace(/\*/g, '.*');
    
    const regex = new RegExp(`^${regexPattern}$`);
    return regex.test(filename);
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
   * Detect file type based on extension
   * @param {string} path - File path
   * @returns {string} Detected file type
   */
  detectFileType(path) {
    const extension = path.toLowerCase().split('.').pop();
    
    switch (extension) {
      case 'json':
        return 'json';
      case 'md':
      case 'markdown':
        return 'markdown';
      case 'yaml':
      case 'yml':
        return 'yaml';
      case 'jpg':
      case 'jpeg':
      case 'png':
      case 'gif':
      case 'webp':
        return 'image';
      default:
        return 'text';
    }
  }

  /**
   * Generate editing schema from content file configurations
   * @param {Array} contentFiles - Array of content file configurations
   * @returns {Promise<{success: boolean, schema?: Array, error?: string}>}
   */
  async generateEditingSchema(contentFiles) {
    try {
      const schema = [];

      for (const contentFile of contentFiles) {
        const fileSchema = {
          file: contentFile.path,
          type: contentFile.type,
          fields: this.schemaToFormFields(contentFile.schema),
          metadata: {
            editable: true,
            required: contentFile.required || false
          }
        };

        schema.push(fileSchema);
      }

      return {
        success: true,
        schema
      };

    } catch (error) {
      return {
        success: false,
        error: `Failed to generate editing schema: ${error.message}`
      };
    }
  }

  /**
   * Convert schema definition to form fields
   * @param {object} schema - Schema object
   * @param {string} [parentPath=''] - Parent path for nested fields
   * @returns {Array} Array of form field definitions
   */
  schemaToFormFields(schema, parentPath = '') {
    const fields = [];

    for (const [key, definition] of Object.entries(schema)) {
      const fieldPath = parentPath ? `${parentPath}.${key}` : key;
      
      const field = {
        name: key,
        path: fieldPath,
        type: definition.type || 'string',
        label: definition.label || this.humanizeFieldName(key),
        required: definition.required || false,
        validation: this.buildValidationRules(definition),
        component: this.supportedSchemaTypes[definition.type]?.component || 'TextInput'
      };

      // Handle array types
      if (definition.type === 'array') {
        field.items = definition.items ? {
          type: definition.items.type || 'string',
          fields: typeof definition.items === 'object' && definition.items.properties 
            ? this.schemaToFormFields(definition.items.properties, `${fieldPath}[]`)
            : null
        } : null;
      }

      // Handle object types
      if (definition.type === 'object' && definition.properties) {
        field.properties = this.schemaToFormFields(definition.properties, fieldPath);
      }

      // Handle select options
      if (definition.type === 'select' && definition.options) {
        field.options = definition.options;
      }

      // Add field description if available
      if (definition.description) {
        field.description = definition.description;
      }

      // Add placeholder if available
      if (definition.placeholder) {
        field.placeholder = definition.placeholder;
      }

      fields.push(field);
    }

    return fields;
  }

  /**
   * Build validation rules from schema definition
   * @param {object} definition - Field definition
   * @returns {object} Validation rules object
   */
  buildValidationRules(definition) {
    const validation = {};

    if (definition.required) {
      validation.required = true;
    }

    if (definition.maxLength !== undefined) {
      validation.maxLength = definition.maxLength;
    }

    if (definition.minLength !== undefined) {
      validation.minLength = definition.minLength;
    }

    if (definition.min !== undefined) {
      validation.min = definition.min;
    }

    if (definition.max !== undefined) {
      validation.max = definition.max;
    }

    if (definition.pattern) {
      validation.pattern = definition.pattern;
    }

    if (definition.type === 'array') {
      if (definition.minItems !== undefined) {
        validation.minItems = definition.minItems;
      }
      if (definition.maxItems !== undefined) {
        validation.maxItems = definition.maxItems;
      }
    }

    if (definition.type === 'image') {
      if (definition.maxFileSize) {
        validation.maxFileSize = definition.maxFileSize;
      }
      if (definition.allowedTypes) {
        validation.allowedTypes = definition.allowedTypes;
      }
    }

    return validation;
  }

  /**
   * Convert camelCase or snake_case field names to human-readable labels
   * @param {string} fieldName - Field name to humanize
   * @returns {string} Human-readable label
   */
  humanizeFieldName(fieldName) {
    return fieldName
      .replace(/([A-Z])/g, ' $1') // Add space before capital letters
      .replace(/_/g, ' ') // Replace underscores with spaces
      .replace(/^./, str => str.toUpperCase()) // Capitalize first letter
      .trim();
  }

  /**
   * Validate template structure against requirements
   * @param {string} owner - Repository owner
   * @param {string} repo - Repository name
   * @param {object} config - Template configuration
   * @param {Array} repositoryContents - Repository file structure
   * @param {string} [ref] - Git reference
   * @returns {Promise<object>} Validation result
   */
  async validateTemplateStructure(owner, repo, config, repositoryContents, ref = null) {
    const validation = {
      valid: true,
      errors: [],
      warnings: [],
      suggestions: []
    };

    try {
      // Check required files for template type
      const templateTypeConfig = this.templateTypes[config.templateType];
      if (templateTypeConfig) {
        for (const requiredFile of templateTypeConfig.requiredFiles) {
          const fileExists = repositoryContents.some(item => item.path === requiredFile);
          if (!fileExists) {
            validation.errors.push(`Missing required file: ${requiredFile}`);
            validation.valid = false;
          }
        }
      }

      // Check for preview image
      const previewExists = repositoryContents.some(item => item.path === '.nebula/preview.png');
      if (!previewExists) {
        validation.warnings.push('Missing template preview image (.nebula/preview.png)');
        validation.suggestions.push('Add a preview.png file to .nebula/ directory to show template preview in gallery');
      }

      // Validate content files exist
      for (const contentFile of config.contentFiles) {
        if (!contentFile.path.includes('*')) {
          // Non-wildcard path - check if file exists
          const fileExists = await this.checkFileExists(owner, repo, contentFile.path, ref);
          if (!fileExists) {
            validation.warnings.push(`Content file not found: ${contentFile.path}`);
            validation.suggestions.push(`Create ${contentFile.path} or update the path in .nebula/config.json`);
          }
        }
      }

      // Check for README
      const readmeExists = repositoryContents.some(item => 
        item.name.toLowerCase() === 'readme.md' || item.name.toLowerCase() === 'readme.txt'
      );
      if (!readmeExists) {
        validation.warnings.push('Missing README file');
        validation.suggestions.push('Add a README.md file with template documentation and usage instructions');
      }

      // Validate asset paths
      if (config.assets && config.assets.paths) {
        for (const assetPath of config.assets.paths) {
          const pathExists = repositoryContents.some(item => 
            item.type === 'dir' && item.path === assetPath
          );
          if (!pathExists) {
            validation.warnings.push(`Asset directory not found: ${assetPath}`);
            validation.suggestions.push(`Create directory ${assetPath} or update asset paths in config`);
          }
        }
      }

      // Check for package.json if template has dependencies
      const packageJsonExists = repositoryContents.some(item => item.name === 'package.json');
      if (!packageJsonExists) {
        validation.suggestions.push('Consider adding package.json if template has JavaScript dependencies');
      }

    } catch (error) {
      validation.errors.push(`Validation error: ${error.message}`);
      validation.valid = false;
    }

    return validation;
  }

  /**
   * Get template type detection based on repository structure
   * @param {Array} repositoryContents - Repository file structure
   * @returns {string} Detected template type
   */
  detectTemplateType(repositoryContents) {
    const hasJsonFiles = repositoryContents.some(item => 
      item.type === 'file' && item.name.endsWith('.json')
    );
    
    const hasMarkdownFiles = repositoryContents.some(item => 
      item.type === 'file' && (item.name.endsWith('.md') || item.name.endsWith('.markdown'))
    );

    if (hasJsonFiles && hasMarkdownFiles) {
      return 'hybrid';
    } else if (hasMarkdownFiles) {
      return 'markdown';
    } else if (hasJsonFiles) {
      return 'json';
    }

    return 'json'; // Default fallback
  }

  /**
   * Generate template configuration template
   * @param {string} templateType - Type of template to generate config for
   * @param {object} options - Additional options
   * @returns {object} Template configuration object
   */
  generateConfigTemplate(templateType = 'json', options = {}) {
    const baseConfig = {
      version: '1.0',
      name: options.name || 'My Portfolio Template',
      description: options.description || 'A custom portfolio template',
      templateType,
      previewComponent: options.previewComponent || 'PortfolioTemplate',
      assets: {
        allowedTypes: ['image/jpeg', 'image/png', 'image/webp'],
        maxSize: '5MB',
        paths: ['public/images', 'assets']
      }
    };

    switch (templateType) {
      case 'json':
        baseConfig.contentFiles = [
          {
            path: 'data.json',
            type: 'json',
            schema: {
              title: { type: 'string', label: 'Portfolio Title', required: true },
              description: { type: 'text', label: 'Description', maxLength: 500 },
              author: { type: 'string', label: 'Author Name', required: true }
            }
          }
        ];
        break;

      case 'markdown':
        baseConfig.contentFiles = [
          {
            path: 'content/about.md',
            type: 'markdown',
            schema: {
              frontmatter: {
                title: { type: 'string', label: 'Page Title', required: true },
                date: { type: 'date', label: 'Date' }
              },
              content: { type: 'markdown', label: 'Content' }
            }
          }
        ];
        break;

      case 'hybrid':
        baseConfig.contentFiles = [
          {
            path: 'config.json',
            type: 'json',
            schema: {
              siteTitle: { type: 'string', label: 'Site Title', required: true },
              description: { type: 'text', label: 'Site Description' }
            }
          },
          {
            path: 'content/*.md',
            type: 'markdown',
            schema: {
              frontmatter: {
                title: { type: 'string', label: 'Title', required: true },
                date: { type: 'date', label: 'Date' }
              },
              content: { type: 'markdown', label: 'Content' }
            }
          }
        ];
        break;
    }

    return baseConfig;
  }
}

/**
 * Template Validator
 * Standalone validator for template repositories
 */
export class TemplateValidator {
  /**
   * Validate template repository structure
   * @param {Array} repositoryContents - Repository file structure
   * @returns {object} Validation result
   */
  static validateTemplate(repositoryContents) {
    const errors = [];
    const warnings = [];

    // Check required files
    const requiredFiles = ['.nebula/config.json'];
    for (const file of requiredFiles) {
      if (!repositoryContents.find(f => f.path === file)) {
        errors.push(`Missing required file: ${file}`);
      }
    }

    // Check recommended files
    const recommendedFiles = ['.nebula/preview.png', 'README.md'];
    for (const file of recommendedFiles) {
      if (!repositoryContents.find(f => f.path === file)) {
        warnings.push(`Missing recommended file: ${file}`);
      }
    }

    // Validate config.json structure if present
    const configFile = repositoryContents.find(f => f.path === '.nebula/config.json');
    if (configFile && configFile.content) {
      try {
        const config = JSON.parse(configFile.content);
        const configErrors = this.validateConfigSchema(config);
        errors.push(...configErrors);
      } catch (e) {
        errors.push('Invalid JSON in .nebula/config.json');
      }
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Validate configuration schema
   * @param {object} config - Configuration object
   * @returns {Array} Array of validation errors
   */
  static validateConfigSchema(config) {
    const errors = [];

    // Required fields
    const required = ['version', 'templateType', 'contentFiles'];
    for (const field of required) {
      if (!config[field]) {
        errors.push(`Missing required config field: ${field}`);
      }
    }

    // Validate template type
    const validTypes = ['json', 'markdown', 'hybrid'];
    if (config.templateType && !validTypes.includes(config.templateType)) {
      errors.push(`Invalid template type: ${config.templateType}. Must be one of: ${validTypes.join(', ')}`);
    }

    // Validate content files
    if (config.contentFiles) {
      if (!Array.isArray(config.contentFiles)) {
        errors.push('contentFiles must be an array');
      } else {
        for (const [index, file] of config.contentFiles.entries()) {
          if (!file.path || !file.schema) {
            errors.push(`Content file ${index} missing path or schema`);
          }
        }
      }
    }

    return errors;
  }
}

export default TemplateAnalysisService;