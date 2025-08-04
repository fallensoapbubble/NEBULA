import { NextResponse } from 'next/server';
import { RepositoryService } from '../../../../../../../lib/repository-service.js';
import { validateAuthToken } from '../../../../../../../lib/auth.js';

/**
 * Analyze template repository structure and generate editing capabilities
 * POST /api/templates/[owner]/[repo]/analyze
 */
export async function POST(request, { params }) {
  try {
    const { owner, repo } = params;
    const { ref } = await request.json().catch(() => ({}));

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

    // Analyze template structure
    const analysisResult = await analyzeTemplateStructure(repoService, owner, repo, ref);

    if (!analysisResult.success) {
      return NextResponse.json(
        { error: analysisResult.error },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      analysis: analysisResult.analysis,
      metadata: {
        owner,
        repo,
        ref,
        timestamp: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('Template analysis API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * Analyze template repository structure
 */
async function analyzeTemplateStructure(repoService, owner, repo, ref = null) {
  try {
    const analysis = {
      templateType: 'unknown',
      editingCapabilities: {
        supported: false,
        reason: null
      },
      structure: {
        hasNebulaConfig: false,
        hasContentFiles: false,
        hasComponents: false,
        hasAssets: false
      },
      contentFiles: [],
      editingSchema: null,
      recommendations: [],
      compatibility: {
        version: null,
        supported: false,
        issues: []
      }
    };

    // Get repository structure
    const structureResult = await repoService.getRepositoryStructure(owner, repo, '', ref);
    if (!structureResult.success) {
      return {
        success: false,
        error: 'Failed to analyze repository structure'
      };
    }

    const rootFiles = structureResult.structure.items;

    // Check for .nebula/config.json
    const configResult = await repoService.getFileContent(owner, repo, '.nebula/config.json', ref);
    
    if (configResult.success) {
      analysis.structure.hasNebulaConfig = true;
      
      try {
        const config = JSON.parse(configResult.content.content);
        analysis.templateType = config.templateType || 'unknown';
        analysis.compatibility.version = config.version;
        
        // Analyze editing capabilities based on config
        const editingAnalysis = analyzeEditingCapabilities(config);
        analysis.editingCapabilities = editingAnalysis.capabilities;
        analysis.editingSchema = editingAnalysis.schema;
        analysis.contentFiles = editingAnalysis.contentFiles;
        
        // Check compatibility
        analysis.compatibility = checkTemplateCompatibility(config);
        
      } catch (error) {
        analysis.editingCapabilities.reason = 'Invalid configuration file';
        analysis.compatibility.issues.push('Invalid JSON in .nebula/config.json');
      }
    } else {
      // Fallback: Try to infer template type from structure
      const inferredAnalysis = await inferTemplateType(repoService, owner, repo, rootFiles, ref);
      analysis.templateType = inferredAnalysis.type;
      analysis.editingCapabilities = inferredAnalysis.capabilities;
      analysis.recommendations = inferredAnalysis.recommendations;
    }

    // Analyze directory structure
    analysis.structure.hasComponents = rootFiles.some(f => 
      f.type === 'dir' && ['components', 'src', 'lib'].includes(f.name)
    );
    
    analysis.structure.hasAssets = rootFiles.some(f => 
      f.type === 'dir' && ['public', 'assets', 'static', 'images'].includes(f.name)
    );

    // Check for common content files
    const commonContentFiles = ['data.json', 'config.json', 'package.json'];
    analysis.structure.hasContentFiles = rootFiles.some(f => 
      f.type === 'file' && commonContentFiles.includes(f.name)
    );

    // Generate recommendations
    if (!analysis.structure.hasNebulaConfig) {
      analysis.recommendations.push({
        type: 'missing_config',
        priority: 'high',
        message: 'Add .nebula/config.json to enable web editing',
        action: 'Create configuration file with editing schema'
      });
    }

    if (!analysis.structure.hasAssets) {
      analysis.recommendations.push({
        type: 'missing_assets',
        priority: 'medium',
        message: 'Consider adding an assets directory for images and media',
        action: 'Create public/ or assets/ directory'
      });
    }

    return {
      success: true,
      analysis
    };

  } catch (error) {
    console.error('Template structure analysis error:', error);
    return {
      success: false,
      error: `Failed to analyze template: ${error.message}`
    };
  }
}

/**
 * Analyze editing capabilities based on template configuration
 */
function analyzeEditingCapabilities(config) {
  const capabilities = {
    supported: false,
    reason: null
  };

  const contentFiles = [];
  let schema = null;

  // Check if template has content files defined
  if (!config.contentFiles || !Array.isArray(config.contentFiles)) {
    capabilities.reason = 'No content files defined in configuration';
    return { capabilities, contentFiles, schema };
  }

  if (config.contentFiles.length === 0) {
    capabilities.reason = 'No editable content files found';
    return { capabilities, contentFiles, schema };
  }

  // Analyze each content file
  const editingFields = [];
  
  for (const contentFile of config.contentFiles) {
    if (!contentFile.schema) {
      capabilities.reason = `Content file ${contentFile.path} missing schema definition`;
      return { capabilities, contentFiles, schema };
    }

    const fileAnalysis = {
      path: contentFile.path,
      type: contentFile.type || 'unknown',
      editable: true,
      fields: analyzeSchemaFields(contentFile.schema)
    };

    contentFiles.push(fileAnalysis);
    editingFields.push(...fileAnalysis.fields);
  }

  // Generate editing schema
  schema = {
    version: config.version || '1.0',
    templateType: config.templateType,
    files: contentFiles,
    totalFields: editingFields.length,
    fieldTypes: [...new Set(editingFields.map(f => f.type))],
    complexity: calculateSchemaComplexity(editingFields)
  };

  capabilities.supported = true;
  capabilities.reason = `Template supports editing with ${editingFields.length} editable fields`;

  return { capabilities, contentFiles, schema };
}

/**
 * Analyze schema fields recursively
 */
function analyzeSchemaFields(schema, prefix = '') {
  const fields = [];

  for (const [key, definition] of Object.entries(schema)) {
    const fieldPath = prefix ? `${prefix}.${key}` : key;
    
    if (definition.type === 'object' && definition.properties) {
      // Nested object - recurse into properties
      fields.push({
        name: fieldPath,
        type: 'object',
        label: definition.label || key,
        required: definition.required || false,
        nested: true
      });
      
      fields.push(...analyzeSchemaFields(definition.properties, fieldPath));
    } else if (definition.type === 'array' && definition.items) {
      // Array field
      fields.push({
        name: fieldPath,
        type: 'array',
        label: definition.label || key,
        required: definition.required || false,
        itemType: definition.items.type || 'unknown'
      });
      
      // If array items have properties, analyze them too
      if (definition.items.properties) {
        fields.push(...analyzeSchemaFields(definition.items.properties, `${fieldPath}[]`));
      }
    } else {
      // Simple field
      fields.push({
        name: fieldPath,
        type: definition.type || 'string',
        label: definition.label || key,
        required: definition.required || false,
        validation: {
          maxLength: definition.maxLength,
          pattern: definition.pattern,
          min: definition.min,
          max: definition.max
        }
      });
    }
  }

  return fields;
}

/**
 * Calculate schema complexity score
 */
function calculateSchemaComplexity(fields) {
  let complexity = 0;
  
  for (const field of fields) {
    switch (field.type) {
      case 'string':
      case 'number':
      case 'boolean':
        complexity += 1;
        break;
      case 'text':
      case 'select':
        complexity += 2;
        break;
      case 'markdown':
      case 'image':
        complexity += 3;
        break;
      case 'array':
        complexity += 4;
        break;
      case 'object':
        complexity += 5;
        break;
      default:
        complexity += 2;
    }
  }

  if (complexity <= 10) return 'simple';
  if (complexity <= 25) return 'moderate';
  if (complexity <= 50) return 'complex';
  return 'very_complex';
}

/**
 * Infer template type from repository structure (fallback)
 */
async function inferTemplateType(repoService, owner, repo, rootFiles, ref) {
  const analysis = {
    type: 'unknown',
    capabilities: {
      supported: false,
      reason: 'No .nebula/config.json found - cannot determine editing capabilities'
    },
    recommendations: []
  };

  // Check for common patterns
  const hasDataJson = rootFiles.some(f => f.name === 'data.json');
  const hasContentDir = rootFiles.some(f => f.name === 'content' && f.type === 'dir');
  const hasPackageJson = rootFiles.some(f => f.name === 'package.json');
  const hasNextConfig = rootFiles.some(f => f.name.startsWith('next.config'));

  if (hasDataJson) {
    analysis.type = 'json';
    analysis.recommendations.push({
      type: 'inferred_json',
      priority: 'medium',
      message: 'Detected JSON-based template structure',
      action: 'Create .nebula/config.json to enable editing of data.json'
    });
  } else if (hasContentDir) {
    analysis.type = 'markdown';
    analysis.recommendations.push({
      type: 'inferred_markdown',
      priority: 'medium',
      message: 'Detected markdown-based template structure',
      action: 'Create .nebula/config.json to enable editing of markdown files'
    });
  } else if (hasNextConfig) {
    analysis.type = 'component';
    analysis.recommendations.push({
      type: 'inferred_component',
      priority: 'low',
      message: 'Detected Next.js component-based template',
      action: 'Add template configuration for component editing'
    });
  }

  return analysis;
}

/**
 * Check template compatibility with platform
 */
function checkTemplateCompatibility(config) {
  const compatibility = {
    version: config.version,
    supported: true,
    issues: []
  };

  // Check version compatibility
  if (!config.version) {
    compatibility.issues.push('No version specified in configuration');
  } else {
    const version = config.version.split('.').map(Number);
    if (version[0] > 1) {
      compatibility.supported = false;
      compatibility.issues.push(`Version ${config.version} not supported (max: 1.x)`);
    }
  }

  // Check required fields
  const requiredFields = ['templateType', 'contentFiles'];
  for (const field of requiredFields) {
    if (!config[field]) {
      compatibility.supported = false;
      compatibility.issues.push(`Missing required field: ${field}`);
    }
  }

  // Check template type support
  const supportedTypes = ['json', 'markdown', 'hybrid'];
  if (config.templateType && !supportedTypes.includes(config.templateType)) {
    compatibility.supported = false;
    compatibility.issues.push(`Template type '${config.templateType}' not supported`);
  }

  return compatibility;
}