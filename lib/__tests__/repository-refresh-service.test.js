/**
 * Repository Refresh Service Tests
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { RepositoryRefreshService } from '../repository-refresh-service.js';

// Mock dependencies
vi.mock('../logger.js', () => ({
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

describe('RepositoryRefreshService', () => {
  let refreshService;
  let mockAccessToken;

  beforeEach(() => {
    mockAccessToken = 'test-token';
    refreshService = new RepositoryRefreshService(mockAccessToken);
  });

  it('should initialize with access token', () => {
    expect(refreshService).toBeDefined();
    expect(refreshService.octokit).toBeDefined();
    expect(refreshService.stateCache).toBeDefined();
    expect(refreshService.refreshCallbacks).toBeDefined();
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

  it('should create refresh summary', () => {
    const mockComparison = {
      needs_update: true,
      comparison: {
        files_changed: [{ path: 'file1.js' }],
        new_files: [{ path: 'file2.js' }],
        deleted_files: []
      },
      remoteState: {
        latestCommit: {
          sha: 'abc123',
          message: 'Test commit'
        }
      }
    };

    const summary = refreshService.createRefreshSummary(mockComparison);

    expect(summary.has_changes).toBe(true);
    expect(summary.changes.files_modified).toBe(1);
    expect(summary.changes.files_added).toBe(1);
    expect(summary.changes.files_deleted).toBe(0);
    expect(summary.refresh_recommended).toBe(true);
  });
});