/**
 * Integration Tests for Editing Components
 * Tests the components work together without circular dependencies
 */

import { describe, it, expect } from 'vitest';

describe('Editing Components Integration', () => {
  it('should import all editing components without errors', async () => {
    // Test that all components can be imported without circular dependency issues
    const { MarkdownEditor } = await import('../MarkdownEditor.js');
    const { ArrayEditor } = await import('../ArrayEditor.js');
    const { ObjectEditor } = await import('../ObjectEditor.js');
    const { ImageUpload } = await import('../ImageUpload.js');
    const { DynamicFormGenerator } = await import('../DynamicFormGenerator.js');

    expect(MarkdownEditor).toBeDefined();
    expect(ArrayEditor).toBeDefined();
    expect(ObjectEditor).toBeDefined();
    expect(ImageUpload).toBeDefined();
    expect(DynamicFormGenerator).toBeDefined();
  });

  it('should export components from index', async () => {
    const editorComponents = await import('../index.js');

    expect(editorComponents.MarkdownEditor).toBeDefined();
    expect(editorComponents.ArrayEditor).toBeDefined();
    expect(editorComponents.ObjectEditor).toBeDefined();
    expect(editorComponents.ImageUpload).toBeDefined();
    expect(editorComponents.DynamicFormGenerator).toBeDefined();
  });

  it('should have proper component structure', async () => {
    const { MarkdownEditor } = await import('../MarkdownEditor.js');
    const { ArrayEditor } = await import('../ArrayEditor.js');
    const { ObjectEditor } = await import('../ObjectEditor.js');
    const { ImageUpload } = await import('../ImageUpload.js');

    // Check that components are React components (functions)
    expect(typeof MarkdownEditor).toBe('function');
    expect(typeof ArrayEditor).toBe('function');
    expect(typeof ObjectEditor).toBe('function');
    expect(typeof ImageUpload).toBe('function');
  });
});