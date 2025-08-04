import React from 'react';

/**
 * LoadingSpinner - A spinning loading indicator
 * 
 * @param {Object} props - Component props
 * @param {string} props.size - Spinner size ('sm', 'md', 'lg')
 * @param {string} props.className - Additional CSS classes
 */
export const LoadingSpinner = ({ size = 'md', className = '', ...props }) => {
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-6 h-6',
    lg: 'w-8 h-8'
  };
  
  const combinedClasses = [
    'loading-spinner',
    sizeClasses[size],
    className
  ].filter(Boolean).join(' ');

  return (
    <div className={combinedClasses} {...props} />
  );
};

/**
 * LoadingDots - Animated dots loading indicator
 * 
 * @param {Object} props - Component props
 * @param {string} props.className - Additional CSS classes
 */
export const LoadingDots = ({ className = '', ...props }) => {
  return (
    <div className={`loading-dots ${className}`} {...props}>
      <span></span>
      <span></span>
      <span></span>
    </div>
  );
};

/**
 * LoadingPulse - Pulsing loading indicator
 */
export const LoadingPulse = ({ className = '', ...props }) => {
  return (
    <div 
      className={`w-4 h-4 bg-indigo-500 rounded-full animate-pulse ${className}`}
      {...props}
    />
  );
};

/**
 * ShimmerBox - Shimmer loading effect for content placeholders
 * 
 * @param {Object} props - Component props
 * @param {string} props.width - Box width
 * @param {string} props.height - Box height
 * @param {string} props.className - Additional CSS classes
 */
export const ShimmerBox = ({ 
  width = 'w-full', 
  height = 'h-4', 
  className = '', 
  ...props 
}) => {
  const combinedClasses = [
    'shimmer',
    'rounded',
    width,
    height,
    className
  ].filter(Boolean).join(' ');

  return (
    <div className={combinedClasses} {...props} />
  );
};

/**
 * ShimmerCard - Shimmer loading effect for card placeholders
 */
export const ShimmerCard = ({ className = '', ...props }) => {
  return (
    <div className={`glass-card p-6 ${className}`} {...props}>
      <div className="space-y-4">
        <ShimmerBox width="w-3/4" height="h-6" />
        <ShimmerBox width="w-full" height="h-4" />
        <ShimmerBox width="w-5/6" height="h-4" />
        <div className="flex space-x-2 mt-6">
          <ShimmerBox width="w-20" height="h-8" />
          <ShimmerBox width="w-16" height="h-8" />
        </div>
      </div>
    </div>
  );
};

/**
 * ShimmerText - Shimmer loading effect for text placeholders
 */
export const ShimmerText = ({ 
  lines = 3, 
  className = '', 
  ...props 
}) => {
  return (
    <div className={`space-y-2 ${className}`} {...props}>
      {Array.from({ length: lines }, (_, index) => (
        <ShimmerBox 
          key={index}
          width={index === lines - 1 ? 'w-3/4' : 'w-full'}
          height="h-4"
        />
      ))}
    </div>
  );
};

/**
 * ShimmerAvatar - Shimmer loading effect for avatar placeholders
 */
export const ShimmerAvatar = ({ 
  size = 'md', 
  className = '', 
  ...props 
}) => {
  const sizeClasses = {
    sm: 'w-8 h-8',
    md: 'w-12 h-12',
    lg: 'w-16 h-16',
    xl: 'w-20 h-20'
  };
  
  const combinedClasses = [
    'shimmer',
    'rounded-full',
    sizeClasses[size],
    className
  ].filter(Boolean).join(' ');

  return (
    <div className={combinedClasses} {...props} />
  );
};

/**
 * LoadingOverlay - Full-screen loading overlay
 */
export const LoadingOverlay = ({ 
  visible = false, 
  message = 'Loading...', 
  className = '',
  ...props 
}) => {
  if (!visible) return null;

  return (
    <div 
      className={`fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 ${className}`}
      {...props}
    >
      <div className="glass-card p-8 text-center">
        <LoadingSpinner size="lg" className="mx-auto mb-4" />
        <p className="text-text-1 text-lg">{message}</p>
      </div>
    </div>
  );
};

/**
 * LoadingButton - Button with integrated loading state
 */
export const LoadingButton = ({ 
  loading = false, 
  children, 
  disabled,
  className = '',
  ...props 
}) => {
  return (
    <button 
      className={`glass-button ${className}`}
      disabled={disabled || loading}
      {...props}
    >
      {loading && <LoadingSpinner size="sm" className="mr-2" />}
      {children}
    </button>
  );
};

/**
 * InlineLoader - Small inline loading indicator
 */
export const InlineLoader = ({ 
  text = 'Loading', 
  className = '', 
  ...props 
}) => {
  return (
    <div className={`flex items-center space-x-2 text-text-2 ${className}`} {...props}>
      <LoadingSpinner size="sm" />
      <span className="text-sm">{text}</span>
    </div>
  );
};

/**
 * ProgressBar - Progress bar component
 */
export const ProgressBar = ({ 
  progress = 0, 
  className = '', 
  showPercentage = false,
  ...props 
}) => {
  const clampedProgress = Math.min(100, Math.max(0, progress));
  
  return (
    <div className={`w-full ${className}`} {...props}>
      <div className="flex justify-between items-center mb-2">
        {showPercentage && (
          <span className="text-sm text-text-2">{Math.round(clampedProgress)}%</span>
        )}
      </div>
      <div className="w-full bg-glass-1 rounded-full h-2 overflow-hidden">
        <div 
          className="h-full bg-gradient-to-r from-indigo-500 to-violet-500 transition-all duration-300 ease-out"
          style={{ width: `${clampedProgress}%` }}
        />
      </div>
    </div>
  );
};

// Export default as LoadingSpinner for backward compatibility
export default LoadingSpinner;