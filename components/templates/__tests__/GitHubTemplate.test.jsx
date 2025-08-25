/**
 * GitHubTemplate Component Tests
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { GitHubTemplate } from '../layouts/GitHubTemplate.js';
import { PortfolioDataProvider } from '../PortfolioDataProvider.js';
import { TemplateStyleProvider } from '../TemplateStyleProvider.js';

// Mock the logger
vi.mock('../../../lib/logger.js', () => ({
  logger: {
    child: () => ({
      info: vi.fn(),
      error: vi.fn(),
      warn: vi.fn(),
      debug: vi.fn()
    })
  }
}));

// Mock UI components
vi.mock('../../ui/Card.js', () => ({
  GlassCard: ({ children, className, ...props }) => (
    <div className={`glass-card ${className || ''}`} {...props}>{children}</div>
  ),
  GlassCardContent: ({ children, className, ...props }) => (
    <div className={`glass-card-content ${className || ''}`} {...props}>{children}</div>
  ),
  GlassCardHeader: ({ children, className, ...props }) => (
    <div className={`glass-card-header ${className || ''}`} {...props}>{children}</div>
  ),
  GlassCardTitle: ({ children, className, ...props }) => (
    <h3 className={`glass-card-title ${className || ''}`} {...props}>{children}</h3>
  )
}));

// Test wrapper component
const TestWrapper = ({ children, portfolioData, repository, template }) => (
  <TemplateStyleProvider template={template} isPreview={true}>
    <PortfolioDataProvider data={portfolioData} repository={repository} template={template}>
      {children}
    </PortfolioDataProvider>
  </TemplateStyleProvider>
);

describe('GitHubTemplate', () => {
  const mockRepository = {
    name: 'test-repo',
    full_name: 'testuser/test-repo',
    description: 'A test repository',
    html_url: 'https://github.com/testuser/test-repo',
    stargazers_count: 42,
    forks_count: 7,
    watchers_count: 15,
    language: 'JavaScript',
    created_at: '2023-01-01T00:00:00Z',
    updated_at: '2023-12-01T00:00:00Z',
    pushed_at: '2023-12-01T12:00:00Z',
    size: 1024
  };

  const mockPortfolioData = {
    'data.json': JSON.stringify({
      metadata: {
        name: 'John Doe',
        title: 'Full Stack Developer',
        bio: 'Passionate developer with expertise in modern web technologies.',
        avatar: 'avatar.jpg',
        location: 'San Francisco, CA',
        company: 'Tech Corp',
        social: {
          github: 'https://github.com/johndoe',
          linkedin: 'https://linkedin.com/in/johndoe',
          twitter: 'https://twitter.com/johndoe'
        }
      },
      sections: {
        projects: [
          {
            name: 'Awesome Project',
            description: 'A really awesome project built with React',
            technologies: ['React', 'Node.js', 'MongoDB'],
            demo: 'https://awesome-project.com',
            source: 'https://github.com/johndoe/awesome-project',
            image: 'project1.jpg',
            github: {
              stargazers_count: 25,
              forks_count: 5,
              language: 'JavaScript'
            }
          }
        ],
        skills: [
          {
            category: 'Frontend',
            items: [
              { name: 'React', level: 5 },
              { name: 'Vue.js', level: 4 },
              { name: 'TypeScript', level: 4 }
            ]
          }
        ]
      }
    }),
    'README.md': '# Test Repository\n\nThis is a test repository for portfolio rendering.\n\n## Features\n\n- Feature 1\n- Feature 2\n- Feature 3'
  };

  const mockTemplate = {
    id: 'github',
    name: 'GitHub Template',
    metadata: {
      type: 'github',
      theme: 'default'
    }
  };

  it('renders without crashing', () => {
    render(
      <TestWrapper 
        portfolioData={mockPortfolioData} 
        repository={mockRepository} 
        template={mockTemplate}
      >
        <GitHubTemplate 
          template={mockTemplate}
          portfolioData={mockPortfolioData}
          repositoryInfo={mockRepository}
          isPreview={true}
        />
      </TestWrapper>
    );

    expect(screen.getByText('John Doe')).toBeInTheDocument();
    expect(screen.getByText('Full Stack Developer')).toBeInTheDocument();
  });

  it('displays repository information', () => {
    render(
      <TestWrapper 
        portfolioData={mockPortfolioData} 
        repository={mockRepository} 
        template={mockTemplate}
      >
        <GitHubTemplate 
          template={mockTemplate}
          portfolioData={mockPortfolioData}
          repositoryInfo={mockRepository}
          isPreview={true}
        />
      </TestWrapper>
    );

    expect(screen.getByText('test-repo')).toBeInTheDocument();
    expect(screen.getByText('A test repository')).toBeInTheDocument();
    expect(screen.getByText('JavaScript')).toBeInTheDocument();
  });

  it('displays projects with GitHub stats', () => {
    render(
      <TestWrapper 
        portfolioData={mockPortfolioData} 
        repository={mockRepository} 
        template={mockTemplate}
      >
        <GitHubTemplate 
          template={mockTemplate}
          portfolioData={mockPortfolioData}
          repositoryInfo={mockRepository}
          isPreview={true}
        />
      </TestWrapper>
    );

    expect(screen.getByText('Awesome Project')).toBeInTheDocument();
    expect(screen.getByText('A really awesome project built with React')).toBeInTheDocument();
    expect(screen.getByText('React')).toBeInTheDocument();
    expect(screen.getByText('Node.js')).toBeInTheDocument();
  });

  it('displays README content', () => {
    render(
      <TestWrapper 
        portfolioData={mockPortfolioData} 
        repository={mockRepository} 
        template={mockTemplate}
      >
        <GitHubTemplate 
          template={mockTemplate}
          portfolioData={mockPortfolioData}
          repositoryInfo={mockRepository}
          isPreview={true}
        />
      </TestWrapper>
    );

    expect(screen.getByText('README')).toBeInTheDocument();
  });

  it('displays skills in sidebar', () => {
    render(
      <TestWrapper 
        portfolioData={mockPortfolioData} 
        repository={mockRepository} 
        template={mockTemplate}
      >
        <GitHubTemplate 
          template={mockTemplate}
          portfolioData={mockPortfolioData}
          repositoryInfo={mockRepository}
          isPreview={true}
        />
      </TestWrapper>
    );

    expect(screen.getByText('Skills')).toBeInTheDocument();
    expect(screen.getByText('Frontend')).toBeInTheDocument();
  });

  it('displays social links', () => {
    render(
      <TestWrapper 
        portfolioData={mockPortfolioData} 
        repository={mockRepository} 
        template={mockTemplate}
      >
        <GitHubTemplate 
          template={mockTemplate}
          portfolioData={mockPortfolioData}
          repositoryInfo={mockRepository}
          isPreview={true}
        />
      </TestWrapper>
    );

    // Social links should be rendered
    const githubLinks = screen.getAllByText(/github/i);
    expect(githubLinks.length).toBeGreaterThan(0);
  });

  it('handles missing repository gracefully', () => {
    render(
      <TestWrapper 
        portfolioData={mockPortfolioData} 
        repository={null} 
        template={mockTemplate}
      >
        <GitHubTemplate 
          template={mockTemplate}
          portfolioData={mockPortfolioData}
          repositoryInfo={null}
          isPreview={true}
        />
      </TestWrapper>
    );

    // Should still render the basic profile information
    expect(screen.getByText('John Doe')).toBeInTheDocument();
    expect(screen.getByText('Full Stack Developer')).toBeInTheDocument();
  });

  it('handles empty portfolio data gracefully', () => {
    const emptyData = {};
    
    render(
      <TestWrapper 
        portfolioData={emptyData} 
        repository={mockRepository} 
        template={mockTemplate}
      >
        <GitHubTemplate 
          template={mockTemplate}
          portfolioData={emptyData}
          repositoryInfo={mockRepository}
          isPreview={true}
        />
      </TestWrapper>
    );

    // Should still render repository information
    expect(screen.getByText('test-repo')).toBeInTheDocument();
  });
});