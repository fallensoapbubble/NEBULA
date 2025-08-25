/**
 * Enhanced Portfolio Renderer Tests
 * Tests for the template rendering engine and enhanced portfolio renderer
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { EnhancedPortfolioRenderer } from '../../portfolio/EnhancedPortfolioRenderer';
import { TemplateRenderingEngine } from '../../../lib/template-rendering-engine';

// Mock Next.js components
jest.mock('next/image', () => {
  return function MockImage({ src, alt, ...props }) {
    return <img src={src} alt={alt} {...props} />;
  };
});

jest.mock('next/link', () => {
  return function MockLink({ href, children, ...props }) {
    return <a href={href} {...props}>{children}</a>;
  };
});

describe('TemplateRenderingEngine', () => {
  let engine;

  beforeEach(() => {
    engine = new TemplateRenderingEngine();
  });

  describe('Template Registration', () => {
    it('should register default templates', () => {
      const templates = engine.getAvailableTemplates();
      expect(templates).toHaveLength(4);
      
      const templateIds = templates.map(t => t.id);
      expect(templateIds).toContain('default');
      expect(templateIds).toContain('minimal');
      expect(templateIds).toContain('modern');
      expect(templateIds).toContain('classic');
    });

    it('should register custom templates', () => {
      engine.registerTemplate('custom', {
        name: 'Custom Template',
        sections: ['header', 'content'],
        components: { header: 'CustomHeader', content: 'CustomContent' }
      });

      const template = engine.getTemplate('custom');
      expect(template).toBeDefined();
      expect(template.name).toBe('Custom Template');
    });
  });

  describe('Data Format Processing', () => {
    it('should process JSON data', () => {
      const jsonData = '{"name": "John Doe", "title": "Developer"}';
      const result = engine.processJsonData(jsonData);
      
      expect(result).toEqual({
        name: 'John Doe',
        title: 'Developer'
      });
    });

    it('should process YAML data', () => {
      const yamlData = 'name: John Doe\ntitle: Developer';
      const result = engine.processYamlData(yamlData);
      
      expect(result).toEqual({
        name: 'John Doe',
        title: 'Developer'
      });
    });

    it('should process Markdown with frontmatter', () => {
      const markdownData = `---
title: About Me
author: John Doe
---

# About

This is my about section.`;

      const result = engine.processMarkdownData(markdownData);
      
      expect(result.frontmatter).toEqual({
        title: 'About Me',
        author: 'John Doe'
      });
      expect(result.body).toContain('# About');
      expect(result.html).toContain('<h1>About</h1>');
    });
  });

  describe('Portfolio Data Processing', () => {
    it('should process portfolio data with default template', () => {
      const portfolioData = {
        name: 'John Doe',
        title: 'Full Stack Developer',
        description: 'Passionate developer',
        about: {
          content: 'I am a developer with 5 years of experience.',
          format: 'text'
        },
        projects: [
          {
            name: 'Project 1',
            description: 'A cool project',
            technologies: ['React', 'Node.js']
          }
        ],
        skills: ['JavaScript', 'Python', 'React'],
        contact: {
          email: 'john@example.com',
          linkedin: 'https://linkedin.com/in/johndoe'
        }
      };

      const result = engine.processPortfolioData(portfolioData);
      
      expect(result.template.id).toBe('default');
      expect(result.data.name).toBe('John Doe');
      expect(result.componentProps.header).toBeDefined();
      expect(result.componentProps.projects).toBeDefined();
    });

    it('should process portfolio data with modern template', () => {
      const portfolioData = {
        name: 'Jane Smith',
        title: 'UI/UX Designer',
        description: 'Creative designer'
      };

      const result = engine.processPortfolioData(portfolioData, 'modern');
      
      expect(result.template.id).toBe('modern');
      expect(result.template.layout).toBe('hero');
      expect(result.data.hero).toBeDefined();
    });
  });

  describe('Component Props Generation', () => {
    it('should generate correct props for header section', () => {
      const data = {
        name: 'John Doe',
        title: 'Developer',
        avatar: 'https://example.com/avatar.jpg',
        repository: { owner: 'johndoe', name: 'portfolio' }
      };
      const template = engine.getTemplate('default');
      
      const props = engine.generateSectionProps('header', data, template);
      
      expect(props.name).toBe('John Doe');
      expect(props.title).toBe('Developer');
      expect(props.avatar).toBe('https://example.com/avatar.jpg');
      expect(props.repository).toEqual({ owner: 'johndoe', name: 'portfolio' });
    });

    it('should generate correct props for projects section', () => {
      const data = {
        projects: [
          { name: 'Project 1', description: 'First project' },
          { name: 'Project 2', description: 'Second project' }
        ]
      };
      const template = engine.getTemplate('default');
      
      const props = engine.generateSectionProps('projects', data, template);
      
      expect(props.projects).toHaveLength(2);
      expect(props.showTechnologies).toBe(true);
    });
  });

  describe('Color Scheme Generation', () => {
    it('should generate blue color scheme', () => {
      const colors = engine.generateColorScheme('blue');
      
      expect(colors.primary).toBe('#3B82F6');
      expect(colors.secondary).toBe('#1E40AF');
      expect(colors.background).toBe('#F8FAFC');
    });

    it('should generate modern color scheme', () => {
      const colors = engine.generateColorScheme('blue-purple');
      
      expect(colors.primary).toBe('#6366F1');
      expect(colors.secondary).toBe('#8B5CF6');
    });
  });
});

describe('EnhancedPortfolioRenderer', () => {
  const mockRepository = {
    owner: 'johndoe',
    name: 'portfolio',
    url: 'https://github.com/johndoe/portfolio'
  };

  const mockPortfolioData = {
    name: 'John Doe',
    title: 'Full Stack Developer',
    description: 'Passionate about creating amazing web experiences',
    avatar: 'https://github.com/johndoe.png',
    about: {
      content: 'I am a full stack developer with 5 years of experience.',
      format: 'text'
    },
    projects: [
      {
        name: 'Portfolio Website',
        description: 'My personal portfolio built with Next.js',
        technologies: ['Next.js', 'React', 'Tailwind CSS'],
        url: 'https://johndoe.dev'
      }
    ],
    skills: [
      { name: 'JavaScript', level: 'Expert', category: 'Programming' },
      { name: 'React', level: 'Advanced', category: 'Frontend' }
    ],
    contact: {
      email: 'john@example.com',
      linkedin: 'https://linkedin.com/in/johndoe'
    },
    repository: {
      updatedAt: '2024-01-15T10:30:00Z'
    }
  };

  it('should render default template correctly', async () => {
    render(
      <EnhancedPortfolioRenderer
        portfolioData={mockPortfolioData}
        repository={mockRepository}
        template="default"
      />
    );

    await waitFor(() => {
      expect(screen.getByText('John Doe')).toBeInTheDocument();
      expect(screen.getByText('Full Stack Developer')).toBeInTheDocument();
      expect(screen.getByText('Portfolio Website')).toBeInTheDocument();
    });
  });

  it('should render minimal template correctly', async () => {
    render(
      <EnhancedPortfolioRenderer
        portfolioData={mockPortfolioData}
        repository={mockRepository}
        template="minimal"
      />
    );

    await waitFor(() => {
      expect(screen.getByText('John Doe')).toBeInTheDocument();
      expect(screen.getByText('About')).toBeInTheDocument();
      expect(screen.getByText('Projects')).toBeInTheDocument();
    });
  });

  it('should render modern template correctly', async () => {
    render(
      <EnhancedPortfolioRenderer
        portfolioData={mockPortfolioData}
        repository={mockRepository}
        template="modern"
      />
    );

    await waitFor(() => {
      expect(screen.getByText('John Doe')).toBeInTheDocument();
      expect(screen.getByText('About Me')).toBeInTheDocument();
      expect(screen.getByText('Featured Projects')).toBeInTheDocument();
    });
  });

  it('should render classic template correctly', async () => {
    render(
      <EnhancedPortfolioRenderer
        portfolioData={mockPortfolioData}
        repository={mockRepository}
        template="classic"
      />
    );

    await waitFor(() => {
      expect(screen.getByText('John Doe')).toBeInTheDocument();
      expect(screen.getByText('About')).toBeInTheDocument();
      expect(screen.getByText('Projects')).toBeInTheDocument();
      expect(screen.getByText('Skills')).toBeInTheDocument();
    });
  });

  it('should handle loading state', () => {
    render(
      <EnhancedPortfolioRenderer
        portfolioData={null}
        repository={mockRepository}
      />
    );

    expect(screen.getByText('Processing portfolio data...')).toBeInTheDocument();
  });

  it('should handle error state', async () => {
    render(
      <EnhancedPortfolioRenderer
        portfolioData={undefined}
        repository={mockRepository}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('Portfolio Rendering Error')).toBeInTheDocument();
      expect(screen.getByText('No portfolio data available')).toBeInTheDocument();
    });
  });

  it('should process complex data formats', async () => {
    const complexData = {
      ...mockPortfolioData,
      about: {
        content: `---
title: About Me
---

# My Story

I started coding in **2019** and have been passionate about it ever since.`,
        format: 'markdown'
      },
      projects: [
        {
          name: 'API Project',
          description: 'RESTful API built with Node.js',
          technologies: ['Node.js', 'Express', 'MongoDB'],
          data: {
            format: 'json',
            content: '{"status": "completed", "version": "1.0.0"}'
          }
        }
      ]
    };

    render(
      <EnhancedPortfolioRenderer
        portfolioData={complexData}
        repository={mockRepository}
        template="modern"
      />
    );

    await waitFor(() => {
      expect(screen.getByText('John Doe')).toBeInTheDocument();
      expect(screen.getByText('API Project')).toBeInTheDocument();
    });
  });

  it('should apply custom styling', async () => {
    const styledData = {
      ...mockPortfolioData,
      theme: {
        colors: {
          primary: '#FF6B6B',
          secondary: '#4ECDC4',
          accent: '#45B7D1'
        }
      }
    };

    render(
      <EnhancedPortfolioRenderer
        portfolioData={styledData}
        repository={mockRepository}
        template="modern"
      />
    );

    await waitFor(() => {
      const container = screen.getByText('John Doe').closest('div');
      expect(container).toHaveStyle('--primary-color: #FF6B6B');
    });
  });
});