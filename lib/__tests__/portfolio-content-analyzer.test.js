/**
 * Tests for Portfolio Content Analyzer
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PortfolioContentAnalyzer, createPortfolioContentAnalyzer, analyzeRepositoryPortfolio } from '../portfolio-content-analyzer.js';

// Mock GitHub client
const mockOctokit = {
  rest: {
    repos: {
      getContent: vi.fn()
    }
  }
};

// Mock GitHub auth
vi.mock('../github-auth.js', () => ({
  createGitHubClient: vi.fn(() => mockOctokit)
}));

describe('PortfolioContentAnalyzer', () => {
  let analyzer;
  const mockAccessToken = 'test-token';

  beforeEach(() => {
    vi.clearAllMocks();
    analyzer = new PortfolioContentAnalyzer(mockAccessToken);
  });

  describe('constructor', () => {
    it('should create analyzer with access token', () => {
      expect(analyzer.accessToken).toBe(mockAccessToken);
      expect(analyzer.octokit).toBe(mockOctokit);
    });

    it('should throw error without access token', () => {
      expect(() => new PortfolioContentAnalyzer()).toThrow('GitHub access token is required');
    });

    it('should accept options', () => {
      const options = { maxDepth: 5, timeout: 60000 };
      const customAnalyzer = new PortfolioContentAnalyzer(mockAccessToken, options);
      expect(customAnalyzer.options.maxDepth).toBe(5);
      expect(customAnalyzer.options.timeout).toBe(60000);
    });
  });

  describe('getFileExtension', () => {
    it('should return correct file extensions', () => {
      expect(analyzer.getFileExtension('data.json')).toBe('.json');
      expect(analyzer.getFileExtension('about.md')).toBe('.md');
      expect(analyzer.getFileExtension('config.yaml')).toBe('.yaml');
      expect(analyzer.getFileExtension('README')).toBe('');
    });
  });

  describe('getContentType', () => {
    it('should return correct content types', () => {
      expect(analyzer.getContentType('data.json')).toBe('application/json');
      expect(analyzer.getContentType('about.md')).toBe('text/markdown');
      expect(analyzer.getContentType('config.yaml')).toBe('application/x-yaml');
      expect(analyzer.getContentType('config.yml')).toBe('application/x-yaml');
      expect(analyzer.getContentType('unknown.xyz')).toBe('text/plain');
    });
  });

  describe('isPortfolioFile', () => {
    it('should identify portfolio files correctly', () => {
      expect(analyzer.isPortfolioFile('data.json', 'data.json')).toBe(true);
      expect(analyzer.isPortfolioFile('portfolio.yaml', 'portfolio.yaml')).toBe(true);
      expect(analyzer.isPortfolioFile('about.md', 'about.md')).toBe(true);
      expect(analyzer.isPortfolioFile('projects.json', 'projects.json')).toBe(true);
      expect(analyzer.isPortfolioFile('README.md', 'README.md')).toBe(true);
      expect(analyzer.isPortfolioFile('random.txt', 'random.txt')).toBe(false);
    });
  });

  describe('parseMarkdownWithFrontmatter', () => {
    it('should parse markdown with frontmatter', () => {
      const content = `---
title: About Me
author: John Doe
---

# About

This is my story.`;

      const result = analyzer.parseMarkdownWithFrontmatter(content);
      
      expect(result.frontmatter.title).toBe('About Me');
      expect(result.frontmatter.author).toBe('John Doe');
      expect(result.body).toBe('# About\n\nThis is my story.');
      expect(result.raw).toBe(content);
    });

    it('should handle markdown without frontmatter', () => {
      const content = '# About\n\nThis is my story.';
      const result = analyzer.parseMarkdownWithFrontmatter(content);
      
      expect(result.frontmatter).toEqual({});
      expect(result.body).toBe(content);
      expect(result.raw).toBe(content);
    });

    it('should handle invalid frontmatter gracefully', () => {
      const content = `---
invalid: yaml: content: [
---

# About`;

      const result = analyzer.parseMarkdownWithFrontmatter(content);
      
      expect(result.frontmatter).toEqual({});
      expect(result.body).toBe(content);
      expect(result.raw).toBe(content);
    });
  });

  describe('parseFileContent', () => {
    it('should parse JSON content', async () => {
      const content = '{"name": "John Doe", "title": "Developer"}';
      const result = await analyzer.parseFileContent(content, '.json', 'application/json');
      
      expect(result.success).toBe(true);
      expect(result.format).toBe('json');
      expect(result.content.name).toBe('John Doe');
      expect(result.content.title).toBe('Developer');
    });

    it('should parse YAML content', async () => {
      const content = `name: John Doe
title: Developer
skills:
  - JavaScript
  - React`;
      
      const result = await analyzer.parseFileContent(content, '.yaml', 'application/x-yaml');
      
      expect(result.success).toBe(true);
      expect(result.format).toBe('yaml');
      expect(result.content.name).toBe('John Doe');
      expect(result.content.skills).toEqual(['JavaScript', 'React']);
    });

    it('should parse markdown content', async () => {
      const content = `---
title: About Me
---

# About

This is my story.`;
      
      const result = await analyzer.parseFileContent(content, '.md', 'text/markdown');
      
      expect(result.success).toBe(true);
      expect(result.format).toBe('markdown');
      expect(result.content.frontmatter.title).toBe('About Me');
      expect(result.content.body).toContain('# About');
    });

    it('should handle invalid JSON gracefully', async () => {
      const content = '{"invalid": json}';
      const result = await analyzer.parseFileContent(content, '.json', 'application/json');
      
      expect(result.success).toBe(false);
      expect(result.format).toBe('unknown');
      expect(result.error).toBeDefined();
    });

    it('should handle plain text files', async () => {
      const content = 'This is plain text content';
      const result = await analyzer.parseFileContent(content, '.txt', 'text/plain');
      
      expect(result.success).toBe(true);
      expect(result.format).toBe('text');
      expect(result.content).toBe(content);
    });
  });

  describe('detectPortfolioFiles', () => {
    it('should detect portfolio files from structure', async () => {
      const structure = {
        path: '',
        type: 'directory',
        items: [
          {
            name: 'data.json',
            path: 'data.json',
            type: 'file',
            size: 100,
            sha: 'abc123'
          },
          {
            name: 'about.md',
            path: 'about.md',
            type: 'file',
            size: 200,
            sha: 'def456'
          },
          {
            name: 'projects.yaml',
            path: 'projects.yaml',
            type: 'file',
            size: 300,
            sha: 'ghi789'
          },
          {
            name: 'random.txt',
            path: 'random.txt',
            type: 'file',
            size: 50,
            sha: 'jkl012'
          }
        ]
      };

      const portfolioFiles = await analyzer.detectPortfolioFiles('owner', 'repo', structure);
      
      expect(portfolioFiles).toHaveLength(3);
      expect(portfolioFiles[0].name).toBe('data.json');
      expect(portfolioFiles[0].type).toBe('data');
      expect(portfolioFiles[0].priority).toBe(1);
      
      expect(portfolioFiles[1].name).toBe('about.md');
      expect(portfolioFiles[1].type).toBe('about');
      
      expect(portfolioFiles[2].name).toBe('projects.yaml');
      expect(portfolioFiles[2].type).toBe('projects');
    });

    it('should sort files by priority', async () => {
      const structure = {
        path: '',
        type: 'directory',
        items: [
          {
            name: 'README.md',
            path: 'README.md',
            type: 'file',
            size: 100,
            sha: 'abc123'
          },
          {
            name: 'data.json',
            path: 'data.json',
            type: 'file',
            size: 200,
            sha: 'def456'
          },
          {
            name: 'config.json',
            path: 'config.json',
            type: 'file',
            size: 150,
            sha: 'ghi789'
          }
        ]
      };

      const portfolioFiles = await analyzer.detectPortfolioFiles('owner', 'repo', structure);
      
      // data.json (priority 1) should come before config.json (priority 2) and README.md (priority 3)
      expect(portfolioFiles[0].name).toBe('data.json');
      expect(portfolioFiles[0].priority).toBe(1);
      expect(portfolioFiles[1].name).toBe('config.json');
      expect(portfolioFiles[1].priority).toBe(2);
      expect(portfolioFiles[2].name).toBe('README.md');
      expect(portfolioFiles[2].priority).toBe(3);
    });
  });

  describe('analyzeContentStructure', () => {
    it('should analyze complete portfolio content', () => {
      const parsedContent = {
        data: [{
          file: { name: 'data.json', path: 'data.json' },
          content: { name: 'John Doe', title: 'Developer' },
          metadata: { parseSuccess: true }
        }],
        about: [{
          file: { name: 'about.md', path: 'about.md' },
          content: { body: 'About me content' },
          metadata: { parseSuccess: true }
        }],
        projects: [{
          file: { name: 'projects.json', path: 'projects.json' },
          content: [{ title: 'Project 1' }],
          metadata: { parseSuccess: true }
        }],
        contact: [{
          file: { name: 'contact.json', path: 'contact.json' },
          content: { email: 'john@example.com' },
          metadata: { parseSuccess: true }
        }],
        skills: [{
          file: { name: 'skills.json', path: 'skills.json' },
          content: ['JavaScript', 'React'],
          metadata: { parseSuccess: true }
        }]
      };

      const analysis = analyzer.analyzeContentStructure(parsedContent);
      
      expect(analysis.completeness.score).toBe(75); // 25+20+15+10+5
      expect(analysis.completeness.percentage).toBe(75);
      expect(analysis.structure.hasData).toBe(true);
      expect(analysis.structure.hasAbout).toBe(true);
      expect(analysis.structure.hasProjects).toBe(true);
      expect(analysis.structure.hasContact).toBe(true);
      expect(analysis.structure.hasSkills).toBe(true);
      expect(analysis.recommendations).toHaveLength(0);
      expect(analysis.issues).toHaveLength(0);
    });

    it('should identify missing content and provide recommendations', () => {
      const parsedContent = {
        data: [{
          file: { name: 'data.json', path: 'data.json' },
          content: { name: 'John Doe' },
          metadata: { parseSuccess: true }
        }]
      };

      const analysis = analyzer.analyzeContentStructure(parsedContent);
      
      expect(analysis.completeness.score).toBe(25);
      expect(analysis.completeness.percentage).toBe(25);
      expect(analysis.structure.hasData).toBe(true);
      expect(analysis.structure.hasAbout).toBe(false);
      expect(analysis.structure.hasProjects).toBe(false);
      
      expect(analysis.recommendations.length).toBeGreaterThan(0);
      expect(analysis.recommendations.some(r => r.type === 'missing_about')).toBe(true);
      expect(analysis.recommendations.some(r => r.type === 'missing_projects')).toBe(true);
    });

    it('should identify parsing issues', () => {
      const parsedContent = {
        data: [{
          file: { name: 'data.json', path: 'data.json' },
          content: null,
          metadata: { parseSuccess: false, parseError: 'Invalid JSON' }
        }]
      };

      const analysis = analyzer.analyzeContentStructure(parsedContent);
      
      expect(analysis.completeness.score).toBe(0);
      expect(analysis.issues).toHaveLength(1);
      expect(analysis.issues[0].type).toBe('parse_error');
      expect(analysis.issues[0].category).toBe('data');
    });
  });

  describe('getRepositoryStructure', () => {
    it('should get repository structure successfully', async () => {
      const mockContents = [
        {
          name: 'data.json',
          path: 'data.json',
          type: 'file',
          size: 100,
          sha: 'abc123',
          download_url: 'https://example.com/data.json'
        },
        {
          name: 'src',
          path: 'src',
          type: 'dir',
          size: 0,
          sha: 'def456',
          download_url: null
        }
      ];

      mockOctokit.rest.repos.getContent.mockResolvedValue({ data: mockContents });

      const result = await analyzer.getRepositoryStructure('owner', 'repo');
      
      expect(result.success).toBe(true);
      expect(result.structure.items).toHaveLength(2);
      expect(result.structure.items[0].name).toBe('data.json');
      expect(result.structure.items[0].type).toBe('file');
      expect(result.structure.items[0].isPortfolioFile).toBe(true);
      expect(result.structure.items[1].name).toBe('src');
      expect(result.structure.items[1].type).toBe('dir');
    });

    it('should handle API errors gracefully', async () => {
      mockOctokit.rest.repos.getContent.mockRejectedValue(new Error('Repository not found'));

      const result = await analyzer.getRepositoryStructure('owner', 'repo');
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('Failed to get repository structure');
    });

    it('should respect max depth limit', async () => {
      const shallowAnalyzer = new PortfolioContentAnalyzer(mockAccessToken, { maxDepth: 0 });
      
      const result = await shallowAnalyzer.getRepositoryStructure('owner', 'repo', '', null, 1);
      
      expect(result.success).toBe(true);
      expect(result.structure.truncated).toBe(true);
    });
  });

  describe('convenience functions', () => {
    it('should create analyzer with createPortfolioContentAnalyzer', () => {
      const analyzer = createPortfolioContentAnalyzer(mockAccessToken, { maxDepth: 5 });
      expect(analyzer).toBeInstanceOf(PortfolioContentAnalyzer);
      expect(analyzer.options.maxDepth).toBe(5);
    });

    it('should analyze repository with analyzeRepositoryPortfolio', async () => {
      // Mock the analyzer methods
      const mockAnalyzer = {
        analyzeRepository: vi.fn().mockResolvedValue({
          success: true,
          analysis: { repository: { owner: 'owner', name: 'repo' } }
        })
      };

      vi.spyOn(analyzer.constructor.prototype, 'analyzeRepository')
        .mockImplementation(mockAnalyzer.analyzeRepository);

      const result = await analyzeRepositoryPortfolio(mockAccessToken, 'owner', 'repo');
      
      expect(result.success).toBe(true);
      expect(result.analysis.repository.owner).toBe('owner');
      expect(result.analysis.repository.name).toBe('repo');
    });
  });
});