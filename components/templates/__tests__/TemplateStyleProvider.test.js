/**
 * TemplateStyleProvider Component Tests
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { TemplateStyleProvider, useTemplateStyle, TemplateStyleInjector } from '../TemplateStyleProvider.js';

// Mock logger
vi.mock('../../../lib/logger.js', () => ({
  logger: {
    child: () => ({
      error: vi.fn()
    })
  }
}));

// Test component that uses the hook
const TestComponent = () => {
  const {
    template,
    styles,
    isPreview,
    getVariable,
    getThemeClass,
    applyCustomStyles
  } = useTemplateStyle();

  return (
    <div>
      <div data-testid="template-id">{template?.id || 'No Template'}</div>
      <div data-testid="theme">{styles.theme}</div>
      <div data-testid="is-preview">{isPreview ? 'Yes' : 'No'}</div>
      <div data-testid="primary-color">{getVariable('primary-color', 'default')}</div>
      <div data-testid="theme-class">{getThemeClass('base-class')}</div>
      <div data-testid="custom-css">{styles.customCSS ? 'Has CSS' : 'No CSS'}</div>
    </div>
  );
};

describe('TemplateStyleProvider', () => {
  const mockTemplate = {
    id: 'test-template',
    metadata: {
      theme: 'dark',
      variables: {
        'primary-color': '#007bff',
        'secondary-color': '#6c757d'
      }
    }
  };

  const mockCustomCSS = `
    .custom-class {
      color: red;
    }
    .another-class {
      background: blue;
    }
  `;

  beforeEach(() => {
    vi.clearAllMocks();
    // Clear any existing style elements
    document.head.querySelectorAll('style[id^="template-styles-"]').forEach(el => el.remove());
  });

  afterEach(() => {
    // Clean up style elements after each test
    document.head.querySelectorAll('style[id^="template-styles-"]').forEach(el => el.remove());
  });

  it('provides template style context to children', () => {
    render(
      <TemplateStyleProvider
        template={mockTemplate}
        customCSS={mockCustomCSS}
        isPreview={false}
      >
        <TestComponent />
      </TemplateStyleProvider>
    );

    expect(screen.getByTestId('template-id')).toHaveTextContent('test-template');
    expect(screen.getByTestId('theme')).toHaveTextContent('dark');
    expect(screen.getByTestId('is-preview')).toHaveTextContent('No');
    expect(screen.getByTestId('primary-color')).toHaveTextContent('#007bff');
    expect(screen.getByTestId('theme-class')).toHaveTextContent('base-class theme-dark');
    expect(screen.getByTestId('custom-css')).toHaveTextContent('Has CSS');
  });

  it('handles preview mode correctly', () => {
    render(
      <TemplateStyleProvider
        template={mockTemplate}
        customCSS={mockCustomCSS}
        isPreview={true}
      >
        <TestComponent />
      </TemplateStyleProvider>
    );

    expect(screen.getByTestId('is-preview')).toHaveTextContent('Yes');
    
    // In preview mode, CSS should be scoped
    const provider = screen.getByTestId('template-id').closest('.template-style-provider');
    expect(provider).toHaveClass('template-preview-mode');
  });

  it('applies default theme when no theme specified', () => {
    const templateWithoutTheme = {
      id: 'no-theme-template'
    };

    render(
      <TemplateStyleProvider
        template={templateWithoutTheme}
        customCSS=""
        isPreview={false}
      >
        <TestComponent />
      </TemplateStyleProvider>
    );

    expect(screen.getByTestId('theme')).toHaveTextContent('default');
  });

  it('handles missing template gracefully', () => {
    render(
      <TemplateStyleProvider
        template={null}
        customCSS=""
        isPreview={false}
      >
        <TestComponent />
      </TemplateStyleProvider>
    );

    expect(screen.getByTestId('template-id')).toHaveTextContent('No Template');
    expect(screen.getByTestId('theme')).toHaveTextContent('default');
  });

  it('returns default values for missing variables', () => {
    const templateWithoutVariables = {
      id: 'no-vars-template'
    };

    render(
      <TemplateStyleProvider
        template={templateWithoutVariables}
        customCSS=""
        isPreview={false}
      >
        <TestComponent />
      </TemplateStyleProvider>
    );

    expect(screen.getByTestId('primary-color')).toHaveTextContent('default');
  });

  it('applies theme class correctly', () => {
    render(
      <TemplateStyleProvider
        template={mockTemplate}
        customCSS=""
        isPreview={false}
      >
        <div data-testid="container">
          <TestComponent />
        </div>
      </TemplateStyleProvider>
    );

    const provider = screen.getByTestId('template-id').closest('.template-style-provider');
    expect(provider).toHaveClass('template-theme-dark');
  });

  it('injects custom CSS in non-preview mode', () => {
    render(
      <TemplateStyleProvider
        template={mockTemplate}
        customCSS={mockCustomCSS}
        isPreview={false}
      >
        <TestComponent />
      </TemplateStyleProvider>
    );

    // Check if style element was created
    const styleElement = document.getElementById('template-styles-test-template');
    expect(styleElement).toBeTruthy();
    expect(styleElement?.textContent).toContain('.custom-class');
  });

  it('does not inject CSS in preview mode', () => {
    render(
      <TemplateStyleProvider
        template={mockTemplate}
        customCSS={mockCustomCSS}
        isPreview={true}
      >
        <TestComponent />
      </TemplateStyleProvider>
    );

    // Style element should not be created in preview mode
    const styleElement = document.getElementById('template-styles-test-template');
    expect(styleElement).toBeFalsy();
  });

  it('throws error when used outside provider', () => {
    // Suppress console.error for this test
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    
    expect(() => {
      render(<TestComponent />);
    }).toThrow('useTemplateStyle must be used within a TemplateStyleProvider');
    
    consoleSpy.mockRestore();
  });
});

describe('TemplateStyleInjector', () => {
  const mockTemplate = {
    id: 'injector-template',
    metadata: {
      baseCSS: '.base { color: blue; }'
    }
  };

  const mockCustomCSS = '.custom { color: red; }';

  beforeEach(() => {
    // Clear any existing style elements
    document.head.querySelectorAll('style[id^="template-injected-styles-"]').forEach(el => el.remove());
  });

  afterEach(() => {
    // Clean up style elements after each test
    document.head.querySelectorAll('style[id^="template-injected-styles-"]').forEach(el => el.remove());
  });

  it('injects template and custom CSS', () => {
    render(
      <TemplateStyleInjector
        template={mockTemplate}
        customCSS={mockCustomCSS}
      />
    );

    const styleElement = document.getElementById('template-injected-styles-injector-template');
    expect(styleElement).toBeTruthy();
    expect(styleElement?.textContent).toContain('.base { color: blue; }');
    expect(styleElement?.textContent).toContain('.custom { color: red; }');
  });

  it('injects only custom CSS when no template provided', () => {
    render(
      <TemplateStyleInjector
        template={null}
        customCSS={mockCustomCSS}
      />
    );

    const styleElement = document.getElementById('template-injected-styles-custom');
    expect(styleElement).toBeTruthy();
    expect(styleElement?.textContent).toContain('.custom { color: red; }');
  });

  it('does nothing when no template or CSS provided', () => {
    render(
      <TemplateStyleInjector
        template={null}
        customCSS=""
      />
    );

    const styleElements = document.head.querySelectorAll('style[id^="template-injected-styles-"]');
    expect(styleElements.length).toBe(0);
  });

  it('cleans up style element on unmount', () => {
    const { unmount } = render(
      <TemplateStyleInjector
        template={mockTemplate}
        customCSS={mockCustomCSS}
      />
    );

    // Style element should exist
    let styleElement = document.getElementById('template-injected-styles-injector-template');
    expect(styleElement).toBeTruthy();

    // Unmount component
    unmount();

    // Style element should be removed
    styleElement = document.getElementById('template-injected-styles-injector-template');
    expect(styleElement).toBeFalsy();
  });
});