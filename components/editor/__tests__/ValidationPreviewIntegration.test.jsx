/**
 * Tests for Validation Preview Integration
 * Task 8.3: Real-Time Validation + Preview
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ValidationProvider, useValidation } from '../ValidationProvider.js';
import { ValidationPreviewIntegration } from '../ValidationPreviewIntegration.js';
import { PreviewPane } from '../PreviewPane.js';
import { EditorProvider } from '../EditorContext.js';

// Mock the editor context
const mockEditorState = {
  repository: {
    owner: 'testuser',
    name: 'test-repo',
    structure: null,
    lastCommitSha: null,
    isLoading: false,
    error: null
  },
  content: {
    files: {
      'data.json': {
        content: JSON.stringify({
          personal: {
            name: 'Test User',
            title: 'Developer'
          },
          projects: []
        })
      }
    },
    currentFile: 'data.json',
    unsavedChanges: {},
    isLoading: false,
    error: null
  },
  sync: {
    lastSync: null,
    hasConflicts: false,
    remoteChanges: null,
    isChecking: false,
    error: null
  },
  navigation: {
    sidebarCollapsed: false,
    currentPath: '/editor/testuser/test-repo',
    breadcrumbs: [],
    activeSecondaryTab: 'edit',
    recentFiles: []
  },
  ui: {
    activeTab: 'editor',
    previewMode: false,
    loading: false,
    saving: false,
    error: null
  }
};

const MockEditorProvider = ({ children }) => {
  return (
    <EditorProvider owner="testuser" repo="test-repo">
      {children}
    </EditorProvider>
  );
};

const TestWrapper = ({ children }) => {
  return (
    <MockEditorProvider>
      <ValidationProvider owner="testuser" repo="test-repo">
        {children}
      </ValidationProvider>
    </MockEditorProvider>
  );
};

describe('ValidationPreviewIntegration', () => {
  test('renders without crashing', () => {
    render(
      <TestWrapper>
        <ValidationPreviewIntegration />
      </TestWrapper>
    );
    
    expect(screen.getByText('Editor')).toBeInTheDocument();
    expect(screen.getByText('Preview')).toBeInTheDocument();
    expect(screen.getByText('Validation')).toBeInTheDocument();
  });

  test('switches between panels', async () => {
    render(
      <TestWrapper>
        <ValidationPreviewIntegration />
      </TestWrapper>
    );
    
    // Click on Preview panel
    fireEvent.click(screen.getByText('Preview'));
    
    await waitFor(() => {
      expect(screen.getByText('Live Preview')).toBeInTheDocument();
    });

    // Click on Validation panel
    fireEvent.click(screen.getByText('Validation'));
    
    await waitFor(() => {
      expect(screen.getByText('Validation Results')).toBeInTheDocument();
    });
  });

  test('shows validation status indicators', async () => {
    render(
      <TestWrapper>
        <ValidationPreviewIntegration />
      </TestWrapper>
    );
    
    // Should show validation status
    await waitFor(() => {
      expect(screen.getByText('Validation:')).toBeInTheDocument();
    });
  });

  test('shows preview status indicators', async () => {
    render(
      <TestWrapper>
        <ValidationPreviewIntegration />
      </TestWrapper>
    );
    
    // Should show preview status
    await waitFor(() => {
      expect(screen.getByText('Preview:')).toBeInTheDocument();
    });
  });
});

describe('ValidationProvider', () => {
  test('provides validation context', () => {
    const TestComponent = () => {
      const validation = useValidation();
      return (
        <div>
          <span>Validation Enabled: {validation.validationEnabled.toString()}</span>
          <span>Preview Enabled: {validation.previewEnabled.toString()}</span>
        </div>
      );
    };

    render(
      <TestWrapper>
        <TestComponent />
      </TestWrapper>
    );
    
    expect(screen.getByText('Validation Enabled: true')).toBeInTheDocument();
    expect(screen.getByText('Preview Enabled: true')).toBeInTheDocument();
  });
});

describe('PreviewPane', () => {
  test('renders preview controls', () => {
    render(
      <TestWrapper>
        <PreviewPane />
      </TestWrapper>
    );
    
    // Should have view mode toggles
    expect(screen.getByText('Preview')).toBeInTheDocument();
    expect(screen.getByText('Validation')).toBeInTheDocument();
  });

  test('switches between view modes', async () => {
    render(
      <TestWrapper>
        <PreviewPane />
      </TestWrapper>
    );
    
    // Click on validation view
    const validationButton = screen.getAllByText('Validation')[0];
    fireEvent.click(validationButton);
    
    await waitFor(() => {
      expect(screen.getByText('Complete')).toBeInTheDocument();
    });
  });
});