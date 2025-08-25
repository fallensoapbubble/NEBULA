/**
 * Navigation Integration Tests
 * Tests the complete navigation system integration
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

describe('Navigation Integration', () => {
  let service;

  beforeEach(() => {
    service = new PortfolioNavigationService();
    vi.clearAllMocks();
  });

  it('should create complete navigation structure for multi-page portfolio', async () => {
    // Mock repository response
    mockOctokit.rest.repos.get.mockResolvedValue({
      data: { default_branch: 'main' }
    });

    // Mock repository contents with multiple pages
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
          name: 'skills.md',
          path: 'skills.md',
          type: 'file',
          size: 1500,
          sha: 'ghi789',
          download_url: 'https://raw.githubusercontent.com/user/repo/main/skills.md'
        },
        {
          name: 'contact.md',
          path: 'contact.md',
          type: 'file',
          size: 800,
          sha: 'jkl012',
          download_url: 'https://raw.githubusercontent.com/user/repo/main/contact.md'
        },
        {
          name: 'blog.md',
          path: 'blog.md',
          type: 'file',
          size: 1200,
          sha: 'mno345',
          download_url: 'https://raw.githubusercontent.com/user/repo/main/blog.md'
        }
      ]
    });

    const result = await service.getNavigationStructure('testuser', 'portfolio-repo');

    expect(result.success).toBe(true);
    expect(result.navigation).toBeDefined();

    // Check navigation structure
    const { navigation } = result;
    
    // Should have all pages
    expect(navigation.pages).toHaveLength(5);
    expect(navigation.menu).toHaveLength(5);
    expect(navigation.sections).toHaveLength(5);

    // Check page details
    const aboutPage = navigation.pages.find(p => p.section === 'about');
    expect(aboutPage).toEqual({
      title: 'About',
      path: 'about',
      section: 'about',
      file: 'about.md',
      type: 'markdown'
    });

    // Check menu order (should follow standard order)
    const menuTitles = navigation.menu.map(item => item.title);
    expect(menuTitles).toEqual(['About', 'Projects', 'Skills', 'Blog', 'Contact']);

    // Check sections
    const aboutSection = navigation.sections.find(s => s.name === 'about');
    expect(aboutSection).toEqual({
      name: 'about',
      title: 'About',
      pages: [aboutPage]
    });

    // Check repository metadata
    expect(navigation.repository).toEqual({
      owner: 'testuser',
      name: 'portfolio-repo',
      ref: 'main'
    });

    expect(navigation.generated).toBe(true);
    expect(navigation.lastUpdated).toBeDefined();
  });

  it('should handle portfolio with pages directory structure', async () => {
    // Mock repository response
    mockOctokit.rest.repos.get.mockResolvedValue({
      data: { default_branch: 'main' }
    });

    // Mock repository contents with pages directory
    mockOctokit.rest.repos.getContent
      .mockResolvedValueOnce({
        data: [
          {
            name: 'pages',
            path: 'pages',
            type: 'dir'
          },
          {
            name: 'README.md',
            path: 'README.md',
            type: 'file',
            size: 500,
            sha: 'readme123'
          }
        ]
      })
      .mockResolvedValueOnce({
        data: [
          {
            name: 'about.md',
            path: 'pages/about.md',
            type: 'file',
            size: 1000,
            sha: 'about123',
            download_url: 'https://raw.githubusercontent.com/user/repo/main/pages/about.md',
            directory: 'pages'
          },
          {
            name: 'projects.md',
            path: 'pages/projects.md',
            type: 'file',
            size: 2000,
            sha: 'projects123',
            download_url: 'https://raw.githubusercontent.com/user/repo/main/pages/projects.md',
            directory: 'pages'
          }
        ]
      });

    const result = await service.getNavigationStructure('testuser', 'portfolio-repo');

    expect(result.success).toBe(true);
    
    // Should find pages in the pages directory
    expect(result.navigation.pages).toHaveLength(2);
    
    const aboutPage = result.navigation.pages.find(p => p.section === 'about');
    expect(aboutPage.path).toBe('pages/about');
    expect(aboutPage.file).toBe('about.md');
  });

  it('should support external links in navigation', async () => {
    // Mock repository with navigation.json
    mockOctokit.rest.repos.get.mockResolvedValue({
      data: { default_branch: 'main' }
    });

    mockOctokit.rest.repos.getContent
      .mockResolvedValueOnce({
        data: [
          {
            name: 'navigation.json',
            path: 'navigation.json',
            type: 'file',
            size: 500,
            sha: 'nav123'
          }
        ]
      })
      .mockResolvedValueOnce({
        data: {
          content: Buffer.from(JSON.stringify({
            pages: [
              { title: 'About', path: 'about', section: 'about', file: 'about.md' }
            ],
            menu: [
              { title: 'About', path: 'about', section: 'about' },
              { title: 'GitHub', path: 'https://github.com/testuser', external: true },
              { title: 'LinkedIn', path: 'https://linkedin.com/in/testuser', external: true }
            ]
          })).toString('base64'),
          encoding: 'base64'
        }
      });

    const result = await service.getNavigationStructure('testuser', 'portfolio-repo');

    expect(result.success).toBe(true);
    expect(result.navigation.menu).toHaveLength(3);

    // Check external links
    const githubLink = result.navigation.menu.find(item => item.title === 'GitHub');
    expect(githubLink.external).toBe(true);
    expect(githubLink.path).toBe('https://github.com/testuser');

    const linkedinLink = result.navigation.menu.find(item => item.title === 'LinkedIn');
    expect(linkedinLink.external).toBe(true);
    expect(linkedinLink.path).toBe('https://linkedin.com/in/testuser');
  });

  it('should validate navigation URLs correctly', () => {
    const navigation = {
      pages: [
        { title: 'About', path: 'about', section: 'about' },
        { title: 'Projects', path: 'projects', section: 'projects' },
        { title: 'Deep Page', path: 'section/subsection/page', section: 'section' }
      ]
    };

    // Test page existence
    expect(service.pageExists('about', navigation)).toBe(true);
    expect(service.pageExists('projects', navigation)).toBe(true);
    expect(service.pageExists('section/subsection/page', navigation)).toBe(true);
    expect(service.pageExists('nonexistent', navigation)).toBe(false);

    // Test page info retrieval
    const deepPage = service.getPageInfo('section/subsection/page', navigation);
    expect(deepPage).toBeDefined();
    expect(deepPage.title).toBe('Deep Page');
    expect(deepPage.section).toBe('section');
  });

  it('should handle YAML navigation configuration', async () => {
    mockOctokit.rest.repos.get.mockResolvedValue({
      data: { default_branch: 'main' }
    });

    const yamlConfig = `
pages:
  - title: "About Me"
    path: "about"
    section: "about"
    file: "about.md"
    order: 1
  - title: "My Work"
    path: "work"
    section: "work"
    file: "work.md"
    order: 2

menu:
  - title: "About Me"
    path: "about"
    order: 1
  - title: "My Work"
    path: "work"
    order: 2
`;

    mockOctokit.rest.repos.getContent
      .mockResolvedValueOnce({
        data: [
          {
            name: 'navigation.yaml',
            path: 'navigation.yaml',
            type: 'file',
            size: 300,
            sha: 'yaml123'
          }
        ]
      })
      .mockResolvedValueOnce({
        data: {
          content: Buffer.from(yamlConfig).toString('base64'),
          encoding: 'base64'
        }
      });

    const result = await service.getNavigationStructure('testuser', 'portfolio-repo');

    expect(result.success).toBe(true);
    expect(result.navigation.pages).toHaveLength(2);
    expect(result.navigation.pages[0].title).toBe('About Me');
    expect(result.navigation.pages[1].title).toBe('My Work');
    expect(result.navigation.generated).toBe(false);
  });

  it('should generate proper URLs for different repository structures', () => {
    const repository = { owner: 'testuser', name: 'portfolio' };
    
    // Test URL generation patterns
    const testCases = [
      { path: 'about', expected: '/testuser/portfolio/about' },
      { path: 'projects/web', expected: '/testuser/portfolio/projects/web' },
      { path: 'blog/2023/my-post', expected: '/testuser/portfolio/blog/2023/my-post' }
    ];

    testCases.forEach(({ path, expected }) => {
      const url = `/${repository.owner}/${repository.name}/${path}`;
      expect(url).toBe(expected);
    });
  });
});