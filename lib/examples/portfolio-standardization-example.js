/**
 * Portfolio Data Standardization Example
 * Demonstrates how to use the PortfolioDataStandardizer with PortfolioContentAnalyzer
 */

import { createPortfolioContentAnalyzer } from '../portfolio-content-analyzer.js';
import { createPortfolioDataStandardizer } from '../portfolio-data-standardizer.js';

/**
 * Example: Complete portfolio data standardization workflow
 */
export async function demonstratePortfolioStandardization() {
  // Mock GitHub access token (in real usage, this would be a valid token)
  const mockAccessToken = 'github_pat_example';
  
  // Create analyzer and standardizer instances
  const analyzer = createPortfolioContentAnalyzer(mockAccessToken);
  const standardizer = createPortfolioDataStandardizer({
    strictValidation: false,
    allowUnknownFields: true
  });

  // Example parsed content from analyzer (this would normally come from GitHub)
  const mockParsedContent = {
    data: [{
      metadata: { parseSuccess: true },
      content: {
        name: 'Sarah Johnson',
        title: 'Full-Stack Developer',
        description: 'Passionate developer with 5 years of experience',
        email: 'sarah@example.com',
        location: 'San Francisco, CA',
        github: 'https://github.com/sarahjohnson',
        linkedin: 'https://linkedin.com/in/sarahjohnson'
      }
    }],
    projects: [{
      metadata: { parseSuccess: true },
      content: [
        {
          name: 'E-commerce Platform',
          description: 'Full-stack e-commerce solution built with React and Node.js',
          url: 'https://mystore.example.com',
          repository: 'https://github.com/sarahjohnson/ecommerce-platform',
          technologies: ['React', 'Node.js', 'PostgreSQL', 'Stripe'],
          featured: true,
          status: 'completed'
        },
        {
          name: 'Task Management App',
          description: 'Collaborative task management tool with real-time updates',
          repository: 'https://github.com/sarahjohnson/task-manager',
          technologies: ['Vue.js', 'Express', 'Socket.io', 'MongoDB'],
          status: 'in-progress'
        }
      ]
    }],
    experience: [{
      metadata: { parseSuccess: true },
      content: [
        {
          title: 'Senior Full-Stack Developer',
          company: 'TechCorp Inc.',
          location: 'San Francisco, CA',
          startDate: '2021-03-01',
          endDate: null, // Current position
          description: 'Lead development of customer-facing web applications',
          highlights: [
            'Improved application performance by 40%',
            'Mentored 3 junior developers',
            'Led migration to microservices architecture'
          ],
          technologies: ['React', 'Node.js', 'AWS', 'Docker']
        },
        {
          title: 'Frontend Developer',
          company: 'StartupXYZ',
          location: 'San Francisco, CA',
          startDate: '2019-06-01',
          endDate: '2021-02-28',
          description: 'Developed responsive web applications using modern frameworks',
          technologies: ['Vue.js', 'TypeScript', 'SCSS']
        }
      ]
    }],
    skills: [{
      metadata: { parseSuccess: true },
      content: [
        { name: 'JavaScript', category: 'Programming', level: 'Expert', years: 5 },
        { name: 'React', category: 'Frontend', level: 'Advanced', years: 4 },
        { name: 'Node.js', category: 'Backend', level: 'Advanced', years: 3 },
        { name: 'PostgreSQL', category: 'Database', level: 'Intermediate', years: 2 },
        'Docker', // String format
        'AWS'
      ]
    }],
    about: [{
      metadata: { parseSuccess: true },
      content: {
        frontmatter: {
          title: 'About Me'
        },
        body: `I'm a passionate full-stack developer with over 5 years of experience building scalable web applications. 
        
I love working with modern technologies and am always eager to learn new tools and frameworks. When I'm not coding, 
you can find me hiking in the Bay Area or contributing to open-source projects.

My expertise spans both frontend and backend development, with a particular focus on React, Node.js, and cloud technologies.`
      }
    }]
  };

  console.log('🔄 Starting portfolio data standardization...\n');

  try {
    // Standardize the parsed content
    const result = await standardizer.standardizePortfolioData(mockParsedContent);

    if (result.success) {
      console.log('✅ Portfolio data standardization successful!\n');
      
      // Display standardized data summary
      console.log('📊 Standardized Portfolio Summary:');
      console.log('================================');
      console.log(`Name: ${result.data.personal.name}`);
      console.log(`Title: ${result.data.personal.title}`);
      console.log(`Location: ${result.data.personal.location}`);
      console.log(`Email: ${result.data.contact.email}`);
      console.log(`Social Links: ${result.data.contact.social.length}`);
      console.log(`Projects: ${result.data.projects.length}`);
      console.log(`Experience Entries: ${result.data.experience.length}`);
      console.log(`Skills: ${result.data.skills.length}`);
      console.log(`Bio Length: ${result.data.personal.bio ? result.data.personal.bio.length : 0} characters\n`);

      // Display validation results
      console.log('📈 Validation Results:');
      console.log('=====================');
      console.log(`Completeness: ${result.validation.completeness}%`);
      console.log(`Valid: ${result.validation.isValid ? 'Yes' : 'No'}`);
      
      if (result.warnings.length > 0) {
        console.log('\n⚠️  Warnings:');
        result.warnings.forEach(warning => console.log(`  - ${warning}`));
      }
      
      if (result.errors.length > 0) {
        console.log('\n❌ Errors:');
        result.errors.forEach(error => console.log(`  - ${error}`));
      }

      // Display sample standardized data structure
      console.log('\n📋 Sample Standardized Data Structure:');
      console.log('=====================================');
      console.log(JSON.stringify({
        personal: result.data.personal,
        contact: {
          email: result.data.contact.email,
          social: result.data.contact.social.slice(0, 2) // Show first 2 social links
        },
        projects: result.data.projects.slice(0, 1), // Show first project
        experience: result.data.experience.slice(0, 1), // Show first experience
        skills: result.data.skills.slice(0, 3) // Show first 3 skills
      }, null, 2));

    } else {
      console.log('❌ Portfolio data standardization failed!\n');
      console.log('Errors:');
      result.errors.forEach(error => console.log(`  - ${error}`));
    }

  } catch (error) {
    console.error('💥 Standardization error:', error.message);
  }
}

/**
 * Example: Schema validation demonstration
 */
export async function demonstrateSchemaValidation() {
  console.log('\n🔍 Schema Validation Demonstration:');
  console.log('===================================\n');

  const standardizer = createPortfolioDataStandardizer();

  // Test with minimal valid data
  const minimalData = {
    personal: { name: 'John Doe' },
    contact: {},
    experience: [],
    projects: [],
    skills: [],
    education: [],
    certifications: [],
    metadata: {}
  };

  const minimalValidation = await standardizer.validateStandardData(minimalData);
  console.log('Minimal Data Validation:');
  console.log(`  Completeness: ${minimalValidation.completeness}%`);
  console.log(`  Valid: ${minimalValidation.isValid}`);
  console.log(`  Warnings: ${minimalValidation.warnings.length}`);

  // Test with complete data
  const completeData = {
    personal: {
      name: 'Jane Smith',
      title: 'Software Engineer',
      description: 'Experienced developer'
    },
    contact: {
      email: 'jane@example.com',
      social: [{ platform: 'github', url: 'https://github.com/janesmith' }]
    },
    experience: [
      { title: 'Developer', company: 'Tech Corp', startDate: '2020-01-01' }
    ],
    projects: [
      { name: 'My App', description: 'A great application' }
    ],
    skills: [
      { name: 'JavaScript' }
    ],
    education: [],
    certifications: [],
    metadata: {}
  };

  const completeValidation = await standardizer.validateStandardData(completeData);
  console.log('\nComplete Data Validation:');
  console.log(`  Completeness: ${completeValidation.completeness}%`);
  console.log(`  Valid: ${completeValidation.isValid}`);
  console.log(`  Warnings: ${completeValidation.warnings.length}`);
}

/**
 * Example: Different data format transformations
 */
export async function demonstrateFormatTransformations() {
  console.log('\n🔄 Format Transformation Examples:');
  console.log('==================================\n');

  const standardizer = createPortfolioDataStandardizer();

  // Example 1: JSON format with alternative field names
  const jsonFormat = {
    data: [{
      metadata: { parseSuccess: true },
      content: {
        fullName: 'Alice Cooper',
        jobTitle: 'UX Designer',
        summary: 'Creative designer with 3 years experience',
        contactEmail: 'alice@example.com'
      }
    }]
  };

  const jsonResult = await standardizer.standardizePortfolioData(jsonFormat);
  console.log('JSON Format Transformation:');
  console.log(`  Name: ${jsonResult.data.personal.name}`);
  console.log(`  Title: ${jsonResult.data.personal.title}`);
  console.log(`  Description: ${jsonResult.data.personal.description}`);
  console.log(`  Email: ${jsonResult.data.contact.email}\n`);

  // Example 2: Markdown format with frontmatter
  const markdownFormat = {
    about: [{
      metadata: { parseSuccess: true },
      content: {
        frontmatter: {
          name: 'Bob Wilson',
          role: 'Data Scientist',
          location: 'New York, NY'
        },
        body: 'I am a data scientist passionate about machine learning and AI.'
      }
    }]
  };

  const markdownResult = await standardizer.standardizePortfolioData(markdownFormat);
  console.log('Markdown Format Transformation:');
  console.log(`  Name: ${markdownResult.data.personal.name}`);
  console.log(`  Title: ${markdownResult.data.personal.title}`);
  console.log(`  Location: ${markdownResult.data.personal.location}`);
  console.log(`  Bio: ${markdownResult.data.personal.bio.substring(0, 50)}...`);
}

// Run examples if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  console.log('🚀 Portfolio Data Standardization Examples\n');
  
  await demonstratePortfolioStandardization();
  await demonstrateSchemaValidation();
  await demonstrateFormatTransformations();
  
  console.log('\n✨ Examples completed!');
}