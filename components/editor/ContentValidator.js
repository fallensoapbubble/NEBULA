/**
 * Content Validator
 * Real-time validation system for portfolio content editing
 */

import { STANDARD_PORTFOLIO_SCHEMA } from '../../lib/portfolio-data-standardizer.js';

/**
 * Content Validator class for real-time validation
 */
export class ContentValidator {
  constructor(schema = STANDARD_PORTFOLIO_SCHEMA, options = {}) {
    this.schema = schema;
    this.options = {
      strictMode: options.strictMode || false,
      allowUnknownFields: options.allowUnknownFields !== false,
      validateOnChange: options.validateOnChange !== false,
      debounceMs: options.debounceMs || 300,
      ...options
    };
    
    this.validationCache = new Map();
    this.debounceTimers = new Map();
  }

  /**
   * Validate entire portfolio data
   * @param {Object} data - Portfolio data to validate
   * @returns {Promise<ValidationResult>}
   */
  async validatePortfolioData(data) {
    const result = {
      isValid: true,
      errors: {},
      warnings: {},
      fieldErrors: {},
      summary: {
        totalFields: 0,
        validFields: 0,
        errorFields: 0,
        warningFields: 0,
        completeness: 0
      }
    };

    try {
      // Validate each section
      await this.validateSection('personal', data.personal || {}, result);
      await this.validateSection('contact', data.contact || {}, result);
      await this.validateSection('experience', data.experience || [], result);
      await this.validateSection('projects', data.projects || [], result);
      await this.validateSection('skills', data.skills || [], result);
      await this.validateSection('education', data.education || [], result);
      await this.validateSection('certifications', data.certifications || [], result);

      // Calculate summary
      this.calculateValidationSummary(result);

      return result;
    } catch (error) {
      return {
        isValid: false,
        errors: { _general: `Validation failed: ${error.message}` },
        warnings: {},
        fieldErrors: {},
        summary: { totalFields: 0, validFields: 0, errorFields: 1, warningFields: 0, completeness: 0 }
      };
    }
  }

  /**
   * Validate a specific field with debouncing
   * @param {string} fieldPath - Dot notation path to field
   * @param {any} value - Field value
   * @param {Object} context - Full data context for cross-field validation
   * @returns {Promise<FieldValidationResult>}
   */
  async validateField(fieldPath, value, context = {}) {
    return new Promise((resolve) => {
      // Clear existing timer for this field
      if (this.debounceTimers.has(fieldPath)) {
        clearTimeout(this.debounceTimers.get(fieldPath));
      }

      // Set new debounced validation
      const timer = setTimeout(async () => {
        try {
          const result = await this.performFieldValidation(fieldPath, value, context);
          this.validationCache.set(fieldPath, result);
          resolve(result);
        } catch (error) {
          const errorResult = {
            isValid: false,
            errors: [`Validation error: ${error.message}`],
            warnings: [],
            suggestions: []
          };
          resolve(errorResult);
        }
      }, this.options.debounceMs);

      this.debounceTimers.set(fieldPath, timer);
    });
  }

  /**
   * Get cached validation result for a field
   * @param {string} fieldPath - Field path
   * @returns {FieldValidationResult|null}
   */
  getCachedValidation(fieldPath) {
    return this.validationCache.get(fieldPath) || null;
  }

  /**
   * Clear validation cache
   * @param {string} [fieldPath] - Specific field to clear, or all if not provided
   */
  clearCache(fieldPath = null) {
    if (fieldPath) {
      this.validationCache.delete(fieldPath);
      if (this.debounceTimers.has(fieldPath)) {
        clearTimeout(this.debounceTimers.get(fieldPath));
        this.debounceTimers.delete(fieldPath);
      }
    } else {
      this.validationCache.clear();
      this.debounceTimers.forEach(timer => clearTimeout(timer));
      this.debounceTimers.clear();
    }
  }

  /**
   * Validate a section of the portfolio data
   * @private
   */
  async validateSection(sectionName, sectionData, result) {
    const sectionSchema = this.schema[sectionName];
    if (!sectionSchema) return;

    const sectionPath = sectionName;
    
    // Handle array sections (experience, projects, skills, etc.)
    if (sectionSchema.type === 'array') {
      if (!Array.isArray(sectionData)) {
        result.errors[sectionPath] = `${sectionName} must be an array`;
        result.isValid = false;
        return;
      }

      // Validate each item in the array
      for (let i = 0; i < sectionData.length; i++) {
        const itemPath = `${sectionPath}[${i}]`;
        await this.validateArrayItem(itemPath, sectionData[i], sectionSchema.items, result);
      }
    } else {
      // Handle object sections (personal, contact)
      await this.validateObject(sectionPath, sectionData, sectionSchema, result);
    }
  }

  /**
   * Validate an array item
   * @private
   */
  async validateArrayItem(itemPath, itemData, itemSchema, result) {
    if (!itemData || typeof itemData !== 'object') {
      result.errors[itemPath] = 'Invalid item data';
      result.isValid = false;
      return;
    }

    // Validate required fields
    Object.entries(itemSchema).forEach(([fieldName, fieldDef]) => {
      const fieldPath = `${itemPath}.${fieldName}`;
      const fieldValue = itemData[fieldName];

      this.validateFieldDefinition(fieldPath, fieldValue, fieldDef, result);
    });
  }

  /**
   * Validate an object
   * @private
   */
  async validateObject(objectPath, objectData, objectSchema, result) {
    if (!objectData || typeof objectData !== 'object') {
      if (this.options.strictMode) {
        result.errors[objectPath] = 'Invalid object data';
        result.isValid = false;
      }
      return;
    }

    // Validate each field in the object
    Object.entries(objectSchema).forEach(([fieldName, fieldDef]) => {
      const fieldPath = `${objectPath}.${fieldName}`;
      const fieldValue = objectData[fieldName];

      this.validateFieldDefinition(fieldPath, fieldValue, fieldDef, result);
    });
  }

  /**
   * Validate a field against its definition
   * @private
   */
  validateFieldDefinition(fieldPath, fieldValue, fieldDef, result) {
    result.summary.totalFields++;

    // Check required fields
    if (fieldDef.required && (fieldValue === undefined || fieldValue === null || fieldValue === '')) {
      result.fieldErrors[fieldPath] = 'This field is required';
      result.errors[fieldPath] = 'Required field is missing';
      result.isValid = false;
      result.summary.errorFields++;
      return;
    }

    // Skip validation for empty optional fields
    if (!fieldDef.required && (fieldValue === undefined || fieldValue === null || fieldValue === '')) {
      result.summary.validFields++;
      return;
    }

    // Type validation
    const typeValidation = this.validateFieldType(fieldValue, fieldDef.type);
    if (!typeValidation.isValid) {
      result.fieldErrors[fieldPath] = typeValidation.error;
      result.errors[fieldPath] = typeValidation.error;
      result.isValid = false;
      result.summary.errorFields++;
      return;
    }

    // Format validation
    const formatValidation = this.validateFieldFormat(fieldPath, fieldValue, fieldDef);
    if (!formatValidation.isValid) {
      result.fieldErrors[fieldPath] = formatValidation.error;
      result.errors[fieldPath] = formatValidation.error;
      result.isValid = false;
      result.summary.errorFields++;
      return;
    }

    // Add warnings for improvements
    const warnings = this.generateFieldWarnings(fieldPath, fieldValue, fieldDef);
    if (warnings.length > 0) {
      result.warnings[fieldPath] = warnings;
      result.summary.warningFields++;
    }

    result.summary.validFields++;
  }

  /**
   * Perform actual field validation
   * @private
   */
  async performFieldValidation(fieldPath, value, context) {
    const result = {
      isValid: true,
      errors: [],
      warnings: [],
      suggestions: []
    };

    // Get field definition from schema
    const fieldDef = this.getFieldDefinition(fieldPath);
    if (!fieldDef) {
      if (!this.options.allowUnknownFields) {
        result.isValid = false;
        result.errors.push('Unknown field');
      }
      return result;
    }

    // Required field validation
    if (fieldDef.required && (value === undefined || value === null || value === '')) {
      result.isValid = false;
      result.errors.push('This field is required');
      return result;
    }

    // Skip further validation for empty optional fields
    if (!fieldDef.required && (value === undefined || value === null || value === '')) {
      return result;
    }

    // Type validation
    const typeValidation = this.validateFieldType(value, fieldDef.type);
    if (!typeValidation.isValid) {
      result.isValid = false;
      result.errors.push(typeValidation.error);
      return result;
    }

    // Format validation
    const formatValidation = this.validateFieldFormat(fieldPath, value, fieldDef);
    if (!formatValidation.isValid) {
      result.isValid = false;
      result.errors.push(formatValidation.error);
      return result;
    }

    // Generate suggestions
    result.suggestions = this.generateFieldSuggestions(fieldPath, value, fieldDef, context);

    // Generate warnings
    result.warnings = this.generateFieldWarnings(fieldPath, value, fieldDef);

    return result;
  }

  /**
   * Validate field type
   * @private
   */
  validateFieldType(value, expectedType) {
    switch (expectedType) {
      case 'string':
        if (typeof value !== 'string') {
          return { isValid: false, error: 'Must be a text value' };
        }
        break;
      
      case 'number':
        if (typeof value !== 'number' || isNaN(value)) {
          return { isValid: false, error: 'Must be a valid number' };
        }
        break;
      
      case 'boolean':
        if (typeof value !== 'boolean') {
          return { isValid: false, error: 'Must be true or false' };
        }
        break;
      
      case 'array':
        if (!Array.isArray(value)) {
          return { isValid: false, error: 'Must be a list of items' };
        }
        break;
      
      case 'object':
        if (typeof value !== 'object' || Array.isArray(value) || value === null) {
          return { isValid: false, error: 'Must be an object' };
        }
        break;
    }

    return { isValid: true };
  }

  /**
   * Validate field format
   * @private
   */
  validateFieldFormat(fieldPath, value, fieldDef) {
    const fieldName = fieldPath.split('.').pop();

    // Email validation
    if (fieldName.includes('email') || fieldDef.format === 'email') {
      if (!this.isValidEmail(value)) {
        return { isValid: false, error: 'Please enter a valid email address' };
      }
    }

    // URL validation
    if (fieldName.includes('url') || fieldName.includes('website') || fieldDef.format === 'url') {
      if (!this.isValidUrl(value)) {
        return { isValid: false, error: 'Please enter a valid URL' };
      }
    }

    // Date validation
    if (fieldName.includes('date') || fieldDef.format === 'date') {
      if (!this.isValidDate(value)) {
        return { isValid: false, error: 'Please enter a valid date' };
      }
    }

    // Length validation
    if (fieldDef.minLength && value.length < fieldDef.minLength) {
      return { isValid: false, error: `Must be at least ${fieldDef.minLength} characters long` };
    }

    if (fieldDef.maxLength && value.length > fieldDef.maxLength) {
      return { isValid: false, error: `Must be no more than ${fieldDef.maxLength} characters long` };
    }

    return { isValid: true };
  }

  /**
   * Generate field warnings
   * @private
   */
  generateFieldWarnings(fieldPath, value, fieldDef) {
    const warnings = [];
    const fieldName = fieldPath.split('.').pop();

    // Length warnings
    if (typeof value === 'string') {
      if (fieldName.includes('description') && value.length < 50) {
        warnings.push('Consider adding more detail to improve your portfolio');
      }
      
      if (fieldName.includes('name') && value.length < 2) {
        warnings.push('Name seems too short');
      }
    }

    // URL warnings
    if (fieldName.includes('url') && value && !value.startsWith('https://')) {
      warnings.push('Consider using HTTPS for better security');
    }

    return warnings;
  }

  /**
   * Generate field suggestions
   * @private
   */
  generateFieldSuggestions(fieldPath, value, fieldDef, context) {
    const suggestions = [];
    const fieldName = fieldPath.split('.').pop();

    // Suggest improvements based on field type and content
    if (fieldName === 'description' && typeof value === 'string' && value.length < 100) {
      suggestions.push('Consider adding more details about your role and achievements');
    }

    if (fieldName === 'technologies' && Array.isArray(value) && value.length === 0) {
      suggestions.push('Add technologies you used in this project');
    }

    return suggestions;
  }

  /**
   * Get field definition from schema
   * @private
   */
  getFieldDefinition(fieldPath) {
    const pathParts = fieldPath.split('.');
    let current = this.schema;

    for (const part of pathParts) {
      if (part.includes('[') && part.includes(']')) {
        // Handle array indices
        const fieldName = part.split('[')[0];
        if (current[fieldName] && current[fieldName].type === 'array') {
          current = current[fieldName].items;
        } else {
          return null;
        }
      } else {
        if (current[part]) {
          current = current[part];
        } else {
          return null;
        }
      }
    }

    return current;
  }

  /**
   * Calculate validation summary
   * @private
   */
  calculateValidationSummary(result) {
    const { totalFields, validFields, errorFields, warningFields } = result.summary;
    
    if (totalFields > 0) {
      result.summary.completeness = Math.round((validFields / totalFields) * 100);
    }

    result.isValid = errorFields === 0;
  }

  // Utility validation methods

  isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  isValidUrl(url) {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  }

  isValidDate(dateString) {
    if (!dateString) return false;
    const date = new Date(dateString);
    return date instanceof Date && !isNaN(date);
  }
}

/**
 * React hook for content validation
 */
export function useContentValidation(schema, options = {}) {
  const [validator] = React.useState(() => new ContentValidator(schema, options));
  const [validationResults, setValidationResults] = React.useState({});
  const [isValidating, setIsValidating] = React.useState(false);

  const validateField = React.useCallback(async (fieldPath, value, context = {}) => {
    setIsValidating(true);
    
    try {
      const result = await validator.validateField(fieldPath, value, context);
      
      setValidationResults(prev => ({
        ...prev,
        [fieldPath]: result
      }));
      
      return result;
    } finally {
      setIsValidating(false);
    }
  }, [validator]);

  const validateAll = React.useCallback(async (data) => {
    setIsValidating(true);
    
    try {
      const result = await validator.validatePortfolioData(data);
      setValidationResults(result.fieldErrors);
      return result;
    } finally {
      setIsValidating(false);
    }
  }, [validator]);

  const clearValidation = React.useCallback((fieldPath = null) => {
    if (fieldPath) {
      setValidationResults(prev => {
        const newResults = { ...prev };
        delete newResults[fieldPath];
        return newResults;
      });
      validator.clearCache(fieldPath);
    } else {
      setValidationResults({});
      validator.clearCache();
    }
  }, [validator]);

  const getFieldValidation = React.useCallback((fieldPath) => {
    return validationResults[fieldPath] || validator.getCachedValidation(fieldPath);
  }, [validationResults, validator]);

  return {
    validateField,
    validateAll,
    clearValidation,
    getFieldValidation,
    validationResults,
    isValidating,
    validator
  };
}

export default ContentValidator;