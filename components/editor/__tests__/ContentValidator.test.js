import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, act, waitFor } from '@testing-library/react';
import { ContentValidator, useContentValidation } from '../ContentValidator.js';

// Mock the portfolio data standardizer
vi.mock('../../../lib/portfolio-data-standardizer.js', () => ({
  STANDARD_PORTFOLIO_SCHEMA: {
    personal: {
      name: { type: 'string', required: true },
      email: { type: 'string', required: false, format: 'email' },
      bio: { type: 'string', required: false, minLength: 10 }
    },
    projects: {
      type: 'array',
      items: {
        name: { type: 'string', required: true },
        description: { type: 'string', required: true, minLength: 20 },
        url: { type: 'string', required: false, format: 'url' },
        technologies: { type: 'array', required: false }
      }
    }
  }
}));

describe('ContentValidator', () => {
  let validator;

  beforeEach(() => {
    validator = new ContentValidator();
  });

  afterEach(() => {
    vi.clearAllTimers();
  });

  describe('constructor', () => {
    it('should initialize with default options', () => {
      expect(validator.options.strictMode).toBe(false);
      expect(validator.options.allowUnknownFields).toBe(true);
      expect(validator.options.validateOnChange).toBe(true);
      expect(validator.options.debounceMs).toBe(300);
    });

    it('should accept custom options', () => {
      const customValidator = new ContentValidator(null, {
        strictMode: true,
        allowUnknownFields: false,
        debounceMs: 500
      });

      expect(customValidator.options.strictMode).toBe(true);
      expect(customValidator.options.allowUnknownFields).toBe(false);
      expect(customValidator.options.debounceMs).toBe(500);
    });
  });

  describe('validatePortfolioData', () => {
    it('should validate complete valid data', async () => {
      const validData = {
        personal: {
          name: 'John Doe',
          email: 'john@example.com',
          bio: 'A passionate developer with 5 years of experience'
        },
        projects: [
          {
            name: 'Project 1',
            description: 'A comprehensive web application built with React',
            url: 'https://project1.com',
            technologies: ['React', 'Node.js']
          }
        ]
      };

      const result = await validator.validatePortfolioData(validData);

      expect(result.isValid).toBe(true);
      expect(Object.keys(result.errors)).toHaveLength(0);
      expect(result.summary.errorFields).toBe(0);
      expect(result.summary.completeness).toBeGreaterThan(0);
    });

    it('should detect required field errors', async () => {
      const invalidData = {
        personal: {
          email: 'john@example.com'
          // missing required name
        },
        projects: [
          {
            description: 'A project description'
            // missing required name
          }
        ]
      };

      const result = await validator.validatePortfolioData(invalidData);

      expect(result.isValid).toBe(false);
      expect(result.errors['personal.name']).toBe('Required field is missing');
      expect(result.errors['projects[0].name']).toBe('Required field is missing');
      expect(result.summary.errorFields).toBeGreaterThan(0);
    });

    it('should detect format errors', async () => {
      const invalidData = {
        personal: {
          name: 'John Doe',
          email: 'invalid-email',
          bio: 'Short' // too short
        },
        projects: [
          {
            name: 'Project 1',
            description: 'Valid description that is long enough',
            url: 'not-a-url'
          }
        ]
      };

      const result = await validator.validatePortfolioData(invalidData);

      expect(result.isValid).toBe(false);
      expect(result.fieldErrors['personal.email']).toContain('valid email');
      expect(result.fieldErrors['personal.bio']).toContain('at least 10 characters');
      expect(result.fieldErrors['projects[0].url']).toContain('valid URL');
    });

    it('should generate warnings for improvements', async () => {
      const dataWithWarnings = {
        personal: {
          name: 'John Doe',
          bio: 'A developer with some experience' // could be longer
        },
        projects: [
          {
            name: 'Project 1',
            description: 'A good project description that meets requirements',
            url: 'http://project1.com' // not HTTPS
          }
        ]
      };

      const result = await validator.validatePortfolioData(dataWithWarnings);

      expect(result.isValid).toBe(true);
      expect(result.warnings['projects[0].url']).toContain('HTTPS');
      expect(result.summary.warningFields).toBeGreaterThan(0);
    });

    it('should handle validation errors gracefully', async () => {
      // Mock a validation error
      vi.spyOn(validator, 'validateSection').mockRejectedValue(new Error('Validation failed'));

      const result = await validator.validatePortfolioData({});

      expect(result.isValid).toBe(false);
      expect(result.errors._general).toContain('Validation failed');
    });
  });

  describe('validateField', () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('should debounce field validation', async () => {
      const validateSpy = vi.spyOn(validator, 'performFieldValidation').mockResolvedValue({
        isValid: true,
        errors: [],
        warnings: [],
        suggestions: []
      });

      // Trigger multiple validations quickly
      validator.validateField('personal.name', 'John');
      validator.validateField('personal.name', 'John D');
      validator.validateField('personal.name', 'John Doe');

      // Fast-forward time but not enough to trigger debounce
      vi.advanceTimersByTime(200);
      expect(validateSpy).not.toHaveBeenCalled();

      // Fast-forward past debounce time
      vi.advanceTimersByTime(200);
      await vi.runAllTimersAsync();

      // Should only validate once with the final value
      expect(validateSpy).toHaveBeenCalledTimes(1);
      expect(validateSpy).toHaveBeenCalledWith('personal.name', 'John Doe', {});
    });

    it('should cache validation results', async () => {
      const mockResult = {
        isValid: true,
        errors: [],
        warnings: [],
        suggestions: []
      };

      vi.spyOn(validator, 'performFieldValidation').mockResolvedValue(mockResult);

      const resultPromise = validator.validateField('personal.name', 'John Doe');
      vi.advanceTimersByTime(300);
      const result = await resultPromise;

      expect(result).toEqual(mockResult);
      expect(validator.getCachedValidation('personal.name')).toEqual(mockResult);
    });

    it('should handle validation errors', async () => {
      vi.spyOn(validator, 'performFieldValidation').mockRejectedValue(new Error('Field validation failed'));

      const resultPromise = validator.validateField('personal.name', 'John Doe');
      vi.advanceTimersByTime(300);
      const result = await resultPromise;

      expect(result.isValid).toBe(false);
      expect(result.errors[0]).toContain('Validation error');
    });
  });

  describe('performFieldValidation', () => {
    it('should validate required fields', async () => {
      const result = await validator.performFieldValidation('personal.name', '', {});

      expect(result.isValid).toBe(false);
      expect(result.errors[0]).toBe('This field is required');
    });

    it('should validate field types', async () => {
      const result = await validator.performFieldValidation('personal.name', 123, {});

      expect(result.isValid).toBe(false);
      expect(result.errors[0]).toBe('Must be a text value');
    });

    it('should validate email format', async () => {
      const result = await validator.performFieldValidation('personal.email', 'invalid-email', {});

      expect(result.isValid).toBe(false);
      expect(result.errors[0]).toContain('valid email address');
    });

    it('should validate URL format', async () => {
      const result = await validator.performFieldValidation('projects[0].url', 'not-a-url', {});

      expect(result.isValid).toBe(false);
      expect(result.errors[0]).toContain('valid URL');
    });

    it('should validate string length', async () => {
      const result = await validator.performFieldValidation('personal.bio', 'Short', {});

      expect(result.isValid).toBe(false);
      expect(result.errors[0]).toContain('at least 10 characters');
    });

    it('should generate suggestions', async () => {
      const result = await validator.performFieldValidation('projects[0].description', 'Short desc', {});

      expect(result.suggestions.length).toBeGreaterThan(0);
      expect(result.suggestions[0]).toContain('more details');
    });

    it('should handle unknown fields based on options', async () => {
      const strictValidator = new ContentValidator(null, { allowUnknownFields: false });
      
      const result = await strictValidator.performFieldValidation('unknown.field', 'value', {});

      expect(result.isValid).toBe(false);
      expect(result.errors[0]).toBe('Unknown field');
    });
  });

  describe('utility methods', () => {
    it('should validate email correctly', () => {
      expect(validator.isValidEmail('test@example.com')).toBe(true);
      expect(validator.isValidEmail('invalid-email')).toBe(false);
      expect(validator.isValidEmail('test@')).toBe(false);
      expect(validator.isValidEmail('@example.com')).toBe(false);
    });

    it('should validate URL correctly', () => {
      expect(validator.isValidUrl('https://example.com')).toBe(true);
      expect(validator.isValidUrl('http://example.com')).toBe(true);
      expect(validator.isValidUrl('ftp://example.com')).toBe(true);
      expect(validator.isValidUrl('not-a-url')).toBe(false);
      expect(validator.isValidUrl('example.com')).toBe(false);
    });

    it('should validate date correctly', () => {
      expect(validator.isValidDate('2024-01-01')).toBe(true);
      expect(validator.isValidDate('2024-12-31T23:59:59Z')).toBe(true);
      expect(validator.isValidDate('invalid-date')).toBe(false);
      expect(validator.isValidDate('')).toBe(false);
      expect(validator.isValidDate(null)).toBe(false);
    });
  });

  describe('cache management', () => {
    it('should clear specific field cache', () => {
      validator.validationCache.set('personal.name', { isValid: true });
      validator.validationCache.set('personal.email', { isValid: true });

      validator.clearCache('personal.name');

      expect(validator.getCachedValidation('personal.name')).toBeNull();
      expect(validator.getCachedValidation('personal.email')).toBeTruthy();
    });

    it('should clear all cache', () => {
      validator.validationCache.set('personal.name', { isValid: true });
      validator.validationCache.set('personal.email', { isValid: true });

      validator.clearCache();

      expect(validator.getCachedValidation('personal.name')).toBeNull();
      expect(validator.getCachedValidation('personal.email')).toBeNull();
    });
  });
});

describe('useContentValidation hook', () => {
  const TestComponent = ({ data, fieldPath, fieldValue }) => {
    const {
      validateField,
      validateAll,
      clearValidation,
      getFieldValidation,
      validationResults,
      isValidating
    } = useContentValidation();

    React.useEffect(() => {
      if (fieldPath && fieldValue !== undefined) {
        validateField(fieldPath, fieldValue);
      }
    }, [fieldPath, fieldValue, validateField]);

    React.useEffect(() => {
      if (data) {
        validateAll(data);
      }
    }, [data, validateAll]);

    return (
      <div>
        <div data-testid="validating">{isValidating.toString()}</div>
        <div data-testid="field-validation">
          {JSON.stringify(getFieldValidation(fieldPath) || {})}
        </div>
        <div data-testid="validation-results">
          {JSON.stringify(validationResults)}
        </div>
        <button onClick={() => clearValidation(fieldPath)} data-testid="clear-field">
          Clear Field
        </button>
        <button onClick={() => clearValidation()} data-testid="clear-all">
          Clear All
        </button>
      </div>
    );
  };

  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should validate individual fields', async () => {
    render(<TestComponent fieldPath="personal.name" fieldValue="John Doe" />);

    // Initially validating
    expect(screen.getByTestId('validating')).toHaveTextContent('true');

    // Fast-forward debounce time
    act(() => {
      vi.advanceTimersByTime(300);
    });

    await waitFor(() => {
      expect(screen.getByTestId('validating')).toHaveTextContent('false');
    });

    const fieldValidation = JSON.parse(screen.getByTestId('field-validation').textContent);
    expect(fieldValidation.isValid).toBe(true);
  });

  it('should validate all data', async () => {
    const testData = {
      personal: { name: 'John Doe' },
      projects: []
    };

    render(<TestComponent data={testData} />);

    act(() => {
      vi.advanceTimersByTime(300);
    });

    await waitFor(() => {
      expect(screen.getByTestId('validating')).toHaveTextContent('false');
    });

    const validationResults = JSON.parse(screen.getByTestId('validation-results').textContent);
    expect(Object.keys(validationResults)).toHaveLength(0); // No errors
  });

  it('should clear field validation', async () => {
    render(<TestComponent fieldPath="personal.name" fieldValue="John Doe" />);

    act(() => {
      vi.advanceTimersByTime(300);
    });

    await waitFor(() => {
      expect(screen.getByTestId('validating')).toHaveTextContent('false');
    });

    // Should have validation result
    let fieldValidation = JSON.parse(screen.getByTestId('field-validation').textContent);
    expect(fieldValidation.isValid).toBe(true);

    // Clear field validation
    act(() => {
      screen.getByTestId('clear-field').click();
    });

    // Should be cleared
    fieldValidation = JSON.parse(screen.getByTestId('field-validation').textContent);
    expect(Object.keys(fieldValidation)).toHaveLength(0);
  });

  it('should clear all validation', async () => {
    const testData = {
      personal: { name: '' }, // Invalid - required field
      projects: []
    };

    render(<TestComponent data={testData} />);

    act(() => {
      vi.advanceTimersByTime(300);
    });

    await waitFor(() => {
      expect(screen.getByTestId('validating')).toHaveTextContent('false');
    });

    // Should have validation errors
    let validationResults = JSON.parse(screen.getByTestId('validation-results').textContent);
    expect(Object.keys(validationResults).length).toBeGreaterThan(0);

    // Clear all validation
    act(() => {
      screen.getByTestId('clear-all').click();
    });

    // Should be cleared
    validationResults = JSON.parse(screen.getByTestId('validation-results').textContent);
    expect(Object.keys(validationResults)).toHaveLength(0);
  });
});