/**
 * Portfolio Navigation Service Tests
 * Tests for automatic navigation generation and repository structure analysis
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PortfolioNavigationService } from '../portfolio-navigation-service.js';

// Mock Octokit
const mockOctokit = {
  rest: {
    repos: {
      get: vi.fn(),
      getContent: vi.fn()
    }
  }
};

vi.mock('@octokit/rest', () => ({
  Octokit: vi.fn(() => mockOctokit)
}));

describe('PortfolioNavigationService', () => {
  let service;

  beforeEach(() => {
    service = new PortfolioNavigationService();
    vi.clearAllMocks();
  });

  describe('getNavigationStructure', () => {
    it('should generate navigation from repository structure', async () => {
      // Mock repository response
      mockOctokit.rest.repos.get.mockResolvedValue({
        data: { default_branch: 'main' }
      });

      // Mock repository contents
      mockOctokit.rest.repos.getContent.mockResolvedValue({
        data: [
          {
            name: 'about.md',
            path: 'about.md',
            type: 'file',
            size: 1000,
            sha: 'abc123',
            download_url: 'https://raw.githubusercontent.com/user/repo/main/about.md'
          },
          {
            name: 'projects.md',
            path: 'projects.md',
            type: 'file',
            size: 2000,
            sha: 'def456',
            download_url: 'https://raw.githubusercontent.com/user/repo/main/projects.md'
          },
          {
            name: 'contact.md',
            path: 'contact.md',
            type: 'file',
            size: 500,
            sha: 'ghi789',
            download_url: 'https://raw.githubusercontent.com/user/repo/main/contact.md'
          }
        ]
      });

      const result = await service.getNavigationStructure('testuser', 'testrepo');

      expect(result.success).toBe(true);
      expect(result.navigation).toBeDefined();
      expect(result.navigation.pages).toHaveLength(3);
      expect(result.navigation.menu).toHaveLength(3);
      
      // Check page structure
      const aboutPage = result.navigation.pages.find(p => p.section === 'about');
      expect(aboutPage).toBeDefined();
      expect(aboutPage.title).toBe('About');
      expect(aboutPage.path).toBe('about');
      expect(aboutPage.file).toBe('about.md');
    });

    it('should handle repository not found error', async () => {
      mockOctokit.rest.repos.get.mockRejectedValue({
        status: 404,
        message: 'Not Found'
      });

      const result = await service.getNavigationStructure('nonexistent', 'repo');

      expect(result.success).toBe(false);
      expect(result.error).toBe('repository_not_found');
    });

    it('should use explicit navigation configuration when available', async () => {
      // Mock repository response
      mockOctokit.rest.repos.get.mockResolvedValue({
        data: { default_branch: 'main' }
      });

      // Mock repository contents with navigation.json
      mockOctokit.rest.repos.getContent
        .mockResolvedValueOnce({
          data: [
            {
              name: 'navigation.json',
              path: 'navigation.json',
              type: 'file',
              size: 500,
              sha: 'nav123',
              download_url: 'https://raw.githubusercontent.com/user/repo/main/navigation.json'
            }
          ]
        })
        .mockResolvedValueOnce({
          data: {
            content: Buffer.from(JSON.stringify({
              pages: [
                { title: 'Home', path: 'home', section: 'main' },
                { title: 'About', path: 'about', section: 'info' }
              ],
              menu: [
                { title: 'Home', path: 'home' },
                { title: 'About', path: 'about' }
              ]
            })).toString('base64'),
            encoding: 'base64'
          }
        });

      const result = await service.getNavigationStructure('testuser', 'testrepo');

      expect(result.success).toBe(true);
      expect(result.navigation.pages).toHaveLength(2);
      expect(result.navigation.pages[0].title).toBe('Home');
      expect(result.navigation.generated).toBe(false);
    });
  });

  describe('generateAutomaticNavigation', () => {
    it('should generate navigation from standard page files', () => {
      const files = [
        { name: 'about.md', path: 'about.md', type: 'file' },
        { name: 'projects.md', path: 'projects.md', type: 'file' },
        { name: 'skills.md', path: 'skills.md', type: 'file' },
        { name: 'README.md', path: 'README.md', type: 'file' } // Should be ignored
      ];

      const navigation = service.generateAutomaticNavigation(files, []);

      expect(navigation.pages).toHaveLength(3); // README should be ignored
      expect(navigation.menu).toHaveLength(3);
      expect(navigation.sections).toHaveLength(3);

      // Check menu order
      const menuTitles = navigation.menu.map(item => item.title);
      expect(menuTitles).toEqual(['About', 'Projects', 'Skills']);
    });

    it('should ignore files matching ignore patterns', () => {
      const files = [
        { name: 'about.md', path: 'about.md', type: 'file' },
        { name: 'README.md', path: 'README.md', type: 'file' },
        { name: 'LICENSE', path: 'LICENSE', type: 'file' },
        { name: '.gitignore', path: '.gitignore', type: 'file' },
        { name: '_config.yml', path: '_config.yml', type: 'file' }
      ];

      const navigation = service.generateAutomaticNavigation(files, []);

      expect(navigation.pages).toHaveLength(1); // Only about.md should be included
      expect(navigation.pages[0].title).toBe('About');
    });
  });

  describe('pageExists', () => {
    it('should return true when page exists', () => {
      const navigation = {
        pages: [
          { title: 'About', path: 'about', section: 'about' },
          { title: 'Projects', path: 'projects', section: 'projects' }
        ]
      };

      expect(service.pageExists('about', navigation)).toBe(true);
      expect(service.pageExists('projects', navigation)).toBe(true);
      expect(service.pageExists('nonexistent', navigation)).toBe(false);
    });
  });

  describe('getPageInfo', () => {
    it('should return page information when page exists', () => {
      const navigation = {
        pages: [
          { title: 'About Me', path: 'about', section: 'about', file: 'about.md' },
          { title: 'My Projects', path: 'projects', section: 'projects', file: 'projects.md' }
        ]
      };

      const pageInfo = service.getPageInfo('about', navigation);
      expect(pageInfo).toBeDefined();
      expect(pageInfo.title).toBe('About Me');
      expect(pageInfo.file).toBe('about.md');

      const nonexistentPage = service.getPageInfo('nonexistent', navigation);
      expect(nonexistentPage).toBeNull();
    });
  });

  describe('getPageContent', () => {
    it('should fetch and parse markdown content', async () => {
      // Mock navigation structure
      const navigationResult = {
        success: true,
        navigation: {
          pages: [
            { title: 'About', path: 'about', file: 'about.md', type: 'markdown' }
          ],
          repository: { ref: 'main' }
        }
      };

      // Mock getNavigationStructure
      vi.spyOn(service, 'getNavigationStructure').mockResolvedValue(navigationResult);

      // Mock file content
      const markdownContent = `---
title: About Me
description: My personal story
---

# About Me

This is my story...`;

      mockOctokit.rest.repos.getContent.mockResolvedValue({
        data: {
          content: Buffer.from(markdownContent).toString('base64'),
          encoding: 'base64',
          sha: 'content123'
        }
      });

      const result = await service.getPageContent('testuser', 'testrepo', 'about');

      expect(result.success).toBe(true);
      expect(result.content.type).toBe('markdown');
      expect(result.content.frontmatter.title).toBe('About Me');
      expect(result.content.body).toContain('# About Me');
    });

    it('should handle page not found', async () => {
      const navigationResult = {
        success: true,
        navigation: {
          pages: [],
          repository: { ref: 'main' }
        }
      };

      vi.spyOn(service, 'getNavigationStructure').mockResolvedValue(navigationResult);

      const result = await service.getPageContent('testuser', 'testrepo', 'nonexistent');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Page file not found');
    });
  });

  describe('parseMarkdownContent', () => {
    it('should parse markdown with frontmatter', () => {
      const content = `---
title: Test Page
author: John Doe
---

# Test Content

This is a test.`;

      const result = service.parseMarkdownContent(content);

      expect(result.type).toBe('markdown');
      expect(result.frontmatter.title).toBe('Test Page');
      expect(result.frontmatter.author).toBe('John Doe');
      expect(result.body).toBe('# Test Content\n\nThis is a test.');
    });

    it('should handle markdown without frontmatter', () => {
      const content = '# Simple Markdown\n\nJust content.';

      const result = service.parseMarkdownContent(content);

      expect(result.type).toBe('markdown');
      expect(result.frontmatter).toEqual({});
      expect(result.body).toBe(content);
    });

    it('should handle invalid frontmatter gracefully', () => {
      const content = `---
invalid: yaml: content
---

# Content`;

      const result = service.parseMarkdownContent(content);

      expect(result.type).toBe('markdown');
      expect(result.frontmatter).toEqual({});
      expect(result.body).toBe(content);
    });
  });

  describe('file type detection', () => {
    it('should detect file types correctly', () => {
      expect(service.getFileType('about.md')).toBe('markdown');
      expect(service.getFileType('data.json')).toBe('json');
      expect(service.getFileType('config.yaml')).toBe('yaml');
      expect(service.getFileType('config.yml')).toBe('yaml');
      expect(service.getFileType('page.html')).toBe('html');
      expect(service.getFileType('readme.txt')).toBe('text');
    });
  });

  describe('caching', () => {
    it('should cache navigation results', async () => {
      mockOctokit.rest.repos.get.mockResolvedValue({
        data: { default_branch: 'main' }
      });

      mockOctokit.rest.repos.getContent.mockResolvedValue({
        data: []
      });

      // First call
      await service.getNavigationStructure('testuser', 'testrepo');
      
      // Second call should use cache
      await service.getNavigationStructure('testuser', 'testrepo');

      // Should only call GitHub API once
      expect(mockOctokit.rest.repos.get).toHaveBeenCalledTimes(1);
    });

    it('should clear cache', async () => {
      service.cache.set('test', { data: 'test', timestamp: Date.now() });
      expect(service.cache.size).toBe(1);

      service.clearCache();
      expect(service.cache.size).toBe(0);
    });
  });
});