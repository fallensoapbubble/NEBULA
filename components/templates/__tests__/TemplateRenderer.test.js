/**
 * TemplateRenderer Component Tests
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { TemplateRenderer, TemplatePreview, TemplateLoader } from '../TemplateRenderer.js';

// Mock the template layouts
vi.mock('../layouts/DefaultTemplate.js', () => ({
  DefaultTemplate: ({ portfolioData }) => (
    <div data-testid="default-template">
      Default Template - {portfolioData?.metadata?.name || 'No Name'}
    </div>
  )
}));

vi.mock('../layouts/MinimalTemplate.js', () => ({
  MinimalTemplate: ({ portfolioData }) => (
    <div data-testid="minimal-template">
      Minimal Template - {portfolioData?.metadata?.name || 'No Name'}
    </div>
  )
}));

vi.mock('../layouts/CreativeTemplate.js', () => ({
  CreativeTemplate: ({ portfolioData }) => (
    <div data-testid="creative-template">
      Creative Template - {portfolioData?.metadata?.name || 'No Name'}
    </div>
  )
}));

vi.mock('../layouts/DeveloperTemplate.js', () => ({
  DeveloperTemplate: ({ portfolioData }) => (
    <div data-testid="developer-template">
      Developer Template - {portfolioData?.metadata?.name || 'No Name'}
    </div>
  )
}));

// Mock the providers
vi.mock('../PortfolioDataProvider.js', () => ({
  PortfolioDataProvider: ({ children }) => <div data-testid="portfolio-provider">{children}</div>
}));

vi.mock('../TemplateStyleProvider.js', () => ({
  TemplateStyleProvider: ({ children }) => <div data-testid="style-provider">{children}</div>
}));

// Mock UI components
vi.mock('../../ui/Loading.js', () => ({
  LoadingSpinner: () => <div data-testid="loading-spinner">Loading...</div>
}));

vi.mock('../../ui/Card.js', () => ({
  GlassCard: ({ children, className }) => (
    <div data-testid="glass-card" className={className}>{children}</div>
  ),
  GlassCardContent: ({ children }) => (
    <div data-testid="glass-card-content">{children}</div>
  )
}));

describe('TemplateRenderer', () => {
  const mockPortfolioData = {
    metadata: {
      name: 'John Doe',
      title: 'Software Developer',
      bio: 'A passionate developer'
    },
    sections: {
      about: {
        type: 'markdown',
        data: 'About me content'
      }
    }
  };

  const mockRepositoryInfo = {
    full_name: 'johndoe/portfolio',
    url: 'https://github.com/johndoe/portfolio'
  };

  const mockTemplate = {
    id: 'default',
    name: 'Default Template',
    metadata: {
      type: 'default'
    }
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders default template when no template type specified', () => {
    render(
      <TemplateRenderer
        template={mockTemplate}
        portfolioData={mockPortfolioData}
        repositoryInfo={mockRepositoryInfo}
      />
    );

    expect(screen.getByTestId('default-template')).toBeInTheDocument();
    expect(screen.getByText('Default Template - John Doe')).toBeInTheDocument();
  });

  it('renders correct template based on template type', () => {
    const minimalTemplate = {
      ...mockTemplate,
      metadata: { type: 'minimal' }
    };

    render(
      <TemplateRenderer
        template={minimalTemplate}
        portfolioData={mockPortfolioData}
        repositoryInfo={mockRepositoryInfo}
      />
    );

    expect(screen.getByTestId('minimal-template')).toBeInTheDocument();
    expect(screen.getByText('Minimal Template - John Doe')).toBeInTheDocument();
  });

  it('renders creative template correctly', () => {
    const creativeTemplate = {
      ...mockTemplate,
      metadata: { type: 'creative' }
    };

    render(
      <TemplateRenderer
        template={creativeTemplate}
        portfolioData={mockPortfolioData}
        repositoryInfo={mockRepositoryInfo}
      />
    );

    expect(screen.getByTestId('creative-template')).toBeInTheDocument();
    expect(screen.getByText('Creative Template - John Doe')).toBeInTheDocument();
  });

  it('renders developer template correctly', () => {
    const developerTemplate = {
      ...mockTemplate,
      metadata: { type: 'developer' }
    };

    render(
      <TemplateRenderer
        template={developerTemplate}
        portfolioData={mockPortfolioData}
        repositoryInfo={mockRepositoryInfo}
      />
    );

    expect(screen.getByTestId('developer-template')).toBeInTheDocument();
    expect(screen.getByText('Developer Template - John Doe')).toBeInTheDocument();
  });

  it('falls back to default template for unknown template type', () => {
    const unknownTemplate = {
      ...mockTemplate,
      metadata: { type: 'unknown' }
    };

    render(
      <TemplateRenderer
        template={unknownTemplate}
        portfolioData={mockPortfolioData}
        repositoryInfo={mockRepositoryInfo}
      />
    );

    expect(screen.getByTestId('default-template')).toBeInTheDocument();
  });

  it('displays error message when no portfolio data provided', () => {
    render(
      <TemplateRenderer
        template={mockTemplate}
        portfolioData={null}
        repositoryInfo={mockRepositoryInfo}
      />
    );

    expect(screen.getByText('No portfolio data available')).toBeInTheDocument();
  });

  it('wraps template with providers', () => {
    render(
      <TemplateRenderer
        template={mockTemplate}
        portfolioData={mockPortfolioData}
        repositoryInfo={mockRepositoryInfo}
      />
    );

    expect(screen.getByTestId('style-provider')).toBeInTheDocument();
    expect(screen.getByTestId('portfolio-provider')).toBeInTheDocument();
  });

  it('applies custom CSS classes', () => {
    render(
      <TemplateRenderer
        template={mockTemplate}
        portfolioData={mockPortfolioData}
        repositoryInfo={mockRepositoryInfo}
        className="custom-class"
      />
    );

    const renderer = screen.getByTestId('style-provider').parentElement;
    expect(renderer).toHaveClass('template-renderer', 'custom-class');
  });

  it('handles preview mode correctly', () => {
    render(
      <TemplateRenderer
        template={mockTemplate}
        portfolioData={mockPortfolioData}
        repositoryInfo={mockRepositoryInfo}
        isPreview={true}
      />
    );

    expect(screen.getByTestId('default-template')).toBeInTheDocument();
  });
});

describe('TemplatePreview', () => {
  const mockTemplate = {
    id: 'default',
    metadata: { type: 'default' }
  };

  const mockPortfolioData = {
    metadata: { name: 'Test User' }
  };

  it('renders template in preview mode', () => {
    render(
      <TemplatePreview
        template={mockTemplate}
        portfolioData={mockPortfolioData}
      />
    );

    const preview = screen.getByTestId('style-provider').parentElement;
    expect(preview).toHaveClass('template-preview');
    expect(preview).toHaveClass('scale-75');
    expect(preview).toHaveClass('origin-top-left');
  });

  it('applies custom className', () => {
    render(
      <TemplatePreview
        template={mockTemplate}
        portfolioData={mockPortfolioData}
        className="custom-preview"
      />
    );

    const preview = screen.getByTestId('style-provider').parentElement;
    expect(preview).toHaveClass('custom-preview');
  });
});

describe('TemplateLoader', () => {
  it('renders loading spinner and message', () => {
    render(<TemplateLoader />);

    expect(screen.getByTestId('loading-spinner')).toBeInTheDocument();
    expect(screen.getByText('Loading portfolio template...')).toBeInTheDocument();
  });

  it('applies custom className', () => {
    render(<TemplateLoader className="custom-loader" />);

    expect(screen.getByTestId('glass-card')).toHaveClass('custom-loader');
  });
});