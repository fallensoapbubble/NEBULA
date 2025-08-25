/**
 * Tests for Portfolio Analyzer Integration
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { EnhancedRepositoryService, createEnhancedRepositoryService } from '../portfolio-analyzer-integration.js';

// Mock the dependencies
vi.mock('../repository-service.js', () => ({
  RepositoryService: class MockRepositoryService {
    constructor(accessToken, options) {
      this.accessToken = accessToken;
      this.options = options;
    }

    async forkRepository(owner, repo, newName) {
      return {
        success: true,
        repository: {
          owner: 'testuser',
          name: newName || repo,
          fullName: `testuser/${newName || repo}`,
          url: `https://github.com/testuser/${newName || repo}`
        }
      };
    }

    async getRepositoryStructure(owner, repo, path, ref) {
      return {
        success: true,
        structure: {
          path: '',
          type: 'directory',
          items: [
            {
              name: 'data.json',
              path: 'data.json',
              type: 'file',
              size: 100
            }
          ]
        }
      };
    }

    async createCommit(owner, repo, changes, message, branch) {
      return {
        success: true,
        commit: {
          sha: 'abc123',
          message,
          filesChanged: changes.length
        }
      };
    }
  }
}));

vi.mock('../portfolio-content-analyzer.js', () => ({
  createPortfolioContentAnalyzer: vi.fn(() => ({
    analyzeRepository: vi.fn().mockResolvedValue({
      success: true,
      analysis: {
        repository: { owner: 'testuser', name: 'testrepo' },
        portfolioFiles: [
          { name: 'data.json', type: 'data', priority: 1 }
        ],
        contentAnalysis: {
          completeness: { percentage: 75 },
          structure: {
            hasData: true,
            hasAbout: false,
            hasProjects: true
          },
          recommendations: [],
          issues: []
        }
      }
    }),
    getPortfolioSummary: vi.fn().mockResolvedValue({
      success: true,
      summary: {
        repository: { owner: 'testuser', name: 'testrepo' },
        completeness: 75,
        keyData: { name: 'Test User' }
      }
    })
  }))
}));

describe('EnhancedRepositoryService', () => {
  let service;
  const mockAccessToken = 'test-token';

  beforeEach(() => {
    vi.clearAllMocks();
    service = new EnhancedRepositoryService(mockAccessToken);
  });

  describe('constructor', () => {
    it('should create service with portfolio analyzer', () => {
      expect(service.accessToken).toBe(mockAccessToken);
      expect(service.portfolioAnalyzer).toBeDefined();
    });

    it('should accept portfolio analysis options', () => {
      const options = {
        portfolioAnalysis: {
          maxDepth: 5,
          timeout: 60000
        }
      };
      
      const customService = new EnhancedRepositoryService(mockAccessToken, options);
      expect(customService.portfolioAnalyzer).toBeDefined();
    });
  });

  describe('forkRepositoryWithAnalysis', () => {
    it('should fork repository and analyze content', async () => {
      const result = await service.forkRepositoryWithAnalysis('template-owner', 'template-repo');
      
      expect(result.success).toBe(true);
      expect(result.repository).toBeDefined();
      expect(result.repository.owner).toBe('testuser');
      expect(result.analysis).toBeDefined();
      expect(result.analysis.contentAnalysis.completeness.percentage).toBe(75);
    });

    it('should handle fork failure', async () => {
      // Mock fork failure
      vi.spyOn(service, 'forkRepository').mockResolvedValue({
        success: false,
        error: 'Fork failed'
      });

      const result = await service.forkRepositoryWithAnalysis('template-owner', 'template-repo');
      
      expect(result.success).toBe(false);
      expect(result.error).toBe('Fork failed');
    });
  });

  describe('getRepositoryWithAnalysis', () => {
    it('should get repository structure and analyze content', async () => {
      const result = await service.getRepositoryWithAnalysis('owner', 'repo');
      
      expect(result.success).toBe(true);
      expect(result.repository).toBeDefined();
      expect(result.repository.structure).toBeDefined();
      expect(result.analysis).toBeDefined();
      expect(result.analysis.contentAnalysis.completeness.percentage).toBe(75);
    });

    it('should handle structure retrieval failure', async () => {
      // Mock structure failure
      vi.spyOn(service, 'getRepositoryStructure').mockResolvedValue({
        success: false,
        error: 'Repository not found'
      });

      const result = await service.getRepositoryWithAnalysis('owner', 'repo');
      
      expect(result.success).toBe(false);
      expect(result.error).toBe('Repository not found');
    });
  });

  describe('updateContentWithAnalysis', () => {
    it('should update content and re-analyze', async () => {
      const changes = [
        { path: 'data.json', content: '{"name": "Updated"}', operation: 'update' }
      ];

      const result = await service.updateContentWithAnalysis('owner', 'repo', changes, 'Update data');
      
      expect(result.success).toBe(true);
      expect(result.commit).toBeDefined();
      expect(result.commit.filesChanged).toBe(1);
      expect(result.analysis).toBeDefined();
    });
  });

  describe('getPortfolioSummary', () => {
    it('should get portfolio summary', async () => {
      const result = await service.getPortfolioSummary('owner', 'repo');
      
      expect(result.success).toBe(true);
      expect(result.summary).toBeDefined();
      expect(result.summary.completeness).toBe(75);
      expect(result.summary.keyData.name).toBe('Test User');
    });
  });

  describe('validatePortfolioTemplate', () => {
    it('should validate portfolio template', async () => {
      const result = await service.validatePortfolioTemplate('owner', 'repo');
      
      expect(result.success).toBe(true);
      expect(result.validation).toBeDefined();
      expect(result.validation.score).toBe(75);
      expect(result.validation.requirements.hasDataFile).toBe(true);
      expect(result.validation.isValidTemplate).toBe(true);
    });

    it('should identify invalid templates', async () => {
      // Mock low-quality analysis
      service.portfolioAnalyzer.analyzeRepository.mockResolvedValue({
        success: true,
        analysis: {
          portfolioFiles: [],
          contentAnalysis: {
            completeness: { percentage: 20 },
            structure: {
              hasData: false,
              hasAbout: false,
              hasProjects: false
            },
            recommendations: ['Add data file'],
            issues: []
          }
        }
      });

      const result = await service.validatePortfolioTemplate('owner', 'repo');
      
      expect(result.success).toBe(true);
      expect(result.validation.isValidTemplate).toBe(false);
      expect(result.validation.score).toBe(20);
      expect(result.validation.requirements.hasDataFile).toBe(false);
    });
  });

  describe('comparePortfolioContent', () => {
    it('should compare two repositories', async () => {
      // Mock different analysis results
      service.portfolioAnalyzer.analyzeRepository
        .mockResolvedValueOnce({
          success: true,
          analysis: {
            portfolioFiles: [{ name: 'data.json' }],
            contentAnalysis: {
              completeness: { percentage: 60 },
              structure: { hasData: true, hasAbout: false }
            }
          }
        })
        .mockResolvedValueOnce({
          success: true,
          analysis: {
            portfolioFiles: [{ name: 'data.json' }, { name: 'about.md' }],
            contentAnalysis: {
              completeness: { percentage: 80 },
              structure: { hasData: true, hasAbout: true }
            }
          }
        });

      const repo1 = { owner: 'user1', name: 'repo1' };
      const repo2 = { owner: 'user2', name: 'repo2' };
      
      const result = await service.comparePortfolioContent(repo1, repo2);
      
      expect(result.success).toBe(true);
      expect(result.comparison).toBeDefined();
      expect(result.comparison.completeness.difference).toBe(20);
      expect(result.comparison.files.repo1).toBe(1);
      expect(result.comparison.files.repo2).toBe(2);
    });
  });

  describe('utility methods', () => {
    it('should compare structures correctly', () => {
      const structure1 = { hasData: true, hasAbout: false };
      const structure2 = { hasData: true, hasAbout: true };
      
      const differences = service.compareStructures(structure1, structure2);
      
      expect(differences).toHaveLength(1);
      expect(differences[0].field).toBe('hasAbout');
      expect(differences[0].repo1).toBe(false);
      expect(differences[0].repo2).toBe(true);
    });

    it('should find unique files correctly', () => {
      const files1 = [{ name: 'data.json' }, { name: 'about.md' }];
      const files2 = [{ name: 'data.json' }, { name: 'projects.json' }];
      
      const unique = service.getUniqueFiles(files1, files2);
      
      expect(unique).toHaveLength(1);
      expect(unique[0].name).toBe('about.md');
    });
  });

  describe('convenience function', () => {
    it('should create enhanced repository service', () => {
      const service = createEnhancedRepositoryService(mockAccessToken, { test: true });
      expect(service).toBeInstanceOf(EnhancedRepositoryService);
    });
  });
});