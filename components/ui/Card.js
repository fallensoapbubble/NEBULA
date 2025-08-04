import React from 'react';

/**
 * GlassCard - A glassmorphic card component with backdrop blur effects
 * 
 * @param {Object} props - Component props
 * @param {React.ReactNode} props.children - Card content
 * @param {string} props.className - Additional CSS classes
 * @param {boolean} props.hover - Enable hover effects (default: true)
 * @param {string} props.variant - Card variant ('default', 'elevated', 'subtle')
 * @param {function} props.onClick - Click handler
 * @param {Object} props.style - Inline styles
 */
export const GlassCard = ({ 
  children, 
  className = '', 
  hover = true, 
  variant = 'default',
  onClick,
  style,
  ...props 
}) => {
  const baseClasses = 'glass-card';
  const variantClasses = {
    default: '',
    elevated: 'shadow-glass-lg',
    subtle: 'bg-glass-1 border-border-2'
  };
  
  const hoverClasses = hover ? 'hover:bg-glass-2 hover:border-border-accent hover:-translate-y-0.5' : '';
  const clickableClasses = onClick ? 'cursor-pointer' : '';
  
  const combinedClasses = [
    baseClasses,
    variantClasses[variant],
    hoverClasses,
    clickableClasses,
    className
  ].filter(Boolean).join(' ');

  return (
    <div 
      className={combinedClasses}
      onClick={onClick}
      style={style}
      {...props}
    >
      {children}
    </div>
  );
};

/**
 * GlassCardHeader - Header section for GlassCard
 */
export const GlassCardHeader = ({ children, className = '', ...props }) => {
  return (
    <div 
      className={`p-6 pb-4 ${className}`}
      {...props}
    >
      {children}
    </div>
  );
};

/**
 * GlassCardContent - Content section for GlassCard
 */
export const GlassCardContent = ({ children, className = '', ...props }) => {
  return (
    <div 
      className={`p-6 pt-0 ${className}`}
      {...props}
    >
      {children}
    </div>
  );
};

/**
 * GlassCardFooter - Footer section for GlassCard
 */
export const GlassCardFooter = ({ children, className = '', ...props }) => {
  return (
    <div 
      className={`p-6 pt-4 border-t border-border-1 ${className}`}
      {...props}
    >
      {children}
    </div>
  );
};

/**
 * GlassCardTitle - Title component for card headers
 */
export const GlassCardTitle = ({ children, className = '', ...props }) => {
  return (
    <h3 
      className={`text-xl font-semibold text-text-1 mb-2 ${className}`}
      {...props}
    >
      {children}
    </h3>
  );
};

/**
 * GlassCardDescription - Description component for card headers
 */
export const GlassCardDescription = ({ children, className = '', ...props }) => {
  return (
    <p 
      className={`text-text-2 text-sm leading-relaxed ${className}`}
      {...props}
    >
      {children}
    </p>
  );
};

// Export default as GlassCard for backward compatibility
export default GlassCard;