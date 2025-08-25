/**
 * Tests for Repository Synchronization Service
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import RepositorySyncService from '../repository-sync-service.js';

// Mock Octokit
vi.mock('@octokit/rest', () => ({
  Octokit: vi.fn(() => ({
    rest: {
      repos: {
        get: vi.fn(),
        listCommits: vi.fn(),
        getCommit: vi.fn(),
        getContent: vi.fn(),
      },
    },
  })),
}));

describe('RepositorySyncService', () => {
  let service;
  let mockOctokit;

  beforeEach(() => {
    service = new RepositorySyncService('test-token');
    mockOctokit = service.octokit;
  });

  describe('checkForRemoteChanges', () => {
    it('should detect remote changes when SHA differs', async () => {
      mockOctokit.rest.repos.get.mockResolvedValue({
        data: { default_branch: 'main' }
      });
      
      mockOctokit.rest.repos.listCommits.mockResolvedValue({
        data: [
          { sha: 'new-sha-123', commit: { message: 'New commit' } },
          { sha: 'old-sha-456', commit: { message: 'Old commit' } }
        ]
      });

      const result = await service.checkForRemoteChanges('owner', 'repo', 'old-sha-456');
      
      expect(result.hasChanges).toBe(true);
      expect(result.latestSha).toBe('new-sha-123');
      expect(result.commits).toHaveLength(1);
    });

    it('should return no changes when SHA matches', async () => {
      mockOctokit.rest.repos.get.mockResolvedValue({
        data: { default_branch: 'main' }
      });
      
      mockOctokit.rest.repos.listCommits.mockResolvedValue({
        data: [{ sha: 'same-sha-123' }]
      });

      const result = await service.checkForRemoteChanges('owner', 'repo', 'same-sha-123');
      
      expect(result.hasChanges).toBe(false);
      expect(result.latestSha).toBe('same-sha-123');
    });
  });

  describe('detectFileConflicts', () => {
    it('should detect file modification conflicts', async () => {
      mockOctokit.rest.repos.getContent.mockResolvedValue({
        data: {
          sha: 'current-sha-123',
          content: 'bmV3IGNvbnRlbnQ=',
          encoding: 'base64'
        }
      });

      const result = await service.detectFileConflicts('owner', 'repo', 'file.txt', 'expected-sha-456');
      
      expect(result.hasConflict).toBe(true);
      expect(result.conflictType).toBe('file_modified');
      expect(result.currentSha).toBe('current-sha-123');
    });
  });
});