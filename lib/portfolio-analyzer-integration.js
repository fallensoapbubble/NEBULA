/**
 * Portfolio Analyzer Integration
 * Integrates the portfolio content analyzer with existing repository services
 */

import { RepositoryService } from './repository-service.js';
import { createPortfolioContentAnalyzer } from './portfolio-content-analyzer.js';

/**
 * Enhanced Repository Service with Portfolio Analysis
 * Extends the existing RepositoryService with portfolio content analysis capabilities
 */
export class EnhancedRepositoryService extends RepositoryService {
  constructor(accessToken, options = {}) {
    super(accessToken, options);
    
    // Create portfolio analyzer instance
    this.portfolioAnalyzer = createPortfolioContentAnalyzer(accessToken, {
      maxDepth: options.portfolioAnalysis?.maxDepth || 3,
      timeout: options.portfolioAnalysis?.timeout || 30000
    });
  }

  /**
   * Fork repository and analyze its portfolio content
   * @param {string} templateOwner - Owner of the template repository
   * @param {string} templateRepo - Name of the template repository
   * @param {string} [newName] - Optional new name for the forked repository
   * @returns {Promise<{success: boolean, repository?: object, analysis?: object, error?: string}>}
   */
  async forkRepositoryWithAnalysis(templateOwner, templateRepo, newName = null) {
    try {
      // First fork the repository
      const forkResult = await this.forkRepository(templateOwner, templateRepo, newName);
      if (!forkResult.success) {
        return forkResult;
      }

      // Wait a moment for the fork to be fully ready
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Analyze the forked repository for portfolio content
      const analysisResult = await this.portfolioAnalyzer.analyzeRepository(
        forkResult.repository.owner,
        forkResult.repository.name
      );

      return {
        success: true,
        repository: forkResult.repository,
        analysis: analysisResult.success ? analysisResult.analysis : null,
        analysisError: analysisResult.success ? null : analysisResult.error
      };

    } catch (error) {
      console.error('Fork with analysis error:', error);
      return {
        success: false,
        error: `Failed to fork and analyze repository: ${error.message}`
      };
    }
  }

  /**
   * Get repository with portfolio analysis
   * @param {string} owner - Repository owner
   * @param {string} repo - Repository name
   * @param {string} [ref] - Git reference
   * @returns {Promise<{success: boolean, repository?: object, analysis?: object, error?: string}>}
   */
  async getRepositoryWithAnalysis(owner, repo, ref = null) {
    try {
      // Get repository structure using existing method
      const structureResult = await this.getRepositoryStructure(owner, repo, '', ref);
      if (!structureResult.success) {
        return {
          success: false,
          error: structureResult.error
        };
      }

      // Analyze portfolio content
      const analysisResult = await this.portfolioAnalyzer.analyzeRepository(owner, repo, ref);

      return {
        success: true,
        repository: {
          owner,
          name: repo,
          ref: ref || 'default',
          structure: structureResult.structure
        },
        analysis: analysisResult.success ? analysisResult.analysis : null,
        analysisError: analysisResult.success ? null : analysisResult.error
      };

    } catch (error) {
      console.error('Get repository with analysis error:', error);
      return {
        success: false,
        error: `Failed to get repository with analysis: ${error.message}`
      };
    }
  }

  /**
   * Update repository content and re-analyze portfolio data
   * @param {string} owner - Repository owner
   * @param {string} repo - Repository name
   * @param {Array} changes - Array of file changes
   * @param {string} message - Commit message
   * @param {string} [branch] - Target branch
   * @returns {Promise<{success: boolean, commit?: object, analysis?: object, error?: string}>}
   */
  async updateContentWithAnalysis(owner, repo, changes, message, branch = null) {
    try {
      // Update repository content using existing method
      const updateResult = await this.createCommit(owner, repo, changes, message, branch);
      if (!updateResult.success) {
        return updateResult;
      }

      // Re-analyze portfolio content after update
      const analysisResult = await this.portfolioAnalyzer.analyzeRepository(owner, repo, branch);

      return {
        success: true,
        commit: updateResult.commit,
        analysis: analysisResult.success ? analysisResult.analysis : null,
        analysisError: analysisResult.success ? null : analysisResult.error
      };

    } catch (error) {
      console.error('Update content with analysis error:', error);
      return {
        success: false,
        error: `Failed to update content with analysis: ${error.message}`
      };
    }
  }

  /**
   * Get portfolio summary for quick overview
   * @param {string} owner - Repository owner
   * @param {string} repo - Repository name
   * @param {string} [ref] - Git reference
   * @returns {Promise<{success: boolean, summary?: object, error?: string}>}
   */
  async getPortfolioSummary(owner, repo, ref = null) {
    try {
      return await this.portfolioAnalyzer.getPortfolioSummary(owner, repo, ref);
    } catch (error) {
      console.error('Get portfolio summary error:', error);
      return {
        success: false,
        error: `Failed to get portfolio summary: ${error.message}`
      };
    }
  }

  /**
   * Validate repository as a portfolio template
   * @param {string} owner - Repository owner
   * @param {string} repo - Repository name
   * @param {string} [ref] - Git reference
   * @returns {Promise<{success: boolean, validation?: object, error?: string}>}
   */
  async validatePortfolioTemplate(owner, repo, ref = null) {
    try {
      const analysisResult = await this.portfolioAnalyzer.analyzeRepository(owner, repo, ref);
      if (!analysisResult.success) {
        return {
          success: false,
          error: analysisResult.error
        };
      }

      const { contentAnalysis, portfolioFiles } = analysisResult.analysis;
      
      // Define validation criteria for portfolio templates
      const validation = {
        isValidTemplate: false,
        score: contentAnalysis.completeness.percentage,
        requirements: {
          hasDataFile: contentAnalysis.structure.hasData || contentAnalysis.structure.hasPortfolio,
          hasAboutContent: contentAnalysis.structure.hasAbout,
          hasProjectsData: contentAnalysis.structure.hasProjects,
          hasMinimumFiles: portfolioFiles.length >= 2
        },
        recommendations: contentAnalysis.recommendations,
        issues: contentAnalysis.issues
      };

      // Calculate if template meets minimum requirements
      const requiredCriteria = [
        validation.requirements.hasDataFile,
        validation.requirements.hasMinimumFiles
      ];
      
      validation.isValidTemplate = requiredCriteria.every(criteria => criteria) && 
                                  validation.score >= 40; // Minimum 40% completeness

      return {
        success: true,
        validation
      };

    } catch (error) {
      console.error('Validate portfolio template error:', error);
      return {
        success: false,
        error: `Failed to validate portfolio template: ${error.message}`
      };
    }
  }

  /**
   * Compare two repositories for portfolio content differences
   * @param {object} repo1 - First repository {owner, name, ref?}
   * @param {object} repo2 - Second repository {owner, name, ref?}
   * @returns {Promise<{success: boolean, comparison?: object, error?: string}>}
   */
  async comparePortfolioContent(repo1, repo2) {
    try {
      // Analyze both repositories
      const [analysis1, analysis2] = await Promise.all([
        this.portfolioAnalyzer.analyzeRepository(repo1.owner, repo1.name, repo1.ref),
        this.portfolioAnalyzer.analyzeRepository(repo2.owner, repo2.name, repo2.ref)
      ]);

      if (!analysis1.success || !analysis2.success) {
        return {
          success: false,
          error: `Failed to analyze repositories: ${analysis1.error || analysis2.error}`
        };
      }

      const comparison = {
        repositories: [
          { owner: repo1.owner, name: repo1.name, ref: repo1.ref },
          { owner: repo2.owner, name: repo2.name, ref: repo2.ref }
        ],
        completeness: {
          repo1: analysis1.analysis.contentAnalysis.completeness.percentage,
          repo2: analysis2.analysis.contentAnalysis.completeness.percentage,
          difference: analysis2.analysis.contentAnalysis.completeness.percentage - 
                     analysis1.analysis.contentAnalysis.completeness.percentage
        },
        structure: {
          repo1: analysis1.analysis.contentAnalysis.structure,
          repo2: analysis2.analysis.contentAnalysis.structure,
          differences: this.compareStructures(
            analysis1.analysis.contentAnalysis.structure,
            analysis2.analysis.contentAnalysis.structure
          )
        },
        files: {
          repo1: analysis1.analysis.portfolioFiles.length,
          repo2: analysis2.analysis.portfolioFiles.length,
          uniqueToRepo1: this.getUniqueFiles(analysis1.analysis.portfolioFiles, analysis2.analysis.portfolioFiles),
          uniqueToRepo2: this.getUniqueFiles(analysis2.analysis.portfolioFiles, analysis1.analysis.portfolioFiles)
        },
        comparedAt: new Date().toISOString()
      };

      return {
        success: true,
        comparison
      };

    } catch (error) {
      console.error('Compare portfolio content error:', error);
      return {
        success: false,
        error: `Failed to compare portfolio content: ${error.message}`
      };
    }
  }

  /**
   * Compare two structure objects and find differences
   * @param {object} structure1 - First structure
   * @param {object} structure2 - Second structure
   * @returns {Array} Array of differences
   */
  compareStructures(structure1, structure2) {
    const differences = [];
    
    for (const [key, value1] of Object.entries(structure1)) {
      const value2 = structure2[key];
      if (value1 !== value2) {
        differences.push({
          field: key,
          repo1: value1,
          repo2: value2
        });
      }
    }
    
    return differences;
  }

  /**
   * Get files unique to the first array
   * @param {Array} files1 - First file array
   * @param {Array} files2 - Second file array
   * @returns {Array} Files unique to first array
   */
  getUniqueFiles(files1, files2) {
    const files2Names = new Set(files2.map(f => f.name));
    return files1.filter(f => !files2Names.has(f.name));
  }
}

/**
 * Create an enhanced repository service with portfolio analysis
 * @param {string} accessToken - GitHub access token
 * @param {object} options - Configuration options
 * @returns {EnhancedRepositoryService} Enhanced service instance
 */
export function createEnhancedRepositoryService(accessToken, options = {}) {
  return new EnhancedRepositoryService(accessToken, options);
}