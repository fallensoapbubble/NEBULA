/**
 * Tests for Portfolio Data Standardizer
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  PortfolioDataStandardizer,
  createPortfolioDataStandardizer,
  standardizePortfolioData,
  validatePortfolioData,
  getPortfolioSchema,
  STANDARD_PORTFOLIO_SCHEMA
} from '../portfolio-data-standardizer.js';

describe('PortfolioDataStandardizer', () => {
  let standardizer;

  beforeEach(() => {
    standardizer = new PortfolioDataStandardizer();
  });

  describe('Schema Definition', () => {
    it('should export the standard portfolio schema', () => {
      expect(STANDARD_PORTFOLIO_SCHEMA).toBeDefined();
      expect(STANDARD_PORTFOLIO_SCHEMA.personal).toBeDefined();
      expect(STANDARD_PORTFOLIO_SCHEMA.contact).toBeDefined();
      expect(STANDARD_PORTFOLIO_SCHEMA.experience).toBeDefined();
      expect(STANDARD_PORTFOLIO_SCHEMA.projects).toBeDefined();
      expect(STANDARD_PORTFOLIO_SCHEMA.skills).toBeDefined();
      expect(STANDARD_PORTFOLIO_SCHEMA.education).toBeDefined();
      expect(STANDARD_PORTFOLIO_SCHEMA.certifications).toBeDefined();
      expect(STANDARD_PORTFOLIO_SCHEMA.metadata).toBeDefined();
    });

    it('should provide schema info', () => {
      const schemaInfo = standardizer.getSchemaInfo();
      expect(schemaInfo.version).toBeDefined();
      expect(schemaInfo.schema).toBe(STANDARD_PORTFOLIO_SCHEMA);
      expect(schemaInfo.supportedFormats).toContain('json');
      expect(schemaInfo.supportedFormats).toContain('yaml');
      expect(schemaInfo.supportedFormats).toContain('markdown');
    });
  });

  describe('Personal Data Transformation', () => {
    it('should transform personal data from data.json', async () => {
      const parsedContent = {
        data: [{
          metadata: { parseSuccess: true },
          content: {
            name: 'John Doe',
            title: 'Software Engineer',
            description: 'Full-stack developer',
            location: 'San Francisco, CA'
          }
        }]
      };

      const result = await standardizer.standardizePortfolioData(parsedContent);
      
      expect(result.success).toBe(true);
      expect(result.data.personal.name).toBe('John Doe');
      expect(result.data.personal.title).toBe('Software Engineer');
      expect(result.data.personal.description).toBe('Full-stack developer');
      expect(result.data.personal.location).toBe('San Francisco, CA');
    });

    it('should transform personal data from about.md with frontmatter', async () => {
      const parsedContent = {
        about: [{
          metadata: { parseSuccess: true },
          content: {
            frontmatter: {
              name: 'Jane Smith',
              title: 'UX Designer'
            },
            body: 'I am a passionate UX designer with 5 years of experience.'
          }
        }]
      };

      const result = await standardizer.standardizePortfolioData(parsedContent);
      
      expect(result.success).toBe(true);
      expect(result.data.personal.name).toBe('Jane Smith');
      expect(result.data.personal.title).toBe('UX Designer');
      expect(result.data.personal.bio).toBe('I am a passionate UX designer with 5 years of experience.');
    });

    it('should handle alternative field names', async () => {
      const parsedContent = {
        data: [{
          metadata: { parseSuccess: true },
          content: {
            fullName: 'Bob Johnson',
            jobTitle: 'Product Manager',
            summary: 'Experienced PM',
            avatar: 'https://example.com/avatar.jpg'
          }
        }]
      };

      const result = await standardizer.standardizePortfolioData(parsedContent);
      
      expect(result.success).toBe(true);
      expect(result.data.personal.name).toBe('Bob Johnson');
      expect(result.data.personal.title).toBe('Product Manager');
      expect(result.data.personal.description).toBe('Experienced PM');
      expect(result.data.personal.avatar).toBe('https://example.com/avatar.jpg');
    });
  });

  describe('Contact Data Transformation', () => {
    it('should transform contact data', async () => {
      const parsedContent = {
        contact: [{
          metadata: { parseSuccess: true },
          content: {
            email: 'john@example.com',
            phone: '+1-555-0123',
            social: [
              { platform: 'github', url: 'https://github.com/johndoe', username: 'johndoe' },
              { platform: 'linkedin', url: 'https://linkedin.com/in/johndoe' }
            ]
          }
        }]
      };

      const result = await standardizer.standardizePortfolioData(parsedContent);
      
      expect(result.success).toBe(true);
      expect(result.data.contact.email).toBe('john@example.com');
      expect(result.data.contact.phone).toBe('+1-555-0123');
      expect(result.data.contact.social).toHaveLength(2);
      expect(result.data.contact.social[0].platform).toBe('github');
      expect(result.data.contact.social[0].url).toBe('https://github.com/johndoe');
    });

    it('should extract username from social URLs', () => {
      const username = standardizer.extractUsernameFromUrl('https://github.com/johndoe', 'github');
      expect(username).toBe('johndoe');
    });

    it('should handle direct social platform fields', async () => {
      const parsedContent = {
        data: [{
          metadata: { parseSuccess: true },
          content: {
            github: 'https://github.com/johndoe',
            linkedin: 'https://linkedin.com/in/johndoe',
            twitter: 'https://twitter.com/johndoe'
          }
        }]
      };

      const result = await standardizer.standardizePortfolioData(parsedContent);
      
      expect(result.success).toBe(true);
      expect(result.data.contact.social).toHaveLength(3);
      expect(result.data.contact.social.find(s => s.platform === 'github')).toBeDefined();
      expect(result.data.contact.social.find(s => s.platform === 'linkedin')).toBeDefined();
      expect(result.data.contact.social.find(s => s.platform === 'twitter')).toBeDefined();
    });
  });

  describe('Experience Data Transformation', () => {
    it('should transform experience data', async () => {
      const parsedContent = {
        experience: [{
          metadata: { parseSuccess: true },
          content: [
            {
              title: 'Senior Developer',
              company: 'Tech Corp',
              location: 'New York, NY',
              startDate: '2020-01-01',
              endDate: '2023-12-31',
              description: 'Led development team',
              highlights: ['Increased performance by 50%', 'Mentored 5 developers'],
              technologies: ['React', 'Node.js', 'PostgreSQL']
            }
          ]
        }]
      };

      const result = await standardizer.standardizePortfolioData(parsedContent);
      
      expect(result.success).toBe(true);
      expect(result.data.experience).toHaveLength(1);
      
      const exp = result.data.experience[0];
      expect(exp.title).toBe('Senior Developer');
      expect(exp.company).toBe('Tech Corp');
      expect(exp.location).toBe('New York, NY');
      expect(exp.startDate).toBe('2020-01-01');
      expect(exp.endDate).toBe('2023-12-31');
      expect(exp.highlights).toHaveLength(2);
      expect(exp.technologies).toHaveLength(3);
    });

    it('should skip invalid experience entries', async () => {
      const parsedContent = {
        experience: [{
          metadata: { parseSuccess: true },
          content: [
            { title: 'Developer' }, // Missing company
            { company: 'Tech Corp' }, // Missing title
            { title: 'Valid Developer', company: 'Valid Corp' } // Valid
          ]
        }]
      };

      const result = await standardizer.standardizePortfolioData(parsedContent);
      
      expect(result.success).toBe(true);
      expect(result.data.experience).toHaveLength(1);
      expect(result.data.experience[0].title).toBe('Valid Developer');
    });
  });

  describe('Projects Data Transformation', () => {
    it('should transform projects data', async () => {
      const parsedContent = {
        projects: [{
          metadata: { parseSuccess: true },
          content: [
            {
              name: 'Portfolio Website',
              description: 'Personal portfolio built with React',
              url: 'https://johndoe.dev',
              repository: 'https://github.com/johndoe/portfolio',
              technologies: ['React', 'CSS', 'Vercel'],
              featured: true,
              status: 'completed'
            }
          ]
        }]
      };

      const result = await standardizer.standardizePortfolioData(parsedContent);
      
      expect(result.success).toBe(true);
      expect(result.data.projects).toHaveLength(1);
      
      const proj = result.data.projects[0];
      expect(proj.name).toBe('Portfolio Website');
      expect(proj.description).toBe('Personal portfolio built with React');
      expect(proj.url).toBe('https://johndoe.dev');
      expect(proj.repository).toBe('https://github.com/johndoe/portfolio');
      expect(proj.technologies).toHaveLength(3);
      expect(proj.featured).toBe(true);
      expect(proj.status).toBe('completed');
    });

    it('should handle alternative field names for projects', async () => {
      const parsedContent = {
        projects: [{
          metadata: { parseSuccess: true },
          content: [
            {
              title: 'My App', // Alternative to name
              summary: 'A great app', // Alternative to description
              demo: 'https://myapp.com', // Alternative to url
              github: 'https://github.com/user/myapp', // Alternative to repository
              tech: ['Vue', 'Firebase'] // Alternative to technologies
            }
          ]
        }]
      };

      const result = await standardizer.standardizePortfolioData(parsedContent);
      
      expect(result.success).toBe(true);
      expect(result.data.projects).toHaveLength(1);
      
      const proj = result.data.projects[0];
      expect(proj.name).toBe('My App');
      expect(proj.description).toBe('A great app');
      expect(proj.url).toBe('https://myapp.com');
      expect(proj.repository).toBe('https://github.com/user/myapp');
      expect(proj.technologies).toEqual(['Vue', 'Firebase']);
    });
  });

  describe('Skills Data Transformation', () => {
    it('should transform skills data', async () => {
      const parsedContent = {
        skills: [{
          metadata: { parseSuccess: true },
          content: [
            { name: 'JavaScript', category: 'Programming', level: 'Expert', years: 5 },
            { name: 'React', category: 'Frontend', level: 'Advanced', years: 3 },
            'Python' // String format
          ]
        }]
      };

      const result = await standardizer.standardizePortfolioData(parsedContent);
      
      expect(result.success).toBe(true);
      expect(result.data.skills).toHaveLength(3);
      
      const jsSkill = result.data.skills.find(s => s.name === 'JavaScript');
      expect(jsSkill.category).toBe('Programming');
      expect(jsSkill.level).toBe('Expert');
      expect(jsSkill.years).toBe(5);
      
      const pythonSkill = result.data.skills.find(s => s.name === 'Python');
      expect(pythonSkill).toBeDefined();
      expect(pythonSkill.category).toBeUndefined();
    });

    it('should remove duplicate skills', async () => {
      const parsedContent = {
        skills: [{
          metadata: { parseSuccess: true },
          content: [
            { name: 'JavaScript', level: 'Expert' },
            { name: 'javascript', level: 'Advanced' }, // Duplicate (case insensitive)
            'JavaScript' // Another duplicate
          ]
        }]
      };

      const result = await standardizer.standardizePortfolioData(parsedContent);
      
      expect(result.success).toBe(true);
      expect(result.data.skills).toHaveLength(1);
      expect(result.data.skills[0].name).toBe('JavaScript');
      expect(result.data.skills[0].level).toBe('Expert'); // Should keep the one with level
    });
  });

  describe('Education Data Transformation', () => {
    it('should transform education data', async () => {
      const parsedContent = {
        education: [{
          metadata: { parseSuccess: true },
          content: [
            {
              institution: 'University of Technology',
              degree: 'Bachelor of Science',
              field: 'Computer Science',
              startDate: '2016-09-01',
              endDate: '2020-05-31',
              gpa: '3.8',
              honors: ['Magna Cum Laude', 'Dean\'s List']
            }
          ]
        }]
      };

      const result = await standardizer.standardizePortfolioData(parsedContent);
      
      expect(result.success).toBe(true);
      expect(result.data.education).toHaveLength(1);
      
      const edu = result.data.education[0];
      expect(edu.institution).toBe('University of Technology');
      expect(edu.degree).toBe('Bachelor of Science');
      expect(edu.field).toBe('Computer Science');
      expect(edu.gpa).toBe('3.8');
      expect(edu.honors).toHaveLength(2);
    });
  });

  describe('Certifications Data Transformation', () => {
    it('should transform certifications data', async () => {
      const parsedContent = {
        certifications: [{
          metadata: { parseSuccess: true },
          content: [
            {
              name: 'AWS Solutions Architect',
              issuer: 'Amazon Web Services',
              date: '2023-06-15',
              expiryDate: '2026-06-15',
              credentialId: 'AWS-12345',
              url: 'https://aws.amazon.com/verification/12345'
            }
          ]
        }]
      };

      const result = await standardizer.standardizePortfolioData(parsedContent);
      
      expect(result.success).toBe(true);
      expect(result.data.certifications).toHaveLength(1);
      
      const cert = result.data.certifications[0];
      expect(cert.name).toBe('AWS Solutions Architect');
      expect(cert.issuer).toBe('Amazon Web Services');
      expect(cert.date).toBe('2023-06-15');
      expect(cert.credentialId).toBe('AWS-12345');
    });
  });

  describe('Data Validation', () => {
    it('should validate complete portfolio data', async () => {
      const completeData = {
        personal: {
          name: 'John Doe',
          title: 'Software Engineer',
          description: 'Full-stack developer'
        },
        contact: {
          email: 'john@example.com',
          social: [{ platform: 'github', url: 'https://github.com/johndoe' }]
        },
        experience: [
          { title: 'Developer', company: 'Tech Corp', startDate: '2020-01-01' }
        ],
        projects: [
          { name: 'Portfolio', description: 'My portfolio website' }
        ],
        skills: [
          { name: 'JavaScript' }
        ],
        education: [],
        certifications: [],
        metadata: {}
      };

      const validation = await standardizer.validateStandardData(completeData);
      
      expect(validation.isValid).toBe(true);
      expect(validation.completeness).toBeGreaterThan(80);
      expect(validation.errors).toHaveLength(0);
    });

    it('should identify missing required fields', async () => {
      const incompleteData = {
        personal: {}, // Missing name
        contact: {},
        experience: [],
        projects: [],
        skills: [],
        education: [],
        certifications: [],
        metadata: {}
      };

      const validation = await standardizer.validateStandardData(incompleteData);
      
      expect(validation.isValid).toBe(false);
      expect(validation.errors).toContain('Personal name is required');
      expect(validation.completeness).toBeLessThan(50);
    });

    it('should provide warnings for missing recommended fields', async () => {
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

      const validation = await standardizer.validateStandardData(minimalData);
      
      expect(validation.warnings).toContain('No work experience found - consider adding experience data');
      expect(validation.warnings).toContain('No projects found - consider adding project data');
    });
  });

  describe('Utility Functions', () => {
    it('should create empty portfolio structure', () => {
      const empty = standardizer.createEmptyPortfolio();
      
      expect(empty.personal).toEqual({});
      expect(empty.contact.social).toEqual([]);
      expect(empty.experience).toEqual([]);
      expect(empty.projects).toEqual([]);
      expect(empty.skills).toEqual([]);
      expect(empty.education).toEqual([]);
      expect(empty.certifications).toEqual([]);
      expect(empty.metadata.version).toBeDefined();
    });
  });

  describe('Factory Functions', () => {
    it('should create standardizer instance', () => {
      const instance = createPortfolioDataStandardizer();
      expect(instance).toBeInstanceOf(PortfolioDataStandardizer);
    });

    it('should standardize data using convenience function', async () => {
      const parsedContent = {
        data: [{
          metadata: { parseSuccess: true },
          content: { name: 'Test User' }
        }]
      };

      const result = await standardizePortfolioData(parsedContent);
      expect(result.success).toBe(true);
      expect(result.data.personal.name).toBe('Test User');
    });

    it('should validate data using convenience function', async () => {
      const data = {
        personal: { name: 'Test User' },
        contact: {},
        experience: [],
        projects: [],
        skills: [],
        education: [],
        certifications: [],
        metadata: {}
      };

      const result = await validatePortfolioData(data);
      expect(result.isValid).toBe(true);
    });

    it('should get portfolio schema', () => {
      const schema = getPortfolioSchema();
      expect(schema).toBe(STANDARD_PORTFOLIO_SCHEMA);
    });
  });

  describe('Error Handling', () => {
    it('should handle parsing errors gracefully', async () => {
      const parsedContent = {
        data: [{
          metadata: { parseSuccess: false, parseError: 'Invalid JSON' },
          content: null
        }]
      };

      const result = await standardizer.standardizePortfolioData(parsedContent);
      expect(result.success).toBe(true); // Should succeed in non-strict mode (default)
      expect(result.warnings).toContain('Personal name is missing - consider adding it to improve portfolio completeness');
    });

    it('should handle invalid data types', async () => {
      const parsedContent = {
        projects: [{
          metadata: { parseSuccess: true },
          content: [
            null, // Invalid project
            'invalid', // Invalid project
            { name: 'Valid Project', description: 'Valid description' } // Valid project
          ]
        }]
      };

      const result = await standardizer.standardizePortfolioData(parsedContent);
      expect(result.data.projects).toHaveLength(1);
      expect(result.data.projects[0].name).toBe('Valid Project');
    });
  });

  describe('Configuration Options', () => {
    it('should respect strict validation option', async () => {
      const strictStandardizer = new PortfolioDataStandardizer({ strictValidation: true });
      const parsedContent = {
        data: [{
          metadata: { parseSuccess: true },
          content: { title: 'Developer' } // Missing name
        }]
      };

      const result = await strictStandardizer.standardizePortfolioData(parsedContent);
      expect(result.success).toBe(false);
    });

    it('should allow non-strict validation', async () => {
      const lenientStandardizer = new PortfolioDataStandardizer({ strictValidation: false });
      const parsedContent = {
        data: [{
          metadata: { parseSuccess: true },
          content: { title: 'Developer' } // Missing name
        }]
      };

      const result = await lenientStandardizer.standardizePortfolioData(parsedContent);
      expect(result.success).toBe(true); // Should succeed in non-strict mode
    });
  });
});