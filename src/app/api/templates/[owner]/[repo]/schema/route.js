import { NextResponse } from 'next/server';
import { RepositoryService } from '../../../../../../lib/repository-service.js';
import { validateAuthToken } from '../../../../../../lib/auth.js';

/**
 * Get template editing schema for web editor
 * GET /api/templates/[owner]/[repo]/schema
 */
export async function GET(request, { params }) {
  try {
    const { owner, repo } = params;
    const { searchParams } = new URL(request.url);
    const ref = searchParams.get('ref') || null;

    // Validate parameters
    if (!owner || !repo) {
      return NextResponse.json(
        { error: 'Owner and repository name are required' },
        { status: 400 }
      );
    }

    // Validate authentication
    const authResult = await validateAuthToken(request);
    if (!authResult.valid) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Initialize repository service
    const repoService = new RepositoryService(authResult.accessToken);

    // Get template schema
    const schemaResult = await generateEditingSchema(repoService, owner, repo, ref);

    if (!schemaResult.success) {
      return NextResponse.json(
        { error: schemaResult.error },
        { status: schemaResult.status || 500 }
      );
    }

    return NextResponse.json({
      success: true,
      schema: schemaResult.schema,
      metadata: {
        owner,
        repo,
        ref,
        timestamp: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('Get template schema API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * Generate editing schema from template configuration
 */
async function generateEditingSchema(repoService, owner, repo, ref = null) {
  try {
    // Get template configuration
    const configResult = await repoService.getFileContent(owner, repo, '.nebula/config.json', ref);
    
    if (!configResult.success) {
      return {
        success: false,
        error: 'Template configuration not found',
        status: 404
      };
    }

    let config;
    try {
      config = JSON.parse(configResult.content.content);
    } catch (error) {
      return {
        success: false,
        error: 'Invalid template configuration JSON',
        status: 400
      };
    }

    // Validate configuration has required fields
    if (!config.contentFiles || !Array.isArray(config.contentFiles)) {
      return {
        success: false,
        error: 'Template configuration missing contentFiles array',
        status: 400
      };
    }

    // Generate editing schema
    const schema = {
      version: config.version || '1.0',
      templateInfo: {
        name: config.name || repo,
        description: config.description || '',
        templateType: config.templateType || 'unknown',
        author: config.author || owner
      },
      editingCapabilities: {
        supported: true,
        multiFile: config.contentFiles.length > 1,
        hasAssets: !!config.assets,
        hasValidation: config.contentFiles.some(f => hasValidationRules(f.schema))
      },
      contentFiles: [],
      formSchema: {
        sections: [],
        fields: [],
        validation: {}
      },
      assets: config.assets || null,
      ui: {
        layout: config.ui?.layout || 'default',
        theme: config.ui?.theme || 'default',
        customizations: config.ui?.customizations || {}
      }
    };

    // Process each content file
    for (const [index, contentFile] of config.contentFiles.entries()) {
      const fileSchema = await processContentFileSchema(
        repoService,
        owner,
        repo,
        contentFile,
        ref,
        index
      );

      if (fileSchema.success) {
        schema.contentFiles.push(fileSchema.file);
        schema.formSchema.sections.push(...fileSchema.sections);
        schema.formSchema.fields.push(...fileSchema.fields);
        Object.assign(schema.formSchema.validation, fileSchema.validation);
      }
    }

    // Generate UI layout information
    schema.ui.layout = generateUILayout(schema.formSchema.sections);

    return {
      success: true,
      schema
    };

  } catch (error) {
    console.error('Generate editing schema error:', error);
    return {
      success: false,
      error: `Failed to generate schema: ${error.message}`
    };
  }
}

/**
 * Process individual content file schema
 */
async function processContentFileSchema(repoService, owner, repo, contentFile, ref, fileIndex) {
  try {
    const fileSchema = {
      id: `file_${fileIndex}`,
      path: contentFile.path,
      type: contentFile.type || 'json',
      label: contentFile.label || contentFile.path,
      description: contentFile.description || '',
      required: contentFile.required !== false,
      schema: contentFile.schema
    };

    // Check if file exists and get current content
    const fileResult = await repoService.getFileContent(owner, repo, contentFile.path, ref);
    
    if (fileResult.success) {
      fileSchema.exists = true;
      fileSchema.currentContent = fileResult.content.content;
      fileSchema.sha = fileResult.content.sha;

      // Parse current content based on file type
      if (contentFile.type === 'json') {
        try {
          fileSchema.currentData = JSON.parse(fileResult.content.content);
        } catch (error) {
          fileSchema.parseError = 'Invalid JSON content';
        }
      }
    } else {
      fileSchema.exists = false;
      fileSchema.currentContent = null;
    }

    // Generate form sections and fields from schema
    const formGeneration = generateFormFields(contentFile.schema, `${fileSchema.id}_`, contentFile.path);

    return {
      success: true,
      file: fileSchema,
      sections: [{
        id: fileSchema.id,
        title: fileSchema.label,
        description: fileSchema.description,
        filePath: fileSchema.path,
        fields: formGeneration.fields.map(f => f.id)
      }],
      fields: formGeneration.fields,
      validation: formGeneration.validation
    };

  } catch (error) {
    console.error(`Process content file schema error for ${contentFile.path}:`, error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Generate form fields from schema definition
 */
function generateFormFields(schema, idPrefix = '', filePath = '') {
  const fields = [];
  const validation = {};

  function processSchemaLevel(schemaLevel, prefix, parentPath = '') {
    for (const [key, definition] of Object.entries(schemaLevel)) {
      const fieldId = `${prefix}${key}`;
      const fieldPath = parentPath ? `${parentPath}.${key}` : key;

      const baseField = {
        id: fieldId,
        name: key,
        path: fieldPath,
        filePath,
        label: definition.label || key,
        description: definition.description || '',
        required: definition.required || false,
        type: definition.type || 'string'
      };

      // Add validation rules
      if (definition.required || definition.maxLength || definition.pattern || definition.min || definition.max) {
        validation[fieldId] = {
          required: definition.required || false,
          maxLength: definition.maxLength,
          pattern: definition.pattern,
          min: definition.min,
          max: definition.max
        };
      }

      switch (definition.type) {
        case 'string':
          fields.push({
            ...baseField,
            component: 'TextInput',
            placeholder: definition.placeholder || '',
            maxLength: definition.maxLength
          });
          break;

        case 'text':
          fields.push({
            ...baseField,
            component: 'TextArea',
            placeholder: definition.placeholder || '',
            rows: definition.rows || 4,
            maxLength: definition.maxLength
          });
          break;

        case 'markdown':
          fields.push({
            ...baseField,
            component: 'MarkdownEditor',
            preview: definition.preview !== false,
            toolbar: definition.toolbar || 'default'
          });
          break;

        case 'number':
          fields.push({
            ...baseField,
            component: 'NumberInput',
            min: definition.min,
            max: definition.max,
            step: definition.step || 1
          });
          break;

        case 'boolean':
          fields.push({
            ...baseField,
            component: 'Checkbox',
            defaultValue: definition.default || false
          });
          break;

        case 'select':
          fields.push({
            ...baseField,
            component: 'Select',
            options: definition.options || [],
            multiple: definition.multiple || false
          });
          break;

        case 'image':
          fields.push({
            ...baseField,
            component: 'ImageUpload',
            accept: definition.accept || 'image/*',
            maxSize: definition.maxSize || '5MB',
            preview: definition.preview !== false
          });
          break;

        case 'array':
          fields.push({
            ...baseField,
            component: 'ArrayEditor',
            itemType: definition.items?.type || 'string',
            minItems: definition.minItems || 0,
            maxItems: definition.maxItems,
            addLabel: definition.addLabel || `Add ${key}`,
            itemSchema: definition.items
          });

          // If array items have properties, process them
          if (definition.items?.properties) {
            processSchemaLevel(definition.items.properties, `${fieldId}_item_`, `${fieldPath}[]`);
          }
          break;

        case 'object':
          fields.push({
            ...baseField,
            component: 'ObjectEditor',
            collapsible: definition.collapsible !== false,
            expanded: definition.expanded !== false
          });

          // Process nested properties
          if (definition.properties) {
            processSchemaLevel(definition.properties, `${fieldId}_`, fieldPath);
          }
          break;

        default:
          // Fallback to text input for unknown types
          fields.push({
            ...baseField,
            component: 'TextInput',
            type: 'string'
          });
      }
    }
  }

  processSchemaLevel(schema, idPrefix);

  return { fields, validation };
}

/**
 * Generate UI layout based on form sections
 */
function generateUILayout(sections) {
  const layout = {
    type: 'default',
    sections: sections.length,
    columns: sections.length > 2 ? 2 : 1,
    responsive: true,
    navigation: {
      type: sections.length > 1 ? 'tabs' : 'none',
      position: 'top'
    }
  };

  // Adjust layout based on complexity
  const totalFields = sections.reduce((sum, section) => sum + section.fields.length, 0);
  
  if (totalFields > 20) {
    layout.type = 'wizard';
    layout.navigation.type = 'steps';
  } else if (totalFields > 10) {
    layout.type = 'accordion';
    layout.navigation.type = 'accordion';
  }

  return layout;
}

/**
 * Check if schema has validation rules
 */
function hasValidationRules(schema) {
  for (const definition of Object.values(schema)) {
    if (definition.required || definition.maxLength || definition.pattern || definition.min || definition.max) {
      return true;
    }
    if (definition.type === 'object' && definition.properties) {
      if (hasValidationRules(definition.properties)) {
        return true;
      }
    }
    if (definition.type === 'array' && definition.items?.properties) {
      if (hasValidationRules(definition.items.properties)) {
        return true;
      }
    }
  }
  return false;
}