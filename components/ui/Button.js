import React from 'react';

/**
 * GlassButton - A glassmorphic button component with hover animations
 * 
 * @param {Object} props - Component props
 * @param {React.ReactNode} props.children - Button content
 * @param {string} props.variant - Button variant ('default', 'primary', 'secondary', 'success', 'warning', 'error')
 * @param {string} props.size - Button size ('sm', 'md', 'lg')
 * @param {boolean} props.disabled - Disabled state
 * @param {boolean} props.loading - Loading state
 * @param {string} props.className - Additional CSS classes
 * @param {function} props.onClick - Click handler
 * @param {string} props.type - Button type ('button', 'submit', 'reset')
 * @param {React.ReactNode} props.leftIcon - Icon to display on the left
 * @param {React.ReactNode} props.rightIcon - Icon to display on the right
 */
export const GlassButton = ({ 
  children, 
  variant = 'default', 
  size = 'md',
  disabled = false,
  loading = false,
  className = '',
  onClick,
  type = 'button',
  leftIcon,
  rightIcon,
  ...props 
}) => {
  const baseClasses = 'glass-button';
  
  const variantClasses = {
    default: '',
    primary: 'glass-button-primary',
    secondary: 'glass-button-secondary',
    success: 'glass-button-success',
    warning: 'glass-button-warning',
    error: 'glass-button-error'
  };
  
  const sizeClasses = {
    sm: 'px-3 py-2 text-xs',
    md: 'px-6 py-3 text-sm',
    lg: 'px-8 py-4 text-base'
  };
  
  const combinedClasses = [
    baseClasses,
    variantClasses[variant],
    sizeClasses[size],
    className
  ].filter(Boolean).join(' ');

  const handleClick = (e) => {
    if (!disabled && !loading && onClick) {
      onClick(e);
    }
  };

  return (
    <button 
      className={combinedClasses}
      onClick={handleClick}
      disabled={disabled || loading}
      type={type}
      {...props}
    >
      {loading && (
        <div className="loading-spinner mr-2" />
      )}
      {!loading && leftIcon && (
        <span className="mr-2">{leftIcon}</span>
      )}
      {children}
      {!loading && rightIcon && (
        <span className="ml-2">{rightIcon}</span>
      )}
    </button>
  );
};

/**
 * GlassIconButton - A glassmorphic icon-only button
 */
export const GlassIconButton = ({ 
  children, 
  variant = 'default', 
  size = 'md',
  disabled = false,
  loading = false,
  className = '',
  onClick,
  type = 'button',
  'aria-label': ariaLabel,
  ...props 
}) => {
  const baseClasses = 'glass-button !p-0 aspect-square flex items-center justify-center';
  
  const variantClasses = {
    default: '',
    primary: 'glass-button-primary',
    secondary: 'glass-button-secondary',
    success: 'glass-button-success',
    warning: 'glass-button-warning',
    error: 'glass-button-error'
  };
  
  const sizeClasses = {
    sm: 'w-8 h-8 text-xs',
    md: 'w-10 h-10 text-sm',
    lg: 'w-12 h-12 text-base'
  };
  
  const combinedClasses = [
    baseClasses,
    variantClasses[variant],
    sizeClasses[size],
    className
  ].filter(Boolean).join(' ');

  const handleClick = (e) => {
    if (!disabled && !loading && onClick) {
      onClick(e);
    }
  };

  return (
    <button 
      className={combinedClasses}
      onClick={handleClick}
      disabled={disabled || loading}
      type={type}
      aria-label={ariaLabel}
      {...props}
    >
      {loading ? (
        <div className="loading-spinner" />
      ) : (
        children
      )}
    </button>
  );
};

/**
 * GlassButtonGroup - A group of connected glass buttons
 */
export const GlassButtonGroup = ({ children, className = '', ...props }) => {
  return (
    <div 
      className={`inline-flex rounded-lg overflow-hidden ${className}`}
      {...props}
    >
      {React.Children.map(children, (child, index) => {
        if (React.isValidElement(child)) {
          return React.cloneElement(child, {
            className: `${child.props.className || ''} ${
              index === 0 ? 'rounded-r-none' : 
              index === React.Children.count(children) - 1 ? 'rounded-l-none' : 
              'rounded-none'
            } border-r-0 last:border-r`
          });
        }
        return child;
      })}
    </div>
  );
};

// Export default as GlassButton for backward compatibility
export default GlassButton;