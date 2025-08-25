import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';

/**
 * Fork Status Tracker Component
 * Tracks fork creation progress and handles post-fork redirect
 */
export default function ForkStatusTracker({ 
  forkResult, 
  onComplete, 
  onError,
  redirectToEditor = true 
}) {
  const [status, setStatus] = useState('verifying'); // verifying, ready, error
  const [progress, setProgress] = useState(0);
  const [statusMessage, setStatusMessage] = useState('Verifying fork creation...');
  const router = useRouter();

  useEffect(() => {
    if (!forkResult?.repository) return;

    const trackForkStatus = async () => {
      try {
        const { owner, name } = forkResult.repository;
        
        // Step 1: Initial verification (25%)
        setProgress(25);
        setStatusMessage('Verifying fork creation...');
        
        // Wait a moment for GitHub to process the fork
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // Step 2: Check fork status (50%)
        setProgress(50);
        setStatusMessage('Checking repository status...');
        
        const statusResponse = await fetch(`/api/repositories/${owner}/${name}/fork-status`);
        const statusData = await statusResponse.json();
        
        if (!statusResponse.ok) {
          throw new Error(statusData.error || 'Failed to check fork status');
        }
        
        if (!statusData.status.exists) {
          throw new Error('Fork was not created successfully');
        }
        
        // Step 3: Verify fork integrity (75%)
        setProgress(75);
        setStatusMessage('Verifying fork integrity...');
        
        const verifyResponse = await fetch(`/api/repositories/${owner}/${name}/verify-fork`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            expectedParent: forkResult.repository.parent?.fullName
          })
        });
        
        const verifyData = await verifyResponse.json();
        
        if (!verifyResponse.ok || !verifyData.verified) {
          throw new Error(verifyData.error || 'Fork verification failed');
        }
        
        // Step 4: Complete (100%)
        setProgress(100);
        setStatusMessage('Fork created successfully!');
        setStatus('ready');
        
        // Wait a moment to show success
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Handle completion
        if (onComplete) {
          onComplete(forkResult);
        }
        
        // Redirect to editor if requested
        if (redirectToEditor) {
          setStatusMessage('Redirecting to editor...');
          await new Promise(resolve => setTimeout(resolve, 500));
          router.push(`/editor/${owner}/${name}`);
        }
        
      } catch (error) {
        console.error('Fork status tracking error:', error);
        setStatus('error');
        setStatusMessage(error.message || 'An error occurred while tracking fork status');
        
        if (onError) {
          onError(error);
        }
      }
    };

    trackForkStatus();
  }, [forkResult, onComplete, onError, redirectToEditor, router]);

  if (!forkResult?.repository) {
    return null;
  }

  const { repository } = forkResult;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4 p-6"
      >
        {/* Header */}
        <div className="text-center mb-6">
          <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-blue-100 mb-4">
            {status === 'ready' ? (
              <svg className="h-6 w-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            ) : status === 'error' ? (
              <svg className="h-6 w-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            ) : (
              <svg className="animate-spin h-6 w-6 text-blue-600" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
            )}
          </div>
          
          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            {status === 'ready' ? 'Fork Ready!' : status === 'error' ? 'Fork Error' : 'Creating Fork'}
          </h2>
          
          <p className="text-sm text-gray-600">
            {statusMessage}
          </p>
        </div>

        {/* Repository Info */}
        <div className="mb-6 p-4 bg-gray-50 rounded-lg">
          <div className="flex items-center space-x-3">
            <div className="flex-shrink-0">
              <svg className="w-8 h-8 text-gray-600" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M4 2a2 2 0 00-2 2v11a2 2 0 002 2V4a2 2 0 012-2h11a2 2 0 00-2-2H4z" clipRule="evenodd" />
                <path d="M6 4a2 2 0 012-2h8a2 2 0 012 2v10a2 2 0 01-2 2H8a2 2 0 01-2-2V4z" />
              </svg>
            </div>
            <div>
              <h3 className="font-medium text-gray-900">{repository.fullName}</h3>
              <p className="text-sm text-gray-600">{repository.url}</p>
              {repository.parent && (
                <p className="text-xs text-gray-500 mt-1">
                  Forked from {repository.parent.fullName}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Progress Bar */}
        {status === 'verifying' && (
          <div className="mb-6">
            <div className="flex justify-between text-sm text-gray-600 mb-2">
              <span>Progress</span>
              <span>{progress}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <motion.div
                className="bg-blue-600 h-2 rounded-full"
                initial={{ width: 0 }}
                animate={{ width: `${progress}%` }}
                transition={{ duration: 0.5, ease: 'easeOut' }}
              />
            </div>
          </div>
        )}

        {/* Status-specific content */}
        {status === 'ready' && (
          <div className="text-center">
            <p className="text-sm text-gray-600 mb-4">
              Your repository has been forked successfully and is ready for editing.
            </p>
            {redirectToEditor && (
              <p className="text-xs text-gray-500">
                You will be redirected to the editor shortly...
              </p>
            )}
          </div>
        )}

        {status === 'error' && (
          <div className="space-y-4">
            <div className="p-3 bg-red-50 border border-red-200 rounded-md">
              <p className="text-sm text-red-700">
                {statusMessage}
              </p>
            </div>
            
            <div className="text-center">
              <p className="text-sm text-gray-600 mb-4">
                You can still access your repository directly on GitHub:
              </p>
              <a
                href={repository.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center px-4 py-2 text-sm font-medium text-blue-600 bg-blue-50 border border-blue-200 rounded-md hover:bg-blue-100 transition-colors"
              >
                <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
                View on GitHub
              </a>
            </div>
          </div>
        )}

        {/* Manual Actions */}
        {(status === 'ready' || status === 'error') && (
          <div className="mt-6 pt-4 border-t border-gray-200">
            <div className="flex space-x-3">
              {status === 'ready' && !redirectToEditor && (
                <button
                  onClick={() => router.push(`/editor/${repository.owner}/${repository.name}`)}
                  className="flex-1 px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
                >
                  Open Editor
                </button>
              )}
              
              <button
                onClick={() => window.close()}
                className="flex-1 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        )}
      </motion.div>
    </div>
  );
}