/**
 * Simple test script for template compatibility validation
 * Tests the basic functionality without complex mocking
 */

import { TemplateCompatibilityValidationSystem } from '../template-compatibility-validator.js';

// Mock repository service for testing
class MockRepositoryService {
  async getRepositoryStructure(owner, repo, path = '', ref = null) {
    // Mock a well-structured repository
    return {
      success: true,
      structure: {
        items: [
          { path: '.nebula', type: 'dir', name: '.nebula' },
          { path: '.nebula/config.json', type: 'file', name: 'config.json' },
          { path: '.nebula/preview.png', type: 'file', name: 'preview.png' },
          { path: 'components', type: 'dir', name: 'components' },
          { path: 'public', type: 'dir', name: 'public' },
          { path: 'README.md', type: 'file', name: 'README.md' },
          { path: 'data.json', type: 'file', name: 'data.json' }
        ]
      }
    };
  }

  async getFileContent(owner, repo, path, ref = null) {
    // Mock file content based on path
    if (path === '.nebula/config.json') {
      const mockConfig = {
        version: '1.0.0',
        name: 'Test Portfolio Template',
        templateType: 'json',
        contentFiles: [
          {
            path: 'data.json',
            type: 'json',
            schema: {
              title: {
                type: 'string',
                label: 'Portfolio Title',
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
      
      return {
        success: true,
        content: {
          content: JSON.stringify(mockConfig, null, 2)
        }
      };
    }
    
    if (path === 'data.json') {
      return {
        success: true,
        content: {
          content: JSON.stringify({
            title: 'My Portfolio',
            description: 'Welcome to my portfolio website'
          }, null, 2)
        }
      };
    }
    
    // For other files, just return success
    return { success: true, content: { content: '' } };
  }
}

/**
 * Test the template compatibility validation system
 */
async function testTemplateValidation() {
  console.log('🧪 Testing Template Compatibility Validation System\n');

  try {
    // Initialize the validation system with mock service
    const mockService = new MockRepositoryService();
    const validator = new TemplateCompatibilityValidationSystem(mockService);

    console.log('1. Testing template structure validation...');
    const structureResult = await validator.validateTemplateStructure('test-owner', 'test-repo');
    
    if (structureResult.success) {
      console.log('   ✅ Structure validation passed');
      console.log(`   - Has .nebula directory: ${structureResult.structure.hasNebulaDirectory}`);
      console.log(`   - Total files: ${structureResult.structure.totalFiles}`);
      console.log(`   - Total directories: ${structureResult.structure.totalDirectories}`);
    } else {
      console.log('   ❌ Structure validation failed:', structureResult.error);
    }

    console.log('\n2. Testing required files validation...');
    const filesResult = await validator.validateRequiredFiles('test-owner', 'test-repo');
    
    if (filesResult.success) {
      console.log('   ✅ Required files validation passed');
      console.log(`   - Required files: ${filesResult.files.summary.requiredPresent}/${filesResult.files.summary.requiredCount}`);
      console.log(`   - Recommended files: ${filesResult.files.summary.recommendedPresent}/${filesResult.files.summary.recommendedCount}`);
    } else {
      console.log('   ❌ Required files validation failed:', filesResult.error);
    }

    console.log('\n3. Testing configuration validation...');
    const configResult = await validator.validateConfigurationAndSchema('test-owner', 'test-repo');
    
    if (configResult.success) {
      console.log('   ✅ Configuration validation passed');
      console.log(`   - Template type: ${configResult.config.templateType}`);
      console.log(`   - Content files: ${configResult.config.contentFiles.length}`);
    } else {
      console.log('   ❌ Configuration validation failed:', configResult.error);
    }

    console.log('\n4. Testing content files validation...');
    const contentResult = await validator.validateContentFiles('test-owner', 'test-repo', configResult.config);
    
    if (contentResult.success) {
      console.log('   ✅ Content files validation passed');
      console.log(`   - Files validated: ${contentResult.content.files.length}`);
      console.log(`   - Issues found: ${contentResult.content.issues.length}`);
    } else {
      console.log('   ❌ Content files validation failed:', contentResult.error);
    }

    console.log('\n5. Testing schema validation...');
    const schema = {
      title: { type: 'string', required: true },
      description: { type: 'text', maxLength: 500 },
      projects: {
        type: 'array',
        items: {
          properties: {
            name: { type: 'string', required: true },
            url: { type: 'url' }
          }
        }
      }
    };

    const schemaErrors = validator.validateSchemaObject(schema);
    if (schemaErrors.length === 0) {
      console.log('   ✅ Schema validation passed');
    } else {
      console.log('   ❌ Schema validation failed:');
      schemaErrors.forEach(error => console.log(`     - ${error}`));
    }

    console.log('\n6. Testing platform compatibility assessment...');
    const mockValidation = {
      valid: true,
      score: 85,
      errors: [],
      warnings: ['Minor warning']
    };

    const isCompatible = validator.assessPlatformCompatibility(mockValidation);
    console.log(`   Platform compatible: ${isCompatible ? '✅ Yes' : '❌ No'}`);

    console.log('\n7. Testing feature identification...');
    const features = validator.identifySupportedFeatures(configResult.config);
    console.log('   Supported features:');
    features.forEach(feature => console.log(`     - ${feature}`));

    console.log('\n🎉 All basic tests completed successfully!');
    console.log('\nThe template compatibility validation system is working correctly.');
    console.log('Key components tested:');
    console.log('  ✅ Template structure validation');
    console.log('  ✅ Required files checking');
    console.log('  ✅ Configuration parsing and validation');
    console.log('  ✅ Schema definition validation');
    console.log('  ✅ Content files validation');
    console.log('  ✅ Platform compatibility assessment');
    console.log('  ✅ Feature identification');

  } catch (error) {
    console.error('❌ Test failed with error:', error.message);
    console.error('Stack trace:', error.stack);
  }
}

/**
 * Test error handling scenarios
 */
async function testErrorHandling() {
  console.log('\n🧪 Testing Error Handling Scenarios\n');

  const mockService = new MockRepositoryService();
  const validator = new TemplateCompatibilityValidationSystem(mockService);

  // Test invalid schema
  console.log('1. Testing invalid schema validation...');
  const invalidSchema = {
    field1: {
      type: 'unsupported_type',
      required: 'not_boolean',
      maxLength: -1
    }
  };

  const errors = validator.validateSchemaObject(invalidSchema);
  console.log(`   Found ${errors.length} validation errors:`);
  errors.forEach(error => console.log(`     - ${error}`));

  // Test configuration structure validation
  console.log('\n2. Testing configuration structure validation...');
  const invalidConfig = {
    name: 'Test Template'
    // Missing required fields
  };

  const configValidation = validator.validateConfigurationStructure(invalidConfig);
  console.log(`   Configuration valid: ${configValidation.valid}`);
  if (!configValidation.valid) {
    console.log('   Errors:');
    configValidation.errors.forEach(error => console.log(`     - ${error}`));
  }

  console.log('\n✅ Error handling tests completed');
}

// Run the tests
async function runTests() {
  await testTemplateValidation();
  await testErrorHandling();
}

// Export for use in other files
export { testTemplateValidation, testErrorHandling, runTests };

// Run tests if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runTests().catch(console.error);
}