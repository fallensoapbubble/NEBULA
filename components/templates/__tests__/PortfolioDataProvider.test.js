/**
 * PortfolioDataProvider Component Tests
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { PortfolioDataProvider, usePortfolioData } from '../PortfolioDataProvider.js';

// Mock logger
vi.mock('../../../lib/logger.js', () => ({
  logger: {
    child: () => ({
      warn: vi.fn(),
      error: vi.fn()
    })
  }
}));

// Test component that uses the hook
const TestComponent = () => {
  const {
    portfolio,
    repository,
    template,
    getSection,
    hasSection,
    getSectionData,
    getMetadata,
    getAssetUrl
  } = usePortfolioData();

  return (
    <div>
      <div data-testid="portfolio-name">{portfolio.metadata?.name || 'No Name'}</div>
      <div data-testid="repository-name">{repository?.full_name || 'No Repo'}</div>
      <div data-testid="template-id">{template?.id || 'No Template'}</div>
      <div data-testid="has-about">{hasSection('about') ? 'Yes' : 'No'}</div>
      <div data-testid="about-data">{getSectionData('about', 'No About')}</div>
      <div data-testid="metadata-title">{getMetadata('title', 'No Title')}</div>
      <div data-testid="asset-url">{getAssetUrl('avatar.jpg') || 'No URL'}</div>
    </div>
  );
};

describe('PortfolioDataProvider', () => {
  const mockRepository = {
    full_name: 'johndoe/portfolio',
    url: 'https://github.com/johndoe/portfolio'
  };

  const mockTemplate = {
    id: 'default',
    name: 'Default Template'
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('provides portfolio data to children', () => {
    const mockData = {
      'data.json': JSON.stringify({
        metadata: {
          name: 'John Doe',
          title: 'Developer'
        },
        sections: {
          about: {
            type: 'text',
            data: 'About John'
          }
        }
      })
    };

    render(
      <PortfolioDataProvider
        data={mockData}
        repository={mockRepository}
        template={mockTemplate}
      >
        <TestComponent />
      </PortfolioDataProvider>
    );

    expect(screen.getByTestId('portfolio-name')).toHaveTextContent('John Doe');
    expect(screen.getByTestId('repository-name')).toHaveTextContent('johndoe/portfolio');
    expect(screen.getByTestId('template-id')).toHaveTextContent('default');
    expect(screen.getByTestId('metadata-title')).toHaveTextContent('Developer');
  });

  it('processes markdown files correctly', () => {
    const mockData = {
      'about.md': '# About Me\nI am a developer'
    };

    render(
      <PortfolioDataProvider
        data={mockData}
        repository={mockRepository}
        template={mockTemplate}
      >
        <TestComponent />
      </PortfolioDataProvider>
    );

    expect(screen.getByTestId('has-about')).toHaveTextContent('Yes');
  });

  it('processes projects data correctly', () => {
    const mockData = {
      'projects.json': JSON.stringify([
        {
          name: 'Project 1',
          description: 'First project'
        }
      ])
    };

    const TestProjectsComponent = () => {
      const { getSectionData } = usePortfolioData();
      const projects = getSectionData('projects', []);
      
      return (
        <div data-testid="projects-count">{projects.length}</div>
      );
    };

    render(
      <PortfolioDataProvider
        data={mockData}
        repository={mockRepository}
        template={mockTemplate}
      >
        <TestProjectsComponent />
      </PortfolioDataProvider>
    );

    expect(screen.getByTestId('projects-count')).toHaveTextContent('1');
  });

  it('handles missing data gracefully', () => {
    render(
      <PortfolioDataProvider
        data={null}
        repository={mockRepository}
        template={mockTemplate}
      >
        <TestComponent />
      </PortfolioDataProvider>
    );

    expect(screen.getByTestId('portfolio-name')).toHaveTextContent('Portfolio');
    expect(screen.getByTestId('has-about')).toHaveTextContent('No');
    expect(screen.getByTestId('about-data')).toHaveTextContent('No About');
  });

  it('generates asset URLs correctly', () => {
    render(
      <PortfolioDataProvider
        data={{}}
        repository={mockRepository}
        template={mockTemplate}
      >
        <TestComponent />
      </PortfolioDataProvider>
    );

    expect(screen.getByTestId('asset-url')).toHaveTextContent(
      'https://raw.githubusercontent.com/johndoe/portfolio/main/avatar.jpg'
    );
  });

  it('handles asset URL generation without repository', () => {
    render(
      <PortfolioDataProvider
        data={{}}
        repository={null}
        template={mockTemplate}
      >
        <TestComponent />
      </PortfolioDataProvider>
    );

    expect(screen.getByTestId('asset-url')).toHaveTextContent('No URL');
  });

  it('processes experience data correctly', () => {
    const mockData = {
      'experience.json': JSON.stringify([
        {
          position: 'Developer',
          company: 'Tech Corp',
          duration: '2020-2023'
        }
      ])
    };

    const TestExperienceComponent = () => {
      const { getSectionData } = usePortfolioData();
      const experience = getSectionData('experience', []);
      
      return (
        <div data-testid="experience-count">{experience.length}</div>
      );
    };

    render(
      <PortfolioDataProvider
        data={mockData}
        repository={mockRepository}
        template={mockTemplate}
      >
        <TestExperienceComponent />
      </PortfolioDataProvider>
    );

    expect(screen.getByTestId('experience-count')).toHaveTextContent('1');
  });

  it('processes skills data correctly', () => {
    const mockData = {
      'skills.json': JSON.stringify([
        {
          category: 'Programming',
          items: [
            { name: 'JavaScript', level: 5 },
            { name: 'Python', level: 4 }
          ]
        }
      ])
    };

    const TestSkillsComponent = () => {
      const { getSectionData } = usePortfolioData();
      const skills = getSectionData('skills', []);
      
      return (
        <div data-testid="skills-count">{skills.length}</div>
      );
    };

    render(
      <PortfolioDataProvider
        data={mockData}
        repository={mockRepository}
        template={mockTemplate}
      >
        <TestSkillsComponent />
      </PortfolioDataProvider>
    );

    expect(screen.getByTestId('skills-count')).toHaveTextContent('1');
  });

  it('processes contact data correctly', () => {
    const mockData = {
      'contact.json': JSON.stringify({
        email: 'john@example.com',
        phone: '+1234567890',
        message: 'Get in touch!'
      })
    };

    const TestContactComponent = () => {
      const { getSectionData } = usePortfolioData();
      const contact = getSectionData('contact', {});
      
      return (
        <div data-testid="contact-email">{contact.email || 'No Email'}</div>
      );
    };

    render(
      <PortfolioDataProvider
        data={mockData}
        repository={mockRepository}
        template={mockTemplate}
      >
        <TestContactComponent />
      </PortfolioDataProvider>
    );

    expect(screen.getByTestId('contact-email')).toHaveTextContent('john@example.com');
  });

  it('throws error when used outside provider', () => {
    // Suppress console.error for this test
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    
    expect(() => {
      render(<TestComponent />);
    }).toThrow('usePortfolioData must be used within a PortfolioDataProvider');
    
    consoleSpy.mockRestore();
  });
});