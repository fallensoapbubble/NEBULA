/**
 * Integration tests for Portfolio Content Analyzer and Data Standardizer
 */

import { describe, it, expect } from 'vitest';
import { createPortfolioDataStandardizer } from '../portfolio-data-standardizer.js';

describe('Portfolio Integration Tests', () => {
  describe('Content Analyzer + Data Standardizer Integration', () => {
    it('should standardize data from content analyzer output', async () => {
      // Mock output from PortfolioContentAnalyzer
      const mockAnalyzerOutput = {
        data: [{
          file: { name: 'data.json', path: 'data.json', type: 'data' },
          content: {
            name: 'Integration Test User',
            title: 'Test Engineer',
            description: 'Testing portfolio integration',
            email: 'test@example.com',
            github: 'https://github.com/testuser'
          },
          metadata: {
            format: 'json',
            parseSuccess: true,
            parsedAt: new Date().toISOString()
          }
        }],
        projects: [{
          file: { name: 'projects.json', path: 'projects.json', type: 'projects' },
          content: [
            {
              name: 'Test Project',
              description: 'A project for testing',
              url: 'https://testproject.com',
              technologies: ['JavaScript', 'Node.js']
            }
          ],
          metadata: {
            format: 'json',
            parseSuccess: true,
            parsedAt: new Date().toISOString()
          }
        }]
      };

      const standardizer = createPortfolioDataStandardizer();
      const result = await standardizer.standardizePortfolioData(mockAnalyzerOutput);

      expect(result.success).toBe(true);
      expect(result.data.personal.name).toBe('Integration Test User');
      expect(result.data.personal.title).toBe('Test Engineer');
      expect(result.data.contact.email).toBe('test@example.com');
      expect(result.data.contact.social).toHaveLength(1);
      expect(result.data.contact.social[0].platform).toBe('github');
      expect(result.data.projects).toHaveLength(1);
      expect(result.data.projects[0].name).toBe('Test Project');
      expect(result.validation.completeness).toBeGreaterThan(50);
    });

    it('should handle mixed content types from analyzer', async () => {
      const mockAnalyzerOutput = {
        data: [{
          file: { name: 'data.json', path: 'data.json', type: 'data' },
          content: { name: 'Mixed Content User', email: 'mixed@example.com' },
          metadata: { format: 'json', parseSuccess: true }
        }],
        about: [{
          file: { name: 'about.md', path: 'about.md', type: 'about' },
          content: {
            frontmatter: { title: 'Software Developer' },
            body: 'I am a passionate software developer.'
          },
          metadata: { format: 'markdown', parseSuccess: true }
        }],
        skills: [{
          file: { name: 'skills.yaml', path: 'skills.yaml', type: 'skills' },
          content: [
            { name: 'JavaScript', level: 'Expert' },
            'Python',
            { name: 'React', category: 'Frontend' }
          ],
          metadata: { format: 'yaml', parseSuccess: true }
        }]
      };

      const standardizer = createPortfolioDataStandardizer();
      const result = await standardizer.standardizePortfolioData(mockAnalyzerOutput);

      expect(result.success).toBe(true);
      expect(result.data.personal.name).toBe('Mixed Content User');
      expect(result.data.personal.title).toBe('Software Developer');
      expect(result.data.personal.bio).toBe('I am a passionate software developer.');
      expect(result.data.contact.email).toBe('mixed@example.com');
      expect(result.data.skills).toHaveLength(3);
      
      const jsSkill = result.data.skills.find(s => s.name === 'JavaScript');
      expect(jsSkill.level).toBe('Expert');
      
      const pythonSkill = result.data.skills.find(s => s.name === 'Python');
      expect(pythonSkill).toBeDefined();
      expect(pythonSkill.category).toBeUndefined();
    });

    it('should handle parsing failures gracefully', async () => {
      const mockAnalyzerOutput = {
        data: [{
          file: { name: 'data.json', path: 'data.json', type: 'data' },
          content: null,
          metadata: { 
            format: 'json', 
            parseSuccess: false, 
            parseError: 'Invalid JSON syntax' 
          }
        }],
        projects: [{
          file: { name: 'projects.json', path: 'projects.json', type: 'projects' },
          content: [
            { name: 'Valid Project', description: 'This project is valid' }
          ],
          metadata: { format: 'json', parseSuccess: true }
        }]
      };

      const standardizer = createPortfolioDataStandardizer();
      const result = await standardizer.standardizePortfolioData(mockAnalyzerOutput);

      expect(result.success).toBe(true); // Should succeed in non-strict mode
      expect(result.data.projects).toHaveLength(1);
      expect(result.data.projects[0].name).toBe('Valid Project');
      expect(result.warnings).toContain('Personal name is missing - consider adding it to improve portfolio completeness');
    });

    it('should preserve file metadata in standardized output', async () => {
      const mockAnalyzerOutput = {
        data: [{
          file: { 
            name: 'portfolio.yaml', 
            path: 'portfolio.yaml', 
            type: 'portfolio',
            sha: 'abc123'
          },
          content: {
            name: 'Metadata Test User',
            title: 'Metadata Engineer'
          },
          metadata: { 
            format: 'yaml', 
            parseSuccess: true,
            parsedAt: '2023-12-01T10:00:00Z'
          }
        }]
      };

      const standardizer = createPortfolioDataStandardizer();
      const result = await standardizer.standardizePortfolioData(mockAnalyzerOutput);

      expect(result.success).toBe(true);
      expect(result.data.personal.name).toBe('Metadata Test User');
      expect(result.data.metadata.lastUpdated).toBeDefined();
      expect(result.data.metadata.version).toBeDefined();
      expect(result.data.metadata.standardizedAt).toBeDefined();
    });
  });

  describe('Schema Compatibility', () => {
    it('should maintain backward compatibility with existing data structures', async () => {
      // Test with legacy field names that might exist in repositories
      const legacyData = {
        data: [{
          file: { name: 'data.json', type: 'data' },
          content: {
            fullName: 'Legacy User', // Old field name
            jobTitle: 'Legacy Developer', // Old field name
            bio: 'Legacy bio text',
            contactEmail: 'legacy@example.com', // Old field name
            githubUrl: 'https://github.com/legacy', // Old field name
            linkedinUrl: 'https://linkedin.com/in/legacy' // Old field name
          },
          metadata: { parseSuccess: true }
        }],
        work: [{ // Alternative to 'experience'
          file: { name: 'work.json', type: 'work' },
          content: [{
            position: 'Senior Developer', // Alternative to 'title'
            employer: 'Legacy Corp', // Alternative to 'company'
            from: '2020-01-01', // Alternative to 'startDate'
            to: '2023-12-31' // Alternative to 'endDate'
          }],
          metadata: { parseSuccess: true }
        }]
      };

      const standardizer = createPortfolioDataStandardizer();
      const result = await standardizer.standardizePortfolioData(legacyData);

      expect(result.success).toBe(true);
      expect(result.data.personal.name).toBe('Legacy User');
      expect(result.data.personal.title).toBe('Legacy Developer');
      expect(result.data.personal.bio).toBe('Legacy bio text');
      expect(result.data.contact.email).toBe('legacy@example.com');
      expect(result.data.contact.social).toHaveLength(2);
      expect(result.data.experience).toHaveLength(1);
      expect(result.data.experience[0].title).toBe('Senior Developer');
      expect(result.data.experience[0].company).toBe('Legacy Corp');
    });

    it('should handle empty or minimal portfolio data', async () => {
      const minimalData = {
        readme: [{
          file: { name: 'README.md', type: 'readme' },
          content: {
            frontmatter: { name: 'Minimal User' },
            body: 'Just a README file.'
          },
          metadata: { parseSuccess: true }
        }]
      };

      const standardizer = createPortfolioDataStandardizer();
      const result = await standardizer.standardizePortfolioData(minimalData);

      expect(result.success).toBe(true);
      expect(result.data.personal.name).toBe('Minimal User');
      expect(result.data.personal.bio).toBe('Just a README file.');
      expect(result.data.projects).toHaveLength(0);
      expect(result.data.experience).toHaveLength(0);
      expect(result.validation.completeness).toBeLessThan(50);
    });
  });
});