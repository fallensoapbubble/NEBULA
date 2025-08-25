/**
 * Template Registry Tests
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { TemplateRegistry } from '../template-registry.js';

// Mock Octokit
vi.mock('@octokit/rest', () => ({
  Octokit: vi.fn(() => ({
    repos: {
      get: vi.fn(),
      getContent: vi.fn()
    }
  }))
}));

// Mock logger
vi.mock('../logger.js', () => ({
  logger: {
    child: vi.fn(() => ({
      info: vi.fn(),
      debug: vi.fn(),
      warn: vi.fn(),
      error: vi.fn()
    }))
  }
}));

describe('TemplateRegistry', () => {
  let registry;
  let mockOctokit;

  beforeEach(() => {
    registry = new TemplateRegistry('mock-token');
    mockOctokit = registry.octokit;
  });

  describe('parseRepoIdentifier', () => {
    it('should parse owner/repo format correctly', () => {
      const result = registry.parseRepoIdentifier('owner/repo');
      expect(result).toEqual({ owner: 'owner', repo: 'repo' });
    });

    it('should parse GitHub URL correctly', () => {
      const result = registry.parseRepoIdentifier('https://github.com/owner/repo');
      expect(result).toEqual({ owner: 'owner', repo: 'repo' });
    });

    it('should handle GitHub URL with .git suffix', () => {
      const result = registry.parseRepoIdentifier('https://github.com/owner/repo.git');
      expect(result).toEqual({ owner: 'owner', repo: 'repo' });
    });

    it('should return null for invalid identifiers', () => {
      const result = registry.parseRepoIdentifier('invalid');
      expect(result).toEqual({ owner: null, repo: null });
    });

    it('should return null for empty input', () => {
      const result = registry.parseRepoIdentifier('');
      expect(result).toEqual({ owner: null, repo: null });
    });
  });

  describe('isContentFile', () => {
    it('should identify data files as content files', () => {
      expect(registry.isContentFile('data.json')).toBe(true);
      expect(registry.isContentFile('data.yaml')).toBe(true);
      expect(registry.isContentFile('portfolio.json')).toBe(true);
    });

    it('should identify markdown files as content files', () => {
      expect(registry.isContentFile('about.md')).toBe(true);
      expect(registry.isContentFile('readme.md')).toBe(true);
    });

    it('should not identify non-content files', () => {
      expect(registry.isContentFile('package.json')).toBe(false);
      expect(registry.isContentFile('index.js')).toBe(false);
      expect(registry.isContentFile('style.css')).toBe(false);
    });
  });

  describe('isConfigFile', () => {
    it('should identify config files correctly', () => {
      expect(registry.isConfigFile('.nebula/config.json')).toBe(true);
      expect(registry.isConfigFile('package.json')).toBe(true);
      expect(registry.isConfigFile('next.config.js')).toBe(true);
    });

    it('should not identify non-config files', () => {
      expect(registry.isConfigFile('data.json')).toBe(false);
      expect(registry.isConfigFile('about.md')).toBe(false);
    });
  });

  describe('fetchRepositoryInfo', () => {
    it('should fetch repository information successfully', async () => {
      const mockRepoData = {
        name: 'test-repo',
        description: 'Test repository',
        html_url: 'https://github.com/owner/test-repo',
        clone_url: 'https://github.com/owner/test-repo.git',
        private: false,
        owner: { login: 'owner' },
        created_at: '2023-01-01T00:00:00Z',
        updated_at: '2023-01-02T00:00:00Z',
        stargazers_count: 10,
        forks_count: 5
      };

      mockOctokit.repos.get.mockResolvedValue({ data: mockRepoData });

      const result = await registry.fetchRepositoryInfo('owner', 'test-repo');
      expect(result).toEqual(mockRepoData);
      expect(mockOctokit.repos.get).toHaveBeenCalledWith({
        owner: 'owner',
        repo: 'test-repo'
      });
    });

    it('should return null for 404 errors', async () => {
      mockOctokit.repos.get.mockRejectedValue({ status: 404 });

      const result = await registry.fetchRepositoryInfo('owner', 'nonexistent');
      expect(result).toBeNull();
    });

    it('should return null for 403 errors', async () => {
      mockOctokit.repos.get.mockRejectedValue({ status: 403 });

      const result = await registry.fetchRepositoryInfo('owner', 'private-repo');
      expect(result).toBeNull();
    });
  });

  describe('fetchFileContent', () => {
    it('should fetch file content successfully', async () => {
      const mockContent = Buffer.from('{"name": "test"}').toString('base64');
      mockOctokit.repos.getContent.mockResolvedValue({
        data: {
          type: 'file',
          content: mockContent
        }
      });

      const result = await registry.fetchFileContent('owner', 'repo', 'package.json');
      expect(result).toBe('{"name": "test"}');
    });

    it('should return null for 404 errors', async () => {
      mockOctokit.repos.getContent.mockRejectedValue({ status: 404 });

      const result = await registry.fetchFileContent('owner', 'repo', 'nonexistent.json');
      expect(result).toBeNull();
    });

    it('should return null for directory type', async () => {
      mockOctokit.repos.getContent.mockResolvedValue({
        data: { type: 'dir' }
      });

      const result = await registry.fetchFileContent('owner', 'repo', 'src');
      expect(result).toBeNull();
    });
  });
});