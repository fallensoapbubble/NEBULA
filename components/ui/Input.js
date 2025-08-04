import React, { forwardRef } from 'react';

/**
 * GlassInput - A glassmorphic input component with focus states
 * 
 * @param {Object} props - Component props
 * @param {string} props.type - Input type
 * @param {string} props.placeholder - Placeholder text
 * @param {string} props.value - Input value
 * @param {function} props.onChange - Change handler
 * @param {boolean} props.disabled - Disabled state
 * @param {boolean} props.error - Error state
 * @param {string} props.className - Additional CSS classes
 * @param {React.ReactNode} props.leftIcon - Icon to display on the left
 * @param {React.ReactNode} props.rightIcon - Icon to display on the right
 * @param {string} props.size - Input size ('sm', 'md', 'lg')
 */
export const GlassInput = forwardRef(({ 
  type = 'text',
  placeholder,
  value,
  onChange,
  disabled = false,
  error = false,
  className = '',
  leftIcon,
  rightIcon,
  size = 'md',
  ...props 
}, ref) => {
  const baseClasses = 'glass-input';
  
  const sizeClasses = {
    sm: 'px-3 py-2 text-xs',
    md: 'px-4 py-3 text-sm',
    lg: 'px-5 py-4 text-base'
  };
  
  const errorClasses = error ? 'border-red-500 focus:border-red-500 focus:shadow-red-500/10' : '';
  
  const inputClasses = [
    baseClasses,
    sizeClasses[size],
    errorClasses,
    leftIcon ? 'pl-10' : '',
    rightIcon ? 'pr-10' : '',
    className
  ].filter(Boolean).join(' ');

  if (leftIcon || rightIcon) {
    return (
      <div className="relative">
        {leftIcon && (
          <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-text-3">
            {leftIcon}
          </div>
        )}
        <input
          ref={ref}
          type={type}
          placeholder={placeholder}
          value={value}
          onChange={onChange}
          disabled={disabled}
          className={inputClasses}
          {...props}
        />
        {rightIcon && (
          <div className="absolute right-3 top-1/2 transform -translate-y-1/2 text-text-3">
            {rightIcon}
          </div>
        )}
      </div>
    );
  }

  return (
    <input
      ref={ref}
      type={type}
      placeholder={placeholder}
      value={value}
      onChange={onChange}
      disabled={disabled}
      className={inputClasses}
      {...props}
    />
  );
});

GlassInput.displayName = 'GlassInput';

/**
 * GlassTextarea - A glassmorphic textarea component
 */
export const GlassTextarea = forwardRef(({ 
  placeholder,
  value,
  onChange,
  disabled = false,
  error = false,
  className = '',
  rows = 4,
  resize = true,
  ...props 
}, ref) => {
  const baseClasses = 'glass-textarea';
  const errorClasses = error ? 'border-red-500 focus:border-red-500 focus:shadow-red-500/10' : '';
  const resizeClasses = resize ? 'resize-y' : 'resize-none';
  
  const combinedClasses = [
    baseClasses,
    errorClasses,
    resizeClasses,
    className
  ].filter(Boolean).join(' ');

  return (
    <textarea
      ref={ref}
      placeholder={placeholder}
      value={value}
      onChange={onChange}
      disabled={disabled}
      rows={rows}
      className={combinedClasses}
      {...props}
    />
  );
});

GlassTextarea.displayName = 'GlassTextarea';

/**
 * GlassSelect - A glassmorphic select component
 */
export const GlassSelect = forwardRef(({ 
  value,
  onChange,
  disabled = false,
  error = false,
  className = '',
  children,
  placeholder,
  ...props 
}, ref) => {
  const baseClasses = 'glass-select';
  const errorClasses = error ? 'border-red-500 focus:border-red-500 focus:shadow-red-500/10' : '';
  
  const combinedClasses = [
    baseClasses,
    errorClasses,
    className
  ].filter(Boolean).join(' ');

  return (
    <select
      ref={ref}
      value={value}
      onChange={onChange}
      disabled={disabled}
      className={combinedClasses}
      {...props}
    >
      {placeholder && (
        <option value="" disabled>
          {placeholder}
        </option>
      )}
      {children}
    </select>
  );
});

GlassSelect.displayName = 'GlassSelect';

/**
 * GlassLabel - A label component for form fields
 */
export const GlassLabel = ({ children, htmlFor, required = false, className = '', ...props }) => {
  return (
    <label 
      htmlFor={htmlFor}
      className={`block text-sm font-medium text-text-1 mb-2 ${className}`}
      {...props}
    >
      {children}
      {required && <span className="text-red-500 ml-1">*</span>}
    </label>
  );
};

/**
 * GlassFormGroup - A wrapper for form field groups
 */
export const GlassFormGroup = ({ children, className = '', ...props }) => {
  return (
    <div className={`mb-4 ${className}`} {...props}>
      {children}
    </div>
  );
};

/**
 * GlassErrorMessage - Error message component for form fields
 */
export const GlassErrorMessage = ({ children, className = '', ...props }) => {
  if (!children) return null;
  
  return (
    <p className={`text-red-500 text-xs mt-1 ${className}`} {...props}>
      {children}
    </p>
  );
};

/**
 * GlassHelpText - Help text component for form fields
 */
export const GlassHelpText = ({ children, className = '', ...props }) => {
  if (!children) return null;
  
  return (
    <p className={`text-text-3 text-xs mt-1 ${className}`} {...props}>
      {children}
    </p>
  );
};

// Export default as GlassInput for backward compatibility
export default GlassInput;