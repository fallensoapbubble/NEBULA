/**
 * Template Compatibility Validator
 * Validates template repositories for compatibility with the platform
 */
export class TemplateCompatibilityValidator {
  constructor(repositoryService) {
    this.repositoryService = repositoryService;
    
    // Required files for different template types
    this.templateRequirements = {
      'json': {
        requiredFiles: ['.nebula/config.json'],
        recommendedFiles: ['.nebula/preview.png', 'README.md', 'data.json'],
        requiredDirectories: [],
        supportedExtensions: ['.json'],
        description: 'JSON-based template with structured data files'
      },
      'markdown': {
        requiredFiles: ['.nebula/config.json'],
        recommendedFiles: ['.nebula/preview.png', 'README.md'],
        requiredDirectories: [],
        supportedExtensions: ['.md', '.markdown'],
        description: 'Markdown-based template with content files'
      },
      'hybrid': {
        requiredFiles: ['.nebula/config.json'],
        recommendedFiles: ['.nebula/preview.png', 'README.md'],
        requiredDirectories: [],
        supportedExtensions: ['.json', '.md', '.markdown'],
        description: 'Mixed template with both JSON and Markdown content'
      }
    };

    // Validation rules for different aspects
    this.validationRules = {
      structure: [
        'hasRequiredFiles',
        'hasValidConfig',
        'hasPreviewImage',
        'hasReadme',
        'hasValidDirectoryStructure'
      ],
      config: [
        'hasRequiredConfigFields',
        'hasValidTemplateType',
        'hasValidContentFiles',
        'hasValidSchema',
        'hasValidAssetConfig'
      ],
      content: [
        'contentFilesExist',
        'contentFilesValid',
        'assetsDirectoryExists',
        'hasValidPackageJson'
      ],
      compatibility: [
        'supportsEditableFields',
        'hasValidPreviewComponent',
        'followsNamingConventions',
        'hasValidDependencies'
      ]
    };

    // Common validation patterns
    this.patterns = {
      validFileName: /^[a-zA-Z0-9._-]+$/,
      validDirectoryName: /^[a-zA-Z0-9._-]+$/,
      validFieldName: /^[a-zA-Z][a-zA-Z0-9_]*$/,
      validComponentName: /^[A-Z][a-zA-Z0-9]*$/,
      semverVersion: /^\d+\.\d+\.\d+$/
    };
  }

  /**
   * Validate template repository for platform compatibility
   * @param {string} owner - Repository owner
   * @param {string} repo - Repository name
   * @param {string} [ref] - Git reference
   * @returns {Promise<{success: boolean, validation?: object, error?: string}>}
   */
  async validateTemplate(owner, repo, ref = null) {
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

      // Initialize validation result
      const validation = {
        valid: true,
        score: 0,
        maxScore: 100,
        errors: [],
        warnings: [],
        suggestions: [],
        details: {
          structure: { valid: true, issues: [] },
          config: { valid: true, issues: [] },
          content: { valid: true, issues: [] },
          compatibility: { valid: true, issues: [] }
        },
        metadata: {
          owner,
          repo,
          ref: ref || 'default',
          validatedAt: new Date().toISOString(),
          templateType: null,
          estimatedComplexity: 'unknown'
        }
      };

      // Validate structure
      const structureValidation = await this.validateStructure(repositoryContents, owner, repo, ref);
      this.mergeValidationResults(validation, structureValidation, 'structure', 30);

      // If structure validation fails critically, stop here
      if (!structureValidation.hasRequiredFiles) {
        validation.valid = false;
        validation.errors.push('Template missing required files - cannot proceed with further validation');
        return { success: true, validation };
      }

      // Validate configuration
      const configValidation = await this.validateConfiguration(owner, repo, ref);
      this.mergeValidationResults(validation, configValidation, 'config', 25);

      // Get template type from config for further validation
      if (configValidation.templateType) {
        validation.metadata.templateType = configValidation.templateType;
      }

      // Validate content
      const contentValidation = await this.validateContent(owner, repo, configValidation.config, ref);
      this.mergeValidationResults(validation, contentValidation, 'content', 25);

      // Validate compatibility
      const compatibilityValidation = await this.validateCompatibility(repositoryContents, configValidation.config);
      this.mergeValidationResults(validation, compatibilityValidation, 'compatibility', 20);

      // Calculate final score and determine overall validity
      validation.score = Math.max(0, validation.score);
      validation.valid = validation.score >= 70 && validation.errors.length === 0;

      // Estimate template complexity
      validation.metadata.estimatedComplexity = this.estimateTemplateComplexity(configValidation.config, repositoryContents);

      // Generate recommendations
      validation.recommendations = this.generateRecommendations(validation);

      return {
        success: true,
        validation
      };

    } catch (error) {
      console.error('Template validation error:', error);
      
      return {
        success: false,
        error: `Template validation failed: ${error.message}`
      };
    }
  }

  /**
   * Validate template repository structure
   * @param {Array} repositoryContents - Repository file structure
   * @param {string} owner - Repository owner
   * @param {string} repo - Repository name
   * @param {string} [ref] - Git reference
   * @returns {Promise<object>} Structure validation result
   */
  async validateStructure(repositoryContents, owner, repo, ref = null) {
    const result = {
      valid: true,
      score: 30,
      issues: [],
      hasRequiredFiles: false,
      hasPreviewImage: false,
      hasReadme: false
    };

    // Check for .nebula/config.json (critical requirement)
    const hasConfig = repositoryContents.some(item => item.path === '.nebula/config.json');
    if (!hasConfig) {
      result.valid = false;
      result.score -= 15;
      result.issues.push({
        type: 'error',
        message: 'Missing required .nebula/config.json file',
        suggestion: 'Create a .nebula/config.json file with template configuration'
      });
    } else {
      result.hasRequiredFiles = true;
    }

    // Check for .nebula directory
    const hasNebulaDir = repositoryContents.some(item => item.path === '.nebula' && item.type === 'dir');
    if (!hasNebulaDir) {
      result.valid = false;
      result.score -= 10;
      result.issues.push({
        type: 'error',
        message: 'Missing .nebula directory',
        suggestion: 'Create a .nebula directory for template configuration files'
      });
    }

    // Check for preview image
    const hasPreview = repositoryContents.some(item => 
      item.path === '.nebula/preview.png' || 
      item.path === '.nebula/preview.jpg' ||
      item.path === '.nebula/preview.jpeg'
    );
    
    if (!hasPreview) {
      result.score -= 5;
      result.issues.push({
        type: 'warning',
        message: 'Missing template preview image',
        suggestion: 'Add a preview.png file to .nebula/ directory (recommended size: 800x600px)'
      });
    } else {
      result.hasPreviewImage = true;
    }

    // Check for README
    const hasReadme = repositoryContents.some(item => 
      item.name.toLowerCase() === 'readme.md' || 
      item.name.toLowerCase() === 'readme.txt'
    );
    
    if (!hasReadme) {
      result.score -= 3;
      result.issues.push({
        type: 'warning',
        message: 'Missing README file',
        suggestion: 'Add a README.md file with template documentation and usage instructions'
      });
    } else {
      result.hasReadme = true;
    }

    // Check for package.json (for templates with dependencies)
    const hasPackageJson = repositoryContents.some(item => item.name === 'package.json');
    if (!hasPackageJson) {
      result.issues.push({
        type: 'info',
        message: 'No package.json found',
        suggestion: 'Consider adding package.json if template has JavaScript dependencies'
      });
    }

    // Check directory structure conventions
    const hasComponents = repositoryContents.some(item => item.name === 'components' && item.type === 'dir');
    const hasPublic = repositoryContents.some(item => item.name === 'public' && item.type === 'dir');
    
    if (!hasComponents && !hasPublic) {
      result.score -= 2;
      result.issues.push({
        type: 'suggestion',
        message: 'Consider organizing files in standard directories',
        suggestion: 'Use directories like "components/" for React components and "public/" for static assets'
      });
    }

    return result;
  }

  /**
   * Validate template configuration file
   * @param {string} owner - Repository owner
   * @param {string} repo - Repository name
   * @param {string} [ref] - Git reference
   * @returns {Promise<object>} Configuration validation result
   */
  async validateConfiguration(owner, repo, ref = null) {
    const result = {
      valid: true,
      score: 25,
      issues: [],
      config: null,
      templateType: null
    };

    try {
      // Get config file content
      const configResult = await this.repositoryService.getFileContent(owner, repo, '.nebula/config.json', ref);
      
      if (!configResult.success) {
        result.valid = false;
        result.score = 0;
        result.issues.push({
          type: 'error',
          message: 'Cannot read .nebula/config.json file',
          suggestion: 'Ensure the config file exists and is accessible'
        });
        return result;
      }

      // Parse JSON
      let config;
      try {
        config = JSON.parse(configResult.content.content);
        result.config = config;
      } catch (parseError) {
        result.valid = false;
        result.score -= 15;
        result.issues.push({
          type: 'error',
          message: 'Invalid JSON in .nebula/config.json',
          suggestion: 'Fix JSON syntax errors in the configuration file',
          details: parseError.message
        });
        return result;
      }

      // Validate required fields
      const requiredFields = ['version', 'templateType', 'contentFiles'];
      for (const field of requiredFields) {
        if (!config[field]) {
          result.valid = false;
          result.score -= 5;
          result.issues.push({
            type: 'error',
            message: `Missing required config field: ${field}`,
            suggestion: `Add the "${field}" field to your template configuration`
          });
        }
      }

      // Validate version format
      if (config.version && !this.patterns.semverVersion.test(config.version)) {
        result.score -= 2;
        result.issues.push({
          type: 'warning',
          message: 'Version should follow semantic versioning (e.g., "1.0.0")',
          suggestion: 'Use semantic versioning format for the version field'
        });
      }

      // Validate template type
      if (config.templateType) {
        result.templateType = config.templateType;
        
        if (!this.templateRequirements[config.templateType]) {
          result.valid = false;
          result.score -= 10;
          result.issues.push({
            type: 'error',
            message: `Unsupported template type: ${config.templateType}`,
            suggestion: `Use one of the supported types: ${Object.keys(this.templateRequirements).join(', ')}`
          });
        }
      }

      // Validate content files
      if (config.contentFiles) {
        if (!Array.isArray(config.contentFiles)) {
          result.valid = false;
          result.score -= 8;
          result.issues.push({
            type: 'error',
            message: 'contentFiles must be an array',
            suggestion: 'Change contentFiles to an array of content file definitions'
          });
        } else {
          for (const [index, contentFile] of config.contentFiles.entries()) {
            const fileValidation = this.validateContentFileConfig(contentFile, index);
            result.score -= fileValidation.scoreDeduction;
            result.issues.push(...fileValidation.issues);
            
            if (!fileValidation.valid) {
              result.valid = false;
            }
          }
        }
      }

      // Validate asset configuration
      if (config.assets) {
        const assetValidation = this.validateAssetConfig(config.assets);
        result.score -= assetValidation.scoreDeduction;
        result.issues.push(...assetValidation.issues);
      }

      // Validate optional fields
      if (config.name && typeof config.name !== 'string') {
        result.score -= 1;
        result.issues.push({
          type: 'warning',
          message: 'Template name should be a string',
          suggestion: 'Provide a descriptive name for your template'
        });
      }

      if (config.description && typeof config.description !== 'string') {
        result.score -= 1;
        result.issues.push({
          type: 'warning',
          message: 'Template description should be a string',
          suggestion: 'Provide a clear description of your template'
        });
      }

      // Validate preview component
      if (config.previewComponent && !this.patterns.validComponentName.test(config.previewComponent)) {
        result.score -= 2;
        result.issues.push({
          type: 'warning',
          message: 'Preview component name should follow React naming conventions',
          suggestion: 'Use PascalCase for component names (e.g., "MyPortfolioTemplate")'
        });
      }

    } catch (error) {
      result.valid = false;
      result.score = 0;
      result.issues.push({
        type: 'error',
        message: `Configuration validation failed: ${error.message}`,
        suggestion: 'Check the configuration file for errors'
      });
    }

    return result;
  }

  /**
   * Validate content file configuration
   * @param {object} contentFile - Content file configuration
   * @param {number} index - File index for error reporting
   * @returns {object} Validation result
   */
  validateContentFileConfig(contentFile, index) {
    const result = {
      valid: true,
      scoreDeduction: 0,
      issues: []
    };

    // Check required fields
    if (!contentFile.path) {
      result.valid = false;
      result.scoreDeduction += 3;
      result.issues.push({
        type: 'error',
        message: `Content file ${index} missing required 'path' field`,
        suggestion: 'Add a path field specifying the file location'
      });
    }

    if (!contentFile.schema) {
      result.valid = false;
      result.scoreDeduction += 3;
      result.issues.push({
        type: 'error',
        message: `Content file ${index} missing required 'schema' field`,
        suggestion: 'Add a schema field defining the content structure'
      });
    }

    // Validate file type
    if (contentFile.type && !['json', 'markdown', 'yaml'].includes(contentFile.type)) {
      result.scoreDeduction += 2;
      result.issues.push({
        type: 'warning',
        message: `Content file ${index} has unsupported type: ${contentFile.type}`,
        suggestion: 'Use supported types: json, markdown, yaml'
      });
    }

    // Validate schema structure
    if (contentFile.schema && typeof contentFile.schema === 'object') {
      const schemaValidation = this.validateSchemaDefinition(contentFile.schema, `contentFiles[${index}].schema`);
      result.scoreDeduction += schemaValidation.scoreDeduction;
      result.issues.push(...schemaValidation.issues);
      
      if (!schemaValidation.valid) {
        result.valid = false;
      }
    }

    return result;
  }

  /**
   * Validate schema definition recursively
   * @param {object} schema - Schema object
   * @param {string} path - Current path for error reporting
   * @returns {object} Validation result
   */
  validateSchemaDefinition(schema, path = 'schema') {
    const result = {
      valid: true,
      scoreDeduction: 0,
      issues: []
    };

    const supportedTypes = ['string', 'text', 'markdown', 'number', 'boolean', 'select', 'array', 'object', 'image', 'date', 'url', 'email'];

    for (const [fieldName, fieldDef] of Object.entries(schema)) {
      const fieldPath = `${path}.${fieldName}`;

      if (typeof fieldDef !== 'object' || fieldDef === null) {
        result.valid = false;
        result.scoreDeduction += 2;
        result.issues.push({
          type: 'error',
          message: `${fieldPath} must be an object`,
          suggestion: 'Define field properties as an object with type, label, etc.'
        });
        continue;
      }

      // Validate field name
      if (!this.patterns.validFieldName.test(fieldName)) {
        result.scoreDeduction += 1;
        result.issues.push({
          type: 'warning',
          message: `${fieldPath} has invalid field name`,
          suggestion: 'Use camelCase or snake_case for field names'
        });
      }

      // Validate field type
      if (fieldDef.type && !supportedTypes.includes(fieldDef.type)) {
        result.scoreDeduction += 2;
        result.issues.push({
          type: 'warning',
          message: `${fieldPath} has unsupported type: ${fieldDef.type}`,
          suggestion: `Use supported types: ${supportedTypes.join(', ')}`
        });
      }

      // Validate label
      if (fieldDef.label && typeof fieldDef.label !== 'string') {
        result.scoreDeduction += 1;
        result.issues.push({
          type: 'warning',
          message: `${fieldPath}.label must be a string`,
          suggestion: 'Provide a descriptive label for the field'
        });
      }

      // Validate validation rules
      if (fieldDef.maxLength !== undefined && (typeof fieldDef.maxLength !== 'number' || fieldDef.maxLength < 0)) {
        result.scoreDeduction += 1;
        result.issues.push({
          type: 'warning',
          message: `${fieldPath}.maxLength must be a positive number`,
          suggestion: 'Set maxLength to a positive integer'
        });
      }

      // Validate array items
      if (fieldDef.type === 'array' && fieldDef.items) {
        if (typeof fieldDef.items === 'object' && fieldDef.items.properties) {
          const itemsValidation = this.validateSchemaDefinition(fieldDef.items.properties, `${fieldPath}.items`);
          result.scoreDeduction += itemsValidation.scoreDeduction;
          result.issues.push(...itemsValidation.issues);
          
          if (!itemsValidation.valid) {
            result.valid = false;
          }
        }
      }

      // Validate object properties
      if (fieldDef.type === 'object' && fieldDef.properties) {
        const propsValidation = this.validateSchemaDefinition(fieldDef.properties, `${fieldPath}.properties`);
        result.scoreDeduction += propsValidation.scoreDeduction;
        result.issues.push(...propsValidation.issues);
        
        if (!propsValidation.valid) {
          result.valid = false;
        }
      }

      // Validate select options
      if (fieldDef.type === 'select' && fieldDef.options) {
        if (!Array.isArray(fieldDef.options)) {
          result.scoreDeduction += 2;
          result.issues.push({
            type: 'warning',
            message: `${fieldPath}.options must be an array`,
            suggestion: 'Provide options as an array of values or objects'
          });
        }
      }
    }

    return result;
  }

  /**
   * Validate asset configuration
   * @param {object} assets - Asset configuration
   * @returns {object} Validation result
   */
  validateAssetConfig(assets) {
    const result = {
      scoreDeduction: 0,
      issues: []
    };

    if (assets.allowedTypes && !Array.isArray(assets.allowedTypes)) {
      result.scoreDeduction += 1;
      result.issues.push({
        type: 'warning',
        message: 'assets.allowedTypes must be an array',
        suggestion: 'Provide allowed MIME types as an array'
      });
    }

    if (assets.maxSize && typeof assets.maxSize !== 'string') {
      result.scoreDeduction += 1;
      result.issues.push({
        type: 'warning',
        message: 'assets.maxSize must be a string (e.g., "5MB")',
        suggestion: 'Specify maximum file size with units'
      });
    }

    if (assets.paths && !Array.isArray(assets.paths)) {
      result.scoreDeduction += 1;
      result.issues.push({
        type: 'warning',
        message: 'assets.paths must be an array',
        suggestion: 'Provide asset paths as an array of directory paths'
      });
    }

    return result;
  }

  /**
   * Validate template content files
   * @param {string} owner - Repository owner
   * @param {string} repo - Repository name
   * @param {object} config - Template configuration
   * @param {string} [ref] - Git reference
   * @returns {Promise<object>} Content validation result
   */
  async validateContent(owner, repo, config, ref = null) {
    const result = {
      valid: true,
      score: 25,
      issues: []
    };

    if (!config || !config.contentFiles) {
      result.score -= 10;
      result.issues.push({
        type: 'warning',
        message: 'No content files to validate',
        suggestion: 'Define content files in the template configuration'
      });
      return result;
    }

    // Validate each content file
    for (const contentFile of config.contentFiles) {
      if (!contentFile.path.includes('*')) {
        // Non-wildcard path - check if file exists
        const fileExists = await this.checkFileExists(owner, repo, contentFile.path, ref);
        
        if (!fileExists) {
          result.score -= 3;
          result.issues.push({
            type: 'warning',
            message: `Content file not found: ${contentFile.path}`,
            suggestion: `Create ${contentFile.path} or update the path in .nebula/config.json`
          });
        } else {
          // Validate file content if it exists
          const contentValidation = await this.validateFileContent(owner, repo, contentFile, ref);
          result.score -= contentValidation.scoreDeduction;
          result.issues.push(...contentValidation.issues);
        }
      }
    }

    // Validate asset directories
    if (config.assets && config.assets.paths) {
      for (const assetPath of config.assets.paths) {
        const pathExists = await this.checkDirectoryExists(owner, repo, assetPath, ref);
        
        if (!pathExists) {
          result.score -= 2;
          result.issues.push({
            type: 'suggestion',
            message: `Asset directory not found: ${assetPath}`,
            suggestion: `Create directory ${assetPath} or update asset paths in config`
          });
        }
      }
    }

    return result;
  }

  /**
   * Validate individual file content
   * @param {string} owner - Repository owner
   * @param {string} repo - Repository name
   * @param {object} contentFile - Content file configuration
   * @param {string} [ref] - Git reference
   * @returns {Promise<object>} File validation result
   */
  async validateFileContent(owner, repo, contentFile, ref = null) {
    const result = {
      scoreDeduction: 0,
      issues: []
    };

    try {
      const fileResult = await this.repositoryService.getFileContent(owner, repo, contentFile.path, ref);
      
      if (!fileResult.success) {
        return result;
      }

      const content = fileResult.content.content;

      // Validate based on file type
      switch (contentFile.type) {
        case 'json':
          try {
            JSON.parse(content);
          } catch (parseError) {
            result.scoreDeduction += 3;
            result.issues.push({
              type: 'error',
              message: `Invalid JSON in ${contentFile.path}`,
              suggestion: 'Fix JSON syntax errors in the content file',
              details: parseError.message
            });
          }
          break;

        case 'markdown':
          // Basic markdown validation
          if (!content.trim()) {
            result.scoreDeduction += 1;
            result.issues.push({
              type: 'warning',
              message: `Empty markdown file: ${contentFile.path}`,
              suggestion: 'Add content to the markdown file'
            });
          }
          break;
      }

    } catch (error) {
      result.scoreDeduction += 2;
      result.issues.push({
        type: 'warning',
        message: `Could not validate content of ${contentFile.path}`,
        suggestion: 'Ensure the file is accessible and properly formatted'
      });
    }

    return result;
  }

  /**
   * Validate template compatibility with platform
   * @param {Array} repositoryContents - Repository file structure
   * @param {object} config - Template configuration
   * @returns {Promise<object>} Compatibility validation result
   */
  async validateCompatibility(repositoryContents, config) {
    const result = {
      valid: true,
      score: 20,
      issues: []
    };

    // Check for React component files
    const hasComponents = repositoryContents.some(item => 
      item.name.endsWith('.js') || item.name.endsWith('.jsx') || item.name.endsWith('.tsx')
    );

    if (!hasComponents) {
      result.score -= 5;
      result.issues.push({
        type: 'suggestion',
        message: 'No React component files found',
        suggestion: 'Add React components to render your template'
      });
    }

    // Check for proper naming conventions
    const hasProperNaming = repositoryContents.every(item => 
      this.patterns.validFileName.test(item.name)
    );

    if (!hasProperNaming) {
      result.score -= 3;
      result.issues.push({
        type: 'warning',
        message: 'Some files have invalid names',
        suggestion: 'Use alphanumeric characters, dots, hyphens, and underscores in file names'
      });
    }

    // Check for editable fields configuration
    if (config && config.editableFields && Array.isArray(config.editableFields)) {
      if (config.editableFields.length === 0) {
        result.score -= 2;
        result.issues.push({
          type: 'suggestion',
          message: 'No editable fields specified',
          suggestion: 'Define which fields users can edit in the web interface'
        });
      }
    }

    // Check for preview component
    if (config && !config.previewComponent) {
      result.score -= 2;
      result.issues.push({
        type: 'suggestion',
        message: 'No preview component specified',
        suggestion: 'Specify a React component for template preview'
      });
    }

    return result;
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
   * Check if a directory exists in the repository
   * @param {string} owner - Repository owner
   * @param {string} repo - Repository name
   * @param {string} path - Directory path
   * @param {string} [ref] - Git reference
   * @returns {Promise<boolean>} True if directory exists
   */
  async checkDirectoryExists(owner, repo, path, ref = null) {
    try {
      const result = await this.repositoryService.getRepositoryStructure(owner, repo, path, ref);
      return result.success;
    } catch (error) {
      return false;
    }
  }

  /**
   * Merge validation results into main validation object
   * @param {object} mainValidation - Main validation object
   * @param {object} sectionValidation - Section validation result
   * @param {string} sectionName - Section name
   * @param {number} maxScore - Maximum score for this section
   */
  mergeValidationResults(mainValidation, sectionValidation, sectionName, maxScore) {
    // Update section details
    mainValidation.details[sectionName] = {
      valid: sectionValidation.valid,
      score: sectionValidation.score || maxScore,
      maxScore,
      issues: sectionValidation.issues || []
    };

    // Add to overall score
    mainValidation.score += sectionValidation.score || maxScore;

    // Merge issues
    for (const issue of sectionValidation.issues || []) {
      switch (issue.type) {
        case 'error':
          mainValidation.errors.push(issue);
          break;
        case 'warning':
          mainValidation.warnings.push(issue);
          break;
        case 'suggestion':
        case 'info':
          mainValidation.suggestions.push(issue);
          break;
      }
    }

    // Update overall validity
    if (!sectionValidation.valid) {
      mainValidation.valid = false;
    }
  }

  /**
   * Estimate template complexity
   * @param {object} config - Template configuration
   * @param {Array} repositoryContents - Repository contents
   * @returns {string} Complexity level
   */
  estimateTemplateComplexity(config, repositoryContents) {
    let complexityScore = 0;

    // Count content files
    if (config && config.contentFiles) {
      complexityScore += config.contentFiles.length * 2;
    }

    // Count total files
    complexityScore += repositoryContents.length;

    // Check for nested schemas
    if (config && config.contentFiles) {
      for (const contentFile of config.contentFiles) {
        if (contentFile.schema) {
          complexityScore += this.countNestedFields(contentFile.schema);
        }
      }
    }

    // Determine complexity level
    if (complexityScore < 10) {
      return 'simple';
    } else if (complexityScore < 25) {
      return 'moderate';
    } else {
      return 'complex';
    }
  }

  /**
   * Count nested fields in schema
   * @param {object} schema - Schema object
   * @returns {number} Number of nested fields
   */
  countNestedFields(schema) {
    let count = 0;
    
    for (const [, fieldDef] of Object.entries(schema)) {
      count++;
      
      if (fieldDef.type === 'object' && fieldDef.properties) {
        count += this.countNestedFields(fieldDef.properties);
      }
      
      if (fieldDef.type === 'array' && fieldDef.items && fieldDef.items.properties) {
        count += this.countNestedFields(fieldDef.items.properties);
      }
    }
    
    return count;
  }

  /**
   * Generate recommendations based on validation results
   * @param {object} validation - Validation results
   * @returns {Array} Array of recommendations
   */
  generateRecommendations(validation) {
    const recommendations = [];

    // Score-based recommendations
    if (validation.score < 50) {
      recommendations.push({
        priority: 'high',
        category: 'structure',
        message: 'Template needs significant improvements to be platform-compatible',
        actions: [
          'Fix all error-level issues',
          'Add required configuration files',
          'Improve template documentation'
        ]
      });
    } else if (validation.score < 80) {
      recommendations.push({
        priority: 'medium',
        category: 'quality',
        message: 'Template is functional but could be improved',
        actions: [
          'Address warning-level issues',
          'Add preview image',
          'Improve schema definitions'
        ]
      });
    }

    // Specific recommendations based on issues
    const errorCount = validation.errors.length;
    const warningCount = validation.warnings.length;

    if (errorCount > 0) {
      recommendations.push({
        priority: 'high',
        category: 'errors',
        message: `Fix ${errorCount} critical error${errorCount > 1 ? 's' : ''}`,
        actions: validation.errors.slice(0, 3).map(error => error.suggestion)
      });
    }

    if (warningCount > 3) {
      recommendations.push({
        priority: 'medium',
        category: 'warnings',
        message: `Address ${warningCount} warning${warningCount > 1 ? 's' : ''} to improve quality`,
        actions: validation.warnings.slice(0, 3).map(warning => warning.suggestion)
      });
    }

    // Template type specific recommendations
    if (validation.metadata.templateType === 'json' && !validation.details.content.valid) {
      recommendations.push({
        priority: 'medium',
        category: 'content',
        message: 'JSON template needs valid data files',
        actions: [
          'Create or fix data.json file',
          'Ensure JSON syntax is valid',
          'Match schema definitions with actual content'
        ]
      });
    }

    return recommendations;
  }

  /**
   * Generate validation summary
   * @param {object} validation - Validation results
   * @returns {object} Validation summary
   */
  generateValidationSummary(validation) {
    return {
      overall: {
        valid: validation.valid,
        score: validation.score,
        maxScore: validation.maxScore,
        grade: this.calculateGrade(validation.score, validation.maxScore)
      },
      issues: {
        errors: validation.errors.length,
        warnings: validation.warnings.length,
        suggestions: validation.suggestions.length
      },
      sections: {
        structure: validation.details.structure.valid,
        config: validation.details.config.valid,
        content: validation.details.content.valid,
        compatibility: validation.details.compatibility.valid
      },
      complexity: validation.metadata.estimatedComplexity,
      recommendations: validation.recommendations?.length || 0
    };
  }

  /**
   * Calculate letter grade from score
   * @param {number} score - Current score
   * @param {number} maxScore - Maximum possible score
   * @returns {string} Letter grade
   */
  calculateGrade(score, maxScore) {
    const percentage = (score / maxScore) * 100;
    
    if (percentage >= 90) return 'A';
    if (percentage >= 80) return 'B';
    if (percentage >= 70) return 'C';
    if (percentage >= 60) return 'D';
    return 'F';
  }
}

export default TemplateCompatibilityValidator;