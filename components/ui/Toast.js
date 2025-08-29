/**
 * Toast Notification System
 * Provides user feedback through toast notifications with glassmorphic styling
 */

import React, { createContext, useContext, useReducer, useEffect } from 'react';

/**
 * Toast types and their configurations
 */
const TOAST_TYPES = {
  success: {
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
      </svg>
    ),
    bgColor: 'bg-green-500/20',
    borderColor: 'border-green-500/30',
    textColor: 'text-green-100',
    iconColor: 'text-green-400'
  },
  error: {
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
      </svg>
    ),
    bgColor: 'bg-red-500/20',
    borderColor: 'border-red-500/30',
    textColor: 'text-red-100',
    iconColor: 'text-red-400'
  },
  warning: {
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
      </svg>
    ),
    bgColor: 'bg-yellow-500/20',
    borderColor: 'border-yellow-500/30',
    textColor: 'text-yellow-100',
    iconColor: 'text-yellow-400'
  },
  info: {
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
    bgColor: 'bg-blue-500/20',
    borderColor: 'border-blue-500/30',
    textColor: 'text-blue-100',
    iconColor: 'text-blue-400'
  },
  loading: {
    icon: (
      <div className="w-5 h-5 border-2 border-white/20 border-t-white/80 rounded-full animate-spin" />
    ),
    bgColor: 'bg-gray-500/20',
    borderColor: 'border-gray-500/30',
    textColor: 'text-gray-100',
    iconColor: 'text-gray-400'
  }
};

/**
 * Toast reducer for managing toast state
 */
const toastReducer = (state, action) => {
  switch (action.type) {
    case 'ADD_TOAST':
      return {
        ...state,
        toasts: [...state.toasts, action.payload]
      };
    case 'REMOVE_TOAST':
      return {
        ...state,
        toasts: state.toasts.filter(toast => toast.id !== action.payload)
      };
    case 'UPDATE_TOAST':
      return {
        ...state,
        toasts: state.toasts.map(toast =>
          toast.id === action.payload.id
            ? { ...toast, ...action.payload.updates }
            : toast
        )
      };
    case 'CLEAR_ALL':
      return {
        ...state,
        toasts: []
      };
    default:
      return state;
  }
};

/**
 * Toast Context
 */
const ToastContext = createContext();

/**
 * Toast Provider Component
 */
export function ToastProvider({ children, maxToasts = 5 }) {
  const [state, dispatch] = useReducer(toastReducer, { toasts: [] });

  const addToast = (toast) => {
    const id = Math.random().toString(36).substr(2, 9);
    const newToast = {
      id,
      type: 'info',
      duration: 5000,
      dismissible: true,
      ...toast,
      createdAt: Date.now()
    };

    dispatch({ type: 'ADD_TOAST', payload: newToast });

    // Auto-remove toast after duration (unless it's persistent)
    if (newToast.duration > 0) {
      setTimeout(() => {
        dispatch({ type: 'REMOVE_TOAST', payload: id });
      }, newToast.duration);
    }

    // Remove oldest toast if we exceed max toasts
    if (state.toasts.length >= maxToasts) {
      const oldestToast = state.toasts[0];
      dispatch({ type: 'REMOVE_TOAST', payload: oldestToast.id });
    }

    return id;
  };

  const removeToast = (id) => {
    dispatch({ type: 'REMOVE_TOAST', payload: id });
  };

  const updateToast = (id, updates) => {
    dispatch({ type: 'UPDATE_TOAST', payload: { id, updates } });
  };

  const clearAll = () => {
    dispatch({ type: 'CLEAR_ALL' });
  };

  // Convenience methods for different toast types
  const toast = {
    success: (message, options = {}) => addToast({ ...options, type: 'success', message }),
    error: (message, options = {}) => addToast({ ...options, type: 'error', message, duration: 8000 }),
    warning: (message, options = {}) => addToast({ ...options, type: 'warning', message }),
    info: (message, options = {}) => addToast({ ...options, type: 'info', message }),
    loading: (message, options = {}) => addToast({ ...options, type: 'loading', message, duration: 0, dismissible: false }),
    promise: async (promise, messages = {}) => {
      const loadingId = addToast({
        type: 'loading',
        message: messages.loading || 'Loading...',
        duration: 0,
        dismissible: false
      });

      try {
        const result = await promise;
        removeToast(loadingId);
        addToast({
          type: 'success',
          message: messages.success || 'Success!',
          duration: 4000
        });
        return result;
      } catch (error) {
        removeToast(loadingId);
        addToast({
          type: 'error',
          message: messages.error || error.message || 'Something went wrong',
          duration: 8000
        });
        throw error;
      }
    }
  };

  const value = {
    toasts: state.toasts,
    addToast,
    removeToast,
    updateToast,
    clearAll,
    toast
  };

  return (
    <ToastContext.Provider value={value}>
      {children}
      <ToastContainer />
    </ToastContext.Provider>
  );
}

/**
 * Toast Container Component
 */
function ToastContainer() {
  const { toasts } = useContext(ToastContext);

  return (
    <div className="fixed top-4 right-4 z-50 space-y-2 max-w-sm w-full">
      {toasts.map((toast) => (
        <ToastItem key={toast.id} toast={toast} />
      ))}
    </div>
  );
}

/**
 * Individual Toast Item Component
 */
function ToastItem({ toast }) {
  const { removeToast } = useContext(ToastContext);
  const [isVisible, setIsVisible] = React.useState(false);
  const [isExiting, setIsExiting] = React.useState(false);

  const config = TOAST_TYPES[toast.type] || TOAST_TYPES.info;

  useEffect(() => {
    // Trigger entrance animation
    const timer = setTimeout(() => setIsVisible(true), 10);
    return () => clearTimeout(timer);
  }, []);

  const handleDismiss = () => {
    if (!toast.dismissible) return;
    
    setIsExiting(true);
    setTimeout(() => {
      removeToast(toast.id);
    }, 300);
  };

  return (
    <div
      className={`
        transform transition-all duration-300 ease-in-out
        ${isVisible && !isExiting 
          ? 'translate-x-0 opacity-100 scale-100' 
          : 'translate-x-full opacity-0 scale-95'
        }
      `}
    >
      <div
        className={`
          glass-card p-4 border backdrop-blur-lg
          ${config.bgColor} ${config.borderColor}
          shadow-lg max-w-sm w-full
        `}
      >
        <div className="flex items-start">
          {/* Icon */}
          <div className={`flex-shrink-0 ${config.iconColor} mr-3 mt-0.5`}>
            {config.icon}
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            {toast.title && (
              <h4 className={`text-sm font-medium ${config.textColor} mb-1`}>
                {toast.title}
              </h4>
            )}
            <p className={`text-sm ${config.textColor}`}>
              {toast.message}
            </p>
            
            {/* Action buttons */}
            {toast.actions && (
              <div className="mt-3 flex space-x-2">
                {toast.actions.map((action, index) => (
                  <button
                    key={index}
                    onClick={action.onClick}
                    className="text-xs font-medium text-white/80 hover:text-white underline"
                  >
                    {action.label}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Dismiss button */}
          {toast.dismissible && (
            <button
              onClick={handleDismiss}
              className={`flex-shrink-0 ml-2 ${config.textColor} hover:text-white transition-colors`}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>

        {/* Progress bar for timed toasts */}
        {toast.duration > 0 && (
          <ToastProgressBar duration={toast.duration} onComplete={handleDismiss} />
        )}
      </div>
    </div>
  );
}

/**
 * Progress bar for timed toasts
 */
function ToastProgressBar({ duration, onComplete }) {
  const [progress, setProgress] = React.useState(100);

  useEffect(() => {
    const startTime = Date.now();
    const interval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const remaining = Math.max(0, duration - elapsed);
      const newProgress = (remaining / duration) * 100;
      
      setProgress(newProgress);
      
      if (remaining <= 0) {
        clearInterval(interval);
        onComplete();
      }
    }, 50);

    return () => clearInterval(interval);
  }, [duration, onComplete]);

  return (
    <div className="mt-2 w-full bg-white/10 rounded-full h-1">
      <div
        className="bg-white/40 h-1 rounded-full transition-all duration-75 ease-linear"
        style={{ width: `${progress}%` }}
      />
    </div>
  );
}

/**
 * Hook to use toast functionality
 */
export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
}

/**
 * Predefined toast configurations for common scenarios
 */
export const ToastPresets = {
  // Repository operations
  repositoryCreated: (repoName) => ({
    type: 'success',
    title: 'Repository Created',
    message: `${repoName} has been successfully created and forked to your account.`,
    actions: [
      { label: 'Open Editor', onClick: () => window.location.href = `/editor/${repoName}` }
    ]
  }),

  repositoryCreateFailed: (error) => ({
    type: 'error',
    title: 'Repository Creation Failed',
    message: error.message || 'Failed to create repository. Please try again.',
    duration: 10000,
    actions: [
      { label: 'Retry', onClick: () => window.location.reload() }
    ]
  }),

  // File operations
  fileSaved: (fileName) => ({
    type: 'success',
    message: `${fileName} saved successfully`,
    duration: 3000
  }),

  fileSaveFailed: (fileName, error) => ({
    type: 'error',
    title: 'Save Failed',
    message: `Failed to save ${fileName}: ${error.message}`,
    duration: 8000
  }),

  // Authentication
  authSuccess: () => ({
    type: 'success',
    title: 'Welcome!',
    message: 'Successfully signed in with GitHub',
    duration: 4000
  }),

  authFailed: (error) => ({
    type: 'error',
    title: 'Authentication Failed',
    message: error.message || 'Failed to sign in. Please try again.',
    duration: 8000,
    actions: [
      { label: 'Try Again', onClick: () => window.location.href = '/api/auth/signin' }
    ]
  }),

  // Network issues
  networkError: () => ({
    type: 'error',
    title: 'Connection Error',
    message: 'Unable to connect to the server. Please check your internet connection.',
    duration: 10000,
    actions: [
      { label: 'Retry', onClick: () => window.location.reload() }
    ]
  }),

  // GitHub API issues
  githubRateLimit: (resetTime) => ({
    type: 'warning',
    title: 'Rate Limit Exceeded',
    message: `GitHub API rate limit exceeded. Please try again after ${new Date(resetTime).toLocaleTimeString()}.`,
    duration: 15000
  }),

  // Template operations
  templateValidationFailed: (errors) => ({
    type: 'error',
    title: 'Template Validation Failed',
    message: `Template has ${errors.length} validation error(s). Please fix them before proceeding.`,
    duration: 10000
  })
};