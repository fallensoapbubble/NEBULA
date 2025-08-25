/**
 * Dynamic Form Generator for Portfolio Content Editing
 * Generates forms based on repository structure and portfolio data schema
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { 
  GlassInput, 
  GlassTextarea, 
  GlassSelect, 
  GlassLabel, 
  GlassFormGroup, 
  GlassErrorMessage, 
  GlassHelpText 
} from '../ui/Input.js';
import { GlassButton } from '../ui/Button.js';
import { GlassCard, GlassCardHeader, GlassCardContent, GlassCardTitle } from '../ui/Card.js';
import { STANDARD_PORTFOLIO_SCHEMA } from '../../lib/portfolio-data-standardizer.js';

/**
 * Dynamic Form Generator Component
 * @param {Object} props
 * @param {Object} props.portfolioData - Current portfolio data
 * @param {Object} props.repositoryStructure - Repository file structure
 * @param {Function} props.onDataChange - Callback when data changes
 * @param {Function} props.onSave - Callback to save changes
 * @param {boolean} props.autoSave - Enable auto-save functionality
 * @param {Object} props.validationErrors - Current validation errors
 * @param {boolean} props.isLoading - Loading state
 */
export const DynamicFormGenerator = ({
  portfolioData = {},
  repositoryStructure = {},
  onDataChange,
  onSave,
  autoSave = true,
  validationErrors = {},
  isLoading = false
}) => {
  const [formData, setFormData] = useState(portfolioData);
  const [localErrors, setLocalErrors] = useState({});
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [autoSaveTimer, setAutoSaveTimer] = useState(null);

  // Auto-save functionality
  useEffect(() => {
    if (autoSave && hasUnsavedChanges && !isLoading) {
      // Clear existing timer
      if (autoSaveTimer) {
        clearTimeout(autoSaveTimer);
      }

      // Set new timer for auto-save
      const timer = setTimeout(() => {
        handleSave();
      }, 2000); // Auto-save after 2 seconds of inactivity

      setAutoSaveTimer(timer);

      return () => clearTimeout(timer);
    }
  }, [formData, hasUnsavedChanges, autoSave, isLoading]);

  // Update form data when portfolio data changes
  useEffect(() => {
    setFormData(portfolioData);
    setHasUnsavedChanges(false);
  }, [portfolioData]);

  // Handle form data changes
  const handleFieldChange = useCallback((fieldPath, value) => {
    setFormData(prevData => {
      const newData = { ...prevData };
      setNestedValue(newData, fieldPath, value);
      return newData;
    });
    
    setHasUnsavedChanges(true);
    
    // Clear local error for this field
    if (localErrors[fieldPath]) {
      setLocalErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[fieldPath];
        return newErrors;
      });
    }

    // Notify parent of change
    if (onDataChange) {
      onDataChange(fieldPath, value);
    }
  }, [localErrors, onDataChange]);

  // Handle save action
  const handleSave = useCallback(async () => {
    if (!hasUnsavedChanges || isLoading) return;

    try {
      // Validate form data
      const errors = validateFormData(formData);
      setLocalErrors(errors);

      if (Object.keys(errors).length === 0) {
        await onSave?.(formData);
        setHasUnsavedChanges(false);
      }
    } catch (error) {
      console.error('Save failed:', error);
      setLocalErrors({ _general: 'Failed to save changes. Please try again.' });
    }
  }, [formData, hasUnsavedChanges, isLoading, onSave]);

  // Generate form sections based on schema
  const formSections = useMemo(() => {
    return generateFormSections(STANDARD_PORTFOLIO_SCHEMA, formData, repositoryStructure);
  }, [formData, repositoryStructure]);

  // Combine validation errors
  const allErrors = { ...validationErrors, ...localErrors };

  return (
    <div className="dynamic-form-generator space-y-6">
      {/* Form Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-text-1">Edit Portfolio Content</h2>
          <p className="text-text-2 text-sm mt-1">
            Make changes to your portfolio content. {autoSave ? 'Changes are saved automatically.' : 'Remember to save your changes.'}
          </p>
        </div>
        
        <div className="flex items-center gap-3">
          {hasUnsavedChanges && (
            <span className="text-amber-500 text-sm flex items-center gap-1">
              <div className="w-2 h-2 bg-amber-500 rounded-full animate-pulse" />
              Unsaved changes
            </span>
          )}
          
          {!autoSave && (
            <GlassButton
              onClick={handleSave}
              disabled={!hasUnsavedChanges || isLoading}
              loading={isLoading}
              variant="primary"
            >
              Save Changes
            </GlassButton>
          )}
        </div>
      </div>

      {/* General Error Message */}
      {allErrors._general && (
        <GlassCard variant="elevated" className="border-red-500 bg-red-50/10">
          <GlassCardContent>
            <GlassErrorMessage>{allErrors._general}</GlassErrorMessage>
          </GlassCardContent>
        </GlassCard>
      )}

      {/* Form Sections */}
      <div className="space-y-8">
        {formSections.map((section) => (
          <FormSection
            key={section.key}
            section={section}
            data={getNestedValue(formData, section.key) || {}}
            errors={allErrors}
            onChange={handleFieldChange}
          />
        ))}
      </div>

      {/* Save Status */}
      {autoSave && (
        <div className="text-center text-text-3 text-sm">
          {isLoading ? (
            <span className="flex items-center justify-center gap-2">
              <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
              Saving changes...
            </span>
          ) : hasUnsavedChanges ? (
            <span>Changes will be saved automatically...</span>
          ) : (
            <span className="text-green-500">All changes saved</span>
          )}
        </div>
      )}
    </div>
  );
};

/**
 * Form Section Component
 * Renders a section of the form with its fields
 */
const FormSection = ({ section, data, errors, onChange }) => {
  const [isExpanded, setIsExpanded] = useState(true);

  return (
    <GlassCard>
      <GlassCardHeader>
        <div className="flex items-center justify-between">
          <div>
            <GlassCardTitle>{section.title}</GlassCardTitle>
            {section.description && (
              <p className="text-text-2 text-sm">{section.description}</p>
            )}
          </div>
          <GlassButton
            variant="secondary"
            size="sm"
            onClick={() => setIsExpanded(!isExpanded)}
          >
            {isExpanded ? '−' : '+'}
          </GlassButton>
        </div>
      </GlassCardHeader>

      {isExpanded && (
        <GlassCardContent>
          <div className="space-y-4">
            {section.fields.map((field) => (
              <FormField
                key={field.path}
                field={field}
                value={getNestedValue(data, field.relativePath)}
                error={errors[`${section.key}.${field.relativePath}`]}
                onChange={(value) => onChange(`${section.key}.${field.relativePath}`, value)}
              />
            ))}
          </div>
        </GlassCardContent>
      )}
    </GlassCard>
  );
};

/**
 * Form Field Component
 * Renders individual form fields based on their type
 */
const FormField = ({ field, value, error, onChange }) => {
  const handleChange = (e) => {
    const newValue = field.type === 'number' ? 
      parseFloat(e.target.value) || 0 : 
      e.target.value;
    onChange(newValue);
  };

  const handleArrayChange = (index, newValue) => {
    const currentArray = Array.isArray(value) ? [...value] : [];
    currentArray[index] = newValue;
    onChange(currentArray);
  };

  const handleArrayAdd = () => {
    const currentArray = Array.isArray(value) ? [...value] : [];
    currentArray.push(field.arrayItemDefault || '');
    onChange(currentArray);
  };

  const handleArrayRemove = (index) => {
    const currentArray = Array.isArray(value) ? [...value] : [];
    currentArray.splice(index, 1);
    onChange(currentArray);
  };

  // Handle array fields
  if (field.type === 'array') {
    const arrayValue = Array.isArray(value) ? value : [];
    
    return (
      <GlassFormGroup>
        <GlassLabel required={field.required}>
          {field.label}
        </GlassLabel>
        
        <div className="space-y-2">
          {arrayValue.map((item, index) => (
            <div key={index} className="flex items-center gap-2">
              {field.arrayItemType === 'object' ? (
                <ObjectField
                  schema={field.arrayItemSchema}
                  value={item}
                  onChange={(newValue) => handleArrayChange(index, newValue)}
                />
              ) : (
                <GlassInput
                  value={item || ''}
                  onChange={(e) => handleArrayChange(index, e.target.value)}
                  placeholder={field.placeholder}
                />
              )}
              <GlassButton
                variant="error"
                size="sm"
                onClick={() => handleArrayRemove(index)}
              >
                Remove
              </GlassButton>
            </div>
          ))}
          
          <GlassButton
            variant="secondary"
            size="sm"
            onClick={handleArrayAdd}
          >
            Add {field.label}
          </GlassButton>
        </div>
        
        {field.helpText && <GlassHelpText>{field.helpText}</GlassHelpText>}
        <GlassErrorMessage>{error}</GlassErrorMessage>
      </GlassFormGroup>
    );
  }

  // Handle object fields
  if (field.type === 'object') {
    return (
      <GlassFormGroup>
        <GlassLabel required={field.required}>
          {field.label}
        </GlassLabel>
        
        <ObjectField
          schema={field.objectSchema}
          value={value || {}}
          onChange={onChange}
        />
        
        {field.helpText && <GlassHelpText>{field.helpText}</GlassHelpText>}
        <GlassErrorMessage>{error}</GlassErrorMessage>
      </GlassFormGroup>
    );
  }

  // Handle select fields
  if (field.options) {
    return (
      <GlassFormGroup>
        <GlassLabel htmlFor={field.path} required={field.required}>
          {field.label}
        </GlassLabel>
        
        <GlassSelect
          id={field.path}
          value={value || ''}
          onChange={handleChange}
          error={!!error}
          placeholder={field.placeholder}
        >
          {field.options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </GlassSelect>
        
        {field.helpText && <GlassHelpText>{field.helpText}</GlassHelpText>}
        <GlassErrorMessage>{error}</GlassErrorMessage>
      </GlassFormGroup>
    );
  }

  // Handle textarea fields
  if (field.type === 'textarea' || field.multiline) {
    return (
      <GlassFormGroup>
        <GlassLabel htmlFor={field.path} required={field.required}>
          {field.label}
        </GlassLabel>
        
        <GlassTextarea
          id={field.path}
          value={value || ''}
          onChange={handleChange}
          placeholder={field.placeholder}
          rows={field.rows || 4}
          error={!!error}
        />
        
        {field.helpText && <GlassHelpText>{field.helpText}</GlassHelpText>}
        <GlassErrorMessage>{error}</GlassErrorMessage>
      </GlassFormGroup>
    );
  }

  // Handle regular input fields
  return (
    <GlassFormGroup>
      <GlassLabel htmlFor={field.path} required={field.required}>
        {field.label}
      </GlassLabel>
      
      <GlassInput
        id={field.path}
        type={field.inputType || 'text'}
        value={value || ''}
        onChange={handleChange}
        placeholder={field.placeholder}
        error={!!error}
      />
      
      {field.helpText && <GlassHelpText>{field.helpText}</GlassHelpText>}
      <GlassErrorMessage>{error}</GlassErrorMessage>
    </GlassFormGroup>
  );
};

/**
 * Object Field Component
 * Renders nested object fields
 */
const ObjectField = ({ schema, value, onChange }) => {
  const handleFieldChange = (fieldKey, fieldValue) => {
    const newValue = { ...value, [fieldKey]: fieldValue };
    onChange(newValue);
  };

  return (
    <div className="border border-border-1 rounded-lg p-4 space-y-3">
      {Object.entries(schema).map(([key, fieldDef]) => (
        <FormField
          key={key}
          field={{
            path: key,
            relativePath: key,
            label: fieldDef.label || key,
            type: fieldDef.type,
            required: fieldDef.required,
            placeholder: fieldDef.placeholder,
            helpText: fieldDef.description,
            options: fieldDef.options,
            multiline: fieldDef.multiline,
            rows: fieldDef.rows
          }}
          value={value[key]}
          onChange={(newValue) => handleFieldChange(key, newValue)}
        />
      ))}
    </div>
  );
};

// Utility functions

/**
 * Generate form sections from portfolio schema
 */
function generateFormSections(schema, currentData, repositoryStructure) {
  const sections = [];

  // Personal Information Section
  sections.push({
    key: 'personal',
    title: 'Personal Information',
    description: 'Basic information about yourself',
    fields: generateFieldsFromSchema(schema.personal, 'personal')
  });

  // Contact Information Section
  sections.push({
    key: 'contact',
    title: 'Contact Information',
    description: 'How people can reach you',
    fields: generateFieldsFromSchema(schema.contact, 'contact')
  });

  // Experience Section
  sections.push({
    key: 'experience',
    title: 'Work Experience',
    description: 'Your professional experience',
    fields: [{
      path: 'experience',
      relativePath: '',
      label: 'Experience Entries',
      type: 'array',
      arrayItemType: 'object',
      arrayItemSchema: schema.experience.items,
      arrayItemDefault: {
        title: '',
        company: '',
        startDate: '',
        endDate: '',
        description: ''
      }
    }]
  });

  // Projects Section
  sections.push({
    key: 'projects',
    title: 'Projects',
    description: 'Your portfolio projects',
    fields: [{
      path: 'projects',
      relativePath: '',
      label: 'Project Entries',
      type: 'array',
      arrayItemType: 'object',
      arrayItemSchema: schema.projects.items,
      arrayItemDefault: {
        name: '',
        description: '',
        url: '',
        repository: '',
        technologies: []
      }
    }]
  });

  // Skills Section
  sections.push({
    key: 'skills',
    title: 'Skills',
    description: 'Your technical and professional skills',
    fields: [{
      path: 'skills',
      relativePath: '',
      label: 'Skill Entries',
      type: 'array',
      arrayItemType: 'object',
      arrayItemSchema: schema.skills.items,
      arrayItemDefault: {
        name: '',
        category: '',
        level: 'intermediate'
      }
    }]
  });

  // Education Section
  sections.push({
    key: 'education',
    title: 'Education',
    description: 'Your educational background',
    fields: [{
      path: 'education',
      relativePath: '',
      label: 'Education Entries',
      type: 'array',
      arrayItemType: 'object',
      arrayItemSchema: schema.education.items,
      arrayItemDefault: {
        institution: '',
        degree: '',
        field: '',
        startDate: '',
        endDate: ''
      }
    }]
  });

  return sections;
}

/**
 * Generate form fields from schema definition
 */
function generateFieldsFromSchema(schemaDef, basePath) {
  const fields = [];

  Object.entries(schemaDef).forEach(([key, fieldDef]) => {
    const field = {
      path: `${basePath}.${key}`,
      relativePath: key,
      label: fieldDef.label || key.charAt(0).toUpperCase() + key.slice(1),
      type: fieldDef.type,
      required: fieldDef.required,
      helpText: fieldDef.description,
      placeholder: `Enter ${fieldDef.description || key}`
    };

    // Handle specific field types
    switch (fieldDef.type) {
      case 'string':
        if (key.includes('email')) {
          field.inputType = 'email';
        } else if (key.includes('url') || key.includes('website')) {
          field.inputType = 'url';
        } else if (key.includes('description') || key.includes('bio')) {
          field.type = 'textarea';
          field.rows = 4;
        }
        break;
      
      case 'number':
        field.inputType = 'number';
        break;
      
      case 'array':
        if (fieldDef.items?.type === 'string') {
          field.arrayItemType = 'string';
          field.arrayItemDefault = '';
        } else if (fieldDef.items?.type === 'object') {
          field.arrayItemType = 'object';
          field.arrayItemSchema = fieldDef.items;
        }
        break;
      
      case 'object':
        field.objectSchema = fieldDef;
        break;
    }

    // Add predefined options for certain fields
    if (key === 'level') {
      field.options = [
        { value: 'beginner', label: 'Beginner' },
        { value: 'intermediate', label: 'Intermediate' },
        { value: 'advanced', label: 'Advanced' },
        { value: 'expert', label: 'Expert' }
      ];
    }

    if (key === 'status') {
      field.options = [
        { value: 'completed', label: 'Completed' },
        { value: 'in-progress', label: 'In Progress' },
        { value: 'planned', label: 'Planned' }
      ];
    }

    fields.push(field);
  });

  return fields;
}

/**
 * Get nested value from object using dot notation
 */
function getNestedValue(obj, path) {
  if (!path) return obj;
  return path.split('.').reduce((current, key) => current?.[key], obj);
}

/**
 * Set nested value in object using dot notation
 */
function setNestedValue(obj, path, value) {
  const keys = path.split('.');
  const lastKey = keys.pop();
  const target = keys.reduce((current, key) => {
    if (!current[key] || typeof current[key] !== 'object') {
      current[key] = {};
    }
    return current[key];
  }, obj);
  target[lastKey] = value;
}

/**
 * Validate form data against schema
 */
function validateFormData(data) {
  const errors = {};

  // Basic validation - can be extended
  if (!data.personal?.name) {
    errors['personal.name'] = 'Name is required';
  }

  if (data.contact?.email && !isValidEmail(data.contact.email)) {
    errors['contact.email'] = 'Please enter a valid email address';
  }

  return errors;
}

/**
 * Validate email format
 */
function isValidEmail(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

export default DynamicFormGenerator;