/**
 * Simple test script to verify templates functionality
 */

async function testTemplatesAPI() {
  try {
    console.log('Testing templates API...');
    
    const response = await fetch('http://localhost:3000/api/templates');
    const result = await response.json();
    
    if (result.success) {
      console.log('✅ Templates API working');
      console.log(`Found ${result.data.length} templates`);
      result.data.forEach(template => {
        console.log(`  - ${template.name} (${template.id})`);
      });
    } else {
      console.log('❌ Templates API failed:', result.error);
    }
  } catch (error) {
    console.log('❌ Templates API error:', error.message);
  }
}

async function testSessionAPI() {
  try {
    console.log('\nTesting session API...');
    
    const response = await fetch('http://localhost:3000/api/auth/session');
    const result = await response.json();
    
    if (result.success) {
      console.log('✅ Session API working');
      console.log(`Authenticated: ${result.authenticated}`);
      if (result.user) {
        console.log(`User: ${result.user.login}`);
      }
    } else {
      console.log('❌ Session API failed:', result.error);
    }
  } catch (error) {
    console.log('❌ Session API error:', error.message);
  }
}

async function runTests() {
  console.log('🧪 Testing Nebula Templates Functionality\n');
  
  await testTemplatesAPI();
  await testSessionAPI();
  
  console.log('\n📋 Test Summary:');
  console.log('1. Templates API should return list of available templates');
  console.log('2. Session API should return authentication status');
  console.log('3. To test full functionality:');
  console.log('   - Visit http://localhost:3000/templates');
  console.log('   - Click on a template to view details');
  console.log('   - Click "Create Repository" to test GitHub OAuth');
  console.log('   - Complete OAuth flow and repository creation');
}

runTests().catch(console.error);