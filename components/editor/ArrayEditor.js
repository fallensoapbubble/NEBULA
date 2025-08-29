/**
 * Array Editor Component
 * Handles editing of array fields with add/remove/reorder functionality
 */

import React, { useState, useCallback } from 'react';
import { GlassCard, GlassCardHeader, GlassCardContent, GlassCardTitle } from '../ui/Card.js';
import { GlassButton, GlassIconButton } from '../ui/Button.js';
import { GlassInput, GlassTextarea, GlassLabel, GlassFormGroup, GlassErrorMessage, GlassHelpText } from '../ui/Input.js';

/**
 * Array Editor Component
 * @param {Object} props
 * @param {Array} props.value - Current array value
 * @param {Function} props.onChange - Change handler
 * @param {string} props.label - Field label
 * @param {boolean} props.required - Required field
 * @param {string} props.error - Error message
 * @param {string} props.helpText - Help text
 * @param {Object} props.itemSchema - Schema for array items
 * @param {string} props.itemType - Type of array items ('string', 'object', 'number')
 * @param {*} props.defaultItem - Default value for new items
 * @param {number} props.minItems - Minimum number of items
 * @param {number} props.maxItems - Maximum number of items
 * @param {boolean} props.sortable - Allow reordering items
 * @param {string} props.className - Additional CSS classes
 */
export const ArrayEditor = ({
  value = [],
  onChange,
  label,
  required = false,
  error,
  helpText,
  itemSchema,
  itemType = 'string',
  defaultItem,
  minItems = 0,
  maxItems = Infinity,
  sortable = true,
  className = ''
}) => {
  const [draggedIndex, setDraggedIndex] = useState(null);
  const [expandedItems, setExpandedItems] = useState(new Set());

  // Ensure value is always an array
  const arrayValue = Array.isArray(value) ? value : [];

  // Handle adding new item
  const handleAddItem = useCallback(() => {
    if (arrayValue.length >= maxItems) return;

    const newItem = getDefaultItemValue(itemType, itemSchema, defaultItem);
    const newArray = [...arrayValue, newItem];
    onChange?.(newArray);

    // Expand the new item if it's an object
    if (itemType === 'object') {
      setExpandedItems(prev => new Set([...prev, arrayValue.length]));
    }
  }, [arrayValue, maxItems, itemType, itemSchema, defaultItem, onChange]);

  // Handle removing item
  const handleRemoveItem = useCallback((index) => {
    if (arrayValue.length <= minItems) return;

    const newArray = arrayValue.filter((_, i) => i !== index);
    onChange?.(newArray);

    // Update expanded items indices
    setExpandedItems(prev => {
      const newExpanded = new Set();
      prev.forEach(expandedIndex => {
        if (expandedIndex < index) {
          newExpanded.add(expandedIndex);
        } else if (expandedIndex > index) {
          newExpanded.add(expandedIndex - 1);
        }
      });
      return newExpanded;
    });
  }, [arrayValue, minItems, onChange]);

  // Handle item change
  const handleItemChange = useCallback((index, newValue) => {
    const newArray = [...arrayValue];
    newArray[index] = newValue;
    onChange?.(newArray);
  }, [arrayValue, onChange]);

  // Handle item reordering
  const handleMoveItem = useCallback((fromIndex, toIndex) => {
    if (!sortable || fromIndex === toIndex) return;

    const newArray = [...arrayValue];
    const [movedItem] = newArray.splice(fromIndex, 1);
    newArray.splice(toIndex, 0, movedItem);
    onChange?.(newArray);

    // Update expanded items indices
    setExpandedItems(prev => {
      const newExpanded = new Set();
      prev.forEach(expandedIndex => {
        if (expandedIndex === fromIndex) {
          newExpanded.add(toIndex);
        } else if (expandedIndex > fromIndex && expandedIndex <= toIndex) {
          newExpanded.add(expandedIndex - 1);
        } else if (expandedIndex < fromIndex && expandedIndex >= toIndex) {
          newExpanded.add(expandedIndex + 1);
        } else {
          newExpanded.add(expandedIndex);
        }
      });
      return newExpanded;
    });
  }, [arrayValue, sortable, onChange]);

  // Handle drag and drop
  const handleDragStart = useCallback((e, index) => {
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = 'move';
  }, []);

  const handleDragOver = useCallback((e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  }, []);

  const handleDrop = useCallback((e, dropIndex) => {
    e.preventDefault();
    if (draggedIndex !== null && draggedIndex !== dropIndex) {
      handleMoveItem(draggedIndex, dropIndex);
    }
    setDraggedIndex(null);
  }, [draggedIndex, handleMoveItem]);

  // Toggle item expansion (for objects)
  const toggleItemExpansion = useCallback((index) => {
    setExpandedItems(prev => {
      const newExpanded = new Set(prev);
      if (newExpanded.has(index)) {
        newExpanded.delete(index);
      } else {
        newExpanded.add(index);
      }
      return newExpanded;
    });
  }, []);

  return (
    <GlassFormGroup className={className}>
      {label && (
        <GlassLabel required={required}>
          {label}
        </GlassLabel>
      )}

      <GlassCard>
        <GlassCardHeader>
          <div className="flex items-center justify-between">
            <GlassCardTitle className="text-sm">
              {arrayValue.length} item{arrayValue.length !== 1 ? 's' : ''}
              {minItems > 0 && ` (min: ${minItems})`}
              {maxItems < Infinity && ` (max: ${maxItems})`}
            </GlassCardTitle>
            
            <GlassButton
              size="sm"
              variant="primary"
              onClick={handleAddItem}
              disabled={arrayValue.length >= maxItems}
            >
              + Add Item
            </GlassButton>
          </div>
        </GlassCardHeader>

        <GlassCardContent>
          {arrayValue.length === 0 ? (
            <div className="text-center py-8 text-text-3">
              <p>No items yet. Click &quot;Add Item&quot; to get started.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {arrayValue.map((item, index) => (
                <ArrayItem
                  key={index}
                  index={index}
                  value={item}
                  itemType={itemType}
                  itemSchema={itemSchema}
                  onChange={(newValue) => handleItemChange(index, newValue)}
                  onRemove={() => handleRemoveItem(index)}
                  onMoveUp={index > 0 ? () => handleMoveItem(index, index - 1) : undefined}
                  onMoveDown={index < arrayValue.length - 1 ? () => handleMoveItem(index, index + 1) : undefined}
                  canRemove={arrayValue.length > minItems}
                  sortable={sortable}
                  expanded={expandedItems.has(index)}
                  onToggleExpansion={() => toggleItemExpansion(index)}
                  onDragStart={(e) => handleDragStart(e, index)}
                  onDragOver={handleDragOver}
                  onDrop={(e) => handleDrop(e, index)}
                  isDragging={draggedIndex === index}
                />
              ))}
            </div>
          )}
        </GlassCardContent>
      </GlassCard>

      {helpText && <GlassHelpText>{helpText}</GlassHelpText>}
      <GlassErrorMessage>{error}</GlassErrorMessage>
    </GlassFormGroup>
  );
};

/**
 * Individual Array Item Component
 */
const ArrayItem = ({
  index,
  value,
  itemType,
  itemSchema,
  onChange,
  onRemove,
  onMoveUp,
  onMoveDown,
  canRemove,
  sortable,
  expanded,
  onToggleExpansion,
  onDragStart,
  onDragOver,
  onDrop,
  isDragging
}) => {
  const handleChange = useCallback((e) => {
    const newValue = itemType === 'number' ? 
      parseFloat(e.target.value) || 0 : 
      e.target.value;
    onChange(newValue);
  }, [itemType, onChange]);

  const itemClasses = `
    array-item border border-border-1 rounded-lg p-3 bg-glass-1
    ${isDragging ? 'opacity-50' : ''}
    ${sortable ? 'cursor-move' : ''}
  `;

  return (
    <div
      className={itemClasses}
      draggable={sortable}
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDrop={onDrop}
    >
      <div className="flex items-start gap-3">
        {/* Drag Handle */}
        {sortable && (
          <div className="flex-shrink-0 mt-2 text-text-3 cursor-move">
            ⋮⋮
          </div>
        )}

        {/* Item Content */}
        <div className="flex-1 min-w-0">
          {itemType === 'string' && (
            <GlassInput
              value={value || ''}
              onChange={handleChange}
              placeholder={`Item ${index + 1}`}
            />
          )}

          {itemType === 'number' && (
            <GlassInput
              type="number"
              value={value || 0}
              onChange={handleChange}
              placeholder={`Item ${index + 1}`}
            />
          )}

          {itemType === 'text' && (
            <GlassTextarea
              value={value || ''}
              onChange={handleChange}
              placeholder={`Item ${index + 1}`}
              rows={3}
            />
          )}

          {itemType === 'object' && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-text-1">
                  Item {index + 1}
                </span>
                <GlassButton
                  size="sm"
                  variant="secondary"
                  onClick={onToggleExpansion}
                >
                  {expanded ? '−' : '+'}
                </GlassButton>
              </div>
              
              {expanded && (
                <SimpleObjectEditor
                  value={value || {}}
                  onChange={onChange}
                  schema={itemSchema}
                />
              )}
            </div>
          )}
        </div>

        {/* Item Actions */}
        <div className="flex-shrink-0 flex items-center gap-1">
          {/* Move buttons */}
          {sortable && (
            <>
              {onMoveUp && (
                <GlassIconButton
                  size="sm"
                  variant="secondary"
                  onClick={onMoveUp}
                  aria-label="Move up"
                >
                  ↑
                </GlassIconButton>
              )}
              {onMoveDown && (
                <GlassIconButton
                  size="sm"
                  variant="secondary"
                  onClick={onMoveDown}
                  aria-label="Move down"
                >
                  ↓
                </GlassIconButton>
              )}
            </>
          )}

          {/* Remove button */}
          {canRemove && (
            <GlassIconButton
              size="sm"
              variant="error"
              onClick={onRemove}
              aria-label="Remove item"
            >
              ×
            </GlassIconButton>
          )}
        </div>
      </div>
    </div>
  );
};

/**
 * Get default value for new array items
 */
function getDefaultItemValue(itemType, itemSchema, defaultItem) {
  if (defaultItem !== undefined) {
    return typeof defaultItem === 'function' ? defaultItem() : defaultItem;
  }

  switch (itemType) {
    case 'string':
    case 'text':
      return '';
    case 'number':
      return 0;
    case 'boolean':
      return false;
    case 'object':
      if (itemSchema) {
        const defaultObj = {};
        Object.keys(itemSchema).forEach(key => {
          const fieldDef = itemSchema[key];
          defaultObj[key] = getDefaultValueForType(fieldDef.type);
        });
        return defaultObj;
      }
      return {};
    case 'array':
      return [];
    default:
      return null;
  }
}

/**
 * Get default value for a specific type
 */
function getDefaultValueForType(type) {
  switch (type) {
    case 'string':
    case 'text':
    case 'email':
    case 'url':
      return '';
    case 'number':
      return 0;
    case 'boolean':
      return false;
    case 'array':
      return [];
    case 'object':
      return {};
    default:
      return null;
  }
}

/**
 * Simple Object Editor for Array Items
 * A lightweight object editor to avoid circular dependencies
 */
const SimpleObjectEditor = ({ value, onChange, schema }) => {
  const handleFieldChange = useCallback((fieldKey, fieldValue) => {
    const newValue = { ...value, [fieldKey]: fieldValue };
    onChange(newValue);
  }, [value, onChange]);

  if (!schema) {
    return (
      <GlassTextarea
        value={JSON.stringify(value, null, 2)}
        onChange={(e) => {
          try {
            const parsed = JSON.parse(e.target.value);
            onChange(parsed);
          } catch {
            // Invalid JSON, don't update
          }
        }}
        rows={4}
        className="font-mono text-xs"
      />
    );
  }

  return (
    <div className="space-y-3 p-3 border border-border-1 rounded-lg bg-glass-1">
      {Object.entries(schema).map(([key, fieldDef]) => {
        const fieldValue = value[key];
        const fieldType = fieldDef.type || 'string';
        
        return (
          <div key={key} className="space-y-1">
            <label className="text-xs font-medium text-text-1">
              {fieldDef.label || key}
              {fieldDef.required && <span className="text-red-500 ml-1">*</span>}
            </label>
            
            {fieldType === 'textarea' || fieldType === 'text' ? (
              <GlassTextarea
                value={fieldValue || ''}
                onChange={(e) => handleFieldChange(key, e.target.value)}
                placeholder={fieldDef.placeholder}
                rows={2}
              />
            ) : (
              <GlassInput
                type={fieldType === 'number' ? 'number' : 'text'}
                value={fieldValue || ''}
                onChange={(e) => {
                  const newValue = fieldType === 'number' ? 
                    parseFloat(e.target.value) || 0 : 
                    e.target.value;
                  handleFieldChange(key, newValue);
                }}
                placeholder={fieldDef.placeholder}
              />
            )}
          </div>
        );
      })}
    </div>
  );
};

export default ArrayEditor;