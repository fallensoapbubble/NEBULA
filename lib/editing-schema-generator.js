/**
 * Editing Schema Generator
 * Generates form field schemas from template configurations for the web editor
 */
export class EditingSchemaGenerator {
  constructor() {
    // Field type mappings to UI components
    this.fieldTypeComponents = {
      'string': {
        component: 'TextInput',
        props: {
          type: 'text',
          autoComplete: 'off'
        },
        validation: ['required', 'minLength', 'maxLength', 'pattern']
      },
      'text': {
        component: 'TextArea',
        props: {
          rows: 4,
          resize: 'vertical'
        },
        validation: ['required', 'minLength', 'maxLength']
      },
      'markdown': {
        component: 'MarkdownEditor',
        props: {
          preview: true,
          toolbar: true,
          height: '300px'
        },
        validation: ['required']
      },
      'number': {
        component: 'NumberInput',
        props: {
          type: 'number',
          step: 'any'
        },
        validation: ['required', 'min', 'max']
      },
      'boolean': {
        component: 'Checkbox',
        props: {
          type: 'checkbox'
        },
        validation: []
      },
      'select': {
        component: 'Select',
        props: {
          searchable: false
        },
        validation: ['required', 'options']
      },
      'array': {
        component: 'ArrayEditor',
        props: {
          sortable: true,
          addButton: true,
          removeButton: true
        },
        validation: ['minItems', 'maxItems']
      },
      'object': {
        component: 'ObjectEditor',
        props: {
          collapsible: true,
          expanded: true
        },
        validation: ['required']
      },
      'image': {
        component: 'ImageUpload',
        props: {
          accept: 'image/*',
          preview: true,
          crop: false
        },
        validation: ['required', 'fileSize', 'fileType']
      },
      'date': {
        component: 'DateInput',
        props: {
          type: 'date',
          format: 'YYYY-MM-DD'
        },
        validation: ['required']
      },
      'url': {
        component: 'URLInput',
        props: {
          type: 'url',
          placeholder: 'https://example.com'
        },
        validation: ['required', 'pattern']
      },
      'email': {
        component: 'EmailInput',
        props: {
          type: 'email',
          placeholder: 'user@example.com'
        },
        validation: ['required', 'pattern']
      }
    };
  }
}  /**

   * Generate editing schema from template configuration
   * @param {object} templateConfig - Template configuration object
   * @param {object} options - Generation options
   * @returns {Promise<{success: boolean, schema?: object, error?: string}>}
   */
  async generateSchema(templateConfig, options = {}) {
    try {
      if (!templateConfig || !templateConfig.contentFiles) {
        return {
          success: false,
          error: 'Invalid template configuration: missing contentFiles'
        };
      }

      const schema = {
        version: '1.0',
        templateType: templateConfig.templateType,
        templateName: templateConfig.name,
        description: templateConfig.description,
        files: [],
        metadata: {
          generatedAt: new Date().toISOString(),
          generator: 'EditingSchemaGenerator',
          version: '1.0'
        }
      };

      // Process each content file
      for (const contentFile of templateConfig.contentFiles) {
        const fileSchema = await this.generateFileSchema(contentFile, options);
        if (fileSchema.success) {
          schema.files.push(fileSchema.schema);
        } else {
          console.warn(`Failed to generate schema for ${contentFile.path}:`, fileSchema.error);
        }
      }

      // Add asset configuration
      if (templateConfig.assets) {
        schema.assets = this.processAssetConfig(templateConfig.assets);
      }

      return {
        success: true,
        schema
      };

    } catch (error) {
      return {
        success: false,
        error: `Schema generation failed: ${error.message}`
      };
    }
  }

  /**
   * Generate schema for a single content file
   * @param {object} contentFile - Content file configuration
   * @param {object} options - Generation options
   * @returns {Promise<{success: boolean, schema?: object, error?: string}>}
   */
  async generateFileSchema(contentFile, options = {}) {
    try {
      const { path, type, schema: fieldSchema, required = false } = contentFile;

      if (!fieldSchema) {
        return {
          success: false,
          error: `No schema defined for content file: ${path}`
        };
      }

      const fileSchema = {
        path,
        type,
        required,
        fields: [],
        metadata: {
          editable: true,
          contentType: this.getContentType(type),
          encoding: 'utf-8'
        }
      };

      // Handle different content file types
      switch (type) {
        case 'json':
          fileSchema.fields = this.generateFieldsFromSchema(fieldSchema, '', options);
          break;
          
        case 'markdown':
          fileSchema.fields = this.generateMarkdownFields(fieldSchema, options);
          break;
          
        default:
          fileSchema.fields = this.generateFieldsFromSchema(fieldSchema, '', options);
      }

      return {
        success: true,
        schema: fileSchema
      };

    } catch (error) {
      return {
        success: false,
        error: `File schema generation failed: ${error.message}`
      };
    }
  }

  /**
   * Generate form fields from schema definition
   * @param {object} schema - Schema object
   * @param {string} parentPath - Parent field path
   * @param {object} options - Generation options
   * @returns {Array} Array of field definitions
   */
  generateFieldsFromSchema(schema, parentPath = '', options = {}) {
    const fields = [];

    for (const [fieldName, fieldDef] of Object.entries(schema)) {
      const fieldPath = parentPath ? `${parentPath}.${fieldName}` : fieldName;
      
      try {
        const field = this.generateField(fieldName, fieldDef, fieldPath, options);
        if (field) {
          fields.push(field);
        }
      } catch (error) {
        console.warn(`Failed to generate field ${fieldPath}:`, error.message);
      }
    }

    return fields;
  }

  /**
   * Generate a single form field
   * @param {string} fieldName - Field name
   * @param {object} fieldDef - Field definition
   * @param {string} fieldPath - Full field path
   * @param {object} options - Generation options
   * @returns {object|null} Field definition or null if invalid
   */
  generateField(fieldName, fieldDef, fieldPath, options = {}) {
    if (!fieldDef || typeof fieldDef !== 'object') {
      return null;
    }

    const fieldType = fieldDef.type || 'string';
    const componentConfig = this.fieldTypeComponents[fieldType];

    if (!componentConfig) {
      console.warn(`Unsupported field type: ${fieldType} for field ${fieldPath}`);
      return null;
    }

    const field = {
      name: fieldName,
      path: fieldPath,
      type: fieldType,
      label: fieldDef.label || this.humanizeFieldName(fieldName),
      description: fieldDef.description || '',
      placeholder: fieldDef.placeholder || '',
      required: fieldDef.required || false,
      component: componentConfig.component,
      props: {
        ...componentConfig.props,
        ...(fieldDef.props || {})
      },
      validation: this.generateValidationRules(fieldDef, componentConfig.validation),
      metadata: {
        order: fieldDef.order || 0,
        group: fieldDef.group || 'default'
      }
    };

    // Handle specific field types
    switch (fieldType) {
      case 'array':
        field.items = this.generateArrayItemSchema(fieldDef.items, fieldPath, options);
        break;
        
      case 'object':
        field.properties = fieldDef.properties 
          ? this.generateFieldsFromSchema(fieldDef.properties, fieldPath, options)
          : [];
        break;
        
      case 'select':
        field.options = this.processSelectOptions(fieldDef.options || []);
        break;
    }

    return field;
  }

  /**
   * Generate schema for array items
   * @param {object} itemsDef - Array items definition
   * @param {string} parentPath - Parent field path
   * @param {object} options - Generation options
   * @returns {object} Array items schema
   */
  generateArrayItemSchema(itemsDef, parentPath, options = {}) {
    if (!itemsDef) {
      return {
        type: 'string',
        component: 'TextInput'
      };
    }

    if (typeof itemsDef === 'string') {
      const componentConfig = this.fieldTypeComponents[itemsDef];
      return {
        type: itemsDef,
        component: componentConfig?.component || 'TextInput',
        props: componentConfig?.props || {}
      };
    }

    if (itemsDef.type) {
      return this.generateField('item', itemsDef, `${parentPath}[]`, options);
    }

    if (itemsDef.properties) {
      return {
        type: 'object',
        component: 'ObjectEditor',
        properties: this.generateFieldsFromSchema(itemsDef.properties, `${parentPath}[]`, options)
      };
    }

    return {
      type: 'string',
      component: 'TextInput'
    };
  }

  /**
   * Generate fields for markdown content files
   * @param {object} schema - Markdown schema definition
   * @param {object} options - Generation options
   * @returns {Array} Array of field definitions
   */
  generateMarkdownFields(schema, options = {}) {
    const fields = [];

    // Handle frontmatter fields
    if (schema.frontmatter) {
      const frontmatterFields = this.generateFieldsFromSchema(schema.frontmatter, 'frontmatter', options);
      
      const frontmatterGroup = {
        name: 'frontmatter',
        path: 'frontmatter',
        type: 'object',
        label: 'Page Settings',
        description: 'Metadata and configuration for this page',
        component: 'ObjectEditor',
        properties: frontmatterFields,
        metadata: {
          group: 'frontmatter',
          order: 0
        }
      };
      
      fields.push(frontmatterGroup);
    }

    // Handle content field
    if (schema.content) {
      const contentField = this.generateField('content', schema.content, 'content', options);
      if (contentField) {
        contentField.metadata.group = 'content';
        contentField.metadata.order = 1;
        fields.push(contentField);
      }
    } else {
      // Default markdown content field
      fields.push({
        name: 'content',
        path: 'content',
        type: 'markdown',
        label: 'Content',
        description: 'Main content of the page',
        component: 'MarkdownEditor',
        props: {
          preview: true,
          toolbar: true,
          height: '400px'
        },
        validation: [],
        metadata: {
          group: 'content',
          order: 1
        }
      });
    }

    return fields;
  }

  /**
   * Generate validation rules for a field
   * @param {object} fieldDef - Field definition
   * @param {Array} supportedRules - Supported validation rules for field type
   * @returns {Array} Array of validation rule objects
   */
  generateValidationRules(fieldDef, supportedRules = []) {
    const rules = [];

    // Required validation
    if (fieldDef.required) {
      rules.push({
        rule: 'required',
        message: 'This field is required',
        validate: (val) => val !== null && val !== undefined && val !== ''
      });
    }

    // Length validations
    if (fieldDef.minLength !== undefined && supportedRules.includes('minLength')) {
      rules.push({
        rule: 'minLength',
        message: `Must be at least ${fieldDef.minLength} characters`,
        validate: (val) => !val || val.length >= fieldDef.minLength
      });
    }

    if (fieldDef.maxLength !== undefined && supportedRules.includes('maxLength')) {
      rules.push({
        rule: 'maxLength',
        message: `Must be no more than ${fieldDef.maxLength} characters`,
        validate: (val) => !val || val.length <= fieldDef.maxLength
      });
    }

    // Numeric validations
    if (fieldDef.min !== undefined && supportedRules.includes('min')) {
      rules.push({
        rule: 'min',
        message: `Must be at least ${fieldDef.min}`,
        validate: (val) => val === null || val === undefined || Number(val) >= fieldDef.min
      });
    }

    if (fieldDef.max !== undefined && supportedRules.includes('max')) {
      rules.push({
        rule: 'max',
        message: `Must be no more than ${fieldDef.max}`,
        validate: (val) => val === null || val === undefined || Number(val) <= fieldDef.max
      });
    }

    // Pattern validation
    if (fieldDef.pattern && supportedRules.includes('pattern')) {
      rules.push({
        rule: 'pattern',
        message: fieldDef.patternMessage || 'Invalid format',
        validate: (val) => !val || new RegExp(fieldDef.pattern).test(val)
      });
    }

    // Array validations
    if (fieldDef.minItems !== undefined && supportedRules.includes('minItems')) {
      rules.push({
        rule: 'minItems',
        message: `Must have at least ${fieldDef.minItems} items`,
        validate: (val) => !val || !Array.isArray(val) || val.length >= fieldDef.minItems
      });
    }

    if (fieldDef.maxItems !== undefined && supportedRules.includes('maxItems')) {
      rules.push({
        rule: 'maxItems',
        message: `Must have no more than ${fieldDef.maxItems} items`,
        validate: (val) => !val || !Array.isArray(val) || val.length <= fieldDef.maxItems
      });
    }

    return rules;
  }

  /**
   * Process select field options
   * @param {Array} options - Raw options array
   * @returns {Array} Processed options array
   */
  processSelectOptions(options) {
    return options.map(option => {
      if (typeof option === 'string') {
        return {
          value: option,
          label: this.humanizeFieldName(option)
        };
      }
      
      if (typeof option === 'object' && option.value !== undefined) {
        return {
          value: option.value,
          label: option.label || String(option.value),
          description: option.description || null,
          disabled: option.disabled || false
        };
      }
      
      return {
        value: option,
        label: String(option)
      };
    });
  }

  /**
   * Process asset configuration
   * @param {object} assets - Asset configuration
   * @returns {object} Processed asset configuration
   */
  processAssetConfig(assets) {
    return {
      allowedTypes: assets.allowedTypes || ['image/jpeg', 'image/png', 'image/webp'],
      maxSize: assets.maxSize || '5MB',
      paths: assets.paths || ['public/images']
    };
  }

  /**
   * Get content type for file type
   * @param {string} type - File type
   * @returns {string} Content type
   */
  getContentType(type) {
    const contentTypes = {
      'json': 'application/json',
      'markdown': 'text/markdown',
      'yaml': 'application/yaml',
      'text': 'text/plain'
    };
    
    return contentTypes[type] || 'text/plain';
  }

  /**
   * Convert field name to human-readable label
   * @param {string} fieldName - Field name
   * @returns {string} Human-readable label
   */
  humanizeFieldName(fieldName) {
    return fieldName
      .replace(/([A-Z])/g, ' $1')
      .replace(/_/g, ' ')
      .replace(/-/g, ' ')
      .replace(/^./, str => str.toUpperCase())
      .trim();
  }

  /**
   * Validate generated schema
   * @param {object} schema - Generated schema
   * @returns {object} Validation result
   */
  validateSchema(schema) {
    const errors = [];
    const warnings = [];

    if (!schema.files || !Array.isArray(schema.files)) {
      errors.push('Schema must contain a files array');
    }

    for (const [index, file] of (schema.files || []).entries()) {
      if (!file.path) {
        errors.push(`File ${index} missing path`);
      }
      
      if (!file.fields || !Array.isArray(file.fields)) {
        errors.push(`File ${index} missing fields array`);
      }
      
      for (const [fieldIndex, field] of (file.fields || []).entries()) {
        if (!field.name) {
          errors.push(`File ${index}, field ${fieldIndex} missing name`);
        }
        
        if (!field.component) {
          errors.push(`File ${index}, field ${fieldIndex} missing component`);
        }
      }
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings
    };
  }
}

export default EditingSchemaGenerator;