/**
 * Template Components Tests
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import {
  PortfolioSection,
  PortfolioImage,
  SocialLinks,
  SocialLink,
  SkillBadge,
  ProjectCard,
  ExperienceItem,
  ContactInfo,
  MarkdownContent,
  LoadingTemplate,
  ErrorTemplate
} from '../TemplateComponents.js';

// Mock the providers
vi.mock('../PortfolioDataProvider.js', () => ({
  usePortfolioData: () => ({
    portfolio: {
      metadata: {
        name: 'John Doe',
        social: {
          github: 'https://github.com/johndoe',
          linkedin: 'https://linkedin.com/in/johndoe'
        }
      },
      sections: {
        about: {
          type: 'markdown',
          data: 'About me content'
        },
        contact: {
          data: {
            email: 'john@example.com',
            message: 'Get in touch!'
          }
        }
      }
    },
    hasSection: (name) => name === 'about',
    getAssetUrl: (path) => `https://example.com/${path}`,
    getSectionData: (name) => {
      if (name === 'contact') {
        return { email: 'john@example.com', message: 'Get in touch!' };
      }
      return null;
    }
  })
}));

describe('PortfolioSection', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders section when hasSection returns true', () => {
    render(
      <PortfolioSection sectionName="about" title="About Me">
        <p>Section content</p>
      </PortfolioSection>
    );

    expect(screen.getByText('About Me')).toBeInTheDocument();
    expect(screen.getByText('Section content')).toBeInTheDocument();
  });

  it('does not render when hasSection returns false', () => {
    render(
      <PortfolioSection sectionName="projects" title="Projects">
        <p>Section content</p>
      </PortfolioSection>
    );

    expect(screen.queryByText('Projects')).not.toBeInTheDocument();
    expect(screen.queryByText('Section content')).not.toBeInTheDocument();
  });

  it('renders without title', () => {
    render(
      <PortfolioSection sectionName="about">
        <p>Section content</p>
      </PortfolioSection>
    );

    expect(screen.queryByRole('heading')).not.toBeInTheDocument();
    expect(screen.getByText('Section content')).toBeInTheDocument();
  });
});

describe('PortfolioImage', () => {
  it('renders image with asset URL', () => {
    render(
      <PortfolioImage
        src="avatar.jpg"
        alt="Profile picture"
      />
    );

    const image = screen.getByRole('img');
    expect(image).toHaveAttribute('src', 'https://example.com/avatar.jpg');
    expect(image).toHaveAttribute('alt', 'Profile picture');
  });

  it('renders fallback when no src provided', () => {
    render(
      <PortfolioImage
        src=""
        alt="Profile picture"
        fallback={<div>No image</div>}
      />
    );

    expect(screen.getByText('No image')).toBeInTheDocument();
    expect(screen.queryByRole('img')).not.toBeInTheDocument();
  });

  it('renders nothing when no src and no fallback', () => {
    const { container } = render(
      <PortfolioImage
        src=""
        alt="Profile picture"
      />
    );

    expect(container.firstChild).toBeNull();
  });
});

describe('SocialLinks', () => {
  it('renders social links from portfolio data', () => {
    render(<SocialLinks />);

    expect(screen.getByText('Github')).toBeInTheDocument();
    expect(screen.getByText('Linkedin')).toBeInTheDocument();
    
    const githubLink = screen.getByRole('link', { name: /github/i });
    expect(githubLink).toHaveAttribute('href', 'https://github.com/johndoe');
  });

  it('renders with custom social data', () => {
    const customSocial = {
      twitter: 'https://twitter.com/johndoe'
    };

    render(<SocialLinks social={customSocial} />);

    expect(screen.getByText('Twitter')).toBeInTheDocument();
    expect(screen.queryByText('Github')).not.toBeInTheDocument();
  });

  it('renders nothing when no social data', () => {
    const { container } = render(<SocialLinks social={{}} />);
    expect(container.firstChild).toBeNull();
  });

  it('applies variant classes correctly', () => {
    render(<SocialLinks variant="vertical" />);

    const container = screen.getByText('Github').closest('.social-links');
    expect(container).toHaveClass('flex', 'flex-col', 'space-y-2');
  });
});

describe('SocialLink', () => {
  it('renders social link with icon and name', () => {
    render(
      <SocialLink
        platform="github"
        url="https://github.com/johndoe"
      />
    );

    const link = screen.getByRole('link');
    expect(link).toHaveAttribute('href', 'https://github.com/johndoe');
    expect(link).toHaveAttribute('target', '_blank');
    expect(screen.getByText('Github')).toBeInTheDocument();
  });

  it('renders icon-only variant', () => {
    render(
      <SocialLink
        platform="github"
        url="https://github.com/johndoe"
        variant="icon"
      />
    );

    expect(screen.queryByText('Github')).not.toBeInTheDocument();
    expect(screen.getByText('🔗')).toBeInTheDocument();
  });
});

describe('SkillBadge', () => {
  it('renders skill name from string', () => {
    render(<SkillBadge skill="JavaScript" />);
    expect(screen.getByText('JavaScript')).toBeInTheDocument();
  });

  it('renders skill name from object', () => {
    const skill = { name: 'React', level: 4 };
    render(<SkillBadge skill={skill} />);
    expect(screen.getByText('React')).toBeInTheDocument();
  });

  it('renders skill level when showLevel is true', () => {
    const skill = { name: 'React', level: 4 };
    render(<SkillBadge skill={skill} showLevel={true} />);
    
    expect(screen.getByText('React')).toBeInTheDocument();
    
    // Check for level dots
    const levelContainer = screen.getByText('React').parentElement;
    const dots = levelContainer?.querySelectorAll('.skill-level .w-2');
    expect(dots).toHaveLength(5);
  });
});

describe('ProjectCard', () => {
  const mockProject = {
    name: 'Test Project',
    description: 'A test project',
    technologies: ['React', 'Node.js'],
    demo: 'https://demo.com',
    source: 'https://github.com/test/project',
    image: 'project.jpg'
  };

  it('renders project information', () => {
    render(<ProjectCard project={mockProject} />);

    expect(screen.getByText('Test Project')).toBeInTheDocument();
    expect(screen.getByText('A test project')).toBeInTheDocument();
    expect(screen.getByText('React')).toBeInTheDocument();
    expect(screen.getByText('Node.js')).toBeInTheDocument();
  });

  it('renders project links', () => {
    render(<ProjectCard project={mockProject} />);

    const demoLink = screen.getByRole('link', { name: /demo/i });
    const sourceLink = screen.getByRole('link', { name: /source/i });

    expect(demoLink).toHaveAttribute('href', 'https://demo.com');
    expect(sourceLink).toHaveAttribute('href', 'https://github.com/test/project');
  });

  it('renders project image', () => {
    render(<ProjectCard project={mockProject} />);

    const image = screen.getByRole('img');
    expect(image).toHaveAttribute('alt', 'Test Project');
  });
});

describe('ExperienceItem', () => {
  const mockExperience = {
    position: 'Software Developer',
    company: 'Tech Corp',
    duration: '2020-2023',
    description: 'Developed web applications',
    achievements: ['Built 5 major features', 'Improved performance by 50%']
  };

  it('renders experience information', () => {
    render(<ExperienceItem experience={mockExperience} />);

    expect(screen.getByText('Software Developer')).toBeInTheDocument();
    expect(screen.getByText('Tech Corp')).toBeInTheDocument();
    expect(screen.getByText('2020-2023')).toBeInTheDocument();
    expect(screen.getByText('Developed web applications')).toBeInTheDocument();
  });

  it('renders achievements list', () => {
    render(<ExperienceItem experience={mockExperience} />);

    expect(screen.getByText('Built 5 major features')).toBeInTheDocument();
    expect(screen.getByText('Improved performance by 50%')).toBeInTheDocument();
  });
});

describe('ContactInfo', () => {
  it('renders contact information from portfolio data', () => {
    render(<ContactInfo />);

    expect(screen.getByText('Get in touch!')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /email/i })).toHaveAttribute('href', 'mailto:john@example.com');
  });

  it('renders custom contact data', () => {
    const customContact = {
      message: 'Custom message',
      email: 'custom@example.com',
      phone: '+1234567890'
    };

    render(<ContactInfo contact={customContact} />);

    expect(screen.getByText('Custom message')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /email/i })).toHaveAttribute('href', 'mailto:custom@example.com');
    expect(screen.getByRole('link', { name: /call/i })).toHaveAttribute('href', 'tel:+1234567890');
  });
});

describe('MarkdownContent', () => {
  it('renders plain text content', () => {
    render(<MarkdownContent content="Plain text content" />);
    expect(screen.getByText('Plain text content')).toBeInTheDocument();
  });

  it('renders HTML content', () => {
    render(<MarkdownContent content="<p>HTML content</p>" />);
    expect(screen.getByText('HTML content')).toBeInTheDocument();
  });

  it('renders nothing when no content', () => {
    const { container } = render(<MarkdownContent content="" />);
    expect(container.firstChild).toBeNull();
  });
});

describe('LoadingTemplate', () => {
  it('renders loading message', () => {
    render(<LoadingTemplate />);
    expect(screen.getByText('Loading portfolio...')).toBeInTheDocument();
  });
});

describe('ErrorTemplate', () => {
  it('renders error message', () => {
    const error = new Error('Test error');
    render(<ErrorTemplate error={error} />);

    expect(screen.getByText('Portfolio Loading Error')).toBeInTheDocument();
    expect(screen.getByText('Test error')).toBeInTheDocument();
  });

  it('renders default error message when no error provided', () => {
    render(<ErrorTemplate />);
    expect(screen.getByText('There was an error loading this portfolio.')).toBeInTheDocument();
  });

  it('renders retry button when onRetry provided', () => {
    const onRetry = vi.fn();
    render(<ErrorTemplate onRetry={onRetry} />);

    const retryButton = screen.getByRole('button', { name: /try again/i });
    expect(retryButton).toBeInTheDocument();
  });
});