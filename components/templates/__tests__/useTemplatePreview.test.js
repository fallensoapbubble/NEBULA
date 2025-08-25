/**
 * useTemplatePreview Hook Tests
 * Tests for the template preview hook functionality
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useTemplatePreview, useMultipleTemplatePreviews } from '../useTemplatePreview.js';

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

// Mock fetch
global.fetch = vi.fn();

describe('useTemplatePreview', () => {
  const mockPreviewData = {
    template: {
      id: 'user1/template1',
      name: 'Test Template'
    },
    portfolioData: {
      'data.json': {
        metadata: { name: 'Test User' }
      }
    },
    repository: {
      owner: 'user1',
      name: 'template1',
      full_name: 'user1/template1'
    },
    preview: {
      generated_at: new Date().toISOString(),
      data_source: 'live'
    }
  };

  beforeEach(() => {
    vi.clearAllMocks();
    fetch.mockClear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('initializes with default state', () => {
    const { result } = renderHook(() => useTemplatePreview());

    expect(result.current.previewData).toBeNull();
    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBeNull();
    expect(result.current.hasData).toBe(false);
    expect(result.current.hasError).toBe(false);
    expect(result.current.isEmpty).toBe(true);
  });

  it('loads preview data automatically when templateId is provided', async () => {
    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: true,
        data: mockPreviewData
      })
    });

    const { result } = renderHook(() => 
      useTemplatePreview({
        templateId: 'user1/template1',
        autoLoad: true
      })
    );

    expect(result.current.isLoading).toBe(true);

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(fetch).toHaveBeenCalledWith(
      '/api/templates/user1/template1/preview?sample=false',
      expect.objectContaining({
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
      })
    );

    expect(result.current.previewData).toEqual(mockPreviewData);
    expect(result.current.hasData).toBe(true);
    expect(result.current.template).toEqual(mockPreviewData.template);
  });

  it('does not auto-load when autoLoad is false', () => {
    const { result } = renderHook(() => 
      useTemplatePreview({
        templateId: 'user1/template1',
        autoLoad: false
      })
    );

    expect(result.current.isLoading).toBe(false);
    expect(fetch).not.toHaveBeenCalled();
  });

  it('handles loading errors', async () => {
    fetch.mockRejectedValueOnce(new Error('Network error'));

    const { result } = renderHook(() => 
      useTemplatePreview({
        templateId: 'user1/template1',
        autoLoad: true
      })
    );

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.error).toBe('Network error');
    expect(result.current.hasError).toBe(true);
    expect(result.current.previewData).toBeNull();
  });

  it('handles API error responses', async () => {
    fetch.mockResolvedValueOnce({
      ok: false,
      json: async () => ({
        success: false,
        error: { message: 'Template not found' }
      })
    });

    const { result } = renderHook(() => 
      useTemplatePreview({
        templateId: 'user1/template1',
        autoLoad: true
      })
    );

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.error).toBe('Template not found');
    expect(result.current.hasError).toBe(true);
  });

  it('loads sample data when mode is sample', async () => {
    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: true,
        data: mockPreviewData
      })
    });

    const { result } = renderHook(() => 
      useTemplatePreview({
        templateId: 'user1/template1',
        mode: 'sample',
        autoLoad: true
      })
    );

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(fetch).toHaveBeenCalledWith(
      '/api/templates/user1/template1/preview?sample=true',
      expect.any(Object)
    );
  });

  it('refreshes preview data', async () => {
    fetch.mockResolvedValue({
      ok: true,
      json: async () => ({
        success: true,
        data: mockPreviewData
      })
    });

    const { result } = renderHook(() => 
      useTemplatePreview({
        templateId: 'user1/template1',
        autoLoad: true
      })
    );

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(fetch).toHaveBeenCalledTimes(1);

    act(() => {
      result.current.refreshPreview();
    });

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledTimes(2);
    });
  });

  it('changes mode and reloads', async () => {
    fetch.mockResolvedValue({
      ok: true,
      json: async () => ({
        success: true,
        data: mockPreviewData
      })
    });

    const { result } = renderHook(() => 
      useTemplatePreview({
        templateId: 'user1/template1',
        mode: 'live',
        autoLoad: true
      })
    );

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    act(() => {
      result.current.changeMode('sample');
    });

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith(
        '/api/templates/user1/template1/preview?sample=true',
        expect.any(Object)
      );
    });
  });

  it('clears preview data', async () => {
    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: true,
        data: mockPreviewData
      })
    });

    const { result } = renderHook(() => 
      useTemplatePreview({
        templateId: 'user1/template1',
        autoLoad: true
      })
    );

    await waitFor(() => {
      expect(result.current.previewData).toEqual(mockPreviewData);
    });

    act(() => {
      result.current.clearPreview();
    });

    expect(result.current.previewData).toBeNull();
    expect(result.current.error).toBeNull();
    expect(result.current.isLoading).toBe(false);
  });

  it('aborts previous requests when new ones are made', async () => {
    const abortSpy = vi.fn();
    const mockAbortController = {
      abort: abortSpy,
      signal: { aborted: false }
    };

    global.AbortController = vi.fn(() => mockAbortController);

    fetch.mockImplementation(() => new Promise(() => {})); // Never resolves

    const { result, rerender } = renderHook(
      ({ templateId }) => useTemplatePreview({ templateId, autoLoad: true }),
      { initialProps: { templateId: 'user1/template1' } }
    );

    // Change templateId to trigger new request
    rerender({ templateId: 'user2/template2' });

    expect(abortSpy).toHaveBeenCalled();
  });
});

describe('useMultipleTemplatePreviews', () => {
  const mockTemplateIds = ['user1/template1', 'user2/template2'];
  const mockPreviewData1 = {
    template: { id: 'user1/template1', name: 'Template 1' },
    portfolioData: { 'data.json': { metadata: { name: 'User 1' } } }
  };
  const mockPreviewData2 = {
    template: { id: 'user2/template2', name: 'Template 2' },
    portfolioData: { 'data.json': { metadata: { name: 'User 2' } } }
  };

  beforeEach(() => {
    vi.clearAllMocks();
    fetch.mockClear();
  });

  it('initializes with empty state', () => {
    const { result } = renderHook(() => useMultipleTemplatePreviews());

    expect(result.current.previews).toEqual({});
    expect(result.current.loadingStates).toEqual({});
    expect(result.current.errors).toEqual({});
    expect(result.current.isAnyLoading).toBe(false);
    expect(result.current.hasAnyError).toBe(false);
    expect(result.current.loadedCount).toBe(0);
  });

  it('loads multiple template previews', async () => {
    fetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: mockPreviewData1 })
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: mockPreviewData2 })
      });

    const { result } = renderHook(() => 
      useMultipleTemplatePreviews(mockTemplateIds, { autoLoad: true })
    );

    await waitFor(() => {
      expect(result.current.isAnyLoading).toBe(false);
    });

    expect(result.current.previews['user1/template1']).toEqual(mockPreviewData1);
    expect(result.current.previews['user2/template2']).toEqual(mockPreviewData2);
    expect(result.current.loadedCount).toBe(2);
  });

  it('gets individual preview data', async () => {
    fetch.mockResolvedValue({
      ok: true,
      json: async () => ({ success: true, data: mockPreviewData1 })
    });

    const { result } = renderHook(() => 
      useMultipleTemplatePreviews(['user1/template1'], { autoLoad: true })
    );

    await waitFor(() => {
      expect(result.current.isAnyLoading).toBe(false);
    });

    const preview = result.current.getPreview('user1/template1');
    expect(preview.data).toEqual(mockPreviewData1);
    expect(preview.hasData).toBe(true);
    expect(preview.isLoading).toBe(false);
    expect(preview.error).toBeNull();
  });

  it('handles individual template errors', async () => {
    fetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: mockPreviewData1 })
      })
      .mockRejectedValueOnce(new Error('Template 2 error'));

    const { result } = renderHook(() => 
      useMultipleTemplatePreviews(mockTemplateIds, { autoLoad: true })
    );

    await waitFor(() => {
      expect(result.current.isAnyLoading).toBe(false);
    });

    expect(result.current.previews['user1/template1']).toEqual(mockPreviewData1);
    expect(result.current.errors['user2/template2']).toBe('Template 2 error');
    expect(result.current.hasAnyError).toBe(true);
    expect(result.current.loadedCount).toBe(1);
  });
});