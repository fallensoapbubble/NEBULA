/**
 * Template Validation API Endpoint
 * Validates template compatibility and provides creator feedback
 * Implements requirements 8.1, 8.2, and 8.4
 */

import { NextResponse } from 'next/server';
import { RepositoryService } from '../../../../../../lib/repository-service.js';
import { TemplateCompatibilityValidationSystem } from '../../../../../../lib/template-compatibility-validator.js';
import { parseGitHubError } from '../../../../../../lib/github-errors.js';

/**
 * GET /api/templates/[owner]/[repo]/validate
 * Validate template compatibility with the platform
 */
export async function GET(request, { params }) {
  try {
    const { owner, repo } = params;
    const { searchParams } = new URL(request.url);
    
    // Get query parameters
    const ref = searchParams.get('ref') || null;
    const generateFeedback = searchParams.get('feedback') === 'true';
    const interactive = searchParams.get('interactive') === 'true';

    // Validate parameters
    if (!owner || !repo) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Missing required parameters: owner and repo' 
        },
        { status: 400 }
      );
    }

    console.log(`Validating template: ${owner}/${repo}${ref ? ` (ref: ${ref})` : ''}`);

    // Initialize services
    const repositoryService = new RepositoryService();
    const validationSystem = new TemplateCompatibilityValidationSystem(repositoryService);

    // Perform validation
    const validationResult = await validationSystem.validateTemplateCompatibility(
      owner, 
      repo, 
      ref,
      {
        generateFeedback,
        interactive
      }
    );

    if (!validationResult.success) {
      console.error(`Template validation failed for ${owner}/${repo}:`, validationResult.error);
      
      return NextResponse.json(
        {
          success: false,
          error: validationResult.error,
          details: validationResult.details
        },
        { status: 400 }
      );
    }

    const result = validationResult.result;

    // Return validation result
    return NextResponse.json({
      success: true,
      validation: {
        valid: result.valid,
        compatibility: result.compatibility,
        score: result.validation.score,
        maxScore: result.validation.maxScore,
        issues: {
          errors: result.validation.errors,
          warnings: result.validation.warnings,
          suggestions: result.validation.suggestions
        },
        details: {
          structure: result.structure,
          files: result.files,
          configuration: result.configuration,
          content: result.content
        },
        metadata: result.metadata
      },
      feedback: result.feedback || null
    });

  } catch (error) {
    console.error('Template validation API error:', error);

    // Parse GitHub-specific errors
    const githubError = parseGitHubError(error);
    if (githubError) {
      return NextResponse.json(
        {
          success: false,
          error: githubError.message,
          type: githubError.type,
          retryable: githubError.retryable
        },
        { status: githubError.status }
      );
    }

    return NextResponse.json(
      {
        success: false,
        error: 'Template validation failed',
        details: error.message
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/templates/[owner]/[repo]/validate
 * Validate template with custom options
 */
export async function POST(request, { params }) {
  try {
    const { owner, repo } = params;
    const body = await request.json();

    // Extract options from request body
    const {
      ref = null,
      options = {},
      validationRules = null
    } = body;

    // Validate parameters
    if (!owner || !repo) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Missing required parameters: owner and repo' 
        },
        { status: 400 }
      );
    }

    console.log(`Validating template with custom options: ${owner}/${repo}`);

    // Initialize services
    const repositoryService = new RepositoryService();
    const validationSystem = new TemplateCompatibilityValidationSystem(repositoryService);

    // Apply custom validation rules if provided
    if (validationRules) {
      // This could be extended to support custom validation rules
      console.log('Custom validation rules provided:', validationRules);
    }

    // Perform validation
    const validationResult = await validationSystem.validateTemplateCompatibility(
      owner, 
      repo, 
      ref,
      {
        generateFeedback: options.generateFeedback !== false, // Default to true
        interactive: options.interactive || false,
        ...options
      }
    );

    if (!validationResult.success) {
      return NextResponse.json(
        {
          success: false,
          error: validationResult.error,
          details: validationResult.details
        },
        { status: 400 }
      );
    }

    const result = validationResult.result;

    // Return comprehensive validation result
    return NextResponse.json({
      success: true,
      validation: {
        valid: result.valid,
        compatibility: result.compatibility,
        score: result.validation.score,
        maxScore: result.validation.maxScore,
        percentage: Math.round((result.validation.score / result.validation.maxScore) * 100),
        grade: calculateGrade(result.validation.score, result.validation.maxScore),
        issues: {
          errors: result.validation.errors,
          warnings: result.validation.warnings,
          suggestions: result.validation.suggestions,
          total: result.validation.errors.length + result.validation.warnings.length + result.validation.suggestions.length
        },
        sections: {
          structure: {
            valid: result.validation.details.structure.valid,
            score: result.validation.details.structure.score,
            maxScore: result.validation.details.structure.maxScore,
            issues: result.validation.details.structure.issues
          },
          configuration: {
            valid: result.validation.details.config.valid,
            score: result.validation.details.config.score,
            maxScore: result.validation.details.config.maxScore,
            issues: result.validation.details.config.issues
          },
          content: {
            valid: result.validation.details.content.valid,
            score: result.validation.details.content.score,
            maxScore: result.validation.details.content.maxScore,
            issues: result.validation.details.content.issues
          },
          compatibility: {
            valid: result.validation.details.compatibility.valid,
            score: result.validation.details.compatibility.score,
            maxScore: result.validation.details.compatibility.maxScore,
            issues: result.validation.details.compatibility.issues
          }
        },
        recommendations: result.validation.recommendations || []
      },
      analysis: result.analysis,
      feedback: result.feedback,
      metadata: {
        ...result.metadata,
        validationOptions: options,
        requestedAt: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('Template validation POST API error:', error);

    return NextResponse.json(
      {
        success: false,
        error: 'Template validation failed',
        details: error.message
      },
      { status: 500 }
    );
  }
}

/**
 * Calculate letter grade from score
 * @param {number} score - Current score
 * @param {number} maxScore - Maximum possible score
 * @returns {string} Letter grade
 */
function calculateGrade(score, maxScore) {
  const percentage = (score / maxScore) * 100;
  
  if (percentage >= 90) return 'A';
  if (percentage >= 80) return 'B';
  if (percentage >= 70) return 'C';
  if (percentage >= 60) return 'D';
  return 'F';
}