/**
 * Template Creator Feedback System
 * Provides actionable feedback and guidance for template creators
 */
export class TemplateFeedbackSystem {
  constructor(templateValidator) {
    this.templateValidator = templateValidator;
    
    // Feedback templates for different scenarios
    this.feedbackTemplates = {
      success: {
        title: '✅ Template Validation Successful',
        message: 'Your template meets all platform requirements and is ready for use.',
        tone: 'positive'
      },
      warnings: {
        title: '⚠️ Template Has Some Issues',
        message: 'Your template is functional but has some areas for improvement.',
        tone: 'cautionary'
      },
      errors: {
        title: '❌ Template Validation Failed',
        message: 'Your template has critical issues that must be fixed before it can be used.',
        tone: 'critical'
      },
      improvements: {
        title: '💡 Suggestions for Improvement',
        message: 'Here are some ways to make your template even better.',
        tone: 'helpful'
      }
    };

    // Action guides for common issues
    this.actionGuides = {
      'missing-config': {
        title: 'Create Template Configuration',
        steps: [
          'Create a `.nebula` directory in your repository root',
          'Add a `config.json` file inside the `.nebula` directory',
          'Define your template structure using the configuration schema',
          'Specify content files and their editing schemas'
        ],
        example: `{
  "version": "1.0",
  "name": "My Portfolio Template",
  "templateType": "json",
  "contentFiles": [
    {
      "path": "data.json",
      "type": "json",
      "schema": {
        "title": { "type": "string", "label": "Portfolio Title", "required": true }
      }
    }
  ]
}`
      },
      'missing-preview': {
        title: 'Add Template Preview Image',
        steps: [
          'Create a preview image of your template (recommended: 800x600px)',
          'Save it as `preview.png` in the `.nebula` directory',
          'Ensure the image shows the key features of your template',
          'Use a high-quality screenshot or mockup'
        ]
      },
      'invalid-schema': {
        title: 'Fix Schema Definition',
        steps: [
          'Review the schema definition in your config.json',
          'Ensure all field types are supported',
          'Add required properties like "type" and "label"',
          'Test your schema with sample data'
        ]
      },
      'missing-content': {
        title: 'Add Content Files',
        steps: [
          'Create the content files specified in your configuration',
          'Ensure file paths match those in config.json',
          'Add sample content to demonstrate your template',
          'Validate JSON syntax if using JSON files'
        ]
      }
    };
  }

  /**
   * Generate comprehensive feedback for template creators
   * @param {object} validationResult - Template validation result
   * @param {object} options - Feedback options
   * @returns {object} Structured feedback report
   */
  generateFeedback(validationResult, options = {}) {
    const feedback = {
      summary: this.generateSummary(validationResult),
      sections: {
        overview: this.generateOverview(validationResult),
        issues: this.generateIssuesSection(validationResult),
        recommendations: this.generateRecommendations(validationResult),
        nextSteps: this.generateNextSteps(validationResult),
        resources: this.generateResources(validationResult)
      },
      metadata: {
        generatedAt: new Date().toISOString(),
        templateInfo: {
          owner: validationResult.metadata?.owner,
          repo: validationResult.metadata?.repo,
          type: validationResult.metadata?.templateType,
          complexity: validationResult.metadata?.estimatedComplexity
        }
      }
    };

    // Add interactive elements if requested
    if (options.interactive) {
      feedback.interactive = this.generateInteractiveElements(validationResult);
    }

    return feedback;
  }

  /**
   * Generate feedback summary
   * @param {object} validationResult - Validation result
   * @returns {object} Feedback summary
   */
  generateSummary(validationResult) {
    const { valid, score, maxScore, errors, warnings, suggestions } = validationResult;
    
    let status, template;
    
    if (valid && score >= 90) {
      status = 'excellent';
      template = this.feedbackTemplates.success;
    } else if (valid && score >= 70) {
      status = 'good';
      template = this.feedbackTemplates.warnings;
    } else if (errors.length > 0) {
      status = 'needs-work';
      template = this.feedbackTemplates.errors;
    } else {
      status = 'improvements-needed';
      template = this.feedbackTemplates.improvements;
    }

    return {
      status,
      title: template.title,
      message: template.message,
      tone: template.tone,
      score: {
        current: score,
        maximum: maxScore,
        percentage: Math.round((score / maxScore) * 100),
        grade: this.calculateGrade(score, maxScore)
      },
      issueCount: {
        errors: errors.length,
        warnings: warnings.length,
        suggestions: suggestions.length,
        total: errors.length + warnings.length + suggestions.length
      }
    };
  }

  /**
   * Generate overview section
   * @param {object} validationResult - Validation result
   * @returns {object} Overview section
   */
  generateOverview(validationResult) {
    const { metadata, details } = validationResult;
    
    return {
      templateInfo: {
        name: `${metadata.owner}/${metadata.repo}`,
        type: metadata.templateType || 'Unknown',
        complexity: metadata.estimatedComplexity || 'Unknown',
        validatedAt: metadata.validatedAt
      },
      sectionScores: {
        structure: {
          score: details.structure.score,
          maxScore: details.structure.maxScore,
          status: details.structure.valid ? 'pass' : 'fail'
        },
        configuration: {
          score: details.config.score,
          maxScore: details.config.maxScore,
          status: details.config.valid ? 'pass' : 'fail'
        },
        content: {
          score: details.content.score,
          maxScore: details.content.maxScore,
          status: details.content.valid ? 'pass' : 'fail'
        },
        compatibility: {
          score: details.compatibility.score,
          maxScore: details.compatibility.maxScore,
          status: details.compatibility.valid ? 'pass' : 'fail'
        }
      },
      strengths: this.identifyStrengths(validationResult),
      weaknesses: this.identifyWeaknesses(validationResult)
    };
  }

  /**
   * Generate issues section with categorized problems
   * @param {object} validationResult - Validation result
   * @returns {object} Issues section
   */
  generateIssuesSection(validationResult) {
    const { errors, warnings, suggestions } = validationResult;
    
    return {
      critical: {
        title: 'Critical Issues (Must Fix)',
        description: 'These issues prevent your template from working properly.',
        count: errors.length,
        items: errors.map(error => this.formatIssue(error, 'critical'))
      },
      warnings: {
        title: 'Warnings (Should Fix)',
        description: 'These issues may cause problems or reduce template quality.',
        count: warnings.length,
        items: warnings.map(warning => this.formatIssue(warning, 'warning'))
      },
      suggestions: {
        title: 'Suggestions (Nice to Have)',
        description: 'These improvements can enhance your template.',
        count: suggestions.length,
        items: suggestions.map(suggestion => this.formatIssue(suggestion, 'suggestion'))
      }
    };
  }

  /**
   * Format individual issue with actionable guidance
   * @param {object} issue - Issue object
   * @param {string} severity - Issue severity level
   * @returns {object} Formatted issue
   */
  formatIssue(issue, severity) {
    const formatted = {
      message: issue.message,
      suggestion: issue.suggestion,
      severity,
      category: this.categorizeIssue(issue.message),
      actionable: true
    };

    // Add specific action guide if available
    const actionGuideKey = this.findActionGuide(issue.message);
    if (actionGuideKey) {
      formatted.actionGuide = this.actionGuides[actionGuideKey];
    }

    // Add code examples if relevant
    if (issue.message.includes('config') || issue.message.includes('schema')) {
      formatted.codeExample = this.generateCodeExample(issue);
    }

    return formatted;
  }

  /**
   * Categorize issue by type
   * @param {string} message - Issue message
   * @returns {string} Issue category
   */
  categorizeIssue(message) {
    const categories = {
      'structure': ['missing', 'directory', 'file', 'required'],
      'configuration': ['config', 'schema', 'json', 'field'],
      'content': ['content', 'data', 'markdown', 'empty'],
      'naming': ['name', 'naming', 'convention'],
      'compatibility': ['component', 'react', 'preview'],
      'documentation': ['readme', 'documentation', 'description']
    };

    const lowerMessage = message.toLowerCase();
    
    for (const [category, keywords] of Object.entries(categories)) {
      if (keywords.some(keyword => lowerMessage.includes(keyword))) {
        return category;
      }
    }
    
    return 'general';
  }

  /**
   * Find appropriate action guide for issue
   * @param {string} message - Issue message
   * @returns {string|null} Action guide key
   */
  findActionGuide(message) {
    const lowerMessage = message.toLowerCase();
    
    if (lowerMessage.includes('config.json')) {
      return 'missing-config';
    }
    if (lowerMessage.includes('preview')) {
      return 'missing-preview';
    }
    if (lowerMessage.includes('schema')) {
      return 'invalid-schema';
    }
    if (lowerMessage.includes('content file')) {
      return 'missing-content';
    }
    
    return null;
  }

  /**
   * Generate code example for issue
   * @param {object} issue - Issue object
   * @returns {object} Code example
   */
  generateCodeExample(issue) {
    const message = issue.message.toLowerCase();
    
    if (message.includes('config')) {
      return {
        language: 'json',
        title: 'Example .nebula/config.json',
        code: `{
  "version": "1.0",
  "name": "My Portfolio Template",
  "description": "A beautiful portfolio template",
  "templateType": "json",
  "contentFiles": [
    {
      "path": "data.json",
      "type": "json",
      "schema": {
        "title": {
          "type": "string",
          "label": "Portfolio Title",
          "required": true
        },
        "description": {
          "type": "text",
          "label": "Description",
          "maxLength": 500
        }
      }
    }
  ],
  "assets": {
    "allowedTypes": ["image/jpeg", "image/png", "image/webp"],
    "maxSize": "5MB",
    "paths": ["public/images"]
  }
}`
      };
    }
    
    if (message.includes('schema')) {
      return {
        language: 'json',
        title: 'Example Schema Definition',
        code: `{
  "personalInfo": {
    "type": "object",
    "label": "Personal Information",
    "properties": {
      "name": {
        "type": "string",
        "label": "Full Name",
        "required": true
      },
      "email": {
        "type": "email",
        "label": "Email Address"
      }
    }
  },
  "projects": {
    "type": "array",
    "label": "Projects",
    "items": {
      "type": "object",
      "properties": {
        "title": {
          "type": "string",
          "label": "Project Title",
          "required": true
        },
        "description": {
          "type": "text",
          "label": "Description"
        }
      }
    }
  }
}`
      };
    }
    
    return null;
  }

  /**
   * Generate recommendations section
   * @param {object} validationResult - Validation result
   * @returns {object} Recommendations section
   */
  generateRecommendations(validationResult) {
    const recommendations = validationResult.recommendations || [];
    
    return {
      priority: {
        high: recommendations.filter(r => r.priority === 'high'),
        medium: recommendations.filter(r => r.priority === 'medium'),
        low: recommendations.filter(r => r.priority === 'low')
      },
      categories: this.groupRecommendationsByCategory(recommendations),
      quickWins: this.identifyQuickWins(validationResult),
      longTerm: this.identifyLongTermImprovements(validationResult)
    };
  }

  /**
   * Group recommendations by category
   * @param {Array} recommendations - Recommendations array
   * @returns {object} Grouped recommendations
   */
  groupRecommendationsByCategory(recommendations) {
    const grouped = {};
    
    for (const rec of recommendations) {
      if (!grouped[rec.category]) {
        grouped[rec.category] = [];
      }
      grouped[rec.category].push(rec);
    }
    
    return grouped;
  }

  /**
   * Identify quick wins for template improvement
   * @param {object} validationResult - Validation result
   * @returns {Array} Quick win recommendations
   */
  identifyQuickWins(validationResult) {
    const quickWins = [];
    
    // Missing preview image
    if (validationResult.warnings.some(w => w.message.includes('preview'))) {
      quickWins.push({
        title: 'Add Preview Image',
        effort: 'low',
        impact: 'medium',
        timeEstimate: '15 minutes',
        description: 'Take a screenshot of your template and save it as .nebula/preview.png'
      });
    }
    
    // Missing README
    if (validationResult.warnings.some(w => w.message.includes('README'))) {
      quickWins.push({
        title: 'Create README',
        effort: 'low',
        impact: 'high',
        timeEstimate: '30 minutes',
        description: 'Document your template with usage instructions and examples'
      });
    }
    
    // Missing description
    if (validationResult.suggestions.some(s => s.message.includes('description'))) {
      quickWins.push({
        title: 'Add Template Description',
        effort: 'low',
        impact: 'low',
        timeEstimate: '5 minutes',
        description: 'Add a description field to your config.json'
      });
    }
    
    return quickWins;
  }

  /**
   * Identify long-term improvements
   * @param {object} validationResult - Validation result
   * @returns {Array} Long-term improvement recommendations
   */
  identifyLongTermImprovements(validationResult) {
    const improvements = [];
    
    if (validationResult.metadata.estimatedComplexity === 'simple') {
      improvements.push({
        title: 'Add More Content Types',
        effort: 'high',
        impact: 'high',
        timeEstimate: '2-4 hours',
        description: 'Expand your template with additional content types like projects, blog posts, or testimonials'
      });
    }
    
    if (validationResult.score < 80) {
      improvements.push({
        title: 'Comprehensive Schema Review',
        effort: 'medium',
        impact: 'high',
        timeEstimate: '1-2 hours',
        description: 'Review and improve all schema definitions for better user experience'
      });
    }
    
    return improvements;
  }

  /**
   * Generate next steps section
   * @param {object} validationResult - Validation result
   * @returns {object} Next steps section
   */
  generateNextSteps(validationResult) {
    const steps = [];
    
    // Prioritize critical errors first
    if (validationResult.errors.length > 0) {
      steps.push({
        priority: 1,
        title: 'Fix Critical Issues',
        description: `Address ${validationResult.errors.length} critical error${validationResult.errors.length > 1 ? 's' : ''}`,
        estimatedTime: `${validationResult.errors.length * 15} minutes`,
        actions: validationResult.errors.slice(0, 3).map(e => e.suggestion)
      });
    }
    
    // Then warnings
    if (validationResult.warnings.length > 0) {
      steps.push({
        priority: 2,
        title: 'Address Warnings',
        description: `Fix ${validationResult.warnings.length} warning${validationResult.warnings.length > 1 ? 's' : ''}`,
        estimatedTime: `${validationResult.warnings.length * 10} minutes`,
        actions: validationResult.warnings.slice(0, 3).map(w => w.suggestion)
      });
    }
    
    // Finally suggestions
    if (validationResult.suggestions.length > 0) {
      steps.push({
        priority: 3,
        title: 'Implement Improvements',
        description: `Consider ${validationResult.suggestions.length} suggestion${validationResult.suggestions.length > 1 ? 's' : ''}`,
        estimatedTime: `${validationResult.suggestions.length * 5} minutes`,
        actions: validationResult.suggestions.slice(0, 3).map(s => s.suggestion)
      });
    }
    
    // Add testing step
    steps.push({
      priority: 4,
      title: 'Test Your Template',
      description: 'Validate your changes and test the template',
      estimatedTime: '10 minutes',
      actions: [
        'Re-run template validation',
        'Test content editing functionality',
        'Preview template rendering'
      ]
    });
    
    return {
      steps,
      totalEstimatedTime: this.calculateTotalTime(steps),
      completionOrder: steps.sort((a, b) => a.priority - b.priority)
    };
  }

  /**
   * Generate resources section
   * @param {object} validationResult - Validation result
   * @returns {object} Resources section
   */
  generateResources(validationResult) {
    return {
      documentation: [
        {
          title: 'Template Configuration Guide',
          url: '/docs/template-configuration',
          description: 'Complete guide to configuring your template'
        },
        {
          title: 'Schema Definition Reference',
          url: '/docs/schema-reference',
          description: 'Reference for all supported field types and validation rules'
        },
        {
          title: 'Template Examples',
          url: '/docs/template-examples',
          description: 'Example templates for different use cases'
        }
      ],
      tools: [
        {
          title: 'Template Validator',
          url: '/tools/validator',
          description: 'Online tool to validate your template configuration'
        },
        {
          title: 'Schema Builder',
          url: '/tools/schema-builder',
          description: 'Visual tool to build template schemas'
        }
      ],
      community: [
        {
          title: 'Template Creators Discord',
          url: '/community/discord',
          description: 'Join other template creators for help and discussion'
        },
        {
          title: 'Template Gallery',
          url: '/templates',
          description: 'Browse existing templates for inspiration'
        }
      ]
    };
  }

  /**
   * Generate interactive elements for feedback
   * @param {object} validationResult - Validation result
   * @returns {object} Interactive elements
   */
  generateInteractiveElements(validationResult) {
    return {
      checklist: this.generateActionChecklist(validationResult),
      progressTracker: this.generateProgressTracker(validationResult),
      codeSnippets: this.generateCodeSnippets(validationResult)
    };
  }

  /**
   * Generate actionable checklist
   * @param {object} validationResult - Validation result
   * @returns {Array} Checklist items
   */
  generateActionChecklist(validationResult) {
    const checklist = [];
    
    // Add items for each error
    for (const error of validationResult.errors) {
      checklist.push({
        id: `error-${checklist.length}`,
        type: 'error',
        title: error.message,
        description: error.suggestion,
        completed: false,
        priority: 'high'
      });
    }
    
    // Add items for warnings
    for (const warning of validationResult.warnings) {
      checklist.push({
        id: `warning-${checklist.length}`,
        type: 'warning',
        title: warning.message,
        description: warning.suggestion,
        completed: false,
        priority: 'medium'
      });
    }
    
    return checklist;
  }

  /**
   * Generate progress tracker
   * @param {object} validationResult - Validation result
   * @returns {object} Progress tracker
   */
  generateProgressTracker(validationResult) {
    const totalIssues = validationResult.errors.length + validationResult.warnings.length;
    
    return {
      totalIssues,
      resolvedIssues: 0,
      progress: 0,
      milestones: [
        {
          name: 'Fix Critical Errors',
          target: validationResult.errors.length,
          current: 0,
          description: 'Resolve all critical issues'
        },
        {
          name: 'Address Warnings',
          target: validationResult.warnings.length,
          current: 0,
          description: 'Fix warning-level issues'
        },
        {
          name: 'Template Ready',
          target: 1,
          current: 0,
          description: 'Template passes validation'
        }
      ]
    };
  }

  /**
   * Generate relevant code snippets
   * @param {object} validationResult - Validation result
   * @returns {Array} Code snippets
   */
  generateCodeSnippets(validationResult) {
    const snippets = [];
    
    // Add config template if config issues exist
    if (validationResult.errors.some(e => e.message.includes('config'))) {
      snippets.push({
        title: 'Basic Template Configuration',
        language: 'json',
        filename: '.nebula/config.json',
        code: JSON.stringify(this.getBasicConfigTemplate(), null, 2)
      });
    }
    
    return snippets;
  }

  /**
   * Get basic configuration template
   * @returns {object} Basic config template
   */
  getBasicConfigTemplate() {
    return {
      version: '1.0',
      name: 'My Portfolio Template',
      description: 'A custom portfolio template',
      templateType: 'json',
      contentFiles: [
        {
          path: 'data.json',
          type: 'json',
          schema: {
            title: {
              type: 'string',
              label: 'Portfolio Title',
              required: true
            },
            description: {
              type: 'text',
              label: 'Description',
              maxLength: 500
            }
          }
        }
      ],
      assets: {
        allowedTypes: ['image/jpeg', 'image/png', 'image/webp'],
        maxSize: '5MB',
        paths: ['public/images']
      }
    };
  }

  /**
   * Identify template strengths
   * @param {object} validationResult - Validation result
   * @returns {Array} Template strengths
   */
  identifyStrengths(validationResult) {
    const strengths = [];
    
    if (validationResult.details.structure.valid) {
      strengths.push('Well-organized file structure');
    }
    
    if (validationResult.details.config.valid) {
      strengths.push('Valid configuration');
    }
    
    if (validationResult.score >= 80) {
      strengths.push('High quality template');
    }
    
    if (validationResult.warnings.length === 0) {
      strengths.push('No warning-level issues');
    }
    
    return strengths;
  }

  /**
   * Identify template weaknesses
   * @param {object} validationResult - Validation result
   * @returns {Array} Template weaknesses
   */
  identifyWeaknesses(validationResult) {
    const weaknesses = [];
    
    if (validationResult.errors.length > 0) {
      weaknesses.push(`${validationResult.errors.length} critical error${validationResult.errors.length > 1 ? 's' : ''}`);
    }
    
    if (validationResult.warnings.length > 3) {
      weaknesses.push('Multiple warning-level issues');
    }
    
    if (validationResult.score < 50) {
      weaknesses.push('Low overall quality score');
    }
    
    if (!validationResult.details.content.valid) {
      weaknesses.push('Content validation issues');
    }
    
    return weaknesses;
  }

  /**
   * Calculate total estimated time for all steps
   * @param {Array} steps - Array of steps
   * @returns {string} Total time estimate
   */
  calculateTotalTime(steps) {
    let totalMinutes = 0;
    
    for (const step of steps) {
      const timeMatch = step.estimatedTime.match(/(\d+)/);
      if (timeMatch) {
        totalMinutes += parseInt(timeMatch[1]);
      }
    }
    
    if (totalMinutes < 60) {
      return `${totalMinutes} minutes`;
    } else {
      const hours = Math.floor(totalMinutes / 60);
      const minutes = totalMinutes % 60;
      return minutes > 0 ? `${hours}h ${minutes}m` : `${hours}h`;
    }
  }

  /**
   * Calculate letter grade from score
   * @param {number} score - Current score
   * @param {number} maxScore - Maximum possible score
   * @returns {string} Letter grade
   */
  calculateGrade(score, maxScore) {
    const percentage = (score / maxScore) * 100;
    
    if (percentage >= 90) return 'A';
    if (percentage >= 80) return 'B';
    if (percentage >= 70) return 'C';
    if (percentage >= 60) return 'D';
    return 'F';
  }
}

export default TemplateFeedbackSystem;