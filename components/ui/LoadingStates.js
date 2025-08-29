/**
 * Loading States and Progress Indicators
 * Provides various loading components with glassmorphic styling
 */

import React from 'react';

/**
 * Basic loading spinner with glassmorphic styling
 */
export function LoadingSpinner({ size = 'md', className = '' }) {
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-6 h-6',
    lg: 'w-8 h-8',
    xl: 'w-12 h-12'
  };

  return (
    <div className={`${sizeClasses[size]} ${className}`}>
      <div className="animate-spin rounded-full border-2 border-white/20 border-t-white/80"></div>
    </div>
  );
}

/**
 * Loading overlay for full-screen loading states
 */
export function LoadingOverlay({ message = 'Loading...', children }) {
  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="glass-card p-8 text-center max-w-sm mx-4">
        <LoadingSpinner size="xl" className="mx-auto mb-4" />
        <p className="text-white text-lg font-medium mb-2">{message}</p>
        {children}
      </div>
    </div>
  );
}

/**
 * Inline loading state for components
 */
export function InlineLoading({ message = 'Loading...', size = 'md' }) {
  return (
    <div className="flex items-center justify-center py-8">
      <LoadingSpinner size={size} className="mr-3" />
      <span className="text-white/80">{message}</span>
    </div>
  );
}

/**
 * Loading skeleton for content placeholders
 */
export function LoadingSkeleton({ className = '', lines = 3 }) {
  return (
    <div className={`animate-pulse ${className}`}>
      {Array.from({ length: lines }).map((_, index) => (
        <div
          key={index}
          className={`bg-white/10 rounded h-4 mb-3 ${
            index === lines - 1 ? 'w-3/4' : 'w-full'
          }`}
        />
      ))}
    </div>
  );
}

/**
 * Card loading skeleton
 */
export function CardSkeleton({ className = '' }) {
  return (
    <div className={`glass-card p-6 animate-pulse ${className}`}>
      <div className="bg-white/10 rounded h-6 w-3/4 mb-4" />
      <div className="bg-white/10 rounded h-4 w-full mb-2" />
      <div className="bg-white/10 rounded h-4 w-5/6 mb-4" />
      <div className="bg-white/10 rounded h-8 w-24" />
    </div>
  );
}

/**
 * Progress bar component
 */
export function ProgressBar({ 
  progress = 0, 
  className = '', 
  showPercentage = true,
  color = 'blue' 
}) {
  const colorClasses = {
    blue: 'bg-blue-500',
    green: 'bg-green-500',
    yellow: 'bg-yellow-500',
    red: 'bg-red-500',
    purple: 'bg-purple-500'
  };

  return (
    <div className={`w-full ${className}`}>
      <div className="flex justify-between items-center mb-2">
        {showPercentage && (
          <span className="text-sm text-white/80">{Math.round(progress)}%</span>
        )}
      </div>
      <div className="w-full bg-white/10 rounded-full h-2">
        <div
          className={`h-2 rounded-full transition-all duration-300 ${colorClasses[color]}`}
          style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
        />
      </div>
    </div>
  );
}

/**
 * Step progress indicator
 */
export function StepProgress({ steps = [], currentStep = 0, className = '' }) {
  return (
    <div className={`flex items-center justify-between ${className}`}>
      {steps.map((step, index) => (
        <React.Fragment key={index}>
          <div className="flex flex-col items-center">
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-colors ${
                index < currentStep
                  ? 'bg-green-500 text-white'
                  : index === currentStep
                  ? 'bg-blue-500 text-white'
                  : 'bg-white/10 text-white/60'
              }`}
            >
              {index < currentStep ? (
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
              ) : (
                index + 1
              )}
            </div>
            <span className="text-xs text-white/80 mt-2 text-center max-w-20">
              {step}
            </span>
          </div>
          {index < steps.length - 1 && (
            <div
              className={`flex-1 h-0.5 mx-2 transition-colors ${
                index < currentStep ? 'bg-green-500' : 'bg-white/10'
              }`}
            />
          )}
        </React.Fragment>
      ))}
    </div>
  );
}

/**
 * Loading button state
 */
export function LoadingButton({ 
  loading = false, 
  children, 
  loadingText = 'Loading...', 
  className = '',
  ...props 
}) {
  return (
    <button
      className={`glass-button relative ${className} ${loading ? 'cursor-not-allowed opacity-75' : ''}`}
      disabled={loading}
      {...props}
    >
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center">
          <LoadingSpinner size="sm" className="mr-2" />
          <span>{loadingText}</span>
        </div>
      )}
      <div className={loading ? 'invisible' : 'visible'}>
        {children}
      </div>
    </button>
  );
}

/**
 * Repository creation progress component
 */
export function RepositoryCreationProgress({ 
  currentStep = 0, 
  error = null,
  onRetry = null 
}) {
  const steps = [
    'Forking template',
    'Setting up repository',
    'Configuring settings',
    'Finalizing setup'
  ];

  if (error) {
    return (
      <div className="glass-card p-6 text-center">
        <div className="w-12 h-12 mx-auto mb-4 bg-red-500/20 rounded-full flex items-center justify-center">
          <svg className="w-6 h-6 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
          </svg>
        </div>
        <h3 className="text-lg font-semibold text-white mb-2">Repository Creation Failed</h3>
        <p className="text-gray-300 mb-4">{error}</p>
        {onRetry && (
          <button
            onClick={onRetry}
            className="glass-button px-4 py-2 text-white rounded-lg"
          >
            Try Again
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="glass-card p-6">
      <h3 className="text-lg font-semibold text-white mb-6 text-center">
        Creating Your Repository
      </h3>
      <StepProgress steps={steps} currentStep={currentStep} className="mb-6" />
      <div className="text-center">
        <p className="text-gray-300 mb-4">
          {currentStep < steps.length ? steps[currentStep] : 'Complete!'}
        </p>
        {currentStep < steps.length && (
          <LoadingSpinner size="md" className="mx-auto" />
        )}
      </div>
    </div>
  );
}

/**
 * File save progress component
 */
export function FileSaveProgress({ 
  saving = false, 
  progress = 0, 
  fileName = '',
  error = null 
}) {
  if (error) {
    return (
      <div className="glass-card p-4 border-l-4 border-red-500">
        <div className="flex items-center">
          <svg className="w-5 h-5 text-red-400 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
          </svg>
          <div>
            <p className="text-white font-medium">Save Failed</p>
            <p className="text-gray-300 text-sm">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  if (!saving) return null;

  return (
    <div className="glass-card p-4">
      <div className="flex items-center mb-2">
        <LoadingSpinner size="sm" className="mr-2" />
        <span className="text-white font-medium">
          Saving {fileName || 'file'}...
        </span>
      </div>
      <ProgressBar progress={progress} color="blue" />
    </div>
  );
}

/**
 * Data fetching loading state
 */
export function DataFetchingLoader({ 
  message = 'Loading data...', 
  subMessage = null,
  className = '' 
}) {
  return (
    <div className={`flex flex-col items-center justify-center py-12 ${className}`}>
      <div className="relative mb-4">
        <div className="w-16 h-16 border-4 border-white/20 border-t-white/80 rounded-full animate-spin"></div>
        <div className="absolute inset-0 w-16 h-16 border-4 border-transparent border-r-blue-500/50 rounded-full animate-spin" style={{ animationDirection: 'reverse', animationDuration: '1.5s' }}></div>
      </div>
      <h3 className="text-lg font-medium text-white mb-2">{message}</h3>
      {subMessage && (
        <p className="text-gray-300 text-sm text-center max-w-md">{subMessage}</p>
      )}
    </div>
  );
}

/**
 * Template gallery loading grid
 */
export function TemplateGalleryLoader({ count = 6 }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {Array.from({ length: count }).map((_, index) => (
        <CardSkeleton key={index} />
      ))}
    </div>
  );
}

/**
 * Editor loading state
 */
export function EditorLoader() {
  return (
    <div className="flex h-screen">
      {/* Sidebar skeleton */}
      <div className="w-64 bg-white/5 p-4">
        <div className="bg-white/10 rounded h-6 w-3/4 mb-4" />
        <div className="space-y-2">
          {Array.from({ length: 8 }).map((_, index) => (
            <div key={index} className="bg-white/10 rounded h-4 w-full" />
          ))}
        </div>
      </div>
      
      {/* Main content skeleton */}
      <div className="flex-1 p-6">
        <div className="bg-white/10 rounded h-8 w-1/2 mb-6" />
        <div className="glass-card p-6">
          <LoadingSkeleton lines={10} />
        </div>
      </div>
    </div>
  );
}