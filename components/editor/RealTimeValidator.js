/**
 * Real-Time Validator
 * Enhanced validation system with inline feedback and live updates
 * Implements task 8.3: Real-Time Validation + Preview
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useContentValidation } from './ContentValidator.js';
import { STANDARD_PORTFOLIO_SCHEMA } from '../../lib/portfolio-data-standardizer.js';

/**
 * Real-Time Validation Hook
 * Provides real-time validation with inline feedback
 */
export function useRealTimeValidation(portfolioData, options = {}) {
  const [validationState, setValidationState] = useState({
    isValid: true,
    errors: {},
    warnings: {},
    suggestions: {},
    completeness: 0,
    lastValidated: null
  });

  const [isValidating, setIsValidating] = useState(false);
  const [validationHistory, setValidationHistory] = useState([]);

  const validationOptions = {
    strictMode: false,
    validateOnChange: true,
    debounceMs: 300,
    showSuggestions: true,
    trackHistory: true,
    ...options
  };

  const {
    validateField,
    validateAll,
    clearValidation,
    getFieldValidation,
    validationResults,
    validator
  } = useContentValidation(STANDARD_PORTFOLIO_SCHEMA, validationOptions);

  /**
   * Validate entire portfolio with enhanced feedback
   */
  const performFullValidation = useCallback(async (data = portfolioData) => {
    if (!data) return;

    setIsValidating(true);

    try {
      const result = await validateAll(data);
      
      const enhancedState = {
        isValid: result.isValid,
        errors: result.fieldErrors || {},
        warnings: result.warnings || {},
        suggestions: generateSuggestions(data, result),
        completeness: result.summary?.completeness || 0,
        lastValidated: new Date().toISOString(),
        summary: result.summary
      };

      setValidationState(enhancedState);

      // Track validation history
      if (validationOptions.trackHistory) {
        setValidationHistory(prev => [
          {
            timestamp: new Date().toISOString(),
            isValid: result.isValid,
            errorCount: result.summary?.errorFields || 0,
            warningCount: result.summary?.warningFields || 0,
            completeness: result.summary?.completeness || 0
          },
          ...prev.slice(0, 9) // Keep last 10 validations
        ]);
      }

      return enhancedState;

    } catch (error) {
      console.error('Validation failed:', error);
      const errorState = {
        isValid: false,
        errors: { _general: error.message },
        warnings: {},
        suggestions: {},
        completeness: 0,
        lastValidated: new Date().toISOString()
      };
      
      setValidationState(errorState);
      return errorState;
    } finally {
      setIsValidating(false);
    }
  }, [portfolioData, validateAll, validationOptions.trackHistory, generateSuggestions]);

  /**
   * Validate specific field with enhanced feedback
   */
  const validateFieldWithFeedback = useCallback(async (fieldPath, value, context = portfolioData) => {
    try {
      const result = await validateField(fieldPath, value, context);
      
      // Update validation state for this field
      setValidationState(prev => ({
        ...prev,
        errors: {
          ...prev.errors,
          [fieldPath]: result.errors.length > 0 ? result.errors[0] : undefined
        },
        warnings: {
          ...prev.warnings,
          [fieldPath]: result.warnings
        },
        suggestions: {
          ...prev.suggestions,
          [fieldPath]: result.suggestions
        },
        lastValidated: new Date().toISOString()
      }));

      return result;
    } catch (error) {
      console.error('Field validation failed:', error);
      return {
        isValid: false,
        errors: [error.message],
        warnings: [],
        suggestions: []
      };
    }
  }, [validateField, portfolioData]);

  /**
   * Generate contextual suggestions
   */
  const generateSuggestions = useCallback((data, validationResult) => {
    const suggestions = {};

    // Portfolio completeness suggestions
    if (validationResult.summary?.completeness < 70) {
      suggestions._portfolio = [
        'Consider adding more details to improve your portfolio completeness',
        'Complete required fields to make your portfolio more professional'
      ];
    }

    // Section-specific suggestions
    if (!data.personal?.name || data.personal?.name.length < 2) {
      suggestions['personal.name'] = ['Add your full name to personalize your portfolio'];
    }

    if (!data.personal?.title || data.personal?.title.length < 5) {
      suggestions['personal.title'] = ['Add a professional title or role description'];
    }

    if (!data.contact?.email) {
      suggestions['contact.email'] = ['Add your email address for potential employers to contact you'];
    }

    if (!data.projects || data.projects.length === 0) {
      suggestions.projects = ['Add some projects to showcase your work and skills'];
    }

    if (!data.skills || data.skills.length === 0) {
      suggestions.skills = ['List your technical skills and expertise'];
    }

    // Experience suggestions
    if (data.experience && data.experience.length > 0) {
      data.experience.forEach((exp, index) => {
        if (!exp.description || exp.description.length < 50) {
          suggestions[`experience[${index}].description`] = [
            'Add more details about your responsibilities and achievements'
          ];
        }
      });
    }

    return suggestions;
  }, []);

  /**
   * Get validation status for a specific field
   */
  const getFieldStatus = useCallback((fieldPath) => {
    const error = validationState.errors[fieldPath];
    const warnings = validationState.warnings[fieldPath] || [];
    const suggestions = validationState.suggestions[fieldPath] || [];

    return {
      hasError: Boolean(error),
      hasWarnings: warnings.length > 0,
      hasSuggestions: suggestions.length > 0,
      error,
      warnings,
      suggestions,
      isValid: !error
    };
  }, [validationState]);

  /**
   * Get overall validation summary
   */
  const getValidationSummary = useCallback(() => {
    const errorCount = Object.keys(validationState.errors).filter(
      key => validationState.errors[key]
    ).length;
    
    const warningCount = Object.values(validationState.warnings).reduce(
      (count, warnings) => count + (warnings?.length || 0), 0
    );

    const suggestionCount = Object.values(validationState.suggestions).reduce(
      (count, suggestions) => count + (suggestions?.length || 0), 0
    );

    return {
      isValid: validationState.isValid,
      errorCount,
      warningCount,
      suggestionCount,
      completeness: validationState.completeness,
      lastValidated: validationState.lastValidated,
      isValidating
    };
  }, [validationState, isValidating]);

  // Auto-validate when portfolio data changes
  useEffect(() => {
    if (portfolioData && validationOptions.validateOnChange) {
      const timeoutId = setTimeout(() => {
        performFullValidation(portfolioData);
      }, validationOptions.debounceMs);

      return () => clearTimeout(timeoutId);
    }
  }, [portfolioData, performFullValidation, validationOptions.validateOnChange, validationOptions.debounceMs]);

  return {
    // State
    validationState,
    isValidating,
    validationHistory,

    // Methods
    performFullValidation,
    validateFieldWithFeedback,
    getFieldStatus,
    getValidationSummary,
    clearValidation,

    // Computed values
    isValid: validationState.isValid,
    hasErrors: Object.keys(validationState.errors).some(key => validationState.errors[key]),
    hasWarnings: Object.values(validationState.warnings).some(warnings => warnings?.length > 0),
    completeness: validationState.completeness
  };
}

/**
 * Inline Validation Feedback Component
 */
export const InlineValidationFeedback = ({ 
  fieldPath, 
  validationStatus, 
  showSuggestions = true,
  className = '' 
}) => {
  if (!validationStatus || (!validationStatus.hasError && !validationStatus.hasWarnings && !validationStatus.hasSuggestions)) {
    return null;
  }

  return (
    <div className={`inline-validation-feedback mt-1 space-y-1 ${className}`}>
      {/* Error Message */}
      {validationStatus.hasError && (
        <div className="flex items-start gap-2 text-red-500 text-sm">
          <span className="text-red-500 mt-0.5">❌</span>
          <span>{validationStatus.error}</span>
        </div>
      )}

      {/* Warning Messages */}
      {validationStatus.hasWarnings && validationStatus.warnings.map((warning, index) => (
        <div key={index} className="flex items-start gap-2 text-amber-500 text-sm">
          <span className="text-amber-500 mt-0.5">⚠️</span>
          <span>{warning}</span>
        </div>
      ))}

      {/* Suggestion Messages */}
      {showSuggestions && validationStatus.hasSuggestions && validationStatus.suggestions.map((suggestion, index) => (
        <div key={index} className="flex items-start gap-2 text-blue-400 text-sm">
          <span className="text-blue-400 mt-0.5">💡</span>
          <span>{suggestion}</span>
        </div>
      ))}
    </div>
  );
};

/**
 * Validation Summary Component
 */
export const ValidationSummary = ({ 
  validationSummary, 
  onViewDetails,
  className = '' 
}) => {
  const getStatusColor = () => {
    if (validationSummary.errorCount > 0) return 'text-red-500';
    if (validationSummary.warningCount > 0) return 'text-amber-500';
    return 'text-green-500';
  };

  const getStatusIcon = () => {
    if (validationSummary.isValidating) return '🔄';
    if (validationSummary.errorCount > 0) return '❌';
    if (validationSummary.warningCount > 0) return '⚠️';
    return '✅';
  };

  return (
    <div className={`validation-summary ${className}`}>
      <div className="flex items-center justify-between p-3 bg-glass-1 rounded-lg border border-border-1">
        <div className="flex items-center gap-3">
          <span className="text-lg">{getStatusIcon()}</span>
          <div>
            <div className={`font-medium ${getStatusColor()}`}>
              {validationSummary.isValid ? 'Portfolio Valid' : 'Issues Found'}
            </div>
            <div className="text-sm text-text-2">
              {validationSummary.completeness}% complete
              {validationSummary.lastValidated && (
                <span className="ml-2">
                  • Last checked {new Date(validationSummary.lastValidated).toLocaleTimeString()}
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-4">
          {/* Error Count */}
          {validationSummary.errorCount > 0 && (
            <div className="flex items-center gap-1 text-red-500 text-sm">
              <span>❌</span>
              <span>{validationSummary.errorCount}</span>
            </div>
          )}

          {/* Warning Count */}
          {validationSummary.warningCount > 0 && (
            <div className="flex items-center gap-1 text-amber-500 text-sm">
              <span>⚠️</span>
              <span>{validationSummary.warningCount}</span>
            </div>
          )}

          {/* Suggestion Count */}
          {validationSummary.suggestionCount > 0 && (
            <div className="flex items-center gap-1 text-blue-400 text-sm">
              <span>💡</span>
              <span>{validationSummary.suggestionCount}</span>
            </div>
          )}

          {/* Completeness Bar */}
          <div className="w-20 h-2 bg-surface-2 rounded-full overflow-hidden">
            <div 
              className="h-full bg-gradient-to-r from-red-500 via-amber-500 to-green-500 transition-all duration-300"
              style={{ width: `${validationSummary.completeness}%` }}
            />
          </div>

          {onViewDetails && (
            <button
              onClick={onViewDetails}
              className="text-text-2 hover:text-text-1 text-sm underline"
            >
              View Details
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default useRealTimeValidation;