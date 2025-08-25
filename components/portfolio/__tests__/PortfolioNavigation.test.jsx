/**
 * Portfolio Navigation Component Tests
 * Tests for the dynamic navigation system
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { PortfolioNavigation, PortfolioBreadcrumb, PortfolioSectionNavigation } from '../PortfolioNavigation';

// Mock Next.js router
vi.mock('next/navigation', () => ({
  usePathname: () => '/testuser/testrepo/about'
}));

vi.mock('next/link', () => {
  return function MockLink({ href, children, ...props }) {
    return <a href={href} {...props}>{children}</a>;
  };
});

describe('PortfolioNavigation', () => {
  const mockNavigation = {
    pages: [
      { title: 'About', path: 'about', section: 'about' },
      { title: 'Projects', path: 'projects', section: 'projects' },
      { title: 'Contact', path: 'contact', section: 'contact' }
    ],
    menu: [
      { title: 'About', path: 'about', section: 'about' },
      { title: 'Projects', path: 'projects', section: 'projects' },
      { title: 'Contact', path: 'contact', section: 'contact' },
      { title: 'External Link', path: 'https://example.com', external: true }
    ],
    sections: [
      { name: 'about', title: 'About', pages: [{ title: 'About', path: 'about' }] },
      { name: 'projects', title: 'Projects', pages: [{ title: 'Projects', path: 'projects' }] },
      { name: 'contact', title: 'Contact', pages: [{ title: 'Contact', path: 'contact' }] }
    ]
  };

  const mockRepository = {
    owner: 'testuser',
    name: 'testrepo'
  };

  it('renders navigation menu items', () => {
    render(
      <PortfolioNavigation
        navigation={mockNavigation}
        repository={mockRepository}
        currentPage="about"
      />
    );

    expect(screen.getByText('Home')).toBeInTheDocument();
    expect(screen.getByText('About')).toBeInTheDocument();
    expect(screen.getByText('Projects')).toBeInTheDocument();
    expect(screen.getByText('Contact')).toBeInTheDocument();
    expect(screen.getByText('External Link')).toBeInTheDocument();
  });

  it('highlights active page', () => {
    render(
      <PortfolioNavigation
        navigation={mockNavigation}
        repository={mockRepository}
        currentPage="about"
      />
    );

    const aboutLink = screen.getByText('About').closest('a');
    expect(aboutLink).toHaveClass('bg-blue-100', 'text-blue-700');
  });

  it('handles external links correctly', () => {
    render(
      <PortfolioNavigation
        navigation={mockNavigation}
        repository={mockRepository}
        currentPage="about"
      />
    );

    const externalLink = screen.getByText('External Link').closest('a');
    expect(externalLink).toHaveAttribute('href', 'https://example.com');
    expect(externalLink).toHaveAttribute('target', '_blank');
    expect(externalLink).toHaveAttribute('rel', 'noopener noreferrer');
  });

  it('renders mobile navigation', () => {
    render(
      <PortfolioNavigation
        navigation={mockNavigation}
        repository={mockRepository}
        currentPage="about"
        mobile
      />
    );

    const menuButton = screen.getByRole('button');
    expect(menuButton).toBeInTheDocument();
    
    // Click to open mobile menu
    fireEvent.click(menuButton);
    
    // Check if menu items are visible
    expect(screen.getByText('Home')).toBeInTheDocument();
    expect(screen.getByText('About')).toBeInTheDocument();
  });

  it('returns null when no navigation provided', () => {
    const { container } = render(
      <PortfolioNavigation
        navigation={null}
        repository={mockRepository}
        currentPage="about"
      />
    );

    expect(container.firstChild).toBeNull();
  });

  it('returns null when navigation menu is empty', () => {
    const emptyNavigation = { menu: [] };
    const { container } = render(
      <PortfolioNavigation
        navigation={emptyNavigation}
        repository={mockRepository}
        currentPage="about"
      />
    );

    expect(container.firstChild).toBeNull();
  });
});

describe('PortfolioBreadcrumb', () => {
  const mockNavigation = {
    pages: [
      { title: 'About Me', path: 'about', section: 'about' }
    ]
  };

  const mockRepository = {
    owner: 'testuser',
    name: 'testrepo'
  };

  it('renders breadcrumb navigation', () => {
    render(
      <PortfolioBreadcrumb
        navigation={mockNavigation}
        repository={mockRepository}
        currentPage="about"
      />
    );

    expect(screen.getByText('testuser/testrepo')).toBeInTheDocument();
    expect(screen.getByText('About Me')).toBeInTheDocument();
  });

  it('renders only repository when no current page', () => {
    render(
      <PortfolioBreadcrumb
        navigation={mockNavigation}
        repository={mockRepository}
        currentPage="nonexistent"
      />
    );

    expect(screen.getByText('testuser/testrepo')).toBeInTheDocument();
    expect(screen.queryByText('About Me')).not.toBeInTheDocument();
  });
});

describe('PortfolioSectionNavigation', () => {
  const mockNavigation = {
    sections: [
      { 
        name: 'about', 
        title: 'About', 
        pages: [{ title: 'About', path: 'about' }] 
      },
      { 
        name: 'projects', 
        title: 'Projects', 
        pages: [{ title: 'Projects', path: 'projects' }] 
      }
    ]
  };

  const mockRepository = {
    owner: 'testuser',
    name: 'testrepo'
  };

  it('renders section navigation', () => {
    render(
      <PortfolioSectionNavigation
        navigation={mockNavigation}
        repository={mockRepository}
        currentSection="about"
      />
    );

    expect(screen.getByText('About')).toBeInTheDocument();
    expect(screen.getByText('Projects')).toBeInTheDocument();
  });

  it('highlights active section', () => {
    render(
      <PortfolioSectionNavigation
        navigation={mockNavigation}
        repository={mockRepository}
        currentSection="about"
      />
    );

    const aboutLink = screen.getByText('About').closest('a');
    expect(aboutLink).toHaveClass('border-blue-500', 'text-blue-600');
  });

  it('returns null when no sections or only one section', () => {
    const singleSectionNav = {
      sections: [{ name: 'about', title: 'About', pages: [] }]
    };

    const { container } = render(
      <PortfolioSectionNavigation
        navigation={singleSectionNav}
        repository={mockRepository}
        currentSection="about"
      />
    );

    expect(container.firstChild).toBeNull();
  });
});