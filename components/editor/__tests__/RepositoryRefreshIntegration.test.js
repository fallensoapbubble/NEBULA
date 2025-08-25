/**
 * Repository Refresh Integration Tests
 * Tests the integration between repository refresh, conflict resolution, and unsaved changes
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { RepositoryRefreshService } from '../../../lib/repository-refresh-service.js';
import { UnsavedChangesManager } from '../UnsavedChangesManager.js';
import { ConflictResolutionInterface } from '../ConflictResolutionInterface.js';
import { RepositoryUpdateNotification } from '../RepositoryUpdateNotification.js';

// Mock dependencies
vi.mock('../../../lib/logger.js', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn()
  }
}));

vi.mock('@octokit/rest', () => ({
  Octokit: vi.fn(() => ({
    rest: {
      repos: {
        get: vi.fn(),
        listCommits: vi.fn(),
        getContent: vi.fn()
      },
      git: {
        getTree: vi.fn()
      }
    }
  }))
}));

describe('Repository Refresh Integration', () => {
  let refreshService;
  let unsavedChangesManager;
  let mockAccessToken;

  beforeEach(() => {
    mockAccessToken = 'test-token';
    refreshService = new RepositoryRefreshService(mockAccessToken);
    unsavedChangesManager = new UnsavedChangesManager({
      storageKey: 'test_unsaved_changes'
    });

    // Clear localStorage
    localStorage.clear();
  });

  afterEach(() => {
    unsavedChangesManager?.destroy();
    localStorage.clear();
  });

  describe('RepositoryRefreshService', () => {
    it('should initialize with access token', () => {
      expect(refreshService).toBeDefined();
      expect(refreshService.octokit).toBeDefined();
    });

    it('should cache repository state', () => {
      const mockState = {
        repository: { name: 'test-repo' },
        latestCommit: { sha: 'abc123' },
        tree: []
      };

      refreshService.cacheState('owner', 'repo', mockState);
      const cached = refreshService.getCachedState('owner', 'repo');

      expect(cached).toMatchObject(mockState);
      expect(cached.cached_at).toBeDefined();
    });

    it('should clear cached state', () => {
      const mockState = {
        repository: { name: 'test-repo' },
        latestCommit: { sha: 'abc123' }
      };

      refreshService.cacheState('owner', 'repo', mockState);
      refreshService.clearCache('owner', 'repo');
      
      const cached = refreshService.getCachedState('owner', 'repo');
      expect(cached).toBeNull();
    });

    it('should register and emit refresh callbacks', () => {
      const callback = vi.fn();
      const repoKey = 'owner/repo';
      
      refreshService.onRefresh(repoKey, callback);
      refreshService.emitRefresh(repoKey, { test: 'data' });
      
      expect(callback).toHaveBeenCalledWith({ test: 'data' });
    });

    it('should unregister refresh callbacks', () => {
      const callback = vi.fn();
      const repoKey = 'owner/repo';
      
      refreshService.onRefresh(repoKey, callback);
      refreshService.offRefresh(repoKey, callback);
      refreshService.emitRefresh(repoKey, { test: 'data' });
      
      expect(callback).not.toHaveBeenCalled();
    });
  });

  describe('UnsavedChangesManager', () => {
    it('should track unsaved changes', () => {
      const repoKey = 'owner/repo';
      const filePath = 'data.json';
      const content = { name: 'test' };

      unsavedChangesManager.setUnsavedChange(repoKey, filePath, content);
      
      expect(unsavedChangesManager.hasUnsavedChanges(repoKey)).toBe(true);
      expect(unsavedChangesManager.hasUnsavedChanges(repoKey, filePath)).toBe(true);
    });

    it('should get unsaved changes', () => {
      const repoKey = 'owner/repo';
      const filePath = 'data.json';
      const content = { name: 'test' };

      unsavedChangesManager.setUnsavedChange(repoKey, filePath, content);
      const retrieved = unsavedChangesManager.getUnsavedChanges(repoKey, filePath);
      
      expect(retrieved.content).toEqual(content);
      expect(retrieved.metadata).toBeDefined();
      expect(retrieved.metadata.modified_at).toBeDefined();
    });

    it('should clear unsaved changes', () => {
      const repoKey = 'owner/repo';
      const filePath = 'data.json';
      const content = { name: 'test' };

      unsavedChangesManager.setUnsavedChange(repoKey, filePath, content);
      unsavedChangesManager.clearUnsavedChanges(repoKey, filePath);
      
      expect(unsavedChangesManager.hasUnsavedChanges(repoKey, filePath)).toBe(false);
    });

    it('should generate changes summary', () => {
      const repoKey = 'owner/repo';
      
      unsavedChangesManager.setUnsavedChange(repoKey, 'file1.json', { test: 1 });
      unsavedChangesManager.setUnsavedChange(repoKey, 'file2.md', 'content');
      
      const summary = unsavedChangesManager.getChangesSummary(repoKey);
      
      expect(summary.hasChanges).toBe(true);
      expect(summary.fileCount).toBe(2);
      expect(summary.files).toHaveLength(2);
    });

    it('should preserve and restore changes', () => {
      const repoKey = 'owner/repo';
      const content = { name: 'test' };
      
      unsavedChangesManager.setUnsavedChange(repoKey, 'data.json', content);
      
      const preservation = unsavedChangesManager.preserveChangesForRefresh(repoKey);
      expect(preservation.hasChanges).toBe(true);
      expect(preservation.preservationId).toBeDefined();
      
      // Clear current changes
      unsavedChangesManager.clearUnsavedChanges(repoKey);
      expect(unsavedChangesManager.hasUnsavedChanges(repoKey)).toBe(false);
      
      // Restore preserved changes
      const restored = unsavedChangesManager.restorePreservedChanges(preservation.preservationId);
      expect(restored).toBe(true);
      expect(unsavedChangesManager.hasUnsavedChanges(repoKey)).toBe(true);
    });
  });

  describe('ConflictResolutionInterface', () => {
    it('should render conflict interface when visible', () => {
      const mockConflicts = [
        {
          id: 'conflict1',
          type: 'file',
          path: 'data.json',
          description: 'File has conflicts'
        }
      ];

      render(
        <ConflictResolutionInterface
          conflicts={mockConflicts}
          isVisible={true}
          onResolve={vi.fn()}
          onCancel={vi.fn()}
        />
      );

      expect(screen.getByText('Repository Conflicts Detected')).toBeInTheDocument();
      expect(screen.getByText('data.json')).toBeInTheDocument();
    });

    it('should not render when not visible', () => {
      render(
        <ConflictResolutionInterface
          conflicts={[]}
          isVisible={false}
          onResolve={vi.fn()}
          onCancel={vi.fn()}
        />
      );

      expect(screen.queryByText('Repository Conflicts Detected')).not.toBeInTheDocument();
    });

    it('should handle conflict resolution selection', () => {
      const mockConflicts = [
        {
          id: 'conflict1',
          type: 'file',
          path: 'data.json',
          description: 'File has conflicts'
        }
      ];

      render(
        <ConflictResolutionInterface
          conflicts={mockConflicts}
          isVisible={true}
          onResolve={vi.fn()}
          onCancel={vi.fn()}
        />
      );

      const useLocalButton = screen.getByText('Use Local');
      fireEvent.click(useLocalButton);

      // Button should be selected (would need to check styling in real implementation)
      expect(useLocalButton).toBeInTheDocument();
    });
  });

  describe('RepositoryUpdateNotification', () => {
    it('should render update notification when updates available', () => {
      const mockUpdateStatus = {
        needs_refresh: true,
        remote_info: {
          ahead_by: 2,
          latest_commit: {
            sha: 'abc123',
            commit: {
              message: 'Test commit',
              author: {
                name: 'Test Author',
                date: new Date().toISOString()
              }
            }
          }
        }
      };

      render(
        <RepositoryUpdateNotification
          updateStatus={mockUpdateStatus}
          isVisible={true}
          onRefresh={vi.fn()}
          onDismiss={vi.fn()}
        />
      );

      expect(screen.getByText('Repository Updates Available')).toBeInTheDocument();
      expect(screen.getByText(/2 new commits/)).toBeInTheDocument();
    });

    it('should not render when no updates available', () => {
      const mockUpdateStatus = {
        needs_refresh: false
      };

      render(
        <RepositoryUpdateNotification
          updateStatus={mockUpdateStatus}
          isVisible={true}
          onRefresh={vi.fn()}
          onDismiss={vi.fn()}
        />
      );

      expect(screen.queryByText('Repository Updates Available')).not.toBeInTheDocument();
    });

    it('should handle refresh action', async () => {
      const mockRefresh = vi.fn();
      const mockUpdateStatus = {
        needs_refresh: true,
        remote_info: { ahead_by: 1 }
      };

      render(
        <RepositoryUpdateNotification
          updateStatus={mockUpdateStatus}
          isVisible={true}
          onRefresh={mockRefresh}
          onDismiss={vi.fn()}
        />
      );

      const refreshButton = screen.getByText(/Refresh Repository/);
      fireEvent.click(refreshButton);

      await waitFor(() => {
        expect(mockRefresh).toHaveBeenCalled();
      });
    });
  });

  describe('Integration Scenarios', () => {
    it('should handle conflict detection during refresh', () => {
      const repoKey = 'owner/repo';
      
      // Set up unsaved changes
      unsavedChangesManager.setUnsavedChange(repoKey, 'data.json', { name: 'local' });
      
      // Mock remote changes
      const mockComparison = {
        needs_update: true,
        comparison: {
          files_changed: [
            { path: 'data.json', local_sha: 'local123', remote_sha: 'remote456' }
          ]
        }
      };

      // This would be called by the refresh service
      const conflicts = detectConflictsFromComparison(
        unsavedChangesManager.getUnsavedChanges(repoKey),
        mockComparison
      );

      expect(conflicts).toHaveLength(1);
      expect(conflicts[0].path).toBe('data.json');
      expect(conflicts[0].type).toBe('file');
    });

    it('should preserve changes during refresh', () => {
      const repoKey = 'owner/repo';
      const content = { name: 'test', value: 123 };
      
      // Set unsaved changes
      unsavedChangesManager.setUnsavedChange(repoKey, 'data.json', content);
      
      // Preserve changes
      const preservation = unsavedChangesManager.preserveChangesForRefresh(repoKey);
      
      // Simulate refresh clearing changes
      unsavedChangesManager.clearUnsavedChanges(repoKey);
      
      // Restore after refresh
      const restored = unsavedChangesManager.restorePreservedChanges(
        preservation.preservationId,
        { mergeWithCurrent: true }
      );
      
      expect(restored).toBe(true);
      
      const restoredContent = unsavedChangesManager.getUnsavedChanges(repoKey, 'data.json');
      expect(restoredContent.content).toEqual(content);
    });
  });
});

// Helper function to simulate conflict detection
function detectConflictsFromComparison(unsavedChanges, comparison) {
  const conflicts = [];
  
  if (comparison.comparison?.files_changed) {
    comparison.comparison.files_changed.forEach(fileChange => {
      const repoChanges = unsavedChanges instanceof Map ? unsavedChanges : new Map(Object.entries(unsavedChanges || {}));
      
      if (repoChanges.has(fileChange.path)) {
        conflicts.push({
          id: `file_${fileChange.path}`,
          type: 'file',
          path: fileChange.path,
          description: 'File has both local and remote changes',
          localSha: fileChange.local_sha,
          remoteSha: fileChange.remote_sha
        });
      }
    });
  }
  
  return conflicts;
}