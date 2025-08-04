/**
 * Template Compatibility Validation Example
 * Demonstrates how to use the template validation system
 * Implements requirements 8.1, 8.2, and 8.4
 */

import { RepositoryService } from '../repository-service.js';
import { TemplateCompatibilityValidationSystem } from '../template-compatibility-validator.js';

/**
 * Example: Validate a template repository
 */
export async function validateTemplateExample() {
  console.log('=== Template Compatibility Validation Example ===\n');

  // Initialize services
  const repositoryService = new RepositoryService();
  const validationSystem = new TemplateCompatibilityValidationSystem(repositoryService);

  // Example 1: Validate a well-structured template
  console.log('1. Validating a well-structured template...');
  try {
    const result = await validationSystem.validateTemplateCompatibility(
      'template-owner',
      'portfolio-template',
      null, // Use default branch
      {
        generateFeedback: true,
        interactive: true
      }
    );

    if (result.success) {
      console.log('✅ Template validation successful!');
      console.log(`   Score: ${result.result.validation.score}/${result.result.validation.maxScore}`);
      console.log(`   Compatible: ${result.result.compatibility.platformCompatible}`);
      console.log(`   Template Type: ${result.result.compatibility.templateType}`);
      console.log(`   Features: ${result.result.compatibility.supportedFeatures.join(', ')}`);
      
      if (result.result.validation.errors.length > 0) {
        console.log(`   Errors: ${result.result.validation.errors.length}`);
      }
      if (result.result.validation.warnings.length > 0) {
        console.log(`   Warnings: ${result.result.validation.warnings.length}`);
      }
    } else {
      console.log('❌ Template validation failed:', result.error);
    }
  } catch (error) {
    console.log('❌ Validation error:', error.message);
  }

  console.log('\n' + '='.repeat(50) + '\n');

  // Example 2: Validate template structure only
  console.log('2. Validating template structure...');
  try {
    const structureResult = await validationSystem.validateTemplateStructure(
      'template-owner',
      'portfolio-template'
    );

    if (structureResult.success) {
      console.log('✅ Structure validation passed!');
      console.log(`   Total files: ${structureResult.structure.totalFiles}`);
      console.log(`   Total directories: ${structureResult.structure.totalDirectories}`);
      console.log(`   Has .nebula directory: ${structureResult.structure.hasNebulaDirectory}`);
      console.log(`   Has components directory: ${structureResult.structure.hasComponentsDirectory}`);
      console.log(`   Has package.json: ${structureResult.structure.hasPackageJson}`);
    } else {
      console.log('❌ Structure validation failed:', structureResult.error);
      if (structureResult.structure?.issues) {
        console.log('   Issues:');
        structureResult.structure.issues.forEach(issue => {
          console.log(`   - ${issue.type.toUpperCase()}: ${issue.message}`);
        });
      }
    }
  } catch (error) {
    console.log('❌ Structure validation error:', error.message);
  }

  console.log('\n' + '='.repeat(50) + '\n');

  // Example 3: Validate required files
  console.log('3. Validating required files...');
  try {
    const filesResult = await validationSystem.validateRequiredFiles(
      'template-owner',
      'portfolio-template'
    );

    if (filesResult.success) {
      console.log('✅ Required files validation passed!');
      console.log(`   Required files present: ${filesResult.files.summary.requiredPresent}/${filesResult.files.summary.requiredCount}`);
      console.log(`   Recommended files present: ${filesResult.files.summary.recommendedPresent}/${filesResult.files.summary.recommendedCount}`);
    } else {
      console.log('❌ Required files validation failed:', filesResult.error);
    }

    if (filesResult.files?.issues?.length > 0) {
      console.log('   Issues:');
      filesResult.files.issues.forEach(issue => {
        console.log(`   - ${issue.type.toUpperCase()}: ${issue.message}`);
        if (issue.suggestion) {
          console.log(`     Suggestion: ${issue.suggestion}`);
        }
      });
    }
  } catch (error) {
    console.log('❌ Files validation error:', error.message);
  }

  console.log('\n' + '='.repeat(50) + '\n');

  // Example 4: Generate creator feedback
  console.log('4. Generating creator feedback...');
  try {
    const feedbackResult = await validationSystem.generateCreatorFeedback(
      'template-owner',
      'portfolio-template',
      null,
      { interactive: true }
    );

    if (feedbackResult.success) {
      console.log('✅ Feedback generated successfully!');
      const feedback = feedbackResult.feedback;
      
      console.log(`   Status: ${feedback.summary.status}`);
      console.log(`   Score: ${feedback.summary.score.percentage}% (${feedback.summary.score.grade})`);
      console.log(`   Issues: ${feedback.summary.issueCount.total} total`);
      console.log(`     - Errors: ${feedback.summary.issueCount.errors}`);
      console.log(`     - Warnings: ${feedback.summary.issueCount.warnings}`);
      console.log(`     - Suggestions: ${feedback.summary.issueCount.suggestions}`);

      if (feedback.sections.overview.strengths.length > 0) {
        console.log('   Strengths:');
        feedback.sections.overview.strengths.forEach(strength => {
          console.log(`     - ${strength}`);
        });
      }

      if (feedback.sections.overview.weaknesses.length > 0) {
        console.log('   Weaknesses:');
        feedback.sections.overview.weaknesses.forEach(weakness => {
          console.log(`     - ${weakness}`);
        });
      }
    } else {
      console.log('❌ Feedback generation failed:', feedbackResult.error);
    }
  } catch (error) {
    console.log('❌ Feedback generation error:', error.message);
  }

  console.log('\n' + '='.repeat(50) + '\n');
}

/**
 * Example: Create a valid template configuration
 */
export function createValidTemplateConfigExample() {
  console.log('=== Valid Template Configuration Example ===\n');

  const validConfig = {
    version: '1.0.0',
    name: 'Modern Portfolio Template',
    description: 'A clean, modern portfolio template with dark theme',
    templateType: 'json',
    contentFiles: [
      {
        path: 'data.json',
        type: 'json',
        schema: {
          personalInfo: {
            type: 'object',
            label: 'Personal Information',
            properties: {
              name: {
                type: 'string',
                label: 'Full Name',
                required: true,
                maxLength: 100
              },
              title: {
                type: 'string',
                label: 'Professional Title',
                maxLength: 150
              },
              email: {
                type: 'email',
                label: 'Email Address',
                required: true
              },
              avatar: {
                type: 'image',
                label: 'Profile Photo',
                maxFileSize: '2MB',
                allowedTypes: ['image/jpeg', 'image/png', 'image/webp']
              }
            }
          },
          about: {
            type: 'markdown',
            label: 'About Me',
            required: true,
            description: 'Tell visitors about yourself and your background'
          },
          skills: {
            type: 'array',
            label: 'Skills',
            items: {
              type: 'object',
              properties: {
                name: {
                  type: 'string',
                  label: 'Skill Name',
                  required: true
                },
                level: {
                  type: 'select',
                  label: 'Proficiency Level',
                  options: [
                    { value: 'beginner', label: 'Beginner' },
                    { value: 'intermediate', label: 'Intermediate' },
                    { value: 'advanced', label: 'Advanced' },
                    { value: 'expert', label: 'Expert' }
                  ]
                },
                years: {
                  type: 'number',
                  label: 'Years of Experience',
                  min: 0,
                  max: 50
                }
              }
            },
            maxItems: 20
          },
          projects: {
            type: 'array',
            label: 'Projects',
            items: {
              type: 'object',
              properties: {
                title: {
                  type: 'string',
                  label: 'Project Title',
                  required: true,
                  maxLength: 100
                },
                description: {
                  type: 'text',
                  label: 'Project Description',
                  maxLength: 500
                },
                image: {
                  type: 'image',
                  label: 'Project Screenshot',
                  maxFileSize: '5MB'
                },
                url: {
                  type: 'url',
                  label: 'Project URL'
                },
                github: {
                  type: 'url',
                  label: 'GitHub Repository'
                },
                technologies: {
                  type: 'array',
                  label: 'Technologies Used',
                  items: {
                    type: 'string'
                  }
                },
                featured: {
                  type: 'boolean',
                  label: 'Featured Project'
                },
                completedDate: {
                  type: 'date',
                  label: 'Completion Date'
                }
              }
            },
            maxItems: 10
          },
          contact: {
            type: 'object',
            label: 'Contact Information',
            properties: {
              email: {
                type: 'email',
                label: 'Contact Email'
              },
              phone: {
                type: 'string',
                label: 'Phone Number',
                pattern: '^[+]?[0-9\\s\\-\\(\\)]+$'
              },
              location: {
                type: 'string',
                label: 'Location'
              },
              social: {
                type: 'object',
                label: 'Social Media',
                properties: {
                  linkedin: {
                    type: 'url',
                    label: 'LinkedIn Profile'
                  },
                  twitter: {
                    type: 'url',
                    label: 'Twitter Profile'
                  },
                  github: {
                    type: 'url',
                    label: 'GitHub Profile'
                  }
                }
              }
            }
          }
        }
      }
    ],
    previewComponent: 'ModernPortfolioTemplate',
    editableFields: [
      'personalInfo',
      'about',
      'skills',
      'projects',
      'contact'
    ],
    assets: {
      allowedTypes: [
        'image/jpeg',
        'image/png',
        'image/webp',
        'image/gif'
      ],
      maxSize: '5MB',
      paths: [
        'public/images',
        'assets/images'
      ]
    }
  };

  console.log('Valid template configuration:');
  console.log(JSON.stringify(validConfig, null, 2));

  return validConfig;
}

/**
 * Example: Common validation errors and how to fix them
 */
export function commonValidationErrorsExample() {
  console.log('=== Common Validation Errors and Solutions ===\n');

  const examples = [
    {
      error: 'Missing required file: .nebula/config.json',
      solution: 'Create a .nebula directory and add a config.json file with your template configuration',
      example: {
        directory: '.nebula/',
        file: 'config.json',
        content: {
          version: '1.0.0',
          templateType: 'json',
          contentFiles: []
        }
      }
    },
    {
      error: 'Invalid JSON in .nebula/config.json',
      solution: 'Fix JSON syntax errors in your configuration file',
      example: {
        wrong: '{ "version": "1.0.0", "templateType": "json" }', // Missing comma
        correct: '{ "version": "1.0.0", "templateType": "json", "contentFiles": [] }'
      }
    },
    {
      error: 'Unsupported template type: custom',
      solution: 'Use one of the supported template types: json, markdown, hybrid',
      example: {
        wrong: { templateType: 'custom' },
        correct: { templateType: 'json' }
      }
    },
    {
      error: 'Missing required configuration field: contentFiles',
      solution: 'Add a contentFiles array to define your template\'s editable content',
      example: {
        contentFiles: [
          {
            path: 'data.json',
            type: 'json',
            schema: {
              title: { type: 'string', required: true }
            }
          }
        ]
      }
    },
    {
      error: 'Unsupported field type: custom_type',
      solution: 'Use supported field types: string, text, markdown, number, boolean, select, array, object, image, date, url, email',
      example: {
        wrong: { type: 'custom_type' },
        correct: { type: 'string' }
      }
    },
    {
      error: 'Content file not found: data.json',
      solution: 'Create the content file or update the path in your configuration',
      example: {
        action: 'Create data.json with sample content',
        content: {
          title: 'My Portfolio',
          description: 'Welcome to my portfolio'
        }
      }
    }
  ];

  examples.forEach((example, index) => {
    console.log(`${index + 1}. Error: ${example.error}`);
    console.log(`   Solution: ${example.solution}`);
    if (example.example) {
      console.log('   Example:');
      console.log('   ' + JSON.stringify(example.example, null, 2).replace(/\n/g, '\n   '));
    }
    console.log('');
  });
}

/**
 * Example: Template validation workflow
 */
export async function templateValidationWorkflowExample() {
  console.log('=== Template Validation Workflow Example ===\n');

  const steps = [
    {
      step: 1,
      title: 'Structure Validation',
      description: 'Check if repository has required directory structure',
      checks: [
        'Repository is not empty',
        '.nebula directory exists',
        'Basic file structure is present'
      ]
    },
    {
      step: 2,
      title: 'Required Files Validation',
      description: 'Verify presence of essential template files',
      checks: [
        '.nebula/config.json exists (required)',
        '.nebula/preview.png exists (recommended)',
        'README.md exists (recommended)'
      ]
    },
    {
      step: 3,
      title: 'Configuration Validation',
      description: 'Parse and validate template configuration',
      checks: [
        'config.json has valid JSON syntax',
        'Required fields are present (version, templateType, contentFiles)',
        'Template type is supported',
        'Configuration structure is valid'
      ]
    },
    {
      step: 4,
      title: 'Schema Validation',
      description: 'Validate content file schema definitions',
      checks: [
        'All field types are supported',
        'Schema structure is correct',
        'Validation rules are properly defined',
        'Nested objects and arrays are valid'
      ]
    },
    {
      step: 5,
      title: 'Content Files Validation',
      description: 'Check content files specified in configuration',
      checks: [
        'Content files exist at specified paths',
        'File formats are valid (JSON, Markdown)',
        'Content matches expected structure'
      ]
    },
    {
      step: 6,
      title: 'Compatibility Assessment',
      description: 'Assess overall platform compatibility',
      checks: [
        'Template meets minimum quality threshold',
        'No critical errors present',
        'Supported features are identified',
        'Limitations are documented'
      ]
    },
    {
      step: 7,
      title: 'Feedback Generation',
      description: 'Generate actionable feedback for template creators',
      checks: [
        'Issues are categorized by severity',
        'Specific suggestions are provided',
        'Code examples are included where helpful',
        'Next steps are clearly outlined'
      ]
    }
  ];

  console.log('Template validation follows these steps:\n');

  steps.forEach(step => {
    console.log(`Step ${step.step}: ${step.title}`);
    console.log(`Description: ${step.description}`);
    console.log('Checks performed:');
    step.checks.forEach(check => {
      console.log(`  ✓ ${check}`);
    });
    console.log('');
  });

  console.log('Each step builds on the previous ones, ensuring comprehensive validation.');
  console.log('If critical errors are found early, validation may stop to prevent cascading issues.');
}

// Export all examples for easy usage
export const examples = {
  validateTemplate: validateTemplateExample,
  createValidConfig: createValidTemplateConfigExample,
  commonErrors: commonValidationErrorsExample,
  workflow: templateValidationWorkflowExample
};

export default examples;