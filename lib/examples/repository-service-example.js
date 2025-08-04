/**
 * Example usage of RepositoryService
 * This demonstrates how to use the core repository operations
 */

import { RepositoryService } from '../repository-service.js';

async function exampleUsage() {
  // Initialize service with GitHub access token
  const accessToken = process.env.GITHUB_ACCESS_TOKEN;
  const service = new RepositoryService(accessToken);

  try {
    // Example 1: Fork a template repository
    console.log('1. Forking template repository...');
    const forkResult = await service.forkRepository(
      'template-owner',
      'portfolio-template',
      'my-portfolio'
    );
    
    if (forkResult.success) {
      console.log('✅ Fork created:', forkResult.repository.fullName);
      
      // Example 2: Verify the fork
      console.log('2. Verifying fork...');
      const verifyResult = await service.verifyFork(
        forkResult.repository.owner,
        forkResult.repository.name
      );
      
      if (verifyResult.verified) {
        console.log('✅ Fork verified:', verifyResult.repository.fullName);
        
        // Example 3: Get repository structure
        console.log('3. Getting repository structure...');
        const structureResult = await service.getRepositoryStructure(
          forkResult.repository.owner,
          forkResult.repository.name
        );
        
        if (structureResult.success) {
          console.log('✅ Repository structure retrieved:');
          structureResult.structure.contents.forEach(item => {
            console.log(`  ${item.type === 'dir' ? '📁' : '📄'} ${item.name}`);
          });
          
          // Example 4: Get file content
          console.log('4. Getting file content...');
          const fileResult = await service.getFileContent(
            forkResult.repository.owner,
            forkResult.repository.name,
            'data.json'
          );
          
          if (fileResult.success) {
            console.log('✅ File content retrieved:', fileResult.file.name);
            console.log('   Content preview:', fileResult.file.content.substring(0, 100) + '...');
            
            // Example 5: Update file content
            console.log('5. Updating file content...');
            const updatedContent = JSON.stringify({
              ...JSON.parse(fileResult.file.content),
              lastUpdated: new Date().toISOString(),
              updatedBy: 'RepositoryService Example'
            }, null, 2);
            
            const updateResult = await service.updateFileContent(
              forkResult.repository.owner,
              forkResult.repository.name,
              'data.json',
              updatedContent,
              'Update portfolio data via RepositoryService',
              null,
              fileResult.file.sha
            );
            
            if (updateResult.success) {
              console.log('✅ File updated successfully');
              console.log('   Commit SHA:', updateResult.commit.sha);
              console.log('   Commit URL:', updateResult.commit.url);
            } else {
              console.log('❌ Failed to update file:', updateResult.error);
            }
          } else {
            console.log('❌ Failed to get file content:', fileResult.error);
          }
        } else {
          console.log('❌ Failed to get repository structure:', structureResult.error);
        }
      } else {
        console.log('❌ Failed to verify fork:', verifyResult.error);
      }
    } else {
      console.log('❌ Failed to fork repository:', forkResult.error);
    }

    // Example 6: Create a new file
    console.log('6. Creating new file...');
    const newFileContent = JSON.stringify({
      type: 'metadata',
      createdBy: 'RepositoryService',
      createdAt: new Date().toISOString(),
      version: '1.0.0'
    }, null, 2);

    const createResult = await service.createFile(
      forkResult.repository.owner,
      forkResult.repository.name,
      'metadata.json',
      newFileContent,
      'Add metadata file via RepositoryService'
    );

    if (createResult.success) {
      console.log('✅ New file created successfully');
      console.log('   File path:', createResult.commit.file.path);
    } else {
      console.log('❌ Failed to create file:', createResult.error);
    }

  } catch (error) {
    console.error('❌ Example execution failed:', error.message);
  }
}

// Helper function to demonstrate file type detection
function demonstrateFileTypeDetection(service) {
  console.log('\n📋 File Type Detection Examples:');
  
  const testFiles = [
    'script.js',
    'component.jsx', 
    'data.json',
    'README.md',
    'styles.css',
    'image.png',
    'document.pdf',
    'unknown.xyz'
  ];

  testFiles.forEach(filename => {
    const type = service.getFileType(filename);
    const editable = service.isEditableFile(filename);
    console.log(`  ${filename} -> ${type} ${editable ? '(editable)' : '(read-only)'}`);
  });
}

// Export for use in other modules
export { exampleUsage, demonstrateFileTypeDetection };

// Run example if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  exampleUsage().catch(console.error);
}