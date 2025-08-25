import Link from 'next/link';
import { createAuthError } from '@/lib/auth-errors.js';

/**
 * Authentication Error Page
 * Displays authentication errors with recovery options
 */
export default function AuthErrorPage({ searchParams }) {
  const errorParam = searchParams?.error || 'An unknown authentication error occurred';
  const authError = createAuthError(errorParam);
  
  const getErrorIcon = () => {
    if (authError.isRetryable) {
      return (
        <svg className="w-8 h-8 text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
        </svg>
      );
    }
    
    return (
      <svg className="w-8 h-8 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
      </svg>
    );
  };
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center px-4">
      <div className="max-w-md w-full">
        {/* Glass card container */}
        <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-8 shadow-2xl">
          {/* Error icon */}
          <div className="flex justify-center mb-6">
            <div className={`w-16 h-16 rounded-full flex items-center justify-center ${
              authError.isRetryable ? 'bg-yellow-500/20' : 'bg-red-500/20'
            }`}>
              {getErrorIcon()}
            </div>
          </div>
          
          {/* Error title */}
          <h1 className="text-2xl font-bold text-white text-center mb-4">
            {authError.isRetryable ? 'Authentication Issue' : 'Authentication Failed'}
          </h1>
          
          {/* Error message */}
          <p className="text-gray-300 text-center mb-6 leading-relaxed">
            {authError.userMessage}
          </p>
          
          {/* Suggestions */}
          {authError.suggestions.length > 0 && (
            <div className="mb-8 p-4 bg-white/5 rounded-lg border border-white/10">
              <h3 className="text-sm font-medium text-white mb-3">What you can try:</h3>
              <ul className="space-y-2">
                {authError.suggestions.map((suggestion, index) => (
                  <li key={index} className="text-sm text-gray-300 flex items-start gap-2">
                    <span className="text-blue-400 mt-1">•</span>
                    {suggestion}
                  </li>
                ))}
              </ul>
            </div>
          )}
          
          {/* Action buttons */}
          <div className="space-y-4">
            {authError.isRetryable && (
              <Link
                href="/api/auth/signin"
                className="w-full bg-white/10 hover:bg-white/20 border border-white/20 hover:border-white/30 text-white font-medium py-3 px-4 rounded-lg transition-all duration-200 flex items-center justify-center gap-2"
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
                </svg>
                Try Again with GitHub
              </Link>
            )}
            
            <Link
              href="/"
              className="w-full bg-transparent hover:bg-white/5 border border-white/10 hover:border-white/20 text-white font-medium py-3 px-4 rounded-lg transition-all duration-200 text-center block"
            >
              Return to Home
            </Link>
          </div>
          
          {/* Technical details for debugging */}
          {process.env.NODE_ENV === 'development' && (
            <div className="mt-8 pt-6 border-t border-white/10">
              <details className="text-xs text-gray-400">
                <summary className="cursor-pointer hover:text-gray-300 mb-2">
                  Technical Details (Development)
                </summary>
                <pre className="bg-black/20 p-3 rounded text-xs overflow-auto">
                  {JSON.stringify({
                    type: authError.type,
                    originalError: errorParam,
                    timestamp: authError.timestamp,
                    details: authError.details
                  }, null, 2)}
                </pre>
              </details>
            </div>
          )}
          
          {/* Help text */}
          <div className="mt-6 pt-6 border-t border-white/10">
            <p className="text-sm text-gray-400 text-center">
              Need help? Contact support or check our documentation.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}