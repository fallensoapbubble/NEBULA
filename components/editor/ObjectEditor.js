/**
 * Object Editor Component
 * Handles editing of nested object fields with dynamic form generation
 */

import React, { useState, useCallback, useMemo } from 'react';
import { GlassCard, GlassCardHeader, GlassCardContent, GlassCardTitle } from '../ui/Card.js';
import { GlassButton } from '../ui/Button.js';
import { 
  GlassInput, 
  GlassTextarea, 
  GlassSelect, 
  GlassLabel, 
  GlassFormGroup, 
  GlassErrorMessage, 
  GlassHelpText 
} from '../ui/Input.js';
import { MarkdownEditor } from './MarkdownEditor.js';

/**
 * Object Editor Component
 * @param {Object} props
 * @param {Object} props.value - Current object value
 * @param {Function} props.onChange - Change handler
 * @param {Object} props.schema - Object schema definition
 * @param {string} props.label - Field label
 * @param {boolean} props.required - Required field
 * @param {string} props.error - Error message
 * @param {string} props.helpText - Help text
 * @param {boolean} props.compact - Compact display mode
 * @param {boolean} props.collapsible - Allow collapsing sections
 * @param {string} props.className - Additional CSS classes
 */
export const ObjectEditor = ({
  value = {},
  onChange,
  schema = {},
  label,
  required = false,
  error,
  helpText,
  compact = false,
  collapsible = true,
  className = ''
}) => {
  const [expandedSections, setExpandedSections] = useState(new Set(Object.keys(schema)));

  // Ensure value is always an object
  const objectValue = useMemo(() => typeof value === 'object' && value !== null ? value : {}, [value]);

  // Handle field change
  const handleFieldChange = useCallback((fieldKey, fieldValue) => {
    const newValue = { ...objectValue, [fieldKey]: fieldValue };
    onChange?.(newValue);
  }, [objectValue, onChange]);

  // Toggle section expansion
  const toggleSection = useCallback((sectionKey) => {
    if (!collapsible) return;
    
    setExpandedSections(prev => {
      const newExpanded = new Set(prev);
      if (newExpanded.has(sectionKey)) {
        newExpanded.delete(sectionKey);
      } else {
        newExpanded.add(sectionKey);
      }
      return newExpanded;
    });
  }, [collapsible]);

  // Group fields by sections if schema has sections
  const fieldGroups = useMemo(() => {
    const groups = [];
    const ungroupedFields = [];

    Object.entries(schema).forEach(([key, fieldDef]) => {
      if (fieldDef.section) {
        let group = groups.find(g => g.name === fieldDef.section);
        if (!group) {
          group = {
            name: fieldDef.section,
            title: fieldDef.sectionTitle || fieldDef.section,
            description: fieldDef.sectionDescription,
            fields: []
          };
          groups.push(group);
        }
        group.fields.push({ key, ...fieldDef });
      } else {
        ungroupedFields.push({ key, ...fieldDef });
      }
    });

    // Add ungrouped fields as a default section
    if (ungroupedFields.length > 0) {
      groups.unshift({
        name: 'default',
        title: label || 'Fields',
        fields: ungroupedFields
      });
    }

    return groups;
  }, [schema, label]);

  if (compact) {
    return (
      <div className={`object-editor-compact space-y-3 ${className}`}>
        {Object.entries(schema).map(([key, fieldDef]) => (
          <ObjectField
            key={key}
            fieldKey={key}
            fieldDef={fieldDef}
            value={objectValue[key]}
            onChange={(newValue) => handleFieldChange(key, newValue)}
            compact={true}
          />
        ))}
        {error && <GlassErrorMessage>{error}</GlassErrorMessage>}
      </div>
    );
  }

  return (
    <GlassFormGroup className={className}>
      {label && (
        <GlassLabel required={required}>
          {label}
        </GlassLabel>
      )}

      <div className="space-y-4">
        {fieldGroups.map((group) => (
          <GlassCard key={group.name}>
            {collapsible && (
              <GlassCardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <GlassCardTitle>{group.title}</GlassCardTitle>
                    {group.description && (
                      <p className="text-text-2 text-sm mt-1">{group.description}</p>
                    )}
                  </div>
                  <GlassButton
                    size="sm"
                    variant="secondary"
                    onClick={() => toggleSection(group.name)}
                  >
                    {expandedSections.has(group.name) ? '−' : '+'}
                  </GlassButton>
                </div>
              </GlassCardHeader>
            )}

            {(!collapsible || expandedSections.has(group.name)) && (
              <GlassCardContent>
                <div className="space-y-4">
                  {group.fields.map((field) => (
                    <ObjectField
                      key={field.key}
                      fieldKey={field.key}
                      fieldDef={field}
                      value={objectValue[field.key]}
                      onChange={(newValue) => handleFieldChange(field.key, newValue)}
                    />
                  ))}
                </div>
              </GlassCardContent>
            )}
          </GlassCard>
        ))}
      </div>

      {helpText && <GlassHelpText>{helpText}</GlassHelpText>}
      <GlassErrorMessage>{error}</GlassErrorMessage>
    </GlassFormGroup>
  );
};

/**
 * Individual Object Field Component
 */
const ObjectField = ({ fieldKey, fieldDef, value, onChange, compact = false }) => {
  const {
    type = 'string',
    label,
    description,
    placeholder,
    required = false,
    options,
    multiline = false,
    rows = 4,
    min,
    max,
    pattern,
    validation
  } = fieldDef;

  const fieldLabel = label || fieldKey.charAt(0).toUpperCase() + fieldKey.slice(1);
  const fieldPlaceholder = placeholder || `Enter ${fieldLabel.toLowerCase()}`;

  const handleChange = useCallback((e) => {
    let newValue = e.target.value;
    
    // Type conversion
    switch (type) {
      case 'number':
        newValue = parseFloat(newValue) || 0;
        break;
      case 'boolean':
        newValue = e.target.checked;
        break;
      case 'array':
        // For simple arrays (comma-separated strings)
        newValue = newValue.split(',').map(item => item.trim()).filter(Boolean);
        break;
    }
    
    onChange(newValue);
  }, [type, onChange]);

  const handleMarkdownChange = useCallback((newValue) => {
    onChange(newValue);
  }, [onChange]);

  // Validation
  const validateField = useCallback((val) => {
    if (required && (!val || (typeof val === 'string' && val.trim() === ''))) {
      return `${fieldLabel} is required`;
    }
    
    if (type === 'email' && val && !isValidEmail(val)) {
      return 'Please enter a valid email address';
    }
    
    if (type === 'url' && val && !isValidUrl(val)) {
      return 'Please enter a valid URL';
    }
    
    if (pattern && val && !new RegExp(pattern).test(val)) {
      return validation?.message || `${fieldLabel} format is invalid`;
    }
    
    if (type === 'number') {
      if (min !== undefined && val < min) {
        return `${fieldLabel} must be at least ${min}`;
      }
      if (max !== undefined && val > max) {
        return `${fieldLabel} must be at most ${max}`;
      }
    }
    
    return null;
  }, [fieldLabel, required, type, pattern, validation, min, max]);

  const error = validateField(value);

  // Render different field types
  const renderField = () => {
    switch (type) {
      case 'markdown':
        return (
          <MarkdownEditor
            value={value || ''}
            onChange={handleMarkdownChange}
            placeholder={fieldPlaceholder}
            minHeight={compact ? 150 : 200}
            showPreview={!compact}
          />
        );

      case 'textarea':
      case 'text':
        if (multiline) {
          return (
            <GlassTextarea
              value={value || ''}
              onChange={handleChange}
              placeholder={fieldPlaceholder}
              rows={rows}
              error={!!error}
            />
          );
        }
        return (
          <GlassInput
            value={value || ''}
            onChange={handleChange}
            placeholder={fieldPlaceholder}
            error={!!error}
          />
        );

      case 'select':
        return (
          <GlassSelect
            value={value || ''}
            onChange={handleChange}
            placeholder={fieldPlaceholder}
            error={!!error}
          >
            {options?.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </GlassSelect>
        );

      case 'boolean':
        return (
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={!!value}
              onChange={handleChange}
              className="rounded border-border-1 bg-glass-1 text-accent-1 focus:ring-accent-1"
            />
            <span className="text-sm text-text-1">{fieldLabel}</span>
          </label>
        );

      case 'number':
        return (
          <GlassInput
            type="number"
            value={value || 0}
            onChange={handleChange}
            placeholder={fieldPlaceholder}
            min={min}
            max={max}
            error={!!error}
          />
        );

      case 'email':
        return (
          <GlassInput
            type="email"
            value={value || ''}
            onChange={handleChange}
            placeholder={fieldPlaceholder}
            error={!!error}
          />
        );

      case 'url':
        return (
          <GlassInput
            type="url"
            value={value || ''}
            onChange={handleChange}
            placeholder={fieldPlaceholder}
            error={!!error}
          />
        );

      case 'date':
        return (
          <GlassInput
            type="date"
            value={value || ''}
            onChange={handleChange}
            error={!!error}
          />
        );

      case 'array':
        // Simple array as comma-separated values
        const arrayValue = Array.isArray(value) ? value.join(', ') : (value || '');
        return (
          <GlassInput
            value={arrayValue}
            onChange={handleChange}
            placeholder="Enter items separated by commas"
            error={!!error}
          />
        );

      default:
        return (
          <GlassInput
            value={value || ''}
            onChange={handleChange}
            placeholder={fieldPlaceholder}
            error={!!error}
          />
        );
    }
  };

  if (type === 'boolean') {
    return (
      <GlassFormGroup>
        {renderField()}
        {description && <GlassHelpText>{description}</GlassHelpText>}
        <GlassErrorMessage>{error}</GlassErrorMessage>
      </GlassFormGroup>
    );
  }

  if (type === 'markdown') {
    return (
      <div>
        <GlassLabel required={required}>
          {fieldLabel}
        </GlassLabel>
        {renderField()}
        {description && <GlassHelpText>{description}</GlassHelpText>}
        <GlassErrorMessage>{error}</GlassErrorMessage>
      </div>
    );
  }

  return (
    <GlassFormGroup>
      <GlassLabel required={required}>
        {fieldLabel}
      </GlassLabel>
      {renderField()}
      {description && <GlassHelpText>{description}</GlassHelpText>}
      <GlassErrorMessage>{error}</GlassErrorMessage>
    </GlassFormGroup>
  );
};

// Utility functions
function isValidEmail(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

function isValidUrl(url) {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

export default ObjectEditor;