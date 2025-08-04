# Template Compatibility Validation System

This document describes the template compatibility validation system that ensures portfolio templates meet platform requirements and provide a good user experience.

## Overview

The Template Compatibility Validation System implements requirements 8.1, 8.2, and 8.4 by providing:

1. **Template Structure Validation** - Ensures repositories have the required directory structure and files
2. **Required File Checking** - Verifies presence of essential files like config.json and preview.png
3. **Schema Validation** - Validates content file schema definitions for proper editing interface generation
4. **Template Creator Feedback** - Provides actionable feedback and guidance for template creators

## Architecture

The system consists of several interconnected components:

```
TemplateCompatibilityValidationSystem
├── TemplateCompatibilityValidator (existing)
├── TemplateAnalysisService (existing)
├── TemplateFeedbackSystem (existing)
└── New validation methods
```

## Core Components

### 1. TemplateCompatibilityValidationSystem

Main orchestrator that coordinates all validation activities.

```javascript
import { TemplateCompatibilityValidationSystem } from './lib/template-compatibility-validator.js';

const validator = new TemplateCompatibilityValidationSystem(repositoryService);
const result = await validator.validateTemplateCompatibility('owner', 'repo');
```

### 2. Structure Validation

Validates repository structure and organization:

- Checks for required `.nebula` directory
- Verifies repository is not empty
- Analyzes file types and directory structure
- Identifies standard patterns (components/, public/, etc.)

### 3. Required Files Validation

Ensures essential files are present:

**Required Files:**
- `.nebula/config.json` - Template configuration (critical)

**Recommended Files:**
- `.nebula/preview.png` - Template preview image
- `README.md` - Documentation and usage instructions

### 4. Configuration Validation

Parses and validates the template configuration file:

```json
{
  "version": "1.0.0",
  "name": "Portfolio Template",
  "templateType": "json",
  "contentFiles": [
    {
      "path": "data.json",
      "type": "json",
      "schema": {
        "title": {
          "type": "string",
          "label": "Portfolio Title",
          "required": true
        }
      }
    }
  ]
}
```

### 5. Schema Validation

Validates schema definitions for content files:

**Supported Field Types:**
- `string` - Text input
- `text` - Textarea
- `markdown` - Markdown editor
- `number` - Number input
- `boolean` - Checkbox
- `select` - Dropdown selection
- `array` - Array editor
- `object` - Object editor
- `image` - Image upload
- `date` - Date picker
- `url` - URL input
- `email` - Email input

## Usage Examples

### Basic Validation

```javascript
import { TemplateCompatibilityValidationSystem } from './lib/template-compatibility-validator.js';
import { RepositoryService } from './lib/repository-service.js';

const repositoryService = new RepositoryService();
const validator = new TemplateCompatibilityValidationSystem(repositoryService);

// Validate a template
const result = await validator.validateTemplateCompatibility(
  'template-owner',
  'portfolio-template',
  null, // branch/ref
  {
    generateFeedback: true,
    interactive: true
  }
);

if (result.success) {
  console.log('Template is valid!');
  console.log(`Score: ${result.result.validation.score}/${result.result.validation.maxScore}`);
  console.log(`Compatible: ${result.result.compatibility.platformCompatible}`);
} else {
  console.error('Validation failed:', result.error);
}
```

### Structure Validation Only

```javascript
const structureResult = await validator.validateTemplateStructure('owner', 'repo');

if (structureResult.success) {
  console.log('Structure validation passed');
  console.log(`Has .nebula directory: ${structureResult.structure.hasNebulaDirectory}`);
  console.log(`Total files: ${structureResult.structure.totalFiles}`);
}
```

### Generate Creator Feedback

```javascript
const feedbackResult = await validator.generateCreatorFeedback(
  'owner', 
  'repo',
  null,
  { interactive: true }
);

if (feedbackResult.success) {
  const feedback = feedbackResult.feedback;
  console.log(`Status: ${feedback.summary.status}`);
  console.log(`Score: ${feedback.summary.score.percentage}%`);
  console.log(`Issues: ${feedback.summary.issueCount.total}`);
}
```

## API Endpoints

### GET /api/templates/[owner]/[repo]/validate

Validates template compatibility and returns detailed results.

**Query Parameters:**
- `ref` - Git reference (branch/commit)
- `feedback` - Generate creator feedback (true/false)
- `interactive` - Include interactive elements (true/false)

**Response:**
```json
{
  "success": true,
  "validation": {
    "valid": true,
    "compatibility": {
      "platformCompatible": true,
      "templateType": "json",
      "supportedFeatures": ["json template type", "2 content files"],
      "limitations": []
    },
    "score": 85,
    "maxScore": 100,
    "issues": {
      "errors": [],
      "warnings": ["Missing preview image"],
      "suggestions": ["Add README file"]
    }
  },
  "feedback": {
    "summary": {
      "status": "good",
      "score": { "percentage": 85, "grade": "B" }
    }
  }
}
```

### POST /api/templates/[owner]/[repo]/validate

Validates template with custom options.

**Request Body:**
```json
{
  "ref": "main",
  "options": {
    "generateFeedback": true,
    "interactive": true
  },
  "validationRules": {
    "customRule": "value"
  }
}
```

## Validation Workflow

The validation system follows a structured workflow:

1. **Structure Validation** - Check repository organization
2. **Required Files** - Verify essential files exist
3. **Configuration** - Parse and validate config.json
4. **Schema Validation** - Validate content file schemas
5. **Content Files** - Check content files exist and are valid
6. **Compatibility Assessment** - Determine platform compatibility
7. **Feedback Generation** - Create actionable feedback for creators

## Error Handling

The system provides detailed error information:

### Common Errors

1. **Missing Configuration**
   ```
   Error: Template missing required .nebula/config.json file
   Solution: Create .nebula/config.json with template configuration
   ```

2. **Invalid JSON**
   ```
   Error: Invalid JSON in .nebula/config.json
   Solution: Fix JSON syntax errors in configuration file
   ```

3. **Unsupported Template Type**
   ```
   Error: Unsupported template type: custom
   Solution: Use supported types: json, markdown, hybrid
   ```

4. **Invalid Schema**
   ```
   Error: Unsupported field type 'custom_type'
   Solution: Use supported types: string, text, markdown, etc.
   ```

### Error Response Format

```json
{
  "success": false,
  "error": "Template validation failed",
  "details": {
    "type": "ConfigurationError",
    "suggestion": "Fix configuration file syntax",
    "retryable": true
  }
}
```

## Feedback System

The feedback system provides comprehensive guidance for template creators:

### Feedback Categories

1. **Critical Issues** - Must be fixed for template to work
2. **Warnings** - Should be fixed for better quality
3. **Suggestions** - Nice-to-have improvements

### Feedback Structure

```json
{
  "summary": {
    "status": "needs-work",
    "score": { "percentage": 65, "grade": "D" },
    "issueCount": { "errors": 2, "warnings": 3, "suggestions": 1 }
  },
  "sections": {
    "issues": {
      "critical": [
        {
          "message": "Missing required file: .nebula/config.json",
          "suggestion": "Create configuration file",
          "actionGuide": {
            "title": "Create Template Configuration",
            "steps": ["Create .nebula directory", "Add config.json file"]
          }
        }
      ]
    },
    "recommendations": {
      "quickWins": [
        {
          "title": "Add Preview Image",
          "effort": "low",
          "impact": "medium",
          "timeEstimate": "15 minutes"
        }
      ]
    },
    "nextSteps": {
      "steps": [
        {
          "priority": 1,
          "title": "Fix Critical Issues",
          "estimatedTime": "30 minutes"
        }
      ]
    }
  }
}
```

## Testing

The system includes comprehensive tests:

```javascript
// Run basic functionality tests
import { runTests } from './lib/examples/test-template-validation.js';
await runTests();

// Run unit tests
npm test lib/__tests__/template-compatibility-validator.test.js
```

## Configuration Examples

### Valid Template Configuration

```json
{
  "version": "1.0.0",
  "name": "Modern Portfolio Template",
  "description": "A clean, modern portfolio template",
  "templateType": "json",
  "contentFiles": [
    {
      "path": "data.json",
      "type": "json",
      "schema": {
        "personalInfo": {
          "type": "object",
          "label": "Personal Information",
          "properties": {
            "name": {
              "type": "string",
              "label": "Full Name",
              "required": true,
              "maxLength": 100
            },
            "email": {
              "type": "email",
              "label": "Email Address",
              "required": true
            }
          }
        },
        "projects": {
          "type": "array",
          "label": "Projects",
          "items": {
            "type": "object",
            "properties": {
              "title": {
                "type": "string",
                "label": "Project Title",
                "required": true
              },
              "url": {
                "type": "url",
                "label": "Project URL"
              }
            }
          },
          "maxItems": 10
        }
      }
    }
  ],
  "previewComponent": "ModernPortfolioTemplate",
  "assets": {
    "allowedTypes": ["image/jpeg", "image/png", "image/webp"],
    "maxSize": "5MB",
    "paths": ["public/images"]
  }
}
```

## Best Practices

### For Template Creators

1. **Always include required files**
   - `.nebula/config.json` (required)
   - `.nebula/preview.png` (recommended)
   - `README.md` (recommended)

2. **Use clear, descriptive labels**
   ```json
   {
     "name": {
       "type": "string",
       "label": "Full Name",
       "description": "Your full name as you want it displayed"
     }
   }
   ```

3. **Provide validation constraints**
   ```json
   {
     "email": {
       "type": "email",
       "label": "Email Address",
       "required": true
     },
     "bio": {
       "type": "text",
       "label": "Biography",
       "maxLength": 500
     }
   }
   ```

4. **Organize content logically**
   ```json
   {
     "personalInfo": {
       "type": "object",
       "label": "Personal Information",
       "properties": { ... }
     },
     "projects": {
       "type": "array",
       "label": "Projects",
       "items": { ... }
     }
   }
   ```

### For Platform Integration

1. **Handle validation errors gracefully**
2. **Provide clear error messages to users**
3. **Cache validation results when appropriate**
4. **Use validation results to guide user experience**

## Troubleshooting

### Common Issues

1. **Validation fails with "Repository not found"**
   - Check repository exists and is accessible
   - Verify authentication if repository is private

2. **Configuration parsing fails**
   - Validate JSON syntax in .nebula/config.json
   - Check for missing required fields

3. **Schema validation errors**
   - Ensure all field types are supported
   - Check nested object and array structures

4. **Content file validation fails**
   - Verify file paths in configuration match actual files
   - Check file formats (JSON syntax, etc.)

### Debug Mode

Enable detailed logging:

```javascript
const validator = new TemplateCompatibilityValidationSystem(repositoryService);
// Validation will log detailed information to console
```

## Contributing

To extend the validation system:

1. Add new validation rules to the appropriate methods
2. Update supported schema types in `platformRequirements`
3. Add corresponding tests
4. Update documentation

## Related Documentation

- [Template Creation Guide](./TEMPLATE_CREATION.md)
- [Schema Reference](./SCHEMA_REFERENCE.md)
- [API Documentation](./API_REFERENCE.md)
- [Error Handling Guide](./ERROR_HANDLING.md)