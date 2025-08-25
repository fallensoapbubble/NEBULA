/**
 * DefaultTemplate Layout Tests
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { DefaultTemplate } from '../../layouts/DefaultTemplate.js';

// Mock the providers
vi.mock('../../PortfolioDataProvider.js', () => ({
  usePortfolioData: () => ({
    portfolio: {
      metadata: {
        name: 'John Doe',
        title: 'Software Developer',
        bio: 'A passionate developer',
        avatar: 'avatar.jpg',
        social: {
          github: 'https://github.com/johndoe',
          linkedin: 'https://linkedin.com/in/johndoe'
        }
      },
      sections: {
        about: {
          type: 'markdown',
          data: '<p>About me content</p>'
        },
        projects: {
          data: [
            {
              name: 'Test Project',
              description: 'A test project',
              technologies: ['React', 'Node.js'],
              demo: 'https://demo.com',
              source: 'https://github.com/test/project'
            }
          ]
        },
        experience: {
          data: [
            {
              position: 'Developer',
              company: 'Tech Corp',
              duration: '2020-2023',
              description: 'Built web apps',
              achievements: ['Feature A', 'Feature B']
            }
          ]
        },
        skills: {
          data: [
            {
              category: 'Programming',
              items: [
                { name: 'JavaScript', level: 5 },
                { name: 'Python', level: 4 }
              ]
            }
          ]
        },
        education: {
          data: [
            {
              degree: 'Computer Science',
              institution: 'University',
              year: '2020',
              description: 'Studied CS'
            }
          ]
        },
        contact: {
          data: {
            email: 'john@example.com',
            phone: '+1234567890',
            message: 'Get in touch!'
          }
        }
      }
    },
    getSection: (name) => {
      const sections = {
        about: { type: 'markdown', data: '<p>About me content</p>' }
      };
      return sections[name] || null;
    },
    hasSection: (name) => ['about', 'projects', 'experience', 'skills', 'education', 'contact'].includes(name),
    getSectionData: (name, defaultValue) => {
      const data = {
        projects: [
          {
            name: 'Test Project',
            description: 'A test project',
            technologies: ['React', 'Node.js'],
            demo: 'https://demo.com',
            source: 'https://github.com/test/project'
          }
        ],
        experience: [
          {
            position: 'Developer',
            company: 'Tech Corp',
            duration: '2020-2023',
            description: 'Built web apps',
            achievements: ['Feature A', 'Feature B']
          }
        ],
        skills: [
          {
            category: 'Programming',
            items: [
              { name: 'JavaScript', level: 5 },
              { name: 'Python', level: 4 }
            ]
          }
        ],
        education: [
          {
            degree: 'Computer Science',
            institution: 'University',
            year: '2020',
            description: 'Studied CS'
          }
        ],
        contact: {
          email: 'john@example.com',
          phone: '+1234567890',
          message: 'Get in touch!'
        }
      };
      return data[name] || defaultValue;
    },
    getAssetUrl: (path) => `https://example.com/${path}`
  })
}));

vi.mock('../../TemplateStyleProvider.js', () => ({
  useTemplateStyle: () => ({
    getThemeClass: (baseClass) => `${baseClass} theme-default`
  })
}));

// Mock UI components
vi.mock('../../../ui/Card.js', () => ({
  GlassCard: ({ children, className }) => (
    <div data-testid="glass-card" className={className}>{children}</div>
  ),
  GlassCardContent: ({ children, className }) => (
    <div data-testid="glass-card-content" className={className}>{children}</div>
  ),
  GlassCardHeader: ({ children }) => (
    <div data-testid="glass-card-header">{children}</div>
  ),
  GlassCardTitle: ({ children }) => (
    <h3 data-testid="glass-card-title">{children}</h3>
  )
}));

describe('DefaultTemplate', () => {
  const mockProps = {
    template: { id: 'default' },
    portfolioData: {},
    repositoryInfo: {
      url: 'https://github.com/johndoe/portfolio'
    },
    isPreview: false
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the main template structure', () => {
    render(<DefaultTemplate {...mockProps} />);

    // Check for main sections
    expect(screen.getByRole('banner')).toBeInTheDocument(); // header
    expect(screen.getByRole('main')).toBeInTheDocument();
    expect(screen.getByRole('contentinfo')).toBeInTheDocument(); // footer
  });

  it('renders profile section with user information', () => {
    render(<DefaultTemplate {...mockProps} />);

    expect(screen.getByText('John Doe')).toBeInTheDocument();
    expect(screen.getByText('Software Developer')).toBeInTheDocument();
    expect(screen.getByText('A passionate developer')).toBeInTheDocument();
  });

  it('renders profile avatar', () => {
    render(<DefaultTemplate {...mockProps} />);

    const avatar = screen.getByRole('img', { name: /john doe|profile/i });
    expect(avatar).toHaveAttribute('src', 'https://example.com/avatar.jpg');
  });

  it('renders social links', () => {
    render(<DefaultTemplate {...mockProps} />);

    expect(screen.getByRole('link', { name: /github/i })).toHaveAttribute('href', 'https://github.com/johndoe');
    expect(screen.getByRole('link', { name: /linkedin/i })).toHaveAttribute('href', 'https://linkedin.com/in/johndoe');
  });

  it('renders about section', () => {
    render(<DefaultTemplate {...mockProps} />);

    expect(screen.getByText('About')).toBeInTheDocument();
    expect(screen.getByText('About me content')).toBeInTheDocument();
  });

  it('renders projects section', () => {
    render(<DefaultTemplate {...mockProps} />);

    expect(screen.getByText('Projects')).toBeInTheDocument();
    expect(screen.getByText('Test Project')).toBeInTheDocument();
    expect(screen.getByText('A test project')).toBeInTheDocument();
    expect(screen.getByText('React')).toBeInTheDocument();
    expect(screen.getByText('Node.js')).toBeInTheDocument();
  });

  it('renders project links', () => {
    render(<DefaultTemplate {...mockProps} />);

    expect(screen.getByRole('link', { name: /demo/i })).toHaveAttribute('href', 'https://demo.com');
    expect(screen.getByRole('link', { name: /source/i })).toHaveAttribute('href', 'https://github.com/test/project');
  });

  it('renders experience section', () => {
    render(<DefaultTemplate {...mockProps} />);

    expect(screen.getByText('Experience')).toBeInTheDocument();
    expect(screen.getByText('Developer')).toBeInTheDocument();
    expect(screen.getByText('Tech Corp')).toBeInTheDocument();
    expect(screen.getByText('2020-2023')).toBeInTheDocument();
    expect(screen.getByText('Built web apps')).toBeInTheDocument();
    expect(screen.getByText('Feature A')).toBeInTheDocument();
    expect(screen.getByText('Feature B')).toBeInTheDocument();
  });

  it('renders skills section', () => {
    render(<DefaultTemplate {...mockProps} />);

    expect(screen.getByText('Skills')).toBeInTheDocument();
    expect(screen.getByText('Programming')).toBeInTheDocument();
    expect(screen.getByText('JavaScript')).toBeInTheDocument();
    expect(screen.getByText('Python')).toBeInTheDocument();
  });

  it('renders education section', () => {
    render(<DefaultTemplate {...mockProps} />);

    expect(screen.getByText('Education')).toBeInTheDocument();
    expect(screen.getByText('Computer Science')).toBeInTheDocument();
    expect(screen.getByText('University')).toBeInTheDocument();
    expect(screen.getByText('2020')).toBeInTheDocument();
    expect(screen.getByText('Studied CS')).toBeInTheDocument();
  });

  it('renders contact section', () => {
    render(<DefaultTemplate {...mockProps} />);

    expect(screen.getByText('Contact')).toBeInTheDocument();
    expect(screen.getByText('Get in touch!')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /email me/i })).toHaveAttribute('href', 'mailto:john@example.com');
    expect(screen.getByRole('link', { name: /call me/i })).toHaveAttribute('href', 'tel:+1234567890');
  });

  it('renders footer with copyright and repository link', () => {
    render(<DefaultTemplate {...mockProps} />);

    const currentYear = new Date().getFullYear();
    expect(screen.getByText(`© ${currentYear} John Doe. Built with Nebula.`)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /view source on github/i }))
      .toHaveAttribute('href', 'https://github.com/johndoe/portfolio');
  });

  it('applies theme classes correctly', () => {
    render(<DefaultTemplate {...mockProps} />);

    const template = screen.getByRole('banner').parentElement;
    expect(template).toHaveClass('default-template', 'min-h-screen', 'theme-default');
  });

  it('handles missing repository info gracefully', () => {
    const propsWithoutRepo = {
      ...mockProps,
      repositoryInfo: null
    };

    render(<DefaultTemplate {...propsWithoutRepo} />);

    expect(screen.queryByRole('link', { name: /view source on github/i })).not.toBeInTheDocument();
  });
});