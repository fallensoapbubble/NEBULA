/**
 * Enhanced Template Components Tests
 * Tests for the enhanced template rendering components
 */

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { 
  GitHubFileRenderer, 
  TemplateSpecificRenderer, 
  CustomCSSRenderer, 
  RepositoryAssetRenderer,
  AdvancedProjectCard 
} from '../EnhancedTemplateComponents.js';
import { PortfolioDataProvider } from '../PortfolioDataProvider.js';
import { TemplateStyleProvider } from '../TemplateStyleProvider.js';

// Mock the logger
vi.mock('../../../lib/logger.js', () => ({
  logger: {
    child: () => ({
      warn: vi.fn(),
      error: vi.fn(),
      debug: vi.fn()
    })
  }
}));

// Test wrapper component
const TestWrapper = ({ children, portfolioData = {}, repository = null, template = null }) => (
  <TemplateStyleProvider template={template}>
    <PortfolioDataProvider data={portfolioData} repository={repository} template={template}>
      {children}
    </PortfolioDataProvider>
  </TemplateStyleProvider>
);

describe('GitHubFileRenderer', () => {
  const mockRepository = {
    full_name: 'user/repo',
    owner: 'user',
    name: 'repo'
  };

  it('renders markdown content correctly', () => {
    const markdownContent = '# Hello World\n\nThis is a test.';
    
    render(
      <TestWrapper repository={mockRepository}>
        <GitHubFileRenderer
          filePath="README.md"
          fileContent={markdownContent}
          repository={mockRepository}
        />
      </TestWrapper>
    );

    expect(screen.getByText('Hello World')).toBeInTheDocument();
    expect(screen.getByText('This is a test.')).toBeInTheDocument();
  });

  it('renders JSON content with syntax highlighting', () => {
    const jsonContent = '{"name": "test", "version": "1.0.0"}';
    
    render(
      <TestWrapper repository={mockRepository}>
        <GitHubFileRenderer
          filePath="package.json"
          fileContent={jsonContent}
          repository={mockRepository}
        />
      </TestWrapper>
    );

    expect(screen.getByText(/"name": "test"/)).toBeInTheDocument();
    expect(screen.getByText(/"version": "1.0.0"/)).toBeInTheDocument();
  });

  it('handles file content without repository', () => {
    const textContent = 'Plain text content';
    
    render(
      <TestWrapper>
        <GitHubFileRenderer
          filePath="test.txt"
          fileContent={textContent}
          repository={null}
        />
      </TestWrapper>
    );

    expect(screen.getByText('Plain text content')).toBeInTheDocument();
  });

  it('returns null for empty content', () => {
    const { container } = render(
      <TestWrapper>
        <GitHubFileRenderer
          filePath="test.txt"
          fileContent=""
          repository={mockRepository}
        />
      </TestWrapper>
    );

    expect(container.firstChild).toBeNull();
  });
});

describe('TemplateSpecificRenderer', () => {
  const mockTemplate = {
    id: 'test-template',
    structure: {
      section_configs: {
        projects: {
          layout: 'grid',
          styling: {
            gridCols: 'grid-cols-2'
          }
        }
      }
    }
  };

  it('renders grid layout correctly', () => {
    const sectionData = [
      { name: 'Project 1', description: 'First project' },
      { name: 'Project 2', description: 'Second project' }
    ];

    render(
      <TestWrapper template={mockTemplate}>
        <TemplateSpecificRenderer
          template={mockTemplate}
          sectionName="projects"
          sectionData={sectionData}
        />
      </TestWrapper>
    );

    expect(screen.getByText('Project 1')).toBeInTheDocument();
    expect(screen.getByText('Project 2')).toBeInTheDocument();
    
    // Check for grid layout classes
    const gridContainer = screen.getByText('Project 1').closest('.grid');
    expect(gridContainer).toHaveClass('grid-cols-2');
  });

  it('renders list layout correctly', () => {
    const mockTemplateList = {
      ...mockTemplate,
      structure: {
        section_configs: {
          experience: {
            layout: 'list'
          }
        }
      }
    };

    const sectionData = [
      { position: 'Developer', company: 'Company A' },
      { position: 'Designer', company: 'Company B' }
    ];

    render(
      <TestWrapper template={mockTemplateList}>
        <TemplateSpecificRenderer
          template={mockTemplateList}
          sectionName="experience"
          sectionData={sectionData}
        />
      </TestWrapper>
    );

    expect(screen.getByText('Developer')).toBeInTheDocument();
    expect(screen.getByText('Designer')).toBeInTheDocument();
  });

  it('handles empty section data', () => {
    const { container } = render(
      <TestWrapper template={mockTemplate}>
        <TemplateSpecificRenderer
          template={mockTemplate}
          sectionName="projects"
          sectionData={null}
        />
      </TestWrapper>
    );

    expect(container.firstChild.textContent).toBe('');
  });
});

describe('CustomCSSRenderer', () => {
  const mockRepository = {
    full_name: 'user/repo'
  };

  it('applies custom CSS correctly', async () => {
    const customCSS = '.test-class { color: red; }';
    
    render(
      <TestWrapper repository={mockRepository}>
        <CustomCSSRenderer
          cssContent={customCSS}
          repository={mockRepository}
        >
          <div className="test-content">Test content</div>
        </CustomCSSRenderer>
      </TestWrapper>
    );

    expect(screen.getByText('Test content')).toBeInTheDocument();
    
    // Check if CSS was injected
    await waitFor(() => {
      const styleElements = document.querySelectorAll('style');
      const hasCustomCSS = Array.from(styleElements).some(style => 
        style.textContent.includes('.test-class')
      );
      expect(hasCustomCSS).toBe(true);
    });
  });

  it('processes repository URLs in CSS', async () => {
    const customCSS = '.bg-image { background-image: url("./assets/bg.jpg"); }';
    
    render(
      <TestWrapper repository={mockRepository}>
        <CustomCSSRenderer
          cssContent={customCSS}
          repository={mockRepository}
        >
          <div>Test</div>
        </CustomCSSRenderer>
      </TestWrapper>
    );

    await waitFor(() => {
      const styleElements = document.querySelectorAll('style');
      const hasProcessedURL = Array.from(styleElements).some(style => 
        style.textContent.includes('https://raw.githubusercontent.com/user/repo/main/assets/bg.jpg')
      );
      expect(hasProcessedURL).toBe(true);
    });
  });
});

describe('RepositoryAssetRenderer', () => {
  const mockRepository = {
    full_name: 'user/repo'
  };

  const mockPortfolioData = {
    getAssetUrl: (path) => `https://raw.githubusercontent.com/user/repo/main/${path}`
  };

  it('renders image assets correctly', () => {
    render(
      <TestWrapper portfolioData={mockPortfolioData} repository={mockRepository}>
        <RepositoryAssetRenderer
          assetPath="images/test.jpg"
          repository={mockRepository}
          assetType="image"
        />
      </TestWrapper>
    );

    const img = screen.getByRole('img');
    expect(img).toHaveAttribute('src', 'https://raw.githubusercontent.com/user/repo/main/images/test.jpg');
    expect(img).toHaveAttribute('alt', 'images/test.jpg');
  });

  it('shows fallback for missing assets', () => {
    render(
      <TestWrapper portfolioData={mockPortfolioData} repository={mockRepository}>
        <RepositoryAssetRenderer
          assetPath=""
          repository={mockRepository}
        />
      </TestWrapper>
    );

    expect(screen.getByText(/Asset not found/)).toBeInTheDocument();
  });

  it('renders custom fallback', () => {
    const customFallback = <div>Custom fallback content</div>;
    
    render(
      <TestWrapper portfolioData={mockPortfolioData} repository={mockRepository}>
        <RepositoryAssetRenderer
          assetPath=""
          repository={mockRepository}
          fallback={customFallback}
        />
      </TestWrapper>
    );

    expect(screen.getByText('Custom fallback content')).toBeInTheDocument();
  });
});

describe('AdvancedProjectCard', () => {
  const mockRepository = {
    full_name: 'user/repo',
    owner: 'user'
  };

  const mockProject = {
    name: 'Test Project',
    description: 'A test project for demonstration',
    technologies: ['React', 'JavaScript'],
    demo: 'https://demo.example.com',
    source: 'https://github.com/user/test-project',
    github: {
      stargazers_count: 42,
      forks_count: 7,
      language: 'JavaScript',
      topics: ['react', 'frontend']
    }
  };

  it('renders project information correctly', () => {
    render(
      <TestWrapper repository={mockRepository}>
        <AdvancedProjectCard
          project={mockProject}
          repository={mockRepository}
        />
      </TestWrapper>
    );

    expect(screen.getByText('Test Project')).toBeInTheDocument();
    expect(screen.getByText('A test project for demonstration')).toBeInTheDocument();
    expect(screen.getByText('React')).toBeInTheDocument();
    expect(screen.getByText('JavaScript')).toBeInTheDocument();
  });

  it('displays GitHub statistics', () => {
    render(
      <TestWrapper repository={mockRepository}>
        <AdvancedProjectCard
          project={mockProject}
          repository={mockRepository}
          showGitHubStats={true}
        />
      </TestWrapper>
    );

    expect(screen.getByText('42')).toBeInTheDocument(); // stars
    expect(screen.getByText('7')).toBeInTheDocument(); // forks
  });

  it('renders project topics', () => {
    render(
      <TestWrapper repository={mockRepository}>
        <AdvancedProjectCard
          project={mockProject}
          repository={mockRepository}
        />
      </TestWrapper>
    );

    expect(screen.getByText('react')).toBeInTheDocument();
    expect(screen.getByText('frontend')).toBeInTheDocument();
  });

  it('renders action buttons', () => {
    render(
      <TestWrapper repository={mockRepository}>
        <AdvancedProjectCard
          project={mockProject}
          repository={mockRepository}
        />
      </TestWrapper>
    );

    const demoLink = screen.getByText('Demo').closest('a');
    const sourceLink = screen.getByText('Source').closest('a');

    expect(demoLink).toHaveAttribute('href', 'https://demo.example.com');
    expect(sourceLink).toHaveAttribute('href', 'https://github.com/user/test-project');
  });

  it('handles different variants', () => {
    const { rerender } = render(
      <TestWrapper repository={mockRepository}>
        <AdvancedProjectCard
          project={mockProject}
          repository={mockRepository}
          variant="featured"
        />
      </TestWrapper>
    );

    expect(screen.getByText('Test Project').closest('.advanced-project-card')).toHaveClass('bg-gradient-to-br');

    rerender(
      <TestWrapper repository={mockRepository}>
        <AdvancedProjectCard
          project={mockProject}
          repository={mockRepository}
          variant="compact"
        />
      </TestWrapper>
    );

    expect(screen.getByText('Test Project').closest('.advanced-project-card')).toHaveClass('p-4');
  });
});

describe('Helper Functions', () => {
  // These would test the helper functions if they were exported
  // For now, we test them indirectly through the components
  
  it('detects file types correctly through GitHubFileRenderer', () => {
    render(
      <TestWrapper>
        <GitHubFileRenderer
          filePath="test.json"
          fileContent='{"test": true}'
        />
      </TestWrapper>
    );

    // Should render as JSON (with pre/code tags)
    expect(screen.getByText('{')).toBeInTheDocument();
  });

  it('processes markdown for GitHub correctly', () => {
    const mockRepository = { full_name: 'user/repo' };
    const markdownWithRelativeImage = '![Test](./image.png)';
    
    render(
      <TestWrapper repository={mockRepository}>
        <GitHubFileRenderer
          filePath="README.md"
          fileContent={markdownWithRelativeImage}
          repository={mockRepository}
        />
      </TestWrapper>
    );

    // The image should be processed to use GitHub raw URL
    // This is tested indirectly through the component behavior
    expect(screen.getByRole('img')).toBeInTheDocument();
  });
});